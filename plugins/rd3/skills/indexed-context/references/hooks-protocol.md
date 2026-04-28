# Hooks Protocol Reference

Detailed reference for OpenWolf's 6 hook scripts and their stdin/stdout protocols.

## Session Lifecycle

```
SessionStart → session-start.js
  ↓
  (agent works)
  ↓
  PreToolUse(Read) → pre-read.js
  ↓ (read happens)
  PostToolUse(Read) → post-read.js
  ↓
  PreToolUse(Write|Edit|MultiEdit) → pre-write.js
  ↓ (write happens)
  PostToolUse(Write|Edit|MultiEdit) → post-write.js
  ↓
  (repeat)
  ↓
  Stop → stop.js
```

## Hook Input Format

All hooks receive JSON on stdin from the coding agent:

### Read hooks

```json
{
  "tool_name": "Read",
  "tool_input": {
    "file_path": "/path/to/file.ts"
  }
}
```

### Write hooks

```json
{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "content": "file content here"
  }
}
```

### Edit hooks

```json
{
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "old_string": "old content",
    "new_string": "new content"
  }
}
```

## Hook Output Format

Hooks communicate via **stderr** (never stdout):

### Warning format

```
⚡ OpenWolf: file.ts was already read this session (~380 tokens)
📋 OpenWolf anatomy: file.ts — Description here (~520 tok)
⚠️ OpenWolf cerebrum warning: "never use var" — check your code
📋 OpenWolf buglog: 2 past bug(s) found for file.ts
💡 OpenWolf: cerebrum.md hasn't been updated in 3 days
```

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success (always — hooks never block) |

## Session State (`_session.json`)

```json
{
  "session_id": "session-2026-04-28-1430",
  "started": "2026-04-28T14:30:00Z",
  "files_read": {
    "/path/to/file.ts": {
      "count": 1,
      "tokens": 380,
      "first_read": "2026-04-28T14:31:00Z"
    }
  },
  "files_written": [
    {
      "file": "/path/to/file.ts",
      "action": "edit",
      "tokens": 620,
      "at": "2026-04-28T14:35:00Z"
    }
  ],
  "edit_counts": {
    "/path/to/file.ts": 2
  },
  "anatomy_hits": 4,
  "anatomy_misses": 1,
  "repeated_reads_warned": 1,
  "cerebrum_warnings": 0,
  "stop_count": 0
}
```

This file is ephemeral — deleted and recreated on each session start.

## Anatomy Entry Format

```markdown
## src/components/

- `Button.tsx` — Reusable button component with variants (~180 tok)
- `Modal.tsx` — Modal dialog with overlay and animations (~320 tok)
```

Pattern: `- \`filename\` — description (~N tok)`

## Cerebrum Section Format

```markdown
## User Preferences

- Prefers functional components over class components
- Always use named exports, never default exports

## Key Learnings

- Tests go in `__tests__/` next to the source file
- Auth middleware reads from `cfg.talk`, not `cfg.tts`

## Do-Not-Repeat

- [2026-03-10] Never use `var` — always `const` or `let`
- [2026-03-14] Don't mock the database in integration tests

## Decision Log

- [2026-03-20] Chose Zustand over Redux for state management — simpler API, less boilerplate
```

## Buglog Entry Format

```json
{
  "id": "bug-001",
  "timestamp": "2026-04-28T10:00:00Z",
  "error_message": "exact error or user complaint",
  "file": "src/file.ts",
  "root_cause": "why it broke",
  "fix": "what changed to fix it",
  "tags": ["typescript", "api"],
  "related_bugs": [],
  "occurrences": 1,
  "last_seen": "2026-04-28T10:00:00Z"
}
```
