---
description: Refresh cumulative project documentation based on task changes
argument-hint: "<task-ref> [--auto] [--channel <current|claude-code|codex|openclaw|opencode|antigravity|pi>]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
---

# Dev Docs

Execute phase 9 (Documentation) of the 9-phase pipeline. Refreshes the canonical cumulative docs affected by a task.

**Shortcut for:** `/rd3:dev-run {task-ref} --profile docs`

## When to Use

- After implementation and review are complete
- Architecture, developer workflow, or user-visible behavior changed
- A bug fix or investigation produced a durable lesson worth preserving

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
# Default: current channel
Skill(skill="rd3:orchestration-v2", args="{task-ref} --profile docs --channel current")

# Execute on another channel
Skill(skill="rd3:orchestration-v2", args="{task-ref} --profile docs --channel codex")
```

## Canonical Docs Refreshed

- `docs/01_ARCHITECTURE_SPEC.md`: architecture and system boundaries
- `docs/02_DEVELOPER_SPEC.md`: internal developer-facing functional guidance
- `docs/03_USER_MANUAL.md`: user-facing usage documentation
- `docs/99_EXPERIENCE.md`: durable lessons from bugs, fixes, and debugging

The skill should update only the relevant subset for the task. It should not create boilerplate or duplicate the task narrative across all four files.

If a refreshed doc needs a diagram, write it as Mermaid in a fenced markdown block.

## Examples

```bash
/rd3:dev-docs 0274
/rd3:dev-docs 0274 --auto
/rd3:dev-docs 0274 --channel codex
```

## See Also

- **/rd3:dev-run**: Profile-driven pipeline execution
- **rd3:code-docs**: Cumulative documentation refresh skill
