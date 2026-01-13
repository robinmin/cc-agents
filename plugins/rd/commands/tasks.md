---
description: Manage tasks from Claude input field - create, list, update, and track tasks
argument-hint: <subcommand> [arguments]
allowed-tools: Bash
---

# tasks

Lightweight task management directly from Claude's input field. Wraps the `tasks.sh` shell script for seamless task tracking.

## Quick Start

```bash
/tasks help                        # Show all commands
/tasks create "Implement feature"  # Create new task
/tasks list                        # View kanban board
/tasks update 0001 WIP             # Update task status
```

## Subcommands

| Command | Syntax | Description |
|---------|--------|-------------|
| `init` | `/tasks init` | Initialize task management in current project |
| `create` | `/tasks create "Task Name"` | Create a new task (use quotes for names with spaces) |
| `list` | `/tasks list [stage]` | List all tasks or filter by stage |
| `update` | `/tasks update <WBS> <stage>` | Update a task's stage (e.g., `0001 WIP`) |
| `open` | `/tasks open <WBS>` | Open task file in default editor |
| `refresh` | `/tasks refresh` | Refresh/sync the kanban board |
| `help` | `/tasks help` | Show this help message |

## Valid Stages

| Stage | Aliases |
|-------|---------|
| `Backlog` | backlog |
| `Todo` | todo, to-do |
| `WIP` | wip, in-progress, working |
| `Testing` | testing, test, review |
| `Done` | done, completed, finished |

## Examples

### Initialize Task Management

```bash
/tasks init
```

Creates `docs/prompts/` directory with `.kanban.md` and `.template.md` files.

### Create a New Task

```bash
/tasks create "Add user authentication"
/tasks create "Fix login bug"
```

Creates a new task file like `docs/prompts/0007_Add_user_authentication.md`.

### List Tasks

```bash
/tasks list           # Show entire kanban board
/tasks list WIP       # Show only in-progress tasks
/tasks list done      # Show completed tasks
```

### Update Task Status

```bash
/tasks update 0001 WIP       # Mark task 0001 as in progress
/tasks update 0002 done      # Mark task 0002 as complete
/tasks update 0003 testing   # Move task 0003 to testing
```

### Open Task File

```bash
/tasks open 0001    # Opens docs/prompts/0001_*.md in default editor
```

### Refresh Kanban Board

```bash
/tasks refresh      # Sync .kanban.md with all task file statuses
```

## Execution Instructions

When the user invokes `/tasks`, execute the following:

1. **Parse the subcommand** from the first argument
2. **Execute the tasks.sh script** using Bash:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/tasks.sh" <subcommand> [arguments]
```

3. **Strip ANSI color codes** from output for clean markdown display:
   - Remove `\033[...m` escape sequences
   - Or pipe through: `sed 's/\x1b\[[0-9;]*m//g'`

4. **Format output** as clean markdown for the user

### Argument Handling

- **Quoted strings**: Preserve quotes for task names with spaces
  - `/tasks create "My Task Name"` → pass `"My Task Name"` as single argument
- **WBS numbers**: 4-digit task identifiers (e.g., `0001`, `0042`)
- **Stage names**: Case-insensitive, support aliases

### Error Handling

Display user-friendly error messages:

| Error | Response |
|-------|----------|
| No subcommand | Show help message |
| Invalid subcommand | "Unknown command. Run `/tasks help` for usage." |
| Missing task name | "Usage: `/tasks create \"Task Name\"`" |
| Task not found | "No task found with WBS: XXXX" |
| Not in git repo | "Please run from a git project root directory" |

## Integration

This command integrates with:
- `/rd:task-run` - Generate implementation plans for tasks
- `/rd:task-fixall` - Run verification after implementation
- `docs/prompts/.kanban.md` - Visual kanban board

## Output Format

### List Command Output

```markdown
# Kanban Board

## Backlog

- [ ] 0003_Add_documentation

## WIP

- [.] 0001_Implement_feature

## Done

- [x] 0002_Fix_bug
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Command not found" | Ensure script is executable: `chmod +x scripts/tasks.sh` |
| "Not in git repo" | Run from project root with `.git` directory |
| Invalid WBS | Use 4-digit format: `0001`, `0042` |
| Invalid stage | Use valid stage names or aliases (see Valid Stages table) |
| Permission denied | Check file permissions on `scripts/tasks.sh` |
