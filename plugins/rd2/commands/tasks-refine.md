---
description: Task refinement via quality check and user interaction
argument-hint: <task> [--force]
---

# Tasks Refine

Refine incomplete or unclear task files through quality checks, gap detection, and user approval. Ensures tasks are ready for design and implementation.

**IMPORTANT**: This is a thin wrapper that delegates to super-planner in refinement-only mode.

## Quick Start

```bash
# Refine by WBS number
/rd2:tasks-refine 0047

# Refine by file path
/rd2:tasks-refine docs/prompts/0047_feature.md

# Force refinement even if no issues detected
/rd2:tasks-refine 0047 --force
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<task>` | Yes | **Smart positional**: WBS number or file path (see below) |
| `--force` | No | Force refinement even if no red flags |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0047` |
| Ends with `.md` | File path | `docs/prompts/0047_feature.md` |

## Red Flags Checked

| Category | Red Flag | Threshold |
|----------|----------|-----------|
| Frontmatter | Empty description | < 10 chars |
| Content | Empty Requirements | < 10 chars |
| Content | Empty Solution | < 10 chars |
| Quality | Very brief Requirements | < 50 chars |
| Quality | No acceptance criteria | Missing |

## Workflow

This command delegates to **super-planner** in refinement-only mode:

```python
Task(
  subagent_type="rd2:super-planner",
  prompt="""Refine task: {task}

Mode: refinement-only
Force: {force}

Steps:
1. Load task file
2. Quality check (red flag detection)
3. IF red flags OR --force:
   - Generate refinement suggestions
   - Ask user for approval via AskUserQuestion
   - Options: Approve all, Review section by section, Skip
4. Apply approved changes
5. Update impl_progress.planning: completed (if refined)
6. Report changes
""",
  description="Refine task quality"
)
```

## Examples

```bash
# Auto-detect issues
/rd2:tasks-refine 0047

# Output:
# → Loading task 0047...
# → Quality check: 2 red flags
# → Red Flag 1: Requirements section empty
# → Red Flag 2: No acceptance criteria
# ? Approve suggested changes? [Approve all / Review / Skip]
# ✓ 2 sections updated
```

## See Also

- **super-planner agent**: `../agents/super-planner.md`
- **/rd2:tasks-plan**: Full workflow (includes refinement)
- **/rd2:tasks-design**: Design phase
