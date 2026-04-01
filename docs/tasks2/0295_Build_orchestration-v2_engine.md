---
name: Build orchestration-v2 engine
description: Build orchestration-v2 engine
status: Done
created_at: 2026-03-31T23:23:09.195Z
updated_at: 2026-04-01T22:14:06.696Z
folder: docs/tasks2
type: task
priority: "high"
dependencies: ["0294"]
tags: ["rd3","orchestration","v2","rebuild"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0295. Build orchestration-v2 engine

### Background

Comprehensive rebuild of the orchestration pipeline engine from scratch. See docs/orchestration-v2-blueprint.md for the single source of truth. This implements all 7 architectural pillars (parallel execution, executor abstraction, CoV driver, observability, SQLite state, CLI-first, FSM pipeline composition) as a new skill at plugins/rd3/skills/orchestration-v2/. Coexists with current orchestration-dev during development.

Key architectural decisions (all confirmed):
1. Micro-kernel with pluggable subsystems
2. FSM as supervisor, DAG as execution strategy (replaces v1 profile-based workflow selection)
3. Event-sourced SQLite (`bun:sqlite`) for state storage
4. Capability-based async executor interface
5. Declarative YAML with extension for pipeline definitions; named presets as optional convenience aliases over `--phases`
6. Event bus + SQLite aggregation for observability
7. Rework feedback injection: failed output fed back into re-execution

CLI command: orchestrator (system-level symlink to entry script)


### Requirements

1. Follow the blueprint document at docs/orchestration-v2-blueprint.md exactly — it is the single source of truth.
2. Build in 8 phases (Phase 0-7) as described in the blueprint §16. Create subtasks for each phase.
3. Use Bun + TypeScript + Biome (no npm/pnpm/yarn, no Prettier/ESLint).
4. The `orchestrator` CLI command name must be used consistently (never `rd3 pipeline`).
5. All modules must compile, all tests must pass (`bun run check`).
6. Target 90%+ test coverage from Phase 3 onward.
7. No `console.*` in scripts — use `logger.*` from `scripts/logger.ts`.
8. Each module stays under 300 lines — no god-files.
9. Coexistence with current orchestration-dev during development (no breaking changes to v1).
10. Phase 6 (Migration) must validate: same task through both engines produces identical outcomes.


### Q&A



### Design

Micro-kernel architecture with pluggable subsystems. FSM handles lifecycle (IDLE/RUNNING/PAUSED/COMPLETED/FAILED), DAG handles scheduling (topological sort + parallel dispatch). Event-sourced SQLite for state, YAML for pipeline definitions, CLI-first interface.

See docs/orchestration-v2-blueprint.md for the single source of truth.

### Solution

Built in 8 phases (0296-0303):

- Phase 0 (0296): Blueprint document — the architectural spec
- Phase 1 (0297): System design — CLI arg parsing, module dependency graph, SKILL.md + reference docs
- Phase 2 (0298): Structure scaffolding — directory structure, model.ts with all types, stub modules
- Phase 3 (0299): Common parts — event bus, SQLite state (6 tables), YAML parser/validator/resolver, MockExecutor
- Phase 4 (0300): Core engine — FSM engine, DAG scheduler, hook registry, LocalBun/AcpExecutor, executor pool, CoV driver, pipeline runner
- Phase 5 (0301): CLI + observability — all 11 commands wired, status display, report generation, metrics aggregation, trends
- Phase 6 (0302): Migration — default pipeline YAML from PHASE_MATRIX, 4 presets ported, v1→v2 state migration script
- Phase 7 (0303): New workflows — parallel verification examples, per-project custom pipelines, security-first pipeline

Result: 25 source files, 23 test files, 500 tests passing, 92.88% line coverage. All subtasks marked Done.



### Plan

**Subtasks (by phase):**
- 0296 Phase 0: Concrete Blueprint (Done)
- 0297 Phase 1: System Design
- 0298 Phase 2: Structure Scaffolding
- 0299 Phase 3: Common Parts Implementation
- 0300 Phase 4: Core Engine Implementation
- 0301 Phase 5: CLI and Observability
- 0302 Phase 6: Existing Workflow Migration
- 0303 Phase 7: New Workflow Implementation

### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


