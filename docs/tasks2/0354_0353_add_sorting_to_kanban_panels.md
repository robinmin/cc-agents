---
name: Add Sorting to Kanban Panels
description: Add sorting dropdown to each Kanban panel header with multiple sort options
status: Done
created_at: 2026-04-09T00:00:00.000Z
updated_at: 2026-04-09T05:49:37.843Z
folder: docs/tasks2
type: task
profile: simple
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## Implementation Notes

All requirements implemented:
- ✅ `SortDropdown.tsx` - Dropdown component with 6 sort options
- ✅ `kanban-board.tsx` - Integration with per-column state management
- ✅ Task list payload and UI types include `created_at` / `updated_at`
- ✅ `taskSort.ts` - Shared WBS/date sorting logic with segment-wise WBS comparison
- ✅ `kanban-sort.vitest.ts` - Regression coverage for sort scenarios, including `0001.0100` vs `0002`
- ✅ Default sort: WBS Descending (highest first)
- ✅ Sort persists per panel during session

**Files changed:**
- `plugins/rd3/skills/tasks/scripts/server/ui/src/components/SortDropdown.tsx` (new)
- `plugins/rd3/skills/tasks/scripts/server/ui/src/components/kanban-board.tsx` (modified)
- `plugins/rd3/skills/tasks/scripts/server/ui/src/utils/taskSort.ts` (new)
- `plugins/rd3/skills/tasks/scripts/server/ui/src/components/kanban-sort.vitest.ts` (new)
- `plugins/rd3/skills/tasks/scripts/server/ui/src/types.ts` (modified)
- `plugins/rd3/skills/tasks/scripts/commands/list.ts` (modified)

**Test results:** sorting coverage passing in Vitest; backend list payload verification passing in Bun tests

## 0354. Add Sorting to Kanban Panels

### Background

Users need to sort tasks within each Kanban swimlane panel. The current implementation shows tasks in the order they were created, but users want to reorder them by different criteria. This subtask implements Feature 1 of the Kanban UI enhancement task (0353): adding a sorting dropdown to each panel header with support for WBS, created date, and modified date sorting in both ascending and descending order. Default sort is descending by WBS number (highest first).

### Requirements

1. Each Kanban panel header must display a dropdown control for sorting
2. Dropdown options: WBS Ascending, WBS Descending (default), Created Date Ascending, Created Date Descending, Modified Date Ascending, Modified Date Descending
3. Sort preference persists per panel during the session (using React state/context)
4. Sort is applied to the task list in real-time when selection changes
5. Component must be reusable across all 7 Kanban columns (Backlog, Todo, WIP, Testing, Blocked, Done, Canceled)

### Codebase References

- **Main component**: `plugins/rd3/skills/tasks/scripts/server/ui/src/components/kanban-board.tsx` — Existing KanbanBoard and KanbanColumn components
- **Types**: `plugins/rd3/skills/tasks/scripts/server/ui/src/types.ts` — TaskListItem, TaskStatus types
- **UI library**: Uses Tailwind CSS with CSS custom properties for theming

### Design

The feature keeps sort preference in `KanbanBoard` state keyed by `TaskStatus`, so each swimlane remembers its own active sort option during the session without affecting any other column.

Sorting logic is centralized in `src/utils/taskSort.ts` instead of living inline in the component. That keeps runtime behavior and tests aligned and fixes WBS ordering by comparing dotted segments numerically rather than collapsing them into a lossy decimal value.

Created and modified date sorting depends on timestamp data being present in the `/tasks` list response, so the task list payload and UI types were extended to carry `created_at` and `updated_at` end to end.

### Solution

Implemented `SortDropdown.tsx` and mounted it in every Kanban column header through `kanban-board.tsx`.

Added per-column sort state with the default set to `wbs-desc`, matching the parent requirement to show the highest WBS first on initial render.

Extracted sorting into `src/utils/taskSort.ts` and added regression coverage in `kanban-sort.vitest.ts`, including the `0001.0100` versus `0002` ordering case that would fail with the old base-100 approach.

Extended the backend list payload in `scripts/commands/list.ts` plus the UI task type so created-date and modified-date sorting operate on actual server data.

### Plan

1. Create `SortDropdown.tsx` component with dropdown UI
2. Integrate SortDropdown into `KanbanColumn` component header
3. Add sort state management (useState per column)
4. Implement sort logic for each criteria type
5. Update TaskListItem interface to include `created_at` and `updated_at` fields
6. Add unit tests for sort logic

### Deliverables

- `plugins/rd3/skills/tasks/scripts/server/ui/src/components/SortDropdown.tsx` — New component
- Modified `kanban-board.tsx` — SortDropdown integration
- Modified `types.ts` — Extended TaskListItem with timestamps
- Tests in `kanban-board.test.ts` or `sort-dropdown.test.tsx`
