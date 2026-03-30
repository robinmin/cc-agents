---
name: refactor-super-coder-and-super-tester-worker-mode
description: refactor-super-coder-and-super-tester-worker-mode
status: Done
created_at: 2026-03-29T23:40:57.699Z
updated_at: 2026-03-30T00:24:10.333Z
folder: docs/tasks2
type: task
priority: "high"
estimated_hours: 5
dependencies: ["0285"]
tags: ["rd3","agents","coding","testing","phase-worker"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0287. refactor-super-coder-and-super-tester-worker-mode

### Background

Parent task 0284 depends on super-coder and super-tester becoming reliable phase workers instead of partially independent routers. Today they contain routing behavior that is acceptable for standalone use but unsafe when orchestration-dev wants to use them as phase executors. This task exists to split direct-entry behavior from orchestration worker behavior.


### Requirements

Refactor rd3 super-coder and super-tester so each supports an explicit worker mode for orchestration-driven phase execution, follows the normalized worker contract from task 0285, and cannot recurse back into orchestration-dev when used for phases 5 and 6. Success means both agents retain useful standalone machine entry behavior while becoming safe adapters under orchestration.


### Q&A

No additional clarification was required. The parent task already defined the desired split between standalone entry behavior and orchestration-owned worker behavior.


### Design

Refactor both wrappers into dual-mode agents:

- direct-entry mode keeps standalone machine-facing utility
- worker mode is phase-locked and non-recursive
- output envelopes align with `rd3-phase-worker-v1`
- canonical backbones remain `rd3:code-implement-common` for Phase 5 and `rd3:sys-testing` plus `rd3:advanced-testing` for Phase 6


### Solution

Refactored `super-coder` and `super-tester` into explicit dual-mode wrappers.

Direct-entry mode remains available for standalone use.

Worker mode now:
- locks `super-coder` to Phase 5 and `super-tester` to Phase 6
- preserves the orchestration-owned `execution_channel`
- limits delegation to canonical downstream backbones
- states that worker mode must not call `rd3:orchestration-dev`
- emits predictable output and failure envelopes


### Plan

1. Rewrite both agent wrappers around direct-entry vs worker-mode selection.
2. Keep standalone routing behavior where it is still useful.
3. Remove routing drift from worker mode by making orchestration ownership explicit.
4. Protect the contract with a doc-level regression test.


### Review

Confirmed the worker-mode language now matches the intended architecture:
- orchestration remains the only routing authority
- worker mode is phase-locked
- no worker-mode path routes back to `rd3:orchestration-dev`

Residual risk:
- these wrappers are instruction contracts; actual runtime delegation beyond the existing pilot still depends on future execution plumbing.


### Testing

Verification completed:

- `bun test plugins/rd3/tests/phase-worker-docs.test.ts`
- `bun test plugins/rd3/skills/orchestration-dev/tests`
- `bun run check`

Results:
- The doc test verified both agents expose mode selection and anti-recursion rules.
- Orchestration tests passed with the new worker metadata.
- Full project gate passed.


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- `plugins/rd3/agents/super-coder.md`
- `plugins/rd3/agents/super-tester.md`
- `plugins/rd3/tests/phase-worker-docs.test.ts`
- Parent task `0284`

