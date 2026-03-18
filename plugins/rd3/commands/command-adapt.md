---
description: Adapt a Claude Code command for other AI coding platforms
argument-hint: "<plugin|path> [targets: all|claude|codex|gemini|openclaw|opencode|antigravity] [--component commands|all] [--dry-run]"
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
| `plugin\|path` | Plugin name (e.g., rd3) or path to command .md file | (required) |
| `targets` | Comma-separated target platforms: all, claude, codex, gemini, openclaw, opencode, antigravity | all |
| `--component` | Component to adapt: commands, all | all |
| `--dry-run` | Preview changes without applying | false |

## Examples

```bash
# Adapt all rd3 commands for all platforms
/rd3:command-adapt rd3 all

# Adapt for Gemini and OpenClaw only
/rd3:command-adapt rd3 gemini,openclaw --dry-run

# Adapt a single command file for Claude
/rd3:command-adapt ./commands/review-code.md claude
```

## Implementation

Delegates to **rd3:cc-commands** skill:

```
Skill(skill="rd3:cc-commands")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-commands/scripts/adapt.ts <plugin|path> <targets> [options]
```

## Platform Notes

- Claude Code: Use `Skill()` for skill delegation
- Other platforms: Run script directly via Bash tool
