---
description: Create slash commands with proper frontmatter
argument-hint: <plugin-name> <command-name>
---

# Add New Command

Thin wrapper command for `rd2:command-expert` agent. Creates slash commands with proper structure following command development best practices.

## Quick Start

```bash
/rd2:command-add rd2 review-code       # Create command in rd2 plugin
/rd2:command-add myplugin deploy       # Create command in myplugin plugin
```

## Arguments

| Argument       | Required | Description                              |
| -------------- | -------- | ---------------------------------------- |
| `plugin-name`  | Yes      | Target plugin (e.g., "rd2", "myplugin")  |
| `command-name` | Yes      | Command name (lowercase-hyphens, max 64) |

## Validation

Verify inputs before proceeding:

1. **Validate plugin exists**: Check `plugins/{plugin-name}/` directory exists
2. **Validate command name**: Must be lowercase with hyphens only
3. **Check for conflicts**: Ensure command doesn't already exist

If validation fails:

- Show specific error with expected format
- Suggest valid plugin names if plugin not found
- Display existing commands if conflict detected

## Workflow

This command follows the command creation process:

1. **Define Purpose** - Identify command scope, arguments, target use case
2. **Design Interface** - Choose frontmatter fields, argument pattern
3. **Write Command** - Create prompt with clear instructions for Claude
4. **Add Validation** - Include input checks, error handling
5. **Test** - Verify command works with various inputs
6. **Evaluate** - Run quality assessment

## Command Structure

Commands have optional YAML frontmatter:

```yaml
---
description: Brief description for /help
allowed-tools: Read, Write
model: sonnet
argument-hint: [arg1] [arg2]
---
```

**Key Frontmatter Fields:**

| Field           | Purpose              | When to Include            |
| --------------- | -------------------- | -------------------------- |
| `description`   | Shown in `/help`     | Always (keep <60 chars)    |
| `allowed-tools` | Restrict tool access | When limiting tools        |
| `model`         | Choose model         | When specific model needed |
| `argument-hint` | Document arguments   | When command takes input   |

## Example

```bash
# Create command
/rd2:command-add rd2 deploy-staging
```

## What Gets Created

```
plugin-name/commands/command-name.md
├── YAML frontmatter (description, etc.)
└── Command body (instructions FOR Claude)
```

## Critical Rule

**Commands are instructions FOR Claude, not messages TO the user:**

**Correct:**

```markdown
Review this code for security vulnerabilities including:

- SQL injection
- XSS attacks

Provide specific line numbers and severity ratings.
```

**Incorrect:**

```markdown
This command will review your code for security issues.
You'll receive a report with vulnerability details.
```

## Next Steps

1. Edit generated command - customize for your use case
2. Add validation if needed
3. Test with sample inputs
4. Validate: `/rd2:command-evaluate <command-file>`
5. Iterate: Address findings until Grade A/B

## Implementation

This command delegates to the **rd2:command-expert** agent for command creation:

```
Task(
    subagent_type="rd2:command-expert",
    prompt="""Create a new slash command in plugin '{plugin_name}':

Command name: {command_name}

Steps:
1. Validate plugin exists in plugins/{plugin_name}/
2. Validate command name format (lowercase-hyphens)
3. Check for existing command conflicts
4. Create command with proper frontmatter and structure
5. Follow rd2:cc-commands best practices
   """,
    description="Create {command_name} command in {plugin_name}"
)
```

## See Also

- `rd2:command-expert` - Agent that handles command creation
- `/rd2:command-evaluate` - Assess command quality
- `/rd2:command-refine` - Improve existing commands
- `rd2:cc-commands` - Command development best practices
