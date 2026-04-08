---
name: Enhance Kanban UI
description: Enhance Kanban UI
status: Backlog
created_at: 2026-04-07T20:58:36.206Z
updated_at: 2026-04-07T20:58:36.206Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0353. Enhance Kanban UI

### Background

Here comes a batch of enhancement on the Kanban UI:

- Add Sorting function on each swiming panel inthe main kanban page, so that end user can change their order. By default, we need to show the list for each swiming panel in desending order.

- In the Kanban UI main page, we need to enhance the layout of each task. So far, we show task WBS at the first line, and show the task title in the second line. I need your help to add the most latest modification time stamp as the right part as the first line and treat the task wbs as the left part of the first line;

- Add task item's draggable feature in Kanban UI main page with call back function. Currently, we only allow to drag from `Backlog` to `Todo`. In case end user drag one task item from `Backlog` to `Todo`, we need to update its status as `Todo`. Otherwise, pop-up a messagebox to prevent user to do so. The message could be: So far, we are not allow to move from `xxxx` status to `yyyyy` status!

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
