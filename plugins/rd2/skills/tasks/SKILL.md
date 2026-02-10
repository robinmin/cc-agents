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

# Task creation
tasks create "Implement feature X"
tasks create "Feature" --background "Context" --requirements "Criteria"
tasks create --from-json task.json
tasks create --from-stdin
tasks batch-create --from-json tasks.json
tasks batch-create --from-agent-output output.md

# Section updates (use --section --from-file for ALL section updates)
tasks update 47 --section Design --from-file /tmp/0047_design.md
tasks update 47 --section Plan --from-file /tmp/0047_plan.md
tasks update 47 --section "Q&A" --from-file /tmp/0047_qa.md
tasks update 47 --section Background --from-file /tmp/0047_bg.md
tasks update 47 --section Artifacts --append-row "diagram|docs/arch.png|agent|2026-02-10"

# Status management
tasks update 47 wip                                    # Validates: Background + Requirements + Design
tasks update 47 testing                                # Validates: + Plan
tasks update 47 done
tasks update 47 wip --force                            # Bypass validation warnings

# Phase tracking
tasks update 47 --phase implementation completed
tasks update 47 --phase testing completed --force

# Monitoring
tasks list
tasks list wip
tasks check                          # Validate all tasks across all folders
tasks check 47                       # Validate a single task
tasks refresh                        # Regenerate kanban board

# Configuration management
tasks config                              # Show current config
tasks config add-folder docs/next-phase --base-counter 200 --label "Phase 2"
tasks config set-active docs/next-phase   # Switch active folder

# Multi-folder operations
tasks create "New task" --folder docs/next-phase  # Override active folder
tasks update 47 wip                               # Finds task in ANY folder
```

## Critical Rules [ABSOLUTE]

### Task Lifecycle: Create → Design → Execute [CRITICAL]

Every task MUST go through this lifecycle. Validation enforces it:

```
┌─────────────┐    ┌──────────────────────┐    ┌─────────────┐    ┌──────────┐
│   CREATE    │───>│  POPULATE SECTIONS   │───>│  EXECUTE    │───>│  CLOSE   │
│             │    │                      │    │             │    │          │
│ tasks create│    │ --section Background │    │ update WIP  │    │ update   │
│ --background│    │ --section Require... │    │ (validates) │    │ done     │
│ --require.. │    │ --section Design     │    │             │    │          │
│             │    │ --section Solution * │    │             │    │          │
│             │    │ --section Plan       │    │             │    │          │
└─────────────┘    │ --section Q&A        │    └─────────────┘    └──────────┘
                   └──────────────────────┘
                   * Solution is REQUIRED before WIP
```

### Validation Matrix [CRITICAL]

Validation blocks status transitions when required sections are empty or placeholder-only:

| Section          | Backlog/Todo |    WIP     |  Testing   |    Done    |
| ---------------- | :----------: | :--------: | :--------: | :--------: |
| **Background**   |      -       |  required  |  required  |  required  |
| **Requirements** |      -       |  required  |  required  |  required  |
| **Solution**     |      -       |  required  |  required  |  required  |
| **Design**       |      -       | suggestion | suggestion | suggestion |
| **Plan**         |      -       | suggestion | suggestion | suggestion |
| **Q&A**          |      -       |  optional  |  optional  |  optional  |
| **Artifacts**    |      -       |  optional  |  optional  |  optional  |
| **References**   |      -       | suggestion | suggestion | suggestion |

- **required** = Tier 2 warning, blocks unless `--force`
- **optional** = no check
- **suggestion** = Tier 3, informational only

### Updating Task Sections: Use `--section --from-file` [CRITICAL]

This is the **universal mechanism** for updating ANY section content after creation — including Background, Requirements, Design, Plan, Q&A, References, and custom sections:

```bash
# Write content to a temp file (use WBS prefix to avoid conflicts)
Write("/tmp/0048_design.md", "## Architecture\n\nThe system uses...")

# Update the section via CLI
tasks update 0048 --section Design --from-file /tmp/0048_design.md
tasks update 0048 --section Plan --from-file /tmp/0048_plan.md
tasks update 0048 --section "Q&A" --from-file /tmp/0048_qa.md
tasks update 0048 --section Background --from-file /tmp/0048_bg.md
tasks update 0048 --section Requirements --from-file /tmp/0048_req.md

