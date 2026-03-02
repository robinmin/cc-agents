# Command Reference

Detailed reference for all `tasks` CLI commands.

## Command Table

| Command | Usage | Purpose |
|---------|-------|---------|
| `init` | `tasks init` | Initialize project (create docs/.tasks/, migrate) |
| `create` | `tasks create "name" [--background TEXT] [--requirements TEXT]` | Create new task file with optional content |
| `create` | `tasks create --from-json FILE` or `--from-stdin` | Create from JSON definition |
| `batch-create` | `tasks batch-create --from-json FILE` | Create multiple tasks from JSON array |
| `batch-create` | `tasks batch-create --from-agent-output FILE` | Create tasks from structured agent footer |
| `update` | `tasks update <WBS> <stage> [--force]` | Change task status (with validation) |
| `update` | `tasks update <WBS> --section <name> --from-file <path>` | Update section content from file |
| `update` | `tasks update <WBS> --section Artifacts --append-row "t\|p\|a\|d"` | Append Artifacts table row |
| `update` | `tasks update <WBS> --phase <phase> <status> [--force]` | Update impl_progress phase |
| `check` | `tasks check` | Validate ALL tasks across all folders |
| `check` | `tasks check <WBS>` | Validate a single task (shows phase progress) |
| `list` | `tasks list [stage]` | View kanban board, filter by stage |
| `show` | `tasks show <WBS>` | Show task content in markdown (for agents) |
| `open` | `tasks open <WBS>` | Open task file in editor (for humans) |
| `config` | `tasks config` | Show current configuration |
| `config` | `tasks config set-active <dir>` | Change active folder |
| `config` | `tasks config add-folder <dir> [--base-counter N] [--label TEXT]` | Add new task folder |
| `refresh` | `tasks refresh` | Regenerate kanban board from all folders |
| `decompose` | `tasks decompose "requirement" [--parent WBS]` | Break requirement into subtasks |
| `log` | `tasks log <prefix> [--data JSON]` | Log developer events |

## Status Aliases

See [status-aliases.md](./status-aliases.md) for complete list of accepted aliases.

### Canonical Statuses

| Canonical | Aliases |
|-----------|---------|
| Backlog | backlog |
| Todo | todo, to-do, pending |
| WIP | wip, in-progress, in_progress, working |
| Testing | testing, test, review, in-review |
| Done | done, completed, complete, finished, closed |
| Blocked | blocked, failed, stuck, error |

### Impl Phases

- planning
- design
- implementation
- review
- testing

### Phase Statuses

- pending
- in_progress
- completed
- blocked

## Examples

### Initialize

```bash
# First time setup
tasks init
```

### Create Tasks

```bash
# Basic create
tasks create "add-user-auth"

# Rich create with content
tasks create "add-oauth2" \
  --background "Users need SSO for enterprise" \
  --requirements "Support Google and GitHub providers"

# From JSON
tasks create --from-json task.json

# From stdin
echo '{"name": "Task", "background": "bg"}' | tasks create --from-stdin
```

### Update Status

```bash
# Basic status update
tasks update 47 wip

# With force (bypass validation)
tasks update 47 wip --force

# Update impl_progress phase
tasks update 47 --phase implementation completed
tasks update 47 --phase testing completed --force
```

### Update Sections

```bash
# Update section from file
tasks update 47 --section Design --from-file /tmp/0047_design.md
tasks update 47 --section Plan --from-file /tmp/0047_plan.md
tasks update 47 --section "Q&A" --from-file /tmp/0047_qa.md

# Append to Artifacts table
tasks update 47 --section Artifacts --append-row "diagram|docs/arch.png|super-architect|2026-02-10"
```

### View Tasks

```bash
# List all tasks
tasks list

# Filter by status
tasks list wip
tasks list done

# Show task content (for agents)
tasks show 47

# Open in editor (for humans)
tasks open 47
```

### Validation

```bash
# Validate single task
tasks check 47

# Validate all tasks
tasks check
```

### Configuration

```bash
# Show config
tasks config

# Add folder
tasks config add-folder docs/v2 --base-counter 200 --label "V2"

# Set active folder
tasks config set-active docs/v2
```

### Multi-Folder

```bash
# Create in specific folder
tasks create "New task" --folder docs/next-phase

# Update finds task in ANY folder
tasks update 47 wip

# Refresh updates ALL kanban boards
tasks refresh
```

## Exit Codes

- `0` - Success
- `1` - Error (invalid input, file not found, validation failed)

## Environment

The `tasks` command requires:
- Python 3.x
- Git repository (detects project root automatically)
- Optionally: `glow` for markdown rendering
