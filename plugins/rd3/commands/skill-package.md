---
description: Package skill for distribution with companions
argument-hint: "<skill-path> [--output <dir>] [--platform all|claude|codex|openclaw|opencode|antigravity]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
---

# Skill Package

Wraps **rd3:cc-skills** skill.

Bundle a skill for distribution with platform-specific companions. See [Package Workflow](references/workflows.md#package-workflow) for full step details.

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
# Package with all platform companions (most common)
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
Skill(skill="rd3:cc-skills", args="package $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/package.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
