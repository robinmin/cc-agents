---
name: Enhance Kanban UI
description: Enhance Kanban UI
status: Backlog
created_at: 2026-04-07T20:58:36.206Z
updated_at: 2026-04-08T05:15:00.000Z
folder: docs/tasks2
type: task
profile: simple
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

#### Feature 1: Sorting Function

1. Each swimlane panel in the Kanban main page must display a **dropdown control** in the panel header for sorting
2. The dropdown must allow sorting by: Task WBS (ascending/descending), Created date, Modified date
3. **Default sort order**: Descending by Task WBS number (highest WBS first)
4. Sort preference should be remembered per panel during the session

#### Feature 2: Layout Enhancement

5. Each task card must display the layout as: `[WBS]` (left-aligned, first line) | `relative timestamp` (right-aligned, first line)
6. Task title remains on the second line
7. The relative timestamp must show time in format: "X minutes/hours/days ago"
8. Timestamps must auto-update when visible without page refresh

#### Feature 3: Drag-and-Drop with Status Transitions

9. Implement a **configurable status transition matrix** (default: only Backlog→Todo allowed)
10. When a task is successfully dragged from Backlog to Todo, update its status to "Todo" in the backend
11. When a forbidden transition is attempted, display a **toast notification**: "So far, we are not allow to move from `{source_status}` status to `{target_status}` status!"
12. The transition matrix must be stored in a configuration file for easy modification

### Q&A

| # | Question | Answer |
|---|----------|--------|
| Q1 | Sort field | Descending by Task WBS number |
| Q2 | Sort UI | Dropdown in panel header |
| Q3 | Timestamp format | Relative time (e.g., "2 hours ago") |
| Q4 | Status transitions | Configurable transition matrix |
| Q5 | Error behavior | Toast notification |
| Q6 | Profile | simple |



### Design



### Solution



### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References
