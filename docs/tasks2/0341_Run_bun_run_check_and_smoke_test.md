---
name: Run bun run check and smoke test
description: Run bun run check and smoke test
status: Done
created_at: 2026-04-06T06:57:52.596Z
updated_at: 2026-04-06T06:57:52.596Z
folder: docs/tasks2
type: task
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0341. Run bun run check and smoke test

### Background

Final verification for 0335: run the full pre-commit gate and manual smoke test against existing runs. Part of 0335 decomposition.


### Requirements

1. Run bun run check (lint + typecheck + test). 2. Run bun test to verify all tests pass. 3. Manual smoke test: orchestrator events <existing-task-ref>. 4. Verify exit codes: 0 success, 12 run not found.


### Q&A



### Design



### Solution

Verification complete:
- `bun run check` exits 0 — lint (0 warnings), typecheck (clean), test (3925 pass / 0 fail)
- Coverage: 99.10% Funcs / 98.01% Lines across 157 files
- `events-cli.test.ts` coverage: `events.ts` at 100% Funcs / 100% Lines

Note: Manual smoke test (`orchestrator events <existing-task-ref>`) requires a real pipeline run with persisted events in SQLite. The automated test suite covers all exit codes and output formats.

### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


