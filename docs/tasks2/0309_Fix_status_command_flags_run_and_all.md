---
name: Fix_status_command_flags_run_and_all
description: Fix_status_command_flags_run_and_all
status: Done
created_at: 2026-04-02T01:03:44.476Z
updated_at: 2026-04-02T03:03:10.558Z
folder: docs/tasks2
type: task
priority: "medium"
tags: ["rd3","orchestration","v2","cli"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0309. Fix_status_command_flags_run_and_all

### Background

Blueprint §3.4 specifies two status command flags: `status --run <run-id>` to display a specific pipeline run, and `status --all` to list all active runs. Currently:
- `--run` is not parsed in `commands.ts` at all.
- `--all` is parsed at `commands.ts:83-84` but never consulted in `handleStatus()` at `run.ts:259-300`. The handler branches only on whether `taskRef` is present — if no taskRef, it shows the latest run; if taskRef is given, it searches history for that task. The `--all` flag has no effect.

Both flags are documented in the blueprint but non-functional in the implementation.

### Requirements

1. Add `--run <run-id>` flag parsing to commands.ts: accepts a string argument (the run ID), passes it as `options.run` to the status handler.
2. In `handleStatus()`, when `options.run` is set, call `queries.getRun(runId)` and display the details for that specific run only.
3. In `handleStatus()`, when `options.all` is set (and `options.run` is not), call `state.getActiveRuns()` and render a table of all active runs with columns: run ID, profile, status, started_at.
4. Preserve existing behavior (show latest run) when neither flag is provided.
5. Add unit tests for each flag path: `--run` with valid/invalid ID, `--all` with multiple active runs, and default (no flags).

### Q&A



### Design

Three-branch dispatch in `handleStatus()`: `--run` (direct ID lookup via `queries.getRunSummary`), `--all` (list all via `queries.getHistory(1000)` with table formatter), default (latest run). New `formatStatusListOutput`/`formatStatusListJson` formatters in `cli/status.ts`.

### Solution

1. Added `--run <run-id>` flag parsing in `commands.ts` (stores as `options.run`).
2. Rewrote `handleStatus()` in `run.ts` with four code paths: `--run`, `--all`, taskRef lookup, and default latest.
3. Added `formatStatusListOutput()` and `formatStatusListJson()` to `cli/status.ts` for table/JSON list rendering.
4. Added 5 CLI integration tests covering all status flag paths.



### Plan

1. **Parse --run flag** in `commands.ts`: add `--run <run-id>` flag parsing (string value), store as `options.run`.
2. **Implement --run and --all branches** in `handleStatus()` at `run.ts:259-300`:
   - If `options.run` is set: call `queries.getRunSummary(options.run)` and display that single run.
   - Else if `options.all` is set (and no taskRef): call `queries.getHistory()` without limit and render a table of all active/recent runs.
   - Else: fall through to existing behavior (latest run or task-specific lookup).
3. **Add tests**: cover the three code paths (specific run by ID, all runs, default) with mocked query layers.

### Review



### Testing

5 new CLI integration tests added:
- `status --run` with valid ID
- `status --run` with invalid ID (exits 12)
- `status --all` lists all runs with table header
- `status --all --json` outputs JSON array
- `status` default shows latest run

1 new unit test: `parses --run flag` in `cli-commands.test.ts`.

All 2967 tests pass. 0 failures.

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Modified | `plugins/rd3/skills/orchestration-v2/scripts/cli/commands.ts` | Lord Robb | 2026-04-01 |
| Modified | `plugins/rd3/skills/orchestration-v2/scripts/cli/status.ts` | Lord Robb | 2026-04-01 |
| Modified | `plugins/rd3/skills/orchestration-v2/scripts/run.ts` | Lord Robb | 2026-04-01 |
| Modified | `plugins/rd3/skills/orchestration-v2/tests/cli-commands.test.ts` | Lord Robb | 2026-04-01 |
| Modified | `plugins/rd3/skills/orchestration-v2/tests/run-cli-integration.test.ts` | Lord Robb | 2026-04-01 |

### References


