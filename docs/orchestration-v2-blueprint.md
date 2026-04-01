# Orchestration v2 — System Blueprint

**Version:** 1.1.0-draft
**Date:** 2026-03-31  
**Status:** Draft  
**Authors:** Robin Min, Lord Robb  
**Parent Task:** 0295  

---

## 1. Executive Summary

The orchestration-v2 engine is a ground-up rebuild of the current `orchestration-dev` skill. It replaces the hardcoded sequential for-loop with an FSM-supervised DAG scheduler, swaps JSON state files for event-sourced SQLite, externalizes pipeline definitions into YAML, and introduces a CLI-first interface (`orchestrator`). The engine is designed around seven architectural pillars: CLI-first configuration, SQLite state, async executor abstraction, pluggable CoV driver, event-sourced observability, FSM lifecycle management, and DAG-based parallel execution. It coexists with the current system during migration and ships as a new skill at `plugins/rd3/skills/orchestration-v2/`.

---

## 2. Architecture Overview

### 2.1 Micro-Kernel with Pluggable Subsystems

```
┌──────────────────────────────────────────────────────────┐
│                     CLI Layer                             │
│  run | resume | status | report | validate | list | ...  │
├──────────────────────────────────────────────────────────┤
│                Pipeline Compiler                          │
│  YAML → validated PipelineDefinition → DAG + FSM config  │
├────────────┬─────────────────┬───────────────────────────┤
│            │                 │                           │
│   FSM      │   DAG Scheduler │       Event Bus           │
│  Engine    │  (topo-sort,   │  (all events flow          │
│ (lifecycle │   parallel     │   through here)            │
│  states,   │   scheduling)  │                           │
│  hooks,    │                 │                           │
│  retries)  │                 │                           │
├────────────┴─────────────────┴───────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   State    │  │   Executor   │  │    CoV Driver    │ │
│  │  Manager   │  │    Pool      │  │   (adapter)      │ │
│  │ (SQLite +  │  │ (LocalBun,   │  │  (verification   │ │
│  │  events)   │  │  ACP, Mock)  │  │   backends)      │ │
│  └────────────┘  └──────────────┘  └──────────────────┘ │
├──────────────────────────────────────────────────────────┤
│              Foundation (types, config, logging)         │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Subsystem Responsibility Table

| Subsystem | Responsibility | Key Files |
|-----------|---------------|-----------|
| CLI Layer | Command parsing, output formatting, user interaction | `cli/commands.ts`, `cli/status.ts`, `cli/report.ts`, `run.ts` |
| Pipeline Compiler | Parse YAML, validate schema, resolve extends, produce DAG definition | `config/schema.ts`, `config/parser.ts`, `config/resolver.ts` |
| FSM Engine | Lifecycle state machine — IDLE, RUNNING, PAUSED, COMPLETED, FAILED | `engine/fsm.ts` |
| DAG Scheduler | Dependency resolution, topological sort, parallel phase dispatch | `engine/dag.ts` |
| Event Bus | Typed event emitter — all subsystems produce, observability consumes | `observability/event-bus.ts` |
| State Manager | SQLite schema, event store, queries, migrations | `state/manager.ts`, `state/events.ts`, `state/queries.ts`, `state/migrations.ts` |
| Executor Pool | Executor registry, capability discovery, health checks | `executors/pool.ts`, `executors/local.ts`, `executors/acp.ts`, `executors/mock.ts` |
| CoV Driver | Adapter over verification-chain interpreter | `verification/cov-driver.ts` |
| Observability | Resource metrics collection, report generation | `observability/metrics.ts`, `observability/reporter.ts` |
| Hooks | Hook registry and execution for pipeline-level callbacks | `engine/hooks.ts` |
| Pipeline Runner | Orchestrates FSM + DAG + executors + state into a running pipeline | `engine/runner.ts` |
| Foundation | Shared types, interfaces, error codes, logging | `model.ts` |

### 2.3 Subsystem Dependency Graph

```
                    ┌──────────────────────┐
                    │  CLI + Config (YAML)  │◄── foundation
                    └──────┬───────────────┘
                           │
              ┌────────────┼────────────────┐
              ▼            ▼                ▼
   ┌──────────────┐  ┌──────────┐  ┌─────────────────┐
   │  Event Bus   │  │ Executor │  │ FSM Engine      │
   │              │  │ Pool     │  │                 │
   └──────┬───────┘  └────┬─────┘  └────────┬────────┘
          │               │                 │
          ▼               ▼                 ▼
   ┌──────────────┐  ┌──────────┐  ┌─────────────────┐
   │ State Manager│  │ CoV      │  │ DAG Scheduler   │
   │ (subscribes  │  │ Driver   │  │                 │
   │  to events)  │  │          │  │                 │
   └──────────────┘  └──────────┘  └─────────────────┘
          │               │                 │
          └───────────────┼─────────────────┘
                          ▼
                 ┌──────────────────┐
                 │ Pipeline Runner  │
                 └──────────────────┘
```

**Data flow:** All subsystems (FSM, DAG, Executors) emit events → Event Bus → State Manager subscribes and persists to SQLite → Reporter/CLI query SQLite for display.

**Build order:** Foundation → CLI+Config → EventBus+Executors+FSM (parallel) → State+CoV+DAG (consumers) → Pipeline Runner → Observability

---

## 3. CLI Interface Specification

**Command name:** `orchestrator` (system-level symlink to the entry script)

```bash
# Symlink setup via package.json bin field
{
  "bin": {
    "orchestrator": "./plugins/rd3/skills/orchestration-v2/scripts/run.ts"
  }
}

# During development
bun link  # creates global symlink
```

Entry script shebang: `#!/usr/bin/env bun`

### 3.1 Command Tree

```
orchestrator run <task-ref>                     # Run a pipeline
orchestrator resume <task-ref>                  # Resume paused pipeline
orchestrator status [<task-ref>]                # Show pipeline status
orchestrator report <task-ref>                  # Generate detailed report
orchestrator validate [<pipeline-file>]         # Validate pipeline.yaml
orchestrator list                               # List available pipelines
orchestrator history                            # Show run history
orchestrator undo <task-ref> <phase>            # Rollback a phase
orchestrator inspect <task-ref> <phase>         # Show phase detail + evidence
orchestrator prune [--older-than <dur>]         # Compact event store
orchestrator migrate --from-v1                  # Migrate v1 JSON state to SQLite
```

### 3.2 `orchestrator run`

**Usage:**
```bash
orchestrator run 0266                              # Run all phases in DAG order
orchestrator run 0266 --preset complex             # Use named preset (phase subset + defaults)
orchestrator run 0266 --phases implement,test      # Run specific phases (DAG resolves order)
orchestrator run 0266 --phases test                # Run a single phase directly
orchestrator run 0266 --pipeline .rd3/custom.yaml  # Use specific pipeline definition
orchestrator run 0266 --auto                       # Skip human gates
orchestrator run 0266 --channel codex              # Override execution channel
orchestrator run 0266 --dry-run                    # Show plan, don't execute
orchestrator run 0266 --coverage 90                # Override coverage threshold
```

