---
description: Create a new agent with scaffolding and templates
argument-hint: "<agent-name> [description] [--path <dir>] [--template <tier>] [--skills <list>] [--tools <list>]"
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
| `description` | Optional free-text description of the agent's purpose | auto-generated |
| `--path` | Output directory | ./agents |
| `--template` | Template tier: minimal, standard, specialist | standard |
| `--skills` | Comma-separated skills to delegate to | (none) |
| `--tools` | Comma-separated tools list | Read,Grep,Glob,Bash |
| `--model` | Model override | inherit |
| `--color` | Display color | teal |
| `--plugin-name` | Plugin name for namespacing | (none) |

## Examples

```bash
# Scaffold a standard agent (most common)
/rd3:agent-add my-coder

# Scaffold with a description of its purpose
/rd3:agent-add expert-foo "Thin wrapper for cc-foo skill" --skills rd3:cc-foo

# Scaffold a specialist agent with specific tools
/rd3:agent-add api-expert --template specialist --tools Read,Write,Bash,WebSearch
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-agents** skill:

```
Skill(skill="rd3:cc-agents", args="scaffold $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-agents/scripts/scaffold.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
