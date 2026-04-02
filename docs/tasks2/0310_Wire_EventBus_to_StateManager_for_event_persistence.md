---
name: Wire_EventBus_to_StateManager_for_event_persistence
description: Wire_EventBus_to_StateManager_for_event_persistence
status: Done
created_at: 2026-04-02T01:03:51.130Z
updated_at: 2026-04-02T02:30:00.000Z
folder: docs/tasks2
type: task
priority: "medium"
tags: ["rd3","orchestration","v2","events"]
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0310. Wire_EventBus_to_StateManager_for_event_persistence

### Background

`PipelineRunner.emitEvent()` at `runner.ts:730-741` publishes events to the EventBus, but no subscriber currently persists those events to SQLite. The `EventStore` class already exists in `state/events.ts` with `append()`, `query()`, and `getEventsForRun()` methods ready to use. The `EventBus` supports wildcard subscription via `subscribeAll()` at `event-bus.ts:26-28`.

The gap is purely wiring: the `PipelineRunner` constructor at `runner.ts:46-59` never instantiates an `EventStore` and never subscribes to the `EventBus`. Events are fire-and-forget and cannot be queried after a pipeline run completes. This breaks the blueprint's data flow (§8.2): all events should flow through EventBus → StateManager → SQLite for observability, reporting, and history queries.

### Requirements

1. Instantiate EventStore in the PipelineRunner constructor using the state manager's existing DB connection.
2. Subscribe to the EventBus in the PipelineRunner constructor: on every emitted event, forward the event to `EventStore.append()`. Use a wildcard or generic subscription to capture all event types.
3. After wiring, verify that `EventStore.getEventsForRun(runId)` returns the correct event sequence after a pipeline run completes. This can be tested with a test-only pipeline run and a query assertion.
4. Handle append failures gracefully -- log the error but do not crash the pipeline run (event persistence is observational, not blocking).

### Q&A



### Design



### Solution

Already implemented in `runner.ts:56-62`. The `PipelineRunner` constructor creates an `EventStore` from `stateManager.getDb()` and subscribes to `eventBus.subscribeAll()` with async `.catch()` error handling.


### Plan

1. **Wire subscription in PipelineRunner constructor**: create `EventStore` instance from `state.getDb()`, call `this.eventBus.subscribeAll((event) => { try { eventStore.append(event); } catch (err) { logger.warn('[runner] Event persistence failed', err); } })` to persist all events without blocking the pipeline.
2. **Write integration test**: create a minimal pipeline run with MockExecutor, run to completion, then assert `eventStore.getEventsForRun(runId)` returns the expected event sequence (`run.created`, `phase.started`, `phase.completed`, ..., `run.completed`) in order.
3. **Verify observability**: confirm `queries.getHistory()` and `reporter.formatSummary()` produce richer output with persisted events available.

### Review



### Testing

- `engine-runner.test.ts:529` — "events are persisted to EventStore via EventBus wiring" — validates full event sequence ordering, run_id consistency, and all expected event types.
- `state.test.ts:107` — `EventStore` unit tests for `append()`, `getEventsForRun()`, `query()`, `prune()`.
- `event-bus.test.ts` — `subscribeAll()`, `unsubscribeAll()` coverage.


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| impl | `scripts/engine/runner.ts:56-62` | Lord Robb | 2026-04-02 |
| test | `tests/engine-runner.test.ts:529` | Lord Robb | 2026-04-02 |
| test | `tests/state.test.ts:107` | Lord Robb | 2026-04-02 |

### References