# For Artifacts table, use --append-row (pipe-delimited: type|path|generated_by|date)
tasks update 0048 --section Artifacts --append-row "diagram|docs/arch.png|super-architect|2026-02-10"
```

**Properties:**

- Replaces entire section content between `### Heading` and next `### ` (idempotent)
- Updates `updated_at` timestamp automatically
- Works for any `### Heading` including custom template sections
- Avoids shell escaping issues — content is always in a file, never inline
- `--append-row` is additive (for Artifacts table only)

### Task Creation: Content is Mandatory [CRITICAL]

**Preferred: Single-step with rich flags** (no Edit needed):

```bash
tasks create "descriptive-task-name" \
  --background "Why this task exists" \
  --requirements "What needs to be done"
```

**Alternative: Two-step workflow** (Step 2 is NOT optional):

```bash
# Step 1: Create the file
tasks create "descriptive-task-name"

# Step 2: IMMEDIATELY populate sections via --section --from-file
Write("/tmp/0048_background.md", "Why this task exists...")
tasks update 0048 --section Background --from-file /tmp/0048_background.md

Write("/tmp/0048_requirements.md", "- Requirement 1\n- Requirement 2")
tasks update 0048 --section Requirements --from-file /tmp/0048_requirements.md
```

**A task file without Background and Requirements is useless.** Validation blocks advancing skeleton tasks past Backlog/Todo.

### NEVER Create Task Files via Write Tool [CRITICAL]

A PreToolUse Write guard blocks direct file creation in task folders. This is intentional.

- `Write` to `docs/prompts/0048_*.md` → **BLOCKED** (bypasses WBS, template, kanban)
- `Edit` on existing task files → **ALLOWED** (for minor inline fixes)
- `tasks create` via CLI → **CORRECT** (handles all infrastructure)
- `tasks update --section` → **CORRECT** (for section content updates)

### NEVER Edit Status Frontmatter Directly [CRITICAL]

**ALWAYS use `tasks update <WBS> <status>`** to change task status. Direct `Edit` on `status:` frontmatter bypasses kanban sync, validation, impl_progress sync, and audit logging.

## Core Principles

