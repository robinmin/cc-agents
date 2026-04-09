---
name: Add Relative Timestamp to Task Cards
description: Enhance Kanban task card layout to show WBS and relative timestamp on first line
status: Done
created_at: 2026-04-09T00:00:00.000Z
updated_at: 2026-04-09T05:59:23.996Z
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

### Completed Deliverables

1. **Created `formatRelativeTime.ts` utility**
   - Location: `plugins/rd3/skills/tasks/scripts/server/ui/src/utils/formatRelativeTime.ts`
   - Handles: minutes, hours, days, weeks ago
   - Edge cases: future time → "just now", >30 days → absolute date
   - Auto-refresh capability via interval trigger

2. **Created unit tests**
   - Location: `plugins/rd3/skills/tasks/scripts/server/ui/src/utils/formatRelativeTime.vitest.ts`
   - 21 test cases covering all scenarios
   - All tests pass: ✓

3. **Modified `kanban-board.tsx`**
   - Extracted task card into separate `TaskCard` component
   - Line 1: `[WBS]` (left) | `relative_timestamp` (right)
   - Line 2: task title (unchanged)
   - Auto-refresh every 60 seconds via `useEffect` + `setInterval`
   - Hover tooltip shows absolute datetime

### Verification

- TypeScript: ✓
- Tests: ✓ relative timestamp coverage passes
- Backend payload: ✓ `/tasks` now returns `updated_at`, so the UI no longer renders `unknown`
- Format: ✓ Biome format applied

### Files Changed

| File | Change |
|------|--------|
| `src/utils/formatRelativeTime.ts` | New |
| `src/utils/formatRelativeTime.vitest.ts` | New |
| `src/components/kanban-board.tsx` | Modified |
| `plugins/rd3/skills/tasks/scripts/commands/list.ts` | Modified |

## 0355. Add Relative Timestamp to Task Cards

### Background

Users need better visibility of when tasks were last modified. Currently, task cards show WBS on line 1 and title on line 2. This subtask implements Feature 2 of the Kanban UI enhancement task (0353): enhancing the task card layout to show `[WBS]` on the left of line 1 and the relative timestamp on the right of line 1. The relative timestamp (e.g., "2 hours ago", "3 days ago") provides at-a-glance recency information without requiring exact datetime parsing.

### Requirements

1. Task card line 1 layout: `[WBS]` (left-aligned) | `relative_timestamp` (right-aligned)
2. Task card line 2: task title (unchanged)
3. Relative timestamp format: "X minutes ago", "X hours ago", "X days ago", "X weeks ago"
4. Timestamps auto-update every minute for visible cards (no page refresh required)
5. If modified time is in the future (edge case), display "just now"
6. If modified time is more than 30 days ago, display the absolute date

### Codebase References

- **Task card**: `plugins/rd3/skills/tasks/scripts/server/ui/src/components/kanban-board.tsx` — KanbanColumn component renders task cards
- **Types**: `plugins/rd3/skills/tasks/scripts/server/ui/src/types.ts` — TaskListItem with status, folder
- **Build pipeline**: Uses Vite + React + TypeScript

### Design

Relative timestamp formatting is isolated in `formatRelativeTime.ts` so the card renderer stays simple and the behavior can be covered with focused unit tests. The utility handles the required recency buckets plus the two edge cases from the task: future timestamps collapse to `just now`, and timestamps older than 30 days fall back to an absolute date.

The card layout stays within the existing two-line structure: line one becomes a flex row with WBS on the left and the relative timestamp on the right, while line two keeps the task title unchanged. A lightweight `setInterval` in `TaskCard` forces a re-render every 60 seconds so visible cards update without a page refresh.

The feature depends on the backend list response returning `updated_at`, so the task list payload and UI task type were extended to carry timestamp fields end to end.

### Solution

Implemented `formatRelativeTime.ts` and covered it with `formatRelativeTime.vitest.ts`, including the future-time and older-than-30-days behaviors.

Updated `kanban-board.tsx` to render each task card as `[WBS] | relative timestamp` on the first line and the title on the second line, with the timestamp tooltip showing the absolute datetime.

Added a one-minute refresh interval in `TaskCard` so visible relative timestamps continue to roll forward without requiring a reload.

Extended the `/tasks` list payload via `scripts/commands/list.ts` so the UI receives real `updated_at` values instead of rendering `unknown`.

### Plan

1. Create `formatRelativeTime.ts` utility function with auto-update capability
2. Modify task card rendering in `KanbanColumn` to use two-line layout
3. Add CSS for right-aligned timestamp with secondary text color
4. Implement interval refresh for visible timestamps (setInterval or requestAnimationFrame)
5. Add unit tests for formatRelativeTime with various time scenarios

### Deliverables

- `plugins/rd3/skills/tasks/scripts/server/ui/src/utils/formatRelativeTime.ts` — New utility
- Modified `kanban-board.tsx` — Updated task card layout with timestamps
- Tests for `formatRelativeTime.ts`

### Dependencies

- Requires TaskListItem to include `updated_at` timestamp — coordinate with 0354 if extending types
