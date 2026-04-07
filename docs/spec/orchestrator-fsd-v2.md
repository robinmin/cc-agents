# Orchestration v2 — Functional Specification Document

**Version:** 1.0.0
**Date:** 2026-04-02
**Authors:** Robin Min, Lord Robb
**Status:** Current
**Parent:** [Blueprint v1.1.0](./orchestrator-blueprint-v2.md)
**Architecture:** [Architecture v1.0.0](./orchestrator-architecture-v2.md)

---

## Table of Contents

1. [Functional Overview](#1-functional-overview)
2. [CLI Commands](#2-cli-commands)
3. [Pipeline YAML](#3-pipeline-yaml)
4. [Pipeline Lifecycle](#4-pipeline-lifecycle)
5. [Phase Execution](#5-phase-execution)
6. [DAG Scheduling](#6-dag-scheduling)
7. [Rework Mechanism](#7-rework-mechanism)
8. [Gate Verification](#8-gate-verification)
9. [State Persistence](#9-state-persistence)
10. [Reporting](#10-reporting)
11. [Migration](#11-migration)
12. [Pruning](#12-pruning)

---

## 1. Functional Overview

### Capability Matrix

| Capability | Description | Status |
|-----------|-------------|--------|
| Pipeline execution | Run multi-phase pipelines with DAG-ordered dispatch | ✅ Implemented |
| Pipeline resumption | Resume paused pipelines with approve/reject | ✅ Implemented |
| Phase undo | Rollback a phase and downstream phases via git snapshots | ✅ Implemented |
| Pipeline status | View run status, phase progress, resource usage | ✅ Implemented |
| Report generation | Table, markdown, JSON, summary formats | ✅ Implemented |
| Pipeline validation | Schema validation, DAG cycle detection, preset checks | ✅ Implemented |
| Pipeline listing | List available pipeline YAML files | ✅ Implemented |
| Run history | View past runs with filtering and trend analysis | ✅ Implemented |
| Phase inspection | Detailed phase view with gate evidence | ✅ Implemented |
| State pruning | Age-based and keep-last event compaction | ✅ Implemented |
| V1 migration | Convert JSON state files to SQLite | ✅ Implemented |
| Custom pipelines | Per-project pipeline.yaml with extends | ✅ Implemented |
| Hook system | Shell commands at pipeline transition points | ✅ Implemented |
| Parallel execution | DAG supports parallel-ready dispatch | ✅ Implemented |
| ACP cross-channel | Remote agent execution via acpx or agy | ✅ Partial (acpx-query library) |

---

## 2. CLI Commands

### 2.1 Command Summary

| Command | Syntax | Required Args | Description |
|---------|--------|---------------|-------------|
| `run` | `orchestrator run <task-ref>` | task-ref | Execute a pipeline |
| `resume` | `orchestrator resume <task-ref>` | task-ref | Resume a paused pipeline |
| `status` | `orchestrator status [<task-ref>]` | none | Show pipeline status |
| `report` | `orchestrator report <task-ref>` | task-ref | Generate detailed report |
| `validate` | `orchestrator validate [<file>]` | none | Validate pipeline YAML |
| `list` | `orchestrator list` | none | List available pipelines |
| `history` | `orchestrator history` | none | Show run history |
| `undo` | `orchestrator undo <task-ref> <phase>` | task-ref, phase | Rollback a phase |
| `inspect` | `orchestrator inspect <task-ref> <phase>` | task-ref, phase | Show phase detail |
| `prune` | `orchestrator prune` | none | Compact event store |
| `migrate` | `orchestrator migrate` | none | Migrate v1 state to v2 |

### 2.2 Global Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--state-dir <path>` | string | `.rdinstate` | State directory. Env: `ORCHESTRATOR_STATE_DIR` |
| `--pipeline <path>` | string | Auto-resolved | Pipeline YAML path. Alias: `--file` |
| `--verbose` | boolean | false | Verbose output |
| `--quiet` | boolean | false | Suppress non-essential output |
| `--json` | boolean | false | JSON output where supported |
| `--help`, `-h` | | | Show help text |
| `--version` | | | Show version (`v0.1.0`) |

### 2.3 `run`

**Purpose:** Execute a pipeline for a given task.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--preset <name>` | string | none | Named preset from pipeline YAML |
| `--phases <a,b>` | string[] | all | Comma-separated phases; DAG resolves order |
| `--channel <name>` | string | `auto` | Execution channel (`current` is a deprecated alias) |
| `--coverage <n>` | number | from preset | Override coverage threshold (1-100) |
| `--auto` | boolean | false | Auto-approve all human gates |
| `--dry-run` | boolean | false | Show plan without executing |

**Phase selection precedence:** `--phases` > `--preset` > all phases.

**Behavior:**
1. Resolve and validate pipeline YAML
2. Initialize DAG from phase definitions
3. Create run record in SQLite (status: RUNNING)
4. FSM: IDLE → RUNNING
5. Execute main loop (evaluate DAG → execute phases → check gates)
6. Return with appropriate exit code

**Exit codes:** 0 (completed) | 1 (failed) | 11 (validation failed) | 12 (task not found)

**Output (dry-run):**
```
[dry-run] Pipeline valid. Would execute:
  - intake
  - arch
  - design
  ...
```

### 2.4 `resume`

**Purpose:** Resume a paused pipeline.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--approve` | boolean | true (default) | Approve pending human gate |
| `--reject` | boolean | false | Reject pending human gate |
| `--auto` | boolean | false | Continue with auto gates after resume |

**Behavior:**
1. Find run by task-ref; verify status is PAUSED
2. If `--reject`: FSM PAUSED → FAILED, mark paused phases as failed
3. If `--approve` (default): mark paused phases as completed, FSM PAUSED → RUNNING
4. Re-enter execute loop

**Exit codes:** 0 (completed) | 1 (failed) | 12 (task not found) | 13 (not paused)

### 2.5 `status`

**Purpose:** Display pipeline run status.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--run <id>` | string | latest | Show specific run by ID |
| `--all` | boolean | false | List all runs |
| `--json` | boolean | false | JSON output |

**Behavior (no task-ref):** Show latest run. With task-ref: show latest run for that task. With `--run`: show specific run. With `--all`: list all runs.

**Output (default):**
```
Run: 0266  Status: COMPLETED
Pipeline: default  Preset: complex
Duration: 52m 14s

  intake           completed   rd3:request-intake
  arch             completed   rd3:backend-architect
  design           completed   rd3:backend-design
  ...
```

### 2.6 `report`

**Purpose:** Generate a detailed pipeline report.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--format <fmt>` | string | `table` | Output format: table, markdown, json, summary |
| `--output <path>` | string | stdout | Write to file. Alias: `-o` |

**Behavior:** Find run by task-ref, load summary (run + phases + resources), format and output.

### 2.7 `validate`

**Purpose:** Validate a pipeline YAML file.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--schema` | boolean | false | Output JSON Schema and exit |

**Behavior:**
- Without `--schema`: Parse, resolve extends, validate schema + DAG cycles + preset refs
- With `--schema`: Output the pipeline YAML JSON Schema to stdout, exit 0

**Validation checks performed:**
1. `schema_version` must be 1
2. `name` is required string
3. Phase names must match `^[a-z][a-z0-9-_]*$`
4. Each phase must have a `skill` string
5. Gate type must be `auto` or `human`
6. Timeout must match `^(\d+h)?(\d+m)?(\d+s)?$`
7. No circular `after:` dependencies (DFS cycle detection)
8. No self-dependencies
9. All `after:` references must point to defined phases
10. Preset phase lists must reference defined phases
11. Skill directories checked (warning only)

### 2.8 `list`

**Purpose:** List available pipeline YAML files.

**Behavior:** Scan `references/examples/` directory for `*.yaml` files, list by name.

### 2.9 `history`

**Purpose:** Show run history with optional filtering and trends.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--limit <n>` | number | 10 | Number of runs |
| `--last <n>` | number | — | Alias for `--limit` |
| `--preset <name>` | string | — | Filter by preset |
| `--since <date>` | string | — | Filter since date |
| `--failed` | boolean | false | Only failed runs |
| `--json` | boolean | false | JSON array output |

**Behavior:** Query SQLite runs with optional filters, display per-run summaries, and trend report if ≥2 runs.

### 2.10 `undo`

**Purpose:** Rollback a phase and all downstream phases.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dry-run` | boolean | false | Preview without changes |
| `--force` | boolean | false | Bypass uncommitted changes check |

**Behavior:**
1. Load rollback snapshot for the phase (git HEAD + files before/after)
2. Check for uncommitted changes (unless `--force`)
3. Restore files via `git checkout {hash} -- {file}`
4. Delete files created during the phase
5. BFS to find all downstream dependent phases
6. Reset phase and downstream phases to pending
7. Set run status to PAUSED

### 2.11 `inspect`

**Purpose:** Show detailed phase information.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--evidence` | boolean | false | Show gate check evidence |
| `--json` | boolean | false | JSON output |

**Output (default):**
```
Run: 0266 (run_abc123)
Pipeline: default  Preset: complex
Phase: review
Status: paused
Skill: rd3:code-review-common
Rework: 0
```

### 2.12 `prune`

**Purpose:** Compact the event store.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--older-than <dur>` | string | 30d | Delete events older than duration |
| `--keep-last <n>` | number | — | Keep only last N runs |
| `--dry-run` | boolean | false | Preview without changes |

**Behavior:** Delete from `events`, `gate_results`, `resource_usage`, `rollback_snapshots` for qualifying runs. Run and phase records in `runs` and `phases` tables are preserved.

### 2.13 `migrate`

**Purpose:** Migrate v1 JSON state to v2 SQLite.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--from-v1 [dir]` | boolean | false | Enable migration from v1 |
| `--dir <path>` | string | `docs/.workflow-runs/rd3-orchestration-dev` | Source directory |

**Behavior:** Scan for JSON files, convert to SQLite records (runs, phases, events). Transactional per file.

---

## 3. Pipeline YAML

### 3.1 Schema Structure

```yaml
schema_version: 1                    # Required, must be 1
name: string                         # Required

extends: string                      # Optional, max 2 levels deep

stack:                               # Optional, used by verification checks
  language: string                   # e.g., "typescript"
  runtime: string                    # e.g., "bun"
  linter: string                     # e.g., "biome"
  test: string                       # e.g., "bun test"
  coverage: string                   # e.g., "bun test --coverage"

phases:                              # Required, DAG nodes
  <phase-name>:                      # Lowercase alphanumeric + hyphens
    skill: string                    # Required, e.g., "rd3:request-intake"
    gate:                            # Optional
      type: auto | human             # Gate type
      rework:                        # Optional
        max_iterations: number       # Default: 0 (no rework)
        escalation: pause | fail     # When rework exhausted
    timeout: string                  # e.g., "30m", "1h", "2h30m"
    after: [string]                  # DAG edges — phase dependencies
    payload:                         # Arbitrary YAML passed to skill
      key: value

presets:                             # Optional, named phase subsets
  <preset-name>:
    phases: [phase-name]             # Required
    defaults:                        # Optional parameter overrides
      key: value

hooks:                               # Optional, shell commands at transitions
  on-phase-start:
    - run: "string"                  # Template: {{phase}}, {{task_ref}}, {{run_id}}
  on-phase-complete:
    - run: "string"
  on-phase-failure:
    - run: "string"
  on-rework:
    - run: "string"
  on-pause:
    - run: "string"
  on-resume:
    - run: "string"
```

### 3.2 Validation Rules

| Rule | Check | Severity |
|------|-------|----------|
| `schema_version` | Must be `1` | Error |
| `name` | Required string | Error |
| `phases` | Required object, not array | Error |
| Phase names | Must match `^[a-z][a-z0-9-_]*$` | Error |
| Phase `skill` | Required string | Error |
| Gate `type` | Must be `auto` or `human` | Error |
| Gate `escalation` | Must be `pause` or `fail` | Error |
| `timeout` | Must match `^(\d+h)?(\d+m)?(\d+s)?$` | Error |
| `after` | Must be array of defined phase names | Error |
| No self-dependencies | Phase cannot `after` itself | Error |
| No DAG cycles | DFS cycle detection on `after` edges | Error |
| Preset phase refs | Must reference defined phases | Error |
| Preset subgraph | Missing deps warned (not error — may be completed in prior run) | Warning |
| Skill existence | Directory checked at `plugins/{p}/skills/{s}/` | Warning |

### 3.3 Extends Mechanism

**Rules:**
- Max depth: 2 levels (base → project)
- No circular inheritance (tracked via visited set)
- Child phases override parent with same name (deep merge on `payload`)
- Child presets override parent with same name
- Child hooks are appended to parent hooks
- `stack` inherited from parent if not specified in child

### 3.4 Pipeline File Resolution

The CLI resolves pipeline files in this order:
1. `--pipeline` / `--file` flag value (if provided)
2. `.rd3/pipeline.yaml` (if exists and non-empty)
3. `references/examples/{preset}.yaml` (built-in defaults)

---

## 4. Pipeline Lifecycle

### 4.1 FSM States

| State | Meaning | Terminal |
|-------|---------|:--------:|
| `IDLE` | Initial state, no pipeline running | No |
| `RUNNING` | Pipeline actively executing phases | No |
| `PAUSED` | Waiting for human gate approval or external action | No |
| `COMPLETED` | All phases finished successfully | Yes |
| `FAILED` | Pipeline failed (phase error, rework exhausted, or rejected) | Yes |

### 4.2 Transition Table

| From | Transition | To | Trigger |
|------|-----------|-----|---------|
| IDLE | `run` | RUNNING | `orchestrator run` with valid pipeline |
| RUNNING | `phase-complete` | RUNNING | Phase succeeds, more phases ready |
| RUNNING | `phase-fail-reworkable` | RUNNING | Phase fails, rework available |
| RUNNING | `human-gate` | PAUSED | Human gate encountered |
| RUNNING | `all-blocked` | PAUSED | No phases can run (all blocked) |
| RUNNING | `phase-fail-exhausted` | FAILED | Phase fails, rework exhausted |
| RUNNING | `executor-unavailable` | FAILED | Executor health check fails |
| RUNNING | `all-phases-done` | COMPLETED | All phases completed |
| PAUSED | `resume-approve` | RUNNING | `orchestrator resume --approve` |
| PAUSED | `resume-reject` | FAILED | `orchestrator resume --reject` |

### 4.3 DAG Phase States

| State | Meaning |
|-------|---------|
| `pending` | Not yet evaluated |
| `ready` | Dependencies satisfied, can be dispatched |
| `running` | Currently executing |
| `completed` | Successfully finished |
| `failed` | Failed, not reworkable |
| `paused` | Waiting (human gate) |
| `skipped` | Not in active phase set |

---

## 5. Phase Execution

### 5.1 Execution Flow

```
For each ready phase from DAG evaluation:
    1. DAG: mark as running
    2. State: update phase status to 'running'
    3. Capture git snapshot (HEAD + changed files)
    4. Execute hook: on-phase-start
    5. Execute phase via ExecutorPool (with rework loop)
    6. If execution fails:
       a. If human gate + escalation=pause → PAUSED
       b. Otherwise → FAILED
    7. If execution succeeds:
       a. Check gate (CoV driver)
       b. Gate pass → mark completed, execute on-phase-complete hook
       c. Gate fail → attempt rework
       d. Human gate pending → PAUSED
```

### 5.2 ExecutionRequest Fields

| Field | Type | Description |
|-------|------|-------------|
| `skill` | string | Skill reference (e.g., `rd3:request-intake`) |
| `phase` | string | Phase name |
| `prompt` | string | Generated prompt text |
| `payload` | object | Task ref, phase, feedback, rework iteration |
| `channel` | string | Execution channel (default: `auto`; `current` is a deprecated alias) |
| `timeoutMs` | number | Parsed from phase `timeout` string |
| `taskRef` | string | Task reference from run record |
| `feedback` | string? | Error from previous rework attempt |
| `reworkIteration` | number? | Current iteration (1-based) |
| `reworkMax` | number? | Max iterations allowed |

### 5.3 Timeout Parsing

Input format: `(\d+)(m|h|s)?` — e.g., `30m`, `1h`, `90s`, `120` (default: minutes).
Default timeout: 30 minutes (1,800,000ms).

---

## 6. DAG Scheduling

### 6.1 Dependency Resolution Algorithm

```
function evaluate():
    ready = []
    for each node in DAG:
        if node.state is 'pending':
            if all dependencies of node are 'completed':
                ready.push(node)
    return ready
```

### 6.2 Topological Sort

DFS-based topological sort produces a valid execution order. Used for display purposes (dry-run, status).

### 6.3 Phase Subset Validation

When `--phases` or `--preset` is used, the engine validates that the requested subset forms a valid subgraph:

```
function validatePhaseSubset(requestedPhases, allPhases, completedPhases):
    for each phase in requestedPhases:
        for each dependency in phase.after:
            if dependency NOT in requestedPhases AND NOT in completedPhases:
                report missing dependency
```

This ensures phases aren't run without their dependencies being satisfied.

---

## 7. Rework Mechanism

### 7.1 Rework Flow

```
Phase execution fails
    │
    ▼
Extract stderr as feedback string
Increment rework iteration
    │
    ▼
Re-execute phase with:
    payload.feedback = error message
    payload.rework_iteration = current iteration
    ExecutionRequest.feedback = error message
    ExecutionRequest.reworkIteration = iteration
    ExecutionRequest.reworkMax = max_iterations
    │
    ▼
If still fails and iterations < max:
    Repeat rework
    │
    ▼
If iterations >= max:
    Check escalation policy:
    ├── 'pause' → FSM PAUSED, await human
    └── 'fail' → FSM FAILED
```

### 7.2 Rework Configuration

| Field | Default | Description |
|-------|---------|-------------|
| `max_iterations` | 0 (no rework) | Maximum rework attempts per phase |
| `escalation` | `fail` | What happens when rework is exhausted |

---

## 8. Gate Verification

### 8.1 Auto Gates

Auto gates use the `DefaultCoVDriver` to run automated checks. The default auto-gate check executes a CLI command:

```typescript
{
    name: 'execution-success',
    method: 'cli',
    params: { command: `echo "auto-gate-check: ${phaseName} passed"` }
}
```

### 8.2 Human Gates

Human gates return `ChainState { status: 'pending' }`, which causes the runner to:
1. Mark the phase as paused in the DAG
2. Update phase status in SQLite to `paused`
3. Execute `on-pause` hook
4. FSM: RUNNING → PAUSED
5. Update run status to `PAUSED`
6. Return with exit code 2

### 8.3 Check Methods

| Method | Input | Pass Criteria | Output |
|--------|-------|---------------|--------|
| `cli` | `params.command` (shell command) | Exit code 0 | `{ exitCode, output }` |
| `content_match` | `params.file` + `params.pattern` | Regex matches file content | `{ file, pattern, matched }` |
| `human` | None | Always `passed=false` | (Triggers pause) |

---

## 9. State Persistence

### 9.1 Tables and When They're Written

| Table | Written When | Written By |
|-------|-------------|------------|
| `schema_version` | `StateManager.init()` | `runMigrations()` |
| `runs` | Pipeline start (`PipelineRunner.run()`) | `StateManager.createRun()` |
| `runs` (update) | Status changes | `StateManager.updateRunStatus()` |
| `phases` | Pipeline start (per phase) | `StateManager.createPhase()` |
| `phases` (update) | Phase status changes | `StateManager.updatePhaseStatus()` |
| `events` | Every event emitted | `EventStore.append()` (via EventBus subscription) |
| `gate_results` | After gate evaluation | `StateManager.saveGateResult()` |
| `rollback_snapshots` | Before/after phase execution | `StateManager.saveRollbackSnapshot()` |
| `resource_usage` | After executor completes (if metrics available) | `StateManager.saveResourceUsage()` |

### 9.2 Run ID Generation

Format: `run_{timestamp_base36}_{random_6chars}`
Example: `run_m3q2x4_f8a2b1`

---

## 10. Reporting

### 10.1 Output Formats

| Format | Flag | Content |
|--------|------|---------|
| `table` | `--format table` (default) | Phase name/status/skill columns, duration, tokens, models |
| `markdown` | `--format markdown` | Headers, phase table, model list |
| `json` | `--format json` | Complete `RunSummary` object |
| `summary` | `--format summary` | One-line run status with phase list |

### 10.2 Trend Report

The `history` command includes a trend report when ≥2 runs exist:
- Period: last 30 days
- Overall: total runs, success rate
- Per-preset: total runs, success rate, average duration

### 10.3 Metrics Formatting

| Value | Format | Example |
|-------|--------|---------|
| Tokens ≥ 1M | `{n}M` | `1.5M` |
| Tokens ≥ 1K | `{n}K` | `45.2K` |
| Duration ≥ 1h | `{h}h {m}m` | `2h 15m` |
| Duration ≥ 1m | `{m}m {s}s` | `18m 34s` |
| Duration ≥ 1s | `{s}s` | `45.2s` |
| Duration < 1s | `{ms}ms` | `823ms` |

---

## 11. Migration

### 11.1 V1 → V2 Mapping

| V1 Concept | V2 Equivalent |
|-----------|---------------|
| JSON state file | SQLite `runs` + `phases` tables |
| `profile` field | `preset` field |
| `phases[].number` | Phase name via `PHASE_NUMBER_TO_NAME` mapping |
| `phases[].status` | `phases.status` (mapped string) |
| `phases[].evidence[]` | `events` table (type: `v1.migrated.{kind}`) |
| `phases[].rework_iterations` | `phases.rework_iteration` |

### 11.2 Phase Number Mapping

| # | V2 Name |
|---|---------|
| 1 | `intake` |
| 2 | `arch` |
| 3 | `design` |
| 4 | `decompose` |
| 5 | `implement` |
| 6 | `test` |
| 7 | `review` |
| 8 | `verify-bdd` |
| 9 | `docs` |

### 11.3 Migration Guarantees

- Transactional per file (atomic success or failure)
- `INSERT OR IGNORE` prevents duplicate runs on re-migration
- Skipped files are reported with reasons
- Evidence preserved as typed events

---

## 12. Pruning

### 12.1 Duration Parsing

Supported units: `s` (seconds), `m` (minutes), `h` (hours), `d` (days), `w` (weeks), `M` (months ≈30d), `y` (years ≈365d).

Format: `{number}{unit}` — e.g., `30d`, `1y`, `2h`, `90m`.

### 12.2 Prune Strategies

| Strategy | Flag | Description |
|----------|------|-------------|
| Age-based | `--older-than 30d` | Delete data for completed/failed runs older than duration |
| Keep-last | `--keep-last 100` | Keep only the N most recent runs |
| Default | (none) | Equivalent to `--older-than 30d` |

### 12.3 What Gets Deleted

| Table | Deleted | Preserved |
|-------|---------|-----------|
| `events` | ✅ | — |
| `gate_results` | ✅ | — |
| `resource_usage` | ✅ | — |
| `rollback_snapshots` | ✅ | — |
| `runs` | — | ✅ (for historical queries) |
| `phases` | — | ✅ (for historical queries) |

### 12.4 Dry-Run Mode

With `--dry-run`, the pruner reports what would be deleted without making changes:
```
[dry-run] Would prune:
  Runs affected: 12
  Events: 847
  Gate results: 156
  Resource usage: 89
  Rollback snapshots: 23
```

---

*End of Functional Specification. v1.0.0 — Generated by Lord Robb — 2026-04-02.*
