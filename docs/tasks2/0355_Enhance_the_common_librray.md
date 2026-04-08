---
name: Enhance the common librray
description: Enhance the common librray
status: Backlog
created_at: 2026-04-07T21:30:41.770Z
updated_at: 2026-04-07T21:30:41.770Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0355. Enhance the common librray

### Background
There are several existing or potential common library need to be enhanced or added.


### Requirements
- As we run some code in the web/api server instead of on terminal only now. We need to enable the common logger in `plugins/rd3/scripts/logger.ts` also support the file logger.
- Add the common library for file system access into `plugins/rd3/scripts/fs.ts`: Currently, there are several different ways to access the file sysme. Some of them go with `Bun.file` way, the others go with `node:fs` way. Especially, in some scripts, we already use both of them together. We need to define a common file system layer first then force all agent skill prior to use it.


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
