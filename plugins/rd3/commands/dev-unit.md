---
description: Generate unit tests to reach the default unit target: per-file coverage >=90% and 100% pass
argument-hint: "<task-ref> [--auto] [--coverage <n>]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
disable-model-invocation: true
---

# Dev Unit

Execute phase 6 (Unit Testing) of the 9-phase pipeline. Generates unit tests and iterates until the default unit target is met: per-file coverage >=90% and 100% passing tests.

**Shortcut for:** `/rd3:dev-run {task-ref} --profile unit`

## When to Use

- After implementation is complete
- Task requires the stricter default unit target
- Adding tests to newly implemented code

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `task-ref` | Yes | WBS number or file path |
| `--auto` | No | Auto-approve gates |
| `--coverage <n>` | No | Override the default per-file coverage target |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0274` |
| Ends with `.md` | File path | `docs/tasks2/0274_*.md` |

## Workflow

Delegates to **rd3:orchestration-dev** with unit profile:

```
# Default unit target (per-file >=90%, 100% tests pass)
Skill(skill="rd3:orchestration-dev", args="{task-ref} --profile unit")

# Custom coverage threshold
Skill(skill="rd3:orchestration-dev", args="{task-ref} --profile unit --coverage 90")
```

## Completion Criteria

The ONLY way to complete successfully:
1. Run verification command (`bun run test`)
2. Per-file coverage is >=90% by default, unless overridden
3. All tests pass (0 failures, 100% pass rate)

If coverage < threshold: NOT completed, MUST continue adding tests.
If any test fails: NOT completed, MUST fix or extend tests until the suite is fully passing.

## Examples

```bash
/rd3:dev-unit 0274
/rd3:dev-unit 0274 --coverage 90
/rd3:dev-unit 0274 --coverage 90 --auto
```

## See Also

- **/rd3:dev-run**: Profile-driven pipeline execution
- **rd3:sys-testing**: Test execution skill
