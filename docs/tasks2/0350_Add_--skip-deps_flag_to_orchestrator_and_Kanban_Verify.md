---
name: Add --skip-deps flag to orchestrator and Kanban Verify
description: Add --skip-deps flag to orchestrator and Kanban Verify
status: Done
created_at: 2026-04-07T03:35:50.600Z
updated_at: 2026-04-07T03:48:50.711Z
folder: docs/tasks2
type: task
tags: ["orchestrator","kanban","cli"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0350. Add --skip-deps flag to orchestrator and Kanban Verify

### Background

Enable Kanban UI Verify button to work for manually-implemented tasks that have no orchestrator run history. The test phase requires implement phase, but manually-done tasks don't have this record.


### Requirements

1. Add --skip-deps flag to orchestrator CLI to bypass DAG dependency validation
2. Add checkbox in ChannelModal for skip-deps option
3. Support skip-deps for all action buttons (Refine, Plan, Run, Verify)


### Q&A

**Q: Why use verify-func instead of test for Verify button?**
A: verify-func runs functional review without requiring implement phase. test phase would still need implement.


### Design

- CLI: Add --skip-deps option to `orchestrator run`
- UI: Add checkbox in ChannelModal with description
- Backend: Pass skipDeps flag to orchestrator when checked


### Solution

**orchestrator-v2 changes:**
- `model.ts`: Added `skipDeps?: boolean` to RunOptions
- `cli/commands.ts`: Added `--skip-deps` flag parsing
- `engine/runner.ts`: Skip dependency validation when skipDeps is true
- `run.ts`: Pass skipDeps to runOptions, documented in help

**tasks server changes:**
- `routeHandlers.ts`: Accept skipDeps from API, add to orchestrator command
- `channel-modal.tsx`: Added checkbox for skip-deps option
- `task-detail.tsx`: Pass skipDeps to handleAction


### Plan

1. ✅ Add --skip-deps to CLI parser
2. ✅ Add --skip-deps to RunOptions
3. ✅ Update runner to skip validation
4. ✅ Add checkbox in ChannelModal
5. ✅ Update route handler to use skipDeps
6. ✅ Verify tests pass


### Review

Phase 7 Code Review: PASS
- `bun run check` passes (3773 tests, 0 failures)

Phase 8 Requirements Traceability: PASS
| Requirement | Status |
|-------------|--------|
| --skip-deps CLI flag | MET |
| ChannelModal checkbox | MET |
| All action buttons support | MET |


### Testing

```bash
# Without --skip-deps (fails)
orchestrator run 0338 --phases test --dry-run
# ERROR: Phase 'test' requires 'implement'...

# With --skip-deps (works)
orchestrator run 0338 --phases test --skip-deps --dry-run
# [dry-run] Pipeline valid. Would execute:
#   - test
```


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


