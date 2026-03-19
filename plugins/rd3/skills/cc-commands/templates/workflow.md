---
description: {{DESCRIPTION}}
argument-hint: {{ARGUMENT_HINT}}
allowed-tools: ["Read", "Write", "Glob", "Bash", "Task", "Skill"]
---

# {{COMMAND_TITLE}}

Wraps **{{TARGET_SKILL}}** skill.

[TODO: Description of what this command does - keep under 60 chars, start with verb]

## When to Use

- [TODO: Scenario 1: When this command applies]
- [TODO: Scenario 2: Another scenario]

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `{{ARG_NAME}}` | [TODO: Description] | (required) |
| `--{{FLAG_NAME}}` | [TODO: Flag description] | [default value] |

## Examples

```bash
# [TODO: Example 1]
/{{PLUGIN_NAME}}:{{COMMAND_NAME}} [args]

# [TODO: Example 2]
/{{PLUGIN_NAME}}:{{COMMAND_NAME}} [args]
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **{{TARGET_SKILL}}** skill:

```
Skill(skill="{{TARGET_SKILL}}", args="{{OPERATION}} $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/{{PLUGIN_PATH}}/scripts/{{SCRIPT_NAME}}.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