**Flags:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--preset` | string | none | Named preset from pipeline YAML (e.g., simple, complex) |
| `--phases` | string | all phases | Comma-separated phase names — DAG resolves execution order. Overrides `--preset`. |
| `--pipeline` | path | `.rd3/pipeline.yaml` | Path to pipeline definition file |
| `--auto` | boolean | false | Auto-approve all human gates |
| `--channel` | string | `current` | Execution channel for worker phases |
| `--dry-run` | boolean | false | Show execution plan without running |
| `--coverage` | number | from preset/phase | Override coverage threshold |

**Phase selection precedence:** `--phases` > `--preset` > all phases in DAG.
When `--phases` is used, the DAG validates that the requested subset forms a valid subgraph (all dependencies satisfied or already completed).

**Interactive output (live progress):**
```
▶ Pipeline: complex | Task: 0266
▶ Phases: intake → arch → design → decompose → implement → test → review → verify → docs

  [1/9] intake        ━━━━━━━━━━━━━━━━━━ 100%  ✅  2m 34s
  [2/9] arch          ━━━━━━━━━━━━━━━━━━ 100%  ✅  5m 12s
  [3/9] design        ━━━━━━━━━━━━━━━━━━ 100%  ✅  4m 08s
  [4/9] decompose     ━━━━━━━━━━━━━━━━━━ 100%  ✅  1m 45s
  [5/9] implement     ━━━━━━━━━━━━░░░░░░  60%  🔄  12m 22s...
  [---] test          ░░░░░░░░░░░░░░░░░░   0%  ⏳
  [---] review        ░░░░░░░░░░░░░░░░░░   0%  ⏳
  [---] verify-bdd    ░░░░░░░░░░░░░░░░░░   0%  ⏳
  [---] verify-func   ░░░░░░░░░░░░░░░░░░   0%  ⏳
  [---] docs          ░░░░░░░░░░░░░░░░░░   0%  ⏳

  Tokens: 78K in / 22K out | Model: claude-sonnet-4
  Elapsed: 25m 41s
```

**Parallel execution display:**
```
  [5/9] implement     ━━━━━━━━━━━━━━━━━━ 100%  ✅  18m 12s
  [6/9] test          ━━━━━━━━━━━━━░░░░░  72%  🔄  6m 03s...
  [7/9] review        ━━━━━━━━━━━━━━━━━━ 100%  🟡 paused (human gate)
```

**Dry-run output:**
```yaml
Pipeline: default (from .rd3/pipeline.yaml)
Task: 0266 — "Add batch task creation API"
Preset: complex (10 phases, coverage: 80%)

Execution Plan:
  ┌─ Phase 1: intake (rd3:request-intake, gate: auto, timeout: 30m)
  ├─ Phase 2: arch (rd3:backend-architect, gate: auto, timeout: 1h)
  ├─ Phase 3: design (rd3:backend-design, gate: auto, timeout: 1h)
  ├─ Phase 4: decompose (rd3:task-decomposition, gate: auto, timeout: 30m)
  ├─ Phase 5: implement (rd3:code-implement-common, gate: auto, timeout: 2h)
  ├─ Phase 6: test (rd3:sys-testing, gate: auto, timeout: 1h, coverage: 80%)
  ├─ Phase 7: review (rd3:code-review-common, gate: human)
  ├─ Phase 8: verify (rd3:bdd-workflow + rd3:functional-review, parallel)
  └─ Phase 9: docs (rd3:code-docs, gate: auto, timeout: 30m)

  Rework budget: 2 iterations per phase
  Human gates: 1 (review)
  Estimated duration: 52m

  Run without --dry-run to execute.
```

**Exit codes:**

| Code | Constant | Meaning |
|------|----------|---------|
| 0 | `EXIT_SUCCESS` | All phases completed successfully |
| 1 | `EXIT_PIPELINE_FAILED` | Pipeline failed (phase error) |
| 2 | `EXIT_PIPELINE_PAUSED` | Pipeline paused (human gate or manual) |
| 10 | `EXIT_INVALID_ARGS` | Invalid command-line arguments |
| 11 | `EXIT_VALIDATION_FAILED` | Pipeline YAML validation failed |
| 12 | `EXIT_TASK_NOT_FOUND` | Task not found |
| 13 | `EXIT_STATE_ERROR` | State error (corrupt DB, locked) |
| 20 | `EXIT_EXECUTOR_UNAVAILABLE` | Executor backend not available |

### 3.3 `orchestrator resume`

**Usage:**
```bash
orchestrator resume 0266                    # Resume from paused state
orchestrator resume 0266 --approve          # Approve pending human gate
orchestrator resume 0266 --reject           # Reject pending human gate
orchestrator resume 0266 --approve --auto   # Approve + continue with auto gates
```

**Output:**
```
▶ Resuming pipeline for task 0266
▶ Paused at: review (human gate)
▶ Action: approved

  [7/9] review        ━━━━━━━━━━━━━━━━━━ 100%  ✅  (approved)
  [8/9] verify-bdd    ━━━━━━░░░░░░░░░░░░  33%  🔄  3m 12s...
  [8/9] verify-func   ━━━━━━━━━━━━━░░░░░  65%  🔄  5m 48s...
```

### 3.4 `orchestrator status`

**Usage:**
```bash
orchestrator status                         # Show latest run for current task
orchestrator status 0266                    # Show latest run for task 0266
orchestrator status 0266 --run abc123       # Show specific run
orchestrator status --all                   # Show all active runs
orchestrator status --json                  # JSON output
```

**Output (default — table):**
```
Pipeline Run: 0266 (run: abc123, preset: complex)
Started: 2026-03-31 14:22 | Elapsed: 25m 41s | Status: 🟡 paused

┌───────────┬──────────┬──────────┬──────────┬─────────────┬──────────────┐
│ Phase     │ Status   │ Duration │ Checks   │ Tokens I/O  │ Model        │
├───────────┼──────────┼──────────┼──────────┼─────────────┼──────────────┤
│ intake    │ ✅ done  │ 2m 34s   │ 4/4      │ 12K / 3K    │ sonnet-4     │
│ arch      │ ✅ done  │ 5m 12s   │ 3/3      │ 18K / 8K    │ sonnet-4     │
│ design    │ ✅ done  │ 4m 08s   │ 3/3      │ 14K / 6K    │ sonnet-4     │
│ decompose │ ✅ done  │ 1m 45s   │ 2/2      │ 8K / 2K     │ sonnet-4     │
│ implement │ ✅ done  │ 18m 12s  │ 3/3      │ 45K / 18K   │ sonnet-4     │
│ test      │ ✅ done  │ 8m 45s   │ 5/5      │ 22K / 8K    │ sonnet-4     │
│ review    │ 🟡 pause │ —        │ 0/3      │ 15K / 5K    │ opus-4       │
│ verify    │ ⏳ wait  │ —        │ —        │ —           │ —            │
│ docs      │ ⏳ wait  │ —        │ —        │ —           │ —            │
├───────────┼──────────┼──────────┼──────────┼─────────────┼──────────────┤
│ TOTAL     │ 7/9      │ 40m 46s  │ 20/23    │ 134K / 50K  │              │
└───────────┴──────────┴──────────┴──────────┴─────────────┴──────────────┘

⏸  Paused: review phase awaiting human approval
   → orchestrator resume 0266 --approve
   → orchestrator resume 0266 --reject
```

### 3.5 `orchestrator report`

**Usage:**
```bash
orchestrator report 0266                    # Markdown report (default)
orchestrator report 0266 --format json      # JSON report
orchestrator report 0266 --format summary   # One-line summary
orchestrator report 0266 --output report.md # Write to file
```

**Summary format:**
```
0266 | preset:complex | ✅ completed | 52m 14s | 184K/68K tokens | 9/9 phases | sonnet-4 + opus-4
```

**Markdown format:** Full structured report with per-phase breakdown, gate evidence, resource usage, and recommendations.

**JSON format:** Complete machine-readable report with events, metrics, gate evidence, and per-phase details.

### 3.6 `orchestrator validate`

**Usage:**
```bash
orchestrator validate                       # Validate .rd3/pipeline.yaml
orchestrator validate my-pipeline.yaml      # Validate specific file
orchestrator validate --schema              # Show pipeline YAML schema
```

**Output (valid):**
```
✅ .rd3/pipeline.yaml is valid
   9 phases defined, 1 extends resolved
   DAG has no cycles
   All skills found in plugins/
   Presets: simple (2 phases), standard (5), complex (9)
