---
name: error-handling
description: "Error handling reference for common implementation failures"
see_also:
  - rd3:code-implement-common
  - rd3:sys-debugging
---

# Error Handling

| Error | Response |
|-------|----------|
| Task file not found | Read from task file path |
| Worktree exists | Remove existing or use --reuse-worktree |
| Tests failing | Continue FIX → TEST cycle until pass |
| Push rejected | Fetch + merge or rebase |
| Review blocked | Fix critical P1 issues first |
| Process interrupted | Task file has progress, resume from last step |

## Detailed Responses

### Task file not found

Verify the task file path is correct. Task files should be in `docs/tasks/` with WBS prefix (e.g., `0047_my-task.md`).

### Worktree exists

Either remove the existing worktree:

```bash
git worktree remove ../existing-branch
```

Or reuse it:

```bash
implement task:docs/tasks/0047_my-task.md --reuse-worktree
```

### Tests failing

Continue the FIX → TEST cycle:

1. Read the test failure message
2. Fix the implementation code
3. Re-run tests
4. Repeat until all tests pass

### Push rejected

Fetch and merge or rebase:

```bash
git fetch origin
git rebase origin/main
git push --force-with-lease
```

### Review blocked

Address critical P1 issues first before requesting review.

### Process interrupted

The task file has progress saved. Read it and resume from the last unchecked item.
