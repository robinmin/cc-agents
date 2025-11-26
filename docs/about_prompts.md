# Prompts Management Tool Guide

This guide explains how to use the Prompts Management Tool (`plugins/rd/scripts/prompts.sh`) to manage your LLM prompts efficiently.

## 1. How to Use the Script

The script is located at `plugins/rd/scripts/prompts.sh`. You should run it from the root of your project.

### Initialization

First, initialize the tool to create the necessary directories and files:

```bash
./plugins/rd/scripts/prompts.sh init
```

This creates:

- `docs/prompts/`: Directory for your prompts.
- `docs/prompts/.kanban.md`: The Kanban board file.
- `docs/prompts/.template.md`: The prompt template.

### Creating a Prompt

To create a new prompt:

```bash
./plugins/rd/scripts/prompts.sh create "My New Prompt"
```

This will:

- Generate a file named `docs/prompts/XXXX_My_New_Prompt.md` (where XXXX is a unique sequence number).
- Add the prompt to the **Backlog** in the Kanban board.

### Updating Status

To move a prompt to a different stage (e.g., from Backlog to Todo):

```bash
./plugins/rd/scripts/prompts.sh update <WBS> <Stage>
```

Example:

```bash
./plugins/rd/scripts/prompts.sh update 0001 "Todo"
```

Available stages: `Backlog`, `Todo`, `WIP`, `Testing`, `Done`.

### Listing Prompts

To list prompts in a specific stage:

```bash
./plugins/rd/scripts/prompts.sh list "WIP"
```

To list all prompts (view the entire board):

```bash
./plugins/rd/scripts/prompts.sh list
```

### Refreshing the Board

The board updates automatically when you use `create` or `update`. If you manually edit files, you can force a refresh:

```bash
./plugins/rd/scripts/prompts.sh refresh
```

## 2. Configuring the Template

The template file is located at `docs/prompts/.template.md`. You can modify this file to change the structure of new prompts.

### Dynamic Placeholders

The tool supports the following placeholders, which are automatically replaced when you create a prompt:

- `{{PROMPT_NAME}}`: The name of the prompt you provided.
- `{{CREATED_AT}}`: The creation timestamp.
- `{{UPDATED_AT}}`: The update timestamp.

### Example Template

```markdown
---
name: { { PROMPT_NAME } }
status: Backlog
created_at: { { CREATED_AT } }
updated_at: { { UPDATED_AT } }
---

# {{PROMPT_NAME}}

## Context

...
```

## 3. Using with Obsidian Kanban Plugin

The `docs/prompts/.kanban.md` file is compatible with the [Obsidian Kanban Plugin](https://github.com/mgmeyers/obsidian-kanban).

### Setup

1.  Open your project in Obsidian.
2.  Install and enable the **Kanban** plugin.
3.  Open `docs/prompts/.kanban.md`.

### Features

- **Visual Board**: You can view and manage your prompts as cards on a Kanban board.
- **Drag and Drop**: Dragging a card to a new column in Obsidian will update the `.kanban.md` file.
- **Sync**: After making changes in Obsidian (like dragging a card), run `./plugins/rd/scripts/prompts.sh refresh` to ensure the individual prompt files are updated with the new status (Note: currently the script syncs _from_ files _to_ board, so manual file updates are the source of truth for the script. If you move cards in Obsidian, you might need to manually update the file status or extend the script to support two-way sync).

> **Note**: The current script implementation primarily treats the **prompt files** as the source of truth. The `refresh` command rebuilds the Kanban board based on the `status` field in each prompt file.
