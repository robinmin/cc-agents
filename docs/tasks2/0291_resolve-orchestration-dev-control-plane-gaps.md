---
name: resolve-orchestration-dev-control-plane-gaps
description: resolve-orchestration-dev-control-plane-gaps
status: Done
created_at: 2026-03-30T18:25:25.792Z
updated_at: 2026-03-30T18:49:56.629Z
folder: docs/tasks2
type: task
priority: "high"
dependencies: ["0290"]
tags: ["rd3","orchestration","follow-up","control-plane"]
profile: "standard"
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0291. resolve-orchestration-dev-control-plane-gaps

### Background

Comprehensive review of plugins/rd3/skills/orchestration-dev and related orchestration wrappers/worker agents found several remaining control-plane issues after 0290. Per product clarification, lack of ACP delegation for non-heavy phases is a design decision and is excluded from this follow-up. The remaining gaps are about execution semantics, worker dispatch guarantees, gate enforcement, exit signaling, and task-system synchronization/documentation alignment.


### Requirements

1. Fix dry-run semantics so --dry-run previews the plan without executing phases or persisting orchestration side effects.
2. Make worker execution binding deterministic: the runtime must not rely on an implicit acpx default agent for current-channel phase workers, and the effective worker identity must be explicit and auditable.
3. Implement or explicitly narrow gate semantics for phases outside CoV so human/auto gates and --auto behave consistently with documented behavior.
4. Return a non-zero process exit for failed or paused orchestration runs so wrappers and CI can detect failure reliably.
5. Either synchronize orchestration progress/results back into task management state or narrow the documentation so it no longer claims task CLI progress/section integration that does not exist today.
6. Record each issue with severity, affected files, and a concrete remediation approach so follow-up work can be tracked in severity order.


### Q&A



### Design

Minimal control-plane design used for this follow-up:

1. Separate plan generation from execution
- `createExecutionPlan()` remains the shared front door.
- `main()` must stop after plan emission in dry-run mode so runtime side effects only exist in execution mode.

2. Deterministic worker identity for local prompt-backed phases
- Local heavy-phase worker execution keeps using the acpx transport, but the effective prompt agent must be explicit rather than ambient.
- The resolved prompt agent is treated as runtime evidence and surfaced into phase output for later audit/debugging.

3. Lightweight non-CoV gate control
- Keep Phase 6 on the richer CoV-backed gate path.
- For phases whose metadata already declares `human` or `auto/human`, the runtime should pause after a successful phase unless `--auto` was requested.
- This is intentionally a minimal control-plane implementation; it does not attempt a full rework-loop engine outside CoV in this task.

4. Scriptable CLI contract
- A paused or failed orchestration run is a non-success process outcome and must return exit code 1.

5. Documentation truthfulness over aspirational wording
- Until task-file synchronization exists in runtime, docs should describe orchestration JSON state as the system of record for pipeline progress.


### Solution

Implemented the remaining orchestration-dev control-plane fixes tracked in this task:

1. Dry-run semantics
- `runtime.ts` now short-circuits after `createExecutionPlan()` when `--dry-run` is set, prints the plan JSON, and does not execute phases or persist orchestration state.

2. Deterministic worker dispatch
- `executors.ts` now requires an explicit prompt agent for local prompt-backed worker execution via `options.promptAgent`, `ORCHESTRATION_DEV_LOCAL_PROMPT_AGENT`, or `ACPX_AGENT`.
- The effective prompt agent is recorded in executor results and carried into pilot evidence/structured output for auditability.

3. Gate semantics
- `runOrchestration()` now pauses after successful phases whose gate is `human` or `auto/human` unless `auto_approve_human_gates` is enabled.
- This gives Phase 7 review runs the documented pause/resume behavior while keeping Phase 6 on the CoV-backed verifier path.

4. Exit signaling
- `main()` now exits with code 1 whenever orchestration finishes in `paused` or `failed` state, making wrappers and CI able to detect non-success outcomes reliably.

5. Documentation narrowing/alignment
- `dev-run.md`, `dev-review.md`, and `SKILL.md` now describe the real runtime contract: dry-run is plan-only, review on `current` pauses unless `--auto`, orchestration persists JSON state, and local prompt-backed worker runs require explicit prompt-agent configuration.


