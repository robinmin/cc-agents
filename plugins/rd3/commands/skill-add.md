---
description: Create a new skill with scaffolding
argument-hint: "<skill-name> [--template technique|pattern|reference] [--resources scripts|references|assets|agents] [--platform all|claude|codex|openclaw|opencode|antigravity]"
---

# Skill Add

Create a new skill directory with templates and platform-specific companions.

## When to Use

- Creating a new skill from scratch
- Scaffolding a skill directory with proper structure

## Examples

```bash
# Create a technique skill with all resources
/rd3:skill-add my-api-helper --template technique --resources scripts,references,assets

# Create a pattern skill for Claude Code only
/rd3:skill-add decision-framework --template pattern --platform claude

# Create with example files
/rd3:skill-add api-reference --template reference --resources scripts --examples
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

## See Also

- `/rd3:skill-evaluate` - Validate skill quality
- `/rd3:skill-refine` - Improve skill after evaluation
