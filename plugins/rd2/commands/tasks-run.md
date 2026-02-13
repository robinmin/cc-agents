---
description: Single task implementation via super-coder
argument-hint: <task> [--tool auto|gemini|claude|auggie|opencode] [--no-tdd]
---

# Tasks Run

Implement a single task using super-coder agent. This is the single-task entry point for implementation - use `/tasks-plan --execute` for full workflow orchestration.

**IMPORTANT**: This command implements ONE task. For orchestrating multiple tasks, use `/tasks-plan --execute`.

## Quick Start

```bash
# Implement task by WBS number (TDD enabled by default)
/rd2:tasks-run 0047

# Implement task by file path
/rd2:tasks-run docs/prompts/0047_oauth.md

# Specify tool explicitly
/rd2:tasks-run 0047 --tool gemini

# Disable TDD
/rd2:tasks-run 0047 --no-tdd
```

## Arguments

| Argument   | Required | Description                                                      |
| ---------- | -------- | ---------------------------------------------------------------- |
| `<task>`   | Yes      | **Smart positional**: WBS number or file path (see below)        |
| `--tool`   | No       | Tool: `auto` (default), `gemini`, `claude`, `auggie`, `opencode` |
| `--no-tdd` | No       | Disable TDD mode                                                 |

### Smart Positional Detection

| Input Pattern   | Detection  | Example                      |
| --------------- | ---------- | ---------------------------- |
| Digits only     | WBS number | `0047`                       |
| Ends with `.md` | File path  | `docs/prompts/0047_oauth.md` |

## Workflow

This command delegates to the **super-coder** agent:

```python
Task(
  subagent_type="rd2:super-coder",
  prompt="""Implement task: {WBS}

Tool: {tool}
TDD: {enabled|disabled}

Steps:
1. Load task file via tasks open {WBS}
2. Parse Requirements and Design sections
3. Follow 13-step implementation workflow
4. Update impl_progress.implementation: completed
5. Update task status via tasks CLI
""",
  description="Implement single task"
)
```

## Tool Selection (Auto Mode)

| Characteristics         | Tool       | Best For               |
| ----------------------- | ---------- | ---------------------- |
| Simple function/class   | `claude`   | Quick implementations  |
| Multi-file feature      | `gemini`   | Complex architecture   |
| Codebase context needed | `auggie`   | Pattern-matching       |
| External perspective    | `opencode` | Multi-model comparison |

## Examples

```bash
# Standard implementation
/rd2:tasks-run 0047

# With specific tool
/rd2:tasks-run 0047 --tool gemini

# Without TDD for simple fixes
/rd2:tasks-run 0047 --no-tdd
```

## Error Handling

| Error          | Resolution                            |
| -------------- | ------------------------------------- |
| Task not found | Check WBS number, run `tasks list`    |
| Task blocked   | Check blocked_reason in frontmatter   |
| Tests fail     | Auto-retry up to 3 times, then report |

## See Also

- **super-coder agent**: `../agents/super-coder.md` - Implementation logic
- **/rd2:tasks-plan**: Full workflow orchestration
- **/rd2:tasks-review**: Code review after implementation
- `rd2:tdd-workflow`: skill - Test-driven development workflow
- `rd2:task-workflow`: skill - task execution workflow
