---
name: request-intake
description: "Transform vague one-liner feature requests into fully-populated task files via structured Q&A. Phase 1 entry point for the 9-phase orchestration pipeline. Persona: Senior Business Analyst."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-27
updated_at: 2026-03-27
platform: rd3
type: workflow
tags: [requirements, elicitation, qa, phase-1, orchestration]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,gemini,openclaw,opencode,antigravity"
  category: orchestration
  interactions:
    - knowledge-only
    - generative
see_also:
  - rd3:orchestration-dev
  - rd3:task-decomposition
  - rd3:functional-review
---

# rd3:request-intake — Requirements Elicitation and Task Enrichment

Structured Q&A workflow that transforms vague one-liner feature requests into fully-populated task files with Background, Requirements, Constraints, and auto-assigned profile.

**Key distinction:**
- **`request-intake`** = requirements elicitation (what to build, why, constraints)
- **`task-decomposition`** = task breakdown (how to split into implementable units)
- **`orchestration-dev`** = phase orchestration (coordinates all 9 phases)

## When to Use

**Trigger phrases:** "build a feature", "add new capability", "implement", "create a new", "I want to", "we need to", "enhance", "improve"

Load this skill when:
- Starting a new task from a vague one-liner request
- Task file has incomplete Background, Requirements, or Constraints sections
- Profile field needs auto-assignment based on scope analysis
- User needs guided elicitation through structured questions

Do not use this skill for well-formed task files with complete requirements. Skip to `rd3:task-decomposition`.

## Overview

The request-intake skill follows IEEE 29148 and BABOK Guide best practices for requirements elicitation:

1. **Analyze** existing task content for gaps and ambiguities
2. **Question** using hybrid taxonomy (15-20 categorized templates)
3. **Synthesize** answers into structured sections
4. **Assign** profile based on scope heuristics
5. **Persist** via tasks update (without overwriting existing content)

## Input Schema

```typescript
interface RequestIntakeInput {
  task_ref: string;           // WBS number or path to task file
  description?: string;       // Optional additional context
  domain_hints?: string[];     // Optional domain tags to guide question selection
  mode?: 'create' | 'refine'; // 'create' (default): gather new requirements
                               // 'refine': improve existing requirements
  execution_channel?: string; // Default: 'current'; preserved by orchestration
  // Valid formats: "backend", "frontend", "database", "auth", "api",
  // "devops", "testing", "security", "performance", "accessibility"
  // Free-form text also accepted — used for keyword matching against taxonomy
}
```

`execution_channel` is normally injected by `rd3:orchestration-dev`. Use `current` for in-channel execution, or an ACP agent name when the workflow is routed through `rd3:run-acp`.

### Modes

**create** (default): Standard elicitation for new or empty task files. Generates Background, Requirements, Constraints from scratch via Q&A.

**refine**: Improves existing requirements in a populated task file. Analyzes current content for quality issues (vague language, missing acceptance criteria, untestable requirements, gaps), generates targeted questions to fix them, and updates sections in-place.

## Quick Start

```
1. Load task file via task_ref
2. Analyze existing content for gaps
3. Generate 3-7 clarifying questions
4. Present questions via AskUserQuestion (batched, not one-at-a-time)
5. Synthesize answers into Background (100+ chars), Requirements (numbered), Constraints
6. Auto-assign profile using heuristics
7. Write back via tasks update (preserve existing non-empty sections)
```

## Question Taxonomy

See `references/question-taxonomy.md` for the 15-20 categorized question templates.

**Categories:**
- Purpose (2 templates) — why this request, expected outcomes
- Scope (4 templates) — what is/isn't in scope, boundaries
- Constraints (3 templates) — budget, timeline, technical limits
- Dependencies (2 templates) — what must be in place first
- Acceptance Criteria (4 templates) — how to verify success
- Users (2 templates) — who benefits, user personas
- Timeline (2 templates) — deadlines, milestones

## Profile Assignment Heuristics

Auto-assign profile based on these signals:

| Signal | simple | standard | complex | research |
|--------|--------|----------|---------|----------|
| Scope size | Single file/function | 2-5 files/modules | 6+ files/systems | Novel domain |
| Dependencies | 0-1 | 2-3 | 4+ | Unknown |
| Domain breadth | Single domain | 2 domains | 3+ domains | Cross-disciplinary |
| Constraints | None | Budget/time | Technical | Regulatory/legal |
| Team size | 1 | 2-3 | 4+ | Distributed |

**Decision rules (evaluated in order — first match wins):**
1. `research`: Novel domain + unknown dependencies + cross-disciplinary
2. `complex`: 2+ signals in complex column OR any research signal
3. `simple`: 3+ signals in simple column AND 0 signals in complex/research
4. `standard`: Default — applies when signals are mixed or insufficient

**Tiebreaker**: When signals conflict (e.g., 2 complex + 2 simple), prefer the **higher** profile to avoid under-estimating scope. If signals are unknown/missing, default to `standard`.

## Workflow

### Step 1: Load and Analyze Task

