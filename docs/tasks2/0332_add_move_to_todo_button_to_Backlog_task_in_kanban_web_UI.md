---
name: add move to todo button to Backlog task in kanban web UI
description: add move to todo button to Backlog task in kanban web UI
status: Done
profile: simple
created_at: 2026-04-06T00:06:48.802Z
updated_at: 2026-04-06T00:30:35.479Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: pending
  testing: pending
---

## 0332. add move to todo button to Backlog task in kanban web UI

### Background

This is **Phase 1 of a 2-phase automation infrastructure** for periodic task execution:

- **Phase 1 (this task)**: Add `Move to Todo` button to Backlog tasks. Users manually select tasks and move them to the Todo lane.
- **Phase 2 (future)**: Automate task refinement, decomposition, and periodic execution on Todo tasks.

**Business Logic**: Tasks in the Backlog lane are excluded from automatic execution. When users want a task to participate in the periodic execution pipeline, they move it to Todo via this button.

**User Flow**:
1. User opens task detail modal from Backlog lane
2. User clicks `Move to Todo` button
3. Modal closes
4. Task status changes to `Todo`
5. Kanban board refreshes to show task in Todo lane


### Requirements

1. **Button Placement**: Add `Move to Todo` button as the **first button** in the button group of the task detail pop-up modal.
2. **Visibility Condition**: Button **only visible** when task status is `Backlog`. Hidden for tasks in other statuses (Todo, In Progress, Done, etc.).
3. **Action on Click**:
   - Close the task detail pop-up modal immediately
   - Change task status from `Backlog` to `Todo` via existing task API
   - Trigger kanban board refresh to reflect the status change
4. **No Confirmation**: No confirmation dialog or visual feedback beyond modal close.
5. **API Integration**: Use **existing task status update API** — do not create new endpoints.
6. **Error Handling**: If status update fails, show user-friendly error and keep modal open.


### Constraints

- **No UI redesign**: This is a pure status-change operation; no visual enhancements beyond the button.
- **Read-only kanban during refresh**: Acceptable brief loading state during kanban refresh.
- **Single status transition**: Only Backlog → Todo. Other transitions (Todo → Done, etc.) are out of scope.
- **Existing API only**: Must use the task status update endpoint already in the codebase.



### Q&A

**Q: What's the business goal behind this feature?**
A: We need to split selective tasks into the Todo lane first. This is Phase 1 of the automatic task execution infrastructure. Phase 2 will trigger task refinement, decomposition, and periodic execution. Tasks remaining in Backlog will be excluded from automatic execution.

**Q: Should `Move to Todo` only appear for Backlog tasks?**
A: Yes, Backlog tasks only.

**Q: Should there be confirmation or visual feedback after clicking?**
A: No confirmation needed. No visual feedback other than modal close. Kanban refresh should be triggered.

**Q: Any UI changes beyond the button?**
A: No UI changes — just task status change.

**Q: Should new API endpoints be created?**
A: No. Must use existing task status update API.


### Design



### Solution

**Implementation Summary**:

1. **Modified `task-detail.tsx`**:
   - Added `onStatusChange` optional prop to `TaskDetailProps` interface for parent callback
   - Wrapped `handleStatusChange` in `useCallback` with `[wbs, onStatusChange]` dependencies
   - Added "Move to Todo" button to actions array - only visible when `task.status === 'Backlog'`
   - Button is inserted as the first button in the button group
   - On click: calls `handleStatusChange('Todo')`, then `onClose()` to close modal
   - Added error handling: if status update fails, error is caught and modal stays open

2. **Modified `App.tsx`**:
   - Destructured `refresh` from `useTasks()` hook
   - Passed `onStatusChange={refresh}` prop to `TaskDetail` component

3. **Built UI bundle** to `plugins/rd3/skills/tasks/scripts/static/`:
   - `index.html` - updated with new asset hashes
   - `assets/index-*.js` - bundled React application
   - `assets/index-*.css` - stylesheet

**Files Changed**:
- `plugins/rd3/skills/tasks/scripts/server/ui/src/components/task-detail.tsx`
- `plugins/rd3/skills/tasks/scripts/server/ui/src/App.tsx`
- `plugins/rd3/skills/tasks/scripts/static/index.html`
- `plugins/rd3/skills/tasks/scripts/static/assets/index-*.js`
- `plugins/rd3/skills/tasks/scripts/static/assets/index-*.css`


### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Implementation | `plugins/rd3/skills/tasks/scripts/server/ui/src/components/task-detail.tsx` | Lord Robb | 2026-04-06 |
| Implementation | `plugins/rd3/skills/tasks/scripts/server/ui/src/App.tsx` | Lord Robb | 2026-04-06 |
| UI Bundle | `plugins/rd3/skills/tasks/scripts/static/` | Lord Robb | 2026-04-06 |

### References


