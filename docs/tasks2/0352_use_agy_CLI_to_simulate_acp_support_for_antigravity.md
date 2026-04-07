---
name: use agy CLI to simulate acp support for antigravity
description: use agy CLI to simulate acp support for antigravity
status: Backlog
created_at: 2026-04-07T18:02:55.379Z
updated_at: 2026-04-07T18:02:55.379Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0352. use agy CLI to simulate acp support for antigravity

### Background

According to the README.md in [openclaw/acpx](https://github.com/openclaw/acpx), we can see there is no support for Google Antigravity explicitely. 

Meanwhile, we also found that there is an official command line tool named as `agy` for Antigravity. Most of our case is task file based one shot request to these coding agent, so we can use `agy` to simulate acp support in our shared library in `plugins/rd3/scripts/libs/acpx-query.ts`. For some `agy` can not support feature, if any, we can resppnse for `Not support` or something like that.

With this inplementation, the downstream of `plugins/rd3/scripts/libs/acpx-query.ts` will not know the details of via `acpx` or `agy`. If needed, you can use `agy --help` to find out the details information of `agy`.


### Requirements



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


