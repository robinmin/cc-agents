---
name: define orchestration phase contracts and gate prerequisites
description: define orchestration phase contracts and gate prerequisites
status: Done
created_at: 2026-03-28T18:20:42.708Z
updated_at: 2026-03-28T20:08:58.172Z
folder: docs/tasks2
type: task
priority: "high"
estimated_hours: 5
dependencies: ["0276","0278"]
tags: ["orchestration","phase-contracts","gates","planning"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0280. define orchestration phase contracts and gate prerequisites

### Background

Task 0275 identified that the current planner uses generic predecessor placeholders instead of the real phase contracts used by downstream skills. Before CoV-backed execution is wired in, orchestration needs explicit runtime contracts for phase inputs, outputs, and gate prerequisites such as Solution Gate and the standard-profile Phase 8 rule.


### Requirements

Define explicit runtime contracts for solution, source_paths, bdd_report, target_docs, and change_summary. Enforce Solution Gate before Phase 5. Reconcile standard-profile Phase 8 semantics so planner, docs, and runtime all agree. Update orchestration references and add tests covering prerequisite validation and contract generation.


### Q&A



### Design

Added explicit phase contracts in `plugins/rd3/skills/orchestration-dev/scripts/contracts.ts` and wired them into both the planner and runtime. The contract layer now encodes real upstream inputs, Solution Gate prerequisites before Phase 5, and the corrected standard-profile Phase 8 semantics.



### Solution

Introduce phase contract definitions in orchestration-dev that map each phase to required upstream evidence and gate checks. Use those contracts to replace generic predecessor assumptions in plan and runtime paths.


### Plan

1. Defined shared phase-input/output contracts and gate metadata.
2. Replaced generic predecessor placeholders in plan generation.
3. Enforced prerequisite validation in the runtime using the shared contracts.



### Review

Reviewed planner, runtime, and references together to remove contract drift. Standard-profile Phase 8 and Solution Gate expectations are now aligned across executable code and docs.



### Testing

Validated with `bun run typecheck` and `bun test plugins/rd3/skills/orchestration-dev/tests/plan.test.ts plugins/rd3/skills/orchestration-dev/tests/runtime.test.ts`.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


