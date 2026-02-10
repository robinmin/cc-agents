---
description: Task management CLI with kanban board sync and multi-folder support
argument-hint: <create|list|update|batch-create|check|open|refresh|config|decompose|init|help> [args]
allowed-tools:
  - Bash
---

# tasks - Task Management CLI

Simple wrapper for the `rd2:tasks` skill. Manages markdown-based tasks with WBS numbers, kanban board sync, and multi-folder support.

**Requirements**: Git repository, Python 3.7+

## First-Time Setup

Initialize the tasks system before first use:

```bash
/tasks init
```

This creates:
- `docs/.tasks/` centralized metadata directory with `config.jsonc`
- `docs/prompts/` directory for task files
- Kanban board for visual tracking
- Symlink in `$HOMEBREW_PREFIX/bin` for direct `tasks` command

## Usage

```bash
/tasks <subcommand> [arguments]
```

### Common Workflows

```bash
# 1. Create tasks (basic)
/rd2:tasks-cli create "Implement OAuth2 authentication"

# 2. Create tasks with rich content (NEW in 0181)
/rd2:tasks-cli create "Feature" --background "Context" --requirements "Criteria"
/rd2:tasks-cli create --from-json task.json

# 3. Batch creation (NEW in 0178)
/rd2:tasks-cli batch-create --from-json tasks.json
/rd2:tasks-cli batch-create --from-agent-output brainstorm-output.md

# 4. List and view tasks
/rd2:tasks-cli list wip
/rd2:tasks-cli check 47                    # Validate single task
/rd2:tasks-cli check                       # Validate all tasks
/rd2:tasks-cli open 47

# 5. Update task status (with validation)
/rd2:tasks-cli update 47 wip               # Blocked if Background/Requirements empty
/rd2:tasks-cli update 47 wip --force       # Bypass validation warnings
/rd2:tasks-cli update 47 testing
/rd2:tasks-cli update 47 done

# 6. Granular progress tracking (NEW in 0182)
/rd2:tasks-cli update 47 --phase planning completed
/rd2:tasks-cli update 47 --phase implementation in_progress
/rd2:tasks-cli update 47 --phase implementation completed    # Auto-advances status to WIP
/rd2:tasks-cli update 47 --phase testing completed           # Auto-advances to Done

# 7. Content management
/rd2:tasks-cli update 47 --section Design --from-file /tmp/0047_design.md
/rd2:tasks-cli update 47 --section Artifacts --append-row "diagram|docs/arch.png|agent|2026-02-10"

# 8. Task decomposition
/rd2:tasks-cli decompose "Build authentication system"

# 9. Multi-folder configuration
/rd2:tasks-cli config
/rd2:tasks-cli config set-active docs/next-phase

# 10. View help
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

| Command        | Arguments                          | Description                        | When to Use          |
|----------------|------------------------------------|------------------------------------|----------------------|
| `init`         | -                                  | Initialize task management system  | First-time setup     |
| `create`       | `"Name" [--background] [--requirements]` | Create new task file         | Planning phase       |
| `create`       | `--from-json FILE`                 | Create from JSON definition        | Automated creation   |
| `batch-create` | `--from-json FILE`                 | Create multiple tasks from array   | Bulk task creation   |
| `batch-create` | `--from-agent-output FILE`         | Create tasks from agent footer     | Agent integration    |
| `list`         | `[stage]`                          | List tasks (optional stage filter) | Status check         |
| `update`       | `<WBS> <stage> [--force]`          | Update task status (with validation) | Move workflow      |
| `update`       | `<WBS> --phase <phase> <status> [--force]` | Update impl_progress phase (auto-advances status) | Granular tracking |
| `update`       | `<WBS> --section <name> --from-file <path>` | Update a section's content from a file | Content population |
| `update`       | `<WBS> --section Artifacts --append-row "t\|p\|a\|d"` | Append row to Artifacts table | Artifact tracking |
| `check`        | `[WBS]`                            | Validate all tasks, single task, or check CLI setup | Quality check |
| `open`         | `<WBS>`                            | Open task file in editor           | View/edit details    |
| `refresh`      | -                                  | Refresh kanban board view          | Sync after edits     |
| `config`       | `[subcommand]`                     | Show/modify configuration          | Multi-folder setup   |
| `log`          | `<prefix> [--data]`                | Log developer events               | Debugging            |
| `decompose`    | `"Requirement" [--parent WBS]`     | Break requirement into subtasks    | Task breakdown       |
| `help`         | -                                  | Show help message                  | Command reference    |

**Valid Stages**: `Backlog`, `Todo`, `WIP`, `Testing`, `Done`

**Aliases**: `wip`/`in-progress`/`working` → WIP; `done`/`completed`/`finished` → Done

**WBS Format**: 1-4 digits (e.g., `47`, `0047`)

**Impl Phases**: `planning`, `design`, `implementation`, `review`, `testing`

**Phase Statuses**: `pending`, `in_progress`, `completed`, `blocked`

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
- **Architecture**: `references/architecture.md` - System design and data flow
