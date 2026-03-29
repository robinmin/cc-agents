---
name: wire pilot orchestration phases through cov and isolated executors
description: wire pilot orchestration phases through cov and isolated executors
status: Done
created_at: 2026-03-28T18:20:48.840Z
updated_at: 2026-03-28T20:08:58.392Z
folder: docs/tasks2
type: task
priority: "high"
estimated_hours: 6
dependencies: ["0277","0279","0280"]
tags: ["orchestration","cov","integration","testing"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0281. wire pilot orchestration phases through cov and isolated executors

### Background

Task 0275 should not switch every phase at once. After the control plane, executor abstraction, delegate_to runtime, and phase contracts exist, orchestration needs a first real integration slice that proves the design works end-to-end on high-value phases.


### Requirements

Add a phase-to-CoV adapter in orchestration-dev and wire at least the pilot phases through isolated executors plus verification-chain. Start with Phase 6 and any required prerequisite handling from Phase 5, then include the review/BDD functional path if feasible. Ensure runtime state, evidence, and gate outcomes are captured consistently. Add integration tests for success, failure, retry, and pause-resume behavior.


### Q&A



### Design

Implemented the pilot orchestration-to-CoV integration in `plugins/rd3/skills/orchestration-dev/scripts/pilot.ts`. Phase 6 now generates a verification-chain manifest, runs delegated verification steps through isolated executors, captures evidence from CoV state, and surfaces completed, failed, paused, and retried outcomes through the orchestration phase-runner contract.



### Solution

Use the executor abstraction to run maker work out-of-process and the verification-chain runtime to evaluate the resulting phase manifests. Start with the smallest useful end-to-end slice, but keep the manifest and runtime APIs general enough for later phases.


### Plan

1. Added a pilot delegate runner that maps orchestration executor results into verification-chain delegate results.
2. Added a Phase 6 pilot manifest builder and phase runner.
3. Covered success, failure, retry, and pause behavior across the pilot verification slice.



### Review

Reviewed the pilot slice against task 0275's control-plane architecture. The implemented path stays intentionally phase-limited to Phase 6, but it is a real end-to-end CoV-backed execution flow rather than a stub.



### Testing

Validated with `bun run typecheck` and `bun test plugins/rd3/skills/orchestration-dev/tests/pilot.test.ts plugins/rd3/skills/orchestration-dev/tests/runtime.test.ts plugins/rd3/skills/verification-chain/tests/interpreter.test.ts`.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


