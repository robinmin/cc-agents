---
name: create-rd3-super-reviewer-worker
description: create-rd3-super-reviewer-worker
status: Done
created_at: 2026-03-29T23:40:49.490Z
updated_at: 2026-03-30T00:24:10.223Z
folder: docs/tasks2
type: task
priority: "high"
estimated_hours: 3
dependencies: ["0285"]
tags: ["rd3","agents","review","phase-worker"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0286. create-rd3-super-reviewer-worker

### Background

Parent task 0284 introduces a new heavy-phase worker for phase 7 review so rd3 has a complete worker set for coding, testing, and reviewing. This task focuses on creating the new super-reviewer agent as a thin machine-facing adapter over the canonical review backbone without expanding review scope beyond what phase 7 needs.


### Requirements

Create a new rd3 super-reviewer subagent that operates as a strict phase-7 worker over code-review-common, follows the normalized worker contract, and does not route back to orchestration when invoked in worker mode. Success means the new agent has a clear role, aligned skills, anti-recursion rules, and output contract suitable for orchestration-dev phase delegation.


### Q&A

No additional clarification was needed beyond the parent requirement that Phase 7 gain a dedicated worker wrapper over `rd3:code-review-common`.


### Design

Create a thin phase-7 worker wrapper rather than extending orchestration or overloading existing agents.

Design choices:
- keep `super-reviewer` narrowly focused on review routing
- allow direct-entry review usage
- define a separate worker mode for orchestration-owned Phase 7
- avoid any route back to `rd3:orchestration-dev`


### Solution

Created `plugins/rd3/agents/super-reviewer.md` as the new rd3 phase-7 worker.

The wrapper is intentionally thin:
- canonical backbone: `rd3:code-review-common`
- supports direct-entry review requests
- supports explicit worker mode for orchestration-owned Phase 7
- forbids routing back into `rd3:orchestration-dev` while in worker mode
- emits the normalized worker envelope expected by orchestration


### Plan

1. Add a dedicated phase-7 worker wrapper instead of expanding jon-snow or orchestration-dev.
2. Keep the agent focused on review delegation only.
3. Encode anti-recursion rules and normalized worker inputs/outputs in the wrapper body.
4. Add a doc-level contract test so the worker role does not drift.


### Review

Confirmed the new agent stays inside the intended boundary:
- no orchestration skill dependency
- worker mode is phase-locked to Phase 7
- review work routes to `rd3:code-review-common`

Residual risk:
- runtime execution of Phase 7 is still pilot-limited; the wrapper is ready for orchestration selection, but a richer non-pilot execution path is future work.


### Testing

Verification completed:

- `bun test plugins/rd3/tests/phase-worker-docs.test.ts`
- `bun test plugins/rd3/skills/orchestration-dev/tests`
- `bun run check`

Results:
- Agent contract doc test passed, including the new super-reviewer file.
- Orchestration test suite passed.
- Full project gate passed.


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- `plugins/rd3/agents/super-reviewer.md`
- `plugins/rd3/tests/phase-worker-docs.test.ts`
- Parent task `0284`

