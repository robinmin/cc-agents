# Tasks Assets

Default templates and configuration files for the tasks CLI.

## Files

### assets/.kanban.md

Default kanban board template in Obsidian Kanban format.

**Usage:**
- **Config mode:** Copied to `docs/.tasks/kanban.md` during `init` command.
- **Legacy mode:** Copied to `docs/prompts/.kanban.md` during `init` command.

**Format:**
```markdown
---
kanban-plugin: board
---

# Kanban Board

## Backlog
- [ ] Example task in backlog

## Todo
- [ ] Example task in todo

## WIP
- [.] Example task in progress

## Testing
- [.] Example task in testing

## Done
- [x] Example completed task
```

**Checkbox States:**
- `[ ]` - Backlog/Todo (not started)
- `[.]` - WIP/Testing (in progress)
- `[x]` - Done (complete)

### assets/.template.md

Default task file template with YAML frontmatter.

**Usage:**
- **Config mode:** Copied to `docs/.tasks/template.md` during `init` command. Used as template for new tasks.
- **Legacy mode:** Copied to `docs/prompts/.template.md` during `init` command. Used as template for new tasks.

**Format:**
```markdown
---
name: { { PROMPT_NAME } }
description: <prompt description>
status: Backlog
created_at: { { CREATED_AT } }
updated_at: { { UPDATED_AT } }
---

## { { WBS } }. { { PROMPT_NAME } }

### Background

[Task context and background information]

### Requirements / Objectives

[What needs to be done]

### Solution

[Implementation notes]

### References

[Links and resources]
```

**Template Variables:**
- `{ { PROMPT_NAME } }` - Task name
- `{ { WBS } }` - WBS number (e.g., 0047)
- `{ { CREATED_AT } }` - Creation timestamp
- `{ { UPDATED_AT } }` - Last update timestamp

## Customization

To customize the default templates for your project:

1. Edit the files in `plugins/rd2/skills/tasks/assets/`
2. Re-run `init` to copy updated templates to your project

**Note:** The `init` command only copies files if they don't exist. To update existing templates, delete the target files first:

```bash
# Config mode
rm docs/.tasks/kanban.md docs/.tasks/template.md
tasks init

# Legacy mode
rm docs/prompts/.kanban.md docs/prompts/.template.md
tasks init
```
