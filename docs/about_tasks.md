# Tasks Management Tool Guide

This guide explains how to use the Tasks Management Tool (`plugins/rd/scripts/prompts.sh`) to manage your LLM task prompts efficiently.

## 1. How to Use the Script

The script is located at `plugins/rd/scripts/prompts.sh`. After initialization, you can use the `tasks` command from anywhere in your project.

### Initialization

First, initialize the tool to create the necessary directories and files:

```bash
./plugins/rd/scripts/prompts.sh init
```

This creates:
- `docs/prompts/`: Directory for your task files.
- `docs/prompts/.kanban.md`: The Kanban board file.
- `docs/prompts/.template.md`: The task template.
- `/opt/homebrew/bin/tasks`: Symlink for easy access (requires running init once).

After initialization, you can use the `tasks` command directly:

```bash
tasks init
tasks create "My New Task"
```

### Creating a Task

To create a new task:

```bash
tasks create "My New Task"
```

Or using the full script path:

```bash
./plugins/rd/scripts/prompts.sh create "My New Task"
```

This will:
- Generate a file named `docs/prompts/XXXX_My_New_Task.md` (where XXXX is a unique sequence number).
- Add the task to the **Backlog** in the Kanban board.

### Updating Status

To move a task to a different stage (e.g., from Backlog to Todo):

```bash
tasks update <WBS> <Stage>
```

Example:

```bash
tasks update 0001 Todo
```

Available stages: `Backlog`, `Todo`, `WIP`, `Testing`, `Done`.

### Listing Tasks

To list tasks in a specific stage:

```bash
tasks list WIP
```

To list all tasks (view the entire board):

```bash
tasks list
```

### Refreshing the Board

The board updates automatically when you use `create` or `update`. If you manually edit files, you can force a refresh:

```bash
tasks refresh
```

## 2. Configuring the Template

The template file is located at `docs/prompts/.template.md`. You can modify this file to change the structure of new tasks.

### Dynamic Placeholders

The tool supports the following placeholders, which are automatically replaced when you create a task:

- `{{PROMPT_NAME}}`: The name of the task you provided.
- `{{CREATED_AT}}`: The creation timestamp.
- `{{UPDATED_AT}}`: The update timestamp.

### Example Template

```markdown
---
name: {{PROMPT_NAME}}
status: Backlog
created_at: {{CREATED_AT}}
updated_at: {{UPDATED_AT}}
---

## {{PROMPT_NAME}}

### Context

...
```

## 3. Using with Obsidian Kanban Plugin

The `docs/prompts/.kanban.md` file is compatible with the [Obsidian Kanban Plugin](https://github.com/mgmeyers/obsidian-kanban).

### Setup

1. Open your project in Obsidian.
2. Install and enable the **Kanban** plugin.
3. Open `docs/prompts/.kanban.md`.

### Features

- **Visual Board**: You can view and manage your tasks as cards on a Kanban board.
- **Drag and Drop**: Dragging a card to a new column in Obsidian will update the `.kanban.md` file.
- **Sync**: After making changes in Obsidian (like dragging a card), run `tasks refresh` to ensure the individual task files are updated with the new status (Note: currently the script syncs _from_ files _to_ board, so manual file updates are the source of truth for the script. If you move cards in Obsidian, you might need to manually update the file status or extend the script to support two-way sync).

> **Note**: The current script implementation primarily treats the **task files** as the source of truth. The `refresh` command rebuilds the Kanban board based on the `status` field in each task file.

## 4. Command Reference

| Command | Description | Example |
|---------|-------------|---------|
| `tasks init` | Initialize the tasks management tool | `tasks init` |
| `tasks create <name>` | Create a new task | `tasks create "Add Auth"` |
| `tasks update <WBS> <stage>` | Update task status | `tasks update 0001 WIP` |
| `tasks list [stage]` | List tasks (optionally filter by stage) | `tasks list WIP` |
| `tasks refresh` | Refresh the Kanban board | `tasks refresh` |
| `tasks help` | Show help message | `tasks help` |