```typescript
// Load task file
const taskPath = resolveTaskRef(input.task_ref);
const task = readTaskFile(taskPath);

if (input.mode === 'refine') {
    // Refine mode: analyze existing content for quality issues
    const qualityIssues = analyzeQuality(task);

    // Skip if requirements are already well-formed
    if (qualityIssues.length === 0) {
        logger.info('Task requirements already meet quality standards. No refinement needed.');
        return;
    }

    // Generate targeted questions for detected issues
    const questions = generateRefinementQuestions(qualityIssues);
    // Continue to Step 3 with refinement-specific questions
} else {
    // Create mode: standard gap analysis
    const gaps = {
      background: task.background.length < 100,
      requirements: !task.requirements || task.requirements.includes('[What needs to be done]'),
      constraints: !task.constraints || task.constraints.includes('[Constraints]'),
      profile: !task.frontmatter.profile,
    };
}
```

### Refine Mode Quality Checks

When `mode === 'refine'`, analyze existing content for these issues:

| Check | Threshold | Red Flag |
|-------|-----------|----------|
| Background length | < 100 chars | Too brief |
| Requirements empty | < 10 chars | Missing |
| Vague language | Contains "etc", "things", "stuff" | Imprecise |
| No acceptance criteria | Missing "should", "must", "verify" | Untestable |
| Compound requirements | Contains "and" + 3+ concepts | Split needed |
| No constraints | Section empty or missing | Incomplete |
| Profile unassigned | Not in frontmatter | Missing |

### Step 2: Generate Questions

Select 3-7 templates from question-taxonomy.md based on:
- Detected gaps (don't ask about filled sections)
- Domain hints (domain_expertise, technical_environment, user_personas)
- Prior answers (adaptive follow-up)

```typescript
const MAX_QUESTIONS = 7;
const MAX_ROUNDS = 3;

let round = 0;
let allAnswers: Answer[] = [];

while (round < MAX_ROUNDS) {
    const questions = selectQuestions(gaps, input.domain_hints, allAnswers);
    if (questions.length === 0) break; // All gaps filled

    // Enforce hard cap per round
    const batch = questions.slice(0, MAX_QUESTIONS - allAnswers.length);
    if (batch.length === 0) break; // Total cap reached

    // Prioritize: Acceptance Criteria > Scope > Purpose > Constraints > Dependencies > Users > Timeline
    batch.sort((a, b) => PRIORITY_ORDER.indexOf(a.category) - PRIORITY_ORDER.indexOf(b.category));

    const answers = await askUserQuestions(batch);
    allAnswers.push(...answers);
    round++;

    // Re-analyze gaps after each round
    gaps = reanalyzeGaps(task, allAnswers);
}
```

### Step 3: Batch Q&A

Present questions via AskUserQuestion (Claude Code's built-in tool) in a single prompt:
- Group by category (max 3 categories per round)
- Include context about WHY each question matters
- Request specific examples where helpful
- **Hard cap**: max 7 questions total across all rounds, max 3 rounds

### Step 4: Synthesize

Parse user responses and synthesize:

```typescript
// Background: 100+ chars, explains WHY
const background = synthesizePurpose(answers) + synthesizeContext(answers);

// Requirements: numbered, testable items
const requirements = answers
  .filter(a => a.category === 'acceptance_criteria')
  .map(a => `- ${a.answer}`);

// Constraints: explicit limits
const constraints = answers
  .filter(a => ['constraints', 'timeline'].includes(a.category))
  .map(a => `- ${a.constraint}`);
```

### Step 5: Assign Profile

```typescript
const profile = computeProfile(answers);
// Profile must be one of: 'simple' | 'standard' | 'complex' | 'research'
```

### Step 6: Persist

Write back via tasks CLI (preserve existing non-empty sections):

```bash
# Only update empty/missing sections
tasks update {wbs} --section Background --from-file /tmp/background.md
tasks update {wbs} --section Requirements --from-file /tmp/requirements.md
tasks update {wbs} --section Constraints --from-file /tmp/constraints.md
tasks update {wbs} --section profile --from-file /tmp/profile.txt
```

**CRITICAL:** Do NOT overwrite existing non-empty sections without explicit user confirmation.

## Quality Standards

### Background Section
- Minimum 100 characters
- Explains WHY this request exists (not WHAT)
- Includes motivation, expected outcomes, success metrics
- References related business goals if available

### Requirements Section
- Numbered list (machine-parseable)
- Each item is testable (can verify completion)
- No compound requirements (one concept per item)
- Includes acceptance criteria per requirement

### Constraints Section
- Explicit limits (not assumptions)
- Categorized: technical, budget, timeline, regulatory
- Includes "must NOT" constraints where relevant

## Anti-Patterns

**DO NOT:**
- Ask all 20 questions at once (cognitive overload)
- Overwrite existing content without confirmation
- Accept vague answers like "whatever is best" or "I don't know"
- Skip profile assignment (downstream phases depend on it)
- Use yes/no questions when open-ended would yield better answers

## Exit Criteria

Skill succeeds when:
1. Background section is 100+ chars
2. Requirements has 1+ numbered, testable items
3. Profile field is assigned
4. All existing non-empty sections preserved

Skill fails when:
- User rejects synthesis results after 2 rework iterations
- Max 3 Q&A rounds exceeded without resolution
- User explicitly aborts

## Integration

**tasks CLI integration:**
```bash
# Entry point via tasks CLI (future enhancement)
rd2:tasks refine {wbs} --phase intake

# Or direct skill invocation
rd3:request-intake {wbs}
```

**Phase integration:**
- Output feeds into `rd3:task-decomposition` (Phase 4)
- Profile assignment gates Phase 2 (Architecture) in orchestration-dev
- Constraints inform verification strategy in `rd3:functional-review`
