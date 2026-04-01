---
name: Implement orchestrator undo command
description: Implement the full undo/rollback functionality for the orchestrator CLI
status: Done
created_at: 2026-04-01T15:00:00.000Z
updated_at: 2026-04-01T23:45:59.340Z
folder: docs/tasks2
type: task
priority: "high"
dependencies: ["0295"]
tags: ["rd3","orchestration","v2","undo","rollback"]
---

## 0304. Implement orchestrator undo command

### Background

The `orchestrator undo` command is currently a stub (`run.ts:381-384`, `runner.ts:170-174`). The blueprint (§3.9) defines full rollback behavior: revert a completed phase to its pre-execution state, clear downstream phases that depended on it, and support dry-run preview. State infrastructure (`saveRollbackSnapshot` / `getRollbackSnapshot`) already exists in StateManager but nothing populates it.

### Requirements

1. **Snapshot creation** — Before each phase executes, save a rollback snapshot to SQLite:
   - `git_head`: current HEAD commit hash (via `git rev-parse HEAD`)
   - `files_before`: list of modified/added files before phase starts
   - `files_after`: populated after phase completes
   - Use `StateManager.saveRollbackSnapshot()`

2. **Undo execution** — When `orchestrator undo <task-ref> <phase>` runs:
   - Load the rollback snapshot for the given phase
   - Verify no uncommitted changes exist (unless `--force`)
   - Restore files to `files_before` state via `git checkout` on individual files
   - Clear all downstream phase records (phases that depend on the undone phase)
   - Update the undone phase status back to `pending`
   - Update the run status to `PAUSED` (pipeline needs to continue from undone phase)

3. **Dry-run mode** — `--dry-run` shows what would be restored without making changes:
   - List files to restore (modified, created, deleted)
   - List downstream phases to clear
   - Exit without side effects

4. **Force mode** — `--force` bypasses the uncommitted-changes guard

5. **Error handling** — Proper error codes:
   - `UNDO_UNCOMMITTED_CHANGES` (exit 1) when uncommitted changes exist without `--force`
   - `STATE_CORRUPT` (exit 13) when snapshot is missing or incomplete
   - Exit 0 on success

6. **Hook execution** — Fire hooks where applicable (no new hooks needed, but use existing `on-phase-failure` for cleared downstream phases)

7. **CLI wiring** — Replace stub in `run.ts handleUndo()` with proper implementation that calls `PipelineRunner.undo()`

### Checklist

- [x] Implement snapshot creation in runner (before/after each phase)
- [x] Implement git state capture (`git rev-parse HEAD`, `git diff --name-only`)
- [x] Implement file restoration logic in runner.undo()
- [x] Implement downstream phase clearing
- [x] Wire `--dry-run` flag
- [x] Wire `--force` flag
- [x] Add error handling with proper error codes
- [x] Replace CLI stub in run.ts handleUndo()
- [x] Add tests for snapshot creation
- [x] Add tests for undo happy path
- [x] Add tests for dry-run mode
- [x] Add tests for error cases (uncommitted changes, missing snapshot)
- [x] Verify 90%+ coverage on changed files

### Q&A



### Design

Leverage existing `rollback.ts` (captureSnapshot, restoreSnapshot, finalizeSnapshot) and extend `runtime.ts` to wire `--rollback`, `--undo`, `--force`, and `--undo-dry-run` flags through the CLI. Snapshot data stored inline in `OrchestrationState.phases[].rollback_snapshot`. Undo restores files via git checkout, clears downstream phase records, and sets run status to `paused`.

### Solution

The undo/rollback functionality was largely pre-implemented in `rollback.ts` and integrated into `runtime.ts`.
The implementation gaps closed in this task:

1. **`--force` flag wiring** — Added `undoForce` to `ParsedOrchestrationArgs` in `model.ts`, parsed `--force` in
   `parseOrchestrationArgs`, and passed it through to `executeUndo` in `runtime.ts main()`.

2. **`--rollback` flag wiring** — Added `rollback` to `ParsedOrchestrationArgs`, parsed `--rollback` in
   `parseOrchestrationArgs`, and passed `rollbackEnabled: parsed.rollback` to `runOrchestration` in
   `runtime.ts main()`.

3. **Run status set to paused after undo** — Updated `executeUndo` in `rollback.ts` to set `state.status = 'paused'`
   and `state.updated_at` after clearing phase records, so the pipeline knows to continue from the undone phase.

4. **Tests** — Added 4 new tests: `--undo --force` via runtime main, `--undo --undo-dry-run` via runtime main,
   `--rollback` captures snapshots, and no-`--rollback` does not capture snapshots. Updated existing undo tests
   to verify `state.status === 'paused'` after undo. Total: 82 tests (was 78).



### Plan

1. Add `undo`, `undoDryRun`, `undoForce`, `rollback` fields to `ParsedOrchestrationArgs` in model.ts
2. Parse `--undo`, `--undo-dry-run`, `--force`, `--rollback` CLI flags in `parseOrchestrationArgs`
3. Wire `--rollback` to `rollbackEnabled` in both fresh and resume run branches in runtime.ts
4. Wire `--undo` to `executeUndo()` in runtime.ts main()
5. Ensure `executeUndo` sets `state.status = 'paused'` after clearing downstream phases
6. Add tests for each flag and scenario (dry-run, force, snapshot capture, resume+rollback)


### Review

All 82 tests pass. Coverage on changed files: model.ts 100%/96%, rollback.ts 95%/93%, runtime.ts 97%/93%.
TypeScript compiles clean. Biome lint/format clean.



### Testing

- 82 tests across rollback.test.ts and runtime.test.ts
- All pass, 0 failures
- Coverage: model.ts 100% func, rollback.ts 94.74% func / 93.17% line, runtime.ts 96.77% func / 93.36% line
- `bun run typecheck` passes
- `biome lint` + `biome format` clean



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- Blueprint §3.9 — undo command specification
- Blueprint §6.2 — rollback_snapshots table DDL
- `scripts/state/manager.ts` — saveRollbackSnapshot / getRollbackSnapshot
- `scripts/engine/runner.ts:170-174` — current stub
- `scripts/run.ts:381-384` — current CLI stub
