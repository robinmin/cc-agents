---
name: ftree Phase 0: Commonize Result type into shared libs
description: ftree Phase 0: Commonize Result type into shared libs
status: Backlog
created_at: 2026-04-10T05:28:12.542Z
updated_at: 2026-04-10T05:28:12.542Z
folder: docs/tasks2
type: task
preset: "standard"
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0370. ftree Phase 0: Commonize Result type into shared libs

### Background

Phase 0 of ftree skill (task 0369). The Result type (Ok<T>/Err<E>) currently lives in plugins/rd3/skills/tasks/scripts/lib/result.ts but is imported cross-skill by orchestration-v1. Move it to plugins/rd3/scripts/libs/result.ts as a first-class shared utility, then update all existing imports in the tasks skill and orchestration-v1 to use the new path.


### Requirements

R11.2 from task 0369. Copy result.ts to plugins/rd3/scripts/libs/result.ts. Update all imports in tasks skill (commands/*.ts, tasks.ts, server/*.ts, tests/*.ts) and orchestration-v1/scripts/init.ts to import from the shared location. Delete the old file at tasks/scripts/lib/result.ts. Verify bun run check passes (lint + typecheck + test). Zero regressions — all existing tests must still pass.


### Q&A



### Design



### Solution



### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


