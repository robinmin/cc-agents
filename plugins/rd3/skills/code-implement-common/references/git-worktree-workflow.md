---
name: git-worktree-workflow
description: "Git worktree workflow for isolated implementation: setup, commands, branch naming, and recovery procedures"
see_also:
  - rd3:code-implement-common
  - rd3:tasks
---

# Git Worktree Workflow

Git worktree provides **isolated workspaces** for implementation without disrupting the main working directory.

## Why Worktree?

| Approach | Main Branch | Isolation | Risk |
|---------|-------------|-----------|------|
| Direct commit | Polluted | None | High |
| Stash + pop | Clean | None | Medium |
| Manual branch | Clean | Full | Low |
| **Worktree** | Clean | Full | **Lowest** |

## Step-by-Step Workflow

### Step 1: Create Worktree (mandatory)

```bash
git worktree add ../<branch-name> main
cd ../<branch-name>
```

### Step 2: Update Task Status

```bash
tasks update <wbs> wip
```

### Step 3: TDD Cycle (with fix-and-repeat)

```
RED: Write failing test
GREEN: Write minimal code
  - If test fails: FIX code, re-test
  - Repeat until all tests pass
REFACTOR: Clean code
  - If tests break: FIX and re-test
```

### Step 4: Update Task File (progress reporting)

- Update Implementation Notes section
- Document: completed steps, decisions, blockers
- This enables resume if process is interrupted

### Step 5: Commit & Push (mandatory)

```bash
git add . && git commit -m "..."
git push -u origin <branch-name>
```

### Step 6: Review (optional, default ON)

Delegate to `rd3:code-review-common` for security and correctness review

### Step 7: Cleanup (optional, default OFF)

```bash
cd ../<original-repo>
git worktree remove ../<branch-name>
# Use --cleanup flag for immediate cleanup
```

## Worktree Options

```bash
# Default: Create worktree, push, KEEP worktree (for parallel work)
implement task:docs/tasks/0047_my-task.md

# Explicit: Cleanup worktree after push (one-off implementation)
implement task:docs/tasks/0047_my-task.md --cleanup

# Explicit: Skip code review (parallel review batch)
implement task:docs/tasks/0047_my-task.md --no-review

# Use existing worktree if already present
implement task:docs/tasks/0047_my-task.md --reuse-worktree
```

## Worktree Commands

```bash
# Create worktree for new feature
git worktree add ../feat-user-auth main

# Create worktree from specific branch
git worktree add ../hotfix-147 main

# List existing worktrees
git worktree list

# Remove worktree (after merge)
git worktree remove ../feat-user-auth

# Prune stale worktree references
git worktree prune
```

## Branch Naming Convention

```
<type>-<task-id>-<short-description>

Examples:
feat-0047-user-auth
fix-0089-null-pointer
refactor-0112-api-client
```

## Broken Process Recovery

When a worktree process is interrupted or broken:

```bash
# Check worktree state
git worktree list

# Find uncommitted changes
git worktree list --porcelain

# Remove stale worktree
git worktree remove ../broken-worktree --force

# Clean up any leftover files
rm -r ../broken-worktree

# Resume from original repo
git checkout main
git worktree add ../new-worktree main
```
