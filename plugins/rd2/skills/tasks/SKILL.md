---
name: tasks
description: This skill should be used when managing markdown-based task files with WBS numbers, multi-folder storage, centralized metadata, or kanban board sync. Triggers on "create task", "tasks create", "list tasks", "update status", "tasks config", "tasks init", "add folder", "set active folder", WBS references (0047, task 47), and multi-folder configuration.
---

# Tasks

## Overview

Manages markdown-based task files with centralized metadata, multi-folder storage, and automatic kanban board synchronization. Each task gets a globally unique WBS number (e.g., 0047) and is stored in configurable task folders. Metadata lives in `docs/.tasks/` with project-level configuration via `config.jsonc`.

## When to Use

**Activate this skill when:**

- User mentions: "create task", "update task status", "list tasks", "tasks wip/done"
- User references WBS numbers: "0047", "task 47", "update 48"
- Managing task files with kanban board across one or more folders
- Configuring multi-folder task storage: "add folder", "set active folder"
- Running `tasks init` to set up or migrate a project
- Coordinating multi-phase work with status tracking
- Need project-level task visibility

**Do NOT use for:**

- Simple ephemeral todos (use Claude Code's built-in Task tools directly)
- Non-project task management
- Tasks that don't need cross-session persistence

## Quick Start

### `tasks` : Symlink for Short Commands

Always try to use the `tasks` command for convenience. If not available, use the full path:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py init
```

This initializes the tasks system and creates a symlink in `$HOMEBREW_PREFIX/bin`.

### Core Commands

```bash
# Initialize tasks system (creates docs/.tasks/, migrates metadata)
tasks init

# Task management
tasks create "Implement feature X"
tasks list
tasks list wip
tasks update 47 testing
tasks update 0047 done
tasks refresh

# Configuration management
tasks config                              # Show current config
tasks config add-folder docs/next-phase --base-counter 200 --label "Phase 2"
tasks config set-active docs/next-phase   # Switch active folder

# Multi-folder operations
tasks create "New task" --folder docs/next-phase  # Override active folder
tasks update 47 wip                               # Finds task in ANY folder

```

## Critical Rules [ABSOLUTE]

### Task Creation: Two-Step Workflow [CRITICAL]

Creating a task is a **two-step process**. Step 2 is NOT optional.

**Step 1: Create the file** via CLI (handles WBS numbering, template, kanban sync):

```bash
tasks create "descriptive-task-name"
# Output: [INFO] Created task: docs/prompts/0048_descriptive-task-name.md
```

**Step 2: IMMEDIATELY populate Background and Requirements** using the `Edit` tool:

```
Edit(file_path="docs/prompts/0048_descriptive-task-name.md",
     old_string="[Context and motivation - why this task exists]",
     new_string="<actual background explaining WHY this task exists>")

Edit(file_path="docs/prompts/0048_descriptive-task-name.md",
     old_string="[What needs to be done - acceptance criteria]",
     new_string="- Requirement 1: ...\n- Requirement 2: ...\n- Acceptance: ...")
```

**A task file without Background and Requirements is useless.** Downstream agents cannot execute a skeleton task. If you don't have content for these sections yet, you are not ready to create the task.

### NEVER Create Task Files via Write Tool [CRITICAL]

A PreToolUse Write guard blocks direct file creation in task folders. This is intentional.

- `Write` to `docs/prompts/0048_*.md` → **BLOCKED** (bypasses WBS, template, kanban)
- `Edit` on existing task files → **ALLOWED** (for updating content sections)
- `tasks create` via CLI → **CORRECT** (handles all infrastructure)

### NEVER Edit Status Frontmatter Directly [CRITICAL]

**ALWAYS use `tasks update <WBS> <status>`** to change task status. Direct `Edit` on `status:` frontmatter bypasses kanban sync and audit logging.

## Core Principles

- **Global WBS uniqueness** -- WBS numbers never collide across folders. See [Global WBS Uniqueness](#global-wbs-uniqueness) for the algorithm.
- **Short WBS accepted** -- `tasks update 47 wip` and `tasks update 0047 wip` are equivalent.
- **Cross-folder search** -- `update` and `open` find tasks in ANY configured folder automatically.
- **Write guard enforced** -- Task files are protected from direct `Write` tool usage via PreToolUse hook. `Edit` tool is allowed for content updates only.
- **Git root detection** -- Works from any subdirectory.
- **Task tools aware** -- Works alongside Claude Code's built-in TaskCreate/TaskList/TaskUpdate tools.

## Centralized Metadata (`docs/.tasks/`)

After `tasks init`, all metadata lives in one place:

```
docs/.tasks/                      # Centralized metadata
├── config.jsonc                  # Project config with multi-folder support
├── kanban.md                     # Global kanban board
├── template.md                   # Task file template
├── brainstorm/                   # Brainstorm session outputs
├── codereview/                   # Code review outputs
├── design/                       # Design session outputs
└── sync/                         # Sync data
```

### `config.jsonc` Schema

Defines the active folder, folder registry with `base_counter` floors and labels, and a schema version. See [Architecture](references/architecture.md) for the full schema.

## Multi-Folder Task Storage

### Global WBS Uniqueness

WBS numbers are globally unique across ALL configured folders. The algorithm:

1. Scan all folders to find the global max WBS
2. Apply `base_counter` as a floor for the target folder
3. Return `max(global_max, base_counter) + 1`

This guarantees no WBS collisions without artificial ceilings.

### Cross-Folder Operations

- **`tasks update 47 wip`** -- finds task 0047 in ANY configured folder
- **`tasks open 47`** -- opens task from whichever folder contains it
- **`tasks refresh`** -- aggregates tasks from ALL folders into one kanban
- **`tasks create`** -- creates in the active folder (or `--folder` override)

### Adding a New Folder

```bash
# Add a second task folder with base_counter floor
tasks config add-folder docs/next-phase --base-counter 200 --label "Phase 2"

# Switch to it
tasks config set-active docs/next-phase

# Create tasks in the new folder
tasks create "New phase task"  # Gets WBS >= 201
```

## Claude Code Task Tools

This skill is the **persistent source of truth** for task management. Claude Code's built-in Task tools (TaskCreate, TaskList, TaskGet, TaskUpdate) serve as **session UI** — use them to track progress within a session, but always create and manage persistent tasks via `tasks` CLI.

## Command Reference

| Command     | Purpose                                            |
| ----------- | -------------------------------------------------- |
| `init`      | Initialize project (create docs/.tasks/, migrate)  |
| `create`    | Create new task files from work breakdown          |
| `update`    | Move tasks through lifecycle stages                |
| `list`      | View kanban board, monitor progress                |
| `open`      | View/edit task file details                        |
| `config`    | Show/modify project configuration                  |
| `log`       | Log developer events for debugging                 |
| `refresh`   | Regenerate kanban board from all task folders       |
| `decompose` | Break down requirement into subtasks               |

**Status Flow:** Backlog -> Todo -> WIP -> Testing -> Done

**Aliases:** wip, in-progress, working -> WIP | done, completed, finished -> Done

See [Status Aliases](references/status-aliases.md) for the full alias table.

## Workflows

### Multi-Agent Workflow

```
User Request
     |
Planning Phase
     |
     tasks create "Implement feature"
     |
     Creates: docs/prompts/0048_implement_feature.md
     |
Execution Phase
     |
     tasks update 48 wip
     |
     [Implementation work happens here]
     |
     tasks update 48 testing
     |
Monitoring / Review Phase
     |
     tasks list
     tasks update 48 done
```

### Typical Multi-Phase Project

1. Run `tasks init` to create `docs/.tasks/` structure
2. Create tasks in the default folder: `tasks create "Feature X"`
3. When a new project phase starts: `tasks config add-folder docs/v2 --base-counter 200 --label "V2"`
4. Switch active folder: `tasks config set-active docs/v2`
5. New tasks get WBS >= 201; old tasks remain findable via cross-folder search
6. `tasks refresh` aggregates all folders into one kanban board

## Architecture

**Config mode** (with `docs/.tasks/config.jsonc`): Centralized metadata in `docs/.tasks/`, task files in any configured folder, global kanban board.

**Legacy mode** (no config.jsonc): Single folder `docs/prompts/` with colocated `.kanban.md` and `.template.md`. Run `tasks init` to migrate.

| Mode | Trigger | Metadata Location | Multi-Folder |
|------|---------|-------------------|-------------|
| **Legacy** | No `docs/.tasks/config.jsonc` | `docs/prompts/.kanban.md`, `.template.md` | Single folder only |
| **Config** | `docs/.tasks/config.jsonc` exists | `docs/.tasks/` centralized | Multiple folders |

For component details (TasksConfig, TaskFile), data flow, and the WBS algorithm, see [Architecture](references/architecture.md).

**References:**

- [Architecture](references/architecture.md) - Component details, WBS algorithm, data flow
- [Status Aliases](references/status-aliases.md) - 15+ supported aliases
- [Assets](references/assets.md) - Default kanban and template files

## Configuration

### Project Configuration

Run `tasks init` to create `docs/.tasks/config.jsonc`. Manage with:

```bash
tasks config                                     # Show config
tasks config set-active docs/next-phase          # Change active folder
tasks config add-folder docs/v2 --base-counter 300 --label "V2"
```

### Templates

Edit `docs/.tasks/template.md` to customize new task format. Default template includes frontmatter (name, status, timestamps, impl_progress) and sections (Background, Requirements, Q&A, Design, Plan, Artifacts, References). See [Assets](references/assets.md) for details.

### `--folder` Flag

Any command accepts `--folder` to override the active folder:

```bash
tasks create "New task" --folder docs/next-phase
tasks list --folder docs/next-phase
```

### Optional: Glow

For better markdown rendering: `brew install glow` (macOS)

## Troubleshooting

### "Not in a git repository"

**Problem**: Running tasks commands outside a git repository
**Solution**: Ensure you're in a git-tracked directory or run `git init`

### "Kanban file not found"

**Problem**: Kanban board not initialized
**Solution**: Run `tasks init` to create `docs/.tasks/` structure

### "No task found with WBS"

**Problem**: Task file doesn't exist in any configured folder
**Solution**: List tasks to see available WBS numbers: `tasks list`

### "Invalid WBS number"

**Problem**: WBS must be 1-4 digits
**Solution**: Use valid WBS format: `tasks update 47 wip` or `tasks update 0047 wip`

## Best Practices

### Task Creation Quality

**ALWAYS populate Background and Requirements immediately after `tasks create`.** A skeleton task is worse than no task — it creates a false sense of progress.

**Good workflow:**
```bash
tasks create "add-oauth2-authentication"
# Then IMMEDIATELY Edit the file to add:
#   Background: why this is needed, context, motivation
#   Requirements: acceptance criteria as bullet points
```

**Bad workflow:**
```bash
tasks create "add-oauth2-authentication"
# ... move on to other work, leaving skeleton file behind
```

### Task Naming

**Good:** "add-user-authentication", "fix-memory-leak-in-parser"
**Avoid:** "stuff", "fix-bug", "task1"

### Multi-Folder Organization

- Use `base_counter` to give each folder a WBS range floor (e.g., Phase 2 starts at 200)
- Set meaningful labels for folder identification in `tasks config`
- Keep the `active_folder` set to your current working phase

### Bulk Operations

```bash
# Move multiple tasks
for wbs in 47 48 49; do
    tasks update $wbs todo
done
```
