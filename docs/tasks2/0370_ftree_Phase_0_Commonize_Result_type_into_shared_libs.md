---
name: ftree Phase 0: Commonize Result type into shared libs
description: ftree Phase 0: Commonize Result type into shared libs
status: Done
created_at: 2026-04-10T05:28:12.542Z
updated_at: 2026-04-10T05:28:12.542Z
folder: docs/tasks2
type: task
preset: "standard"
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0370. ftree Phase 0: Commonize Result type into shared libs

### Background

Phase 0 of ftree skill (task 0369). The Result type (Ok<T>/Err<E>) currently lives in plugins/rd3/skills/tasks/scripts/lib/result.ts but is imported cross-skill by orchestration-v1. Move it to plugins/rd3/scripts/libs/result.ts as a first-class shared utility, then update all existing imports in the tasks skill and orchestration-v1 to use the new path.


### Requirements

R11.2 from task 0369. Copy result.ts to plugins/rd3/scripts/libs/result.ts. Update all imports in tasks skill (commands/*.ts, tasks.ts, server/*.ts, tests/*.ts) and orchestration-v1/scripts/init.ts to import from the shared location. Delete the old file at tasks/scripts/lib/result.ts. Verify bun run check passes (lint + typecheck + test). Zero regressions — all existing tests must still pass.


### Q&A



### Design



### Solution

Copied `result.ts` to `plugins/rd3/scripts/libs/result.ts`. Updated 21 import statements across 20 files (11 commands, 2 lib files, 1 server, 1 orchestration-v1, 5 tests, 1 tasks.ts). Deleted original file at `plugins/rd3/skills/tasks/scripts/lib/result.ts`. All paths verified to resolve correctly.

### Plan

1. Copy `result.ts` → `plugins/rd3/scripts/libs/result.ts`
2. Update imports: commands (`../lib/result` → `../../../../scripts/libs/result`), scripts (`./lib/result` → `../../../scripts/libs/result`), tests (`../scripts/lib/result` → `../../../scripts/libs/result`), orchestration-v1 (`../../tasks/scripts/lib/result` → `../../../scripts/libs/result`)
3. Delete old file
4. Verify `bun run check` passes

### Review

All 4225 tests pass. Lint clean. Typecheck clean. Coverage on result.ts: 100% lines, 100% funcs.

### Testing

`bun run check` — lint + typecheck + 4225 tests, 0 failures.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References
- [task 0369](docs/tasks2/0369_Implement_feature-tree_ftree_skill.md)
