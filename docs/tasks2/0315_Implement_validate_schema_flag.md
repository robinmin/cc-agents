---
name: Implement_validate_schema_flag
description: Implement_validate_schema_flag
status: Done
created_at: 2026-04-02T01:04:32.605Z
updated_at: 2026-04-02T04:24:07.344Z
folder: docs/tasks2
type: task
priority: "low"
tags: ["rd3","orchestration","v2","cli","validate"]
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0315. Implement_validate_schema_flag

### Background

Blueprint ss3.6 specifies that `orchestrator validate --schema` should display the pipeline YAML JSON Schema and exit. The `--schema` flag is currently not parsed in commands.ts at all. The JSON Schema definition already exists in config/schema.ts as an exportable constant. This is a straightforward 3-file change: parse the flag, conditionally output the schema, add a test.

### Requirements

1. Parse `--schema` as a boolean flag on the validate subcommand in commands.ts.
2. In `handleValidate()`, if `options.schema` is true, import and output the JSON schema from config/schema.ts as formatted JSON to stdout, then exit with code 0 (skip all other validation logic).
3. Add a test: invoke handleValidate with `--schema` set, assert that stdout contains valid JSON matching the schema export from config/schema.ts.

### Q&A



### Design

The `--schema` flag is a boolean option on the validate subcommand. When set, `handleValidate()` short-circuits before any file loading or validation: it imports `getPipelineJsonSchema()` from `config/schema.ts`, serializes the result as formatted JSON to stdout, and exits with code 0. No file I/O or state management is needed for this path.

### Solution

**`scripts/cli/commands.ts`** — Added `--schema` boolean flag parsing, setting `options.schema = true`.

**`scripts/run.ts`** — Added early-exit branch at the top of `handleValidate()`: when `options.schema` is true, dynamically imports `getPipelineJsonSchema` from `config/schema.ts`, writes the formatted JSON schema to stdout, and exits with `EXIT_SUCCESS`.

**`tests/cli-commands.test.ts`** — Added 2 tests: `--schema` flag parses as boolean `true`; absent `--schema` leaves `schema` undefined.

**`tests/run-cli-integration.test.ts`** — Added 1 integration test: `validate --schema` outputs valid JSON matching the pipeline schema (checks `$schema`, `required` fields).

### Plan

1. Add `--schema` boolean flag parsing to `commands.ts`.
2. Add schema early-exit branch in `handleValidate()` in `run.ts`.
3. Add parse test and integration test.

### Review

All 2988 tests pass (`bun run check`). Minimal 3-file change: flag parsing, handler branch, tests.

### Testing

- `bun run check` passes (lint + typecheck + 2988 tests, 0 failures)
- 3 new tests: 2 unit tests for `--schema` flag parsing, 1 integration test for end-to-end `validate --schema` output



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


