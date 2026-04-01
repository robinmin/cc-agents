# Agent Cooperation Guide

How AI agents interact with the orchestration-v2 engine to be good pipeline citizens.

## Core Principles

1. **Always check state before acting** — `orchestrator status <task>`
2. **Resume intelligently** — Inspect errors before resuming
3. **Customize via YAML** — Edit pipeline.yaml, always validate after changes
4. **Diagnose with inspect** — `orchestrator inspect <task> <phase> --evidence`
5. **Respect rework limits** — Don't manually retry beyond `max_iterations`
6. **Use dry-run for planning** — `orchestrator run <task> --dry-run`

## Reading Pipeline State

### Check if a task has an active run

```bash
orchestrator status <task>
```

Returns:
- Current FSM state (RUNNING, PAUSED, COMPLETED, FAILED)
- Per-phase status with durations
- Token usage and model info

### Get detailed phase info

```bash
orchestrator inspect <task> <phase>
```

Returns:
- Phase status, skill, executor
- Gate check results
- Resource usage (model, tokens, timing)
- Rework iteration count

### Get machine-readable state

```bash
orchestrator status <task> --json
orchestrator inspect <task> <phase> --json
```

## Resuming Pipelines

### Before resuming

Always inspect the failure first:

```bash
# See what went wrong
orchestrator inspect <task> <phase> --evidence

# Then decide: approve or reject
orchestrator resume <task> --approve
orchestrator resume <task> --reject
```

### After fixing an issue

If you've fixed the underlying code issue that caused a phase failure:

```bash
# 1. Verify your fix compiles
bun run check

# 2. Resume the pipeline
orchestrator resume <task>
```

### After external changes

If requirements changed or you want to take a different approach:

```bash
# 1. Undo the problematic phase
orchestrator undo <task> <phase>

# 2. Make your changes

# 3. Resume
orchestrator resume <task>
```

## Customizing Pipelines

### Per-project customization

Create `.rd3/pipeline.yaml` extending the base:

```yaml
schema_version: 1
name: my-project
extends: plugins/rd3/skills/orchestration-v2/references/examples/default.yaml

phases:
  test:
    payload:
      coverage_threshold: 95  # Higher coverage
```

### Always validate after edits

```bash
orchestrator validate .rd3/pipeline.yaml
```

## Error Recovery Patterns

### Phase Failed — Auto-rework

The engine automatically retries with feedback. Check progress:

```bash
orchestrator status <task>
# Look for "rework: 1/2" in the phase output
```

### Phase Failed — Rework Exhausted

```bash
# Inspect the error
orchestrator inspect <task> <phase> --evidence

# Option A: Fix and resume
# (fix the code)
orchestrator resume <task>

# Option B: Undo and re-run
orchestrator undo <task> <phase>
orchestrator run <task> --phases <phase-and-downstream>
```

### Human Gate — Approval Needed

```bash
# Review the evidence
orchestrator inspect <task> <phase> --evidence

# Approve (continue pipeline)
orchestrator resume <task> --approve

# Reject (fail the phase)
orchestrator resume <task> --reject
```

## Integration with Other Tools

### Before starting a pipeline

```bash
# Check if task exists
tasks show <task>

# Plan before executing
orchestrator run <task> --dry-run
```

### After pipeline completion

```bash
# Generate report for documentation
orchestrator report <task> --output docs/reports/<task>-report.md

# Check history for trends
orchestrator history --last 20
```

### In CI/CD

```bash
# Run with auto-approve
orchestrator run <task> --auto --preset standard

# Check result
orchestrator status <task> --json | jq '.status'
```

## Anti-Patterns to Avoid

| ❌ Don't | ✅ Do |
|----------|--------|
| Manually retry beyond `max_iterations` | Use `orchestrator undo` to reset |
| Edit state files directly | Use CLI commands only |
| Skip `orchestrator validate` after YAML changes | Always validate |
| Run multiple pipelines for the same task simultaneously | Check `orchestrator status` first |
| Ignore rework feedback | Inspect `--evidence` before deciding |
| Assume pipeline state | Always `orchestrator status` first |
