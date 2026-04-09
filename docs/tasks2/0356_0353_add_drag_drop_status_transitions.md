---
name: Add Drag-and-Drop Status Transitions
description: Implement configurable status transition validation with toast notifications
status: Done
created_at: 2026-04-09T00:00:00.000Z
updated_at: 2026-04-09T20:10:00.000Z
folder: docs/tasks2
type: task
profile: simple
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
  commit: f4241974
---

## 0356. Add Drag-and-Drop Status Transitions

### Background

The Kanban board needs to restrict which status transitions are allowed during drag-and-drop. Currently, users can drag tasks between any columns, but the business logic requires controlled transitions (e.g., only Backlog→Todo is allowed initially). This subtask implements Feature 3 of the Kanban UI enhancement task (0353): implementing a configurable status transition matrix that validates drag operations and displays toast notifications for forbidden transitions.

### Requirements

1. Create `statusTransitions.json` config file with allowed transitions matrix
2. Default configuration: only Backlog→Todo transition is allowed; all other transitions are forbidden
3. On valid transition (Backlog→Todo): call backend API to update task status
4. On invalid/forbidden transition: display toast notification with message: "So far, we are not allow to move from `{source_status}` status to `{target_status}` status!"
5. Toast notification must be visible for at least 3 seconds with manual dismiss option
6. After toast, return the task card to its original position (visual feedback)
7. Transition matrix should be loadable from config file and overridable

### Codebase References

- **KanbanBoard**: `plugins/rd3/skills/tasks/scripts/server/ui/src/components/kanban-board.tsx` — Uses @hello-pangea/dnd for DragDropContext
- **API layer**: `plugins/rd3/skills/tasks/scripts/server/ui/src/lib/api.ts` — Backend API calls
- **Config pattern**: Look at existing config loading in the project
- **Toast pattern**: Implement as simple overlay component with CSS animation

### Plan

1. Create `statusTransitions.json` config file with allowed transitions
2. Create `useKanbanDragDrop.ts` hook for drag validation logic
3. Create `Toast.tsx` component for notifications
4. Integrate hook into KanbanBoard, modify handleDragEnd
5. Add API call for status update on valid transition
6. Add integration tests for transition validation
7. Add E2E test consideration for drag-drop scenarios

### Deliverables

- `plugins/rd3/skills/tasks/scripts/server/ui/config/statusTransitions.json` — New config file
- `plugins/rd3/skills/tasks/scripts/server/ui/src/hooks/useKanbanDragDrop.ts` — New hook
- `plugins/rd3/skills/tasks/scripts/server/ui/src/components/Toast.tsx` — New component
- Modified `kanban-board.tsx` — Integration with transition validation
- Modified `api.ts` — Add status update endpoint
- Tests for transition validation logic

### Dependencies

- Depends on understanding of existing DnD implementation in kanban-board.tsx
- Coordinate with backend team if API changes are needed for status updates

### Verification Notes

- Default transition matrix now allows only `Backlog -> Todo`.
- Valid drag delegates to the existing backend update path exactly once.
- Invalid drag shows the required toast message and keeps the card in its original column.
- Transition overrides remain supported through `customTransitions`.
