---
description: Package skill for distribution with platform companions
argument-hint: "<skill-path> [--output <dir>] [--platform <name>] [--no-source] [--json]"
---

# Skill Package

Package a skill for distribution with all platform-specific companions.

## When to Use

- Preparing skills for distribution
- Creating distributable skill packages
- Generating platform-specific companions for published skills

## Usage

```bash
/rd3:skill-package <skill-path> [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--output, -o` | Output directory | `./dist` |
| `--platform <name>` | Target platform: all, claude, codex, openclaw, opencode, antigravity | all |
| `--no-source` | Exclude SKILL.md from package | false |
| `--json` | Output results as JSON | false |

## Examples

```bash
# Package skill with all platforms
/rd3:skill-package ./skills/my-skill

# Package for specific platform
/rd3:skill-package ./skills/my-skill --platform codex

# Custom output directory
/rd3:skill-package ./skills/my-skill -o ./release

# Package without source
/rd3:skill-package ./skills/my-skill --no-source
```

## Workflow

This command:

1. **Reads** the skill SKILL.md
2. **Generates** platform-specific companions
3. **Copies** files to output directory
4. **Reports** package size and contents

## Output

The package includes:
- SKILL.md (unless --no-source)
- Platform-specific companion files

## Exit Codes

- `0` - Packaging completed successfully
- `1` - Packaging failed

## Related Commands

- `/rd3:skill-add` - Create new skill
- `/rd3:skill-evaluate` - Evaluate skill quality
- `/rd3:skill-refine` - Refine skill based on evaluation
