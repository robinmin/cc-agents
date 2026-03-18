---
description: Package skill for distribution with companions
argument-hint: "<skill-path> [--output <dir>] [--platform all|claude|codex|openclaw|opencode|antigravity]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Skill Package

Wraps **rd3:cc-skills** skill.

Bundle a skill for distribution with platform-specific companions.

## When to Use

- Prepare skills for distribution
- Create distributable skill packages
- Generate platform-specific companions

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `skill-path` | Path to the skill directory | (required) |
| `--output` | Output directory | ./dist |
| `--platform` | Target platform: all, claude, codex, openclaw, opencode, antigravity | all |
| `--no-source` | Exclude SKILL.md from package | false |

## Examples

```bash
# Package with all platform companions
/rd3:skill-package ./skills/my-skill

# Package for a specific platform
/rd3:skill-package ./skills/my-skill --platform codex

# Custom output directory
/rd3:skill-package ./skills/my-skill --output ./release
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-skills** skill:

```
Skill(skill="rd3:cc-skills")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/package.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
