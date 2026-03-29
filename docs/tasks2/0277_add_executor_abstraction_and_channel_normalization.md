---
name: add executor abstraction and channel normalization
description: add executor abstraction and channel normalization
status: Done
created_at: 2026-03-28T18:20:15.893Z
updated_at: 2026-03-28T20:08:57.510Z
folder: docs/tasks2
type: task
priority: "high"
estimated_hours: 5
dependencies: ["0276"]
tags: ["orchestration","executor","routing","acp"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0277. add executor abstraction and channel normalization

### Background

Task 0275 requires orchestration to be the single routing authority. This subtask isolates phase execution behind a common executor contract so current-channel work uses a local spawned child process and remote-channel work uses rd3:run-acp, without nested ACP orchestration delegation.


### Requirements

Define a shared executor abstraction with local-child and ACP-backed implementations. Normalize user-facing channel values such as current, claude-code, codex, openclaw, opencode, antigravity, and pi into the runtime contract. Ensure wrappers pass channel into orchestration rather than pre-delegating orchestration itself. Add tests covering alias normalization and equivalent result envelopes from both executor backends.


### Q&A



### Design

Implemented a stable executor contract in `plugins/rd3/skills/orchestration-dev/scripts/executors.ts` with two backends: `LocalCommandExecutor` for `current` and `AcpExecutor` for remote channels. Channel normalization now maps user-facing aliases such as `claude-code` to the runtime form while keeping the result envelope consistent across both backends.



### Solution

Introduce an executor adapter layer in orchestration-dev that resolves a requested channel and chooses either a local child-process executor or a run-acp-backed executor. Keep the result envelope stable so later phase and CoV logic does not care which backend ran the phase.


### Plan

1. Added normalized execution-channel handling.
2. Implemented local-child and ACP executor backends behind one interface.
3. Updated wrapper and skill docs so orchestration owns routing instead of wrapper-level pre-delegation.



### Review

Reviewed the routing boundary against the command wrappers and `run-acp` docs. The orchestration layer is now the single routing authority for downstream execution.



### Testing

Validated with `bun run typecheck` and `bun test plugins/rd3/skills/orchestration-dev/tests/executors.test.ts plugins/rd3/skills/orchestration-dev/tests/plan.test.ts`.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


