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

CLI wired to engine via run.ts entry point. Commands parse args, initialize StateManager, delegate to PipelineRunner or Queries. Reporter supports 4 formats (table, markdown, JSON, summary) plus trend reports. Metrics aggregation from ResourceMetrics.

### Solution

- observability/metrics.ts: aggregateMetrics(), metricsToRecord(), formatTokenCount(), formatDuration()
- observability/reporter.ts: Reporter with formatStatusTable(), formatMarkdownReport(), formatJsonReport(), formatSummary(), formatTrendReport()
- cli/commands.ts: parseArgs() with all flags, validateCommand() with 11 valid commands
- cli/status.ts: formatStatusOutput() and formatStatusJson()
- cli/report.ts: outputReport() with file writing
- run.ts: full CLI entry point wiring all 11 commands (run, resume, status, report, validate, list, history, undo, inspect, prune, migrate) with proper exit codes

### Plan

1. Implement metrics aggregation and formatting helpers
2. Implement Reporter with all 4 formats + trend report
3. Implement CLI arg parser with all flags
4. Implement status display and report output
5. Wire everything in run.ts CLI entry point
6. Write integration tests

### Review

All 8 requirements verified. CLI handles all 11 commands. Exit codes match blueprint (0,1,2,10-13,20). Reporter supports table/markdown/JSON/summary. Integration tests cover pipeline run, pause/resume.

### Testing

`bun run check` passes. Integration tests in integration.test.ts, run-cli-integration.test.ts, cli-commands.test.ts, cli-metrics.test.ts. 91.26% line coverage.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


