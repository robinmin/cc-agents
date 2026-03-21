---
description: Create a new agent with scaffolding and templates
argument-hint: "<agent-name> [description] [--path <dir>] [--template <tier>] [--skills <list>] [--tools <list>]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
---

# Agent Add

Wraps **rd3:cc-agents** skill.

Scaffold a new subagent file from a tiered template. **This command delegates to the rd3:cc-agents skill** — the invoking agent follows the [Scaffold Workflow](references/workflows.md#scaffold-workflow) which includes:

1. **Scaffold** — Run `scaffold.ts` to create agent .md file
2. **Validate** — Check structure and required fields
3. **LLM Verify** — Agent verifies description pattern, trigger phrases, examples, voice
4. **Platform Check** — Verify compatibility with target platforms

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

**Claude Code delegates via Skill():**

```
Skill(skill="rd3:cc-agents", args="scaffold $ARGUMENTS")
```

The invoking agent:
1. Loads `plugins/rd3/skills/cc-agents/SKILL.md`
2. Reads `plugins/rd3/skills/cc-agents/references/workflows.md`
3. Follows the Scaffold Workflow — running scaffold script, then performing LLM checklist

**Direct script execution (other platforms):**
```bash
bun plugins/rd3/skills/cc-agents/scripts/scaffold.ts $ARGUMENTS
```

## LLM Checklist (Agent Step)

After scaffolding, the invoking agent performs these checks:

| # | Item | Check |
|---|------|-------|
| 1 | Description pattern | Starts with "Use PROACTIVELY" with trigger phrases |
| 2 | Trigger phrases | 3+ quoted phrases in description |
| 3 | Example blocks | 2+ `<example>` with `<commentary>` |
| 4 | Voice consistency | Imperative, no "This agent helps" |
| 5 | Tier appropriateness | Structure matches selected template tier |

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