```

**Output (invalid):**
```
❌ .rd3/pipeline.yaml has 3 errors:

   Line 24: Phase "review" has circular dependency via "after: [test]"
   Line 31: Unknown skill "rd3:nonexistent-skill" in phase "security"
   Line 45: Preset "simple" references undefined phase "deploy"
```

### 3.7 `orchestrator list`

**Usage:**
```bash
orchestrator list                           # List available pipelines
```

**Output:**
```
┌──────────────────┬───────────┬──────────┬──────────┬──────────────┐
│ Pipeline         │ Location  │ Phases   │ Presets  │ Last Used    │
├──────────────────┼───────────┼──────────┼──────────┼──────────────┤
│ default ★        │ .rd3/     │ 9        │ 4        │ 2 hours ago  │
│ quick-fix        │ .rd3/     │ 2        │ 1        │ 5 days ago   │
│ rd3:base         │ built-in  │ 9        │ 4        │ —            │
└──────────────────┴───────────┴──────────┴──────────┴──────────────┘

★ = default pipeline (used when no --pipeline flag)
```

### 3.8 `orchestrator history`

**Usage:**
```bash
orchestrator history                        # Last 10 runs
orchestrator history --last 50              # Last 50 runs
orchestrator history --preset complex       # Filter by preset
orchestrator history --since 2026-03-01     # Since date
orchestrator history --failed               # Only failed runs
orchestrator history --json                 # JSON output
```

**Output:**
```
┌──────────┬──────┬───────────┬──────────┬─────────────┬────────┐
│ Run ID   │ Task │ Preset    │ Status   │ Duration    │ Tokens │
├──────────┼──────┼───────────┼──────────┼─────────────┼────────┤
│ xyz789   │ 0270 │ simple    │ ✅       │ 12m 04s     │ 45K    │
│ abc123   │ 0266 │ complex   │ 🟡 pause │ 25m 41s     │ 134K   │
│ def456   │ 0264 │ standard  │ ✅       │ 31m 18s     │ 112K   │
│ ghi789   │ 0260 │ simple    │ ❌ fail  │ 8m 33s      │ 32K    │
└──────────┴──────┴───────────┴──────────┴─────────────┴────────┘

Trends (last 30 days):
  47 runs | 85% success rate | Avg 24m | Avg 98K tokens
  By preset: simple (12m, 45K), standard (28m, 112K), complex (48m, 210K)
```

### 3.9 `orchestrator undo`

**Usage:**
```bash
orchestrator undo 0266 5                    # Undo phase 5 (implement)
orchestrator undo 0266 5 --dry-run          # Preview what would be restored
orchestrator undo 0266 5 --force            # Force even with uncommitted changes
```

**Output:**
```
⚠  This will undo phase 5 (implement) and clear downstream phases: test, review, verify, docs

Files to restore:
  M  src/api/batch-handler.ts     (modified during phase 5)
  M  src/api/routes.ts            (modified during phase 5)
  A  src/api/batch-types.ts       (created during phase 5 — will be deleted)

Downstream state to clear: phases 6, 7, 8, 9

Use --force to proceed, or --dry-run to preview without changes.
```

### 3.10 `orchestrator inspect`

**Usage:**
```bash
orchestrator inspect 0266 7                 # Inspect phase 7 (review)
orchestrator inspect 0266 7 --evidence      # Show gate evidence
orchestrator inspect 0266 7 --json          # JSON output
```

**Output:**
```
Phase 7: review (rd3:code-review-common)
Status: 🟡 paused (human gate) | Started: 14:48 | Duration: 6m 12s

Gate Checks:
  ✅ file-exists: review evidence file exists
  ✅ content-match: has_structured_output: true
  ⏳ human: awaiting approval

Resource Usage:
  Model: claude-opus-4 (anthropic)
  Tokens: 15K input / 5K output
  Wall clock: 6m 12s | Execution: 5m 48s | First token: 2.3s

Executor: AcpExecutor (channel: current)
Rework: 0/2 iterations used

Evidence: orchestrator inspect 0266 7 --evidence
```

---

## 4. Pipeline YAML Schema

### 4.1 Design Philosophy

**Pipeline YAML is WHAT. FSM is HOW.**

The YAML file declares what phases exist, what skills they use, what order they run in, and what parameters they receive. The FSM lifecycle (IDLE → RUNNING → PAUSED → COMPLETED → FAILED) is engine-internal — it never appears in the YAML. Users customize behavior through hook points, not by redefining the state machine.

### 4.2 Schema Structure

```yaml
# Required
schema_version: 1
name: string                          # Pipeline name

# Optional
extends: string | null                # Inherit from another pipeline (max 2 levels)

# Stack definition (used by verification checks)
stack:
  language: string                    # e.g., "typescript"
  runtime: string                     # e.g., "bun"
  linter: string                      # e.g., "biome"
  test: string                        # e.g., "bun test"
  coverage: string                    # e.g., "bun test --coverage"

# Phase definitions (DAG nodes)
phases:
  <phase-name>:                       # Unique name (e.g., "intake", "implement")
    skill: string                     # Skill to invoke (e.g., "rd3:request-intake")
    gate:                             # Gate configuration
      type: auto | human              # Gate type
      rework:                         # Rework config (optional)
        max_iterations: number        # Max rework attempts (default: 2)
        escalation: pause | fail      # What happens when rework exhausted
    timeout: string                   # Duration (e.g., "30m", "2h")
    after: [string]                   # DAG edges — phase names this depends on
    payload:                          # Arbitrary YAML — passed to skill
      key: value

# Named presets — optional aliases for common --phases combinations
# Presets are convenience sugar, NOT a core concept. The DAG is the source of truth.
# CLI: orchestrator run 0266 --preset simple
#   is equivalent to: orchestrator run 0266 --phases implement,test
presets:
  <preset-name>:
    phases: [phase-name]              # e.g., simple: { phases: [implement, test] }
    defaults:                         # Optional per-preset parameter overrides
      <key>: <value>                  # e.g., coverage_threshold: 60

# Hook definitions — inject behavior at FSM transition points
hooks:
  on-phase-start:                     # Before a phase begins
    - run: string                     # Shell command template
  on-phase-complete:                  # After a phase succeeds
    - run: string
  on-phase-failure:                   # After a phase fails
    - action: pause | fail            # FSM transition trigger
      reason: string
  on-rework: []                       # When a phase enters rework
  on-pause: []                        # When pipeline pauses
  on-resume: []                       # When pipeline resumes
```

### 4.3 Default Pipeline YAML

```yaml
schema_version: 1
name: default

stack:
  language: typescript
  runtime: bun
  linter: biome
  test: "bun test"
  coverage: "bun test --coverage"

phases:
  intake:
    skill: rd3:request-intake
    gate: { type: auto }
    timeout: 30m

  arch:
    skill: rd3:backend-architect
    gate: { type: auto }
    timeout: 1h
    after: [intake]

  design:
    skill: rd3:backend-design
    gate: { type: auto }
    timeout: 1h
    after: [arch]

  decompose:
    skill: rd3:task-decomposition
    gate: { type: auto }
    timeout: 30m
    after: [design]

  implement:
    skill: rd3:code-implement-common
    gate:
      type: auto
      rework: { max_iterations: 2, escalation: pause }
    timeout: 2h
    after: [decompose]
    payload:
      tdd: true
      sandbox: git-worktree

  test:
    skill: rd3:sys-testing
    gate:
      type: auto
      rework: { max_iterations: 3, escalation: pause }
    timeout: 1h
    after: [implement]
    payload:
      coverage_threshold: 80

  review:
    skill: rd3:code-review-common
    gate: { type: human }                # Human-gated phases have no timeout (human decides)
    after: [test]
    payload:
      depth: thorough
      focus_areas: [security, performance]

  verify-bdd:
    skill: rd3:bdd-workflow
    gate: { type: auto }
    timeout: 30m
    after: [review]
    payload:
      depth: standard

  verify-func:
    skill: rd3:functional-review
    gate: { type: auto }
    timeout: 30m
    after: [review]
    payload:
      depth: standard

  docs:
    skill: rd3:code-docs
    gate: { type: auto }
    timeout: 30m
    after: [verify-bdd, verify-func]

