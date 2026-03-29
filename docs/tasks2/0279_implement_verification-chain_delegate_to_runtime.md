---
name: implement verification-chain delegate_to runtime
description: implement verification-chain delegate_to runtime
status: Done
created_at: 2026-03-28T18:20:26.419Z
updated_at: 2026-03-28T20:08:57.952Z
folder: docs/tasks2
type: task
priority: "high"
estimated_hours: 5
tags: ["verification-chain","cov","delegate-to","runtime"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0279. implement verification-chain delegate_to runtime

### Background

Task 0275 depends on rd3:verification-chain being able to invoke real rd3 skills through delegate_to rather than silently succeeding or falling back to raw shell commands. Without this, orchestration cannot safely use CoV manifests as the execution substrate for delegated skill makers.


### Requirements

Implement delegate_to support in verification-chain with structured argument passing and a stable evidence/result contract. Ensure delegated maker execution captures success, failure, stdout or structured output, and pause-related information consistently. Preserve existing checker behavior and add tests for delegated maker success and failure paths.


### Q&A



### Design

Implemented structured `delegate_to` execution in `verification-chain` so maker nodes can invoke delegated skills through a `DelegateRunner`. The runtime now preserves delegated success, failure, structured output, and paused maker states without silently succeeding.



### Solution

Extend the verification-chain interpreter and related types so maker nodes can call rd3 skills through a structured delegate_to path. Normalize the returned evidence into the same shape regardless of whether the maker came from a command or delegated skill.


### Plan

1. Extended verification-chain types with delegate request/result contracts.
2. Updated the interpreter to execute delegated makers, persist outputs and errors, and propagate paused maker state.
3. Added delegated maker tests for failure, success, pause, resume, and parallel-group pause behavior.



### Review

Reviewed against the orchestration integration contract. Delegated makers now behave as real runtime nodes rather than documentation-only placeholders, including pause/resume support required by orchestration.



### Testing

Validated with `bun run typecheck` and `bun test plugins/rd3/skills/verification-chain/tests/interpreter.test.ts`.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


