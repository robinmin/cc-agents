---
description: Generate unit tests to reach the default unit target, optionally on another execution channel
argument-hint: "<target> [--auto] [--coverage <n>] [--channel <auto|current|claude-code|codex|openclaw|opencode|antigravity|pi>]"
allowed-tools: ["Read", "Glob", "Bash", "Edit", "Skill"]
---

# Dev Unit

Execute phase 6 (Unit Testing) of the 9-phase pipeline. Generates unit tests and iterates until the default unit target is met: per-file coverage >=90% and 100% passing tests.

**Shortcut for:** `/rd3:dev-run {target} --preset unit`

## When to Use

- After implementation is complete
- Task requires the stricter default unit target
- Adding tests to newly implemented code
- Generating tests for a specific source file

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `target` | Yes | WBS task number, file path, or file pattern |
| `--auto` | No | Auto-approve gates (orchestrator workflow only) |
| `--coverage <n>` | No | Override the default per-file coverage target (default: 90) |
| `--channel <auto\|current\|claude-code\|codex\|openclaw\|opencode\|antigravity\|pi>` | No | Execution channel for orchestrator workflow. Default: `auto` |

### Smart Positional Detection

The skill detects the target type automatically:

| Input Pattern | Detection | Workflow |
|-------------|-----------|----------|
| Ends with `.ts` | Source file path | **Direct test execution** — run `bun test --coverage`, iterate until coverage target met |
| Ends with `.js` | Source file path | **Direct test execution** — same as `.ts` |
| Glob pattern (`*`, `**/*.ts`) | File glob | **Direct test execution** — run matching test files |
| Digits only (e.g. `0274`) | WBS number | **Orchestrator pipeline** — delegates to `rd3:orchestration-v2` |
| Ends with `.md` (not `.ts.md`) | Task file | **Orchestrator pipeline** — delegates to `rd3:orchestration-v2` |
| Any other string | WBS number | **Orchestrator pipeline** — delegates to `rd3:orchestration-v2` |

## Workflows

> **Important — `--channel auto` vs explicit ACP channels:**
> The orchestrator maps `auto` → the configured default backend from `default_channel`. `current` remains accepted as a deprecated alias for the same behavior. Use explicit ACP channels like `pi` when you want deterministic routing to a named backend.

### Workflow A: Direct Test Execution (File Path Target)

When `target` is a file path or glob pattern, skip the orchestrator and run tests directly.

```
target = "plugins/rd3/skills/orchestration-v2/scripts/config/schema.ts"
target = "src/**/*.ts"
```

**Steps:**

1. **Parse target** — Determine if it's a file path, glob, or task-ref
2. **Find test files**:
   - If `target` ends with `.test.ts` → use as-is
   - If `target` ends with `.ts` → derive test file by replacing `.ts` with `.test.ts`
   - If `target` is a glob → resolve to matching test files
3. **Run tests with coverage**:
   ```bash
   bun test --coverage <test-file>
   ```
4. **Parse coverage output** — Extract per-file coverage percentages from the coverage table
5. **Check threshold** — Compare per-file coverage against `--coverage` (default: 90%)
6. **If coverage < threshold**:
   - Read the source file to identify uncovered lines
   - Use the coverage report to identify specific uncovered branches
   - Write targeted test cases to the test file
   - Re-run tests
   - Repeat (max 3 iterations before escalating)
7. **If all tests pass and coverage >= threshold** → DONE

**Coverage parsing:** Extract the `| % Funcs |` column from `bun test --coverage` output for the specific file.

### Workflow B: Orchestrator Pipeline (Task-Ref Target)

When `target` is a WBS number or task file path, delegate to the orchestration pipeline.

```
target = "0266"
target = "docs/tasks2/0266_implementation.md"
```

**Steps:**

1. **Parse target** — If `.md` file, read it to extract the WBS number from `name:` frontmatter
2. **Forward to orchestration-v2**:
   ```
   Skill(
     skill="rd3:orchestration-v2",
     args="{wbs} --preset unit --channel {channel} {--auto} {--coverage}"
   )
   ```
   - `channel` defaults to `auto` (uses the configured default backend)
   - `--auto` is forwarded when provided
   - `--coverage N` overrides the default 90% threshold
3. **The orchestrator** runs the `test` phase with `rd3:sys-testing` skill
4. **Gate evaluation**:
   - Command gates run `bun test --coverage` and check coverage threshold
   - Auto gates use checklist-based verification
   - Human gates pause for approval (bypassed when `--auto` is set)

## Test File Naming Convention

| Source File | Test File |
|-------------|-----------|
| `foo.ts` | `foo.test.ts` |
| `foo.ts` in subdirectory | `foo.test.ts` in same subdirectory |
| `src/foo.ts` | `src/foo.test.ts` |
| Pattern `src/**/*.ts` | Tests must exist at matching paths |

If no test file exists at the derived path, create one with the standard test structure.

## Completion Criteria

**Direct execution (file path):**
1. `bun test --coverage <test-file>` returns 0 failures
2. Per-file coverage >= `--coverage` threshold
3. All tests pass (0 failures)

**Orchestrator pipeline:**
1. Orchestrator reports `COMPLETED` status
2. All phase gates passed

If coverage < threshold: NOT completed, MUST continue adding tests.
If any test fails: NOT completed, MUST fix or extend tests until the suite is fully passing.

## Examples

```bash
# Direct: test a specific file (default 90% threshold)
/rd3:dev-unit plugins/rd3/skills/orchestration-v2/scripts/config/schema.ts

# Direct: test with 95% threshold
/rd3:dev-unit src/utils/helper.ts --coverage 95

# Orchestrator: test a task (WBS number)
rd3:dev-unit 0266

# Orchestrator: test a task with auto-approve
/rd3:dev-unit 0266 --auto

# Orchestrator: test with custom coverage and channel
/rd3:dev-unit 0266 --coverage 95 --channel codex
```

## See Also

- **/rd3:dev-run**: Profile-driven pipeline execution
- **rd3:sys-testing**: Test execution skill (used by orchestrator pipeline)
- **rd3:run-acp**: ACP executor for remote phase delegation
