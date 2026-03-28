---
description: Comprehensive code review for a task or project scope
argument-hint: "<task-ref | path> [--auto]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
disable-model-invocation: true
---

# Dev Review

Execute phase 7 (Code Review) of the 9-phase pipeline. Reviews implementation quality for a specific task or project scope.

**Shortcut for:** `/dev-run {task-ref} --profile review`

## When to Use

- After implementation is complete
- Reviewing code quality before merging
- Checking for security, performance, or architecture issues

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `task-ref \| path` | Yes | WBS number, file path, or directory to review |
| `--auto` | No | Auto-approve gates |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0274` |
| Ends with `.md` | File path (task file) | `docs/tasks2/0274_*.md` |

## Workflow

Delegates to **rd3:orchestration-dev** with review profile:

```
Skill(skill="rd3:orchestration-dev", args="{task-ref} --profile review --auto")
```

## Review Dimensions

| Dimension | What It Checks |
|-----------|----------------|
| Security | Injection, auth flaws, data exposure |
| Performance | Algorithm complexity, N+1 queries |
| Quality | Readability, maintainability, DRY |
| Architecture | Coupling, cohesion, patterns |
| Testing | Coverage gaps, edge cases |

## Examples

```bash
/dev-review 0274
/dev-review docs/tasks2/0274_add_dev_slash_commands.md
```

## See Also

- **/dev-run**: Profile-driven pipeline execution
- **rd3:code-review-common**: Code review skill
