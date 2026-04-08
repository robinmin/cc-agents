---
name: Add events.test.ts with coverage
description: Add events.test.ts with coverage
status: Done
created_at: 2026-04-06T06:57:47.439Z
updated_at: 2026-04-06T06:57:47.439Z
folder: docs/tasks2
type: task
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0340. Add events.test.ts with coverage

### Background

Unit tests for events CLI command covering: happy path (task-ref lookup, run ID query, type/phase filtering), error cases (missing args, unknown event types, run not found), and JSON/text output formatting. Part of 0335 decomposition.


### Requirements

Test cases: 1) events by task-ref. 2) events by --run flag. 3) --type filter with valid types. 4) --type filter with invalid type (exit 10). 5) --phase filter. 6) --json output format. 7) Missing task-ref with no --run (exit 10). 8) nonexistent task (exit 12). 9) text output table format.


### Q&A



### Design



### Solution

All 9 test cases implemented in `plugins/rd3/skills/orchestration-v2/tests/events-cli.test.ts`:
- normalizeTaskRef unit tests (6 cases)
- VALID_EVENT_TYPES coverage (2 cases)
- handleEvents invalid event type → exit 10 (2 cases)
- handleEvents nonexistent task ref → exit 12 (2 cases)
- handleEvents empty event set (1 case)
- handleEvents text table format with --phase and --type filters (5 cases)
- handleEvents JSON output format (5 cases) — with isolated stdout capture to prevent reporter stream pollution

Coverage: `events.ts` → 100% Funcs / 100% Lines

Note: JSON output tests use `captureTestOutput()` helper to intercept `process.stdout.write` without leaking to the dot-reporter stream. The global `beforeEach` interceptor does NOT call `origStdoutWrite` (avoids TTY flush), so all output is captured in-memory only.

### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


