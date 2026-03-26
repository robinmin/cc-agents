---
name: cc-hooks
description: "Create Claude Code plugin hooks: PreToolUse, PostToolUse, Stop, SessionStart hooks for validation, automation, and context loading. Covers prompt-based vs command hooks, patterns, migration from basic to advanced hooks."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
type: technique
tags: [hooks, automation, claude-code, security, validation, plugin-dev]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: plugin-dev
  interactions:
    - knowledge-only
see_also:
  - rd3:cc-hooks/references/patterns
  - rd3:cc-hooks/references/advanced
  - rd3:cc-hooks/references/migration
---

# rd3:cc-hooks — Claude Code Hooks

Event-driven automation with Claude Code hooks for validation, policy enforcement, context loading, and external tool integration.

## Overview

Hooks execute in response to specific events during a Claude Code session. Use this skill when implementing hooks for security validation, quality enforcement, context loading, or workflow automation.

**Key capabilities:**
- Validate tool calls before execution (PreToolUse)
- React to tool results (PostToolUse)
- Enforce completion standards (Stop, SubagentStop)
- Load project context (SessionStart)
- Automate workflows across the development lifecycle

## Hook Events

| Event | When | Use For |
|-------|------|---------|
| PreToolUse | Before tool | Validation, modification, blocking |
| PostToolUse | After tool | Feedback, logging |
| UserPromptSubmit | User input | Context injection, validation |
| Stop | Agent stopping | Completeness check |
| SubagentStop | Subagent done | Task validation |
| SessionStart | Session begins | Context loading |
| SessionEnd | Session ends | Cleanup, logging |
| PreCompact | Before compact | Preserve context |
| Notification | User notified | Logging, reactions |

## Hook Types

### Prompt-Based Hooks (Recommended)

Use for context-aware validation and complex logic:

```json
{
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "File path: $TOOL_INPUT.file_path. Verify: 1) Not in /etc or system directories 2) Not .env or credentials 3) Path doesn't contain '..' traversal. Return 'approve' or 'deny'."
        }
      ]
    }
  ]
}
```

**Benefits:**
- Natural language reasoning
- Better edge case handling
- No bash scripting required
- More flexible validation

### Command Hooks

Use for deterministic checks and external tools:

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh"
        }
      ]
    }
  ]
}
```

**Use for:**
- Fast deterministic validations
- File system operations
- External tool integrations
- Performance-critical checks

## Hook Configuration

### Plugin Hooks (hooks/hooks.json)

```json
{
  "description": "Validation hooks for code quality",
  "hooks": {
    "PreToolUse": [...],
    "Stop": [...],
    "SessionStart": [...]
  }
}
```

### User Settings (.claude/settings.json)

```json
{
  "PreToolUse": [...],
  "Stop": [...],
  "SessionStart": [...]
}
```

### Matchers

```json
"matcher": "Write"           // Exact match
"matcher": "Write|Edit"      // Multiple tools
"matcher": "*"               // Wildcard (all tools)
"matcher": "mcp__.*__delete.*"  // Regex patterns
```

## Common Patterns

### Security Validation

Block dangerous file writes:

```json
{
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "File path: $TOOL_INPUT.file_path. Verify: 1) Not in /etc or system directories 2) Not .env or credentials 3) Path doesn't contain '..' traversal. Return 'approve' or 'deny'."
        }
      ]
    }
  ]
}
```

### Test Enforcement

Ensure tests run before stopping:

```json
{
  "Stop": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Review transcript. If code was modified (Write/Edit tools used), verify tests were executed. If no tests were run, block with reason 'Tests must be run after code changes'."
        }
      ]
    }
  ]
}
```

### Context Loading

Load project-specific context at session start:

```json
{
  "SessionStart": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/load-context.sh"
        }
      ]
    }
  ]
}
```

## Hook Output Format

### Standard Output

```json
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "Message for Claude"
}
```

### PreToolUse Output

```json
{
  "hookSpecificOutput": {
    "permissionDecision": "allow|deny|ask",
    "updatedInput": {"field": "modified_value"}
  },
  "systemMessage": "Explanation for Claude"
}
```

### Stop/SubagentStop Output

```json
{
  "decision": "approve|block",
  "reason": "Explanation",
  "systemMessage": "Additional context"
}
```

### Exit Codes

- `0` - Success (continue)
- `2` - Blocking deny (stderr fed back to Claude)
- Other - Non-blocking error

## Environment Variables

- `$CLAUDE_PROJECT_DIR` - Project root path
- `$CLAUDE_PLUGIN_ROOT` - Plugin directory (use for portable paths)
- `$CLAUDE_ENV_FILE` - SessionStart only: persist env vars
- `$CLAUDE_CODE_REMOTE` - Set if running in remote context

**Always use ${CLAUDE_PLUGIN_ROOT} in hook commands for portability.**

## Hook Input Format

All hooks receive JSON via stdin:

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.txt",
  "cwd": "/current/working/dir",
  "permission_mode": "ask|allow",
  "hook_event_name": "PreToolUse"
}
```

**Event-specific fields:**
- **PreToolUse/PostToolUse:** `tool_name`, `tool_input`, `tool_result`
- **UserPromptSubmit:** `user_prompt`
- **Stop/SubagentStop:** `reason`

Access fields using `$TOOL_INPUT`, `$TOOL_RESULT`, `$USER_PROMPT`, etc.

## Security Best Practices

### Input Validation

```bash
#!/bin/bash
set -euo pipefail

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')

if [[ ! "$tool_name" =~ ^[a-zA-Z0-9_]+$ ]]; then
  echo '{"decision": "deny", "reason": "Invalid tool name"}' >&2
  exit 2
fi
```

### Path Safety

```bash
file_path=$(echo "$input" | jq -r '.tool_input.file_path')

if [[ "$file_path" == *".."* ]]; then
  echo '{"decision": "deny", "reason": "Path traversal detected"}' >&2
  exit 2
fi
```

### Quote All Variables

```bash
# GOOD: Quoted
echo "$file_path"
cd "$CLAUDE_PROJECT_DIR"

# BAD: Unquoted (injection risk)
echo $file_path
cd $CLAUDE_PROJECT_DIR
```

## Lifecycle

**Hooks load at session start.** Changes require restarting Claude Code (`exit` then `claude`).

**Cannot hot-swap hooks:**
- Editing `hooks/hooks.json` won't affect current session
- Adding new hook scripts won't be recognized
- Must restart Claude Code for changes to take effect

## Debugging

Enable debug mode:

```bash
claude --debug
```

Test command hooks directly:

```bash
echo '{"tool_name": "Write", "tool_input": {"file_path": "/test"}}' | \
  bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh

echo "Exit code: $?"
```

## Additional References

- **`references/patterns.md`** — 10+ proven hook patterns
- **`references/advanced.md`** — Advanced techniques and workflows
- **`references/migration.md`** — Migrating from basic to prompt-based hooks
