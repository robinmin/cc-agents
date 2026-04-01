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



### Solution



### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


