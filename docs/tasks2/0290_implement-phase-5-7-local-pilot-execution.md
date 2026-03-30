---
name: implement-phase-5-7-local-pilot-execution
description: implement-phase-5-7-local-pilot-execution
status: Backlog
created_at: 2026-03-30T06:00:00.000Z
updated_at: 2026-03-30T06:00:00.000Z
folder: docs/tasks2
type: task
priority: "medium"
dependencies: ["0288"]
tags: ["rd3","orchestration","pilot","phase-worker"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0290. implement-phase-5-7-local-pilot-execution

### Background

Tasks 0284-0288 established the phase-worker architecture with contracts, agent wrappers, and orchestration integration. However, the pilot runtime currently only executes phase 6 concretely on the `current` channel. Phases 5 and 7 pause with a `worker-handoff-required` evidence when run locally, deferring to ACP channels only. This task exists to close that gap by implementing local pilot execution paths for phases 5 (coding) and 7 (review).

### Requirements

1. Implement a local pilot execution path for phase 5 (`rd3:super-coder`) on the `current` channel.
2. Implement a local pilot execution path for phase 7 (`rd3:super-reviewer`) on the `current` channel.
3. Preserve the existing ACP channel dispatch for phases 5 and 7.
4. Add tests covering the new local execution paths.
5. Do not change the phase-worker contract or orchestration policy — only extend pilot.ts execution coverage.

### Q&A



### Design



### Solution



### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- Parent task `0284`
- `plugins/rd3/skills/orchestration-dev/scripts/pilot.ts` — `createLocalWorkerChannelPauseResult()` is the current stub
- `plugins/rd3/skills/orchestration-dev/tests/pilot.test.ts` — `pauses current-channel worker phases` test