# Presets: named phase-set aliases with optional parameter overrides.
# The DAG is the source of truth — presets are just convenience shortcuts.
# CLI: --preset simple  ≡  --phases implement,test --coverage 60
# CLI: --phases review  (no preset needed — run a single phase directly)
presets:
  simple:
    phases: [implement, test]
    defaults: { coverage_threshold: 60 }
  standard:
    phases: [intake, implement, test, review, docs]
    defaults: { coverage_threshold: 80 }
  complex:
    phases: [intake, arch, design, decompose, implement, test, review, verify-bdd, verify-func, docs]
    defaults: { coverage_threshold: 80 }
  research:
    phases: [intake, arch, design, decompose, implement, test, review, verify-bdd, verify-func, docs]
    defaults: { coverage_threshold: 60 }
```

### 4.4 Validation Rules

| Rule | Check |
|------|-------|
| Schema version | Must be `1` |
| Extends depth | Max 2 levels, no circular inheritance |
| DAG cycles | `after:` edges must form a DAG (no cycles) |
| Phase names | Unique, alphanumeric + hyphens |
| Skill existence | Referenced skills must exist in `plugins/` |
| Preset subgraphs | Preset phase list must form a valid subgraph of the DAG (all deps satisfied or absent) |
| Timeout format | Must be parseable duration string (`30m`, `1h`, `2h30m`) |
| Gate type | Must be `auto` or `human` |

### 4.5 Extends Resolution

```yaml
# .rd3/base-pipeline.yaml
schema_version: 1
name: base
phases:
  intake: { skill: rd3:request-intake, gate: { type: auto }, timeout: 30m }
  implement: { skill: rd3:code-implement-common, gate: { type: auto }, timeout: 2h }
  test: { skill: rd3:sys-testing, gate: { type: auto }, timeout: 1h }

# .rd3/pipeline.yaml
schema_version: 1
name: my-project
extends: .rd3/base-pipeline.yaml
phases:
  security-scan:                    # Add new phase
    skill: rd3:code-review-common
    gate: { type: auto }
    after: [implement]
    payload:
      focus_areas: [security]
  test:                             # Override existing phase
    payload:
      coverage_threshold: 95        # Higher coverage requirement
```

Resolution rules:
1. Child phases override parent phases with the same name (deep merge on `payload`)
2. Child presets override parent presets with the same name
3. Child hooks are appended to parent hooks
4. Max depth: 2 levels (base → project). No deeper chains.

---

## 5. FSM + DAG Architecture

### 5.1 The Split: Lifecycle vs Scheduling

| Concern | Owner | Analogy |
|---------|-------|---------|
| Is the pipeline alive, paused, done, or dead? | FSM | Kitchen open/closed |
| Given what's finished, what runs next? | DAG | Ticket board |

### 5.2 FSM — Lifecycle State Machine

**States (5, always):**

```
┌─────────┐  start   ┌─────────┐
│  IDLE   │─────────►│ RUNNING │
└─────────┘          └────┬────┘
                           │
              ┌────────────┼──────────────┐
              │            │              │
              ▼            ▼              ▼
       ┌──────────┐ ┌──────────┐  ┌───────────┐
       │  PAUSED  │ │  FAILED  │  │ COMPLETED │
       └────┬─────┘ └──────────┘  └───────────┘
            │
            │ resume
            ▼
       ┌─────────┐
       │ RUNNING │ (re-entry)
       └─────────┘
```

**Transition table:**

| From | To | Trigger | Guard | Hooks | Events Emitted |
|------|----|---------|-------|-------|----------------|
| IDLE | RUNNING | `run` | Pipeline YAML valid, task exists, executors healthy | `on-run-start` | `run.created`, `run.started` |
| RUNNING | RUNNING | Phase completes, more phases ready | DAG has ready phases | `on-phase-complete` | `phase.completed` |
| RUNNING | RUNNING | Phase fails, rework available | `iterations < max_iterations` | `on-rework` | `phase.rework` |
| RUNNING | PAUSED | Human gate encountered | Gate type = `human`, not `--auto` | `on-pause` | `run.paused` |
| RUNNING | PAUSED | All remaining phases blocked by paused phase | No phases can run | `on-pause` | `run.paused` |
| RUNNING | FAILED | Phase fails, rework exhausted | `iterations >= max_iterations`, escalation = fail | `on-phase-failure` | `phase.failed`, `run.failed` |
| RUNNING | FAILED | Executor unavailable | Health check fails | `on-phase-failure` | `phase.failed`, `run.failed` |
| RUNNING | COMPLETED | All phases done | DAG fully resolved | `on-run-complete` | `run.completed` |
| PAUSED | RUNNING | Resume with approval | User action (`--approve`) | `on-resume` | `run.resumed` |
| PAUSED | FAILED | Resume with rejection | User action (`--reject`) | `on-phase-failure` | `phase.failed`, `run.failed` |

### 5.3 DAG — Dependency Scheduling

**Algorithm:**

```
function scheduleReadyPhases(dag, completed, running, failed, paused):
    ready = []
    for phase in dag.phases:
        if phase in completed or phase in running or phase in failed or phase in paused:
            continue
        if all dependencies of phase are in completed:
            ready.append(phase)
    return ready
```

**Phase states within the DAG:**

| State | Meaning |
|-------|---------|
| `pending` | Not yet evaluated |
| `ready` | Dependencies satisfied, can be dispatched |
| `running` | Currently executing |
| `completed` | Successfully finished |
| `failed` | Failed and not reworkable |
| `paused` | Waiting (human gate) |
| `skipped` | Skipped (not in active phase set) |

**DAG evaluation triggers:**
- Pipeline start
- Phase completion
- Phase failure (for rework)
- Resume from pause

### 5.4 Rework Feedback Flow

When a phase fails and rework iterations remain, the runner injects the failure context into the next execution attempt. This is essential — without feedback, rework would blindly re-execute the same failing operation.

```
Phase execution fails
  → Runner extracts error from ExecutionResult (stderr, structured error, gate evidence)
  → Runner increments rework_iteration counter
  → Runner constructs new ExecutionRequest with:
      - Original prompt + payload (unchanged)
      - feedback: string field containing the previous failure's error message
      - rework_iteration: current iteration number
      - rework_max: max iterations allowed
  → Executor passes feedback to skill (appended to prompt or as structured input)
  → Skill uses feedback to adjust its approach
```

The `ExecutionRequest` interface includes:
```typescript
interface ExecutionRequest {
    // ... existing fields ...
    readonly feedback?: string;           // Error from previous rework attempt
    readonly reworkIteration?: number;    // Current iteration (1-based)
    readonly reworkMax?: number;          // Max iterations allowed
}
```

When `reworkIteration > 0`, the executor prepends the feedback to the skill prompt so the skill can see what went wrong and attempt a different approach.

### 5.5 Why Not Pure FSM

| Aspect | Pure FSM | FSM + DAG |
|--------|----------|-----------|
| State count for 9-phase pipeline | O(5^N) combinatorial | FSM: 5 states + DAG: phase status map |
| Adding a parallel phase | New compound states for every combination | Add one `after:` edge |
| "What can run now?" | Implicit in current state | Explicit from DAG evaluation |
| Human gate during parallel execution | Compound states like `PAUSED_REVIEW_RUNNING_TEST` | DAG marks one phase paused, others continue |
| Test complexity | Must test every state permutation | Test FSM (5 transitions) + test DAG (isolated) |

The pure FSM approach causes state explosion: with N phases that can each be in 5 states (pending, running, paused, failed, completed), the state space is O(5^N). The FSM+DAG split keeps the FSM at exactly 5 states regardless of pipeline complexity.

---

## 6. State Storage — Event-Sourced SQLite

### 6.1 Storage Location

```
.rdinstate/orchestrator.db    # Project-level SQLite database
```

### 6.2 DDL

```sql
-- Schema version tracking
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO schema_version (version) VALUES (1);

