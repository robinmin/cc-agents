---
description: Scaffold a new slash command with best-practice structure
argument-hint: "<command-name> [--template simple|workflow|plugin] [--platform all|claude|codex|gemini|openclaw|opencode|antigravity] [--path <dir>] [--description <text>]"
---

# Command Add

Scaffold a new slash command file with proper frontmatter and structure.

## Core Skill

> **Note**: `Skill()` is Claude Code specific. For other platforms, see Implementation section.

This command wraps **rd3:cc-commands** skill - the universal command creator.

**Delegation (Claude Code):**
```
Skill(skill="rd3:cc-commands")
```

## When to Use

- Creating a new slash command from scratch
- Generating a command with specific template
- Bootstrapping a command file with proper metadata

## Usage

```bash
/rd3:command-add <command-name> [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--template <type>` | Template type: simple, workflow, plugin | simple |
| `--platform <name>` | Generate platform companions: all, claude, codex, gemini, openclaw, opencode, antigravity | claude |
| `--path <dir>` | Output directory for the .md file | ./commands |
| `--description <text>` | Description for frontmatter | auto-generated |
| `--plugin-name <name>` | Plugin name for plugin template | - |
| `--verbose, -v` | Show detailed output | false |

## Templates

### simple (default)
Basic command with description and instructions body.

### workflow
Multi-step command with Task() delegation and workflow structure.

### plugin
Plugin-aware command using CLAUDE_PLUGIN_ROOT for script paths.

## Examples

```bash
# Simple command
/rd3:command-add review-code

# Workflow command with description
/rd3:command-add deploy-app --template workflow --description "Deploy application to production"

# Plugin command
/rd3:command-add skill-test --template plugin --plugin-name rd3
```

## Workflow

1. **Normalize** command name (kebab-case)
2. **Generate** frontmatter with provided or inferred fields
3. **Apply** template structure
4. **Write** command .md file
5. **Report** created file path

## Related Commands

- `/rd3:command-evaluate` - Evaluate command quality
- `/rd3:command-refine` - Improve command based on evaluation

## Implementation

<!-- TODO: Replace direct script call with rd3:cc-agents subagent when ready -->

### For Claude Code
```bash
bun ${CLAUDE_PLUGIN_ROOT:-.}/plugins/rd3/skills/cc-commands/scripts/scaffold.ts <command-name> [options]
```

### For Other Coding Agents
```bash
bun ./plugins/rd3/skills/cc-commands/scripts/scaffold.ts <command-name> [options]
```
