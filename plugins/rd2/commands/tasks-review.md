---
description: Single task code review
argument-hint: <task> [--tool auto|gemini|claude|auggie|opencode] [--focus security|performance|testing|quality|architecture]
---

# Tasks Review

Review code for a single task. This is the single-task entry point for code review - `/tasks-plan --execute` automatically calls this after each implementation.

**IMPORTANT**: This reviews implementation quality (post-Phase 3), not solution architecture (Phase 2 - handled by super-architect).

## Quick Start

```bash
# Review task by WBS number (auto-select tool)
/rd2:tasks-review 0047

# Review task by file path
/rd2:tasks-review docs/prompts/0047_oauth.md

# Specify tool explicitly
/rd2:tasks-review 0047 --tool gemini

# Focus on specific areas
/rd2:tasks-review 0047 --focus security,performance
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<task>` | Yes | **Smart positional**: WBS number or file path (see below) |
| `--tool` | No | Tool: `auto` (default), `gemini`, `claude`, `auggie`, `opencode` |
| `--focus` | No | Focus: `security`, `performance`, `testing`, `quality` (default), `architecture` |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0047` |
| Ends with `.md` | File path | `docs/prompts/0047_oauth.md` |

## Workflow

This command delegates to the **code-review skill**:

```python
Task(
  subagent_type="rd2:super-code-reviewer",
  prompt="""Review task: {WBS}

Tool: {tool}
Focus: {focus_areas}

Steps:
1. Load task file via tasks open {WBS}
2. Identify files modified for this task (from Artifacts section)
3. Run code review on modified files
4. If issues found:
   - Return issues for fixing
   - Do NOT mark impl_progress.review as completed
5. If no issues:
   - Update impl_progress.review: completed
""",
  description="Review single task"
)
```

## Tool Selection (Auto Mode)

| Characteristics | Tool | Best For |
|-----------------|------|----------|
| < 500 LOC | `claude` | Quick reviews |
| 500-2000 LOC | `gemini-flash` | Balanced analysis |
| > 2000 LOC | `gemini-pro` | Complex analysis |
| Semantic context | `auggie` | Codebase-aware |

## Focus Areas

| Area | What It Checks |
|------|----------------|
| `security` | Injection, auth flaws, data exposure |
| `performance` | Algorithm complexity, N+1 queries |
| `testing` | Coverage gaps, edge cases |
| `quality` | Readability, maintainability, DRY |
| `architecture` | Coupling, cohesion, patterns |

## Examples

```bash
# Standard review
/rd2:tasks-review 0047

# Security-focused
/rd2:tasks-review 0047 --focus security

# Multiple focus areas
/rd2:tasks-review 0047 --focus security,performance,testing
```

## Error Handling

| Error | Resolution |
|-------|------------|
| Task not found | Check WBS number, run `tasks list` |
| No files to review | Check Artifacts section in task file |
| Review finds issues | Return to implementation for fixes |

## Two-Level Review Process

| Level | What | When | Owner |
|-------|------|------|-------|
| Solution Review | Architecture/design | Phase 2, Steps 4-6 (optional) | super-architect |
| Code Review | Implementation quality | Post-Phase 3, after Step 13 (mandatory) | This command |

## See Also

- **/rd2:tasks-run**: Implementation command
- **/rd2:tasks-plan**: Full workflow orchestration
- `rd2:code-review-common`: Review skill
- **super-architect**: Solution-level review (Step 3)
