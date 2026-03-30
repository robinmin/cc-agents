---
name: token-saver
description: "RTK token optimization proxy. Transparent CLI proxy that reduces LLM token consumption by 60-90% via PreToolUse hook auto-rewrite. Use this skill when checking token savings, troubleshooting hook issues, manually optimizing commands, or when the user mentions rtk, token cost, token usage, output compression, or command filtering."
license: MIT
version: 1.0.0
created_at: 2026-03-30
updated_at: 2026-03-30
tags: [rtk, token, optimization, proxy, cli]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  interactions:
    - tool-wrapper
  auto-trigger: false
  trigger_keywords:
    - rtk
    - token savings
    - token cost
    - token usage
    - output compression
    - command filtering
    - token optimization
    - hook rewrite
    - token killer
---

# RTK - Token Optimization Proxy

**High-performance CLI proxy that reduces LLM token consumption by 60-90%.**

RTK transparently intercepts Bash commands via a PreToolUse hook, filtering and compressing output so the LLM receives compact results. Single Rust binary, zero dependencies, <10ms overhead.

## Overview

This is a reference skill for operating RTK safely and effectively in agent-driven development workflows. It documents installation, hook behavior, supported commands, output recovery, and troubleshooting so the agent can reason about RTK from verified project context instead of guessing command behavior.

## When to Use

Use this skill when:
- The user asks about reducing token costs or LLM context usage
- Troubleshooting an RTK hook installation or configuration
- Manually optimizing specific commands not covered by auto-rewrite
- The user mentions "rtk", "token killer", or "output compression"
- Checking token savings analytics (`rtk gain`)

Do NOT use this skill for:
- General shell command execution (RTK handles that transparently via hooks)
- Token counting in prompts/responses (use dedicated token counting tools)

## Quick Start

```bash
# Install
brew install rtk

# Verify correct package (avoid name collision with "Rust Type Kit")
rtk --version    # Must print a version successfully
rtk gain         # Must show token savings stats, not "command not found"

# Initialize hook for Claude Code
rtk init -g                 # Global hook (recommended)
rtk init -g --auto-patch    # Non-interactive (CI/CD)
rtk init -g --hook-only     # Hook only, no RTK.md context
rtk init --show             # Verify installation

# Other AI tools
rtk init -g --gemini        # Gemini CLI
rtk init -g --codex         # Codex (OpenAI)
rtk init -g --copilot       # GitHub Copilot
rtk init --agent cursor     # Cursor
rtk init --agent windsurf   # Windsurf
rtk init --agent cline      # Cline / Roo Code
rtk init -g --opencode      # OpenCode

# Full uninstall
rtk init -g --uninstall
```

After `rtk init -g`, restart the AI tool. Bash commands are then automatically rewritten (e.g., `git status` -> `rtk git status`). The LLM never sees the rewrite; it receives compressed output.

**Important**: The hook only intercepts Bash tool calls. Built-in tools like `Read`, `Grep`, `Glob` do not pass through the hook. For those workflows, use shell commands (`rtk read`, `rtk grep`, `rtk find`) directly.

## How It Works

```
  Without rtk:                                    With rtk:

  Claude  --git status-->  shell  -->  git         Claude  --git status-->  RTK  -->  git
    ^                                   |            ^                      |          |
    |        ~2,000 tokens (raw)        |            |   ~200 tokens        | filter   |
    +-----------------------------------+            +------- (filtered) ---+----------+
```

Four strategies applied per command type:

1. **Smart Filtering** - Removes noise (comments, whitespace, boilerplate)
2. **Grouping** - Aggregates similar items (files by directory, errors by type)
3. **Truncation** - Keeps relevant context, cuts redundancy
4. **Deduplication** - Collapses repeated log lines with counts

## Workflows

### Interactive Session

```bash
# Start a session — RTK tracks all commands automatically
rtk init -g                 # Install hook
# ... use Claude Code normally, all Bash commands are optimized ...

# Check savings at any time
rtk gain                    # Session summary
rtk gain --graph            # Visual graph
```

### Command Optimization

```bash
# Direct command usage
rtk git status              # Instead of git status
rtk ls .                    # Instead of ls
rtk cargo test              # Instead of cargo test

# Proxy mode (bypass filtering when needed)
rtk proxy npm install express

# Output recovery after failures
# Full output saved to ~/.local/share/rtk/tee/<timestamp>_<command>.log
```

### Project Discovery

```bash
rtk discover                # Current project token stats
rtk discover --all --since 7 # All projects, last 7 days
rtk session                 # RTK adoption across sessions
```

## Token Savings (30-min Session)

| Operation | Standard | rtk | Savings |
|-----------|----------|-----|---------|
| `ls` / `tree` | 2,000 | 400 | -80% |
| `cat` / `read` | 40,000 | 12,000 | -70% |
| `grep` / `rg` | 16,000 | 3,200 | -80% |
| `git status` | 3,000 | 600 | -80% |
| `git diff` | 10,000 | 2,500 | -75% |
| `git log` | 2,500 | 500 | -80% |
| `git add/commit/push` | 1,600 | 120 | -92% |
| `cargo test` / `npm test` | 25,000 | 2,500 | -90% |
| `ruff check` | 3,000 | 600 | -80% |
| `pytest` | 8,000 | 800 | -90% |
| `go test` | 6,000 | 600 | -90% |
| `docker ps` | 900 | 180 | -80% |
| **Total** | **~118,000** | **~23,900** | **-80%** |

