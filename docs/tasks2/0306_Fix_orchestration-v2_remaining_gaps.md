---
name: Fix orchestration-v2 remaining gaps
description: Fix missing hook executions, validation, history filters, and other review findings
status: Done
created_at: 2026-04-01T15:00:00.000Z
updated_at: 2026-04-01T23:49:49.218Z
folder: docs/tasks2
type: task
priority: "medium"
dependencies: ["0295"]
tags: ["rd3","orchestration","v2","fix","polish"]
---

## 0306. Fix orchestration-v2 remaining gaps

### Background

Comprehensive review of orchestration-v2 revealed several smaller gaps: missing hook executions, incomplete validation, unwired CLI filters, and minor inconsistencies. These don't warrant individual tasks but should be addressed together.

### Requirements

1. **Missing hook executions in runner** — Four hook points defined in the engine but never fired:
   - `on-phase-start`: Execute before each phase begins (runner.ts, before `executePhaseWithRework`)
   - `on-phase-failure`: Execute when a phase fails (runner.ts, in the failure paths around lines 266-289)
   - `on-pause`: Execute when pipeline pauses (runner.ts, in all PAUSED return paths)
   - These hooks load correctly via `HookRegistry.loadFromPipeline()` but never fire

2. **Skill existence validation** — Pipeline validator (`config/parser.ts`) checks DAG cycles, preset subgraphs, and after references, but never verifies that referenced skills (e.g., `rd3:request-intake`) actually exist in `plugins/`. Add a validation rule:
   - Parse skill name from `rd3:skill-name` format
   - Check `plugins/rd3/skills/<skill-name>/` exists
   - Report as validation error with the phase name

3. **History command filters not wired** — `handleHistory` in `run.ts` parses `--preset`, `--since`, `--failed` flags but never passes them to `Queries.getHistory()`. The `HistoryFilters` interface and query logic already support these filters — just need to wire them.

4. **Task 0295 status update** — Change from `Todo` to `Done` since all 8 subtasks are complete.

### Checklist

- [x] Add `on-phase-start` hook execution in runner before phase execution
- [x] Add `on-phase-failure` hook execution in runner failure paths
- [x] Add `on-pause` hook execution in runner pause paths
- [x] Add skill existence check to `validatePipeline()`
- [x] Wire `--preset`, `--since`, `--failed` filters in `handleHistory()`
- [x] Update task 0295 status to Done (already Done)
- [x] Add/update tests for each fix
- [x] Verify `bun run check` passes

### Q&A



### Design

Hook calls added at the three missing execution points in `PipelineRunner.executeRunLoop()`. Skill validation uses filesystem check against `plugins/<plugin>/skills/<name>/` directories. History filters reuse the existing `HistoryFilters` interface and `Queries.getHistory()` method — just need to pass CLI-parsed values through.

### Solution

#### 1. Hook executions in runner.ts

Added three missing hook calls:
- `on-phase-start`: fires before each phase execution in `executeRunLoop`
- `on-phase-failure`: fires in two failure paths — execution failure with pause escalation, and execution failure without pause
- `on-pause`: fires in three pause paths — execution failure with pause escalation, gate pending (human gate), and gate failure with human gate rework exhaustion

#### 2. Skill existence validation in parser.ts

Added `resolveSkillPluginPath()` and `findProjectRoot()` helpers. The validation rule (`skill_not_found`) checks that skills referenced with `plugin:skill-name` format (e.g., `rd3:request-intake`) have a corresponding directory at `plugins/<plugin>/skills/<skill-name>/`. Skills without plugin prefix are skipped. Project root is found by walking up from the source file location.

#### 3. History filters in run.ts + commands.ts

Added `--since` and `--failed` CLI flag parsing in `commands.ts`. Wired `--preset`, `--since`, `--failed` flags through `handleHistory()` to create `HistoryFilters` and pass them to `Queries.getHistory()`. Empty filter objects are passed as `undefined` to avoid unnecessary SQL filtering.

#### 4. Test fixes

Updated test YAML strings across 4 test files to use real skill directory names (e.g., `rd3:code-implement-common` instead of `rd3:code-implement`). Added 4 new hook execution tests in engine-runner.test.ts, 4 skill existence validation tests in config-parser.test.ts, and 4 history CLI filter tests in cli-commands.test.ts.



### Plan

1. Add `on-phase-start`, `on-phase-failure`, `on-pause` hook executions in runner.ts at the appropriate lifecycle points
2. Add `resolveSkillPluginPath()` and `findProjectRoot()` helpers to config/parser.ts, add validation rule as warning
3. Wire `--preset`, `--since`, `--failed` flags in handleHistory() to create HistoryFilters
4. Add/update tests for hooks, skill validation, and history filters

### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- `scripts/engine/runner.ts` — missing hook calls
- `scripts/engine/hooks.ts` — hook registry with all hook names defined
- `scripts/config/parser.ts` — validation function
- `scripts/run.ts handleHistory()` — unwired filters
- `scripts/state/queries.ts` — HistoryFilters interface
