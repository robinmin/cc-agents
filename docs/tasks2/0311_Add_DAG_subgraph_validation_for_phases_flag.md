---
name: Add_DAG_subgraph_validation_for_phases_flag
description: Add_DAG_subgraph_validation_for_phases_flag
status: Done
created_at: 2026-04-02T01:03:59.627Z
updated_at: 2026-04-02T03:40:38.079Z
folder: docs/tasks2
type: task
priority: "medium"
tags: ["rd3","orchestration","v2","dag","validation"]
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0311. Add_DAG_subgraph_validation_for_phases_flag

### Background

Blueprint ss3.2 states: "When --phases is used, the DAG validates that the requested subset forms a valid subgraph (all dependencies satisfied or already completed)." The current `getRequestedPhases()` function filters the phase list but performs no dependency validation. This means a user could request `--phases implement,test` while skipping the `intake` phase that `implement` depends on, leading to missing inputs and confusing runtime failures instead of a clear upfront error.

### Requirements

1. Add `validatePhaseSubset(requestedPhases, pipeline)` to dag.ts: for each requested phase, check that all phases listed in its `after:` dependency list are either present in the requested set or have already-completed status in the state store.
2. Call this validation function in `PipelineRunner.run()` before entering the phase execution loop, immediately after `getRequestedPhases()` returns.
3. If validation fails, exit with `EXIT_INVALID_ARGS` (exit code 10) and print a clear error message listing each missing dependency, e.g.: "Phase 'implement' requires 'intake' which is not in the requested phases and has no completed run."
4. Add unit tests for: valid subgraph (all deps present), valid subgraph with pre-completed deps, invalid subgraph (missing deps), empty phase list edge case.

### Q&A



### Design

1. Add a pure `validatePhaseSubset(requestedPhases, phases, completedPhases?)` function to `engine/dag.ts` — takes a `Set<string>` of requested phases, the pipeline phase definitions, and an optional set of already-completed phase names. Returns `SubsetValidationResult` with `{ valid, missingDeps }`.
2. In `PipelineRunner.run()`, after `getRequestedPhases()` returns a non-null set, look up prior completed phases from the state store via a new `getCompletedPhasesForTask()` helper, then call `validatePhaseSubset()`. On failure, return `{ status: 'FAILED', exitCode: EXIT_INVALID_ARGS }` with a descriptive error message.
3. Unit tests for the pure function cover: all deps present, pre-completed deps, missing deps, empty set, single no-dep phase, multiple missing deps. Integration tests cover the runner-level rejection and acceptance paths.

### Solution

**dag.ts** — Added `MissingDep` and `SubsetValidationResult` interfaces, plus `validatePhaseSubset()` exported function. Iterates requested phases, checks each `after:` dependency is in the requested set or the completed set.

**runner.ts** — Added `validatePhaseSubset` and `EXIT_INVALID_ARGS` imports. Validation runs in `run()` after phase selection, before the dry-run check. New `getCompletedPhasesForTask()` private method queries the state store for the latest run's completed phases.

**engine.test.ts** — 7 unit tests for `validatePhaseSubset`.

**runner.test.ts** — 3 integration tests: rejects invalid `--phases` (exit 10), accepts valid subset, accepts subset with prior completed deps.



### Plan

1. **Add validatePhaseSubset() to dag.ts**: iterate requested phases, collect their `after:` deps, check each dep is in the requested set or completed in state. Return either `{ valid: true }` or `{ valid: false, missingDeps: [...] }`.
2. **Wire validation into PipelineRunner.run()**: call `validatePhaseSubset()` after phase selection; on failure, log the missing deps and `process.exit(EXIT_INVALID_ARGS)`.
3. **Add tests**: unit tests for the validation function covering all four scenarios listed in requirements, plus an integration test that runs `PipelineRunner.run()` with invalid `--phases` and asserts the exit code.

### Review

- Pure function with no side effects — easily testable
- Exit code 10 (`EXIT_INVALID_ARGS`) matches existing error taxonomy
- Graceful fallback when no prior runs exist (empty completed set)
- All 639 orchestration-v2 tests pass, including 10 new ones
- typecheck and lint clean

### Testing

- 7 unit tests for `validatePhaseSubset()` in `tests/engine.test.ts`
- 3 integration tests in `tests/runner.test.ts` (reject invalid, accept valid, accept with completed deps)
- All 639 tests pass across the full orchestration-v2 suite
- `bun run typecheck` and `bun run lint` clean



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


