---
description: Create a new agent with scaffolding and templates
argument-hint: "<agent-name> [--path <dir>] [--template minimal|standard|specialist] [--tools <list>] [--model <model>] [--color <color>]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Agent Add

Wraps **rd3:cc-agents** skill.

Create a new subagent directory with scaffolding and templates.

## When to Use

- Create a new agent from scratch
- Initialize an agent with proper structure
- Start a new agent development project

## Expected Results

- New agent directory created at specified path
- Agent markdown file generated from selected template
- Template tier based on complexity (minimal/standard/specialist)

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `agent-name` | Name of the agent (hyphen-case) | (required) |
| `--path` | Output directory | `./agents` |
| `--template` | Template tier: minimal, standard, specialist | standard |
| `--tools` | Comma-separated tools | Read,Grep,Glob,Bash |
| `--model` | Model override | inherit |
| `--color` | Display color | teal |

## Examples

```bash
# Create standard agent
/rd3:agent-add my-coder --path ./agents

# Create specialist agent with specific tools
/rd3:agent-add api-expert --template specialist --tools Read,Write,Bash,WebSearch

# Create minimal agent
/rd3:agent-add helper-agent --template minimal
```

## Implementation

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-agents/scripts/scaffold.ts <agent-name> [options]
```

## Platform Notes

- Claude Code: Use `Skill()` for skill delegation
- Other platforms: Run script directly via Bash tool

## See Also

- `/rd3:agent-evaluate` - Validate created agent
- `/rd3:agent-refine` - Improve after evaluation
- `/rd3:agent-adapt` - Cross-platform conversion
