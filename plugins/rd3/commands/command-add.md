---
description: Scaffold a new slash command with best-practice structure
argument-hint: "<command-name> [--template simple|workflow|plugin] [--platform all|claude|codex|gemini|openclaw|opencode|antigravity] [--path <dir>]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Command Add

Wraps **rd3:cc-commands** skill.

Scaffold a new slash command file with proper frontmatter and structure.

## When to Use

- Create a new slash command from scratch
- Generate a command with specific template
- Bootstrap a command file with proper metadata

## Expected Results

- New command .md file created at specified path
- Frontmatter with description, argument-hint, allowed-tools
- Template structure applied (simple, workflow, or plugin)
- Platform companion files generated (if --platform is not claude)

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `command-name` | Name of the command to create | (required) |
| `--template` | Template type: simple, workflow, plugin | simple |
| `--platform` | Target platform: all, claude, codex, gemini, openclaw, opencode, antigravity | claude |
| `--path` | Output directory | ./commands |
| `--description` | Description for frontmatter | auto-generated |
| `--plugin-name` | Plugin name for plugin template | (none) |

## Examples

```bash
# Simple command
/rd3:command-add review-code

# Workflow command with description
/rd3:command-add deploy-app --template workflow --description "Deploy app to production"

# Plugin command
/rd3:command-add skill-test --template plugin --plugin-name rd3
```

## Implementation

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-commands/scripts/scaffold.ts <command-name> [options]
```

## Platform Notes

- Claude Code: Use `Skill()` for skill delegation
- Other platforms: Run script directly via Bash tool

## See Also

- `/rd3:command-evaluate` - Evaluate command quality
- `/rd3:command-refine` - Improve command based on evaluation
