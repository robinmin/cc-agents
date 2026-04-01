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
    gate:
      type: auto | human
      rework:
        max_iterations: number   # Default: 2
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

**Auto gate:** Phase completes when skill returns success. Gate checks run automatically.

```yaml
implement:
  skill: rd3:code-implement-common
  gate: { type: auto }
  timeout: 2h
```

**Human gate:** Pipeline pauses after phase completes, awaiting human approval.

```yaml
review:
  skill: rd3:code-review-common
  gate: { type: human }
  after: [test]
```

### Rework Configuration

When a phase fails, it can be automatically retried with failure feedback:

```yaml
test:
  skill: rd3:sys-testing
  gate:
    type: auto
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
| Gate type | Must be `auto` or `human` |

## File Location

Default: `docs/.workflows/pipeline.yaml` in the project root.

Override with `--pipeline` flag:

```bash
orchestrator run 0266 --pipeline docs/.workflows/custom.yaml
```
