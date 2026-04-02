---
name: Pass_coverage_flag_to_phase_execution_payloads
description: Pass_coverage_flag_to_phase_execution_payloads
status: Done
created_at: 2026-04-02T01:04:24.142Z
updated_at: 2026-04-02T04:18:31.366Z
folder: docs/tasks2
type: task
priority: "low"
tags: ["rd3","orchestration","v2","coverage","cli"]
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0314. Pass_coverage_flag_to_phase_execution_payloads

### Background

The `--coverage` CLI flag is parsed and stored in RunOptions, but `getRequestedPhases()` and `executePhaseWithRework()` never inject the coverage value into the phase execution payload. Blueprint ss3.2 specifies that the `--coverage` flag overrides the coverage threshold from both preset defaults and phase-level defaults. Without this injection, the `--coverage` flag has no effect on actual test execution despite being accepted by the CLI.

### Requirements

1. In `executePhaseWithRework()`, when `RunOptions.coverage` is set (non-undefined), merge `{ coverage_threshold: coverage }` into the phase payload before constructing the ExecutionRequest.
2. The override must take precedence over any existing `coverage_threshold` from the preset or phase configuration -- it is the highest-priority source.
3. Verify the coverage value propagates through to the test phase execution by logging or asserting the final payload in a test.

### Q&A



### Design

The `--coverage` flag flows through `parseOrchestrationArgs` → `RunOptions.coverageOverride` → `createExecutionPlan` → `getCoverageThreshold(profile, coverageOverride)` → `plan.coverage_threshold`. The value is correctly resolved at plan creation time. The gap is in `buildPhase6Manifest()` which constructs the CoV chain manifest for phase 6 verification steps — it never receives or injects the coverage threshold into maker args. The fix adds a `coverageThreshold` parameter to `buildPhase6Manifest()` and injects it into each step's maker args.

### Solution

**Modified file:** `plugins/rd3/skills/orchestration-dev/scripts/pilot.ts`

1. Added `coverageThreshold: number` parameter to `buildPhase6Manifest()`.
2. Injected `coverage_threshold: coverageThreshold` into each phase 6 verification step's maker args.
3. Updated the call site in `createPilotPhaseRunner()` to pass `context.plan.coverage_threshold`.

**Added tests:** `plugins/rd3/skills/orchestration-dev/tests/pilot.test.ts` (+3 tests)

- `propagates coverage_threshold from coverage override into phase 6 worker prompt` — Verifies `generateExecutionPlan` with `coverageOverride=95` produces a plan with `coverage_threshold: 95` and the value appears in the worker prompt's phase context JSON.
- `omits coverage_threshold for non-phase-6 worker prompts` — Confirms phase 5 worker prompts don't include `coverage_threshold`.
- `propagates coverage_threshold override into phase 6 verification step payloads` — Integration test: runs phase 6 with `coverageOverride=95`, asserts the plan threshold is 95 and phase 6's `gateCriteria` contains `'95'`.

### Review

All 2985 tests pass (`bun run check`). The change is minimal — 3 targeted edits in `pilot.ts` (signature, injection, call site) and 3 focused tests.

### Plan

1. Add `coverageThreshold: number` parameter to `buildPhase6Manifest()` in `pilot.ts`.
2. Inject `coverage_threshold` into each phase 6 verification step's maker args.
3. Pass `context.plan.coverage_threshold` from the call site in `createPilotPhaseRunner()`.
4. Add 3 tests in `pilot.test.ts` verifying coverage propagation through worker prompt, non-phase-6 exclusion, and end-to-end phase 6 execution.

### Testing

- `bun run check` passes (lint + typecheck + 2985 tests, 0 failures)
- 3 new tests in `pilot.test.ts` covering coverage propagation through worker prompt, non-phase-6 exclusion, and end-to-end phase 6 execution



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


