---
description: Scaffold a new slash definition with best practices
argument-hint: "<command-name> [--template simple|workflow|plugin] [--path <dir>]"
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
| `--template` | Template type: simple, workflow, plugin | simple |
| `--platform` | Target platform: all, claude, codex, gemini, openclaw, opencode, antigravity | claude |
| `--path` | Output directory | ./commands |
| `--description` | Description for frontmatter | auto-generated |
| `--plugin-name` | Plugin name for plugin template | (none) |

## Examples

```bash
# Scaffold a simple definition
/rd3:command-add review-code

# Scaffold a workflow definition with description
/rd3:command-add deploy-app --template workflow --description "Deploy app to production"

# Scaffold a plugin definition
/rd3:command-add skill-test --template plugin --plugin-name rd3
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-commands** skill:

```
Skill(skill="rd3:cc-commands")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-commands/scripts/scaffold.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
