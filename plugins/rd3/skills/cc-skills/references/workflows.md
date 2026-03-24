# Skill Workflows

Detailed workflow definitions for cc-skills operations. Each workflow defines:
- **Step-by-step flow**: Ordered steps from start to completion
- **Tool per step**: Which script or checklist handles each step
- **Branching logic**: What to do when steps fail or succeed
- **Retry loops**: When to go back and redo previous steps

---

## Table of Contents

1. [Add Workflow](#add-workflow) - Create new skill
2. [Evaluate Workflow](#evaluate-workflow) - Validate and score quality
3. [Refine Workflow](#refine-workflow) - Fix issues and improve
4. [Package Workflow](#package-workflow) - Prepare for distribution

---

## Add Workflow

Create a new skill from scratch with proper structure.

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ ADD WORKFLOW                                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Step 1   │───▶│ Step 2   │───▶│ Step 3   │───▶│ Step 4   │   │
│  │ Scaffold │    │ Validate  │    │ LLM      │    │ Generate │   │
│  │ (Script) │    │ (Script)  │    │ Verify   │    │ Companions│  │
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
| 3 | LLM Verify | Checklist (human/AI) | PASS on all mandatory items | Back to step 1 |
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

#### Step 3: LLM Verify (Checklist)
**Mandatory checklist:**

| # | Item | Check |
|---|------|-------|
| 1 | Description in third person | "This skill..." not "I can..." |
| 2 | Description includes trigger | Contains "Use when..." |
| 3 | Description is specific | Not vague like "helper" |
| 4 | Name is kebab-case | e.g., "pdf-processing" |
| 5 | "When to Use" is clear | Lists specific triggers |

**If FAIL:** Go back to Step 1 (re-scaffold with corrections)

#### Step 4: Generate Companions (Script)
```bash
bun scripts/refine.ts <skill-path> --platform all
```

**What script does:**
- Generates agents/openai.yaml (Codex)
- Generates metadata.openclaw (OpenClaw)
- Validates platform compatibility

**If FAIL:** Retry step 4 (max 3 times)

---

## Evaluate Workflow

Validate skill structure and score quality using **Two-Tier Architecture**.

### Two-Tier Architecture

| Tier | Purpose | Handler | Continues on STOP? |
|------|---------|---------|-------------------|
| **Tier 1** | Structural Validation | Scripts | Yes (for diagnostics) |
| **Tier 2** | Quality Scoring | Scripts + LLM | N/A |

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
│  │ SKILL.md │    │ Frontmatter│   │ STOP/SUGGEST│                 │
│  └──────────┘    └──────────┘    └──────────┘                    │
│       │              │              │                               │
│       ▼              ▼              ▼                               │
│  [Valid?]       [Valid?]    [STOP → Continue to Tier 2]          │
│     │              │              │                               │
│     ▼              ▼              ▼                               │
│  [FAIL: Abort] [FAIL: STOP]                                    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ TIER 2: QUALITY SCORING (Script + LLM)                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Step 2.1 │───▶│ Step 2.2 │───▶│ Step 2.3 │───▶│ Step 2.4 │   │
│  │ Dimension│    │ Score    │    │ LLM      │    │ Generate │   │
│  │ Scoring  │    │ Calculate│    │ Deep Eval│    │ Report   │   │
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
| 1.2 | Check Frontmatter | Script | name + description exist | STOP |
| 1.3 | Action Decision | Script | No STOP → Continue | Continue to Tier 2 |

#### Tier 1 Action Types

| Action | Icon | Meaning | Tier 2 Continues? |
|--------|------|---------|-------------------|
| **STOP** | ⏹ | Critical failure - skill cannot function | Yes (for diagnostics) |
| **SUGGEST** | 💡 | Warning - improvement suggested | Yes |

**STOP criteria:**
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
| 2.3 | LLM Deep Eval | LLM (optional) | Returns detailed analysis |
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

### LLM Deep Evaluation (Optional)

For human-level nuance beyond pattern matching.

#### When to Use

- Need judgment beyond pattern matching
- Want Claude's opinion on quality
- Need structured scoring against criteria

#### How to Run

```bash
# Basic evaluation (script-based)
bun scripts/evaluate.ts <skill-path> --scope full

# Deep evaluation (LLM-based)
bun scripts/evaluate.ts <skill-path> --llm-eval
```

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

**If FAIL:** STOP - critical failure

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

#### Step 2.3: LLM Deep Evaluation (LLM)
```bash
bun scripts/evaluate.ts <skill-path> --llm-eval
```

**What LLM evaluates:**
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
│  │ Detect   │    │ BestPrac  │    │ LLM      │    │ Result   │   │
│  │ Issues   │    │ (Script)  │    │ Refine   │    │ (Script) │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │              │               │                │            │
│       ▼              ▼               ▼                ▼            │
│  [No issues]    [Apply]         [Apply]          [COMPLETE]      │
│     │              │               │                              │
│     ▼              ▼               ▼                              │
│  [COMPLETE]    [Nothing to fix] [Nothing to change]             │
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
| 3 | LLM Checklist | Checklist (invoking agent) | Verifies fuzzy issues | Back to 2 |
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

#### Step 3: LLM Checklist (Invoking Agent)
The invoking agent performs fuzzy quality checks via checklist (not an external API call).

**Checklist items:**

| # | Item | What the Agent Checks |
|---|------|-----------------------|
| 1 | Description pattern | Starts with "Use PROACTIVELY for" |
| 2 | Trigger phrases | 3+ quoted phrases in description |
| 3 | Example blocks | 2+ `<example>` with `<commentary>` |
| 4 | Voice consistency | Third-person, no "I can help you" |
| 5 | Circular references | No `/rd3:command-*` slash refs |
| 6 | Commands Reference | Section not present (removed by best-practices) |
| 7 | Section structure | Progressive disclosure with `## ` headers |
| 8 | Line budget | SKILL.md under 500 lines (long sections extracted to references/) |
| 9 | Reference frontmatter | Extracted reference files have proper `name:`, `description:`, `see_also:` |

**If all items pass:** Continue to Step 4
**If failures:** Back to Step 2 for additional fixes

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
│  │ Validate │    │ Files    │    │ Companions│   │ Verify   │   │
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
| 4 | LLM Verify | Checklist | PASS on all items | Warn |
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

#### Step 4: LLM Verify (Checklist)

| # | Item | Check |
|---|------|-------|
| 1 | SKILL.md valid markdown | Parses without error |
| 2 | Frontmatter complete | name + description |
| 3 | No circular refs | No command references |
| 4 | References accessible | All paths valid |

**If FAIL:** Warn but continue

#### Step 5: Archive
- Creates .zip or .tar.gz
- Includes all files
- Ready for distribution

---

## Workflow Selection Matrix

| Situation | Workflow | Steps |
|-----------|----------|-------|
| New skill | Add | 1 → 2 → 3 → 4 |
| Quality check | Evaluate | 1 → 2 → 3 → 4 |
| Fix deterministic | Refine --best-practices | 1 → 2 → 4 |
| Fix fuzzy | Refine checklist | 1 → 2 → 3 → 4 |
| Fix all | Refine --both | 1 → 2 → 3 → 4 |
| Migrate from rd2 | Refine --migrate | M1 → M2 |
| Pre-publish | Package | 1 → 2 → 3 → 4 → 5 |

---

## Retry Policy

| Failure Point | Retry Action | Max Retries |
|---------------|--------------|-------------|
| Scaffold | Re-run scaffold | 3 |
| Validate structure | Abort | N/A |
| LLM Verify | Back to appropriate step | 2 |
| Generate companions | Re-generate | 3 |
| Package files | Re-package | 3 |
