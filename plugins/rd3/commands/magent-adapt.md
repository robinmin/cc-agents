---
description: "Convert a main agent config between platform formats"
argument-hint: "<source-path> --to <platform> [--from <platform>] [--output <path>] [--dry-run] [--json]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
---

# magent-adapt

Delegate to the **rd3:cc-magents** skill.

Convert a main agent configuration from one platform format to another. Apply the capability-aware adapter and surface every lossy mismatch explicitly.

## When to Use

- Migrate from one AI coding platform to another
- Generate a platform-specific config from a universal `agents-md` source
- Test how a config translates to a different platform's conventions
- Produce native files at a target's preferred location (e.g. `.cursor/rules/`)

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `<source-path>` | Path to source config (positional) | (required) |
| `--to` | Target platform — single target, required | (required) |
| `--from` | Source platform hint | auto-detect |
| `--output` | Output file or directory | (cwd) |
| `--dry-run` | Generate without writing | false |
| `--json` | Emit JSON result | false |

Note: `--to all` is **not supported** — adapt targets one platform per invocation. To produce multiple platforms, run the command multiple times.

## Supported Platforms

Pick one target from the 15-platform capability registry: `agents-md`, `claude-code`, `gemini-cli`, `codex`, `cursor`, `windsurf`, `opencode`, `openclaw`, `copilot`, `cline`, `zed`, `amp`, `aider`, `antigravity` (LOW confidence), `pi` (LOW confidence).

Apply alias normalization: `claude` → `claude-code`, `gemini` → `gemini-cli`, `cursorrules` → `cursor`, `windsurfrules` → `windsurf`, `opencode-rules` → `opencode`, `vscode-instructions` → `copilot`.

## Conversion Flow

```
Source -> Parse -> Capability Map -> Generate -> Target (+ loss report)
```

Convert through a capability map. Surface unsupported features as explicit warnings rather than silently drop them. Review the loss report carefully when `--to` targets a low-confidence platform (`antigravity`, `pi`).

Common lossy conversions: Claude `hooks:` and forked-context modes are not portable; Gemini `save_memory` is Gemini-only; path-scoped globs flatten on platforms without scoping; multi-file imports inline on single-file targets.

## Implementation

Delegates to **rd3:cc-magents** skill:

```
Skill(skill="rd3:cc-magents", args="adapt $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-magents/scripts/adapt.ts $ARGUMENTS
```

## Examples

```bash
# Convert CLAUDE.md to AGENTS.md (universal)
/rd3:magent-adapt CLAUDE.md --to agents-md --output AGENTS.md

# Convert AGENTS.md to Cursor rules
/rd3:magent-adapt AGENTS.md --to cursor --output .cursor/rules/main.mdc

# Convert with explicit source hint and dry-run preview
/rd3:magent-adapt CLAUDE.md --from claude-code --to gemini-cli --output GEMINI.md --dry-run

# Convert to OpenCode config
/rd3:magent-adapt AGENTS.md --to opencode --output opencode.json
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
