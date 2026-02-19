---
description: Create slash commands with YAML frontmatter
argument-hint: <plugin-name> <command-name>
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Add New Command

Invoke `rd2:command-expert` agent to create slash commands with proper structure.

## Quick Start

```bash
/rd2:command-add rd2 review-code
/rd2:command-add myplugin deploy
```

## Arguments

| Argument       | Required | Description                      |
| -------------- | -------- | -------------------------------- |
| `plugin-name`  | Yes      | Target plugin (e.g., "rd2")      |
| `command-name` | Yes      | Command name (lowercase-hyphens) |

## Validation

1. Verify plugin exists: `plugins/{plugin-name}/`
2. Validate name format (lowercase-hyphens only)
3. Check for conflicts

## Command Structure

```yaml
---
description: Brief description for /help
allowed-tools: Read, Write
argument-hint: [arg1] [arg2]
---
```

**Key fields:**
- `description` - Shown in `/help` (keep <60 chars)
- `allowed-tools` - Restrict tool access
- `argument-hint` - Document arguments

## Imperative Form

Write commands as instructions FOR Claude, not messages TO user:

```markdown
Review this code for security vulnerabilities including:
- SQL injection
- XSS attacks
Provide specific line numbers and severity ratings.
```

## Implementation

Execute Task to invoke command-expert agent:

```
Task(
    subagent_type="command-expert",
    prompt="""Create a new slash command in plugin '{plugin_name}':

Command name: {command_name}

Steps:
1. Validate plugin exists in plugins/{plugin_name}/
2. Validate command name format (lowercase-hyphens)
3. Check for existing command conflicts
4. Create command with proper frontmatter and structure
5. Follow rd2:cc-commands best practices""",
    description="Create {command_name} command"
)
```

## Next Steps

1. Edit generated command
2. Test with sample inputs
3. Validate: `/rd2:command-evaluate <command-file>`
4. Iterate until Grade A/B
