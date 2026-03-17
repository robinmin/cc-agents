---
description: Evaluate skill quality with validation and scoring
argument-hint: "<skill-path> [--scope basic|full] [--platform all|claude|codex|openclaw|opencode|antigravity] [--json]"
---

# Skill Evaluate

Validate and evaluate skill quality across multiple dimensions.

## When to Use

- Validating a new or modified skill
- Checking skill quality before publishing

## Examples

```bash
# Basic validation
/rd3:skill-evaluate ./skills/my-skill --scope basic

# Full evaluation with scoring
/rd3:skill-evaluate ./skills/my-skill --scope full

# Quick JSON output
/rd3:skill-evaluate ./skills/my-skill --json
```

## Implementation

Delegates to **rd3:cc-skills** skill:

```
Skill(skill="rd3:cc-skills")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/evaluate.ts <skill-path> [options]
```

## See Also

- `/rd3:skill-add` - Create new skill
- `/rd3:skill-refine` - Improve skill based on evaluation