-- Event store (append-only)
CREATE TABLE events (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSON NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_events_run ON events(run_id);
CREATE INDEX idx_events_type ON events(event_type);

-- Pipeline runs
CREATE TABLE runs (
    id TEXT PRIMARY KEY,
    task_ref TEXT NOT NULL,
    preset TEXT,                -- Named preset used (null if --phases was used directly)
    phases_requested TEXT NOT NULL, -- Comma-separated phase names actually requested
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
    config_snapshot JSON NOT NULL,
    pipeline_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_runs_task ON runs(task_ref);
CREATE INDEX idx_runs_status ON runs(status);

-- Phase execution records
CREATE TABLE phases (
    run_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'skipped')),
    skill TEXT NOT NULL,
    payload JSON,
    started_at DATETIME,
    completed_at DATETIME,
    error_code TEXT,
    error_message TEXT,
    rework_iteration INTEGER DEFAULT 0,
    PRIMARY KEY (run_id, name),
    FOREIGN KEY (run_id) REFERENCES runs(id)
);
CREATE INDEX idx_phases_status ON phases(status);

-- Gate verification results
CREATE TABLE gate_results (
    run_id TEXT NOT NULL,
    phase_name TEXT NOT NULL,
    step_name TEXT NOT NULL,
    checker_method TEXT NOT NULL,
    passed INTEGER NOT NULL,
    evidence JSON,
    duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_id, phase_name, step_name),
    FOREIGN KEY (run_id) REFERENCES runs(id)
);

-- Rollback snapshots
CREATE TABLE rollback_snapshots (
    run_id TEXT NOT NULL,
    phase_name TEXT NOT NULL,
    git_head TEXT,
    files_before JSON,
    files_after JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_id, phase_name),
    FOREIGN KEY (run_id) REFERENCES runs(id)
);

-- Resource usage metrics (model, tokens, time)
CREATE TABLE resource_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    phase_name TEXT NOT NULL,
    model_id TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0,
    wall_clock_ms INTEGER NOT NULL,
    execution_ms INTEGER NOT NULL,
    first_token_ms INTEGER,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id)
);
CREATE INDEX idx_resource_usage_run ON resource_usage(run_id);
CREATE INDEX idx_resource_usage_model ON resource_usage(model_id);
CREATE INDEX idx_resource_usage_phase ON resource_usage(phase_name);
```

### 6.3 Aggregation Queries

```sql
-- Token usage per model across all runs
SELECT model_id,
       model_provider,
       SUM(input_tokens) AS total_input,
       SUM(output_tokens) AS total_output,
       SUM(cache_read_tokens) AS total_cache_read,
       COUNT(*) AS call_count
FROM resource_usage
GROUP BY model_id, model_provider;

-- Average phase duration by preset
SELECT r.preset, p.name AS phase_name,
       AVG(CAST((julianday(p.completed_at) - julianday(p.started_at)) * 86400000 AS INTEGER)) AS avg_ms,
       AVG(ru.input_tokens + ru.output_tokens) AS avg_tokens
FROM phases p
JOIN runs r ON p.run_id = r.id
LEFT JOIN resource_usage ru ON ru.run_id = p.run_id AND ru.phase_name = p.name
WHERE p.status = 'completed'
GROUP BY r.preset, p.name;

-- Run-level summary
SELECT r.id, r.task_ref, r.preset, r.status,
       SUM(ru.input_tokens) AS total_input,
       SUM(ru.output_tokens) AS total_output,
       SUM(ru.wall_clock_ms) AS total_wall_ms,
       COUNT(DISTINCT ru.model_id) AS models_used
FROM runs r
LEFT JOIN resource_usage ru ON ru.run_id = r.id
GROUP BY r.id;

-- Success rate by preset (last 30 days)
SELECT preset,
       COUNT(*) AS total_runs,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS successes,
       ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 1) AS success_rate
FROM runs
WHERE created_at >= datetime('now', '-30 days')
GROUP BY preset;
```

### 6.4 Configuration

- **Driver:** `bun:sqlite` (Bun's built-in SQLite binding — no external dependencies)
- **Journal mode:** WAL (Write-Ahead Logging) for concurrent reads during execution
- **Busy timeout:** 5000ms — waits for locks instead of failing immediately
- **Schema versioning:** `schema_version` table, checked on every connection open

### 6.5 Event Compaction

Events accumulate over time. Compaction strategy:

```bash
orchestrator prune --older-than 30d           # Delete events for runs older than 30 days
orchestrator prune --keep-last 100            # Keep only the last 100 runs
orchestrator prune --dry-run                  # Preview what would be deleted
```

Compaction deletes from: `events`, `gate_results`, `resource_usage`, `rollback_snapshots`. Run records in `runs` and `phases` are preserved for historical queries.

---

## 7. Executor Model

### 7.1 Interface Definition

```typescript
interface Executor {
    readonly id: string;
    readonly capabilities: ExecutorCapabilities;
    execute(req: ExecutionRequest): Promise<ExecutionResult>;
    healthCheck(): Promise<ExecutorHealth>;
    dispose(): Promise<void>;
}

interface ExecutorCapabilities {
    readonly parallel: boolean;
    readonly streaming: boolean;
    readonly structuredOutput: boolean;
    readonly channels: readonly string[];
    readonly maxConcurrency: number;
}

interface ExecutorHealth {
    healthy: boolean;
    message?: string;
    lastChecked: Date;
}

interface ExecutionRequest {
    readonly skill: string;
    readonly phase: string;
    readonly prompt: string;
    readonly payload: Record<string, unknown>;
    readonly channel: string;
    readonly timeoutMs: number;
    readonly outputSchema?: Record<string, unknown>;
    readonly feedback?: string;           // Error from previous rework attempt (see §5.4)
    readonly reworkIteration?: number;    // Current iteration (1-based, absent on first run)
    readonly reworkMax?: number;          // Max iterations allowed
}

