---
name: rd3 phase-worker refactor for coding testing and review
description: rd3 phase-worker refactor for coding testing and review
status: Done
created_at: 2026-03-29T23:34:29.740Z
updated_at: 2026-03-30T00:47:55.973Z
folder: docs/tasks2
type: task
profile: "complex"
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0284. rd3 phase-worker refactor for coding testing and review

### Background

Evaluate and refine the rd3 multi-agent architecture so heavy execution phases use dedicated machine-facing subagents while jon-snow and orchestration-dev remain the single top-level orchestration path. The immediate scope is to keep the system simple and reliable by focusing on phase workers for coding, testing, and reviewing instead of expanding pre-production agent layers first.


### Requirements

1. Keep `rd3:jon-snow` as the only top-level rd3 pipeline subagent. It remains a thin wrapper over `rd3:orchestration-dev` and must not absorb phase-specific execution logic.
2. Keep `rd3:orchestration-dev` as the single routing authority for rd3 workflow execution, phase ordering, profile handling, and gate management.
3. Introduce one new machine-facing subagent: `rd3:super-reviewer`.
4. Standardize the heavy execution phase workers as:
   - Phase 5: `rd3:super-coder`
   - Phase 6: `rd3:super-tester`
   - Phase 7: `rd3:super-reviewer`
5. Leave phases 1, 2, 3, 4, 8, and 9 on the current direct-to-skill path for now.
6. Treat `rd3:code-implement-common`, `rd3:sys-testing` / `rd3:advanced-testing`, and `rd3:code-review-common` as the canonical execution backbones. Subagents act as thin worker adapters over these skills rather than replacing them.
7. Define anti-recursion rules so phase-worker subagents invoked by orchestration do not route back to `rd3:orchestration-dev`.
8. Define a normalized worker contract for phases 5, 6, and 7 covering inputs, execution-channel handling, output envelope, evidence expectations, and failure reporting.
9. Preserve simplicity and token efficiency: only add wrapper logic where it reduces branching and repeated routing context for heavy phases.
10. Produce a phased refactor plan that can be implemented incrementally without breaking the current rd3 pipeline.


### Q&A



### Design

## Target Architecture

### Layer 1: Pipeline Entry
- `rd3:jon-snow` remains the single top-level machine-facing orchestrator wrapper.
- Responsibility: parse intent, map flags/profile/channel, delegate to `rd3:orchestration-dev`, report result.

### Layer 2: Routing Authority
- `rd3:orchestration-dev` remains the only rd3 component that owns:
  - profile-to-phase selection
  - phase ordering
  - human/auto gate handling
  - rework loops
  - execution-channel routing
  - phase executor selection

### Layer 3: Heavy Phase Workers
- Phase 5 executor: `rd3:super-coder`
- Phase 6 executor: `rd3:super-tester`
- Phase 7 executor: `rd3:super-reviewer`

These workers are adapters. They do not own pipeline orchestration.

### Layer 4: Canonical Skills
- Phase 5 backbone: `rd3:code-implement-common`, plus supporting `rd3:tdd-workflow`, `rd3:sys-debugging`, language planning skills as needed.
- Phase 6 backbone: `rd3:sys-testing`, optional `rd3:advanced-testing`, plus `rd3:sys-debugging` when failures occur.
- Phase 7 backbone: `rd3:code-review-common` as the canonical review engine.

## Phase Strategy
- Keep phases 1, 2, 3, 4, 8, 9 delegated directly from `rd3:orchestration-dev` to canonical skills.
- Only wrap phases 5, 6, and 7 because they are the heaviest phases in branching, token consumption, and failure/retry behavior.

## Anti-Recursion Rules
1. When invoked by `rd3:orchestration-dev`, `super-coder`, `super-tester`, and `super-reviewer` must operate in worker mode.
2. Worker mode must not call `rd3:orchestration-dev`.
3. Worker mode must not reinterpret phase ownership or profile selection.
4. Worker mode may delegate only to its canonical downstream skills.
5. `execution_channel` remains an orchestration concern; internal worker selection must not overload channel semantics.

