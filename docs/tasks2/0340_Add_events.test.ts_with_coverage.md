---
name: Add events.test.ts with coverage
description: Add events.test.ts with coverage
status: Backlog
created_at: 2026-04-06T06:57:47.439Z
updated_at: 2026-04-06T06:57:47.439Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0340. Add events.test.ts with coverage

### Background

Unit tests for events CLI command covering: happy path (task-ref lookup, run ID query, type/phase filtering), error cases (missing args, unknown event types, run not found), and JSON/text output formatting. Part of 0335 decomposition.


### Requirements

Test cases: 1) events by task-ref. 2) events by --run flag. 3) --type filter with valid types. 4) --type filter with invalid type (exit 10). 5) --phase filter. 6) --json output format. 7) Missing task-ref with no --run (exit 10). 8) nonexistent task (exit 12). 9) text output table format.


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


