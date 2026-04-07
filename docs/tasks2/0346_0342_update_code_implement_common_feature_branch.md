---
name: Update code-implement-common to require feature branch
description: Add feature branch precondition to code-implement-common SKILL.md and git-worktree-workflow.md
status: Done
created_at: 2026-04-06T18:00:00.000Z
updated_at: 2026-04-06T18:00:00.000Z
folder: docs/tasks2
type: task
parent_wbs: "0342"
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0346. Update code-implement-common to require feature branch

### Background

The `code-implement-common` skill describes worktree-based git workflow in prose documentation, but doesn't enforce it. Agents can commit directly to `main` even when `--sandbox git-worktree` is specified.

This task adds explicit precondition checks that fail if:
1. Not on a feature branch
2. `main` branch is detected
3. No worktree is being used when `sandbox: git-worktree` is specified

### Requirements

- Add precondition check section to `code-implement-common/SKILL.md`
- Update `references/git-worktree-workflow.md` to mandate feature branch creation
- Precondition should fail with clear error message if on main branch
- Document the check in the skill's integration notes

### Files to Modify

| File | Change |
|------|--------|
| `plugins/rd3/skills/code-implement-common/SKILL.md` | Add feature branch precondition |
| `plugins/rd3/skills/code-implement-common/references/git-worktree-workflow.md` | Update workflow documentation |

### Implementation Strategy

1. Add to SKILL.md:
   ```markdown
   ## Preconditions
   
   ### Feature Branch Required
   
   Implementation MUST be performed on a feature branch, not `main`.
   
   **Check:** Fail if `git branch --show-current` returns `main` or empty.
   
   **Error:** "PRECONDITION FAILED: Must be on a feature branch (e.g., feat-0042-my-feature), not main"
   
   **Rationale:** Direct commits to main bypass PR review and violate the pipeline's review gate.
   ```
2. Update git-worktree-workflow.md to emphasize mandatory feature branch creation
3. Ensure precondition check runs before any implementation code

### Verification

```bash
# Checkout main
# Try to run implement phase
# Verify it fails with precondition error
```
