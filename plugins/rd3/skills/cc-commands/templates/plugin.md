---
description: {{DESCRIPTION}}
argument-hint: {{ARGUMENT_HINT}}
allowed-tools: Bash, Read
---

# {{COMMAND_TITLE}}

<!-- Plugin command: uses CLAUDE_PLUGIN_ROOT for script/resource paths -->

## When to Use

- [Scenario 1: When this command applies]
- [Scenario 2: Another scenario]

## Core Skill

> **Note**: `Skill()` is Claude Code specific. For other platforms, see Implementation section.

This command wraps **rd3:cc-commands** skill - [description].

**Delegation (Claude Code):**
```
Skill(skill="rd3:cc-commands")
```

## Implementation

<!-- TODO: Replace direct script call with rd3:cc-agents subagent when ready -->

### For Claude Code
Use `Skill()` to delegate to the core skill:
```
Skill(skill="rd3:cc-commands")
```

### For Other Coding Agents (Codex, Gemini, OpenClaw, OpenCode, Antigravity)
Execute the script directly:
```bash
bun ./plugins/rd3/skills/cc-commands/scripts/[scaffold|validate|evaluate|refine|adapt].ts <args>
```

## Instructions

Run the plugin script:

```bash
bun ${CLAUDE_PLUGIN_ROOT}/skills/{{SKILL_DIR}}/scripts/{{SCRIPT_NAME}}.ts $ARGUMENTS
```

Process the script output:
1. Parse the results from the script
2. Validate the output format
3. Present findings to the user

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `$1` | [First argument description] | Yes |
| `$2` | [Second argument description] | No |

## Error Handling

If the script fails:
- Check that the file path exists
- Verify Bun is available
- Report the error with context

---

**Template type**: plugin
**Pattern**: Plugin command using CLAUDE_PLUGIN_ROOT for script paths
