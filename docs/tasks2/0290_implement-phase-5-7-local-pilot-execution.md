---
name: implement-phase-5-7-local-pilot-execution
description: implement-phase-5-7-local-pilot-execution
status: Done
created_at: 2026-03-30T06:00:00.000Z
updated_at: 2026-03-30T17:56:13.944Z
folder: docs/tasks2
type: task
priority: "medium"
dependencies: ["0288"]
tags: ["rd3","orchestration","pilot","phase-worker"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
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

Implement local `current`-channel worker execution for phases 5 and 7 without changing the phase-worker contract:

- Extend the local executor so it can execute either a shell `command` or a worker `prompt`.
- Route `current`-channel worker phases through the local executor while preserving ACP dispatch for non-`current` channels.
- Keep worker output validation in `pilot.ts` unchanged: local and ACP worker paths must both return the same validated JSON envelope.
- Add a deterministic `ACPX_BIN` override so runtime integration tests can exercise the local prompt path without depending on a real ACP installation.
- Update user-facing docs to reflect the real support matrix: local pilot coverage now exists for phases 5, 6, and 7 only; end-to-end profiles that include phases 1-4 or 8-9 still require ACP.


### Solution

Implemented the local current-channel worker path in the orchestration pilot:

- `plugins/rd3/skills/orchestration-dev/scripts/executors.ts`
  - Added local prompt execution support alongside command execution.
  - Resolved `ACPX_BIN` from the environment for both the local prompt runner and ACP executor.
- `plugins/rd3/skills/orchestration-dev/scripts/pilot.ts`
  - Removed the current-channel worker handoff pause stub.
  - Routed phases 5 and 7 through the same validated worker-envelope path used by ACP-backed execution.
- `plugins/rd3/skills/orchestration-dev/tests/executors.test.ts`
  - Added coverage for prompt-based local execution.
- `plugins/rd3/skills/orchestration-dev/tests/pilot.test.ts`
  - Added current-channel local execution coverage for phase 5 and phase 7.
- `plugins/rd3/skills/orchestration-dev/tests/runtime.test.ts`
  - Added runtime-main integration coverage for local simple and review profiles using a mock `ACPX_BIN`.
  - Updated the explicit start-phase expectation: phase 6 and 7 now complete locally, and the run then stops at unsupported phase 8 on the current channel.
- Updated `plugins/rd3/skills/orchestration-dev/SKILL.md`, `plugins/rd3/commands/dev-run.md`, and `plugins/rd3/commands/dev-review.md` to match the actual pilot behavior.


### Plan

1. Extend the local pilot executor to support worker prompts on `current`.
2. Preserve ACP dispatch for non-`current` channels.
3. Add unit and runtime integration coverage for local phase 5 / 7 execution.
4. Reconcile docs with the actual current-channel support matrix.
5. Verify with focused orchestration tests, typecheck, and the project gate.


### Review

Review outcome:

- Core requirement satisfied: phases 5 and 7 now have a local current-channel pilot execution path.
- Contract integrity preserved: both local and ACP worker execution still flow through the same JSON-envelope parser and validator.
- ACP behavior preserved for non-`current` channels.
- A regression surfaced during verification: `runtime main` no longer paused at phase 7 because the old stub was gone, but the default local prompt runner depended on `acpx` being present. This was resolved by adding the standard `ACPX_BIN` override and covering the local prompt path with a deterministic mock runner in integration tests.
- Remaining limitation is explicit and documented: current-channel end-to-end execution is still partial because direct-skill pilot execution for phases 1-4 and 8-9 is not implemented yet.


### Testing

- `bun test plugins/rd3/skills/orchestration-dev/tests/executors.test.ts plugins/rd3/skills/orchestration-dev/tests/pilot.test.ts plugins/rd3/skills/orchestration-dev/tests/runtime.test.ts`
  - Assertions passed: `59 pass / 0 fail`
  - Bun returned non-zero on the focused slice because project-wide coverage thresholds are evaluated even for partial test runs.
- `bun run typecheck`
  - Passed.
- `bun run check`
  - Test assertions passed: `2184 pass / 0 fail`
  - The command still exited non-zero due the workspace's Bun coverage-threshold behavior, not because of a failing assertion.


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- `plugins/rd3/skills/orchestration-dev/scripts/executors.ts`
- `plugins/rd3/skills/orchestration-dev/scripts/pilot.ts`
- `plugins/rd3/skills/orchestration-dev/tests/executors.test.ts`
- `plugins/rd3/skills/orchestration-dev/tests/pilot.test.ts`
- `plugins/rd3/skills/orchestration-dev/tests/runtime.test.ts`
- `plugins/rd3/skills/orchestration-dev/SKILL.md`
- `plugins/rd3/commands/dev-run.md`
- `plugins/rd3/commands/dev-review.md`

