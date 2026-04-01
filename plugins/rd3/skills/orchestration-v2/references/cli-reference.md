# CLI Reference — orchestrator

Full command reference for the `orchestrator` CLI.

## Global Options

| Flag | Description |
|------|-------------|
| `--help` | Show help for any command |
| `--version` | Show version |
| `--verbose` | Verbose output (debug logging) |
| `--quiet` | Suppress non-essential output |

---

## `orchestrator run <task-ref>`

Run a pipeline for a task.

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--preset` | string | none | Named preset from pipeline YAML |
| `--phases` | string | all | Comma-separated phase names; DAG resolves order. Overrides `--preset`. |
| `--pipeline` | path | `docs/.workflows/pipeline.yaml` | Path to pipeline definition file |
| `--auto` | boolean | false | Auto-approve all human gates |
| `--channel` | string | `current` | Execution channel for worker phases |
| `--dry-run` | boolean | false | Show execution plan without running |
| `--coverage` | number | from preset/phase | Override coverage threshold |

### Phase Selection Precedence

`--phases` > `--preset` > all phases in DAG.

When `--phases` is used, the DAG validates that the requested subset forms a valid subgraph (all dependencies satisfied or already completed).

### Examples

```bash
# Run all phases
orchestrator run 0266

# Run with preset
orchestrator run 0266 --preset complex

# Run specific phases
orchestrator run 0266 --phases implement,test

# Single phase directly
orchestrator run 0266 --phases test

# Custom pipeline
orchestrator run 0266 --pipeline docs/.workflows/custom.yaml

# Dry run (plan only)
orchestrator run 0266 --dry-run

# Auto-approve human gates
orchestrator run 0266 --auto

# Remote execution
orchestrator run 0266 --channel codex
```

### Exit Codes

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

### Interactive Output

```
▶ Pipeline: complex | Task: 0266
▶ Phases: intake → arch → design → decompose → implement → test → review → verify → docs

  [1/9] intake        ━━━━━━━━━━━━━━━━━━ 100%  ✅  2m 34s
  [5/9] implement     ━━━━━━━━━━━━░░░░░░  60%  🔄  12m 22s...
  [---] test          ░░░░░░░░░░░░░░░░░░   0%  ⏳

  Tokens: 78K in / 22K out | Model: claude-sonnet-4
  Elapsed: 25m 41s
```

---

## `orchestrator resume <task-ref>`

Resume a paused pipeline.

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--approve` | boolean | false | Approve pending human gate |
| `--reject` | boolean | false | Reject pending human gate |
| `--auto` | boolean | false | Continue with auto gates after resume |

### Examples

```bash
# Resume from paused state
orchestrator resume 0266

# Approve human gate and continue
orchestrator resume 0266 --approve

# Approve + auto mode
orchestrator resume 0266 --approve --auto
```

---

## `orchestrator status [<task-ref>]`

Show pipeline status.

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--run` | string | latest | Show specific run by ID |
| `--all` | boolean | false | Show all active runs |
| `--json` | boolean | false | JSON output |

### Examples

```bash
# Latest run for task
orchestrator status 0266

# Specific run
orchestrator status 0266 --run abc123

# All active runs
orchestrator status --all

# JSON output
orchestrator status 0266 --json
```

---

## `orchestrator report <task-ref>`

Generate detailed report.

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--format` | string | markdown | Output format: `markdown`, `json`, `summary` |
| `--output` | path | stdout | Write to file |

### Examples

```bash
# Markdown report
orchestrator report 0266

# JSON report
orchestrator report 0266 --format json

# Summary (one-line)
orchestrator report 0266 --format summary

# Write to file
orchestrator report 0266 --output report.md
```

### Summary Format

```
0266 | preset:complex | ✅ completed | 52m 14s | 184K/68K tokens | 9/9 phases | sonnet-4 + opus-4
```

---

## `orchestrator validate [<pipeline-file>]`

Validate a pipeline YAML file.

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--schema` | boolean | false | Show pipeline YAML schema |

### Examples

```bash
# Validate default pipeline
orchestrator validate

# Validate specific file
orchestrator validate my-pipeline.yaml

# Show schema
orchestrator validate --schema
```

### Output (valid)

```
✅ docs/.workflows/pipeline.yaml is valid
   9 phases defined, 1 extends resolved
   DAG has no cycles
   All skills found in plugins/
   Presets: simple (2 phases), standard (5), complex (9)
```

### Output (invalid)

```
❌ docs/.workflows/pipeline.yaml has 3 errors:

   Line 24: Phase "review" has circular dependency via "after: [test]"
   Line 31: Unknown skill "rd3:nonexistent-skill" in phase "security"
   Line 45: Preset "simple" references undefined phase "deploy"
```

---

## `orchestrator list`

List available pipelines.

### Output

```
┌──────────────────┬───────────┬──────────┬──────────┬──────────────┐
│ Pipeline         │ Location  │ Phases   │ Presets  │ Last Used    │
├──────────────────┼───────────┼──────────┼──────────┼──────────────┤
 docs/.workflows/     │ docs/.workflows/     │ 9        │ 4        │ 2 hours ago  │
│ quick-fix        │ docs/.workflows/     │ 2        │ 1        │ 5 days ago   │
│ rd3:base         │ built-in  │ 9        │ 4        │ —            │
└──────────────────┴───────────┴──────────┴──────────┴──────────────┘
```

---

## `orchestrator history`

Show run history.

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--last` | number | 10 | Number of runs to show |
| `--preset` | string | all | Filter by preset |
| `--since` | date | none | Filter since date |
| `--failed` | boolean | false | Only failed runs |
| `--json` | boolean | false | JSON output |

### Examples

```bash
# Last 10 runs
orchestrator history

# Last 50
orchestrator history --last 50

# Failed only
orchestrator history --failed

# Since date
orchestrator history --since 2026-03-01
```

---

## `orchestrator undo <task-ref> <phase>`

Rollback a phase.

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dry-run` | boolean | false | Preview without changes |
| `--force` | boolean | false | Force even with uncommitted changes |

### Examples

```bash
# Undo phase 5
orchestrator undo 0266 5

# Preview
orchestrator undo 0266 5 --dry-run

# Force
orchestrator undo 0266 5 --force
```

---

## `orchestrator inspect <task-ref> <phase>`

Show phase detail and evidence.

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--evidence` | boolean | false | Show gate evidence |
| `--json` | boolean | false | JSON output |

### Examples

```bash
# Phase detail
orchestrator inspect 0266 7

# With evidence
orchestrator inspect 0266 7 --evidence
```

---

## `orchestrator prune`

Compact event store.

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--older-than` | duration | none | Delete events older than duration (e.g., `30d`) |
| `--keep-last` | number | none | Keep only last N runs |
| `--dry-run` | boolean | false | Preview without changes |

### Examples

```bash
# Prune events older than 30 days
orchestrator prune --older-than 30d

# Keep last 100 runs
orchestrator prune --keep-last 100

# Preview
orchestrator prune --older-than 30d --dry-run
```

---

## `orchestrator migrate`

Migrate v1 JSON state to v2 SQLite.

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--from-v1` | boolean | false | Migrate from v1 state files |
| `--dry-run` | boolean | false | Preview without changes |

### Examples

```bash
# Migrate v1 state
orchestrator migrate --from-v1

# Preview migration
orchestrator migrate --from-v1 --dry-run
```
