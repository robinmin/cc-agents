---
description: Adapt a Claude Code command for other AI coding platforms
argument-hint: "<command-path> [--platform all|claude|codex|gemini|openclaw|opencode|antigravity] [--dry-run] [--output <dir>]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Command Adapt

Wraps **rd3:cc-commands** skill.

Convert a Claude Code slash command to work on other AI coding platforms.

## When to Use

- Port commands to Codex, Gemini, OpenClaw, OpenCode, or Antigravity
- Generate multi-platform command variants
- Check platform compatibility

## Expected Results

- Adapted command files for target platforms
- Converted frontmatter and syntax
- Platform-specific output format

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `command-path` | Path to the command .md file | (required) |
| `--platform` | Target platform: all, claude, codex, gemini, openclaw, opencode, antigravity | all |
| `--dry-run` | Show adapted output without writing files | false |
| `--output` | Output directory for adapted files | ./adapted/ |

## Examples

```bash
# Adapt for all platforms
/rd3:command-adapt ./commands/review-code.md --platform all

# Adapt for Gemini only
/rd3:command-adapt ./commands/review-code.md --platform gemini

# Dry run to preview
/rd3:command-adapt ./commands/review-code.md --platform codex --dry-run
```

## Implementation

Delegates to **rd3:cc-commands** skill:

```
Skill(skill="rd3:cc-commands")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-commands/scripts/adapt.ts <command-path> [options]
```

## Platform Notes

- Claude Code: Use `Skill()` for skill delegation
- Other platforms: Run script directly via Bash tool
