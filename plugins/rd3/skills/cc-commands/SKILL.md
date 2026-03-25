---
name: cc-commands
description: Create, validate, evaluate, refine, evolve, and adapt slash commands across platforms. Use for scaffolding new commands, validating structure, evaluating quality, refining based on feedback, planning longitudinal improvements, or generating cross-platform equivalents.
license: Apache-2.0
metadata:
  author: cc-agents
  version: "3.0.0"
  platforms: "claude-code,codex,gemini,openclaw,opencode,antigravity"
  interactions:
    - generator
    - reviewer
    - pipeline
  severity_levels:
    - error
    - warning
    - info
  pipeline_steps:
    - create
    - validate
    - evaluate
    - refine
    - adapt
    - evolve
---

# cc-commands: Universal Command Creator

Create and manage slash commands that work across multiple agent platforms.

## Overview

This skill provides a complete pipeline for slash command development:
- **Scaffold** new commands from templates
- **Validate** structure and frontmatter
- **Evaluate** quality across 10 dimensions
- **Refine** based on evaluation feedback
- **Adapt** for cross-platform compatibility

## Operations

| Operation | Purpose | Script |
|-----------|---------|--------|
| **scaffold** | Create new command from template | `scripts/scaffold.ts` |
| **validate** | Check structure and frontmatter | `scripts/validate.ts` |
| **evaluate** | Score quality across dimensions | `scripts/evaluate.ts` |
| **refine** | Fix issues and improve quality | `scripts/refine.ts` |
| **evolve** | Analyze, propose, apply, and rollback longitudinal improvements | `scripts/evolve.ts` |
| **adapt** | Generate platform companions | `scripts/adapt.ts` |

## When to Use

Use for:
- Creating a new slash command from scratch
- Validating command structure and frontmatter
- Evaluating command quality across 10 dimensions
- Refining commands based on evaluation feedback
- Planning longitudinal improvement proposals
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

# Analyze and propose longitudinal improvements
bun ${CLAUDE_PLUGIN_ROOT}/skills/cc-commands/scripts/evolve.ts ./commands/my-command.md --propose

# Adapt command for other platforms
bun ${CLAUDE_PLUGIN_ROOT}/skills/cc-commands/scripts/adapt.ts ./commands/ all
```

## Core Principles

### Fat Skills, Thin Wrappers

All coding agents support agent skills now, but slash commands and subagents are not universally supported. So we **MUST** follow these principles:

- **Skills** = core logic, workflows, domain knowledge (source of truth)
- **Commands** = ~50-150 line wrappers invoking skills for humans
- **Subagents** = ~100 line wrappers invoking skills for AI workflows

**Circular Reference Rule**: Commands MUST NOT reference their associated agents or skills by name. This includes:

- ❌ Bad: `Use the super-coder agent` or `See also: my-skill`
- ❌ Bad: Commands Reference section listing `/rd3:command-*` commands
- ✅ Good: `Delegate to a coding agent` or `Use Skill() for domain workflows`

Reference generic patterns without specific command names (e.g., "Use Task() to delegate to specialist agents" instead of "/rd3:skill-add").

### Strict Frontmatter

Commands have exactly 5 valid frontmatter fields: `description`, `allowed-tools`, `model`, `argument-hint`, `disable-model-invocation`. Any other field is an error.

### Argument Hint Best Practices

The `argument-hint` field provides the user interface for invoking commands. **Always show valid options** instead of generic placeholders:

| Instead of | Use |
|------------|-----|
| `--template <type>` | `--template technique\|pattern\|reference` |
| `--platform <name>` | `--platform all\|claude\|codex\|gemini\|openclaw\|opencode\|antigravity` |
| `--scope <level>` | `--scope basic\|full` |

This helps users know available options without consulting documentation.

### Imperative Form

Write instructions FOR Claude, not messages TO the user. Use imperative form ("Review the code") not second-person ("Avoid second-person phrasing").

### Wrapped Skill Declaration

At the beginning of each command, **explicitly declare** the skill being wrapped:

```markdown
# Command Name

