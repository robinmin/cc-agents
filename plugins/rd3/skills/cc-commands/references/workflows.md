# Command Workflows

Detailed workflow definitions for cc-commands operations. Each workflow defines:
- **Step-by-step flow**: Ordered steps from start to completion
- **Handler per step**: Which script or agent checklist handles each step
- **Branching logic**: What to do when steps fail or succeed
- **Retry loops**: When to go back and redo previous steps

---

## Table of Contents

1. [Scaffold Workflow](#scaffold-workflow) - Create new command
2. [Validate Workflow](#validate-workflow) - Check structure and frontmatter
3. [Evaluate Workflow](#evaluate-workflow) - Score quality across 10 dimensions
4. [Refine Workflow](#refine-workflow) - Fix issues and improve quality
5. [Evolve Workflow](#evolve-workflow) - Longitudinal improvement with snapshot/rollback
6. [Adapt Workflow](#adapt-workflow) - Generate cross-platform companions

---

## Scaffold Workflow

Create a new command from a template.

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ SCAFFOLD WORKFLOW                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Step 1   │───▶│ Step 2   │───▶│ Step 3   │───▶│ Step 4   │   │
│  │ Template │    │ Name     │    │ LLM      │    │ Generate │   │
│  │ Select   │    │ Validate │    │ Verify   │    │ Companions│  │
│  │ (Script) │    │ (Script) │    │ (Checklist)│   │ (Script) │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │              │              │                │            │
│       ▼              ▼              ▼                ▼            │
│  [Simple│Workflow] [Valid?]    [PASS?]         [COMPLETE]     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1 | Template Select | `scaffold.ts` | Creates .md file | Retry step 1 |
| 2 | Name Validate | `scaffold.ts` | kebab-case, no spaces | Retry step 1 |
| 3 | LLM Verify | Checklist (invoking agent) | PASS on all items | Back to step 1 |
| 4 | Generate Companions | `adapt.ts` | All companions generated | Retry step 4 |

### Step Details

#### Step 1: Template Select (Script)
```bash
bun scripts/scaffold.ts <command-name> --path ./commands [--template simple|workflow|plugin]
```

**What script does:**
- Creates command .md file from template
- Validates command name format
- Populates frontmatter with name, description placeholder

#### Step 2: Name Validate (Script)
- Regex: `^[a-z0-9-]+$`
- Max length: 64 chars
- Must not conflict with existing commands

#### Step 3: LLM Verify (Checklist)

**Invoking agent performs these checks:**

| # | Item | Check |
|---|------|-------|
| 1 | Description form | Imperative, starts with verb |
| 2 | Description length | ≤60 characters |
| 3 | argument-hint present | Matches actual arguments |
| 4 | allowed-tools appropriate | Minimal necessary set |
| 5 | Examples concrete | Show real usage |

**If FAIL:** Go back to Step 1 (re-scaffold with corrections)

#### Step 4: Generate Companions (Script)
```bash
bun scripts/adapt.ts <command-path> --platform all
```

---

## Validate Workflow

Check command structure and frontmatter validity.

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ VALIDATE WORKFLOW                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                    │
│  │ Step 1   │───▶│ Step 2   │───▶│ Step 3   │                    │
│  │ Parse    │    │ Check    │    │ Action   │                    │
│  │ Frontmatter│   │ Required │    │ Decision │                    │
│  │ (Script)  │    │ Fields  │    │ (STOP│WARN│PASS)│             │
│  └──────────┘    └──────────┘    └──────────┘                    │
│       │              │              │                               │
│       ▼              ▼              ▼                               │
│  [Valid?]       [Valid?]    [STOP → EVALUATE]                    │
│     │              │              │                               │
│     ▼              ▼              ▼                               │
│  [FAIL: Abort] [FAIL: Abort] [PASS → COMPLETE]                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1 | Parse Frontmatter | `validate.ts` | Valid YAML | Abort |
| 2 | Check Required Fields | `validate.ts` | All required fields present | Abort |
| 3 | Action Decision | `validate.ts` | Returns STOP/WARN/PASS | Continue |

### Required Frontmatter Fields

| Field | Type | Check |
|-------|------|-------|
| `description` | string | 1-60 chars |
| `argument-hint` | string? | If `$1` or `$ARGUMENTS` in body |
| `allowed-tools` | string[]? | If tools used in body |

### STOP Criteria (Critical — Cannot Proceed)

- Invalid YAML frontmatter
- Missing `description` field
- `description` exceeds 60 characters
- Invalid name format (not kebab-case)

### WARN Criteria (Warning — Can Proceed)

- Missing `argument-hint` when arguments referenced
- Missing `allowed-tools` when tools used
- No Platform Notes section

---

## Evaluate Workflow

Score command quality across 10 dimensions using **Two-Tier Architecture**.

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
│  │ .md      │    │ Required │    │ STOP/WARN/PASS│               │
│  │ (Script) │    │ (Script) │    │ (Script) │                    │
│  └──────────┘    └──────────┘    └──────────┘                    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ TIER 2: QUALITY SCORING (Script + LLM)                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                    │
│  │ Step 2.1 │───▶│ Step 2.2 │───▶│ Step 2.3 │                    │
│  │ Dimension│    │ Calculate│    │ LLM      │                    │
│  │ Scoring  │    │ Grade   │    │ Deep Eval│                    │
│  │ (Script) │    │ (Script) │    │ (Optional)│                   │
│  └──────────┘    └──────────┘    └──────────┘                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Tier 1: Structural Validation

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1.1 | Parse .md | Script | Valid markdown + YAML | Abort |
| 1.2 | Check Required | Script | All required fields | STOP |
| 1.3 | Action Decision | Script | Returns decision | Continue |

#### Tier 1 Action Types

| Action | Icon | Meaning | Tier 2 Continues? |
|--------|------|---------|-------------------|
| **STOP** | ⏹ | Critical failure - command cannot function | Yes (for diagnostics) |
| **WARN** | ⚠ | Warning - improvement suggested | Yes |
| **PASS** | ✓ | Valid structure | Yes |

---

### Tier 2: Quality Scoring

| Step | Name | Handler | Success Criteria |
|------|------|---------|------------------|
| 2.1 | Dimension Scoring | `evaluate.ts` | Returns scores for all dimensions |
| 2.2 | Calculate Grade | Script | Returns A/B/C/D/F |
| 2.3 | LLM Deep Eval | LLM (optional) | Returns detailed analysis |

#### Scoring Dimensions

MECE framework: 4 categories, 10 dimensions, 100 points total (source: `scripts/evaluation.config.ts`):

| Category | Dimension | Pts | What It Checks |
|----------|-----------|-----|----------------|
| **Content** (35) | Description Effectiveness | 15 | Clarity, trigger phrases, conciseness |
| | Content Quality | 12 | Body quality, examples, voice |
| | Structure & Brevity | 10 | Under 100 lines, clear sections |
| **Discovery & Trigger** (18) | Argument Design | 8 | Hint matches args, platform-appropriate |
| | Cross-Platform Portability | 8 | Works across platforms |
| **Safety & Security** (20) | Circular Reference Prevention | 5 | No circular refs to skills/agents |
| | Security | 10 | No dangerous patterns |
| | Naming Convention | 5 | kebab-case, descriptive |
| **Delegation** (27) | Delegation Architecture | 12 | Proper Skill() invocation pattern |
| | Frontmatter Quality | 15 | YAML validity, required fields |

#### Grading Scale

| Grade | Score | Meaning |
|-------|-------|---------|
| **A** | 90-100 | Production ready |
| **B** | 70-89 | Minor fixes needed |
| **C** | 50-69 | Moderate revision |
| **D** | 30-49 | Major revision |
| **F** | 0-29 | Rewrite needed |

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
│  │ Detect   │    │ Apply    │    │ LLM      │    │ Validate │   │
│  │ Issues   │    │ Scripted │    │ Checklist│    │ Result   │   │
│  │ (Evaluate)│   │ Fixes    │    │ (Agent)  │    │ (Script) │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │              │               │                │            │
│       ▼              ▼               ▼                ▼            │
│  [No issues]    [Apply]         [PASS?]         [COMPLETE]      │
│     │              │               │                              │
│     ▼              ▼               ▼                              │
│  [COMPLETE]  [Nothing to fix] [FAIL → Step 2]                   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────     │
│  Branch: Migration Mode (--migrate)                                │
│  ┌──────────┐    ┌──────────┐                                     │
│  │ Step M1  │───▶│ Step M2  │                                     │
│  │ Migrate  │    │ Validate │                                     │
│  │ (Script) │    │ (Script) │                                     │
│  └──────────┘    └──────────┘                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Standard Refine Flow

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1 | Detect Issues | `evaluate.ts` | Identifies what needs fixing | Continue |
| 2 | Apply Scripted Fixes | `refine.ts` | Fixes deterministic issues | Warn only |
| 3 | LLM Checklist | Checklist (invoking agent) | Verifies fuzzy issues | Back to step 2 |
| 4 | Validate Result | `validate.ts` | Validation passes | Retry step 3 |

### Step Details

#### Step 1: Detect Issues
```bash
bun scripts/evaluate.ts <command-path> --scope full
```

**What happens:**
- Run evaluation to identify issues
- Determine which fixes are deterministic vs fuzzy

#### Step 2: Apply Scripted Fixes (Script)
```bash
bun scripts/refine.ts <command-path>
```

**What script fixes (deterministic):**
- Truncate description to 60 characters
- Convert second-person to imperative form
- Add missing `argument-hint` when `$1` or `$ARGUMENTS` detected
- Remove unfilled "See Also" sections with template placeholders
- Remove trailing template metadata
- Add Platform Notes section if missing
- Generate platform companions

#### Step 3: LLM Checklist (Invoking Agent)
The invoking agent performs fuzzy quality checks via checklist.

**Checklist items:**

| # | Item | What the Agent Checks |
|---|------|-----------------------|
| 1 | Description quality | Imperative, under 60 chars, specific |
| 2 | Trigger phrases | 3+ quoted trigger phrases in description |
| 3 | Example blocks | 2+ `<example>` with `<commentary>` |
| 4 | Voice consistency | Imperative throughout, no second-person |
| 5 | Circular references | No `/rd3:command-*` self-references |
| 6 | argument-hint accuracy | Hint matches actual argument usage |
| 7 | Platform Notes | Section present with platform-specific guidance |
| 8 | allowed-tools appropriateness | Minimal necessary tools |

**If all items pass:** Continue to Step 4
**If failures:** Back to Step 2 for additional fixes

#### Step 4: Validate Result
```bash
bun scripts/validate.ts <command-path>
```

**If FAIL:** Warn but complete (user may need manual fix)

### Migration Mode Flow (--migrate)

| Step | Name | Handler | Success Criteria |
|------|------|---------|------------------|
| M1 | Migrate | `refine.ts --migrate` | Applies rd2→rd3 transforms |
| M2 | Validate | `validate.ts` | Structure valid |

**M1 script applies:**
- Remove invalid rd2 fields (name, agent, context, triggers, user-invocable, metadata)
- Add `description` field if missing
- Add `disable-model-invocation: true` for safety
- Add Platform Notes section

---

## Evolve Workflow

Analyze longitudinal improvements with snapshot/rollback support.

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ EVOLVE WORKFLOW                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Step 1   │───▶│ Step 2   │───▶│ Step 3   │───▶│ Step 4   │   │
│  │ Snapshot │    │ Analyze  │    │ Propose  │    │ Apply    │   │
│  │ (Script) │    │ Trends   │    │ Changes  │    │ (Script) │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │              │               │                │            │
│       ▼              ▼               ▼                ▼            │
│  [Saved]        [Report]       [Proposal]       [Updated]        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ROLLBACK PATH (if needed)                                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────┐                                                      │
│  │ Step R1  │◀───────────────────────────────────                │
│  │ Restore  │                                                      │
│  │ Snapshot │                                                      │
│  └──────────┘                                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Standard Evolve Flow

| Step | Name | Handler | Success Criteria |
|------|------|---------|------------------|
| 1 | Snapshot | `evolve.ts` | Creates backup of current state |
| 2 | Analyze Trends | `evolve.ts` | Returns trend analysis |
| 3 | Propose Changes | LLM (invoking agent) | Returns proposal with rationale |
| 4 | Apply Changes | `evolve.ts` | Applies approved changes |

### Snapshot Details

**What is snapshotted:**
- Full command .md content
- All companion files
- Timestamp and version

**Storage:** `.evolve/snapshots/` directory

### Rollback

| Step | Name | Handler | Success Criteria |
|------|------|---------|------------------|
| R1 | Restore Snapshot | `evolve.ts --rollback` | Restores previous state |

---

## Adapt Workflow

Generate platform companions for cross-platform compatibility.

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ ADAPT WORKFLOW                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Step 1   │───▶│ Step 2   │───▶│ Step 3   │───▶│ Step 4   │   │
│  │ Detect   │    │ Generate │    │ Validate │    │ Write    │   │
│  │ Platforms│    │ Companions│   │ Each     │    │ Output   │   │
│  │ (Script) │    │ (Adapters)│   │ (Script) │    │ (Script) │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │              │               │                │            │
│       ▼              ▼               ▼                ▼            │
│  [List]        [Generated]      [Valid?]         [COMPLETE]       │
│     │              │               │                              │
│     ▼              ▼               ▼                              │
│  [Skip unknown] [Errors → Warn] [FAIL → Retry]                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Platform Adapters

| Platform | Adapter | Output |
|----------|---------|--------|
| Claude Code | `adapters/claude.ts` | Native command (inline) |
| Codex | `adapters/codex.ts` | `agents/openai.yaml` |
| OpenClaw | `adapters/openclaw.ts` | `metadata.openclaw` |
| OpenCode | `adapters/opencode.ts` | `permissions.yaml` hints |
| Antigravity | `adapters/antigravity.ts` | `.ag.md` |
| Gemini | `adapters/gemini.ts` | Gemini-specific format |

### Step Details

#### Step 1: Detect Platforms (Script)
```bash
bun scripts/adapt.ts <command-path> --platform all
```

**What script does:**
- Reads `metadata.platforms` from frontmatter
- Default: all platforms if not specified

#### Step 2: Generate Companions (Adapters)
Each adapter generates platform-specific output:

| Platform | Output File |
|----------|-------------|
| claude | (inline — uses native command syntax) |
| codex | `agents/openai.yaml` |
| openclaw | `metadata.openclaw` |
| opencode | `permissions.yaml` |
| antigravity | `.ag.md` |
| gemini | `.gemini.md` |

#### Step 3: Validate Each (Script)
- YAML syntax valid
- Required fields present
- No cross-platform conflicts

#### Step 4: Write Output (Script)
- Writes to appropriate locations
- Reports generated files

---

## Workflow Selection Matrix

| Situation | Workflow | Steps |
|-----------|----------|-------|
| New command | Scaffold | 1 → 2 → 3 → 4 |
| Quality check | Evaluate | 1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 2.3 |
| Fix deterministic | Refine --scripted | 1 → 2 → 4 |
| Fix fuzzy | Refine --llm | 1 → 2 → 3 → 4 |
| Fix all | Refine | 1 → 2 → 3 → 4 |
| Migrate from rd2 | Refine --migrate | M1 → M2 |
| Cross-platform | Adapt | 1 → 2 → 3 → 4 |
| Longitudinal improve | Evolve | 1 → 2 → 3 → 4 |

---

## Retry Policy

| Failure Point | Retry Action | Max Retries |
|---------------|--------------|-------------|
| Scaffold | Re-run scaffold | 3 |
| Validate structure | Abort | N/A |
| LLM Verify | Back to appropriate step | 2 |
| Generate companions | Re-generate | 3 |
| Adapt files | Re-adapt | 3 |
| Evolve apply | Back to snapshot | 2 |

---

## Tool Handlers Summary

| Handler Type | Tools Used | Purpose |
|--------------|-----------|---------|
| **Script** | `scaffold.ts`, `validate.ts`, `evaluate.ts`, `refine.ts`, `evolve.ts`, `adapt.ts` | Deterministic operations |
| **Checklist (Agent)** | Invoking agent performs checklist | Fuzzy quality checks |
| **LLM (Optional)** | Claude via `--llm-eval` flag | Deep evaluation |

### When to Use LLM vs Script

| Use Script | Use LLM (Agent) |
|------------|-----------------|
| Format fixes (truncation, case) | Voice and tone consistency |
| Structural validation | Description quality |
| YAML frontmatter | Trigger phrase effectiveness |
| File generation | Content helpfulness |
