---
name: Phase 4: Core Engine Implementation for orchestration-v2
description: Phase 4: Core Engine Implementation for orchestration-v2
status: Done
created_at: 2026-03-31T23:37:58.984Z
updated_at: 2026-04-01T21:49:14.820Z
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

FSM engine with 5 states and 10 transition types. DAG scheduler with topological sort and cycle detection. Three executor implementations: LocalBun (async Bun.spawn + AbortController), ACP (acpx CLI + NDJSON parsing), Pool (registry with channel resolution). CoV driver adapter over verification-chain. PipelineRunner orchestrating all components.

### Solution

- engine/fsm.ts: FSMEngine with 5 states (IDLE, RUNNING, PAUSED, COMPLETED, FAILED), 10 transition types, handler callbacks
- engine/dag.ts: DAGScheduler with buildFromPhases(), evaluate(), topologicalSort(), hasCycle(), state management
- engine/hooks.ts: HookRegistry loading from PipelineHooks, shell execution with template interpolation (6 hook types)
- executors/local.ts: LocalBunExecutor with async Bun.spawn, AbortController timeout, metrics extraction
- executors/acp.ts: AcpExecutor with acpx CLI, NDJSON event stream parsing, resource metrics extraction
- executors/pool.ts: ExecutorPool with channel-based resolution, register/resolve/list/healthCheckAll
- verification/cov-driver.ts: DefaultCoVDriver with CLI checks, content_match, human approval
- engine/runner.ts: PipelineRunner orchestrating FSM + DAG + executors + state with rework loop and feedback injection

### Plan

1. Implement FSM engine with transition table
2. Implement DAG scheduler with topological sort and cycle detection
3. Implement hook registry with shell execution
4. Implement LocalBunExecutor with async process execution
5. Implement AcpExecutor with acpx CLI
6. Implement ExecutorPool registry
7. Implement CoV driver adapter
8. Implement PipelineRunner tying all components
9. Write tests targeting 90%+ coverage

### Review

All 11 requirements verified. FSM has correct transition table. DAG supports parallel dispatch. All executors use async execution (no sync anywhere). Rework feedback injection implemented in runner.ts. 91.26% line coverage.

### Testing

`bun run check` passes. 571 tests across 25 files. Key tests: fsm.test.ts, engine.test.ts, hooks.test.ts, executors.test.ts, executors-pool.test.ts, cov-driver.test.ts, engine-runner.test.ts, runner.test.ts.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