interface ExecutionResult {
    readonly success: boolean;
    readonly exitCode: number;
    readonly stdout?: string;
    readonly stderr?: string;
    readonly structured?: Record<string, unknown>;
    readonly durationMs: number;
    readonly timedOut: boolean;
    readonly resources?: ResourceMetrics[];
}
```

### 7.2 Implementations

| Executor | Use Case | `parallel` | `maxConcurrency` | `structuredOutput` |
|----------|----------|:----------:|:-----------------:|:-------------------:|
| `LocalBunExecutor` | Default — runs skill scripts locally via `Bun.spawn` | No | 1 | Via JSON parsing |
| `AcpExecutor` | Cross-channel — delegates to remote agent via `acpx` | Yes | Configurable | Via `--format json` |
| `MockExecutor` | Testing — returns canned responses | Yes | Unlimited | Yes (predefined) |

**LocalBunExecutor:** Async wrapper around `Bun.spawn` with timeout via `AbortController`. Extracts resource metrics from stdout (JSON output) or sidecar metrics file.

**AcpExecutor:** Async wrapper around `acpx` CLI with structured output parsing. Extracts resource metrics from `acpx --format json` NDJSON event stream.

**MockExecutor:** Returns predefined responses for testing. Supports scripted sequences (first call returns X, second returns Y).

### 7.3 Executor Pool

```typescript
interface ExecutorPool {
    register(executor: Executor): void;
    resolve(channel: string): Executor;
    healthCheckAll(): Promise<Map<string, ExecutorHealth>>;
    disposeAll(): Promise<void>;
}
```

The pool selects the appropriate executor based on the channel string:
- `current` → `LocalBunExecutor`
- Any ACP agent name (e.g., `codex`, `claude`) → `AcpExecutor`
- `mock` → `MockExecutor` (test mode only)

---

## 8. Event Taxonomy

### 8.1 Event Types

| Event Type | Producer | Payload Schema | Consumers |
|------------|----------|----------------|-----------|
| `run.created` | Pipeline Runner | `{ run_id, task_ref, preset, phases_requested, pipeline_name, config_snapshot }` | State Manager, Event Store |
| `run.started` | FSM | `{ run_id }` | Observability, CLI |
| `run.paused` | FSM | `{ run_id, reason, phase_name }` | Observability, CLI |
| `run.resumed` | FSM | `{ run_id, action, phase_name }` | Observability, CLI |
| `run.completed` | FSM | `{ run_id, total_duration_ms, phases_completed }` | Observability, Reporter |
| `run.failed` | FSM | `{ run_id, error_code, error_message, failed_phase }` | Observability, Reporter |
| `phase.started` | DAG Scheduler | `{ run_id, phase_name, skill, payload }` | State Manager, CLI |
| `phase.completed` | DAG Scheduler | `{ run_id, phase_name, duration_ms, artifacts }` | State Manager, Observability |
| `phase.failed` | DAG Scheduler | `{ run_id, phase_name, error_code, error_message }` | State Manager, Observability |
| `phase.rework` | DAG Scheduler | `{ run_id, phase_name, iteration, max_iterations, error }` | Observability, CLI |
| `gate.evaluated` | CoV Driver | `{ run_id, phase_name, step_name, checker_method, passed, evidence }` | State Manager, Observability |
| `executor.invoked` | Executor Pool | `{ executor_id, skill, channel, phase_name }` | Observability |
| `executor.completed` | Executor Pool | `{ executor_id, duration_ms, exit_code, resources }` | Observability, State Manager |

### 8.2 Event Flow

```
Executor → executor.invoked → Event Bus → SQLite events table
Executor → executor.completed → Event Bus → SQLite + metrics
DAG → phase.started → Event Bus → SQLite + CLI update
DAG → phase.completed → Event Bus → SQLite + CLI update
FSM → run.paused → Event Bus → SQLite + CLI update
CoV → gate.evaluated → Event Bus → SQLite
```

All events flow through a single typed `EventBus` instance. The event bus is synchronous-in-process (no IPC) and persists to SQLite asynchronously.

---

## 9. Error Taxonomy

### 9.1 Error Codes

| Code | Category | Severity | Exit Code | Recovery |
|------|----------|----------|-----------|----------|
| `PIPELINE_NOT_FOUND` | config | error | 11 | Create pipeline.yaml or specify --pipeline |
| `TASK_NOT_FOUND` | config | error | 12 | Check task reference |
| `PRESET_NOT_FOUND` | config | error | 10 | Check preset name in pipeline.yaml |
| `PHASE_NOT_FOUND` | config | error | 10 | Check phase name |
| `PIPELINE_VALIDATION_FAILED` | config | error | 11 | Fix validation errors, run `orchestrator validate` |
| `DAG_CYCLE_DETECTED` | config | error | 11 | Remove circular `after:` dependencies |
| `EXTENDS_CIRCULAR` | config | error | 11 | Fix extends chain |
| `EXTENDS_DEPTH_EXCEEDED` | config | error | 11 | Reduce extends nesting to max 2 levels |
| `STATE_CORRUPT` | state | critical | 13 | Delete .rdinstate/orchestrator.db and re-run |
| `STATE_LOCKED` | state | warning | 13 | Wait for lock release or kill stale process |
| `STATE_MIGRATION_NEEDED` | state | warning | 13 | Run migration tool |
| `EXECUTOR_UNAVAILABLE` | execution | error | 20 | Check channel config, install acpx |
| `EXECUTOR_TIMEOUT` | execution | error | 1 | Increase timeout in pipeline.yaml |
| `EXECUTOR_FAILED` | execution | error | 1 | Check executor stderr in `orchestrator inspect` |
| `CHANNEL_UNAVAILABLE` | execution | error | 20 | Check channel name, verify acpx agent list |
| `CONTRACT_VIOLATION` | execution | error | 1 | Worker output didn't match expected schema |
| `GATE_FAILED` | verification | warning | 1 | Inspect evidence: `orchestrator inspect <task> <phase> --evidence` |
| `GATE_PENDING` | verification | info | 2 | Resume with `orchestrator resume --approve` |
| `REWORK_EXHAUSTED` | verification | warning | 1 | Max rework iterations reached, escalated |
| `UNDO_UNCOMMITTED_CHANGES` | state | warning | 1 | Use --force or commit/stash changes first |

### 9.2 Error Categories

| Category | Scope | Common Recovery |
|----------|-------|-----------------|
| `config` | Pipeline YAML or CLI arguments | Fix the config, re-run |
| `state` | SQLite database | Check DB integrity, re-run |
| `execution` | Executor or skill execution | Check executor output, fix and resume |
| `verification` | Gate checks | Inspect evidence, fix issue, resume |

---

## 10. Resource Metrics Schema

### 10.1 Interface

```typescript
interface ResourceMetrics {
    model_id: string;              // e.g., "claude-sonnet-4-20250514"
    model_provider: string;        // e.g., "anthropic", "openai"
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens?: number;    // Anthropic prompt caching
    cache_creation_tokens?: number;
    wall_clock_ms: number;         // Total wall-clock time
    execution_ms: number;          // Active execution time (excl. queue/wait)
    first_token_ms?: number;       // Time to first token (streaming)
}
```

### 10.2 Metrics Flow

```
Executor extracts metrics from execution backend
  → ExecutionResult.resources: ResourceMetrics[]
  → Executor emits executor.completed event with resources
  → Event Bus routes to State Manager
  → State Manager persists to resource_usage table
  → CLI reads from resource_usage for display
```

**No pricing calculation.** We track raw resource consumption (model, tokens, time). Pricing is volatile and belongs in billing systems, not the engine.

### 10.3 Per-Executor Extraction

| Executor | Metrics Source |
|----------|---------------|
| `LocalBunExecutor` | Skill script stdout (JSON) or `.rdinstate/metrics/<phase>.json` |
| `AcpExecutor` | `acpx --format json` NDJSON event stream (usage fields) |
| `MockExecutor` | Predefined in test fixtures |

---

## 11. CoV Driver

### 11.1 Adapter Interface

```typescript
interface VerificationDriver {
    runChain(manifest: ChainManifest): Promise<ChainState>;
    resumeChain(stateDir: string, action?: "approve" | "reject"): Promise<ChainState>;
}
```

### 11.2 Default Implementation

Wraps the existing `verification-chain/scripts/interpreter.ts` — decouples orchestration-v2 from the verification-chain skill's internal API.

```typescript
class DefaultCoVDriver implements VerificationDriver {
    constructor(private readonly interpreter: typeof import("../../verification-chain/scripts/interpreter")) {}

    async runChain(manifest: ChainManifest): Promise<ChainState> {
        return this.interpreter.runChain(manifest);
    }

    async resumeChain(stateDir: string, action?: "approve" | "reject"): Promise<ChainState> {
        return this.interpreter.resumeChain(stateDir, action);
    }
}
```

### 11.3 Future Backends

The adapter interface enables swapping to alternative verification systems (e.g., a simpler built-in checker, an external verification service) without modifying the engine.

---

## 12. Observability Architecture

### 12.1 Pattern: Event Bus + SQLite Aggregation

All subsystems emit events through the `EventBus`. The `StateManager` subscribes and persists to SQLite. The `Reporter` queries SQLite for display.

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│   FSM    │  │   DAG    │  │ Executor │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │              │              │
     ▼              ▼              ▼
┌──────────────────────────────────────────┐
│              Event Bus                    │
└──────────────────┬───────────────────────┘
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
   ┌──────────┐ ┌──────┐ ┌──────────┐
   │   State  │ │ CLI  │ │ Reporter │
   │  Manager │ │update│ │          │
   └──────────┘ └──────┘ └──────────┘
```

