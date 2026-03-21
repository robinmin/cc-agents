---
description: Adapt a slash definition for other AI coding platforms
argument-hint: "<plugin|path> [targets] [--component commands|all] [--dry-run]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
disable-model-invocation: true
---

# Command Adapt

Wraps **rd3:cc-commands** skill.

Convert a Claude Code slash definition to other platform formats.

## When to Use

- Port definitions to Codex, Gemini, OpenClaw, OpenCode, or Antigravity
- Generate multi-platform variants
- Check platform compatibility

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `plugin\|path` | Plugin name (e.g., rd3) or path to .md file | (required) |
| `targets` | Comma-separated platforms: all, claude, codex, gemini, openclaw, opencode, antigravity | all |
| `--component` | Component to adapt: commands, all | all |
| `--dry-run` | Preview changes without applying | false |

## Examples

```bash
# Adapt all rd3 definitions for all platforms (most common)
/rd3:command-adapt rd3 all

# Adapt for Gemini and OpenClaw only
/rd3:command-adapt rd3 gemini,openclaw --dry-run

# Adapt a single file
/rd3:command-adapt ./commands/review-code.md claude
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-commands** skill:

```
Skill(skill="rd3:cc-commands", args="adapt $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-commands/scripts/adapt.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
