---
name: audit-rd3-phase-worker-contracts
description: audit-rd3-phase-worker-contracts
status: Done
created_at: 2026-03-29T23:40:40.745Z
updated_at: 2026-03-30T00:24:10.112Z
folder: docs/tasks2
type: task
priority: "high"
estimated_hours: 3
tags: ["rd3","agents","contracts","orchestration"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0285. audit-rd3-phase-worker-contracts

### Background

Parent task 0284 needs a stable contract baseline before any agent refactor starts. This task exists to inspect jon-snow, orchestration-dev, super-coder, and super-tester, identify routing drift and recursion risk, and define the normalized worker-mode contract for phases 5, 6, and 7 so later implementation work is coherent.


### Requirements

Review the current rd3 agent and orchestration definitions, document where super-coder and super-tester diverge from the desired worker-only role, and produce a concrete phase-worker contract covering inputs, outputs, execution-channel semantics, anti-recursion rules, and evidence expectations. Success means downstream implementation tasks can reference one agreed contract instead of reinterpreting behavior ad hoc.


### Q&A

No extra clarification round was required. Scope, worker boundaries, and target architecture were inherited from parent task `0284`.


### Design

Document the heavy-phase worker baseline as a shared orchestration contract instead of leaving it split across agent prose.

Design choices:
- phases 5, 6, and 7 receive explicit worker-agent metadata
- canonical backbones remain skill-based
- anti-recursion rules are encoded once and reused
- runtime state persists the selected executor so later phases and tooling can inspect it


### Solution

Audited the current rd3 phase-execution surface and turned the target state into an explicit contract.

Implemented `rd3-phase-worker-v1` in `plugins/rd3/skills/orchestration-dev/scripts/contracts.ts` with:
- phase-to-worker mapping for phases 5, 6, and 7
- canonical backbones for implementation, testing, and review
- normalized worker inputs and outputs
- anti-recursion rules
- evidence and failure-reporting expectations

Aligned the orchestration phase model so the contract is machine-readable instead of being implied by agent prose alone.


### Plan

1. Encode the heavy-phase worker contract in orchestration-dev contracts and model types.
2. Surface executor metadata in generated phase definitions and persisted runtime state.
3. Use the same contract as the baseline for super-reviewer creation and super-coder/super-tester refactors.
4. Lock the behavior with orchestration plan/runtime tests.


### Review

Confirmed the main drift points before the refactor:
- `super-coder` and `super-tester` mixed standalone routing with orchestration-owned behavior.
- orchestration-dev had no normalized worker metadata for phases 5 to 7.
- anti-recursion behavior existed only as intent, not as a shared contract.

Residual risk:
- the pilot runtime still executes only the phase-6 verification workflow concretely; phases 5 and 7 are integrated at the contract/policy layer for now.


### Testing

Verification completed:

- `bun run typecheck`
- `bun test plugins/rd3/skills/orchestration-dev/tests`
- `bun run check`

Results:
- Typecheck passed.
- Orchestration plan/runtime/pilot/executor/init tests passed.
- Full lint + typecheck + coverage test gate passed.


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- Parent task `0284`
- `plugins/rd3/skills/orchestration-dev/scripts/contracts.ts`
- `plugins/rd3/skills/orchestration-dev/scripts/model.ts`
- `plugins/rd3/skills/orchestration-dev/tests/plan.test.ts`
- `plugins/rd3/skills/orchestration-dev/tests/runtime.test.ts`

