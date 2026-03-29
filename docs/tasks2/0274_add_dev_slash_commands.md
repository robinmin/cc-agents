---
name: add dev slash commands
description: add dev slash commands
status: Done
created_at: 2026-03-28T03:37:19.578Z
updated_at: 2026-03-28T20:27:01.815Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0274. add dev slash commands

### Background
This task introduced the rd3 developer slash command family under `plugins/rd3/commands/` so common task execution, review, testing, documentation, and git-support workflows are available from a consistent `dev-*` surface.

The original request bundled two kinds of commands together:
- task-centric workflow shortcuts that belong on top of `rd3:orchestration-dev`
- standalone developer utilities such as git-message generation, changelog generation, and validation repair

The final implementation intentionally keeps those two groups separate. Task-centric commands delegate into orchestration or the relevant rd3 skill, while standalone utilities remain independent where orchestration would not improve reliability or ergonomics.


### Requirements

1. Add the rd3 developer slash command set under `plugins/rd3/commands/`.
2. Provide orchestration-backed shortcuts for refine, plan, run, unit, review, and docs workflows.
3. Keep git-message, changelog, and fix-all utilities available as standalone developer commands.
4. Make the wrappers thin and delegate workflow logic into the underlying rd3 skills.
5. Document argument hints, examples, and workflow behavior clearly enough for direct user invocation.
6. Keep the command surface aligned with the final orchestration contract, including task-scoped review, canonical-doc refresh behavior, and channel-aware wrapper execution where supported.



### Q&A



### Design

Use a mixed command-family design:
- orchestration-backed wrappers for task-centric development phases
- standalone utility commands for git metadata and validation-repair workflows

This keeps the wrappers thin, avoids forcing unrelated utilities through orchestration, and matches the project architecture rule that skills own the real workflow logic.



### Solution

Implemented the rd3 `dev-*` command surface as a mixed command family rather than forcing every command through orchestration.

Delivered orchestration-backed wrappers:
- `dev-refine`
- `dev-plan`
- `dev-run`
- `dev-unit`
- `dev-review`
- `dev-docs`

Delivered standalone utilities:
- `dev-gitmsg`
- `dev-changelog`
- `dev-fixall`

Final implemented behavior differs from the initial task wording in a few places, and the task record now reflects the codebase reality:
- `dev-review` is task-scoped and delegates to the review phase for a task reference, not arbitrary whole-project or free-form path review.
- `dev-docs` refreshes the canonical cumulative docs set rather than generating API/JSDoc-style artifacts.
- Channel-aware execution is exposed on the orchestration-backed wrappers, with `current` as the default and orchestration owning downstream routing.
- Standalone utilities remain outside the orchestration pipeline by design.



### Plan

1. Added the `dev-*` command files under `plugins/rd3/commands/` for the targeted developer workflows.
2. Wired orchestration-backed shortcuts to `rd3:orchestration-dev` using profile-based delegation.
3. Evolved the wrapper contract so channel selection is passed into orchestration instead of pre-wrapping the whole workflow with ACP.
4. Tightened command docs to align with the current orchestration and documentation models.
5. Kept git-message, changelog, and fix-all flows as standalone utilities where orchestration would add no value.



### Review

Reviewed against the current codebase rather than the original draft wording. No remaining implementation gap blocks closure of this task.

Key scope decisions now reflected by the task record:
- orchestration-backed wrappers are the task-centric developer commands
- standalone utilities stay outside orchestration
- `dev-review` is task-scoped
- `dev-docs` follows the canonical cumulative-doc refresh model
- channel routing is owned by orchestration for the wrappers that support it



### Testing

Validated against the current repository gate with `bun run check`.

Spot verification also confirmed that all target command files exist under `plugins/rd3/commands/` and that the orchestration-backed wrappers document the current channel contract and profile shortcuts.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References