Wraps **rd3:cc-skills** skill.

<description>
```

This ensures users know which underlying skill handles the operation.

### Arguments Table with Defaults

When documenting arguments, **always include a Default column**:

```markdown
## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `skill-path` | Path to the skill | (required) |
| `--scope` | Evaluation scope | basic |
| `--json` | JSON output | false |
```

This helps users understand which arguments are optional and their default behavior.

## Command Types

| Type | Template | Use When |
|------|----------|----------|
| **Simple** | `simple.md` | Direct instructions, no delegation |
| **Workflow** | `workflow.md` | Multi-step with Task()/Skill() pseudocode |
| **Plugin** | `plugin.md` | Uses CLAUDE_PLUGIN_ROOT for script paths |

### Template Placeholders

When using templates, replace these placeholders:

| Placeholder | Description |
|--------------|-------------|
| `{{COMMAND_TITLE}}` | Title of the command (e.g., "Skill Add") |
| `{{DESCRIPTION}}` | Short description (under 60 chars, start with verb) |
| `{{ARGUMENT_HINT}}` | CLI argument hint showing all options |
| `{{TARGET_SKILL}}` | Skill being wrapped (e.g., "rd3:cc-skills") |
| `{{PLUGIN_NAME}}` | Plugin name (e.g., "rd3") |
| `{{PLUGIN_PATH}}` | Plugin path (e.g., "rd3/skills/cc-skills") |
| `{{SKILL_DIR}}` | Skill directory name |
| `{{SCRIPT_NAME}}` | Script filename (without .ts) |
| `{{ARG_NAME}}` | Argument name |
| `{{FLAG_NAME}}` | Flag name |
| `{{RELATED_COMMAND_1}}` | Related command name |
| `{{RELATED_COMMAND_2}}` | Another related command |

## Pipeline Architecture

```
scaffold.ts -> validate.ts -> evaluate.ts -> refine.ts -> adapt.ts