## Normalized Worker Contract
Each heavy-phase worker should accept a normalized payload containing:
- `task_ref`
- `phase_context`
- `execution_channel`
- `constraints` / optional focus hints
- phase-specific thresholds or goals

Each worker should return:
- `status`
- `phase`
- `artifacts` and/or findings
- verification/evidence summary
- failed stage if applicable
- next-step recommendation


### Solution

Adopt a limited phase-worker refactor instead of a broad rd3 agent expansion.

The implementation strategy is:
1. Leave the current orchestration entry unchanged: `rd3:jon-snow` -> `rd3:orchestration-dev`.
2. Add only one new worker subagent, `rd3:super-reviewer`, to complete a minimal heavy-phase worker set.
3. Refactor `rd3:super-coder` and `rd3:super-tester` so they can run in explicit worker mode when invoked by orchestration.
4. Extend `rd3:orchestration-dev` with a phase-executor policy for phases 5, 6, and 7 without changing execution-channel semantics.
5. Keep direct skill delegation for all non-heavy phases until the reduced model proves stable.

This reduces routing duplication while avoiding a large pre-production redesign. It also improves reliability by centralizing orchestration policy in one place and keeping worker agents narrow.


### Plan

1. Audit the current rd3 agent contracts for jon-snow, super-coder, and super-tester, and document where routing drift or recursion risk exists.
2. Define the phase-worker contract for phases 5, 6, and 7, including input schema, output schema, and orchestration-only worker mode rules.
3. Create the new rd3 super-reviewer agent as a thin worker wrapper over code-review-common.
4. Refactor super-coder into two paths:
   - direct-entry mode for standalone machine use
   - worker mode for phase-5 execution under orchestration-dev
5. Refactor super-tester into two paths:
   - direct-entry mode for standalone machine use
   - worker mode for phase-6 execution under orchestration-dev
6. Extend orchestration-dev with a phase-executor registry or policy layer for phases 5, 6, and 7 while leaving other phases unchanged.
7. Update jon-snow only if needed to expose new orchestration flags or report worker selection; otherwise keep it unchanged.
8. Add tests for:
   - no recursion from worker agents back into orchestration-dev
   - stable phase selection for phases 5, 6, 7
   - unchanged execution path for phases 1, 2, 3, 4, 8, 9
9. Run rd3 verification for lint, typecheck, tests, and task contract validation.
10. Reassess after rollout whether pre-production worker agents are still necessary, based on actual token use and reliability data rather than assumption.


### Review

Reviewed after subtasks 0285-0288 landed.

Findings fixed in this follow-up:
- Orchestration pilot now routes heavy worker phases through declared phase executors instead of treating phases 5 and 7 as unsupported metadata only.
- Phase 6 delegated ACP prompts now carry worker-agent context for `rd3:super-tester` instead of bypassing the phase executor identity.
- `rd3:super-coder` and `rd3:super-tester` no longer expose `rd3:orchestration-dev` as a direct-entry route, preserving `rd3:jon-snow` as the top-level pipeline wrapper.
- User-facing phase tables in jon-snow and dev-run now match the worker-backed phase architecture.

Residual note:
- Current-channel pilot execution remains concrete for phase 6. Phases 5 and 7 now pause with explicit handoff evidence when no local worker runner exists, instead of failing as unsupported.


### Testing

Verification completed on 2026-03-29.

Commands executed:
- `bun test plugins/rd3/skills/orchestration-dev/tests/pilot.test.ts plugins/rd3/skills/orchestration-dev/tests/runtime.test.ts plugins/rd3/tests/phase-worker-docs.test.ts`
- `bun run typecheck`
- `bun run check`

Observed results:
- Targeted orchestration and phase-worker tests passed.
- Full typecheck passed.
- Full repository gate passed: lint, typecheck, and test all green.


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- Subtask `0285` — audit rd3 phase-worker contracts
- Subtask `0286` — create rd3 super-reviewer worker
- Subtask `0287` — refactor super-coder and super-tester worker mode
- Subtask `0288` — integrate phase workers into orchestration-dev

