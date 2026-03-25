# Skill Workflows

Detailed workflow definitions for cc-skills operations. Each workflow defines:
- **Step-by-step flow**: Ordered steps from start to completion
- **Tool per step**: Which script or checklist handles each step
- **Branching logic**: What to do when steps fail or succeed
- **Retry loops**: When to go back and redo previous steps

LLM content improvement is embedded in the normal workflow for every operation.
It is performed by the invoking agent as checklist-driven review/content improvement, not via a separate `--llm-eval` CLI mode.

## Shared Workflow Framework

This file follows the shared [Meta-Agent Workflow Schema](../../../references/meta-agent-workflow-schema.md).

Shared Phase 1 conventions:

- concept-level operations use `Create`, `Validate`, `Evaluate`, `Refine`, `Evolve`, `Adapt`, and `Package`
- documentation decision states use `BLOCK`, `WARN`, and `PASS`
- deterministic script work and invoking-agent judgment are documented separately
- `Evolve` follows the closed loop: Observe -> Analyze -> Propose -> Apply -> Verify -> Snapshot -> Rollback -> Learn

---

## Table of Contents

1. [Create Workflow](#create-workflow) - Create new skill
2. [Validate Workflow](#validate-workflow) - Check skill structure
3. [Evaluate Workflow](#evaluate-workflow) - Validate and score quality
4. [Refine Workflow](#refine-workflow) - Fix issues and improve
5. [Evolve Workflow](#evolve-workflow) - Analyze and apply longitudinal improvements
6. [Adapt Workflow](#adapt-workflow) - Generate cross-platform companions
7. [Package Workflow](#package-workflow) - Prepare for distribution

---

## Create Workflow

Create a new skill from scratch with proper structure.

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ CREATE WORKFLOW                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Step 1   │───▶│ Step 2   │───▶│ Step 3   │───▶│ Step 4   │   │
│  │ Scaffold │    │ Validate  │    │ LLM      │    │ Generate │   │
│  │ (Script) │    │ (Script)  │    │ Content  │    │ Companions│  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │                                                 │           │
│       ▼                                                 ▼           │
│  [SUCCESS]                                      [FAIL: Back to 1] │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1 | Scaffold | `scaffold.ts` | Creates directory + SKILL.md | Retry step 1 |
| 2 | Validate Structure | `validate.ts` | All required files exist | Back to step 1 |
| 3 | LLM Content Improvement | LLM (invoking agent) | Improves content using LLM | Back to step 1 |
| 4 | Generate Companions | Platform adapters | All companions generated | Retry step 4 |

### Step Details

#### Step 1: Scaffold (Script)
```bash
bun scripts/scaffold.ts <skill-name> --path ./skills [--template technique|pattern|reference]
```

**What script does:**
- Creates skill directory
- Generates SKILL.md from template
- Creates directories: scripts/, references/, assets/
- Initializes platform adapter files

**Output:** Skill directory with basic structure

#### Step 2: Validate Structure (Script)
```bash
bun scripts/validate.ts <skill-path>
```

**What script does:**
- Checks required directories exist
- Validates SKILL.md is valid markdown
- Validates frontmatter has name + description

**Success:** Returns validation pass

#### Step 3: LLM Content Improvement
**Handler:** LLM (invoking agent using its own LLM capability)

**What the invoking agent does:**
1. Reads the newly scaffolded SKILL.md
2. Identifies weak sections: vague descriptions, inconsistent voice, missing examples
3. Uses LLM to rewrite content addressing issues found in Steps 1-2
4. Preserves frontmatter exactly
5. Maintains third-person imperative voice ("This skill..." not "I can...")
6. Adds concrete examples if missing
7. Keeps SKILL.md under 500 lines (extract to references/ if needed)

**Important:**
- Frontmatter MUST NOT be modified (name, description, type, etc.)
- Only the body content is improved
- Preserve all existing reference links
- Add examples where patterns are described

**If FAIL:** Go back to Step 1 (re-scaffold with corrections)

#### Step 4: Generate Companions (Script)
```bash
bun scripts/adapt.ts <skill-path> all
```

**What script does:**
- Generates platform companions from the current SKILL.md
- Validates companion compatibility with target platforms
- Reports any lossy or advisory transformations

**If FAIL:** Retry step 4 (max 3 times)

---

## Validate Workflow

Validate skill structure, frontmatter, resources, and companion readiness before evaluation or packaging.

### Workflow Steps

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1 | Parse SKILL.md | `validate.ts` | File can be parsed | Abort |
| 2 | Check Required Structure | `validate.ts` | Required fields and resource expectations pass | Retry after fixes |
| 3 | Action Decision | `validate.ts` + invoking agent | Returns BLOCK/WARN/PASS with next step | Continue |

### Step Details

#### Step 1: Parse SKILL.md
```bash
bun scripts/validate.ts <skill-path>
```

#### Step 2: Check Required Structure

Deterministic validation checks:

- valid frontmatter
- required name and description fields
- resource discovery and companion readiness
- no critical structure breakage

#### Step 3: Action Decision

The invoking agent reviews the validation output and decides whether to:

- stop on `BLOCK`
- continue with caveats on `WARN`
- proceed directly on `PASS`

---

## Evaluate Workflow

Validate skill structure and score quality using **Two-Tier Architecture**.

### Two-Tier Architecture

| Tier | Purpose | Handler | Continues on BLOCK? |
|------|---------|---------|-------------------|
| **Tier 1** | Structural Validation | Scripts | Yes (for diagnostics) |
| **Tier 2** | Quality Scoring | Scripts + invoking-agent checklist | N/A |

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ EVALUATE WORKFLOW (Two-Tier)                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ TIER 1: STRUCTURAL VALIDATION (Deterministic)              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                    │
│  │ Step 1.1 │───▶│ Step 1.2 │───▶│ Step 1.3 │                    │
│  │ Parse    │    │ Check    │    │ Action   │                    │
│  │ SKILL.md │    │ Frontmatter│   │ BLOCK/WARN│                  │
│  │          │    │            │   │ /PASS     │                  │
│  └──────────┘    └──────────┘    └──────────┘                    │
│       │              │              │                               │
│       ▼              ▼              ▼                               │
│  [Valid?]       [Valid?]    [BLOCK → Continue to Tier 2]         │
│     │              │              │                               │
│     ▼              ▼              ▼                               │
│  [BLOCK: Abort] [BLOCK]                                      │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ TIER 2: QUALITY SCORING (Script + LLM)                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Step 2.1 │───▶│ Step 2.2 │───▶│ Step 2.3 │───▶│ Step 2.4 │   │
│  │ Dimension│    │ Score    │    │ Checklist│    │ Generate │   │
│  │ Scoring  │    │ Calculate│    │ Review   │    │ Report   │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │              │              │                │            │
│       ▼              ▼              ▼                ▼            │
│  [Score OK]     [Score OK]    [Optional]        [COMPLETE]       │
│     │              │              │                              │
│     ▼              ▼              ▼                              │
│  [FAIL: Abort] [FAIL: Abort] [Skip if no time]                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Tier 1: Structural Validation

**Purpose:** Verify skill can function (deterministic checks).

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1.1 | Parse SKILL.md | Script | Valid markdown + YAML | Abort |
| 1.2 | Check Frontmatter | Script | name + description exist | BLOCK |
| 1.3 | Action Decision | Script | No BLOCK → Continue | Continue to Tier 2 |

#### Tier 1 Action Types

| Action | Icon | Meaning | Tier 2 Continues? |
|--------|------|---------|-------------------|
| **BLOCK** | ⏹ | Critical failure - skill cannot function | Yes (for diagnostics) |
| **WARN** | ⚠ | Improvement is suggested before shipping | Yes |

**BLOCK criteria:**
- Missing SKILL.md
- Invalid YAML frontmatter
- Missing required `name` field
- Missing required `description` field
- Invalid name format (not kebab-case)

---

### Tier 2: Quality Scoring

**Purpose:** Assess skill quality across dimensions (script + LLM).

| Step | Name | Handler | Success Criteria |
|------|------|---------|------------------|
| 2.1 | Dimension Scoring | Script | Returns scores for all dimensions |
| 2.2 | Calculate Grade | Script | Returns A/B/C/D/F |
| 2.3 | Embedded LLM Checklist Review | LLM (invoking agent) | Returns nuanced follow-up guidance |
| 2.4 | Generate Report | Script | JSON/text output |

#### Scoring Dimensions

MECE framework: 4 categories, 10 dimensions, 100 points total (source: `scripts/evaluation.config.ts`):

| Category | Dimension | Pts | What It Checks |
|----------|-----------|-----|----------------|
| **Core Quality** (40) | Frontmatter | 10 | YAML validity, required fields |
| | Structure | 5 | Directory organization |
| | Content | 15 | Body quality, examples |
| | Completeness | 10 | All required sections |
| **Discovery & Trigger** (20) | Trigger Design | 10 | Description triggers, when-to-use |
| | Platform Compatibility | 10 | Multi-platform support |
| **Safety & Security** (20) | Security | 10 | No dangerous patterns |
| | Circular Reference | 10 | No command/agent refs |
| **Code & Docs** (20) | Code Quality | 10 | Scripts executable, tested |
| | Progressive Disclosure | 10 | References used properly |

> **Note:** Skills without scripts use a different weight profile (Structure=10, Content=20, Code Quality=0). See [evaluation-framework.md](evaluation-framework.md) for both profiles.

#### Grading Scale

| Grade | Score | Meaning |
|-------|-------|---------|
| **A** | 90-100 | Production ready |
| **B** | 70-89 | Minor fixes needed |
| **C** | 50-69 | Moderate revision |
| **D** | 30-49 | Major revision |
| **F** | 0-29 | Rewrite needed |

---

### Detailed Checklist (from rd2 validation-checklist.md)

Organized by category for comprehensive validation:

#### Frontmatter (Mandatory)

| # | Item | Check | Script/LLM |
|---|------|-------|------------|
| 1 | YAML frontmatter is valid | Parse check | Script |
| 2 | `name` follows kebab-case | Regex `^[a-z0-9-]+$` | Script |
| 3 | `name` max 64 chars | Length check | Script |
| 4 | `description` 50-1024 chars | Length check | Script |
| 5 | `description` has WHAT + WHEN | Content check | LLM |
| 6 | Uses third-person form | "This skill..." | LLM |

#### Content Quality

| # | Item | Check | Script/LLM |
|---|------|-------|------------|
| 1 | SKILL.md body uses imperative form | "Use X" not "You should" | LLM |
| 2 | Body under 500 lines | Line count | Script |
| 3 | Detailed content in references/ | Structure check | Script |
| 4 | Examples are concrete | Content check | LLM |

#### Trigger Design

| # | Item | Check | Script/LLM |
|---|------|-------|------------|
| 1 | Includes specific trigger phrases | Quote detection | Script |
| 2 | Third-person description | Content check | LLM |
| 3 | Concrete "when to use" scenarios | Content check | LLM |
| 4 | No workflow summaries in description | Content check | LLM |

#### Instruction Clarity

| # | Item | Check | Script/LLM |
|---|------|-------|------------|
| 1 | Imperative form ratio > 70% | Pattern count | Script |
| 2 | No vague language | "might", "could", "maybe" | Script |
| 3 | Specific action verbs | "create", "configure" | LLM |
| 4 | Clear branching criteria | If/then structure | LLM |

#### Value-Add Assessment

| # | Item | Check | Script/LLM |
|---|------|-------|------------|
| 1 | Domain-specific content | Content check | LLM |
| 2 | Unique workflows | Content check | LLM |
| 3 | No explaining well-known concepts | Content check | LLM |

#### Structure

| # | Item | Check | Script/LLM |
|---|------|-------|------------|
| 1 | SKILL.md in root | File check | Script |
| 2 | scripts/, references/, assets/ exist | Directory check | Script |
| 3 | Progressive disclosure | Reference links | Script |

#### Circular Reference Prevention

| # | Item | Check | Script/LLM |
|---|------|-------|------------|
| 1 | No "Commands Reference" section | Section check | Script |
| 2 | No slash command references | Pattern `/\/rd\d+:` | Script |
| 3 | No "See also" with commands | Pattern check | Script |

---

### Embedded LLM Checklist Review

Use the invoking agent's LLM judgment to strengthen the script findings with qualitative review.

#### When to Use

- Need judgment beyond pattern matching
- Want Claude's opinion on quality
- Need structured scoring against criteria

#### How to Use

```bash
# Run the normal deterministic evaluation
bun scripts/evaluate.ts <skill-path> --scope full
```

Then the invoking agent reviews the generated findings and applies the checklist below before deciding whether to proceed, refine, or stop.

#### LLM Checks

| # | Item | Check |
|---|------|-------|
| 1 | Description quality | Clear, specific, has triggers |
| 2 | Trigger effectiveness | Would fire on intended queries |
| 3 | Content helpfulness | Actually useful for tasks |
| 4 | Voice consistency | Imperative throughout |

---

### Evaluation Loop (Best Practice)

For new skill development, use iterative evaluation:

```
┌─────────────────┐
│  1. Baseline    │  Run WITHOUT skill → Document gaps
│     Testing     │  What does Claude miss?
└────────┬────────┘
         ▼
┌─────────────────┐
│  2. Write       │  Address ONLY documented gaps
│     Content     │  Use concrete examples
└────────┬────────┘
         ▼
┌─────────────────┐
│  3. Retest     │  Same scenarios WITH skill
│                 │  Document improvements
└────────┬────────┘
         ▼
    Baseline achieved?
         │
    Yes ─┴─ No → Return to step 2
         ▼
┌─────────────────┐
│  4. Ship        │  Stop adding content
└─────────────────┘
```

---

### Cross-Model Testing

Test with multiple Claude models:

| Model | Expected | Notes |
|-------|---------|-------|
| Haiku | ≥70% | Minimum viable |
| Sonnet | ≥90% | Primary target |
| Opus | ≥90% | No additional benefit |

**Ship if Sonnet ≥ 90%.** Note if Haiku needs more guidance.

---

### Step Details

#### Step 1.1: Parse SKILL.md (Script)
```bash
bun scripts/evaluate.ts <skill-path> --scope basic
```

**What script does:**
- Reads SKILL.md
- Parses YAML frontmatter
- Extracts body content

**If FAIL:** Abort - skill has syntax errors

#### Step 1.2: Check Frontmatter (Script)

**What script checks:**
- `name` field exists, kebab-case, max 64 chars
- `description` field exists, 50-1024 chars
- Valid YAML syntax

**If BLOCK:** Stop - critical failure

#### Step 2.1: Dimension Scoring (Script)
```bash
bun scripts/evaluate.ts <skill-path> --scope full
```

**What script scores (10 dimensions, see evaluation.config.ts):**
- Core Quality: Frontmatter (10), Structure (5), Content (15), Completeness (10)
- Discovery & Trigger: Trigger Design (10), Platform Compatibility (10)
- Safety & Security: Security (10), Circular Reference (10)
- Code & Documentation: Code Quality (10), Progressive Disclosure (10)

**Output:** Score per dimension, total (out of 100), grade (A/B/C/D/F)

#### Step 2.3: Embedded LLM Checklist Review (Invoking Agent)

**What the invoking agent evaluates:**
- Description quality (rubric-based)
- Trigger effectiveness
- Content helpfulness
- Voice consistency

**Output:** Detailed analysis, recommendations

#### Step 2.4: Generate Report (Script)
- Outputs JSON or text report
- Lists all findings and recommendations
- Includes grade and pass/fail status

---

## Refine Workflow

Fix issues and improve quality. Supports multiple refinement modes.

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ REFINE WORKFLOW                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Step 1   │───▶│ Step 2   │───▶│ Step 3   │───▶│ Step 4   │   │
│  │ Parse +  │    │ Apply     │    │ Apply    │    │ Validate │   │
│  │ Detect   │    │ BestPrac  │    │ Content  │    │ Result   │   │
│  │ Issues   │    │ (Script)  │    │ Improve  │    │ (Script) │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │              │               │                │            │
│       ▼              ▼               ▼                ▼            │
│  [No issues]    [Apply]         [Improve]       [COMPLETE]      │
│     │              │               │                              │
│     ▼              ▼               ▼                              │
│  [COMPLETE]    [Nothing to fix] [Content improved]              │
│                                                                      │
│  ─────────────────────────────────────────────────────────────     │
│  Branch: Migration Mode (--migrate)                                │
│  ┌──────────┐    ┌──────────┐                                     │
│  │ Step M1  │───▶│ Step M2  │                                     │
│  │ Migrate  │    │ Validate  │                                     │
│  │ (Script) │    │ (Script)  │                                     │
│  └──────────┘    └──────────┘                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Standard Refine Flow

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1 | Detect Issues | `refine.ts` | Detects what needs fixing | Continue |
| 2 | Apply BestPrac | `refine.ts --best-practices` | Fixes deterministic issues | Warn only |
| 3 | LLM Content Improvement | LLM (invoking agent) | Improves content using LLM | Back to 2 |
| 4 | Validate Result | `validate.ts` | Validation passes | Retry step 3 |

### Step Details

#### Step 1: Detect Issues
```bash
# Pre-check what needs fixing
bun scripts/evaluate.ts <skill-path> --scope full
```

**What happens:**
- Run evaluation to identify issues
- Determine which fixes needed

#### Step 2: Apply Best Practices (Script)
```bash
bun scripts/refine.ts <skill-path> --best-practices
```

**What script fixes (deterministic):**
- Remove TODO markers
- Convert Windows paths to forward slashes
- Remove Commands Reference sections
- Remove slash command references
- **Extract long content to references** (SKILL.md >= 500 lines): Moves `## Quick Reference`, `## Additional Resources`, `## Technology Selection`, `## Extended Examples`, `## Detailed Patterns`, `## Architecture Decision Records`, `## Monitoring Stack`, and `## Breakdown Checklist` sections to `references/` with proper frontmatter

**Output:** Modified SKILL.md, report of changes

#### Step 3: LLM Content Improvement (Invoking Agent)
The invoking agent uses the LLM to improve skill content based on evaluation findings from Step 1.

**What the agent does:**

1. **Analyze findings**: Review evaluation findings and recommendations from Step 1
2. **Identify weak sections**: Find content that failed scoring or needs improvement
3. **Use LLM to rewrite**: Use the agent's LLM capability to rewrite weak sections:
   - Preserve frontmatter exactly (YAML at top of SKILL.md)
   - Maintain third-person imperative voice ("This skill helps..." not "I can help you")
   - Keep SKILL.md under 500 lines (extract long sections to references/)
   - Address all findings from the evaluation report
4. **Apply improvements**: Write improved content back to SKILL.md

**Key principles:**
- **Frontmatter protection**: Never modify the YAML frontmatter
- **Voice consistency**: Maintain imperative form throughout
- **Concrete over abstract**: Use specific examples and trigger phrases
- **Progressive disclosure**: Extract detailed content to references/ as needed

**If improvements made:** Continue to Step 4
**If no improvements needed:** Continue to Step 4
**If LLM fails or unavailable:** Warn and continue to Step 4 (deterministic fixes already applied in Step 2)

#### Step 4: Validate Result
```bash
bun scripts/validate.ts <skill-path>
```

**If FAIL:** Warn but complete (user may need manual fix)

### Migration Mode Flow (--migrate)

| Step | Name | Handler | Success Criteria |
|------|------|---------|------------------|
| M1 | Migrate | `refine.ts --migrate` | Applies rd2→rd3 transforms |
| M2 | Validate | `validate.ts` | Structure valid |

**M1 script applies:**
- Add name: field if missing
- Add metadata.platforms if missing
- Add metadata.openclaw if missing
- Add Platform Notes section

---

### Alternative: TDD-Based Refinement

For deeper skill improvement, use **TDD for Skills** approach:

#### The Iron Law

> **NO SKILL WITHOUT A FAILING TEST FIRST.**

If you did not watch an agent fail without the skill, you do not know if the skill teaches the right thing.

#### TDD Workflow

| Phase | Action | Description |
|-------|--------|-------------|
| **RED** | Run WITHOUT skill | Document agent failures and rationalizations |
| **GREEN** | Write minimal skill | Address specific failures |
| **REFACTOR** | Iterate | Close loopholes, re-test until bulletproof |

#### When to Use TDD

| Use TDD | Skip TDD |
|---------|----------|
| Skill addresses common violations | Skill is purely informational |
| Behavior change is critical | Behavior already correct |
| Multiple agents need consistent behavior | Time constraints |
| Rationalizations are predictable | |

#### Common Rationalizations

| Rationalization | Counter |
|---------------|---------|
| "This is just a small change" | "Every change, regardless of size, requires..." |
| "The user needs it urgently" | "Time pressure is not a valid reason to skip..." |
| "I'll fix it later" | "Complete the implementation now..." |
| "This is temporary" | "Treat all code as production code..." |

#### Integration with Standard Refine

| Approach | Purpose |
|----------|---------|
| **Standard Refine** | Structural fixes, best practices |
| **TDD Refine** | Behavioral changes, agent compliance |

Use TDD when standard refine doesn't achieve desired agent behavior.

---

## Evolve Workflow

Analyze longitudinal improvements with persisted proposals and embedded LLM review before apply.

### Closed-Loop Phases

This workflow follows the shared evolution loop:

1. Observe signals from evaluation and history
2. Analyze patterns and gaps
3. Propose bounded improvements
4. Apply approved changes
5. Verify the resulting behavior
6. Snapshot version history
7. Roll back if needed
8. Learn from the recorded outcome

### Workflow Steps

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1 | Analyze Signals | `evolve.ts --analyze` | Signal report generated | Abort |
| 2 | Generate Proposals | `evolve.ts --propose` | Proposal set persisted | Retry step 2 |
| 3 | Embedded LLM Content Improvement | LLM (invoking agent) | Proposals are reviewed, tightened, and prioritized | Back to step 2 |
| 4 | Apply or Roll Back | `evolve.ts --apply` / `--rollback` | Approved change applied safely | Abort |

### Step Details

#### Step 1: Analyze Signals
```bash
bun scripts/evolve.ts <skill-path> --analyze
```

#### Step 2: Generate Proposals
```bash
bun scripts/evolve.ts <skill-path> --propose
```

The script persists deterministic proposals and supporting rationale.

#### Step 3: Embedded LLM Content Improvement

The invoking agent reviews the proposal set before any apply step:

1. Check that each proposal matches the actual findings
2. Remove weak or redundant proposals
3. Tighten descriptions and rationale where they are vague
4. Confirm the proposal order matches risk and expected benefit
5. Decide whether to apply, defer, or request more evidence

This review is part of the normal evolve flow. It does not require a separate CLI flag.

#### Step 4: Apply or Roll Back
```bash
bun scripts/evolve.ts <skill-path> --apply <proposal-id> --confirm
```

```bash
bun scripts/evolve.ts <skill-path> --rollback <version> --confirm
```

---

## Adapt Workflow

Generate or refresh cross-platform companions for the skill.

### Workflow Steps

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1 | Inspect Source Skill | `adapt.ts` | Source skill is readable | Abort |
| 2 | Generate Companions | `adapt.ts` | Target companions created | Retry step 2 |
| 3 | Validate Output | `validate.ts` / adapter checks | Generated companions are structurally valid | Warn |
| 4 | Embedded LLM Review | LLM (invoking agent) | Platform notes and examples stay aligned with generated companions | Loop back to step 2 |

### Step Details

#### Step 1: Inspect Source Skill
```bash
bun scripts/adapt.ts <skill-path> all
```

#### Step 2: Generate Companions

The script generates platform-specific outputs such as:

- `agents/openai.yaml`
- `metadata.openclaw`
- other supported platform companions

#### Step 3: Validate Output

Deterministic checks confirm:

- generated files are present
- generated metadata is structurally valid
- no critical companion-generation failure occurred

#### Step 4: Embedded LLM Review

The invoking agent reviews the adapted output to:

1. confirm examples and guidance still match generated companions
2. tighten weak platform notes
3. loop back to regenerate if the source skill needs improvement first

---

## Package Workflow

Prepare skill for distribution.

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ PACKAGE WORKFLOW                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Step 1   │───▶│ Step 2   │───▶│ Step 3   │───▶│ Step 4   │   │
│  │ Pre-     │    │ Copy     │    │ Generate │    │ LLM      │   │
│  │ Validate │    │ Files    │    │ Companions│   │ Content  │   │
│  │ (Script) │    │ (Script) │    │ (Script)  │   │ (Checklist)│ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │                                                    │       │
│       ▼                                                    ▼       │
│  [FAIL: Abort]                                        [COMPLETE]  │
│       │                                                    │       │
│       └────────────────┬───────────────────────────────┘       │
│                        │                                        │
│                        ▼                                        │
│                   ┌──────────┐                                  │
│                   │ Step 5   │                                  │
│                   │ Archive  │                                  │
│                   │ (Script) │                                  │
│                   └──────────┘                                  │
│                        │                                        │
│                        ▼                                        │
│                   [COMPLETE]                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1 | Pre-Validate | `validate.ts` | Validation passes | Abort |
| 2 | Copy Files | `package.ts` | Files copied | Abort |
| 3 | Generate Companions | `package.ts` | Companions exist | Retry step 3 |
| 4 | LLM Content Improvement | LLM (invoking agent) | Improves content using LLM | Warn |
| 5 | Archive | `package.ts` | Archive created | Retry step 5 |

### Step Details

#### Step 1: Pre-Validate
```bash
bun scripts/validate.ts <skill-path>
```

**If FAIL:** Abort - cannot package invalid skill

#### Step 2: Copy Files
```bash
bun scripts/package.ts <skill-path> --output ./dist
```

**What script does:**
- Creates output directory
- Copies SKILL.md
- Copies references/, assets/, scripts/

#### Step 3: Generate Companions
```bash
bun scripts/package.ts <skill-path> --output ./dist --platform all
```

**What script does:**
- Generates platform companions
- Validates companions

#### Step 4: LLM Content Improvement
**Handler:** LLM (invoking agent using its own LLM capability)

**What the invoking agent does:**
1. Reads the packaged SKILL.md and companions
2. Identifies content issues: inconsistent voice, weak descriptions, missing examples
3. Uses LLM to rewrite and strengthen content
4. Preserves frontmatter exactly (name, description, type, metadata)
5. Ensures companions are consistent with improved SKILL.md
6. Adds Examples section if missing or weak
7. Validates "When to Use" section is specific and actionable

**Important:**
- Frontmatter MUST NOT be modified
- Only improve body content and examples
- Ensure all companions reflect SKILL.md updates
- Verify no circular references were introduced

**If FAIL:** Warn but continue

#### Step 5: Archive
- Creates .zip or .tar.gz
- Includes all files
- Ready for distribution

---

## Workflow Selection Matrix

| Situation | Workflow | Steps |
|-----------|----------|-------|
| New skill | Create | 1 → 2 → 3 → 4 |
| Structure check | Validate | 1 → 2 → 3 |
| Quality check | Evaluate | 1 → 2 → 3 → 4 |
| Fix deterministic | Refine --best-practices | 1 → 2 → 4 |
| Fix fuzzy | Refine checklist | 1 → 2 → 3 → 4 |
| Fix all | Refine --both | 1 → 2 → 3 → 4 |
| Migrate from rd2 | Refine --migrate | M1 → M2 |
| Longitudinal improve | Evolve | 1 → 2 → 3 → 4 |
| Cross-platform companions | Adapt | 1 → 2 → 3 → 4 |
| Pre-publish | Package | 1 → 2 → 3 → 4 → 5 |

---

## Retry Policy

| Failure Point | Retry Action | Max Retries |
|---------------|--------------|-------------|
| Scaffold | Re-run scaffold | 3 |
| Validate structure | Abort | N/A |
| LLM Content Improvement | Back to appropriate step | 2 |
| Generate companions | Re-generate | 3 |
| Package files | Re-package | 3 |
