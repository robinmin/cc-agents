# Pipeline YAML Guide

How to write and customize pipeline definitions for orchestration-v2.

## Philosophy: Pipeline YAML is WHAT, FSM is HOW

The YAML file declares **what** phases exist, what skills they use, what order they run in, and what parameters they receive. The FSM lifecycle (IDLE → RUNNING → PAUSED → COMPLETED → FAILED) is engine-internal — it never appears in the YAML.

## Schema

```yaml
# Required
schema_version: 1
name: string

# Optional
extends: string | null    # Inherit from another pipeline (max 2 levels)

# Stack definition
stack:
  language: string        # e.g., "typescript"
  runtime: string         # e.g., "bun"
  linter: string          # e.g., "biome"
  test: string            # e.g., "bun test"
  coverage: string        # e.g., "bun test --coverage"

# Phase definitions (DAG nodes)
phases:
  <phase-name>:
    skill: string           # Skill to invoke (e.g., "rd3:request-intake")
    executor: local | direct | auto | <external-channel> | { mode | channel | adapter }
    gate:
      type: command | auto | human
      # ── command-specific ───────────
      command: string           # Required when type is "command"
      # ── auto-specific ─────────────
      checklist:                # Required for auto (unless skill provides defaults)
        - "description to evaluate"
      prompt_template: string   # Optional, overrides default prompt
      severity: blocking | advisory  # Default: blocking
      # ── human-specific ────────────
      prompt: string            # Optional description shown at pause
      # ── shared ───────────────────
      rework:
        max_iterations: number   # Default: 0
        escalation: pause | fail # Default: pause
    timeout: string         # Duration: "30m", "1h", "2h30m"
    after: [string]         # DAG edges — phase names this depends on
    payload:                # Arbitrary YAML passed to skill
      key: value

# Named presets (optional convenience aliases)
presets:
  <preset-name>:
    phases: [phase-name]
    defaults:
      key: value

# Hook definitions
hooks:
  on-phase-start:
    - run: string          # Shell command template
  on-phase-complete:
    - run: string
  on-phase-failure:
    - action: pause | fail
      reason: string
  on-rework: []
  on-pause: []
  on-resume: []
```

## Phase Configuration

### Gate Types

**Command gate:** Runs a shell command — exit code 0 means pass, non-zero means fail. Deterministic and fast.

```yaml
test:
  skill: rd3:sys-testing
  gate:
    type: command
    command: "bun test --coverage"
  after: [implement]
```

**Auto gate:** LLM-based verification using a checklist. Non-deterministic, each item must pass. Can be blocking (default) or advisory.

```yaml
intake:
  skill: rd3:request-intake
  gate:
    type: auto
    checklist:
      - "Task requirements are clearly captured"
      - "Scope and boundaries are defined"
      - "No ambiguous or missing acceptance criteria"
  timeout: 30m
```

Auto gates can also run in advisory mode (warn but don't block):

```yaml
arch:
  skill: rd3:backend-architect
  gate:
    type: auto
    checklist:
      - "Architecture addresses all requirements"
    severity: advisory       # Warns on failure, phase still completes
  timeout: 1h
```

If no `checklist` is specified, the skill or engine provides defaults. See the [Gate Architecture](gate-architecture.md) for full details on checklist resolution.

**Human gate:** Pipeline pauses after phase completes, awaiting human approval.

```yaml
review:
  skill: rd3:code-review-common
  gate:
    type: human
    prompt: "Review the implementation for security and performance"
  after: [test]
```

Template variables available in command strings:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{task_ref}}` | Task WBS reference | `0266` |
| `{{phase}}` | Phase name | `test` |
| `{{run_id}}` | Pipeline run ID | `run_m3x8k_ab12cd` |

### Rework Configuration

When a phase fails, it can be automatically retried with failure feedback:

```yaml
test:
  skill: rd3:sys-testing
  gate:
    type: auto
    checklist:
      - "All tests pass"
      - "Coverage meets threshold"
    rework:
      max_iterations: 3      # Retry up to 3 times
      escalation: pause      # Pause pipeline when exhausted
  timeout: 1h
  after: [implement]
```

- `max_iterations`: How many rework attempts (default: 2)
- `escalation`: What happens when rework is exhausted
  - `pause` — Pause the pipeline for human intervention
  - `fail` — Fail the pipeline immediately

### Timeout Format

Human-readable duration strings:

| Format | Meaning |
|--------|---------|
| `30m` | 30 minutes |
| `1h` | 1 hour |
| `2h` | 2 hours |
| `2h30m` | 2 hours 30 minutes |

Human-gated phases have no timeout — the human decides when to proceed.

### Payload

Arbitrary YAML passed to the skill. Skills use this to configure their behavior:

```yaml
test:
  skill: rd3:sys-testing
  gate: { type: auto }
  timeout: 1h
  after: [implement]
  payload:
    coverage_threshold: 80
    report_format: detailed
