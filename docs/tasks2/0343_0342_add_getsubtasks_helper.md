---
name: Add getSubtasks() helper utility
description: Add getSubtasks() helper utility to orchestration-v2/scripts/utils/ for detecting subtask files by parent WBS prefix
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

## 0343. Add getSubtasks() helper utility

### Background

The orchestrator needs to detect subtask files associated with a parent task to enable sequential subtask execution during the implement phase. Currently, the orchestrator has no mechanism to discover subtask files based on WBS prefix matching.

This task creates a reusable utility function that can be used by `executePhaseWithRework()` to discover and iterate over subtask files.

### Requirements

- Create `getSubtasks(parentWbs: string): string[]` function in `orchestration-v2/scripts/utils/`
- Function should scan `docs/tasks2/` directory for files matching pattern `{parentWbs}_*_*.md`
- Return sorted array of relative paths to subtask files
- Handle missing directory gracefully (return empty array)
- Include unit tests with ≥80% coverage
- `bun run check` passes after changes

### Files to Create

| File | Change |
|------|--------|
| `plugins/rd3/skills/orchestration-v2/scripts/utils/subtasks.ts` | New utility file |
| `plugins/rd3/skills/orchestration-v2/scripts/utils/subtasks.test.ts` | Unit tests |

### Implementation Strategy

1. Create `subtasks.ts` with `getSubtasks()` function
2. Use `glob` pattern from `scripts/utils/fs.ts` or `bun:fs`
3. Sort results by WBS number (extract number after parent prefix)
4. Export function via `utils/index.ts`
5. Write unit tests covering:
   - Normal case with subtasks
   - Empty directory (no subtasks)
   - Non-existent directory
   - Single subtask

### Verification

```bash
bun run check
# Expected: all tests pass, lint clean
```
