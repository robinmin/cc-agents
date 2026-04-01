---
name: Phase 5: CLI and Observability for orchestration-v2
description: Phase 5: CLI and Observability for orchestration-v2
status: Backlog
created_at: 2026-03-31T23:38:08.161Z
updated_at: 2026-03-31T23:38:08.161Z
folder: docs/tasks2
type: task
priority: "high"
dependencies: ["0300"]
tags: ["rd3","orchestration","v2","cli","observability"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0301. Phase 5: CLI and Observability for orchestration-v2

### Background

Wire the engine to the CLI. Implement resource metrics collection, report generation (table/markdown/JSON/summary), all CLI commands (run, resume, status, report, validate, list, history, undo, inspect), and integration tests.


### Requirements

1. observability/metrics.ts — ResourceMetrics collection from executor results. 2. observability/reporter.ts — Table, markdown, JSON, summary report formats per blueprint §3. 3. cli/commands.ts — All 11 commands (run, resume, status, report, validate, list, history, undo, inspect, prune, migrate) with arg parsing and flags. 4. cli/status.ts — Status table display with phase/status/duration/checks/tokens/model columns. 5. cli/report.ts — Report output in all formats. 6. run.ts — Wire CLI to engine entry point. 7. Integration tests covering: full pipeline run, pause/resume, failure/retry, parallel phases, undo, report generation. 8. CLI exit codes match blueprint §3.2 table.


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


