---
name: Phase 3 Common Parts Implementation for orchestration-v2
description: Phase 3 Common Parts Implementation for orchestration-v2
status: Done
created_at: 2026-03-31T23:37:44.452Z
updated_at: 2026-04-01T21:49:14.791Z
folder: docs/tasks2
type: task
priority: "high"
dependencies: ["0298"]
tags: ["rd3","orchestration","v2","implementation"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0299. Phase 3: Common Parts Implementation for orchestration-v2

### Background

Implement the foundation layer that everything else depends on: model.ts (types, interfaces, error codes), event-bus.ts (typed event emitter), state/ (SQLite schema, event store, manager, migrations, queries), config/ (YAML parser, validator, resolver), executors/mock.ts (MockExecutor for testing), and CLI helpers.


### Requirements

1. model.ts — all types, interfaces, error codes (OrchestratorError class with code/category/exitCode). 2. observability/event-bus.ts — typed event emitter with subscribe/unsubscribe. 3. state/manager.ts — SQLite connection, WAL mode, schema init. 4. state/events.ts — append-only event store. 5. state/migrations.ts — schema version tracking. 6. state/queries.ts — all aggregation queries from blueprint §6.3. 7. config/schema.ts — pipeline YAML JSON Schema. 8. config/parser.ts — YAML parse + validate. 9. config/resolver.ts — extends resolution (max 2 levels). 10. executors/mock.ts — MockExecutor with scripted responses. 11. All tests at 90%+ coverage.


### Q&A



### Design

Foundation layer with no upstream dependencies. SQLite via bun:sqlite with WAL mode. Event-sourced state with append-only event store. YAML parser hand-rolled for pipeline subset. Config resolver with extends chain (max 2 levels, circular detection).

### Solution

- model.ts: OrchestratorError with code/category/exitCode, all shared types (433 lines)
- event-bus.ts: typed EventEmitter with subscribe/unsubscribe/subscribeAll/clear
- state/manager.ts: SQLite connection, WAL mode, schema init, CRUD for runs/phases/gates/rollback/resource usage
- state/events.ts: append-only EventStore with query/prune
- state/migrations.ts: schema version tracking with idempotent DDL (6 tables, 8 indexes)
- state/queries.ts: aggregation queries (history, trends, preset stats, model usage, phase duration)
- config/schema.ts: validation with gate types, timeout format, preset subgraph checks
- config/parser.ts: hand-rolled YAML parser + validate with cycle detection
- config/resolver.ts: extends resolution with deep merge, max 2 levels, circular detection
- executors/mock.ts: MockExecutor with scripted responses and call logging

### Plan

1. Implement model.ts with all types and OrchestratorError
2. Implement event-bus.ts
3. Implement state/ (manager, events, migrations, queries)
4. Implement config/ (schema, parser, resolver)
5. Implement executors/mock.ts
6. Write tests for each module targeting 90%+ coverage

### Review

All 11 requirements verified. SQLite schema has 6 tables with CHECK constraints and indexes. YAML parser handles the full pipeline subset including block scalars, inline objects, arrays. Resolver handles extends with proper deep merge. 91.26% line coverage.

### Testing

`bun run check` passes. 571 tests across 25 files. Coverage: 91.26% lines, 86.98% statements.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


