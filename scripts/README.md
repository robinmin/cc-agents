# Script Installer Guide

Installer scripts for syncing `cc-agents` assets to the supported AI coding platforms.

The current entrypoint is `scripts/setup-all.sh`. It installs:

- main agent configs via `scripts/command/magents.sh`
- plugin skills via `scripts/command/skills.sh`
- subagents via `scripts/command/subagents.sh`
- slash-command wrappers via `scripts/command/commands.sh`

Claude Code is handled differently from the other platforms:

- `claude-code` uses the Claude plugin marketplace update flow
- all other targets use the command installers under `scripts/command/`

## Quick Start

```bash
# Install defaults (rd3 + wt) to all supported targets
./scripts/setup-all.sh

# Dry run a subset of targets
./scripts/setup-all.sh --targets=codex,gemini-cli,openclaw --dry-run

# Install only rd3
./scripts/setup-all.sh --plugins=rd3

# Skip main-agent config installation
./scripts/setup-all.sh --skip-magents
```

## Supported Targets

| Target | Install Mode | Global skill location used by this repo |
|---|---|---|
| `claude-code` | Claude marketplace update | N/A |
| `codex` | command installers | `~/.agents/skills/` |
| `gemini-cli` | command installers | `~/.agents/skills/` |
| `antigravity` | command installers | `~/.gemini/antigravity/skills/` |
| `opencode` | command installers | `~/.agents/skills/` |
| `openclaw` | command installers | `~/.agents/skills/` |
| `pi` | command installers | `~/.agents/skills/` for skills/commands (shared), `~/.pi/agent/agents/` for subagents |

### Global Skill Policy

For global installs, this codebase uses a shared personal skill pool at `~/.agents/skills/` for:

- Codex
- Gemini CLI
- OpenCode
- OpenClaw
- Pi (skills and command wrappers only)

This avoids duplicating the same skill set into several tool-specific folders. Pi auto-loads skills from both `~/.agents/skills/` and `~/.pi/agent/skills/`; writing to the latter would create duplicates that confuse Pi at runtime, so global installs route to the shared pool.

Pi subagents still use the Pi-native path because there is no shared equivalent:

- `~/.pi/agent/agents/` for `pi-subagents` agents

`antigravity` is still installed to its native path:

- `~/.gemini/antigravity/skills/`

Tool-native locations may still exist and may still be discovered by the tool. This installer prefers the shared pool above for Codex/Gemini/OpenCode/OpenClaw/Pi, while Antigravity uses its native path. Pi-specific `allowed-tools` rewriting (Claude-style → Pi-style names) only applies to project-mode installs at `.pi/agent/skills/`; the shared pool keeps Claude-style names that Pi tolerates.

## Usage

```bash
./scripts/setup-all.sh [options]
```

### Options

| Option | Meaning |
|---|---|
| `--targets=LIST` | Comma-separated targets. Default: `all` |
| `--agent=NAME` | Main agent config name for `magents.sh`. Default: `team-stark-children` |
| `--plugins=LIST` | Plugins to install. Default: `rd3,wt` |
| `--skip-magents` | Skip main agent config installation |
| `--skip-skills` | Skip plugin skill installation |
| `--skip-subagents` | Skip subagent installation |
| `--skip-commands` | Skip slash-command wrapper installation |
| `--dry-run` | Print planned actions without writing files |
| `--verbose` | Enable more installer output |
| `--help` | Show CLI help |

### Examples

```bash
# Install everything everywhere
./scripts/setup-all.sh

# Install rd3 only to Codex and Pi
./scripts/setup-all.sh --targets=codex,pi --plugins=rd3

# Preview non-Claude installs
./scripts/setup-all.sh --targets=codex,gemini-cli,opencode,openclaw,pi --dry-run

# Install only skills and commands
./scripts/setup-all.sh --skip-magents --skip-subagents
```

## What `setup-all.sh` Does

### Claude Code

For `claude-code`, the script:

- clears the local Claude plugin cache
- updates the `cc-agents` marketplace entry
- updates the selected plugins such as `rd3@cc-agents` and `wt@cc-agents`
- installs the selected main agent config into `~/.claude/CLAUDE.md` unless `--skip-magents` is set

