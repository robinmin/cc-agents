---
description: "Synthesize a new main agent configuration from a template"
argument-hint: "[<template>] [--to <platform>] [--output <path>] [--dry-run] [--json]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
---

# Magent Add

Delegate to the **rd3:cc-magents** skill.

Generate a new main agent configuration file from one of six built-in templates. Apply the chosen template to any of 15 supported platforms. Run validation after generation to confirm structural correctness.

## When to Use

- Bootstrap a main agent config for a new project
- Create an `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or other platform config
- Scaffold a main agent for a new codebase
- Produce a baseline that will be refined or adapted later

## Arguments

| Argument | Description | Default |
|---------|-------------|---------|
| `<template>` | Positional template name (see Available Templates below) | `dev-agent` |
| `--to` | Target platform (see Supported Platforms below) | `agents-md` |
| `--output` | Output file or directory | (cwd) |
| `--dry-run` | Generate without writing files | false |
| `--json` | Emit JSON result | false |

Apply `--platform` interchangeably with `--to` (alias). Convert platform aliases automatically: `claude` → `claude-code`, `gemini` → `gemini-cli`, `cursorrules` → `cursor`, `windsurfrules` → `windsurf`.

## Available Templates

| Template | Purpose |
|----------|---------|
| `dev-agent` | Software development with coding standards (default) |
| `research-agent` | Research and analysis workflows |
| `content-agent` | Content creation and documentation |
| `data-agent` | Data science and ML workflows |
| `devops-agent` | DevOps and infrastructure |
| `general-agent` | General-purpose assistant |

## Supported Platforms

`agents-md`, `claude-code`, `gemini-cli`, `codex`, `cursor`, `windsurf`, `opencode`, `openclaw`, `copilot`, `cline`, `zed`, `amp`, `aider`, `antigravity` (low confidence), `pi` (low confidence).

## Implementation

Delegates to **rd3:cc-magents** skill:

```
Skill(skill="rd3:cc-magents", args="add $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-magents/scripts/synthesize.ts $ARGUMENTS
```

## Examples

```bash
# Default dev-agent template, AGENTS.md output
/rd3:magent-add

# Create CLAUDE.md with dev-agent template
/rd3:magent-add dev-agent --to claude-code --output CLAUDE.md

# Data-science template targeting AGENTS.md
/rd3:magent-add data-agent --to agents-md

# Preview without writing
/rd3:magent-add devops-agent --to gemini-cli --output GEMINI.md --dry-run
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
