---
description: Comprehensive code review for a task scope, optionally on another execution channel
argument-hint: "<task-ref> [--auto] [--channel <current|claude-code|codex|openclaw|opencode|antigravity|pi>]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
---

# Dev Review

Execute phase 7 (Code Review) of the 9-phase pipeline. Reviews implementation quality for a specific task scope.

**Shortcut for:** `/rd3:dev-run {task-ref} --profile review`

## When to Use

- After implementation is complete
- Reviewing code quality before merging
- Checking for security, performance, or architecture issues

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `task-ref` | Yes | WBS number or task file path |
| `--auto` | No | Auto-approve gates |
| `--channel <current\|claude-code\|codex\|openclaw\|opencode\|antigravity\|pi>` | No | Execution channel for delegated skills. Default: `current` |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0274` |
| Ends with `.md` | File path (task file) | `docs/tasks2/0274_*.md` |

## Workflow

Resolves `--channel` (default: `current`) and forwards it to **rd3:orchestration-dev**. In the current pilot, Phase 7 has no local current-channel worker runner yet, so `--channel current` pauses for worker handoff and an ACP channel is required for end-to-end review execution.

```
# Current-channel pilot will pause and request worker handoff
Skill(skill="rd3:orchestration-dev", args="{task-ref} --profile review --channel current")

# Execute the review end-to-end on another channel
Skill(skill="rd3:orchestration-dev", args="{task-ref} --profile review --channel codex")
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
/rd3:dev-review 0274 --channel codex
/rd3:dev-review docs/tasks2/0274_add_dev_slash_commands.md
/rd3:dev-review 0274 --channel claude-code
```

## See Also

- **/rd3:dev-run**: Profile-driven pipeline execution
- **rd3:code-review-common**: Code review skill
- **rd3:run-acp**: ACP executor used by orchestration when a delegated phase runs remotely
