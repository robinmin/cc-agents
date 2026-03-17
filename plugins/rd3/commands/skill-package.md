---
description: Package skill for distribution with platform companions
argument-hint: "<skill-path> [--output <dir>] [--platform all|claude|codex|openclaw|opencode|antigravity] [--no-source]"
---

# Skill Package

Package a skill for distribution with all platform-specific companions.

## When to Use

- Preparing skills for distribution
- Creating distributable skill packages
- Generating platform-specific companions

## Examples

```bash
# Package with all platforms
/rd3:skill-package ./skills/my-skill

# Package for specific platform
/rd3:skill-package ./skills/my-skill --platform codex

# Custom output directory
/rd3:skill-package ./skills/my-skill -o ./release
```

## Implementation

Delegates to **rd3:cc-skills** skill:

```
Skill(skill="rd3:cc-skills")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/package.ts <skill-path> [options]
```

## See Also

- `/rd3:skill-add` - Create new skill
- `/rd3:skill-evaluate` - Evaluate skill quality
- `/rd3:skill-refine` - Refine skill based on evaluation
