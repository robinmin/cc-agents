# Implementation Progress Tracking

Tasks track granular progress across implementation phases via the `impl_progress` frontmatter field. Sync is **bidirectional**.

## Frontmatter Structure

```yaml
---
impl_progress:
  planning: pending
  design: completed
  implementation: in_progress
  review: pending
  testing: pending
---
```

## Phase → Status (auto-compute)

When a phase is updated via `--phase`, the task status auto-advances (subject to validation):

```bash
# Update a specific phase
tasks update 47 --phase implementation in_progress
tasks update 47 --phase implementation completed
tasks update 47 --phase testing completed

# Status auto-computes:
# - Any blocked → Blocked
# - All completed → Done (if validation passes)
# - Any in_progress → WIP
# - Mixed completed/pending → WIP

# Auto-advance respects tiered validation:
tasks update 47 --phase testing completed         # Blocked if Design is placeholder
tasks update 47 --phase testing completed --force  # Bypass warnings
```

## Status → Phases (auto-sync)

When status is set directly, phases sync to match:

```bash
tasks update 47 done     # All phases → "completed"
tasks update 47 backlog  # All phases → "pending"
tasks update 47 wip      # No phase change (ambiguous)
```

## Phase Visibility

Phase progress is visible in:

- **`tasks check <WBS>`** — Shows phase breakdown: `[x]` completed, `[~]` in_progress, `[!]` blocked, `[ ]` pending
- **Kanban board** — WIP/Testing tasks show phase indicators inline after `tasks refresh`

## Phase Flow

```
planning → design → implementation → review → testing → done
```

Each phase can have status: pending, in_progress, completed, or blocked.
