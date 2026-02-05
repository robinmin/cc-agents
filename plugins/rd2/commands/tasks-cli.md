---
description: Task management CLI with TodoWrite integration and kanban board sync
argument-hint: <create|list|update|open|refresh|sync|init|help> [args]
allowed-tools:
  - Bash
---

# tasks - Task Management CLI

Simple wrapper for the `rd2:tasks` skill. Manages markdown-based tasks with WBS numbers, kanban board sync, and automatic TodoWrite integration.

**Requirements**: Git repository, Python 3.7+

## First-Time Setup

Initialize the tasks system before first use:

```bash
/tasks init
```

This creates:
- `docs/prompts/` directory for task files
- `.kanban.md` board for visual tracking
- Symlink in `$HOMEBREW_PREFIX/bin` for direct `tasks` command

## Usage

```bash
/tasks <subcommand> [arguments]
```

### Common Workflows

```bash
# Create and manage tasks
/rd2:tasks-cli create "Implement OAuth2 authentication"
/rd2:tasks-cli list wip
/rd2:tasks-cli update 47 testing
/rd2:tasks-cli update 47 done

# Resume work across sessions
/rd2:tasks-cli sync restore

# View all commands
/rd2:tasks-cli help
```

## Execution

The command delegates to the underlying Python script:

```bash
# If symlink exists (after init)
tasks <subcommand> [arguments]

# Fallback (full path)
python3 "${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py" <subcommand> [arguments]
```

**Output**: Formatted markdown (enhanced with `glow` if installed)

## Subcommands

| Command   | Arguments           | Description                        | When to Use          |
|-----------|---------------------|------------------------------------|----------------------|
| `init`    | -                   | Initialize task management system  | First-time setup     |
| `create`  | `"Task Name"`       | Create new task file               | Planning phase       |
| `list`    | `[stage]`           | List tasks (optional stage filter) | Status check         |
| `update`  | `<WBS> <stage>`     | Update task status                 | Move workflow        |
| `open`    | `<WBS>`             | Open task file in editor           | View/edit details    |
| `refresh` | -                   | Refresh kanban board view          | Sync after edits     |
| `sync`    | `restore`           | Restore active tasks to TodoWrite  | Session resume       |
| `help`    | -                   | Show help message                  | Command reference    |

**Valid Stages**: `Backlog`, `Todo`, `WIP`, `Testing`, `Done`

**Aliases**: `wip`/`in-progress`/`working` → WIP; `done`/`completed`/`finished` → Done

**WBS Format**: 1-4 digits (e.g., `47`, `0047`)

## TodoWrite Integration

Tasks automatically sync with Claude Code's built-in TodoWrite. Complex items are auto-promoted to persistent tasks based on:

- **Complex keywords**: implement, refactor, design, integrate, etc.
- **Content length**: >50 characters
- **Active work**: `in_progress` status
- **Multi-step**: Contains numbered/bulleted lists

Use `tasks sync restore` to resume active tasks across sessions.

## Error Handling

| Error                  | Resolution                                            |
|------------------------|-------------------------------------------------------|
| **No subcommand**      | Display help message                                  |
| **Invalid subcommand** | "Unknown command. Run `/tasks help` for usage."       |
| **Invalid WBS format** | "Invalid WBS. Expected 1-4 digits (e.g., 47, 0047)"  |
| **Not in git repo**    | "Run from a git project root directory"               |
| **Invalid stage**      | "Valid stages: Backlog, Todo, WIP, Testing, Done"     |
| **Script not found**   | "Run `/tasks init` to set up the tasks system"        |

## Further Reading

For detailed documentation, see the `rd2:tasks` skill:

- **Main Guide**: `plugins/rd2/skills/tasks/SKILL.md` - Complete feature documentation
- **TodoWrite Integration**: `references/README_INTEGRATION.md` - Auto-promotion details
- **Quick Setup**: `references/QUICK_INTEGRATION_GUIDE.md` - 5-minute setup guide
- **Architecture**: `references/architecture.md` - System design and data flow
