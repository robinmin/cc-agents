---
name: integrate-phase-workers-into-orchestration-dev
description: integrate-phase-workers-into-orchestration-dev
status: Done
created_at: 2026-03-29T23:41:07.077Z
updated_at: 2026-03-30T00:24:10.442Z
folder: docs/tasks2
type: task
priority: "high"
estimated_hours: 5
dependencies: ["0286","0287"]
tags: ["rd3","orchestration","testing","phase-worker"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0288. integrate-phase-workers-into-orchestration-dev

### Background

Parent task 0284 is only complete once orchestration-dev can selectively use the heavy-phase workers without disturbing the rest of the rd3 pipeline. This task exists to add the minimal orchestration changes and verification coverage needed to adopt super-coder, super-tester, and super-reviewer for phases 5, 6, and 7 while preserving current direct-to-skill behavior elsewhere.


### Requirements

Extend orchestration-dev with a phase-executor policy or registry for phases 5, 6, and 7, add tests proving worker selection and anti-recursion behavior, and confirm phases 1, 2, 3, 4, 8, and 9 still follow the existing direct-to-skill path. Success means the reduced phase-worker model is wired into orchestration with stable tests and no regression in non-heavy phases.


### Q&A

No extra clarification was needed. The integration target was the reduced heavy-phase worker model defined in parent task `0284`.


### Design

Add the smallest possible orchestration policy layer for heavy phases.

Design choices:
- keep profile selection, phase order, and execution-channel semantics inside orchestration-dev
- attach executor metadata to phase definitions instead of replacing canonical skill names
- persist worker metadata into runtime state
- keep pilot execution narrow while verifying worker selection with tests


### Solution

Integrated phase-worker selection into orchestration-dev.

Changes made:
- added `executor`, `execution_mode`, and `worker_contract_version` to the phase model
- attached execution policy in `contracts.ts`
- persisted worker metadata into orchestration runtime state
- surfaced selected executor information in pilot phase evidence and unsupported-phase errors
- updated orchestration docs and reference maps so phases 5, 6, and 7 resolve to `super-coder`, `super-tester`, and `super-reviewer`

Phases 1, 2, 3, 4, 8, and 9 remain on the direct-to-skill path.


### Plan

1. Add a minimal phase-executor policy layer without changing profile or channel semantics.
2. Propagate that metadata through execution-plan generation and runtime persistence.
3. Update the pilot runner to report selected worker executors.
4. Verify heavy-phase worker selection and non-heavy direct-skill behavior with focused tests.


### Review

Confirmed the reduced phase-worker model is wired correctly:
- heavy phases 5, 6, 7 now select worker executors
- non-heavy phases still resolve directly to specialist skills
- phase-6 pilot execution remains functional
- unsupported pilot phases now report the selected executor explicitly

Residual risk:
- the pilot runtime still does not execute phases 5 and 7 end-to-end; this change intentionally stops at policy integration plus verification coverage.


### Testing

Verification completed:

- `bun run typecheck`
- `bun test plugins/rd3/skills/orchestration-dev/tests`
- `bun test plugins/rd3/tests/phase-worker-docs.test.ts`
- `bun run check`

Results:
- New plan and runtime assertions passed for heavy-phase worker selection.
- Existing orchestration tests continued to pass, including direct-skill paths for non-heavy phases.
- Full lint + typecheck + coverage test gate passed.


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- `plugins/rd3/skills/orchestration-dev/scripts/model.ts`
- `plugins/rd3/skills/orchestration-dev/scripts/contracts.ts`
- `plugins/rd3/skills/orchestration-dev/scripts/runtime.ts`
- `plugins/rd3/skills/orchestration-dev/scripts/pilot.ts`
- `plugins/rd3/skills/orchestration-dev/SKILL.md`
- `plugins/rd3/skills/orchestration-dev/references/delegation-map.md`
- `plugins/rd3/skills/orchestration-dev/references/phase-matrix.md`
- `plugins/rd3/skills/orchestration-dev/tests/plan.test.ts`
- `plugins/rd3/skills/orchestration-dev/tests/runtime.test.ts`