### Non-Claude Targets

For non-Claude targets, the script orchestrates:

1. `magents.sh`
2. `skills.sh`
3. `subagents.sh`
4. `commands.sh`

These command installers resolve target-specific output directories and copy adapted assets into the correct places.

## Direct Command Installers

These are useful when you want a narrower workflow than `setup-all.sh`.

### `skills.sh`

Installs plugin skills and command wrappers.

```bash
./scripts/command/skills.sh rd3 codexcli,geminicli,opencode --global
```

Notes:

- uses an isolated rulesync workspace for validation/generation
- for global installs, routes compatible targets to `~/.agents/skills/`
- for project installs, uses platform-specific project paths such as `.codex/skills/`, `.gemini/skills/`, `.agents/skills/`, or `skills/`

### `subagents.sh`

Installs subagent definitions from `plugins/<plugin>/agents/*.md`.

- Most targets receive Skills 2.0 skill directories.
- Pi receives native `pi-subagents` agent files under `~/.pi/agent/agents/` or `.pi/agents/`.

```bash
./scripts/command/subagents.sh rd3 codexcli,openclaw,pi --global
```

### `commands.sh`

Installs slash-command definitions from `plugins/<plugin>/commands/*.md` as skill directories.

```bash
./scripts/command/commands.sh rd3 codexcli,geminicli,pi --global
```

### `magents.sh`

Installs or adapts the main agent config for the target platform.

```bash
./scripts/command/magents.sh team-stark-children codexcli
```

## Output Paths

### Global installs

| Target | Path |
|---|---|
| `codex` | `~/.agents/skills/` |
| `gemini-cli` | `~/.agents/skills/` |
| `antigravity` | `~/.gemini/antigravity/skills/` |
| `opencode` | `~/.agents/skills/` |
| `openclaw` | `~/.agents/skills/` |
| `pi` | `~/.agents/skills/` for skills/commands (shared), `~/.pi/agent/agents/` for subagents |

### Project installs

| Target | Path |
|---|---|
| `codex` | `.codex/skills/` |
| `gemini-cli` | `.gemini/skills/` and `.agents/skills/` |
| `antigravity` | `.gemini/antigravity/skills/` |
| `opencode` | `.opencode/skills/` and `.agents/skills/` |
| `openclaw` | `skills/` |
| `pi` | `.pi/agent/skills/` for skills/commands, `.pi/agent/agents/` for subagents |

## Requirements

### Common

- Bash
- a checked-out `cc-agents` repo

### Claude Code

- `claude` CLI installed and authenticated

### Non-Claude targets

- `rulesync` available directly or through `npx`

The command installers already handle the rulesync invocation. You generally do not need to run rulesync manually.

## Troubleshooting

### `claude CLI not found`

Install Claude Code from:

- https://code.claude.com

### `rulesync not found`

Install it globally:

```bash
npm install -g rulesync
```

Or rely on `npx` if your environment supports it.

### `Invalid target`

Check the supported names:

```bash
./scripts/setup-all.sh --help
```

Current valid targets:

- `claude-code`
- `codex`
- `gemini-cli`
- `antigravity`
- `opencode`
- `openclaw`
- `pi`

### Permission denied

Ensure the scripts are executable:

```bash
chmod +x scripts/setup-all.sh
chmod +x scripts/command/*.sh
chmod +x scripts/lib/*.sh
```

## Architecture

```text
scripts/
├── setup-all.sh
├── README.md
├── TOOL_NOTES.md
├── lib/
│   └── common.sh
└── command/
    ├── magents.sh
    ├── skills.sh
    ├── subagents.sh
    └── commands.sh
```

## See Also

- [TOOL_NOTES.md](./TOOL_NOTES.md)
- [setup-all.sh](/Users/robin/projects/cc-agents/scripts/setup-all.sh)
- [skills.sh](/Users/robin/projects/cc-agents/scripts/command/skills.sh)
- [subagents.sh](/Users/robin/projects/cc-agents/scripts/command/subagents.sh)
- [commands.sh](/Users/robin/projects/cc-agents/scripts/command/commands.sh)
