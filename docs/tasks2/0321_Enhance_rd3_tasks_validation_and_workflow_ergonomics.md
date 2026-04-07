---
name: Enhance rd3 tasks validation and workflow ergonomics
description: Enhance rd3 tasks validation and workflow ergonomics
status: Done
created_at: 2026-04-04T05:58:47.289Z
updated_at: 2026-04-04T05:58:47.289Z
folder: docs/tasks2
type: task
priority: "high"
estimated_hours: 40
tags: ["tasks","security","api","workflow"]
profile: "complex"
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0321. Enhance rd3 tasks validation and workflow ergonomics

### Background

Recent review and fix work on rd3:tasks addressed concrete correctness and security bugs in task creation, opening, kanban refresh, and HTTP update flows. This follow-up task captures the next improvement batch so the module can be hardened systematically rather than through isolated bug fixes.


### Requirements

- Centralize input and path hardening used by create, put, update, and server handlers into shared helpers to reduce validation drift. Estimate: 0.5-1 day.
- Add schema-based validation for HTTP request bodies covering task creation, task updates, config updates, and batch create payloads. Estimate: 1-2 days.
- Add temp-file lifecycle cleanup for server-managed inline section updates and uploads so temp artifacts do not accumulate on success or failure paths. Estimate: 0.5 day.
- Introduce higher-level lifecycle operations that map to canonical bundles such as planning, design, implementation, review, and testing instead of relying only on low-level primitives. Estimate: 2-4 days.
- Tighten API semantics and error codes so callers can distinguish invalid input, missing tasks, validation failures, and server-side write failures. Estimate: 0.5-1 day.
- Add a dedicated security and contract regression suite covering traversal, shell metacharacters, host-path abuse, generated-file re-ingestion, and similar edge cases. Estimate: 0.5-1 day.
- Sequence the implementation in three batches: hardening plus cleanup plus status-code cleanup first, schema validation second, lifecycle operation layer third. Overall estimate: about 1 focused week.


### Q&A



### Design



### Solution

Implement the work as three incremental batches so existing CLI and server consumers stay stable while internals are improved. Start with shared validation helpers and cleanup paths, then layer request schemas, then add lifecycle-level commands and API affordances with regression tests at each step.


### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Fix | `plugins/rd3/skills/tasks/scripts/server/routeHandlers.ts` | Lord Robb | 2026-04-07 |
| Fix | `plugins/rd3/skills/tasks/scripts/commands/server.ts` | Lord Robb | 2026-04-07 |
| Test | `plugins/rd3/skills/tasks/tests/server/routeHandlers.test.ts` | Lord Robb | 2026-04-07 |

### References


