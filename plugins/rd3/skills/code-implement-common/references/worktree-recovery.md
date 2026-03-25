---
name: worktree-recovery
description: "Git worktree failure recovery procedures for interrupted processes and broken states"
see_also:
  - rd3:code-implement-common
  - rd3:sys-debugging
---

# Worktree Recovery Procedures

Recovery guide for git worktree failures and interrupted processes.

## Common Failure Scenarios

### Scenario 1: Interrupted Process

**Symptom:** Process killed mid-implementation, worktree in inconsistent state

**Recovery Steps:**

```bash
# 1. Check current worktree state
git worktree list

# 2. Check for uncommitted changes
git worktree list --porcelain

# 3. If uncommitted changes exist, commit or stash
cd ../feat-branch
git add .
git stash  # or git commit -m "WIP: interrupted work"

# 4. Return to main repo
cd ../original-repo

# 5. Verify state
git status
```

### Scenario 2: Worktree Directory Deleted Manually

**Symptom:** Worktree reference remains but directory gone

**Recovery Steps:**

```bash
# 1. List worktrees (shows problematic state)
git worktree list

# 2. Prune stale references
git worktree prune

# 3. Verify cleanup
git worktree list

# 4. Create fresh worktree if needed
git worktree add ../new-branch main
```

### Scenario 3: Push Rejected (Diverged Branch)

**Symptom:** `git push` rejected due to divergent history

**Recovery Options:**

```bash
# Option A: Rebase (preferred for linear history)
cd ../feat-branch
git fetch origin
git rebase origin/main
git push --force-with-lease

# Option B: Merge (preserves history)
cd ../feat-branch
git fetch origin
git merge origin/main
# Resolve any conflicts
git push

# Option C: Force push (last resort)
git push --force-with-lease
```

### Scenario 4: Lost Commits (After Reset)

**Symptom:** Accidentally reset branch, commits appear lost

**Recovery Steps:**

```bash
# 1. Find lost commits
git reflog

# 2. Identify commit to recover
git reflog | grep "feat-branch"

# Output example:
# a1b2c3d HEAD@{10}: commit: WIP implementation
# e4f5g6h HEAD@{11}: commit: Initial feature

# 3. Recover commit
git checkout feat-branch
git reset --hard a1b2c3d

# 4. Verify
git log --oneline -5
```

### Scenario 5: Worktree Lock File Stale

**Symptom:** `git worktree add` fails with "directory is already locked"

**Recovery Steps:**

```bash
# 1. Check for lock files
ls -la .git/worktrees/

# 2. Remove stale lock
rm .git/worktrees/<worktree-name>/lock

# 3. Retry operation
git worktree add ../new-branch main
```

### Scenario 6: Branch Deleted Remotely

**Symptom:** Local branch exists, remote branch deleted

**Recovery Steps:**

```bash
# 1. Verify remote state
git fetch origin
git branch -r

# 2. Push local branch
git push origin feat-branch

# Or delete local if no longer needed
git worktree remove ../feat-branch
git branch -d feat-branch
```

## Process Recovery Checklist

When recovering from a broken worktree process:

```
□ Identify current state
  └─ git worktree list
  └─ git status

□ Check for uncommitted changes
  └─ git stash list
  └─ git diff

□ Recover or discard changes
  └─ git stash pop (recover)
  └─ git stash drop (discard)

□ Clean worktree state
  └─ git worktree prune
  └─ git worktree remove ../broken-branch --force

□ Verify clean state
  └─ git worktree list
  └─ git status
```

## Prevention Strategies

### Pre-Implementation Checklist

Before starting work:

```bash
# ✓ Verify main branch is clean
git status
git pull origin main

# ✓ Verify no existing worktree for same branch
git worktree list

# ✓ Confirm push access
git push --dry-run origin main
```

### During Implementation

```bash
# ✓ Commit frequently (small commits)
git add . && git commit -m "WIP: specific change"

# ✓ Push before long breaks
git push origin feat-branch
```

### Post-Implementation

```bash
# ✓ Merge or delete worktree before starting new work
git worktree remove ../completed-branch

# ✓ Verify no leftover worktrees
git worktree list
```

## Emergency Recovery Commands

```bash
# Emergency: Save all changes and clean up
git add . && git stash && git worktree prune

# Emergency: Force remove all worktrees
for wt in $(git worktree list --porcelain | grep '^worktree ' | awk '{print $2}'); do
  git worktree remove "$wt" --force 2>/dev/null
done

# Emergency: Reset to known good state
git fetch origin
git reset --hard origin/main
git clean -fd
```

## State Verification

After any recovery operation, verify:

```bash
# 1. Worktree list is clean
git worktree list

# 2. No uncommitted changes in main
git status

# 3. Remote is accessible
git fetch origin

# 4. Branch is in expected state
git log --oneline -3
```