- **Global WBS uniqueness** — WBS numbers never collide across folders. See [Global WBS Uniqueness](#global-wbs-uniqueness).
- **Short WBS accepted** — `tasks update 47 wip` and `tasks update 0047 wip` are equivalent.
- **Cross-folder search** — `update`, `open`, and `check` find tasks in ANY configured folder automatically.
- **Write guard enforced** — Task files are protected from direct `Write` tool usage via PreToolUse hook.
- **Validation enforced** — Status transitions validate section content. Use `--force` to bypass warnings.
- **Bidirectional sync** — impl_progress phases and task status stay in sync automatically.
- **Git root detection** — Works from any subdirectory.
- **Task tools aware** — Works alongside Claude Code's built-in TaskCreate/TaskList/TaskUpdate tools.

## Command Reference

| Command        | Usage                                                              | Purpose                                           |
| -------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| `init`         | `tasks init`                                                       | Initialize project (create docs/.tasks/, migrate) |
| `create`       | `tasks create "name" [--background TEXT] [--requirements TEXT]`    | Create new task file with optional content        |
| `create`       | `tasks create --from-json FILE` or `--from-stdin`                  | Create from JSON definition                       |
| `batch-create` | `tasks batch-create --from-json FILE`                              | Create multiple tasks from JSON array             |
| `batch-create` | `tasks batch-create --from-agent-output FILE`                      | Create tasks from structured agent footer         |
| `update`       | `tasks update <WBS> <stage> [--force]`                             | Change task status (with validation)              |
| `update`       | `tasks update <WBS> --section <name> --from-file <path>`           | Update section content from file                  |
| `update`       | `tasks update <WBS> --section Artifacts --append-row "t\|p\|a\|d"` | Append Artifacts table row                        |
| `update`       | `tasks update <WBS> --phase <phase> <status> [--force]`            | Update impl_progress phase                        |
| `check`        | `tasks check`                                                      | Validate ALL tasks across all folders             |
| `check`        | `tasks check <WBS>`                                                | Validate a single task (shows phase progress)     |
| `list`         | `tasks list [stage]`                                               | View kanban board, filter by stage                |
| `open`         | `tasks open <WBS>`                                                 | Open task file in editor                          |
| `config`       | `tasks config`                                                     | Show current configuration                        |
| `config`       | `tasks config set-active <dir>`                                    | Change active folder                              |
| `config`       | `tasks config add-folder <dir> [--base-counter N] [--label TEXT]`  | Add new task folder                               |
| `refresh`      | `tasks refresh`                                                    | Regenerate kanban board from all folders          |
| `decompose`    | `tasks decompose "requirement" [--parent WBS]`                     | Break requirement into subtasks                   |
| `log`          | `tasks log <prefix> [--data JSON]`                                 | Log developer events                              |

### Status Reference

**Status Flow:** Backlog → Todo → WIP → Testing → Done

**Status Aliases:**

| Canonical | Accepted Aliases                            |
| --------- | ------------------------------------------- |
| Backlog   | backlog                                     |
| Todo      | todo, to-do, pending                        |
| WIP       | wip, in-progress, in_progress, working      |
| Testing   | testing, test, review, in-review            |
| Done      | done, completed, complete, finished, closed |
| Blocked   | blocked, failed, stuck, error               |

**Impl Phases:** planning, design, implementation, review, testing

**Phase Statuses:** pending, in_progress, completed, blocked

## Workflows

### Multi-Agent Workflow

```
User Request
     |
     v
Planning Phase
     |  tasks create "Implement feature" --background "..." --requirements "..."
     |  Creates: docs/prompts/0048_implement_feature.md
     v
Design Phase (REQUIRED before WIP)
     |  tasks update 48 --section Design --from-file /tmp/0048_design.md
     |  tasks update 48 --section Plan --from-file /tmp/0048_plan.md        (optional for WIP)
     |  tasks update 48 --section "Q&A" --from-file /tmp/0048_qa.md        (optional)
     v
Execution Phase
     |  tasks update 48 wip       (validates: Background + Requirements + Design)
     |  [Implementation work happens here]
     |  tasks update 48 --section Artifacts --append-row "code|src/auth.py|super-coder|2026-02-10"
     v
Review Phase
     |  tasks update 48 testing   (validates: + Plan)
     |  [Testing and review happens here]
     v
Completion
     |  tasks update 48 done
     |  tasks list
```

### Typical Multi-Phase Project

1. Run `tasks init` to create `docs/.tasks/` structure
2. Create tasks in the default folder: `tasks create "Feature X" --background "..." --requirements "..."`
3. Populate Design via `tasks update <WBS> --section Design --from-file ...`
4. When a new project phase starts: `tasks config add-folder docs/v2 --base-counter 200 --label "V2"`
5. Switch active folder: `tasks config set-active docs/v2`
6. New tasks get WBS >= 201; old tasks remain findable via cross-folder search
7. `tasks refresh` aggregates all folders into one kanban board

## Tiered Validation

Status transitions are validated against task content. This applies to both direct status updates (`tasks update 47 wip`) and `--phase` auto-advance:

| Tier       | Type              | Behavior                                                        |
| ---------- | ----------------- | --------------------------------------------------------------- |
| **Tier 1** | Structural errors | Always block (missing frontmatter)                              |
| **Tier 2** | Content warnings  | Block unless `--force` (empty Background/Requirements/Solution) |
| **Tier 3** | Suggestions       | Informational only (empty References)                           |

```bash
# Populate required sections before starting work
tasks update 47 --section Solution --from-file /tmp/0047_solution.md

# Now transition to WIP (validation passes)
tasks update 47 wip

# If required sections are empty, validation blocks:
tasks update 47 wip          # Blocked if Background, Requirements, or Solution is placeholder
tasks update 47 wip --force  # Bypass warnings

# Preview validation
tasks check 47               # Validate single task with phase breakdown
tasks check                  # Validate ALL tasks across all folders
```

### Bulk Validation

`tasks check` (without WBS) validates every task file across all configured folders:

```
[CHECK] Validated 179 tasks across 1 folder(s)

  0 errors, 12 warnings in 5 task(s):

  0042_feature.md (WIP): 0 errors, 2 warnings
  0043_bugfix.md (Todo): 0 errors, 1 warnings
```

## impl_progress Tracking

Tasks track granular progress across implementation phases via the `impl_progress` frontmatter field. Sync is **bidirectional**:

### Phase → Status (auto-compute)

When a phase is updated via `--phase`, the task status auto-advances (subject to validation):

```bash
# Update a specific phase
tasks update 47 --phase implementation in_progress
tasks update 47 --phase implementation completed
tasks update 47 --phase testing completed

# Status auto-computes:
# - Any blocked → Blocked
# - All completed → Done (if validation passes)
# - Any in_progress → WIP
# - Mixed completed/pending → WIP

# Auto-advance respects tiered validation:
tasks update 47 --phase testing completed         # Blocked if Design is placeholder
tasks update 47 --phase testing completed --force  # Bypass warnings
```

### Status → Phases (auto-sync)

When status is set directly, phases sync to match:

```bash
tasks update 47 done     # All phases → "completed"
tasks update 47 backlog  # All phases → "pending"
tasks update 47 wip      # No phase change (ambiguous)
```

### Phase Visibility

Phase progress is visible in:

- **`tasks check <WBS>`** — Shows phase breakdown: `[x]` completed, `[~]` in_progress, `[!]` blocked, `[ ]` pending
- **Kanban board** — WIP/Testing tasks show phase indicators inline after `tasks refresh`

## Rich Task Creation

Create tasks with pre-filled sections to avoid skeleton files:

```bash
# With inline content
tasks create "Feature X" --background "Users need OAuth for SSO" --requirements "Must support Google and GitHub providers"

# From JSON definition
tasks create --from-json task.json
# JSON: {"name": "...", "background": "...", "requirements": "..."}

# From stdin
echo '{"name": "Task", "background": "bg"}' | tasks create --from-stdin
```

## Batch Task Creation

Create multiple tasks at once from structured input:

```bash
# From JSON array
tasks batch-create --from-json tasks.json
# JSON: [{"name": "...", "background": "..."}, ...]

# From agent output with structured footer
tasks batch-create --from-agent-output analysis.md
# Extracts tasks from <!-- TASKS: [...] --> footer
```

## Structured Output Protocol

Agents (super-brain, super-code-reviewer, super-architect) can output machine-readable task suggestions:

```markdown
<!-- TASKS:
[
  {
    "name": "descriptive-task-name",
    "background": "Why this task exists",
    "requirements": "What needs to be done",
    "priority": "high|medium|low"
  }
]
-->
```

Consume with: `tasks batch-create --from-agent-output output.md`

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

- **`tasks update 47 wip`** — finds task 0047 in ANY configured folder
- **`tasks update 47 --section Design --from-file ...`** — same cross-folder lookup
- **`tasks open 47`** — opens task from whichever folder contains it
- **`tasks check 47`** — validates task from any folder
- **`tasks refresh`** — aggregates tasks from ALL folders into one kanban
- **`tasks create`** — creates in the active folder (or `--folder` override)

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

## Architecture

**Config mode** (with `docs/.tasks/config.jsonc`): Centralized metadata in `docs/.tasks/`, task files in any configured folder, global kanban board.

**Legacy mode** (no config.jsonc): Single folder `docs/prompts/` with colocated `.kanban.md` and `.template.md`. Run `tasks init` to migrate.

| Mode       | Trigger                           | Metadata Location                         | Multi-Folder       |
| ---------- | --------------------------------- | ----------------------------------------- | ------------------ |
| **Legacy** | No `docs/.tasks/config.jsonc`     | `docs/prompts/.kanban.md`, `.template.md` | Single folder only |
| **Config** | `docs/.tasks/config.jsonc` exists | `docs/.tasks/` centralized                | Multiple folders   |

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

Edit `docs/.tasks/template.md` to customize new task format. Default template includes frontmatter (name, status, timestamps, impl_progress) and sections (Background, Requirements, Q&A, Design, Solution, Plan, Artifacts, References). See [Assets](references/assets.md) for details.

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

### "Background/Design section is empty or placeholder-only"

**Problem**: Trying to advance status without populating required sections
**Solution**: Use `--section --from-file` to populate content, or `--force` to bypass

### "Section '### X' not found"

**Problem**: The section heading doesn't exist in the task file
**Solution**: Check the template — the section name must match a `### Heading` exactly

## Best Practices

### Task Lifecycle Quality

**ALWAYS populate Background, Requirements, and Design before moving to WIP.** A skeleton task is worse than no task — it creates a false sense of progress. Validation enforces this.

**Best: Rich create + section updates:**

```bash
tasks create "add-oauth2-authentication" \
  --background "Users need SSO via OAuth2 for enterprise clients" \
  --requirements "Support Google and GitHub providers, handle token refresh"

# Then populate Design before starting work
Write("/tmp/0183_design.md", "## Architecture\n\n...")
tasks update 0183 --section Design --from-file /tmp/0183_design.md
tasks update 0183 wip
```

**Bad: Leave skeleton behind:**

```bash
tasks create "add-oauth2-authentication"
# ... move on to other work — validation will block `tasks update 183 wip`
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
