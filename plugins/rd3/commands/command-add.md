---
description: Scaffold a new slash definition with best practices
argument-hint: "<command-name> [description] [--template simple|workflow|plugin] [--path <dir>]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Command Add

Wraps **rd3:cc-commands** skill.

Scaffold a new slash definition file from a template.

## When to Use

- Create a new slash definition from scratch
- Generate with a specific template type
- Bootstrap a file with proper metadata

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `command-name` | Name to create | (required) |
| `description` | Optional free-text description of the command's purpose | auto-generated |
| `--template` | Template type: simple, workflow, plugin | simple |
| `--path` | Output directory | ./commands |
| `--platform` | Target platform: all, claude, codex, gemini, openclaw, opencode, antigravity | claude |
| `--plugin-name` | Plugin name for plugin template | (none) |

## Examples

```bash
# Scaffold a simple definition (most common)
/rd3:command-add review-code

# Scaffold with a description of its purpose
/rd3:command-add deploy-app "Deploy app to production environment"

# Scaffold a plugin definition
/rd3:command-add skill-test --template plugin --plugin-name rd3
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-commands** skill:

```
Skill(skill="rd3:cc-commands", args="scaffold $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-commands/scripts/scaffold.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