`evolve.ts` is a separate longitudinal loop for proposal-driven maintenance with snapshot-backed apply, history, and rollback.
```

Each script operates independently and can be invoked from CLI or slash commands.

## Workflows

Each operation has a **step-by-step workflow** combining scripts and checklists.
LLM content improvement is embedded in the normal workflow for every operation; it is not a separate CLI mode.

> **Hybrid Workflow Architecture**: Workflow-related skills use a hybrid approach — scripting for deterministic steps (file I/O, validation, parsing) and markdown checklists for non-deterministic steps (quality assessment, voice consistency). This ensures reliability while preserving flexibility. Pure scripting or pure markdown is valid when the step type demands it.

| Component | Purpose | Examples |
|-----------|---------|----------|
| **Scripts** | Deterministic tasks | File creation, validation, companion generation |
| **Checklists** | Fuzzy verification | Imperative form, description clarity, voice |

**See [references/workflows.md](references/workflows.md)** for:
- Visual flow diagrams
- Step-by-step tables with handlers
- Success/failure criteria
- Mandatory checklist items
- Retry policies

## Evaluation Dimensions (10)

Organized into 5 categories (MECE-compliant):

| # | Category | Dimension | What It Checks |
|---|---------|-----------|----------------|
| 1 | Metadata | Frontmatter Quality | Valid YAML, only allowed fields |
| 2 | Metadata | Description Effectiveness | Under 60 chars, starts with verb |
| 3 | Metadata | Naming Convention | noun-verb (grouped) or verb-noun (simple) |
| 4 | Content | Content Quality | Imperative form, writes FOR Claude |
| 5 | Content | Structure & Brevity | Under 150 lines, progressive disclosure |
| 6 | Architecture | Delegation Architecture | Proper Skill()/Task() usage |
| 7 | Architecture | Argument Design | argument-hint consistency with body |
| 8 | Security | Security | Tool restrictions, dangerous patterns |
| 9 | Security | Circular Reference Prevention | No /rd3:command-* refs or Commands Reference |
| 10 | Platform | Cross-Platform Portability | Non-portable features documented |

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

## Naming Convention

- **Grouped commands:** noun-verb pattern (e.g., `task-create`, `skill-evaluate`)
- **Simple commands:** verb-noun pattern (e.g., `review-code`)
- **Always:** Full namespace (`plugin-name:command-name`)

## Examples

See [references/command-examples.md](references/command-examples.md) for detailed examples.

## Do's and Don'ts

### Do
- Use imperative form: "Review the code" not "Second-person phrasing"
- Keep descriptions under 60 characters
- Start descriptions with a verb (Create, Generate, Review, etc.)
- Use proper namespace: `plugin-name:command-name`
- Choose the right template: simple, workflow, or plugin

### Don't
- Avoid second-person voice - write FOR Claude, not TO user
- Include non-allowed frontmatter fields (only: description, allowed-tools, model, argument-hint, disable-model-invocation)
- Create commands over 150 lines - use progressive disclosure
- Use hardcoded paths - use `CLAUDE_PLUGIN_ROOT` for portability
- Skip validation before publishing commands

## Additional Resources

- **Frontmatter Reference:** [references/frontmatter-reference.md](references/frontmatter-reference.md)
- **Evaluation Framework:** [references/evaluation-framework.md](references/evaluation-framework.md)
- **Platform Compatibility:** [references/platform-compatibility.md](references/platform-compatibility.md)
- **Troubleshooting:** [references/troubleshooting.md](references/troubleshooting.md)
- **Evolution Protocol:** [references/evolution-protocol.md](references/evolution-protocol.md)

## Advanced

### Custom Weight Profiles
Evaluate with custom profiles for specific use cases:
```bash
--profile with-pseudocode   # For workflow commands
--profile without-pseudocode # For simple commands
```

### Platform-Specific Validation
Target specific platforms during evaluation:
```bash
--platform claude    # Claude Code only
--platform codex     # Codex format only
--platform gemini    # Gemini CLI TOML
```

### Batch Operations
Process multiple commands:
```bash
# Validate all commands in directory
for f in commands/*.md; do
  bun run scripts/validate.ts "$f"
done
```

## Alternatives and Comparisons

| vs | Difference |
|----|------------|
| rd2 Commands | rd3 uses YAML frontmatter, supports multi-platform adaptation |
| Codex Skills | rd3 generates Codex format via `adapt.ts` |
| Gemini CLI | rd3 generates TOML via `adapt.ts`, triggers via `/` not `!` |

## Platform Notes

### Claude Code (Primary)
- Native format: `.md` files in `commands/` directory
- Full support for `$ARGUMENTS`, `Task()`, `Skill()`, `!`cmd``
- `CLAUDE_PLUGIN_ROOT` available for plugin commands

### Other Platforms (Generated)
These platforms do NOT natively support Claude Code syntax. Use `adapt.ts` to generate equivalents:

| Platform | Syntax Limitation |
|----------|-------------------|
| Codex | `!`cmd\$ syntax not supported - use `agents/openai.yaml` |
| Gemini CLI | `$ARGUMENTS` not supported - use TOML triggers |
| OpenClaw | `Task()`/`Skill()` not supported - use command-dispatch |
| OpenCode | Claude-specific syntax not supported |
| Antigravity | Mention-triggered only, not slash commands |

**Limitation:** When creating commands with `$ARGUMENTS`, `Task()`, `Skill()`, or `!`cmd`` syntax, document these as Claude-only features in the command. Other platforms need adapted versions via `adapt.ts`.

See [references/platform-compatibility.md](references/platform-compatibility.md) for full matrix.
