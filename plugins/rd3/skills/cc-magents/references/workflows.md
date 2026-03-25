# Main Agent Workflows

Detailed workflow definitions for cc-magents operations. Each workflow defines:
- **Step-by-step flow**: Ordered steps from start to completion
- **Tool per step**: Which script or checklist handles each step
- **Branching logic**: What to do when steps fail or succeed
- **Retry loops**: When to go back and redo previous steps

LLM content improvement is embedded in the normal workflow for every operation.
It is performed by the invoking agent as checklist-driven review/content improvement, not via a separate `--llm-eval` CLI mode.

## Shared Workflow Framework

This file follows the shared [Meta-Agent Workflow Schema](../../../references/meta-agent-workflow-schema.md).

Shared Phase 1 conventions:

- concept-level operations use `Create`, `Validate`, `Evaluate`, `Refine`, `Evolve`, and `Adapt`
- documentation decision states use `BLOCK`, `WARN`, and `PASS`
- deterministic script work and invoking-agent judgment are documented separately
- `Evolve` follows the closed loop: Observe -> Analyze -> Propose -> Apply -> Verify -> Snapshot -> Rollback -> Learn

---

## Table of Contents

1. [Create Workflow](#create-workflow) - Create new main agent config
2. [Validate Workflow](#validate-workflow) - Check config structure
3. [Evaluate Workflow](#evaluate-workflow) - Validate and score quality
4. [Refine Workflow](#refine-workflow) - Fix issues and improve
5. [Evolve Workflow](#evolve-workflow) - Self-improvement proposals
6. [Adapt Workflow](#adapt-workflow) - Cross-platform conversion

---

## Create Workflow

Create a new main agent configuration from template with auto-detection.

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ CREATE WORKFLOW                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Step 1   │───▶│ Step 2   │───▶│ Step 3   │───▶│ Step 4   │   │
│  │ Auto-    │    │ Template │    │ Generate │    │ Validate │   │
│  │ Detect   │    │ Select   │    │ Config   │    │ Output   │   │
│  │ (Script) │    │ (Script) │    │ (Script) │    │ (Script) │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │                                                    │           │
│       ▼                                                    ▼           │
│  [No project]                                      [COMPLETE]        │
│     │                                                                    │
│     ▼                                                                    │
│  [Use general template]                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1 | Auto-Detect | `synthesize.ts` | Detects language, framework, tools | Use general template |
| 2 | Template Select | `synthesize.ts` | Selects appropriate template | Use general template |
| 3 | Generate Config | `synthesize.ts` | Creates AGENTS.md/CLAUDE.md | Retry step 3 |
| 4 | Validate Output | `validate.ts` | Output is valid UMAM | Retry from step 1 |

### Step Details

#### Step 1: Auto-Detect (Script)
```bash
bun scripts/synthesize.ts --auto-detect
```

**What script detects:**
- Primary language (Node.js, Go, Rust, Python, etc.)
- Frameworks (React, FastAPI, NestJS, etc.)
- Package manager (npm, pnpm, yarn, go mod, cargo, pip)
- Test runner (vitest, jest, pytest, etc.)
- CI/CD platform (GitHub Actions, GitLab, Jenkins)

**Output:** Detection report with detected items

#### Step 2: Template Select (Script)

**Available templates:**

| Template | Purpose | Best For |
|----------|---------|----------|
| `dev-agent` | Software development | Node.js, Go, Rust, Python projects |
| `research-agent` | Research and analysis | Investigation tasks |
| `content-agent` | Content creation | Documentation, blogs |
| `data-agent` | Data science and ML | Data analysis projects |
| `devops-agent` | DevOps and infrastructure | CI/CD, deployments |
| `general-agent` | General purpose | Any project type |

#### Step 3: Generate Config (Script)
```bash
bun scripts/synthesize.ts <template> --output <output-path>
```

**What script does:**
- Creates AGENTS.md (canonical format)
- Populates sections based on template
- Injects auto-detected project specifics

**Output:** Main agent config file

#### Step 4: Validate Output (Script)
```bash
bun scripts/validate.ts <config-path>
```

**If FAIL:** Retry from step 1 with corrections

### Embedded LLM Content Improvement

After deterministic generation and validation, the invoking agent reviews the generated config:

1. Tighten vague sections, examples, and decision trees
2. Ensure auto-detected project details were incorporated coherently
3. Confirm the config is ready for evaluate/refine without introducing unsupported claims

This review is part of the normal create workflow.

---

## Validate Workflow

Validate config structure before evaluation, refinement, or adaptation.

### Workflow Steps

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1 | Parse Config | `validate.ts` | Config can be parsed | Abort |
| 2 | Check Required Structure | `validate.ts` | Required sections and UMAM expectations pass | Retry after fixes |
| 3 | Action Decision | `validate.ts` + invoking agent | Returns BLOCK/WARN/PASS with follow-up action | Continue |

### Step Details

#### Step 1: Parse Config
```bash
bun scripts/validate.ts <config-path>
```

#### Step 2: Check Required Structure

Deterministic validation checks:

- readable markdown structure
- required sections present
- UMAM-relevant shape is valid
- no critical format breakage

#### Step 3: Action Decision

The invoking agent reviews the validation output and decides whether to:

- stop on `BLOCK`
- continue with caveats on `WARN`
- proceed directly on `PASS`

---

## Evaluate Workflow

Validate config structure and score quality using **Two-Tier Architecture**.

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
│  │ Parse    │    │ Validate │    │ Action   │                    │
│  │ Config   │    │ UMAM     │    │ BLOCK/WARN │                 │
│  │          │    │          │    │ /PASS      │                 │
│  └──────────┘    └──────────┘    └──────────┘                    │
│       │              │              │                               │
│       ▼              ▼              ▼                               │
│  [Valid?]       [Valid?]    [BLOCK → Continue to Tier 2]         │
│     │              │              │                               │
│     ▼              ▼              ▼                               │
│  [BLOCK: Abort] [BLOCK]                                       │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ TIER 2: QUALITY SCORING (Script + LLM)                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Step 2.1 │───▶│ Step 2.2 │───▶│ Step 2.3 │───▶│ Step 2.4 │   │
│  │ Dimension│    │ Calculate│    │ Checklist│    │ Generate │   │
│  │ Scoring  │    │ Grade    │    │ Review   │    │ Report   │   │
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

**Purpose:** Verify config can be parsed (deterministic checks).

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1.1 | Parse Config | Script | Valid markdown + UMAM | Abort |
| 1.2 | Validate UMAM | Script | All required fields | BLOCK |
| 1.3 | Action Decision | Script | No BLOCK → Continue | Continue to Tier 2 |

#### Tier 1 Action Types

| Action | Icon | Meaning | Tier 2 Continues? |
|--------|------|---------|-------------------|
| **BLOCK** | ⏹ | Critical failure - config cannot function | Yes (for diagnostics) |
| **WARN** | ⚠ | Improvement is suggested before shipping | Yes |

**BLOCK criteria:**
- Missing config file
- Invalid markdown structure
- Empty config (no sections)
- Missing required platform fields

---

### Tier 2: Quality Scoring

**Purpose:** Assess config quality across 5 MECE dimensions.

| Step | Name | Handler | Success Criteria |
|------|------|---------|------------------|
| 2.1 | Dimension Scoring | Script | Returns scores for all dimensions |
| 2.2 | Calculate Grade | Script | Returns A/B/C/D/F |
| 2.3 | Embedded LLM Checklist Review | LLM (invoking agent) | Returns detailed follow-up guidance |
| 2.4 | Generate Report | Script | JSON/text output |

#### Scoring Dimensions

5-dimension MECE framework (source: `scripts/evaluation.config.ts`):

| Dimension | Weight (Standard) | Measures |
|-----------|------------------|----------|
| **Coverage** | 25% | Core sections and concerns are present and substantive |
| **Operability** | 25% | Decision trees, executable examples, output contracts |
| **Grounding** | 20% | Evidence, verification steps, uncertainty handling |
| **Safety** | 20% | CRITICAL rules, approvals, destructive warnings |
| **Maintainability** | 10% | Memory, feedback, steering, version tracking |

#### Weight Profiles

| Profile | Coverage | Operability | Grounding | Safety | Maintainability |
|---------|----------|-------------|-----------|--------|-----------------|
| **standard** | 25% | 25% | 20% | 20% | 10% |
| **minimal** | 30% | 20% | 15% | 30% | 5% |
| **advanced** | 20% | 20% | 25% | 15% | 20% |

#### Grade Thresholds

| Grade | Score | Meaning |
|-------|-------|---------|
| **A** | >= 90% | Production ready |
| **B** | >= 80% | Minor fixes needed |
| **C** | >= 70% | Warning |
| **D** | >= 60% | No |
| **F** | < 60% | No |

---

### Embedded LLM Checklist Review

Use the invoking agent's LLM judgment to strengthen the script findings with qualitative review.

#### When to Use

- Need judgment beyond pattern matching
- Want Claude's opinion on quality
- Need structured scoring against criteria

#### How to Use

```bash
# Standard evaluation
bun scripts/evaluate.ts <config-path>
```

Then the invoking agent reviews the generated findings and applies the checklist below before deciding whether to proceed, refine, or stop.

#### LLM Checks

| # | Item | Check |
|---|------|-------|
| 1 | Coverage quality | Sections are substantive |
| 2 | Operability | Has clear decision trees |
| 3 | Grounding | Evidence cited, uncertainty noted |
| 4 | Safety | CRITICAL rules present and clear |
| 5 | Maintainability | Memory/feedback mechanisms clear |

---

## Refine Workflow

Fix issues and apply best practices. Supports preview and apply modes, with embedded LLM content improvement after scripted fixes.

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ REFINE WORKFLOW                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Step 1   │───▶│ Step 2   │───▶│ Step 3   │───▶│ Step 4   │   │
│  │ Detect   │    │ Apply    │    │ LLM      │    │ Validate │   │
│  │ Issues   │    │ Fixes    │    │ Content  │    │ Result   │   │
│  │ (Script) │    │ (Script) │    │ Improve  │    │ (Script) │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │              │              │                │            │
│       ▼              ▼              ▼                ▼            │
│  [No issues]    [Apply]       [Improved]      [COMPLETE]          │
│     │              │              │                              │
│     ▼              ▼              ▼                              │
│  [COMPLETE]    [Nothing to fix] [FAIL: Back to 2]              │
│                                                                      │
│  ─────────────────────────────────────────────────────────────     │
│  Branch: CRITICAL Protection                                       │
│  Sections with [CRITICAL] markers are NEVER modified               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Standard Refine Flow

| Step | Name | Handler | Success Criteria | On Failure |
|------|------|---------|------------------|-------------|
| 1 | Detect Issues | `refine.ts --dry-run` | Detects what needs fixing | Continue |
| 2 | Apply Fixes | `refine.ts` | Applies deterministic fixes | Warn only |
| 3 | Embedded LLM Content Improvement | LLM (invoking agent) | Soft-quality issues are addressed | Back to step 2 |
| 4 | Validate Changes | `validate.ts` | Output is valid UMAM | Retry step 3 |

### Step Details

#### Step 1: Detect Issues
```bash
# Preview what will be changed
bun scripts/refine.ts <config-path> --dry-run
```

**What script detects:**
- Empty sections
- Duplicate content
- Forbidden AI phrases
- Structural issues

#### Step 2: Apply Fixes
```bash
# Apply fixes
bun scripts/refine.ts <config-path> --apply
```

**What script fixes (deterministic):**
- Remove empty sections
- Merge duplicate content
- Remove forbidden AI phrases:
  - "great question"
  - "I'm sorry"
  - "would you like me to"
  - "let me think"
  - "as an AI"

**CRITICAL Protection:** Sections containing `[CRITICAL]` markers are NEVER modified.

#### Step 3: Embedded LLM Content Improvement

The invoking agent reviews the refined config before validation:

1. Tighten vague sections and examples
2. Improve decision trees, output contracts, and verification instructions
3. Preserve CRITICAL rules and factual intent while improving clarity
4. Decide whether another refine pass is needed before validation

This review is part of the normal refine flow.

#### Step 4: Validate Changes
```bash
bun scripts/validate.ts <config-path>
```

**If INVALID:** Back to step 2 for corrections

#### Action Types

| Type | Approval Required | Examples |
|------|------------------|----------|
| **structural** | Sometimes | Remove empty sections, merge duplicates |
| **quality** | Yes | Add missing sections, expand content |
| **best-practice** | No | Remove forbidden AI phrases |

---

## Evolve Workflow

Self-improvement based on pattern analysis. Three safety levels control autonomy.

### Closed-Loop Phases

This workflow follows the shared evolution loop:

1. Observe data sources and evaluation signals
2. Analyze patterns and gaps
3. Propose bounded improvements
4. Apply approved changes
5. Verify the resulting behavior
6. Snapshot version history
7. Roll back if needed
8. Learn from the recorded outcome

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ EVOLVE WORKFLOW (Self-Evolution)                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ Step 1      │───▶│ Step 2      │───▶│ Step 3      │   │
│  │ --analyze   │    │ --propose   │    │ --apply     │   │
│  │ Scan Sources│    │ Draft       │    │ Apply w/    │   │
│  │             │    │ Proposals   │    │ Confirm     │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│       │                    │                   │               │
│       ▼                    ▼                   ▼               │
│  [Patterns found]    [Proposals ready]   [COMPLETE]            │
│     │                    │                   │               │
│     ▼                    ▼                   ▼               │
│  [No patterns]      [Skip to report]   [--confirm required]      │
│                                                                      │
│  ─────────────────────────────────────────────────────────────     │
│  Safety Levels                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ L1 (default) │    │ L2          │    │ L3          │   │
│  │ Suggest-only │───▶│ Semi-auto   │───▶│ Auto         │   │
│  │ All changes  │    │ Low-risk    │    │ Fully       │   │
│  │ require      │    │ auto-apply  │    │ autonomous  │   │
│  │ approval     │    │             │    │             │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Safety Levels

| Level | Behavior | Auto-Apply? |
|-------|----------|-------------|
| **L1** (default) | Suggest-only, all changes require approval | No |
| **L2** | Semi-auto, low-risk changes auto-apply | Low-risk only |
| **L3** | Reserved for high-autonomy environments with explicit project policy | Policy-gated |

### Data Sources

| Source | Looks For |
|--------|-----------|
| Git history | Commit frequency, section modifications |
| CI results | Test failures, quality trends |
| User feedback | Ratings, explicit signals |
| Memory files | MEMORY.md patterns |
| Interaction logs | Command usage, success/failure |

### Step Details

#### Step 1: Analyze (--analyze)
```bash
bun scripts/evolve.ts <config-path> --analyze
```

**What script does:**
- Scans configured data sources
- Identifies patterns
- Generates analysis report

**Output:** Pattern analysis with evidence

#### Step 2: Propose (--propose)
```bash
bun scripts/evolve.ts <config-path> --propose
```

**What script does:**
- Generates improvement proposals
- Each proposal includes:
  - Problem identified
  - Proposed change
  - Expected benefit
  - Risk assessment

#### Embedded LLM Proposal Review

After `--propose`, the invoking agent reviews the proposal set before any apply step:

1. Remove weak or duplicate proposals
2. Tighten rationale and expected impact
3. Confirm ordering matches risk and expected benefit
4. Decide whether to apply, defer, or gather more evidence

This review is part of the normal evolve workflow.

#### Step 3: Apply (--apply)
```bash
bun scripts/evolve.ts <config-path> --apply <proposal-id> --confirm
```

**Requires:** `--confirm` flag for safety

**What script does:**
- Applies approved proposal
- Creates snapshot before change
- Records in evolution history

### History & Rollback

```bash
# View history
bun scripts/evolve.ts <config-path> --history

# Rollback to version
bun scripts/evolve.ts <config-path> --rollback <version> --confirm
```

---

## Adapt Workflow

Convert between platform formats via Universal Main Agent Model (UMAM).

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ ADAPT WORKFLOW (Cross-Platform Conversion)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Step 1   │───▶│ Step 2   │───▶│ Step 3   │───▶│ Step 4   │   │
│  │ Parse    │    │ Convert  │    │ Generate │    │ Validate │   │
│  │ Source   │    │ to UMAM  │    │ Output   │    │ Target   │   │
│  │ (Script) │    │ (Script) │    │ (Script) │    │ (Script) │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │                                                    │       │
│       ▼                                                    ▼       │
│  [Parse OK]                                          [COMPLETE]    │
│     │                                                                    │
│     ▼                                                                    │
│  [FAIL: Abort]                                                        │
│                                                                      │
│  ─────────────────────────────────────────────────────────────     │
│  Platform Tiers                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Tier 1   │    │ Tier 2   │    │ Tier 3   │    │ Tier 4   │   │
│  │ Full     │───▶│ Standard │───▶│ Basic    │───▶│ Generic  │   │
│  │ Parse+   │    │ Parse+   │    │ Generate │    │ Pass-    │   │
│  │ Generate │    │ Generate │    │ Only     │    │ through  │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Platform Tiers

| Tier | Platforms | Support | Files |
|------|-----------|---------|-------|
| **1** (Full) | AGENTS.md, CLAUDE.md, GEMINI.md, Codex | Parse + Generate + Validate | AGENTS.md, .claude/CLAUDE.md, .gemini/GEMINI.md |
| **2** (Standard) | .cursorrules, .windsurfrules, Zed, OpenCode | Parse + Generate | .cursorrules, .windsurfrules, .zed/rules |
| **3** (Basic) | Aider, Warp, RooCode, Amp, VS Code | Generate only | .aider.conf.yml, .warp/rules.md |
| **4** (Generic) | All others | Pass-through | AGENTS.md copy |

### Conversion Warnings

Some features may be lost in conversion:

| Source | Target | Issue |
|--------|--------|-------|
| CLAUDE.md | Codex | Memory patterns lost |
| CLAUDE.md | .cursorrules | Hooks not portable |
| GEMINI.md | Any except GEMINI | save_memory not portable |

### Step Details

#### Step 1: Parse Source (Script)
```bash
bun scripts/adapt.ts <source-path> --to <target-platform>
```

**What script does:**
- Detects source platform format
- Parses into UMAM structure
- Validates source is well-formed

**If FAIL:** Abort - cannot convert invalid source

#### Step 2: Convert to UMAM (Script)

**UMAM structure:**
```typescript
interface UniversalMainAgent {
    sourcePath: string;
    sourceFormat: MagentPlatform;
    metadata?: MagentMetadata;
    sections: MagentSection[];    // Ordered array
    hierarchy?: 'global' | 'project' | 'directory';
    estimatedTokens?: number;
    platformFeatures?: string[];
}
```

#### Step 3: Generate Output (Script)
```bash
bun scripts/adapt.ts <source-path> --to <platform> --output <target-path>
```

**What script does:**
- Generates target platform format from UMAM
- Applies platform-specific transformations

#### Step 4: Validate Target (Script)
```bash
bun scripts/validate.ts <target-path>
```

**Validates:**
- Target format is valid
- Required sections present
- No critical data loss

### Embedded LLM Content Improvement

After deterministic generation and validation, the invoking agent reviews the converted output:

1. Check that target-platform instructions still preserve the source intent
2. Tighten weak examples, decision trees, or platform notes that became misleading after conversion
3. Loop back to adapt or refine if the source needs improvement before regeneration

This review is part of the normal adapt workflow.

---

## Workflow Selection Matrix

| Situation | Workflow | Steps |
|-----------|----------|-------|
| New project config | Create | 1 → 2 → 3 → 4 |
| Structure check | Validate | 1 → 2 → 3 |
| Quality check | Evaluate | 1 → 2 → 3 → 4 |
| Preview fixes | Refine --dry-run | 1 → 2 |
| Apply fixes | Refine | 1 → 2 → 3 → 4 |
| Analyze patterns | Evolve --analyze | 1 |
| Generate proposals | Evolve --propose | 1 → 2 |
| Apply proposal | Evolve --apply | 1 → 2 → 3 |
| Convert to another platform | Adapt | 1 → 2 → 3 → 4 |

---

## Retry Policy

| Failure Point | Retry Action | Max Retries |
|---------------|--------------|-------------|
| Add: Auto-detect | Use general template | N/A |
| Add: Generate | Re-run generation | 3 |
| Evaluate: Parse | Abort | N/A |
| Refine: Apply | Warn and continue | 2 |
| Adapt: Parse source | Abort | N/A |
| Adapt: Generate | Re-generate | 3 |
