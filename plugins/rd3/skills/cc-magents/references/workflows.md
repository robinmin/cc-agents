# Main Agent Workflows

Detailed workflow definitions for cc-magents operations. Each workflow defines:
- **Step-by-step flow**: Ordered steps from start to completion
- **Tool per step**: Which script or checklist handles each step
- **Branching logic**: What to do when steps fail or succeed
- **Retry loops**: When to go back and redo previous steps

---

## Table of Contents

1. [Add Workflow](#add-workflow) - Create new main agent config
2. [Evaluate Workflow](#evaluate-workflow) - Validate and score quality
3. [Refine Workflow](#refine-workflow) - Fix issues and improve
4. [Evolve Workflow](#evolve-workflow) - Self-improvement proposals
5. [Adapt Workflow](#adapt-workflow) - Cross-platform conversion

---

## Add Workflow

Create a new main agent configuration from template with auto-detection.

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ ADD WORKFLOW                                                         │
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
bun scripts/synthesize.ts --detect
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
bun scripts/synthesize.ts <output-path> --template <template>
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

---

## Evaluate Workflow

Validate config structure and score quality using **Two-Tier Architecture**.

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
│  │ Parse    │    │ Validate │    │ Action   │                    │
│  │ Config   │    │ UMAM     │    │ STOP/SUGGEST│                 │
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
│  │ Dimension│    │ Calculate│    │ LLM      │    │ Generate │   │
│  │ Scoring  │    │ Grade    │    │ Deep Eval│    │ Report   │   │
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
| 1.2 | Validate UMAM | Script | All required fields | STOP |
| 1.3 | Action Decision | Script | No STOP → Continue | Continue to Tier 2 |

#### Tier 1 Action Types

| Action | Icon | Meaning | Tier 2 Continues? |
|--------|------|---------|-------------------|
| **STOP** | ⏹ | Critical failure - config cannot function | Yes (for diagnostics) |
| **SUGGEST** | 💡 | Warning - improvement suggested | Yes |

**STOP criteria:**
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
| 2.3 | LLM Deep Eval | LLM (optional) | Returns detailed analysis |
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

### LLM Deep Evaluation (Optional)

For human-level nuance beyond pattern matching.

#### When to Use

- Need judgment beyond pattern matching
- Want Claude's opinion on quality
- Need structured scoring against criteria

#### How to Run

```bash
# Standard evaluation
bun scripts/evaluate.ts <config-path>

# With LLM deep evaluation
bun scripts/evaluate.ts <config-path> --llm-eval
```

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

Fix issues and apply best practices. Supports preview and apply modes.

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│ REFINE WORKFLOW                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Step 1   │───▶│ Step 2   │───▶│ Step 3   │───▶│ Step 4   │   │
│  │ Detect   │    │ Apply    │    │ Validate │    │ Generate │   │
│  │ Issues   │    │ Fixes    │    │ Changes  │    │ Report   │   │
│  │ (Script) │    │ (Script) │    │ (Script) │    │ (Script) │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │              │              │                │            │
│       ▼              ▼              ▼                ▼            │
│  [No issues]    [Apply]         [Valid]         [COMPLETE]        │
│     │              │              │                              │
│     ▼              ▼              ▼                              │
│  [COMPLETE]    [Nothing to fix] [INVALID: Back to 2]           │
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
| 1 | Detect Issues | `refine.ts` | Detects what needs fixing | Continue |
| 2 | Apply Fixes | `refine.ts` | Applies deterministic fixes | Warn only |
| 3 | Validate Changes | `validate.ts` | Output is valid UMAM | Back to step 2 |
| 4 | Generate Report | `refine.ts` | Report of changes | Complete |

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
bun scripts/refine.ts <config-path>
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

#### Step 3: Validate Changes
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
| **L3** | Auto, fully autonomous | Yes |

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
│  │ Parse    │    │ Convert  │    │ Validate │    │ Generate │   │
│  │ Source   │    │ to UMAM  │    │ Target   │    │ Output   │   │
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
bun scripts/adapt.ts <source-path> --detect
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

#### Step 3: Validate Target (Script)
```bash
bun scripts/validate.ts <target-path>
```

**Validates:**
- Target format is valid
- Required sections present
- No critical data loss

#### Step 4: Generate Output (Script)
```bash
bun scripts/adapt.ts <source-path> --output <target-path> --platform <platform>
```

**What script does:**
- Generates target platform format from UMAM
- Applies platform-specific transformations

---

## Workflow Selection Matrix

| Situation | Workflow | Steps |
|-----------|----------|-------|
| New project config | Add | 1 → 2 → 3 → 4 |
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
