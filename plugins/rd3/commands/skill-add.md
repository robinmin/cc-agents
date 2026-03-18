---
description: Create a new skill with scaffolding and templates
argument-hint: "<skill-name> [--template technique|pattern|reference] [--path <dir>]"
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
| `--template` | Template type: technique, pattern, or reference | technique |
| `--resources` | Comma-separated list: scripts, references, assets, agents | (none) |
| `--path` | Output directory for the skill | ./skills |
| `--platform` | Target platform: all, claude, codex, openclaw, opencode, antigravity | all |

## Examples

```bash
# Scaffold a technique skill with all resources
/rd3:skill-add my-api-helper --template technique --resources scripts,references,assets

# Scaffold a pattern skill for Claude only
/rd3:skill-add decision-framework --template pattern --platform claude

# Scaffold to a custom path
/rd3:skill-add my-skill --path ./plugins/rd3/skills
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-skills** skill:

```
Skill(skill="rd3:cc-skills")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/scaffold.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
