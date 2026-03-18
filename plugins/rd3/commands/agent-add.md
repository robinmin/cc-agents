---
description: Create a new agent with scaffolding and templates
argument-hint: "<agent-name> [--template minimal|standard|specialist] [--path <dir>] [--tools <list>]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Agent Add

Wraps **rd3:cc-agents** skill.

Scaffold a new subagent file from a tiered template.

## When to Use

- Create a new agent from scratch
- Initialize an agent with proper structure

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `agent-name` | Name of the agent (hyphen-case) | (required) |
| `--path` | Output directory | ./agents |
| `--template` | Template tier: minimal, standard, specialist | standard |
| `--tools` | Comma-separated tools list | Read,Grep,Glob,Bash |
| `--model` | Model override | inherit |
| `--color` | Display color | teal |
| `--description` | Agent description for frontmatter | auto-generated |
| `--plugin-name` | Plugin name for namespacing | (none) |

## Examples

```bash
# Scaffold a standard agent
/rd3:agent-add my-coder --path ./agents

# Scaffold a specialist agent with specific tools
/rd3:agent-add api-expert --template specialist --tools Read,Write,Bash,WebSearch

# Scaffold a minimal agent with description
/rd3:agent-add helper --template minimal --description "Simple helper for file operations"
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-agents** skill:

```
Skill(skill="rd3:cc-agents")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-agents/scripts/scaffold.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
