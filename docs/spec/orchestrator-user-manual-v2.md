# Orchestration v2 — User Manual

**Version:** 1.0.0
**Date:** 2026-04-02
**Authors:** Robin Min, Lord Robb
**Status:** Current
**Architecture:** [Architecture v1.0.0](./orchestrator-architecture-v2.md)
**Functional Spec:** [FSD v1.0.0](./orchestrator-fsd-v2.md)

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Core Concepts](#2-core-concepts)
3. [Running Pipelines](#3-running-pipelines)
4. [Monitoring Progress](#4-monitoring-progress)
5. [Resuming Paused Pipelines](#5-resuming-paused-pipelines)
6. [Generating Reports](#6-generating-reports)
7. [Customizing Pipelines](#7-customizing-pipelines)
8. [Pipeline Presets](#8-pipeline-presets)
9. [History and Trends](#9-history-and-trends)
10. [Undo and Rollback](#10-undo-and-rollback)
11. [Phase Inspection](#11-phase-inspection)
12. [State Management](#12-state-management)
13. [Troubleshooting](#13-troubleshooting)
14. [Configuration Reference](#14-configuration-reference)
15. [Pipeline YAML Reference](#15-pipeline-yaml-reference)

---

## 1. Getting Started

### Prerequisites

- **Bun** ≥ 1.0 (runtime for the orchestrator and skill scripts)
- **SQLite** (bundled with Bun via `bun:sqlite` — no separate install needed)
- **Git** (for undo/rollback snapshot functionality)

### Installation

The orchestrator is part of the `orchestration-v2` skill at:
```
plugins/rd3/skills/orchestration-v2/scripts/run.ts
```

Run directly:
```bash
bun plugins/rd3/skills/orchestration-v2/scripts/run.ts --help
```

Or via the `orchestrator` symlink (if configured in `package.json`):
```bash
orchestrator --help
```

### First Run

```bash
# Validate the default pipeline
orchestrator validate

# Run a simple pipeline for task 0266
orchestrator run 0266 --preset simple

# Check status
orchestrator status
```

### Where State Lives

Pipeline state is stored in SQLite at:
```
.rdinstate/orchestrator.db
```

Override with `--state-dir` or `ORCHESTRATOR_STATE_DIR` env var.

---

## 2. Core Concepts

### Pipeline YAML

A pipeline is defined in a YAML file that declares phases, their dependencies, skills to invoke, and gate configurations. The pipeline YAML is **what** to run — the engine decides **how** and **when**.

**Default pipeline:** `.rd3/pipeline.yaml` (if it exists), otherwise built-in examples from `references/examples/`.

### Phases

A phase is a single execution unit in the pipeline. Each phase:
- Invokes a specific skill (e.g., `rd3:code-implement-common`)
- Has a gate (auto or human) that checks results
- May have a timeout and rework configuration
- Declares dependencies via `after:` (forming a DAG)

### DAG (Directed Acyclic Graph)

Phases form a dependency graph. The DAG scheduler determines execution order:
- Phases with no dependencies run first
- A phase runs when all its `after:` dependencies are completed
- Phases with no dependency relationship can run in parallel (parallel dispatch is supported)

### FSM (Finite State Machine)

The pipeline lifecycle is managed by a 5-state FSM:

```
IDLE → RUNNING → COMPLETED
               → PAUSED → RUNNING (resume)
               → FAILED
```

- **IDLE**: No pipeline running
- **RUNNING**: Actively executing phases
- **PAUSED**: Waiting for human gate approval
- **COMPLETED**: All phases done
- **FAILED**: Pipeline failed

### Gates

Gates verify phase output before advancing:
- **Auto gate**: Runs automated checks (CLI commands, content matching) via the CoV driver
- **Human gate**: Pauses the pipeline and waits for `orchestrator resume --approve` or `--reject`

### Rework

When a phase fails and rework is configured:
1. The error is captured as feedback
2. The phase is re-executed with the feedback injected
3. This repeats up to `max_iterations`
4. If still failing, the escalation policy triggers (pause or fail)

---

## 3. Running Pipelines

### Basic Usage

```bash
# Run with default settings (all phases in DAG order)
orchestrator run 0266

# Run with a named preset
orchestrator run 0266 --preset simple

# Run specific phases (DAG resolves order)
orchestrator run 0266 --phases implement,test

# Override coverage threshold
orchestrator run 0266 --coverage 90

# Use a custom pipeline file
orchestrator run 0266 --pipeline .rd3/custom.yaml

# Dry-run (show plan, don't execute)
orchestrator run 0266 --dry-run
```

### Phase Selection Precedence

1. `--phases implement,test` — explicit phase list (highest priority)
2. `--preset simple` — named preset from pipeline YAML
3. (no flag) — all phases in DAG order

When `--phases` is used, the engine validates that the requested phases form a valid subgraph. Missing dependencies are reported as errors.

### Common Scenarios

#### Quick Fix (implement + test only)
```bash
orchestrator run 0315 --phases implement,test
```

#### Full Pipeline with Custom Coverage
```bash
orchestrator run 0266 --preset complex --coverage 95
```

#### Dry-Run to Preview Execution Plan
```bash
orchestrator run 0266 --preset complex --dry-run
```

Output:
```
[dry-run] Pipeline valid. Would execute:
  - intake
  - arch
  - design
  - decompose
  - implement
  - test
  - review
  - verify-bdd
  - verify-func
  - docs
```

#### Auto-Approve Human Gates
```bash
orchestrator run 0266 --auto
```

The `--auto` flag skips human gates, auto-approving them.

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Pipeline completed successfully |
| 1 | Pipeline failed (phase error, gate failure) |
| 2 | Pipeline paused (human gate or manual pause) |
| 10 | Invalid arguments |
| 11 | Pipeline YAML validation failed |
| 12 | Task not found |
| 13 | State error (corrupt DB, locked) |
| 20 | Executor unavailable |

---

## 4. Monitoring Progress

### View Current Status

```bash
# Latest run
orchestrator status

# Specific task
orchestrator status 0266

# Specific run ID
orchestrator status --run run_m3q2x4_f8a2b1

# All runs
orchestrator status --all

# JSON output
orchestrator status --json
```

### Status Output

```
Run: 0266  Status: COMPLETED
Pipeline: default  Preset: complex
Duration: 52m 14s

  intake           completed   rd3:request-intake
  arch             completed   rd3:backend-architect
  design           completed   rd3:backend-design
  decompose        completed   rd3:task-decomposition
  implement        completed   rd3:code-implement-common
  test             completed   rd3:sys-testing
  review           completed   rd3:code-review-common
  verify-bdd       completed   rd3:bdd-workflow
  verify-func      completed   rd3:functional-review
  docs             completed   rd3:code-docs
```

### Understanding Phase Status

| Status | Meaning |
|--------|---------|
| `pending` | Not yet started |
| `running` | Currently executing |
| `completed` | Successfully finished |
| `failed` | Failed (check `inspect` for details) |
| `paused` | Waiting for human gate approval |
| `skipped` | Not in the active phase set |

---

## 5. Resuming Paused Pipelines

When a pipeline hits a human gate, it pauses with exit code 2. Resume with:

```bash
# Approve the pending human gate (default behavior)
orchestrator resume 0266

# Explicitly approve
orchestrator resume 0266 --approve

# Reject the pending gate (pipeline fails)
orchestrator resume 0266 --reject

# Approve and continue with auto gates
orchestrator resume 0266 --approve --auto
```

### What Happens on Resume

**Approve:**
1. Paused phases marked as completed
2. FSM: PAUSED → RUNNING
3. DAG re-evaluates and dispatches newly ready phases
4. Pipeline continues until next gate or completion

**Reject:**
1. Paused phases marked as failed
2. FSM: PAUSED → FAILED
3. Pipeline terminates with exit code 1

---

## 6. Generating Reports

### Report Formats

```bash
# Table format (default)
orchestrator report 0266

# Markdown format
orchestrator report 0266 --format markdown

# JSON format (machine-readable)
orchestrator report 0266 --format json

# Summary format (one-line)
orchestrator report 0266 --format summary

# Write to file
orchestrator report 0266 --format markdown --output report.md
```

### Sample Table Output

```
Run: 0266  Status: COMPLETED
Pipeline: default  Preset: complex
Duration: 52m 14s

Phase             Status       Skill
──────────────── ────────── ──────────────────────────
intake            completed    rd3:request-intake
arch              completed    rd3:backend-architect
...

Duration: 52m 14s  Tokens: 184.0K
Models: claude-sonnet-4, claude-opus-4
```

### Sample Summary Output

```
Run 0266: COMPLETED
  Pipeline: default  Preset: complex
  Duration: 52m 14s  Tokens: 184.0K
  Phases: 10 (10 completed)
  intake: completed
  arch: completed
  ...
  Models: claude-sonnet-4, claude-opus-4
```

---

## 7. Customizing Pipelines

### Creating a Project Pipeline

Create `.rd3/pipeline.yaml`:

```yaml
schema_version: 1
name: my-project

stack:
  language: typescript
  runtime: bun
  linter: biome
  test: "bun test"
  coverage: "bun test --coverage"

phases:
  implement:
    skill: rd3:code-implement-common
    gate:
      type: auto
      rework: { max_iterations: 3, escalation: pause }
    timeout: 2h

  test:
    skill: rd3:sys-testing
    gate:
      type: auto
      rework: { max_iterations: 2, escalation: fail }
    timeout: 1h
    after: [implement]
    payload:
      coverage_threshold: 80

  review:
    skill: rd3:code-review-common
    gate: { type: human }
    after: [test]

  docs:
    skill: rd3:code-docs
    gate: { type: auto }
    timeout: 30m
    after: [review]

presets:
  quick:
    phases: [implement, test]
    defaults: { coverage_threshold: 60 }
  full:
    phases: [implement, test, review, docs]
    defaults: { coverage_threshold: 80 }
```

### Extending a Base Pipeline

Create a base pipeline at `.rd3/base.yaml`:
```yaml
schema_version: 1
name: base
phases:
  implement:
    skill: rd3:code-implement-common
    gate: { type: auto }
    timeout: 2h
  test:
    skill: rd3:sys-testing
    gate: { type: auto }
    after: [implement]
```

Extend it in `.rd3/pipeline.yaml`:
```yaml
schema_version: 1
name: my-project
extends: .rd3/base.yaml

phases:
  security-scan:
    skill: rd3:code-review-common
    gate: { type: auto }
    after: [implement]
    payload:
      focus_areas: [security]

  test:
    payload:
      coverage_threshold: 95  # Override base
```

**Extends rules:**
- Max 2 levels deep (base → project)
- Child phases override parent with same name (deep merge on `payload`)
- Child presets override parent with same name
- Child hooks are appended to parent hooks

### Adding Hooks

```yaml
hooks:
  on-phase-complete:
    - run: "echo '{{phase}} completed for {{task_ref}}'"
  on-phase-failure:
    - run: "notify-send 'Pipeline failed' 'Phase {{phase}} failed: {{error}}'"
```

**Template variables:** `{{phase}}`, `{{task_ref}}`, `{{run_id}}`, `{{duration}}`, `{{iteration}}`, `{{error}}`

---

## 8. Pipeline Presets

### Using Presets

```bash
# Run with a preset
orchestrator run 0266 --preset simple
orchestrator run 0266 --preset complex
orchestrator run 0266 --preset research
```

### Defining Presets

In your `pipeline.yaml`:

```yaml
presets:
  simple:
    phases: [implement, test]
    defaults:
      coverage_threshold: 60

  standard:
    phases: [intake, implement, test, review, docs]
    defaults:
      coverage_threshold: 80

  complex:
    phases: [intake, arch, design, decompose, implement, test, review, verify-bdd, verify-func, docs]
    defaults:
      coverage_threshold: 80
```

### Preset vs `--phases`

| Aspect | `--preset` | `--phases` |
|--------|-----------|-----------|
| Defined in | pipeline.yaml | CLI argument |
| Defaults | Applied | Not applied |
| Reusability | Named, reusable | One-off |
| Precedence | Lower | Higher (overrides `--preset`) |

---

## 9. History and Trends

### Viewing Run History

```bash
# Last 10 runs (default)
orchestrator history

# Last 50 runs
orchestrator history --last 50

# Filter by preset
orchestrator history --preset complex

# Filter by date
orchestrator history --since 2026-03-01

# Only failed runs
orchestrator history --failed

# JSON output
orchestrator history --json
```

### Output Format

```
Run 0270: COMPLETED
  Pipeline: default  Preset: simple
  Duration: 12m 04s  Tokens: 45.2K
  Phases: 2 (2 completed)
  implement: completed
  test: completed

Run 0266: COMPLETED
  Pipeline: default  Preset: complex
  Duration: 52m 14s  Tokens: 184.0K
  Phases: 10 (10 completed)
  ...

Pipeline Trends (last 30 days)
  Overall Statistics:
    47 runs | 85% success rate
  By Preset:
    simple (12 runs, 92% success, avg 12m 4s)
    standard (18 runs, 83% success, avg 28m 12s)
    complex (17 runs, 82% success, avg 48m 6s)
```

---

## 10. Undo and Rollback

### When to Use Undo

Use undo when a phase produced incorrect results and you need to:
- Restore files to their pre-phase state
- Clear downstream phases that depend on the incorrect phase
- Re-run from the undone phase

### Undoing a Phase

```bash
# Undo phase 5 (implement) for task 0266
orchestrator undo 0266 implement

# Preview without making changes
orchestrator undo 0266 implement --dry-run

# Force even with uncommitted changes
orchestrator undo 0266 implement --force
```

### What Undo Does

1. Loads the rollback snapshot (git HEAD + files before/after)
2. Checks for uncommitted changes (unless `--force`)
3. Restores files via `git checkout {hash} -- {file}`
4. Deletes files created during the phase
5. Finds all downstream dependent phases (BFS traversal)
6. Resets the phase and all downstream phases to `pending`
7. Sets run status to `PAUSED`

### Dry-Run Output

```
[dry-run] Undo plan:
  Files to restore: src/api/batch-handler.ts, src/api/routes.ts
  Files to delete (created by phase): src/api/batch-types.ts
  Downstream phases to clear: test, review, verify-bdd, verify-func, docs
```

---

## 11. Phase Inspection

### Inspecting a Phase

```bash
# Basic inspection
orchestrator inspect 0266 review

# Show gate evidence
orchestrator inspect 0266 review --evidence

# JSON output
orchestrator inspect 0266 review --json
```

### Output (default)

```
Run: 0266 (run_m3q2x4_f8a2b1)
Pipeline: default  Preset: complex
Phase: review
Status: paused
Skill: rd3:code-review-common
Rework: 0
Started: 2026-04-01T14:48:00Z
```

### Output (with --evidence)

```
Run: 0266 (run_m3q2x4_f8a2b1)
Pipeline: default  Preset: complex
Phase: review
Status: paused
Skill: rd3:code-review-common
Rework: 0

Evidence:
  - execution-success (cli): pass
  - human-approval (human): fail
```

---

## 12. State Management

### Pruning Old Data

Over time, the event store accumulates data. Use pruning to compact:

```bash
# Prune runs older than 30 days (default)
orchestrator prune

# Prune runs older than 90 days
orchestrator prune --older-than 90d

# Keep only last 100 runs
orchestrator prune --keep-last 100

# Preview without changes
orchestrator prune --older-than 90d --dry-run
```

**Duration format:** `{number}{unit}` — `30d`, `1y`, `2h`, `90m`, `1w`, `6M`

**What gets deleted:** events, gate_results, resource_usage, rollback_snapshots.
**What's preserved:** runs, phases (for historical queries).

### Migrating from V1

```bash
# Migrate from default v1 directory
orchestrator migrate --from-v1

# Specify custom v1 directory
orchestrator migrate --from-v1 --dir path/to/v1/state

# Or with positional argument
orchestrator migrate --from-v1 path/to/v1/state
```

**What happens:**
1. Scans for `*.json` files in the v1 directory
2. Converts each to SQLite records (runs, phases, events)
3. Maps v1 phase numbers to v2 phase names
4. Preserves evidence as typed events
5. Reports migration statistics

**Output:**
```
Found 15 v1 state file(s) to migrate
  ✓ Migrated: 0266 (complex) → v1-0266-state
  ✓ Migrated: 0270 (simple) → v1-0270-state
  ...
Migration complete: 15 migrated, 0 skipped, 0 errors
```

---

## 13. Troubleshooting

### Common Issues

#### "Pipeline validation failed"

```bash
# Check what's wrong
orchestrator validate

# View the JSON Schema
orchestrator validate --schema
```

Common causes:
- Missing `schema_version: 1`
- Phase names with uppercase or special characters
- Circular `after:` dependencies
- Missing `skill` on a phase
- Preset references undefined phase

#### "No run found for task ref: XXX"

The task has no pipeline runs. Start one:
```bash
orchestrator run XXX
```

#### "Run is not paused (status: RUNNING)"

Cannot resume a run that isn't paused. Check status first:
```bash
orchestrator status
```

#### "STATE_CORRUPT: No rollback snapshot found"

The phase was executed before undo was available or the snapshot is missing. You'll need to manually restore files.

#### "UNDO_UNCOMMITTED_CHANGES"

Your working tree has uncommitted changes. Either:
- Commit or stash your changes, then retry
- Use `--force` to bypass the check

### Exit Code Reference

| Code | Constant | Meaning |
|------|----------|---------|
| 0 | `EXIT_SUCCESS` | Pipeline completed |
| 1 | `EXIT_PIPELINE_FAILED` | Pipeline failed |
| 2 | `EXIT_PIPELINE_PAUSED` | Pipeline paused |
| 10 | `EXIT_INVALID_ARGS` | Invalid arguments |
| 11 | `EXIT_VALIDATION_FAILED` | Pipeline YAML invalid |
| 12 | `EXIT_TASK_NOT_FOUND` | Task not found |
| 13 | `EXIT_STATE_ERROR` | State error |
| 20 | `EXIT_EXECUTOR_UNAVAILABLE` | Executor unavailable |

### Error Recovery Guide

| Error | Recovery |
|-------|----------|
| `PIPELINE_NOT_FOUND` | Create pipeline.yaml or specify `--pipeline` |
| `TASK_NOT_FOUND` | Verify the task reference |
| `PRESET_NOT_FOUND` | Check preset names with `orchestrator validate` |
| `PIPELINE_VALIDATION_FAILED` | Run `orchestrator validate` to see errors |
| `DAG_CYCLE_DETECTED` | Remove circular `after:` dependencies |
| `STATE_CORRUPT` | Delete `.rdinstate/orchestrator.db` and re-run |
| `STATE_LOCKED` | Wait or kill stale processes |
| `EXECUTOR_UNAVAILABLE` | Check channel, verify Bun is available |
| `EXECUTOR_TIMEOUT` | Increase timeout in pipeline YAML |
| `GATE_FAILED` | Inspect with `orchestrator inspect TASK PHASE --evidence` |
| `GATE_PENDING` | Resume with `orchestrator resume TASK --approve` |
| `REWORK_EXHAUSTED` | Check phase output, fix issue, re-run |
| `UNDO_UNCOMMITTED_CHANGES` | Commit/stash or use `--force` |

---

## 14. Configuration Reference

### Global Options

| Flag | Env Variable | Default | Description |
|------|-------------|---------|-------------|
| `--state-dir <path>` | `ORCHESTRATOR_STATE_DIR` | `.rdinstate` | SQLite database directory |
| `--pipeline <path>` | — | Auto-resolved | Pipeline YAML path (alias: `--file`) |
| `--verbose` | — | false | Verbose logging |
| `--quiet` | — | false | Suppress non-essential output |
| `--help`, `-h` | — | — | Show help |
| `--version` | — | — | Show version |

### Command-Specific Options

#### `run`
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--preset <name>` | string | — | Named preset from pipeline YAML |
| `--phases <a,b>` | string[] | all | Comma-separated phase names |
| `--channel <name>` | string | `current` | Execution channel |
| `--coverage <n>` | number | preset default | Coverage threshold (1-100) |
| `--auto` | bool | false | Auto-approve human gates |
| `--dry-run` | bool | false | Show plan only |

#### `resume`
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--approve` | bool | true | Approve pending gate |
| `--reject` | bool | false | Reject pending gate |
| `--auto` | bool | false | Continue with auto gates |

#### `status`
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--run <id>` | string | — | Specific run ID |
| `--all` | bool | false | List all runs |
| `--json` | bool | false | JSON output |

#### `report`
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--format <fmt>` | string | `table` | table, markdown, json, summary |
| `--output <path>` | string | stdout | Output file (alias: `-o`) |

#### `validate`
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--schema` | bool | false | Output JSON Schema |

#### `history`
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--limit <n>` | number | 10 | Number of runs |
| `--last <n>` | number | — | Alias for `--limit` |
| `--preset <name>` | string | — | Filter by preset |
| `--since <date>` | string | — | Filter since date |
| `--failed` | bool | false | Only failed runs |
| `--json` | bool | false | JSON output |

#### `undo`
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dry-run` | bool | false | Preview only |
| `--force` | bool | false | Skip uncommitted check |

#### `inspect`
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--evidence` | bool | false | Show gate evidence |
| `--json` | bool | false | JSON output |

#### `prune`
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--older-than <dur>` | string | `30d` | Age threshold |
| `--keep-last <n>` | number | — | Keep N most recent |
| `--dry-run` | bool | false | Preview only |

#### `migrate`
| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--from-v1 [dir]` | bool | false | Enable v1 migration |
| `--dir <path>` | string | `docs/.workflow-runs/rd3-orchestration-dev` | Source directory |

---

## 15. Pipeline YAML Reference

### Complete Example

```yaml
# Required header
schema_version: 1
name: my-project-pipeline

# Optional: inherit from another pipeline (max 2 levels)
extends: .rd3/base-pipeline.yaml

# Optional: stack definition for verification checks
stack:
  language: typescript
  runtime: bun
  linter: biome
  test: "bun test"
  coverage: "bun test --coverage"

# Required: phase definitions (DAG nodes)
phases:
  # Phase with minimal config
  intake:
    skill: rd3:request-intake
    gate: { type: auto }
    timeout: 30m

  # Phase with dependencies
  arch:
    skill: rd3:backend-architect
    gate: { type: auto }
    timeout: 1h
    after: [intake]

  # Phase with rework configuration
  implement:
    skill: rd3:code-implement-common
    gate:
      type: auto
      rework:
        max_iterations: 3
        escalation: pause
    timeout: 2h
    after: [arch]
    payload:
      tdd: true
      sandbox: git-worktree

  # Phase with parallel dependencies
  test:
    skill: rd3:sys-testing
    gate:
      type: auto
      rework:
        max_iterations: 2
        escalation: fail
    timeout: 1h
    after: [implement]
    payload:
      coverage_threshold: 80

  # Human-gated phase
  review:
    skill: rd3:code-review-common
    gate: { type: human }
    after: [test]
    payload:
      depth: thorough
      focus_areas: [security, performance]

  # Parallel phases (both depend on review)
  verify-bdd:
    skill: rd3:bdd-workflow
    gate: { type: auto }
    timeout: 30m
    after: [review]

  verify-func:
    skill: rd3:functional-review
    gate: { type: auto }
    timeout: 30m
    after: [review]

  # Phase with multiple dependencies
  docs:
    skill: rd3:code-docs
    gate: { type: auto }
    timeout: 30m
    after: [verify-bdd, verify-func]

# Optional: named presets
presets:
  quick:
    phases: [implement, test]
    defaults: { coverage_threshold: 60 }

  standard:
    phases: [intake, implement, test, review, docs]
    defaults: { coverage_threshold: 80 }

  full:
    phases: [intake, arch, implement, test, review, verify-bdd, verify-func, docs]
    defaults: { coverage_threshold: 80 }

# Optional: hooks
hooks:
  on-phase-complete:
    - run: "echo '{{phase}} done for {{task_ref}} (run {{run_id}})'"
  on-phase-failure:
    - run: "notify-send 'Phase {{phase}} failed' '{{error}}'"
```

### Field Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `schema_version` | ✅ | `1` | Must be `1` |
| `name` | ✅ | string | Pipeline name |
| `extends` | | string | Path to parent pipeline YAML |
| `stack` | | object | Language, runtime, linter, test, coverage |
| `stack.language` | | string | Programming language |
| `stack.runtime` | | string | Runtime (e.g., `bun`) |
| `stack.linter` | | string | Linter (e.g., `biome`) |
| `stack.test` | | string | Test command |
| `stack.coverage` | | string | Coverage command |
| `phases` | ✅ | object | Phase definitions keyed by name |
| `phases.<name>.skill` | ✅ | string | Skill reference (e.g., `rd3:request-intake`) |
| `phases.<name>.gate` | | object | Gate configuration |
| `phases.<name>.gate.type` | | `auto` \| `human` | Gate type |
| `phases.<name>.gate.rework.max_iterations` | | number | Max rework attempts |
| `phases.<name>.gate.rework.escalation` | | `pause` \| `fail` | Exhaustion behavior |
| `phases.<name>.timeout` | | string | Duration (e.g., `30m`, `1h`, `2h30m`) |
| `phases.<name>.after` | | string[] | Phase dependencies |
| `phases.<name>.payload` | | object | Arbitrary data passed to skill |
| `presets` | | object | Named phase subsets with defaults |
| `presets.<name>.phases` | ✅ | string[] | Phase names in the preset |
| `presets.<name>.defaults` | | object | Default parameter overrides |
| `hooks` | | object | Hook definitions |
| `hooks.on-phase-start` | | array | Hooks before phase execution |
| `hooks.on-phase-complete` | | array | Hooks after phase success |
| `hooks.on-phase-failure` | | array | Hooks after phase failure |
| `hooks.on-rework` | | array | Hooks when phase enters rework |
| `hooks.on-pause` | | array | Hooks when pipeline pauses |
| `hooks.on-resume` | | array | Hooks when pipeline resumes |

### Phase Name Rules

- Must match: `^[a-z][a-z0-9-_]*$`
- Lowercase only
- Start with a letter
- May contain letters, digits, hyphens, underscores

### Timeout Format

Pattern: `^(\d+h)?(\d+m)?(\d+s)?$`

Valid examples: `30m`, `1h`, `2h30m`, `90s`, `45m30s`

If no unit specified, defaults to minutes. Default timeout: 30 minutes.

---

*End of User Manual. v1.0.0 — Generated by Lord Robb — 2026-04-02.*
