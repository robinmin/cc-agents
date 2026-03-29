---
description: Scaffold a new slash definition with best practices
argument-hint: "<command-name> [description] [--template simple|workflow|plugin] [--path <dir>]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
---

# Command Add

Wraps **rd3:cc-commands** skill.

Scaffold a new slash definition file from a template. **This command delegates to the rd3:cc-commands skill** — the invoking agent follows the [Scaffold Workflow](references/workflows.md#scaffold-workflow) which includes:

1. **Template Select** — Run `scaffold.ts` to create .md file
2. **Name Validate** — Ensure kebab-case, no conflicts
3. **LLM Content Improvement** — Agent verifies fuzzy quality (description form, argument-hint, allowed-tools)
4. **Generate Companions** — Run `adapt.ts` for platform variants

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

**Claude Code delegates via Skill():**

```
Skill(skill="rd3:cc-commands", args="scaffold $ARGUMENTS")
```

The invoking agent:
1. Loads `plugins/rd3/skills/cc-commands/SKILL.md`
2. Reads `plugins/rd3/skills/cc-commands/references/workflows.md`
3. Follows the Scaffold Workflow — running scaffold script, then performing LLM content improvement

**Direct script execution (other platforms):**
```bash
bun plugins/rd3/skills/cc-commands/scripts/scaffold.ts $ARGUMENTS
```

## LLM Content Improvement (Agent Step)

After scaffolding, the invoking agent performs these checks:

| # | Item | Check |
|---|------|-------|
| 1 | Description form | Imperative, starts with verb, under 60 chars |
| 2 | Description specificity | Not vague like "helper" |
| 3 | argument-hint present | Matches actual arguments |
| 4 | allowed-tools appropriate | Minimal necessary set |
| 5 | Examples concrete | Show real usage with `<example>` + `<commentary>` |
| 6 | No circular references | No self-referencing `/rd3:command-*` |

**If FAIL:** Re-scaffold with corrections

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation (includes LLM content improvement)
- Other platforms: Run script directly via Bash tool
