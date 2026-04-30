---
description: Show all active hooks across platforms in a unified view
argument-hint: "[--platform <name>] [--json] [--config <path>]"
allowed-tools: ["Read", "Glob", "Bash"]
---

# Hook List

Wraps **rd3:cc-hooks** skill.

Scan all known hook config locations and display a unified table of active hooks across Claude Code, Pi, Codex, Gemini CLI, OpenCode, and abstract hooks.yaml.

## When to Use

- Understand what hooks are currently active across all platforms
- Debug hook behavior — see which hooks fire for which events
- Audit hook coverage — verify all platforms have the expected hooks
- After onboarding — confirm hooks were installed correctly
- Before a release — verify hook configs are consistent across platforms

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--platform` | Filter to specific platform: claude-code, pi, codex, gemini, opencode, abstract | (all) |
| `--json` | Output as JSON instead of table | false |
| `--config` | Also scan a specific config file | (none) |

## Examples

```bash
# Show all active hooks
/rd3:hook-list

# Show only Claude Code hooks
/rd3:hook-list --platform claude-code

# Show only Pi hooks
/rd3:hook-list --platform pi

# JSON output for automation
/rd3:hook-list --json

# Include a specific config file in the scan
/rd3:hook-list --config ./custom-hooks.json
```

## Output Format

### Table Mode (default)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  cc-hooks: Active Hooks Across All Platforms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PLATFORM           EVENT                MATCHER          TYPE       COMMAND
──────────         ─────────────────    ───────────────  ─────────  ─────────────────────────────
claude-code        PreToolUse           Write|Edit       command    bash $CLAUDE_PLUGIN_ROOT/scripts/validate-write.sh
claude-code        PreToolUse           Write|Edit       prompt     File: $TOOL_INPUT.file_path...
claude-code        Stop                 *                command    bash $CLAUDE_PLUGIN_ROOT/scripts/check-tests.sh
pi                 PreToolUse           Write|Edit       command    bash ./scripts/validate-write.sh
pi                 Stop                 *                command    bash ./scripts/check-tests.sh

Total: 5 hook(s) across 2 platform(s)
```

### JSON Mode (`--json`)

```json
{
  "hooks": [
    {"platform": "claude-code", "event": "PreToolUse", "matcher": "Write|Edit", "type": "command", "command": "bash ..."},
    ...
  ],
  "count": 5
}
```

## Scanned Locations

| Platform | Config Path |
|----------|-------------|
| Claude Code | `.claude/settings.json` |
| Pi | `.pi/settings.json` |
| Codex | `codex.json` |
| Gemini CLI | `.gemini/settings.json` |
| OpenCode | `.opencode/plugins/cc-hooks.ts` |
| Abstract | `hooks.yaml` / `hooks.yml` / `hooks.json` |

Global configs (`~/.`) are also scanned and shown with `(global)` suffix.

## Implementation

```bash
bash plugins/rd3/skills/cc-hooks/scripts/hook-list.sh $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation or run script directly
- Other platforms: Run script directly via Bash tool
- Requires `jq` for JSON parsing, `yq` or `python3` for YAML parsing
