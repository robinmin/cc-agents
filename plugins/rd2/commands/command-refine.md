---
description: Refine commands to fix quality issues
argument-hint: <command-file>
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Refine Command

Invoke `rd2:command-expert` agent to improve existing commands.

## Quick Start

```bash
/rd2:command-refine .claude/commands/my-command.md
/rd2:command-refine plugins/rd2/commands/deploy
```

## Arguments

| Argument         | Description          |
| ---------------- | ------------------- |
| `<command-file>` | Path to command file |

## Validation

1. Verify file exists
2. Ensure .md extension
3. Check write access

## Workflow

1. Evaluate quality across all dimensions
2. Identify gaps and issues
3. Apply fixes:
   - Frontmatter → Fix YAML, add required fields
   - Description → Shorten, add specificity
   - Content → Use imperative form
   - Validation → Add input checks
4. Re-evaluate until Grade A/B

## Improvements by Dimension

| Dimension      | Typical Fix                   |
| -------------- | ---------------------------- |
| Frontmatter    | Add missing fields, fix YAML |
| Description    | Shorten (<60 chars)         |
| Content        | Use imperative form          |
| Validation     | Add input checks             |

## Implementation

Execute Task to invoke command-expert agent:

```
Task(
    subagent_type="command-expert",
    prompt="""Refine command: {command_file}

Steps:
1. Evaluate current quality across all dimensions
2. Identify gaps and issues
3. Apply fixes: Frontmatter, Description, Content, Validation
4. Edit command file to apply improvements
5. Re-evaluate to confirm Grade A/B

Follow rd2:cc-commands best practices.""",
    description="Refine {command_file}"
)
```

## Read vs Write

This command MODIFIES files. Use `/rd2:command-evaluate` first to assess without changes.