### Plan

1. Audit the orchestration CLI entry path (`run.ts` / `runtime.ts`) and separate plan-preview mode from execution mode.
2. Define the intended worker-dispatch contract for `current` vs ACP channels and make the effective worker identity explicit in code and evidence.
3. Review all declared gate types against runtime behavior and either implement missing control-plane logic or reduce the public contract.
4. Add process exit semantics for non-success orchestration outcomes.
5. Reconcile runtime behavior with task-management claims in the docs and wrappers.
6. Add focused tests for each corrected control-plane behavior.


### Review

Resolution summary for the scoped orchestration-dev control-plane findings:

- `P1` Dry-run semantics: fixed in `plugins/rd3/skills/orchestration-dev/scripts/runtime.ts`.
- `P1` Worker dispatch determinism: fixed in `plugins/rd3/skills/orchestration-dev/scripts/executors.ts` and surfaced in `plugins/rd3/skills/orchestration-dev/scripts/pilot.ts` evidence.
- `P1` Human-gate / `--auto` control-plane behavior: implemented in `plugins/rd3/skills/orchestration-dev/scripts/runtime.ts`.
- `P1` Fresh-run state contamination by stale state files: fixed in `plugins/rd3/skills/orchestration-dev/scripts/runtime.ts` by separating fresh execution from explicit resume.
- `P2` Invalid channel handling: fixed through channel validation/canonicalization in `plan.ts` and `runtime.ts`.
- `P2` Non-zero exit on paused/failed orchestration: fixed in `plugins/rd3/skills/orchestration-dev/scripts/runtime.ts`.
- `P2` Documentation drift: narrowed in `plugins/rd3/commands/dev-run.md` and `plugins/rd3/skills/orchestration-dev/SKILL.md` so the supported v1 pilot surface is described accurately.

No remaining open findings from the scoped 0291 control-plane list remain after these changes.


### Testing

- `bun test plugins/rd3/skills/orchestration-dev/tests/plan.test.ts plugins/rd3/skills/orchestration-dev/tests/runtime.test.ts plugins/rd3/skills/orchestration-dev/tests/executors.test.ts plugins/rd3/skills/orchestration-dev/tests/pilot.test.ts`
  Assertion result: 119 pass / 0 fail. The focused command still exits non-zero because workspace coverage thresholds apply to partial test runs.
- `bun run typecheck`
- `bun run check`
  Result: pass (lint + typecheck + full test suite).


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- `plugins/rd3/skills/orchestration-dev/scripts/runtime.ts`
- `plugins/rd3/skills/orchestration-dev/scripts/pilot.ts`
- `plugins/rd3/skills/orchestration-dev/scripts/executors.ts`
- `plugins/rd3/skills/orchestration-dev/scripts/plan.ts`
- `plugins/rd3/skills/orchestration-dev/scripts/contracts.ts`
- `plugins/rd3/skills/orchestration-dev/scripts/model.ts`
- `plugins/rd3/skills/orchestration-dev/tests/runtime.test.ts`
- `plugins/rd3/skills/orchestration-dev/tests/plan.test.ts`
- `plugins/rd3/skills/orchestration-dev/tests/executors.test.ts`
- `plugins/rd3/skills/orchestration-dev/tests/pilot.test.ts`
- `plugins/rd3/skills/orchestration-dev/SKILL.md`
- `plugins/rd3/commands/dev-run.md`
- `plugins/rd3/commands/dev-review.md`
- `plugins/rd3/commands/dev-unit.md`
- `plugins/rd3/commands/dev-plan.md`
- `plugins/rd3/commands/dev-refine.md`
- `plugins/rd3/agents/jon-snow.md`
- `plugins/rd3/agents/super-coder.md`
- `plugins/rd3/agents/super-reviewer.md`
- `plugins/rd3/agents/super-tester.md`
- `docs/tasks2/0291_resolve-orchestration-dev-control-plane-gaps.md`
- `plugins/rd3/skills/orchestration-dev/scripts/run.ts`
- `plugins/rd3/skills/orchestration-dev/scripts/verification-profiles.ts`

