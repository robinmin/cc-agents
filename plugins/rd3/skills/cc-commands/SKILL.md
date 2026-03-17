---
name: cc-commands
description: Create, validate, evaluate, and adapt slash commands across platforms. This skill should be used when you want to scaffold a new command, validate command structure, evaluate command quality, refine commands based on evaluation, or generate cross-platform command equivalents.
license: Apache-2.0
metadata:
  author: cc-agents
  version: "3.0.0"
  platforms: "claude-code,codex,gemini,openclaw,opencode,antigravity"
---

# cc-commands: Universal Command Creator

Create and manage slash commands that work across multiple agent platforms.

## When to Use

Use this skill when:
- Creating a new slash command from scratch
- Validating command structure and frontmatter
- Evaluating command quality across 10 dimensions
- Refining commands based on evaluation feedback
- Generating cross-platform command equivalents (Gemini TOML, Codex YAML, etc.)
- Migrating rd2 commands to the new universal format

## Quick Start

```bash
# Scaffold a new command
bun ${CLAUDE_PLUGIN_ROOT}/skills/cc-commands/scripts/scaffold.ts my-command --path ./commands

# Validate command structure
bun ${CLAUDE_PLUGIN_ROOT}/skills/cc-commands/scripts/validate.ts ./commands/my-command.md

# Evaluate command quality
bun ${CLAUDE_PLUGIN_ROOT}/skills/cc-commands/scripts/evaluate.ts ./commands/my-command.md --scope full

# Refine command based on evaluation
bun ${CLAUDE_PLUGIN_ROOT}/skills/cc-commands/scripts/refine.ts ./commands/my-command.md

# Adapt command for other platforms
bun ${CLAUDE_PLUGIN_ROOT}/skills/cc-commands/scripts/adapt.ts ./commands/ --platform all
```

## Core Principles

### Thin Wrappers, Fat Skills

Commands are thin wrappers (~50-150 lines) that delegate to skills. The command file contains imperative instructions for Claude, not domain knowledge.

### Strict Frontmatter

Commands have exactly 5 valid frontmatter fields: `description`, `allowed-tools`, `model`, `argument-hint`, `disable-model-invocation`. Any other field is an error.

### Imperative Form

Write instructions FOR Claude, not messages TO the user. Use imperative form ("Review the code") not second-person ("You should review the code").

## Command Types

| Type | Template | Use When |
|------|----------|----------|
| **Simple** | `simple.md` | Direct instructions, no delegation |
| **Workflow** | `workflow.md` | Multi-step with Task()/Skill() pseudocode |
| **Plugin** | `plugin.md` | Uses CLAUDE_PLUGIN_ROOT for script paths |

## Pipeline Architecture

```
scaffold.ts -> validate.ts -> evaluate.ts -> refine.ts -> adapt.ts
```

Each script operates independently and can be invoked from CLI or slash commands.

## Evaluation Dimensions (10)

| # | Dimension | What It Checks |
|---|-----------|----------------|
| 1 | Frontmatter Quality | Valid YAML, only allowed fields |
| 2 | Description Effectiveness | Under 60 chars, starts with verb |
| 3 | Content Quality | Imperative form, writes FOR Claude |
| 4 | Structure & Brevity | Under 150 lines, progressive disclosure |
| 5 | Delegation Pattern | Proper Skill()/Task() usage |
| 6 | Argument Design | argument-hint consistency with body |
| 7 | Security | Tool restrictions, dangerous patterns |
| 8 | Naming Convention | noun-verb (grouped) or verb-noun (simple) |
| 9 | Platform Compatibility | Non-portable features documented |
| 10 | Operational Readiness | Error handling, edge cases |

Two weight profiles: `with-pseudocode` and `without-pseudocode`.

## Platform Adapters

| Platform | Input | Output |
|----------|-------|--------|
| Claude Code | Validation only | (native format) |
| Codex | `command.md` | SKILL.md + `agents/openai.yaml` |
| Gemini CLI | `command.md` | `.toml` file |
| OpenClaw | `command.md` | SKILL.md with `command-dispatch` |
| OpenCode | `command.md` | `.opencode/commands/<name>.md` |
| Antigravity | `command.md` | SKILL.md (mention-triggered) |

## Commands Reference

```bash
# Create new command with template
/rd3:command-add <name> --template <type>

# Validate and evaluate command
/rd3:command-evaluate <path> --scope full

# Refine command based on evaluation
/rd3:command-refine <path> --from-eval <results.json>

# Generate cross-platform variants
/rd3:command-adapt <path> --platform all
```

## Naming Convention

- **Grouped commands:** noun-verb pattern (e.g., `task-create`, `skill-evaluate`)
- **Simple commands:** verb-noun pattern (e.g., `review-code`)
- **Always:** Full namespace (`plugin-name:command-name`)

## Examples

### Example 1: Scaffold a Simple Command

```bash
bun run scripts/scaffold.ts review-code --template simple --path ./commands
# Creates: ./commands/review-code.md
```

### Example 2: Evaluate and Fix

```bash
# Evaluate
bun run scripts/evaluate.ts ./commands/review-code.md --scope full --json

# Refine based on findings
bun run scripts/refine.ts ./commands/review-code.md --from-eval eval-results.json
```

### Example 3: Generate Platform Variants

```bash
# Generate Gemini CLI TOML equivalent
bun run scripts/adapt.ts ./commands/ --platform gemini

# Generate all platform variants
bun run scripts/adapt.ts ./commands/ --platform all
```

## Additional Resources

- **Frontmatter Reference:** [references/frontmatter-reference.md](references/frontmatter-reference.md)
- **Evaluation Framework:** [references/evaluation-framework.md](references/evaluation-framework.md)
- **Platform Compatibility:** [references/platform-compatibility.md](references/platform-compatibility.md)

## Platform Notes

### Claude Code
- Native format: `.md` files in `commands/` directory
- Full support for `$ARGUMENTS`, `Task()`, `Skill()`, `!`cmd``
- `CLAUDE_PLUGIN_ROOT` available for plugin commands

### Codex / Gemini CLI / OpenClaw / OpenCode / Antigravity
- Generated via `adapt.ts` from Claude Code source
- Platform-specific features translated or flagged as non-portable
- See [references/platform-compatibility.md](references/platform-compatibility.md) for full matrix
