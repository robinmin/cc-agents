---
name: add new slash command tasks
description: Create /tasks slash command to manage tasks from Claude input field
status: Done
current_phase: 6
verify_cmd: agent-doctor
verify_status: passed
impl_progress:
  phase_1: completed
  phase_2: completed
  phase_3: completed
created_at: 2026-01-12 20:37:15
updated_at: 2026-01-12 21:46:24
---

## 0006. add new slash command tasks

### Background

Base on command `tasks` to have a lightweight wrapper for as the slash command. `tasks` is a alias name which points to `${CLAUDE_PLUGIN_ROOT}/scripts/tasks.sh` for convenience.

Actually, it's the file @plugins/rd/scripts/tasks.sh after installation via claude code's slash command.

Here comes its output for `tasks help`:

```
Usage: tasks <subcommand> [arguments]

Subcommands:
  init                     Initialize the tasks management tool
  create <task name>       Create a new task
  list [stage]             List tasks (optionally filter by stage)
  update <WBS> <stage>     Update a task's stage
  open <WBS>               Open a task file in default editor
  refresh                  Refresh the kanban board
  help                     Show this help message
```

### Requirements / Objectives

I need your based on above information to add a new slash command tasks to enable users to manage tasks in claude input field as we've done in the terminal. For example, users can create a new task by typing `/tasks create "Implement feature X"`.

### Solutions / Goals

#### Architecture Overview

The `/tasks` slash command will be a Claude Code plugin command that wraps the existing `tasks.sh` shell script. It provides a seamless interface for task management directly from Claude's input field.

```
┌─────────────────────────────────────────────────────────────┐
│  User Input: /tasks create "Implement feature X"            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  commands/tasks.md (Slash Command Definition)               │
│  - Parses subcommand and arguments                          │
│  - Provides usage documentation                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  scripts/tasks.sh (Shell Script)                            │
│  - Executes actual task operations                          │
│  - Returns output (with ANSI codes stripped)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  docs/prompts/*.md (Task Files)                             │
│  docs/prompts/.kanban.md (Kanban Board)                     │
└─────────────────────────────────────────────────────────────┘
```

#### Core Components

- **`commands/tasks.md`**: Slash command definition file with YAML frontmatter and usage instructions
- **`scripts/tasks.sh`**: Existing shell script (no modifications needed)
- **Output Processing**: Strip ANSI color codes for clean markdown output

#### Command Interface Design

| Subcommand | Syntax | Description |
|------------|--------|-------------|
| `init` | `/tasks init` | Initialize task management |
| `create` | `/tasks create "Task Name"` | Create new task |
| `list` | `/tasks list [stage]` | List tasks (optionally by stage) |
| `update` | `/tasks update <WBS> <stage>` | Update task status |
| `open` | `/tasks open <WBS>` | Open task in editor |
| `refresh` | `/tasks refresh` | Sync kanban board |
| `help` | `/tasks help` | Show usage |

#### Key Implementation Details

1. **Argument Parsing**: Support quoted strings for task names with spaces
2. **Output Formatting**: Clean markdown without ANSI escape codes
3. **Error Handling**: User-friendly error messages in markdown format
4. **Path Resolution**: Use `${CLAUDE_PLUGIN_ROOT}/scripts/tasks.sh` for portability

#### Edge Cases Handled

- **No arguments**: Show help message
- **Invalid subcommand**: Show error with valid options
- **Missing task name**: Show usage for create command
- **Task not found**: Display friendly error message
- **Not in git repo**: Suggest running from project root

---

#### Implementation Plan

##### Phase 1: Create Command File [Complexity: Low]

**Goal**: Create the `/tasks` slash command definition file

**Status**: pending

- [ ] Create `plugins/rd/commands/tasks.md` with YAML frontmatter
- [ ] Add description: "Manage tasks from Claude input field"
- [ ] Add argument-hint: `<subcommand> [arguments]`
- [ ] Document all subcommands with examples
- [ ] Include usage table and quick reference

**Deliverable**: Working `/tasks` command that displays help
**Dependencies**: None

##### Phase 2: Implement Command Logic [Complexity: Medium]

**Goal**: Add instructions for executing tasks.sh with proper argument handling

**Status**: pending

- [ ] Add instructions to invoke `${CLAUDE_PLUGIN_ROOT}/scripts/tasks.sh`
- [ ] Document argument parsing for quoted strings
- [ ] Add output formatting instructions (strip ANSI codes)
- [ ] Include error handling guidance
- [ ] Add examples for each subcommand

**Deliverable**: Functional command that executes all subcommands
**Dependencies**: Phase 1

##### Phase 3: Verify and Document [Complexity: Low]

**Goal**: Validate implementation with agent-doctor and finalize documentation

**Status**: pending

- [ ] Run agent-doctor subagent to verify command quality
- [ ] Test all subcommands manually
- [ ] Update command documentation based on feedback
- [ ] Ensure markdown output is clean and readable

**Deliverable**: Verified, production-ready slash command
**Dependencies**: Phase 2

### References

- Existing command structure: `plugins/rd/commands/task-run.md`
- Shell script: `plugins/rd/scripts/tasks.sh`
- Plugin configuration: `plugins/rd/plugin.json`