### 12.2 Report Formats

| Format | Command Flag | Consumer |
|--------|-------------|----------|
| Table (interactive) | default | Human in terminal |
| Markdown | `--format markdown` | Documentation, PRs |
| JSON | `--format json` | Scripts, CI/CD |
| Summary | `--format summary` | One-line overview, notifications |

---

## 13. Module Definitions

### 13.1 File Structure

```
plugins/rd3/skills/orchestration-v2/
├── SKILL.md                                 # Agent-facing skill document
├── scripts/
│   ├── model.ts              (~300 lines)   # All types, interfaces, error codes
│   ├── config/
│   │   ├── schema.ts         (~150 lines)   # Pipeline YAML JSON Schema
│   │   ├── parser.ts         (~200 lines)   # YAML parser + validator
│   │   └── resolver.ts       (~100 lines)   # extends: resolution
│   ├── state/
│   │   ├── manager.ts        (~250 lines)   # SQLite state manager
│   │   ├── events.ts         (~150 lines)   # Event store
│   │   ├── migrations.ts     (~80 lines)    # Schema migrations
│   │   └── queries.ts        (~200 lines)   # Common queries
│   ├── engine/
│   │   ├── fsm.ts            (~250 lines)   # FSM engine
│   │   ├── dag.ts            (~200 lines)   # DAG scheduler
│   │   ├── hooks.ts          (~100 lines)   # Hook registry + execution
│   │   └── runner.ts         (~300 lines)   # Pipeline runner
│   ├── executors/
│   │   ├── pool.ts           (~150 lines)   # Executor registry
│   │   ├── local.ts          (~200 lines)   # LocalBunExecutor
│   │   ├── acp.ts            (~250 lines)   # AcpExecutor
│   │   └── mock.ts           (~100 lines)   # MockExecutor
│   ├── verification/
│   │   └── cov-driver.ts     (~150 lines)   # CoV adapter
│   ├── observability/
│   │   ├── event-bus.ts      (~150 lines)   # Typed event bus
│   │   ├── metrics.ts        (~100 lines)   # Resource metrics
│   │   └── reporter.ts       (~250 lines)   # Report generation
│   ├── cli/
│   │   ├── commands.ts       (~200 lines)   # CLI command definitions
│   │   ├── status.ts         (~150 lines)   # Status display
│   │   └── report.ts         (~150 lines)   # Report output
│   └── run.ts                (~50 lines)    # CLI entry point + shebang
├── references/
│   ├── pipeline-yaml-guide.md               # How to write pipeline.yaml
│   ├── cli-reference.md                     # Full CLI usage guide
│   ├── error-codes.md                       # Error taxonomy + recovery
│   ├── agent-cooperation.md                 # How agents interact with the engine
│   └── examples/
│       ├── default.yaml                     # Default 9-phase pipeline
│       ├── quick-fix.yaml                   # Simple 2-phase pipeline
│       └── security-first.yaml              # Pipeline with security scan
└── tests/
    ├── model.test.ts
    ├── config.test.ts
    ├── state.test.ts
    ├── engine.test.ts
    ├── executors.test.ts
    ├── verification.test.ts
    ├── cli.test.ts
    └── integration.test.ts
```

**Estimated total:** ~4,200 lines of implementation, ~3,500 lines of tests.

### 13.2 Module Dependency Graph

```
run.ts → cli/commands.ts → engine/runner.ts
                              ├── engine/fsm.ts → model.ts
                              ├── engine/dag.ts → model.ts
                              ├── engine/hooks.ts → model.ts
                              ├── state/manager.ts → state/events.ts, state/queries.ts, state/migrations.ts
                              ├── executors/pool.ts → executors/local.ts | executors/acp.ts | executors/mock.ts
                              ├── verification/cov-driver.ts
                              ├── observability/event-bus.ts
                              └── config/parser.ts → config/schema.ts, config/resolver.ts

cli/status.ts → state/queries.ts
cli/report.ts → observability/reporter.ts → state/queries.ts
```

### 13.3 Public API per Module

| Module | Key Exports |
|--------|-------------|
| `model.ts` | `Executor`, `ExecutorCapabilities`, `ExecutionRequest`, `ExecutionResult`, `ResourceMetrics`, `PipelineDefinition`, `PhaseDefinition`, `FSMState`, `DAGPhaseState`, `ErrorCode`, `OrchestratorError` |
| `config/parser.ts` | `parsePipelineYaml(path): PipelineDefinition`, `validatePipeline(def): ValidationResult` |
| `config/resolver.ts` | `resolveExtends(def, basePath): PipelineDefinition` |
| `state/manager.ts` | `StateManager` class — `createRun()`, `getRun()`, `updatePhase()`, `getActiveRuns()` |
| `state/events.ts` | `EventStore` class — `append()`, `query()`, `getEventsForRun()` |
| `engine/fsm.ts` | `FSMEngine` class — `start()`, `pause()`, `resume()`, `getState()`, `onTransition()` |
| `engine/dag.ts` | `DAGScheduler` class — `evaluate()`, `markCompleted()`, `markFailed()`, `markPaused()` |
| `engine/runner.ts` | `PipelineRunner` class — `run()`, `resume()`, `undo()`, `getStatus()` |
| `executors/pool.ts` | `ExecutorPool` class — `register()`, `resolve()`, `healthCheckAll()` |
| `observability/event-bus.ts` | `EventBus` class — `emit()`, `subscribe()`, `unsubscribe()` |
| `observability/reporter.ts` | `Reporter` class — `statusTable()`, `markdownReport()`, `jsonReport()`, `summaryLine()` |

---

## 14. Agent Skill Design

### 14.1 SKILL.md Structure

The SKILL.md is the agent-facing API documentation. It teaches agents how to invoke the engine, read state, and customize pipelines.

```yaml
---
name: rd3:orchestration-v2
description: "Next-generation pipeline orchestration engine with DAG-based
parallel execution, FSM lifecycle management, event-sourced SQLite state,
and CLI-first interface. Use when running multi-phase development pipelines,
resuming paused workflows, generating pipeline reports, or customizing
pipeline definitions per-project."
tags: [orchestration, pipeline, cli, dag, fsm, verification]
---
```

Key sections:
- **Quick Start** — 3 CLI examples for common operations
- **Core Concepts** — Pipeline YAML, presets, FSM lifecycle, DAG scheduling
- **CLI Reference** → `references/cli-reference.md`
- **Pipeline YAML Guide** → `references/pipeline-yaml-guide.md`
- **Agent Cooperation** → `references/agent-cooperation.md`
- **Error Recovery** → `references/error-codes.md`

### 14.2 Reference Documents

| Document | Purpose | Loaded When |
|----------|---------|-------------|
| `references/cli-reference.md` | Full CLI usage for all commands | Agent needs to invoke the engine |
| `references/pipeline-yaml-guide.md` | How to write pipeline.yaml, extends, presets | Agent customizes pipelines |
| `references/agent-cooperation.md` | How to read state, resume, diagnose failures | Agent cooperates with running pipeline |
| `references/error-codes.md` | Error taxonomy with recovery strategies | Agent encounters an error |
| `references/examples/*.yaml` | Sample pipeline definitions | Agent creates new pipelines |

### 14.3 `references/agent-cooperation.md` — Key Content

This document teaches agents to be good pipeline citizens:

1. **Always check state before acting:** `orchestrator status <task>`
2. **Resume intelligently:** Inspect errors before resuming, use `--approve`/`--reject` explicitly
3. **Customize via YAML:** Edit pipeline.yaml, always `orchestrator validate` after changes
4. **Diagnose with inspect:** `orchestrator inspect <task> <phase> --evidence` for failure analysis
5. **Respect rework limits:** Don't manually retry beyond `max_iterations`
6. **Use dry-run for planning:** `orchestrator run <task> --dry-run` before committing

