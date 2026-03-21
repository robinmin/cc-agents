---
description: Create a new skill with scaffolding, templates, and optio...
argument-hint: "<skill-name> [description] [--template technique|pattern|reference] [--interactions tool-wrapper|generator|reviewer|inversion|pipeline|(none)] [--path <dir>]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Skill Add

Wraps **rd3:cc-skills** skill.

Scaffold a new skill directory from a template.

## When to Use

- Create a new skill from scratch
- Initialize a skill with proper structure

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `skill-name` | Name of the skill to create | (required) |
| `description` | Optional free-text description of the skill's purpose | auto-generated |
| `--template` | Template type: technique, pattern, or reference | technique |
| `--interactions` | Comma-separated ADK behavior patterns: tool-wrapper, generator, reviewer, inversion, pipeline | (none) |
| `--path` | Output directory for the skill | ./skills |
| `--resources` | Comma-separated list: scripts, references, assets | (none) |
| `--platform` | Target platform: all, claude, codex, openclaw, opencode, antigravity | all |
| `--examples` | Include example files in resource directories | false |

## Examples

```bash
# Scaffold a technique skill (most common)
/rd3:skill-add my-api-helper

# Scaffold with a description of its purpose
/rd3:skill-add my-api-helper "REST API scaffolding and best practices"

# Scaffold a pattern skill with resources
/rd3:skill-add decision-framework --template pattern --resources scripts,references

# Scaffold a pipeline skill with reviewer behavior
/rd3:skill-add doc-pipeline --template technique --interactions pipeline,reviewer --resources references,assets
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-skills** skill:

```
Skill(skill="rd3:cc-skills", args="add $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/scaffold.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