```

### Executor Selection

Phases default to the orchestrator default executor, which is `local` unless routing config overrides it. Add `executor` only when a phase needs a different transport.

```yaml
phases:
  implement:
    skill: rd3:code-implement-common
    executor: direct
    gate: { type: command, command: "bun run check" }

  review:
    skill: rd3:code-review-common
    executor:
      channel: codex
    gate: { type: human }
```

- `executor: local` → in-process local execution
- `executor: direct` → Bun subprocess execution
- `executor: codex` → explicit external ACP execution
- `executor: { adapter: acp-session:codex }` → explicit adapter selection

## DAG Dependencies

The `after:` field declares phase dependencies. The scheduler resolves execution order via topological sort.

### Sequential (default)

```yaml
phases:
  intake:
    skill: rd3:request-intake
    gate: { type: auto }
  arch:
    skill: rd3:backend-architect
    gate: { type: auto }
    after: [intake]
```

### Parallel

Phases with the same dependencies run concurrently:

```yaml
phases:
  verify-bdd:
    skill: rd3:bdd-workflow
    gate: { type: auto }
    after: [review]
  verify-func:
    skill: rd3:functional-review
    gate: { type: auto }
    after: [review]
  docs:
    skill: rd3:code-docs
    gate: { type: auto }
    after: [verify-bdd, verify-func]
```

`verify-bdd` and `verify-func` run in parallel after `review` completes. `docs` waits for both.

### Cycle Detection

The engine detects circular dependencies at validation time:

```yaml
# ❌ INVALID — circular dependency
phases:
  a:
    after: [b]
  b:
    after: [a]
```

## Presets

Presets are **convenience aliases** for common `--phases` combinations. They are NOT a core concept — the DAG is the source of truth.

```yaml
presets:
  simple:
    phases: [implement, test]
    defaults:
      coverage_threshold: 60
  complex:
    phases: [intake, arch, design, decompose, implement, test, review, verify-bdd, verify-func, docs]
    defaults:
      coverage_threshold: 80
```

CLI usage:

```bash
orchestrator run 0266 --preset simple
# Equivalent to:
orchestrator run 0266 --phases implement,test --coverage 60
```

Preset validation: the phase list must form a valid subgraph of the DAG (all dependencies satisfied or already completed).

## Extends

Inherit from another pipeline and override phases:

```yaml
# docs/.workflows/pipeline.yaml
schema_version: 1
name: my-project
extends: docs/.workflows/base-pipeline.yaml

phases:
  security-scan:          # Add new phase
    skill: rd3:code-review-common
    gate: { type: auto }
    after: [implement]
    payload:
      focus_areas: [security]
  test:                   # Override existing phase
    payload:
      coverage_threshold: 95
```

Resolution rules:
1. Child phases override parent phases with the same name (deep merge on `payload`)
2. Child presets override parent presets with the same name
3. Child hooks are appended to parent hooks
4. Max depth: 2 levels (base → project)

## Hooks

Inject behavior at FSM transition points:

```yaml
hooks:
  on-phase-start:
    - run: "echo 'Starting {{phase}} for task {{task_ref}}'"
  on-phase-complete:
    - run: "notify-slack '{{phase}} completed in {{duration}}'"
  on-phase-failure:
    - action: pause
      reason: "Phase {{phase}} failed — manual intervention needed"
  on-rework:
    - run: "echo 'Rework iteration {{iteration}} for {{phase}}'"
```

Template variables available in hooks:

| Variable | Description |
|----------|-------------|
| `{{phase}}` | Phase name |
| `{{task_ref}}` | Task reference |
| `{{run_id}}` | Run ID |
| `{{duration}}` | Phase duration |
| `{{iteration}}` | Rework iteration number |
| `{{error}}` | Error message (failure hooks only) |

## Validation Rules

| Rule | Check |
|------|-------|
| Schema version | Must be `1` |
| Extends depth | Max 2 levels, no circular inheritance |
| DAG cycles | `after:` edges must form a DAG |
| Phase names | Unique, alphanumeric + hyphens |
| Skill existence | Referenced skills must exist in `plugins/` |
| Preset subgraphs | Must form valid subgraph of DAG |
| Timeout format | Must be parseable duration string |
| Gate type | Must be `command`, `auto`, or `human` |
| Command gate | `command` type requires non-empty `command` string |
| Auto gate | `auto` type requires `checklist` (at least 1 item) unless skill provides defaults |
| Auto gate | `severity` must be `blocking` or `advisory` (default: `blocking`) |
| Auto/human gate | Must not have a `command` field |
| Human gate | Optional `prompt` field for pause description |
| Cross-type exclusivity | `checklist`, `prompt_template`, `severity` only valid for `auto`; `prompt` only valid for `human` |

## File Location

Default: `docs/.workflows/pipeline.yaml` in the project root.

Override with `--pipeline` flag:

```bash
orchestrator run 0266 --pipeline docs/.workflows/custom.yaml
```
