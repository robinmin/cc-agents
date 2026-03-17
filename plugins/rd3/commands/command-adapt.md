---
description: Adapt a Claude Code command for other AI coding platforms
argument-hint: "<command-path> --target <platform|all> [--dry-run] [--output <dir>]"
---

# Command Adapt

Convert a Claude Code slash command to work on other AI coding platforms.

## When to Use

- Porting commands to Codex, Gemini, OpenClaw, OpenCode, or Antigravity
- Generating multi-platform command variants
- Checking platform compatibility

## Usage

```bash
/rd3:command-adapt <command-path> --target <platform> [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--target <platform>` | Target: claude, codex, gemini, openclaw, opencode, antigravity, all | required |
| `--dry-run` | Show adapted output without writing files | false |
| `--output <dir>` | Output directory for adapted files | ./adapted/ |
| `--verbose, -v` | Show detailed output | false |

## Supported Platforms

| Platform | Format | Key Differences |
|----------|--------|-----------------|
| Claude Code | Markdown + YAML frontmatter | Native format (source) |
| Codex | YAML skill format | Uses metadata block, plain language |
| Gemini | TOML configuration | Uses `[[commands]]` blocks |
| OpenClaw | Markdown + YAML | Uses `@name` convention |
| OpenCode | Markdown + YAML | Uses permissions block |
| Antigravity | Markdown + YAML | Uses `@name` with metadata |

## Examples

```bash
# Adapt for all platforms
/rd3:command-adapt ./commands/review-code.md --target all

# Adapt for Gemini only
/rd3:command-adapt ./commands/review-code.md --target gemini

# Dry run to preview
/rd3:command-adapt ./commands/review-code.md --target codex --dry-run
```

## Workflow

1. **Read** source command
2. **Analyze** body for platform-specific constructs
3. **Convert** frontmatter, arguments, and syntax
4. **Generate** platform-specific output
5. **Write** adapted files (unless --dry-run)

## Related Commands

- `/rd3:command-add` - Create new command
- `/rd3:command-evaluate` - Evaluate command quality
- `/rd3:command-refine` - Improve command quality

## Implementation

### For Claude Code
```bash
bun ${CLAUDE_PLUGIN_ROOT:-.}/plugins/rd3/skills/cc-commands/scripts/adapt.ts <command-path> --target <platform> [options]
```

### For Other Coding Agents
```bash
bun ./plugins/rd3/skills/cc-commands/scripts/adapt.ts <command-path> --target <platform> [options]
```
