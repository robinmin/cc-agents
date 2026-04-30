---
description: Emit platform-specific hook configs from abstract hooks.yaml
argument-hint: "[--platform claude-code,codex,pi,opencode,gemini] [--all] [--detect] [--dry-run] [--config <path>]"
allowed-tools: ["Read", "Glob", "Bash"]
---

# Hook Emit

Wraps **rd3:cc-hooks** skill.

Generate platform-specific hook configuration files from an abstract `hooks.yaml` (or `hooks.json`). The emitter reads the abstract format and outputs configs for Claude Code, Codex, OpenCode, Pi (pi-hooks), and Gemini CLI.

## When to Use

- After creating or modifying `hooks.yaml`
- To deploy hooks to a new platform
- To preview what configs would be generated (`--dry-run`)
- After adding a new hook event or changing a matcher

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--config` | Abstract hook config file | auto-detect (hooks.yaml/json) |
| `--platform` | Comma-separated targets: claude-code,codex,opencode,pi,gemini | (required or --all or --detect) |
| `--all` | Emit for all 5 platforms | false |
| `--detect` | Auto-detect installed platforms by scanning for config dirs | false |
| `--dry-run` | Preview output without writing files | false |
| `--force` | Overwrite existing config files | false |

## Examples

```bash
# Emit for all detected platforms
/rd3:hook-emit --detect

# Emit for Pi only (preview)
/rd3:hook-emit --platform pi --dry-run

# Emit for Claude Code and Pi
/rd3:hook-emit --platform claude-code,pi

# Emit for all platforms
/rd3:hook-emit --all

# Use a specific config file
/rd3:hook-emit --config ./my-hooks.yaml --all
```

## Output Files

| Platform | Output Path | Format |
|----------|-------------|--------|
| Claude Code | `.claude/settings.json` | Claude Code hooks block |
| Codex | `codex.json` | Codex hooks section |
| OpenCode | `.opencode/plugins/cc-hooks.ts` | TypeScript plugin |
| Pi | `.pi/settings.json` | pi-hooks compatible format |
| Gemini | `.gemini/settings.json` | Gemini CLI hooks section |

## Implementation

```bash
bash plugins/rd3/skills/cc-hooks/scripts/emit-hooks.sh $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation or run script directly
- Other platforms: Run script directly via Bash tool
- Pi requires `@hsingjui/pi-hooks` extension: `pi install npm:@hsingjui/pi-hooks`
