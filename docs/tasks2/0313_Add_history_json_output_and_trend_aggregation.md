---
name: Add_history_json_output_and_trend_aggregation
description: Add_history_json_output_and_trend_aggregation
status: Done
created_at: 2026-04-02T01:04:16.523Z
updated_at: 2026-04-02T01:04:16.523Z
folder: docs/tasks2
type: task
priority: "low"
tags: ["rd3","orchestration","v2","cli","history"]
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0313. Add_history_json_output_and_trend_aggregation

### Background

Blueprint §3.8 specifies a `--json` flag for the history command that should output the run history as a JSON array, plus a trend aggregation section showing success rate, average duration, and average tokens grouped by preset. Two gaps exist:

1. **--json flag ignored**: `--json` is parsed at `commands.ts:85-86`, but `handleHistory()` at `run.ts:364-388` never checks `options.json` — it always outputs formatted text via `reporter.formatSummary()`.
2. **Trends not displayed**: The trend aggregation logic already exists as `Queries.getTrends()` at `queries.ts:216-263` (returns `TrendReport` with per-preset breakdown, success rate, avg duration). However, `handleHistory()` never calls it — the trends section from the blueprint output is missing from the CLI.

### Requirements

1. When `--json` flag is set, output the full run history as a JSON array (one object per run) to stdout and exit without any additional formatting.
2. In `handleHistory()`, after displaying the run list in text mode, call `queries.getTrends()` (already exists at `queries.ts:216-263`) and render a "Trends" section with the aggregated stats (total runs, success rate, per-preset breakdown with avg duration).
3. Skip the trends section entirely if there is only 1 run in the history (aggregation is meaningless with a single data point).
4. Add tests for: JSON output format, trends section rendering with known fixture data, skip-trends-when-single-run behavior.

### Q&A



### Design



### Solution



### Plan

1. **Add --json branch to handleHistory()**: when `options.json` is true, serialize the history entries as a JSON array via `JSON.stringify()`, write to stdout, and exit. No trend section in JSON mode.
2. **Wire getTrends() into text mode**: after the run list loop, call `queries.getTrends()` and render the returned `TrendReport` as a formatted "Trends (last 30 days)" section matching the blueprint §3.8 output format. Skip if `history.length < 2`.
3. **Add tests**: verify JSON output structure, trends rendering with known fixture data, and single-run skip behavior.

### Review

4 CLI integration tests added in `run-cli-integration.test.ts`. All pass. Typecheck, lint, format clean.

### Testing

- `history --json` outputs JSON array with correct fields (runId, taskRef, preset, status, durationMs, totalTokens, createdAt)
- `history --json` returns `[]` for empty DB
- Text mode shows "Pipeline Trends" section when 2+ runs exist
- Text mode skips trends when only 1 run (aggregation meaningless)



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| code | `plugins/rd3/skills/orchestration-v2/scripts/run.ts` (handleHistory) | Lord Robb | 2026-04-01 |
| test | `plugins/rd3/skills/orchestration-v2/tests/run-cli-integration.test.ts` | Lord Robb | 2026-04-01 |

### References


