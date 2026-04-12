---
name: Modify executePhaseWithRework() for subtask iteration
description: Update executePhaseWithRework() in runner.ts to detect subtasks and execute them sequentially updating status as each completes
status: Done
created_at: 2026-04-06T18:00:00.000Z
updated_at: 2026-04-06T18:00:00.000Z
folder: docs/tasks2
type: task
parent_wbs: "0342"
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0344. Modify executePhaseWithRework() for subtask iteration

### Background

The orchestrator's `executePhaseWithRework()` currently executes the entire implement phase on the parent task. Subtasks listed in the parent's Solution section are never executed — they remain orphaned in Backlog.

This task modifies `executePhaseWithRework()` to:
1. Detect if parent task has subtask files (via `getSubtasks()`)
2. If subtasks exist: iterate over each, run implement on the subtask file, update status
3. If no subtasks: fall back to current behavior (implement parent task)

### Requirements

- Modify `executePhaseWithRework()` in `runner.ts`
- For implement phase only, detect subtasks at start
- Iterate subtasks in WBS order, running implement on each
- Update each subtask status: WIP → Done as phase completes
- Update parent task status to Done only after all subtasks complete
- Preserve existing rework loop behavior within each subtask
- `bun run check` passes after changes

### Files to Modify

| File | Change |
|------|--------|
| `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts` | Add subtask detection and iteration logic |

### Implementation Strategy

1. Import `getSubtasks()` from utils
2. At start of `executePhaseWithRework()`, if phase is "implement":
   - Call `getSubtasks()` with taskRef to find subtask files
   - If subtasks found: iterate, call skill on each, update via `tasks update`
   - If no subtasks: fall back to current single-execution behavior
3. Extract WBS number from subtask filename for ordering
4. Use `tasks update <wbs> done` after each subtask completes

### Key Design Decisions

- **Subtask execution**: Each subtask gets its own skill invocation with full rework loop
- **Status propagation**: Subtasks go WIP → Done; parent goes Done only after all subtasks done
- **Error handling**: If a subtask fails, stop iteration and report failure
- **Fallback**: No subtasks = current behavior (implement parent directly)

### Verification

```bash
# Create test parent task with subtasks
# Run orchestrator on parent task
# Verify subtasks executed sequentially and status updated
bun run check
```
