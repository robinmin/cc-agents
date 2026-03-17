---
description: Create a new skill with scaffolding and templates
argument-hint: "<skill-name> [--template technique|pattern|reference] [--resources scripts|references|assets|agents]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Skill Add

Wraps **rd3:cc-skills** skill.

Create a new skill directory with scaffolding and templates.

## When to Use

- Create a new skill from scratch
- Initialize a skill with proper structure

## Expected Results

- New skill directory created at specified path
- SKILL.md generated from selected template
- Resource directories created (scripts/, references/, assets/, agents/)
- Platform companion files generated

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `skill-name` | Name of the skill to create | (required) |
| `--template` | Template type: technique, pattern, or reference | technique |
| `--resources` | Comma-separated list: scripts, references, assets, agents | (none) |
| `--platform` | Target platform: all, claude, codex, openclaw, opencode, antigravity | all |

## Examples

```bash
# Create technique skill with all resources
/rd3:skill-add my-api-helper --template technique --resources scripts,references,assets

# Create pattern skill for Claude only
/rd3:skill-add decision-framework --template pattern --platform claude
```

## Implementation

Delegates to **rd3:cc-skills** skill:

```
Skill(skill="rd3:cc-skills")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/scaffold.ts <skill-name> [options]
```

## Platform Notes

- Claude Code: Use `Skill()` for skill delegation
- Other platforms: Run script directly via Bash tool

## See Also

- `/rd3:skill-evaluate` - Validate created skill
- `/rd3:skill-refine` - Improve after evaluation
