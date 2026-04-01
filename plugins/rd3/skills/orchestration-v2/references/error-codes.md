# Error Codes — orchestrator

Error taxonomy with recovery strategies for orchestration-v2.

## Exit Codes

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

## Error Categories

### Config Errors

Errors in pipeline YAML or CLI arguments. Fix the config and re-run.

| Code | Severity | Exit Code | Recovery |
|------|----------|-----------|----------|
| `PIPELINE_NOT_FOUND` | error | 11 | Create pipeline.yaml or specify `--pipeline` |
| `TASK_NOT_FOUND` | error | 12 | Check task reference |
| `PRESET_NOT_FOUND` | error | 10 | Check preset name in pipeline.yaml |
| `PHASE_NOT_FOUND` | error | 10 | Check phase name |
| `PIPELINE_VALIDATION_FAILED` | error | 11 | Fix validation errors, run `orchestrator validate` |
| `DAG_CYCLE_DETECTED` | error | 11 | Remove circular `after:` dependencies |
| `EXTENDS_CIRCULAR` | error | 11 | Fix extends chain |
| `EXTENDS_DEPTH_EXCEEDED` | error | 11 | Reduce extends nesting to max 2 levels |

### State Errors

Errors with the SQLite database.

| Code | Severity | Exit Code | Recovery |
|------|----------|-----------|----------|
| `STATE_CORRUPT` | critical | 13 | Delete `.rdinstate/orchestrator.db` and re-run |
| `STATE_LOCKED` | warning | 13 | Wait for lock release or kill stale process |
| `STATE_MIGRATION_NEEDED` | warning | 13 | Run `orchestrator migrate --from-v1` |
| `UNDO_UNCOMMITTED_CHANGES` | warning | 1 | Use `--force` or commit/stash changes first |

### Execution Errors

Errors during phase execution.

| Code | Severity | Exit Code | Recovery |
|------|----------|-----------|----------|
| `EXECUTOR_UNAVAILABLE` | error | 20 | Check channel config, install acpx |
| `EXECUTOR_TIMEOUT` | error | 1 | Increase timeout in pipeline.yaml |
| `EXECUTOR_FAILED` | error | 1 | Check executor stderr: `orchestrator inspect <task> <phase>` |
| `CHANNEL_UNAVAILABLE` | error | 20 | Check channel name, verify acpx agent list |
| `CONTRACT_VIOLATION` | error | 1 | Worker output didn't match expected schema |

### Verification Errors

Errors during gate checks.

| Code | Severity | Exit Code | Recovery |
|------|----------|-----------|----------|
| `GATE_FAILED` | warning | 1 | Inspect evidence: `orchestrator inspect <task> <phase> --evidence` |
| `GATE_PENDING` | info | 2 | Resume with `orchestrator resume --approve` |
| `REWORK_EXHAUSTED` | warning | 1 | Max rework iterations reached, escalated |

## Diagnostic Commands

```bash
# View phase details and error
orchestrator inspect <task> <phase>

# View gate evidence
orchestrator inspect <task> <phase> --evidence

# View full status
orchestrator status <task>

# Generate report
orchestrator report <task> --format json

# Validate pipeline config
orchestrator validate
```

## Common Recovery Patterns

### Pipeline Failed at Phase X

1. Check the error: `orchestrator inspect <task> <phase> --evidence`
2. Fix the underlying issue
3. Resume: `orchestrator resume <task>`
4. Or undo the phase: `orchestrator undo <task> <phase>`

### Pipeline Paused at Human Gate

1. Review: `orchestrator inspect <task> <phase> --evidence`
2. Approve: `orchestrator resume <task> --approve`
3. Or reject: `orchestrator resume <task> --reject`

### State Corruption

1. Backup: `cp .rdinstate/orchestrator.db .rdinstate/orchestrator.db.bak`
2. Reset: `rm .rdinstate/orchestrator.db`
3. Re-run: `orchestrator run <task>`

### Executor Unavailable

1. Check channel: `orchestrator status --json`
2. Verify acpx: `acpx --version`
3. Check agent list: `acpx list`
4. Try local: `orchestrator run <task> --channel current`
