---
name: tasks
description: This skill should be used when managing markdown-based task files with WBS numbers, multi-folder storage, centralized metadata, or kanban board sync. Triggers on "create task", "tasks create", "list tasks", "update status", "update section", "tasks config", "tasks init", "add folder", "set active folder", WBS references (0047, task 47), and multi-folder configuration.
---

# Tasks

## Overview

Manages markdown-based task files with centralized metadata, multi-folder storage, and automatic kanban board synchronization. Each task gets a globally unique WBS number (e.g., 0047) and is stored in configurable task folders. Metadata lives in `docs/.tasks/` with project-level configuration via `config.jsonc`.

## When to Use

**Activate this skill when:**
- User mentions: "create task", "update task status", "list tasks", "tasks wip/done"
- User references WBS numbers: "0047", "task 47", "update 48"
- Managing task files with kanban board across one or more folders
- Updating task sections: "update design", "add plan", "populate Q&A"
- Configuring multi-folder task storage: "add folder", "set active folder"
- Running `tasks init` to set up or migrate a project

**Do NOT use for:**
- Simple ephemeral todos (use Claude Code's built-in Task tools directly)
- Non-project task management
- Tasks that don't need cross-session persistence

## Quick Start

### Always Use `tasks` Command

**ALWAYS use the `tasks` command** — never the Python script directly. The `tasks` command ensures the correct Python environment.

```bash
# First time only (before init):
python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py init

# After init, ALWAYS use:
tasks <command>
```

### Core Commands

```bash
# Initialize
tasks init

# Create tasks
tasks create "Feature X"
tasks create "Feature" --background "Context" --requirements "Criteria"

# Update status
tasks update 47 wip        # Validates: Background + Requirements + Design
tasks update 47 testing    # Validates: + Plan
tasks update 47 done

# Update sections (ALWAYS use --section --from-file)
tasks update 47 --section Design --from-file /tmp/design.md

# View tasks
tasks list
tasks list wip
tasks show 47    # Agents: view task content
tasks open 47    # Humans: open in GUI editor

# Validation
tasks check      # Validate all tasks
tasks check 47   # Validate single task
```

### `show` vs `open`

- **`tasks show <WBS>`** — Agents view task content (uses glow)
- **`tasks open <WBS>`** — Humans open in GUI editor

## Critical Rules

### Task Lifecycle

`Create → Populate Sections → Execute → Close`

**ALWAYS** populate Background, Requirements, and Design BEFORE moving to WIP. Validation enforces this.

### Use `--section --from-file`

**ALWAYS** update section content this way:

```bash
# Write content to temp file
Write("/tmp/0048_design.md", "## Architecture\n\n...")
# Update via CLI
tasks update 0048 --section Design --from-file /tmp/0048_design.md
```

### NEVER

- **DON'T** create skeleton tasks without Background/Requirements
- **DON'T** use `tasks open` in agent workflows — use `tasks show`
- **DON'T** edit status frontmatter directly — use `tasks update`
- **DON'T** use Write tool on task files — use CLI commands

## Core Principles

- **Global WBS uniqueness** — Numbers never collide across folders
- **Short WBS accepted** — `47` and `0047` are equivalent
- **Cross-folder search** — Commands find tasks in ANY folder
- **Validation enforced** — Status transitions validate section content
- **Bidirectional sync** — impl_progress phases and status stay in sync

## Status Flow

`Backlog → Todo → WIP → Testing → Done`

See [Status Aliases](references/status-aliases.md) for all accepted aliases.

## References

- [Command Reference](references/command-reference.md) - Full command table
- [Status Aliases](references/status-aliases.md) - Aliases and phases
- [Validation](references/validation.md) - Validation matrix, tiered validation
- [impl_progress](references/impl-progress.md) - Phase tracking
- [Workflows](references/workflows.md) - Multi-agent and multi-phase workflows
- [Multi-Folder](references/multi-folder.md) - Cross-folder operations
- [Structured Output](references/structured-output.md) - Agent output format
- [Batch Creation](references/batch-creation.md) - Rich task creation
- [Troubleshooting](references/troubleshooting.md) - Error solutions
- [Best Practices](references/best-practices.md) - Quality guidelines
- [Architecture](references/architecture.md) - Component details

## Configuration

```bash
tasks config                              # Show config
tasks config add-folder docs/v2 --base-counter 200 --label "V2"
tasks config set-active docs/v2
```

## Error Handling

| Error | Solution |
|-------|----------|
| "Not in a git repository" | Run from a git-tracked directory |
| "Kanban file not found" | Run `tasks init` first |
| "No task found with WBS" | Use `tasks list` to find tasks |
| "Invalid WBS number" | Use 1-4 digits: `47` or `0047` |
| "Section empty" | Use `--section --from-file` to populate |
| "Section not found" | Check template matches `### Heading` exactly |
