---
description: Generate or extend tests until the unit target is met without rd3:orchestration-v2
argument-hint: "<target> [--coverage <n>] [--channel <current|claude-code|codex|openclaw|opencode|antigravity|pi>] [--auto]"
allowed-tools: ["Read", "Glob", "Bash", "Edit", "Skill"]
---

# Dev Unit

Run a **unit-testing workflow** that drives toward the default unit target:

- focused coverage evidence for the requested target, aiming for `>= 90%`
- `100%` passing tests

This command is **standalone**. It does not delegate to `rd3:orchestration-v2`.

## When to Use

- After implementation is complete and you want stronger unit coverage
- When a specific file or module needs focused test extension
- When a task file needs a dedicated testing pass before `/rd3:dev-verify`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `target` | Yes | WBS task number, task file path, source file path, or file pattern |
| `--coverage <n>` | No | Override the default focused coverage target. Default: `90` |
| `--channel <name>` | No | Optional execution channel override. Default: run in the current agent |
| `--auto` | No | Skip confirmations where the delegated workflow supports it |

## Target Resolution

| Input Pattern | Detection | Workflow |
|---------------|-----------|----------|
| Ends with `.ts` or `.js` | Source file path | Direct file-focused test workflow |
| Glob pattern (`*`, `**/*.ts`) | File glob | Direct file-focused test workflow |
| Digits only (for example `0274`) | WBS number | Task-scoped testing workflow |
| Ends with `.md` and is a task file | Task file path | Task-scoped testing workflow |
| Any other string | Treat as task ref first | Task-scoped testing workflow |

## Execution Channel

`--channel` is optional.

Default behavior:
- run in the **current agent**
- do not delegate externally unless `--channel` is explicitly provided

Supported values:

| Value | Meaning |
|-------|---------|
| `current` | Run in the current agent and workspace |
| `claude-code`, `codex`, `openclaw`, `opencode`, `antigravity`, `pi` | Delegate through `rd3:run-acp` |

### Channel Alias Normalization

Before calling `rd3:run-acp`, normalize slash-command aliases to ACP agent names:

| Slash command value | ACP agent |
|---------------------|-----------|
| `claude-code` | `claude` |
| `codex` | `codex` |
| `openclaw` | `openclaw` |
| `opencode` | `opencode` |
| `antigravity` | `antigravity` |
| `pi` | `pi` |

## Workflow A: File-Focused Unit Testing

Use this when `target` is a source file path or a file glob.

### Steps

1. Resolve the source file(s)
2. Derive or locate the corresponding test file(s)
3. Run tests with coverage instrumentation
4. Identify gaps
5. Add targeted tests
6. Re-run tests
7. Repeat until the target is met or the workflow escalates

### Test File Naming Convention

| Source File | Test File |
|-------------|-----------|
| `foo.ts` | `foo.test.ts` |
| `foo.js` | `foo.test.js` |
| `src/foo.ts` | `src/foo.test.ts` |
| Pattern `src/**/*.ts` | Matching test files at corresponding paths |

If no test file exists at the derived path, create one with the project’s standard test structure.

### Execution Pattern

```text
bun test --coverage <test-file>
```

This coverage signal is repository-level, not a strict per-source-file proof. For file-focused usage, `dev-unit` must treat coverage as **target-focused evidence**, combining:

- the test run's coverage output
- direct assertion that the target file's behavior/path set is exercised by the added tests
- gap analysis tied to the requested source file or glob

Do not claim mathematically exact per-file coverage for the source target unless the underlying toolchain actually reports it.

### Iteration Rules

- If coverage is below the threshold, add targeted tests and re-run
- If tests fail, fix or extend tests until the suite passes
- Maximum gap-filling passes: `3` before escalation

## Workflow B: Task-Scoped Unit Testing

Use this when `target` is a WBS task number or a task file path.

This workflow does **not** call `rd3:orchestration-v2`. It uses the task as scope and runs testing directly through `rd3:sys-testing`.

### Steps

1. Resolve the task reference
2. Before moving to `testing`, ensure the task has real `Solution` content and real `Plan` content, and add enough `Design` content to avoid warning-driven `--force` usage
3. Set task status to `testing`
4. Run a task-scoped test/coverage pass
5. If testing reveals implementation gaps, move the task back to `wip`
6. Repeat until tests are green and coverage target is satisfied

### Preferred Skill Mapping

```text
Skill(skill="rd3:sys-testing", args="<task-ref> [--coverage <n>]")
```

When delegation is explicitly requested:

```text
Skill(skill="rd3:run-acp", args="<normalized-channel> exec \"run task-scoped unit testing for <task-ref> with coverage target <n>\"")
```

### Task Status Rules

For task-scoped usage, `dev-unit` owns the status transition framing:

| Workflow Moment | Required Status Action |
|-----------------|------------------------|
| Start task-scoped testing | Ensure `Solution` and `Plan` exist, backfill `Design` if needed, then `tasks update <WBS> testing` |
| Testing reveals implementation work remains | `tasks update <WBS> wip` |
| Testing pass succeeds | Keep current status; do **not** mark `done` here |

`dev-unit` is a testing command, not a completion command. Final closure belongs to the broader workflow, typically `/rd3:dev-verify` or `/rd3:dev-run`.

### Pre-Testing Guard

The current `rd3:tasks` CLI blocks `Testing` unless `Background`, `Requirements`, `Solution`, and `Plan` are present, and it warns on missing `Design`.

Therefore task-scoped `dev-unit` must not move a task to `testing` blindly.

Minimum required behavior:

1. Ensure `Solution` describes the implemented behavior being tested
2. Ensure `Plan` records the concrete execution/testing steps already taken
3. Add minimal real `Design` content if needed to avoid warning-driven `--force`
4. Only then call `tasks update <WBS> testing`

## Completion Criteria

The command is successful only when all of the following are true:

1. The relevant tests pass with `0` failures
2. The coverage target is met, using `--coverage` when provided or `90%` by default
3. No unresolved blocker remains from the last test pass

For file-focused usage, "coverage target is met" means the workflow has enough focused evidence that the requested file or glob is adequately exercised to the requested threshold. It does not mean `bun test --coverage` has proven an isolated per-file percentage for that source file.

If coverage is still below target after focused extension attempts, escalate instead of pretending success.

## Escalation Rule

Escalate when:

- coverage plateaus after repeated passes
- a failure requires debugging rather than more test authoring
- environment or dependency issues block meaningful testing

Preferred escalation:

- switch to `rd3:sys-debugging` for failing or flaky tests
- leave the task in `wip` if implementation changes are still required

## Examples

```bash
# File-focused: test a specific file
/rd3:dev-unit src/utils/helper.ts

# File-focused: stricter threshold
/rd3:dev-unit src/utils/helper.ts --coverage 95

# File-focused: glob
/rd3:dev-unit "src/**/*.ts"

# Task-scoped: local by default
/rd3:dev-unit 0266

# Task-scoped: delegated testing
/rd3:dev-unit 0266 --coverage 95 --channel codex --auto
```

## See Also

- **/rd3:dev-run**: Full task workflow with implement ↔ test loop and verification gate
- **/rd3:dev-verify**: Verification pass after testing
- **rd3:sys-testing**: Core testing and coverage skill
- **rd3:sys-debugging**: Use when tests fail for reasons beyond straightforward test extension
- **rd3:run-acp**: Explicit cross-agent delegation
