---
name: Phase 3: Common Parts Implementation for orchestration-v2
description: Phase 3: Common Parts Implementation for orchestration-v2
status: Backlog
created_at: 2026-03-31T23:37:44.452Z
updated_at: 2026-03-31T23:37:44.452Z
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



### Solution



### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


