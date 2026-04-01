---
name: Phase 4: Core Engine Implementation for orchestration-v2
description: Phase 4: Core Engine Implementation for orchestration-v2
status: Backlog
created_at: 2026-03-31T23:37:58.984Z
updated_at: 2026-03-31T23:37:58.984Z
folder: docs/tasks2
type: task
priority: "high"
dependencies: ["0299"]
tags: ["rd3","orchestration","v2","implementation"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0300. Phase 4: Core Engine Implementation for orchestration-v2

### Background

Implement the core engine: FSM engine (lifecycle state machine), DAG scheduler (dependency resolution, topological sort, parallel dispatch), hook registry, all three executor implementations (LocalBun, ACP, Pool), CoV driver adapter, and the pipeline runner that ties FSM + DAG + executors + state together.


### Requirements

1. engine/fsm.ts — FSM with 5 states (IDLE, RUNNING, PAUSED, COMPLETED, FAILED), transition table from blueprint §5.2, hooks on every transition. 2. engine/dag.ts — DAG scheduler with scheduleReadyPhases(), topological sort, cycle detection. 3. engine/hooks.ts — Hook registry + execution (on-phase-start, on-phase-complete, on-phase-failure, on-rework, on-pause, on-resume). 4. executors/local.ts — LocalBunExecutor using async Bun.spawn with AbortController timeout. 5. executors/acp.ts — AcpExecutor using async acpx with --format json parsing. 6. executors/pool.ts — Executor registry with channel-based resolution. 7. verification/cov-driver.ts — Adapter over verification-chain interpreter. 8. engine/runner.ts — PipelineRunner orchestrating FSM + DAG + executors + state. 9. All tests with TDD — target 90%+ coverage. 10. No synchronous process execution anywhere. 11. Rework feedback injection: failed executor output (error message) must be injected as `feedback` field into the next ExecutionRequest per blueprint §5.4.


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


