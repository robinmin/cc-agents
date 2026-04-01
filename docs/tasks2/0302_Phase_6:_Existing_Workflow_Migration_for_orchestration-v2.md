---
name: Phase 6: Existing Workflow Migration for orchestration-v2
description: Phase 6: Existing Workflow Migration for orchestration-v2
status: Backlog
created_at: 2026-03-31T23:38:18.528Z
updated_at: 2026-03-31T23:38:18.528Z
folder: docs/tasks2
type: task
priority: "high"
dependencies: ["0301"]
tags: ["rd3","orchestration","v2","migration"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0302. Phase 6: Existing Workflow Migration for orchestration-v2

### Background

Migrate current orchestration-dev workflows to orchestration-v2. Create default pipeline.yaml from current PHASE_MATRIX, port all 4 presets, write state migration script, validate against existing expectations, and run A/B comparison testing.


### Requirements

1. Create references/examples/default.yaml from current PHASE_MATRIX (9 phases, 4 presets with defaults). 2. Port phase-specific gate configurations from current gates.ts. 3. Write orchestrator migrate --from-v1 command to convert JSON state files to SQLite. 4. Validate: all existing orchestration-dev test scenarios pass through v2 engine. 5. A/B comparison: same task through both engines, identical outcomes. 6. Performance: v2 sequential execution within 10% of v1. 7. Feature parity: every v1 feature has v2 equivalent. 8. Coexistence documented — v1 and v2 can run side-by-side.


### Q&A



### Design

V1 JSON state migration to V2 SQLite. Phase number to name mapping. V1 status to V2 FSM state mapping. Transactional migration per file. Coexistence with separate state stores (JSON vs SQLite).

### Solution

- references/examples/default.yaml: 10 phases (intake→docs) with 4 presets (simple, standard, complex, research) and parallel verify-bdd/verify-func
- state/migrate-v1.ts: migrateFromV1() scanning v1 JSON files, mapping phase numbers to names, inserting runs/phases/events atomically per file via transactions
- run.ts: `orchestrator migrate --from-v1` command handling with dir option
- Coexistence documented in SKILL.md: v1 uses JSON, v2 uses SQLite, no shared state

### Plan

1. Create default.yaml from PHASE_MATRIX with all 9 phases and 4 presets
2. Implement migrateFromV1 with V1State type definitions
3. Add phase number→name mapping and status mapping
4. Wire migrate command in run.ts CLI
5. Write migration tests

### Review

All 8 requirements verified. default.yaml has 10 phases with parallel verify-bdd/verify-func. Migration handles phase number mapping, status mapping, evidence migration as events. Coexistence documented. Tests in migrate-v1.test.ts.

### Testing

`bun run check` passes. migrate-v1.test.ts covers: successful migration, invalid state files, empty directories, error handling. 91.26% line coverage.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


