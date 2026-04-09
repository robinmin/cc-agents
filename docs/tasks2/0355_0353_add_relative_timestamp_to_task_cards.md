---
name: Add Relative Timestamp to Task Cards
description: Enhance Kanban task card layout to show WBS and relative timestamp on first line
status: Done
created_at: 2026-04-09T00:00:00.000Z
updated_at: 2026-04-09T01:50:00.000Z
folder: tasks2
type: task
profile: simple
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: pending
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
   - Location: `plugins/rd3/skills/tasks/scripts/server/ui/src/utils/formatRelativeTime.test.ts`
   - 21 test cases covering all scenarios
   - All tests pass: ✓

3. **Modified `kanban-board.tsx`**
   - Extracted task card into separate `TaskCard` component
   - Line 1: `[WBS]` (left) | `relative_timestamp` (right)
   - Line 2: task title (unchanged)
   - Auto-refresh every 60 seconds via `useEffect` + `setInterval`
   - Hover tooltip shows absolute datetime

### Verification

- TypeScript: ✓ Passes (`bun tsc --noEmit`)
- Tests: ✓ 32 pass (21 new + 11 existing)
- Format: ✓ Biome format applied
- Branch: `feat-0354-sorting-kanban-panels`

### Files Changed

| File | Change |
|------|--------|
| `src/utils/formatRelativeTime.ts` | New |
| `src/utils/formatRelativeTime.test.ts` | New |
| `src/components/kanban-board.tsx` | Modified |

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
