---
description: Execute architecture, design, and task decomposition for a task, optionally on another execution channel
argument-hint: "<task-ref> [--auto] [--channel <current|claude-code|codex|openclaw|opencode|antigravity|pi>]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
---

# Dev Plan

Execute phases 2-4 of the 9-phase pipeline: Architecture, Design, and Task Decomposition.

**Shortcut for:** `/rd3:dev-run {task-ref} --profile plan`

## When to Use

- After requirements are refined (via `/rd3:dev-refine`)
- Task needs architecture and design before implementation
- Breaking down a task into implementable subtasks

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `task-ref` | Yes | WBS number or file path |
| `--auto` | No | Auto-approve gates |
| `--channel <current\|claude-code\|codex\|openclaw\|opencode\|antigravity\|pi>` | No | Execution channel for delegated skills. Default: `current` |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0274` |
| Ends with `.md` | File path | `docs/tasks2/0274_*.md` |

## Workflow

Resolves `--channel` (default: `current`) and forwards it to **rd3:orchestration-v2**. The orchestrator decides whether delegated work stays local or uses **rd3:run-acp** for ACP-backed execution.

```
# Default: execute on the current channel
Skill(skill="rd3:orchestration-v2", args="{task-ref} --profile plan --channel current")

# Optional: bypass the design gate on the current channel
Skill(skill="rd3:orchestration-v2", args="{task-ref} --profile plan --auto --channel current")

# Execute the same workflow on another channel
Skill(skill="rd3:orchestration-v2", args="{task-ref} --profile plan --channel codex")
```

## Examples

```bash
/rd3:dev-plan 0274
/rd3:dev-plan docs/tasks2/0274_add_dev_slash_commands.md
/rd3:dev-plan 0274 --channel codex
```

## See Also

- **/rd3:dev-run**: Profile-driven pipeline execution
- **/rd3:dev-refine**: Refine requirements (phase 1)
- **rd3:run-acp**: ACP executor used by orchestration when a delegated phase runs remotely
