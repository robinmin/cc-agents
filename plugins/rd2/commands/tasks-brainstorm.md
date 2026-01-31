---
description: This command should be used when the user asks to "brainstorm ideas", "explore solutions", "consider options", "research approaches", or mentions needing multiple solution options with trade-offs. Integrates research, ideation, and task CLI for automatic task file creation.
argument-hint: "<issue-description | task-file-path>"
tools:
  - AskUserQuestion
skills:
  - rd2:brainstorm
---

# tasks-brainstorm - Brainstorm Ideas Into Tasks

Transform ideas and problems into structured solutions with automatic task file creation.

## Quick Start

```bash
# Brainstorm from issue description
/rd2:tasks-brainstorm "Add user authentication to the API"

# Brainstorm from task file
/rd2:tasks-brainstorm docs/prompts/0140_brainstorm_input_processing.md
```

## Input Modes

**Issue Description:**
- Direct text describing the problem or idea
- Example: `"Implement real-time collaboration features"`

**Task File Path:**
- Path to existing task file (.md)
- Extracts Background, Requirements, Solutions for context
- Example: `docs/prompts/0140_*.md`

## 4-Phase Workflow

This command delegates to **super-brain** agent, which uses **rd2:brainstorm** skill:

1. **Input Processing** - Detect file path vs description, extract context
2. **Research & Ideation** - ref_search_documentation → WebSearch → wt:super-researcher
3. **Structured Output** - 2-3 approaches with trade-offs, citations with confidence
4. **Task Creation** - Batch create tasks via tasks CLI, populate Background/Requirements

## Output

- Structured markdown with Overview, Approaches, Recommendations
- Source citations with dates and confidence levels (HIGH/MEDIUM/LOW)
- Optional: Task files created in `docs/prompts/` with WBS numbers

## Task Integration

- Uses `tasks` CLI for all operations
- Updates kanban board automatically
- Populates Background and Requirements sections

## Examples

```bash
# Direct ideation
/rd2:tasks-brainstorm "Add caching layer to improve API performance"
# → 3 approaches: Redis, Memcached, in-memory

# Task file context
/rd2:tasks-brainstorm docs/prompts/0140_*.md
# → Uses task context for subtask generation
```

## See Also

- **rd2:brainstorm** - Core skill with full workflow
- **super-brain** - Agent for AI workflows
- **/rd2:tasks-cli** - Direct task CLI access
