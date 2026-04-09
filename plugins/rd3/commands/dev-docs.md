---
description: Refresh cumulative project documentation based on task changes
argument-hint: "<task-ref> [--auto] [--channel <auto|current|claude-code|codex|openclaw|opencode|antigravity|pi>] [--source <path>] [--architecture <path>] [--spec <path>] [--user-manual <path>]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
---

# Dev Docs

Execute phase 9 (Documentation) of the 9-phase pipeline. Refreshes the canonical cumulative docs affected by a task.

**Shortcut for:** `/rd3:dev-run {task-ref} --preset docs`

## When to Use

- After implementation and review are complete
- Architecture, developer workflow, or user-visible behavior changed
- A bug fix or investigation produced a durable lesson worth preserving

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `task-ref` | Yes | WBS number or file path |
| `--auto` | No | Auto-approve gates |
| `--channel <auto\|current\|claude-code\|codex\|openclaw\|opencode\|antigravity\|pi>` | No | Execution channel for delegated skills. Default: `auto` |
| `--source <path>` | No | Source code path. Default: `.` (project root) |
| `--architecture <path>` | No | Architecture document path. Default: `docs/01_ARCHITECTURE_SPEC.md` |
| `--spec <path>` | No | Functional spec document path. Default: `docs/02_DEVELOPER_SPEC.md` |
| `--user-manual <path>` | No | User manual document path. Default: `docs/03_USER_MANUAL.md` |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0274` |
| Ends with `.md` | File path | `docs/tasks2/0274_*.md` |

## Workflow

Resolves `--channel` (default: `local`) and forwards it to **rd3:orchestration-v2**. `auto` means "use the orchestrator default" and currently resolves to `local`; `current` remains a deprecated compatibility alias.

```
# Default: orchestrator default executor with default doc paths
Skill(skill="rd3:orchestration-v2", args="{task-ref} --preset docs --source . --architecture docs/01_ARCHITECTURE_SPEC.md --spec docs/02_DEVELOPER_SPEC.md --user-manual docs/03_USER_MANUAL.md")

# Execute on another channel with custom paths
Skill(skill="rd3:orchestration-v2", args="{task-ref} --preset docs --channel codex --source ./src --architecture docs/ARCH.md --spec docs/SPEC.md --user-manual docs/MANUAL.md")
```

## Canonical Docs Refreshed

Default paths (customizable via arguments):

- `--architecture` (default: `docs/01_ARCHITECTURE_SPEC.md`): architecture and system boundaries
- `--spec` (default: `docs/02_DEVELOPER_SPEC.md`): internal developer-facing functional guidance
- `--user-manual` (default: `docs/03_USER_MANUAL.md`): user-facing usage documentation
- `docs/99_EXPERIENCE.md`: durable lessons from bugs, fixes, and debugging (always fixed path)

The skill should update only the relevant subset for the task. It should not create boilerplate or duplicate the task narrative across all four files.

If a refreshed doc needs a diagram, write it as Mermaid in a fenced markdown block.

## Examples

```bash
/rd3:dev-docs 0274
/rd3:dev-docs 0274 --auto
/rd3:dev-docs 0274 --channel codex
/rd3:dev-docs 0274 --source ./src
/rd3:dev-docs 0274 --architecture docs/ARCH.md --spec docs/SPEC.md --user-manual docs/MANUAL.md
/rd3:dev-docs 0274 --source ./src --architecture docs/ARCH.md --spec docs/SPEC.md --user-manual docs/MANUAL.md --channel codex
```

## See Also

- **/rd3:dev-run**: Profile-driven pipeline execution
- **rd3:code-docs**: Cumulative documentation refresh skill
