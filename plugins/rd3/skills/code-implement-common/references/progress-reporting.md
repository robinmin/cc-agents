---
name: progress-reporting
description: "Task file progress reporting for TDD cycle: what to update after each phase"
see_also:
  - rd3:code-implement-common
  - rd3:tasks
---

# Progress Reporting via Task File Update

After each major step, **update the input task file** to persist progress. This is critical for resume capability.

## What to Update

### After RED phase

```markdown
### Implementation Progress

- [x] RED: Write failing test for user authentication
  - Test: auth.test.ts - UserService.createUser
```

### After GREEN phase

```markdown
### Implementation Progress

- [x] RED: Write failing test for user authentication
- [x] GREEN: Implement UserService.createUser
  - Added UserService class with createUser method
  - Tests passing
```

### After REFACTOR phase

```markdown
### Implementation Progress

- [x] RED: Write failing test for user authentication
- [x] GREEN: Implement UserService.createUser
- [x] REFACTOR: Clean up UserService
  - Extracted validation to separate method
  - All tests still passing
```

## Why This Matters

If the process is interrupted (network issue, token exhaustion, crash):

- The updated task file shows exactly where we stopped
- Resume is straightforward — read the task file, pick up from last unchecked item
- No lost work, no guessing
