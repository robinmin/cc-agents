---
description: Generate unit tests to reach the default unit target, optionally on another execution channel
argument-hint: "<task-ref> [--auto] [--coverage <n>] [--channel <current|claude-code|codex|openclaw|opencode|antigravity|pi>]"
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
| `--channel <current\|claude-code\|codex\|openclaw\|opencode\|antigravity\|pi>` | No | Execution channel for delegated skills. Default: `current` |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0274` |
| Ends with `.md` | File path | `docs/tasks2/0274_*.md` |

## Workflow

Resolves `--channel` (default: `current`) and forwards it to **rd3:orchestration-dev**. Non-`current` values are delegated via **rd3:run-acp**.

```
# Default unit target on the current channel
Skill(skill="rd3:orchestration-dev", args="{task-ref} --profile unit --channel current")

# Custom coverage threshold on the current channel
Skill(skill="rd3:orchestration-dev", args="{task-ref} --profile unit --coverage 90 --channel current")

# Execute the same workflow on another ACP-backed channel
Skill(skill="rd3:run-acp", args="codex exec \"rd3:orchestration-dev {task-ref} --profile unit --coverage 90 --channel codex\"")
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
/rd3:dev-unit 0274 --channel gemini
```

## See Also

- **/rd3:dev-run**: Profile-driven pipeline execution
- **rd3:sys-testing**: Test execution skill
- **rd3:run-acp**: Cross-channel execution wrapper