## Supported Commands

RTK supports 50+ commands across files, git, test runners, build tools, package managers, containers, and data utilities.

See [references/commands.md](references/commands.md) for the complete command reference with examples.

Key commands:

```bash
rtk ls .                        # Token-optimized directory tree
rtk read file.rs                # Smart file reading
rtk read file.rs -l aggressive  # Signatures only (strips bodies)
rtk smart file.rs               # 2-line heuristic code summary
rtk git status                  # Compact status
rtk test cargo test             # Show failures only (-90%)
rtk lint                        # ESLint/Biome grouped by rule/file
rtk gain                        # Token savings summary
rtk proxy <cmd>                 # Raw passthrough + tracking
```

## Proxy Mode

When a command has no RTK filter, or the filter causes issues, use proxy mode to execute without filtering while still tracking usage:

```bash
rtk proxy git log --oneline -20    # Full output, tracked
rtk proxy npm install express      # Raw npm output
```

Proxy commands appear in `rtk gain --history` with 0% savings but preserve usage statistics.

## Output Recovery (Tee)

When a filtered command fails, RTK saves the full unfiltered output to disk and prints a one-line hint:

```
FAILED: 2/15 tests
[full output: ~/.local/share/rtk/tee/1707753600_cargo_test.log]
```

Read the full output file to debug without re-running the command.

## Token Savings Analytics

```bash
rtk gain                    # Summary stats
rtk gain --graph            # ASCII graph (last 30 days)
rtk gain --history          # With recent command history
rtk gain --daily            # Daily breakdown
rtk gain --all --format json # JSON export

rtk discover                # Current project stats
rtk discover --all --since 7 # All projects, last 7 days
rtk session                 # RTK adoption across recent sessions
```

## Configuration

```bash
# Config file location
~/.config/rtk/config.toml
# macOS default:
~/Library/Application Support/rtk/config.toml

# Hook files (created by rtk init)
~/.claude/hooks/rtk-rewrite.sh   # Auto-rewrite hook (primary)

# Data files
~/.local/share/rtk/history.db    # Token tracking database
~/.local/share/rtk/tee/          # Full output recovery logs
```

Config file structure:

```toml
[tracking]
database_path = "/path/to/custom.db"  # default: ~/.local/share/rtk/history.db

[hooks]
exclude_commands = ["curl", "playwright"]  # skip rewrite for these

[tee]
enabled = true          # save raw output on failure (default: true)
mode = "failures"       # "failures", "always", or "never"
max_files = 20          # rotation limit
```

### Hook Mechanism

The `rtk-rewrite.sh` hook runs as a PreToolUse:Bash hook. It calls `rtk rewrite <command>` to determine if a command has an RTK equivalent:

- **Exit 0**: Rewrite found, no deny/ask rules -> auto-allow with compressed output
- **Exit 1**: No RTK equivalent -> pass through unchanged
- **Exit 2**: Deny rule matched -> let Claude Code handle it
- **Exit 3**: Ask rule matched -> rewrite but prompt user for confirmation

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Hook not working | Restart AI tool after `rtk init -g` |
| Wrong rtk package | `rtk gain` should work; if not, `brew reinstall rtk` |
| Check hook status | `rtk init --show` |
| Full uninstall | `rtk init -g --uninstall` |
| Full output needed | Check `~/.local/share/rtk/tee/` for unfiltered logs |
| Filter causes issues | Use `rtk proxy <cmd>` to bypass filtering |
| Dependency missing | RTK itself is a single Rust binary with no runtime dependency on `jq`; if commands fail, verify `rtk --version`, PATH, and the target tool binary instead |

## Name Collision Warning

Two different "rtk" projects exist:
- **This project**: Rust Token Killer (`rtk-ai/rtk`) - the one we want
- **reachingforthejack/rtk**: Rust Type Kit - generates Rust types (WRONG)

Verify: `rtk gain` should show token savings stats, not "command not found".

## Platform Notes

### Claude Code
- Primary target. PreToolUse hook auto-rewrites Bash commands.
- `rtk init -g` installs hook + RTK.md context reference.

### Codex (OpenAI)
- Uses `AGENTS.md` + `RTK.md` global instructions instead of hooks.
- `rtk init -g --codex` creates instruction files at `~/.codex/`.

### Gemini CLI
- Uses BeforeTool hook via `rtk hook gemini`.
- `rtk init -g --gemini` patches `~/.gemini/settings.json`.

### OpenCode
- Uses `tool.execute.before` plugin hook.
- `rtk init -g --opencode` creates plugin at `~/.config/opencode/plugins/rtk.ts`.

### Cursor / Windsurf / Cline
- Uses agent-specific hook format.
- `rtk init --agent cursor/windsurf/cline` sets up the appropriate hook.

## Additional Resources

- [RTK Command Reference](references/commands.md) — Complete reference for all supported commands
- [RTK GitHub Repository](https://github.com/rtk-ai/rtk) — Source and issue tracker
- [RTK Documentation](https://rtk.ai/docs) — Full documentation
