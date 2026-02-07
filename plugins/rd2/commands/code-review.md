---
description: Find bugs with severity-driven fix workflow
argument-hint: [path] [--tool auto|gemini|claude|auggie|opencode] [--focus security|performance|testing|quality|architecture]
allowed-tools: Read, Grep, Glob, Write, Edit, Task, Skill, AskUserQuestion
---

# Code Review

Comprehensive code review to identify bugs, potential issues, incomplete implementations, and inconsistencies. Issues are categorized by severity with a structured fix workflow.

## Quick Start

```bash
/rd2:code-review src/auth/                    # Auto-select tool
/rd2:code-review src/ --tool gemini           # Specify tool
/rd2:code-review src/api/ --focus security   # Focus area
```

## Arguments

| Argument  | Required | Description                                                                             |
| --------- | -------- | --------------------------------------------------------------------------------------- |
| `[path]`  | Yes      | File or directory to review                                                             |
| `--tool`  | No       | Tool: `auto` (default), `gemini`, `claude`, `auggie`, `opencode`                        |
| `--focus` | No       | Focus: `security`, `performance`, `testing`, `quality`, `architecture`, `comprehensive` |

## Validation

```bash
test -e {path} && echo "EXISTS" || echo "NOT_FOUND"
```

If path doesn't exist, show error with examples.

## Purpose

Identify bugs, potential issues, incomplete implementations, and inconsistencies. Categorize findings by severity (Critical/High/Medium/Low) and prioritize fixes.

## Workflow

**Phase 1: Comprehensive Review** - Always invokes `rd2:code-patterns` + architect based on target type (backend/frontend/cloud)

**Phase 2: Issue Generation** - Compile findings with severity, location, description, and fix suggestions

**Phase 3: Fix Strategy** - Use `AskUserQuestion` to determine approach:

- Minor issues (<5 Low/Medium) → Direct fixes OR task file
- Major issues (Critical/High or >10) → Task file (RECOMMENDED) OR fix critical only

## Implementation

```python
Task(
  subagent_type="rd2:super-code-reviewer",
  prompt="""Comprehensive code review with fix workflow: {path}

Tool: {tool}
Focus: {focus_areas}

## Phase 1: Comprehensive Review

ALWAYS invoke:
1. Skill(skill="rd2:code-patterns", args="{path}")
2. Detect target type and invoke architect:
   - Backend → rd2:backend-architect
   - Frontend → rd2:frontend-architect
   - Cloud/infra → rd2:cloud-architect

## Phase 2: Issue List Generation

Compile findings: severity, location (file:line), category, description, fix.

## Phase 3: Fix Strategy

AskUserQuestion for fix approach based on issue count/severity.

IF direct fixes: Fix by severity (Critical→High→Medium→Low), verify, report.
IF task file: Delegate to rd2:super-planner for task generation.
""",
  description="Comprehensive code review: {path}"
)
```

## Tool Selection

Auto mode selects based on code size/complexity:

- <500 LOC → `claude` | 500-2000 LOC → `gemini` | >2000 LOC → `gemini` (pro) | Semantic context → `auggie`

## Architect Selection

- Backend code (`**/api/**`, `**/server/**`) → `rd2:backend-architect`
- Frontend code (`**/components/**`, `**/views/**`) → `rd2:frontend-architect`
- Infrastructure (`**/infra/**`, `**/terraform/**`) → `rd2:cloud-architect`

## Examples

```bash
/rd2:code-review src/auth/              # Backend review
/rd2:code-review src/components/Button.tsx  # Frontend review
/rd2:code-review --focus security terraform/  # Infrastructure review
```

## See Also

- `rd2:code-patterns` - Pattern consistency (always used)
- `rd2:backend-architect` / `rd2:frontend-architect` / `rd2:cloud-architect` - Code review specialists
- `rd2:super-planner` - Task file generation for complex fixes
- `/rd2:tasks-review` - Alternative: task-based code review
