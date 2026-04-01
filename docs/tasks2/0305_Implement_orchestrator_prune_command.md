---
name: Implement orchestrator prune command
description: Implement event store compaction for the orchestrator CLI
status: Done
created_at: 2026-04-01T15:00:00.000Z
updated_at: 2026-04-01T23:47:54.888Z
folder: docs/tasks2
type: task
priority: "high"
dependencies: ["0295"]
tags: ["rd3","orchestration","v2","prune","compaction"]
---

## 0305. Implement orchestrator prune command

### Background

The `orchestrator prune` command is currently a stub (`run.ts:483-486`). The blueprint (§3.10, §6.5) defines event store compaction to prevent unbounded growth. The `EventStore.prune()` method exists but is not wired to the CLI. Without pruning, the SQLite event store grows indefinitely.

### Requirements

1. **Time-based pruning** — `--older-than <duration>` deletes events for runs older than the specified duration:
   - Parse duration string (e.g., `30d`, `90d`, `1y`)
   - Delete from: `events`, `gate_results`, `resource_usage`, `rollback_snapshots`
   - Preserve: `runs` and `phases` records (for historical queries)

2. **Count-based pruning** — `--keep-last <n>` keeps only the last N runs:
   - Delete all data for runs beyond the kept count
   - Same table deletion scope as time-based

3. **Dry-run mode** — `--dry-run` shows what would be deleted without making changes:
   - Count runs affected
   - Count events, gate results, resource records to be deleted
   - Report disk space estimate

4. **Default behavior** — No arguments: prune runs older than 30 days (sensible default)

5. **CLI wiring** — Replace stub in `run.ts handlePrune()` with implementation

6. **Query support** — `Queries` class may need a `getRunIdsOlderThan()` or `getRunIdsBeyond()` helper

### Checklist

- [x] Implement duration parser (`30d`, `90d`, `1y`)
- [x] Implement time-based pruning logic in StateManager or Queries
- [x] Implement count-based pruning logic
- [x] Wire `--older-than` flag
- [x] Wire `--keep-last` flag
- [x] Wire `--dry-run` flag
- [x] Replace CLI stub in run.ts handlePrune()
- [x] Add output: counts of deleted records per table
- [x] Add tests for duration parsing
- [x] Add tests for time-based pruning
- [x] Add tests for count-based pruning
- [x] Add tests for dry-run mode
- [x] Verify 90%+ coverage on changed files

### Q&A



### Design

`Pruner` class wraps a SQLite `Database` instance. Two selection strategies: time-based (`getRunIdsOlderThan`) and count-based (`getRunIdsBeyondKeepLast`). Both filter to terminal states only (`COMPLETED`/`FAILED`) to protect active runs. `countForRunIds` provides dry-run counts without mutation. `deleteForRunIds` performs the actual DELETE across 4 tables (events, gate_results, resource_usage, rollback_snapshots). CLI flags parsed in `commands.ts` and routed through `handlePrune` in `run.ts`.

### Solution

Created `Pruner` class in `scripts/state/prune.ts` with duration parsing, time-based and count-based pruning, and dry-run support. Wired CLI flags (`--older-than`, `--keep-last`, `--dry-run`) through `scripts/cli/commands.ts` to `run.ts handlePrune()`. Preserves runs and phases records for historical queries.

### Plan

1. Create `Pruner` class in `scripts/state/prune.ts` with duration parsing, time-based and count-based selection
2. Add `parseDuration()` for duration strings (s/m/h/d/w/M/y)
3. Implement `getRunIdsOlderThan()` and `getRunIdsBeyondKeepLast()` with terminal-status filter
4. Implement `countForRunIds()` (dry-run) and `deleteForRunIds()` (live)
5. Wire `--older-than`, `--keep-last`, `--dry-run` flags in `commands.ts`
6. Implement `handlePrune()` in `run.ts`
7. Add comprehensive tests for all modes and edge cases


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- Blueprint §3.10 — prune command specification
- Blueprint §6.5 — event compaction strategy
- `scripts/state/events.ts` — EventStore.prune() method
- `scripts/run.ts:483-486` — current CLI stub
