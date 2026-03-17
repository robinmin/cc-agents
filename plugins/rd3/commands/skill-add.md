---
description: Create a new skill with scaffolding and templates
argument-hint: "<skill-name> [--template technique|pattern|reference] [--resources scripts|references|assets|agents] [--platform all|claude|codex|openclaw|opencode|antigravity]"
---

# Skill Add

Create a new skill directory with scaffolding and templates.

## When to Use

- Create a new skill from scratch
- Initialize a skill with proper structure

## Examples

```bash
# Create technique skill with all resources
/rd3:skill-add my-api-helper --template technique --resources scripts,references,assets

# Create pattern skill for Claude only
/rd3:skill-add decision-framework --template pattern --platform claude
```

## Implementation

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/scaffold.ts <skill-name> [options]
```

## See Also

- `/rd3:skill-evaluate` - Validate created skill
- `/rd3:skill-refine` - Improve after evaluation
