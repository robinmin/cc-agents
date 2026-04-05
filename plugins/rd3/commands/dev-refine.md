---
description: Refine task requirements via structured quality analysis, optionally on another execution channel
argument-hint: "<task-ref> [--auto] [--channel <auto|current|claude-code|codex|openclaw|opencode|antigravity|pi>]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
---

# Dev Refine

Refine task requirements by analyzing existing content for quality issues and improving them through targeted Q&A.

**Shortcut for:** `/rd3:dev-run {task-ref} --preset refine`

## When to Use

- Task has vague or incomplete Requirements section
- Requirements lack acceptance criteria or testability
- Background section is too brief
- Profile needs to be assigned or validated

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `task-ref` | Yes | WBS number or file path |
| `--auto` | No | Auto-approve gates |
| `--channel <auto\|current\|claude-code\|codex\|openclaw\|opencode\|antigravity\|pi>` | No | Execution channel for delegated skills. Default: `auto` |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0274` |
| Ends with `.md` | File path | `docs/tasks2/0274_*.md` |

## Workflow

Resolves `--channel` (default: `auto`) and forwards it to **rd3:orchestration-v2**. `auto` means "use the configured default backend"; `current` is kept as a deprecated compatibility alias.

```
# Default: execute on the auto-routed channel
Skill(skill="rd3:orchestration-v2", args="{task-ref} --preset refine --channel auto")

# Optional: bypass any future human gates on the auto-routed channel
Skill(skill="rd3:orchestration-v2", args="{task-ref} --preset refine --auto --channel auto")

# Execute the same workflow on another channel
Skill(skill="rd3:orchestration-v2", args="{task-ref} --preset refine --channel codex")
```

## Examples

```bash
/rd3:dev-refine 0274
/rd3:dev-refine docs/tasks2/0274_add_dev_slash_commands.md
/rd3:dev-refine 0274 --channel opencode
```

## See Also

- **/rd3:dev-run**: Profile-driven pipeline execution
- **rd3:request-intake**: Requirements elicitation skill
- **rd3:run-acp**: ACP executor used by orchestration when a delegated phase runs remotely