---

## 15. Migration Plan

### 15.1 Coexistence Strategy

During migration, both systems coexist:

```
plugins/rd3/skills/orchestration-dev/     # Current system (frozen — Track 1 fixes only)
plugins/rd3/skills/orchestration-v2/      # New system (active development)
```

- `orchestrator` command always points to v2
- v1 invocation continues through existing agent/command wrappers
- No shared state files — v1 uses JSON, v2 uses SQLite

### 15.2 Migration Steps

1. **Create default pipeline.yaml** from current `PHASE_MATRIX` hardcoding
2. **Port all 4 presets** (simple, standard, complex, research) to YAML presets with defaults
3. **Port phase-specific gate configurations** from `gates.ts` to pipeline.yaml gate blocks
4. **Write state migration script:** `orchestrator migrate --from-v1`
   - Scans `docs/.workflow-runs/rd3-orchestration-dev/` for JSON state files
   - Converts to SQLite records
   - Preserves all evidence and gate data
5. **Validate:** Run same tasks through both engines, compare results
6. **Deprecation:** Once v2 is validated, mark v1 as deprecated in SKILL.md
7. **Removal:** After one quarter of v2 stability, remove v1

### 15.3 Validation Criteria

- All 248 existing tests pass with v2 engine
- A/B comparison: same task, both engines, identical outcomes
- Performance: v2 run time within 10% of v1 for sequential execution
- Feature parity: every v1 feature has a v2 equivalent

---

## 16. Build Phases

### Phase 0: Blueprint (This Document)

**Duration:** 3-5 days  
**Deliverable:** This document — the single source of truth  
**Status:** Complete

### Phase 1: System Design

**Duration:** 3-4 days  
**Depends on:** Phase 0  
**Deliverables:**
- CLI arg parsing design (commander.js or hand-rolled)
- Module dependency graph with build order
- Common library extraction plan
- SKILL.md + all reference documents
- Test strategy per module

### Phase 2: Structure Scaffolding

**Duration:** 2-3 days  
**Depends on:** Phase 1  
**Deliverables:**
- Full directory structure created
- `model.ts` — all types and interfaces, compiles
- `run.ts` — CLI entry point with stubs
- Empty modules with exported interfaces
- Test file stubs for every module

### Phase 3: Common Parts Implementation

**Duration:** 5-7 days  
**Depends on:** Phase 2  
**Build order:**
1. `model.ts` — types, interfaces, error codes
2. `observability/event-bus.ts` — typed event emitter
3. `state/` — SQLite schema, event store, manager
4. `config/` — YAML parser, validator, resolver
5. `executors/mock.ts` — MockExecutor
6. Tests for all above (target: 90%+ coverage)

### Phase 4: Core Engine Implementation

**Duration:** 8-10 days  
**Depends on:** Phase 3  
**Build order:**
1. `engine/fsm.ts` — FSM engine with transition hooks
2. `engine/dag.ts` — DAG scheduler with topological sort
3. `engine/hooks.ts` — Hook registry
4. `executors/local.ts` — LocalBunExecutor
5. `executors/acp.ts` — AcpExecutor
6. `executors/pool.ts` — Executor registry
7. `verification/cov-driver.ts` — CoV adapter
8. `engine/runner.ts` — Pipeline runner (ties everything together)
9. Tests for all above (TDD throughout)

### Phase 5: CLI + Observability

**Duration:** 4-5 days  
**Depends on:** Phase 4  
**Build order:**
1. `observability/metrics.ts` — Resource metrics
2. `observability/reporter.ts` — Report generation
3. `cli/commands.ts` — All command definitions
4. `cli/status.ts` — Status display
5. `cli/report.ts` — Report output
6. `run.ts` — Wire CLI to engine
7. Integration tests

### Phase 6: Existing Workflow Migration

**Duration:** 3-4 days  
**Depends on:** Phase 5  
**Build order:**
1. Default pipeline.yaml from current PHASE_MATRIX
2. Port all 4 presets to YAML
3. State migration script
4. Validate against existing test expectations
5. A/B comparison testing

### Phase 7: New Workflow Implementation

**Duration:** 5-7 days per workflow  
**Depends on:** Phase 6  
**Priority order:**
1. Parallel verification (verify-bdd + verify-func concurrent)
2. Per-project custom pipelines (extends + overrides)
3. Security scan as parallel phase
4. Advanced reporting (historical trends, model comparison)

### Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|-----------|
| 0. Blueprint | 3-5d | 3-5d |
| 1. System Design | 3-4d | 6-9d |
| 2. Scaffolding | 2-3d | 8-12d |
| 3. Common Parts | 5-7d | 13-19d |
| 4. Core Engine | 8-10d | 21-29d |
| 5. CLI + Observability | 4-5d | 25-34d |
| 6. Migration | 3-4d | 28-38d |
| 7. New Workflows | 5-7d each | 33-45d+ |

**Total to migration complete (Phase 6): ~6-8 weeks.**

---

## 17. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|-----------|
| YAML `extends:` resolution complexity | Medium | Medium | Limit to 2 levels; no circular; validate early |
| SQLite event store grows unbounded | Low | Medium | `orchestrator prune` command for garbage collection |
| DAG parallel execution causes file conflicts | High | High | Start sequential-only in MVP; parallel is opt-in per phase |
| `acpx` CLI interface changes | Medium | High | Pin acpx version; integration tests |
| Over-engineering event schema | Medium | Low | Start with 13 event types; add more only when needed |
| FSM + DAG boundary confusion | Medium | Medium | Explicit contract: FSM = lifecycle, DAG = scheduling |
| Pipeline YAML validation too strict | Low | Low | Clear error messages with line numbers and fix suggestions |
| Migration breaks existing workflows | Medium | High | Coexistence period; A/B testing; rollback plan |

---

## 18. Out of Scope

These items are explicitly NOT part of orchestration-v2:

| Item | Reason | Revisit When |
|------|--------|-------------|
| Sandboxing/containerization | Out of scope for local-first CLI | Security requirements emerge |
| MCP integration | Premature; ACP works | MCP standard stabilizes |
| Adaptive rework (dynamic iteration adjustment) | Industry hasn't solved this | Research matures |
| Distributed execution (multi-machine) | Single-machine tool | Scale requirements emerge |
| Visual pipeline builder | YAML is sufficient | User demand justifies investment |
| Pricing/cost calculation | Volatile; belongs in billing | Stable pricing APIs available |
| Multi-user concurrency | Single-developer tool | Team collaboration needs emerge |
| Context budget enforcement | Orchestrator doesn't control downstream skill context usage; token tracking via `resource_usage` table is sufficient observability | Skills develop built-in budget awareness |

---

## 19. References

### Project Internal

1. `docs/research/orchestration-dev-comprehensive-review.md` — Comprehensive review of current system (Part 1-9)
2. `docs/research/agent-orchestration-sota-2026.md` — State of the art agent orchestration patterns (2026)
3. `plugins/rd3/skills/orchestration-dev/SKILL.md` — Current orchestration skill specification
4. `plugins/rd3/skills/verification-chain/SKILL.md` — CoV system specification
5. `plugins/rd3/skills/run-acp/SKILL.md` — ACP cross-channel execution skill

### Industry

6. LangGraph — Stateful graph-based agent orchestration (2025-2026)
7. Temporal — Event-sourced workflow engine
8. CrewAI — Role-based multi-agent orchestration
9. Dify — Visual DAG workflow builder
10. Anthropic — "Lessons from Building Claude Code: How We Use Skills" (2026)
11. Google Cloud Tech — "5 Agent Skill Design Patterns Every ADK Developer Should Know" (2026)

---

*End of Blueprint. Draft v1.1.0 — Generated by Lord Robb — 2026-03-31. Reviewed: profiles→presets (DAG-first), rework feedback flow, bun:sqlite, prune/migrate CLI.*
