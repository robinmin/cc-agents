---
description: Package skill for distribution with platform companions
argument-hint: "<skill-path> [--output <dir>] [--platform all|claude|codex|openclaw|opencode|antigravity]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Skill Package

Wraps **rd3:cc-skills** skill.

Package a skill for distribution with all platform-specific companions.

## When to Use

- Prepare skills for distribution
- Create distributable skill packages
- Generate platform-specific companions

## Expected Results

- Distribution-ready package directory
- Platform-specific companion files (if --platform is not claude)
- Package size and contents summary

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `skill-path` | Path to the skill directory | (required) |
| `--output` | Output directory | ./dist |
| `--platform` | Target platform: all, claude, codex, openclaw, opencode, antigravity | all |
| `--no-source` | Exclude SKILL.md from package | false |

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

## Platform Notes

- Claude Code: Use `Skill()` for skill delegation
- Other platforms: Run script directly via Bash tool

## See Also

- `/rd3:skill-add` - Create new skill
- `/rd3:skill-evaluate` - Evaluate skill quality
- `/rd3:skill-refine` - Refine skill based on evaluation
