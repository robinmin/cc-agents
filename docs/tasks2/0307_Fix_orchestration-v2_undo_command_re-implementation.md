---
name: Fix_orchestration-v2_undo_command_re-implementation
description: Fix_orchestration-v2_undo_command_re-implementation
status: Done
created_at: 2026-04-02T01:03:27.995Z
updated_at: 2026-04-02T02:57:35.125Z
folder: docs/tasks2
type: task
priority: "high"
tags: ["rd3","orchestration","v2","undo"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0307. Fix_orchestration-v2_undo_command_re-implementation

### Background

Task 0304 claimed to implement theorchestrator undo`, but the files it references (`runtime.ts`, `rollback.ts`, `ParsedOrchestrationArgs`) don't exist in the current codebase. The implementation was done against a different module structure that was never merged. The actual stubs remain:
- `handleUndo()` at `run.ts:390-393` returns "Undo not yet implemented"
- `PipelineRunner.undo()` at `runner.ts:170-174` is a stub that logs a warning

The rollback snapshot infrastructure already exists (`StateManager.saveRollbackSnapshot()` / `getRollbackSnapshot()`, `RollbackSnapshot` type in `model.ts:212-219`), and `rollback_snapshots` table in SQLite. Nothing populates it yet.

Parent task: 0295 (orchestration-v2 engine). Blocked by: 0308 (bin entry must work first).

### Requirements

1. **Snapshot creation** - Before each phase executes in `PipelineRunner.executeRunLoop()`, save a rollback snapshot to SQLite:
   - `git_head`: current HEAD commit hash via `git rev-parse HEAD`
   - `files_before`: list of modified/added files via `git diff --name-only HEAD` before phase starts
   - `files_after`: populated after phase completes via `git diff --name-only HEAD`
   - Use `StateManager.saveRollbackSnapshot()`

2. **Undo execution** - When `orchestrator undo <task-ref> <phase>` runs:
   - Load the rollback snapshot for the given phase
   - Verify no uncommitted changes exist (unless `--force`)
   - Restore files to `files_before` state via `git checkout` on individual files
   - Clear all downstream phase records (phases that depend on the the undone phase in DAG)
   - Update undone phase status back to `pending`
   - Set run status to `PAUSED`

3. **Dry-run mode** - `--dry-run` shows what would be restored without making changes:
   - List files to restore (modified, created, deleted)
   - List downstream phases to clear
   - Exit without side effects

4. **Force mode** - `--force` bypasses theuncommitted-changes guard

5. **Error handling** - Proper error codes:
   - `UNDO_UNCOMMITTED_CHANGES` (exit 1) when uncommitted changes exist without `--force`
   - `STATE_CORRUPT` (exit 13) when snapshot is missing or incomplete
   - Exit 0 on success

### Q&A

**Q: Should undo delete files created during the phase?**
A: Yes. Files in `files_after` but not in `files_before` should be deleted (they were created by the phase).

**Q: What about files not tracked by git?**
A: Untracked files are left alone. Only git-tracked files are restored/deleted.

### Design

Leverage existing `StateManager` methods (`saveRollbackSnapshot`, `getRollbackSnapshot`). Add snapshot capture to thePipelineRunner.executeRunLoop()` before/after phase execution. Implement real undo logic in `PipelineRunner.undo()` and `handleUndo()` in `run.ts`.

### Solution

1. Add `captureSnapshot(runId, phaseName)` helper to `runner.ts` that runs `git rev-parse HEAD` and `git diff --name-only HEAD`
2. Call before phase execution: `await captureSnapshot(runId, phaseName)` saves with `files_before`
3. Call after phase execution: `await finalizeSnapshot(runId, phaseName)` saves with `files_after`
4. Implement `runner.undo()`: load snapshot, restore files, clear downstream, set PAUSED
5. Replace `handleUndo()` stub in `run.ts` with call to `runner.undo()`
6. Add `--force` flag to `commands.ts` parseArgs()

### Plan

1. Add snapshot capture helpers to `runner.ts` (captureSnapshot, finalizeSnapshot)
2. Wire snapshot capture into executeRunLoop() before/after phase execution
3. Implement `PipelineRunner.undo()` with git-based file restoration
4. Replace `handleUndo()` stub in `run.ts`
5. Add `--force` flag parsing to `commands.ts`
6. Add tests: snapshot creation, undo happy path, dry-run, force, error cases

### Review

- All tests pass (`bun test plugins/rd3/skills/orchestration-v2/`)
- Coverage on changed files >= 90%
- `bun run check` passes
- No `console.*` calls — only `logger.*`

### Testing

- Snapshot creation: verify `saveRollbackSnapshot` called before/after phase
- Undo happy path: restore files, clear downstream, set PAUSED
- Dry-run: show plan without side effects
- Force mode: bypass uncommitted-changes guard
- Error: uncommitted changes without force (exit 1)
- Error: missing snapshot (exit 13)

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- Blueprint §3.9 - undo command specification
- Blueprint §6.2 - rollback_snapshots table DDL
- `scripts/state/manager.ts` - saveRollbackSnapshot / getRollbackSnapshot
- `scripts/engine/runner.ts:170-174` - current stub
- `scripts/run.ts:390-393` - current CLI stub


