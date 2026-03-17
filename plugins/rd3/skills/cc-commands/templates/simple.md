---
description: {{DESCRIPTION}}
argument-hint: {{ARGUMENT_HINT}}
---

# {{COMMAND_TITLE}}

<!-- Simple command: direct imperative instructions for Claude -->

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

[Imperative instructions for Claude. Write FOR Claude, not TO the user.]

Read the relevant files and:
1. [First action to perform]
2. [Second action to perform]
3. [Third action to perform]

Present results to the user in a clear format.

---

**Template type**: simple
**Pattern**: Direct imperative instructions, no subagent delegation
