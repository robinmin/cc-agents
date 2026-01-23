---
name: add new slash command and subagent super-code-reviewer
description: <prompt description>
status: Done
created_at: 2026-01-22 14:17:24
updated_at: 2026-01-22 15:24:38
---

## 0051. add new slash command and subagent super-code-reviewer

### Background

As we already implemented 3 different Agent Skills for code review with different ways:

- `rd2:code-review-gemini`: Code review using Gemini AI
- `rd2:code-review-claude`: Code review using Claude Code itself
- `rd2:code-review-auggie`: Code review using mcp auggie-mcp

We need to add a new slash command or subagent `super-code-reviewer` to use them with the same interface.

At least, this new slash command or subagent `super-code-reviewer` needs to support two options:

- `--focus`: This is the same option from these 3 Agent Skills will be used to focus on specific areas of the code.
- `--tool`: This option will be used to select the proper Agent Skill to use for code review. It should be in this way:

| `--tool`         | `Agent Skill`                                                            |
| ---------------- | ------------------------------------------------------------------------ |
| `auto` (default) | Automatically select the best tool based on the code complexity and size |
| `gemini`         | `rd2:code-review-gemini`                                                 |
| `claude`         | `rd2:code-review-claude`                                                 |
| `auggie`         | `rd2:code-review-auggie`                                                 |

Obviously, We need to implement a reliable logic for the selection of `--tool` is `auto` based on the industry best practices and the code complexity and size.

Again, do not forget our rules of designing subagents and slash commands: **Fat Skills, Thin Wrappers**

### Requirements / Objectives

- Implement the `super-code-reviewer` subagent in `plugins/rd2/agents/super-code-reviewer.md` with subagents `rd2:agent-expert` and `rd2:agent-doctor`

- Implement the `super-code-reviewer` slash command in `plugins/rd2/commands/super-code-reviewer.md` with subagents `rd2:agent-expert` and `rd2:agent-doctor`

### Solutions / Goals

#### Implementation Summary

Successfully created the unified `super-code-reviewer` that provides a single interface for code review across three tools (gemini, claude, auggie) with intelligent auto-selection.

**Deliverables:**

1. **Subagent**: `plugins/rd2/agents/super-code-reviewer.md` (~360 lines)
   - 8-section anatomy with coordinator role
   - 29 competency items for coordination logic
   - 10 DO + 10 DON'T rules
   - Auto-selection logic based on code size/complexity
   - Grade B (85/100) - Production ready

2. **Slash Command**: `plugins/rd2/commands/super-code-reviewer.md` (~140 lines)
   - Thin wrapper following "Fat Skills, Thin Wrappers" principle
   - Delegates to `rd2:code-review-*` skills
   - Supports `--tool` and `--focus` options

**Auto-Selection Logic:**

| Code Characteristics | Selected Tool |
|---------------------|---------------|
| < 500 LOC, simple structure | claude |
| 500-2000 LOC | gemini (flash) |
| > 2000 LOC, complex | gemini (pro) |
| Semantic context needed | auggie |
| Security audit | gemini (pro) |
| Default fallback | gemini (flash) |

**Usage Examples:**

```bash
# Auto-select best tool
/rd2:super-code-reviewer src/auth/

# Specify tool explicitly
/rd2:super-code-reviewer --tool gemini src/auth/
/rd2:super-code-reviewer --tool claude src/utils/
/rd2:super-code-reviewer --tool auggie src/payment/

# Focus on specific areas
/rd2:super-code-reviewer --focus security,performance src/api/

# Architecture planning mode
/rd2:super-code-reviewer --plan src/
```

**Options Supported:**

| Option | Values | Description |
|--------|--------|-------------|
| `--tool` | `auto`, `gemini`, `claude`, `auggie` | Tool selection |
| `--focus` | `security`, `performance`, `testing`, `quality`, `architecture` | Area targeting |
| `--plan` | flag | Architecture planning mode |

### References
