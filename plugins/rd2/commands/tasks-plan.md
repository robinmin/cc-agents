---
description: Full workflow orchestration with planning, design, and execution
skills:
  - rd2:tasks
argument-hint: <task> [--execute] [--auto|--semi|--step] [--with-architect] [--with-designer] [--skip-design] [--skip-refinement]
---

# Tasks Plan

Orchestrate complete task workflow: planning → design → implementation → review. Supports both human-driven (interactive) and machine-driven (autonomous) execution.

**IMPORTANT**: This is an ORCHESTRATOR command - it coordinates the workflow but delegates all implementation to specialized agents.

## Quick Start

```bash
# Plan only (default for new requirements)
/rd2:tasks-plan "Implement OAuth2 authentication"

# Plan and execute with key checkpoints (default for human)
/rd2:tasks-plan "Add user dashboard" --execute

# Plan and execute autonomously (no checkpoints)
/rd2:tasks-plan "Add logging" --execute --auto

# Plan and execute with step-by-step confirmation
/rd2:tasks-plan "Refactor auth" --execute --step

# Orchestrate existing task by WBS number
/rd2:tasks-plan 0047 --execute

# Orchestrate existing task by file path
/rd2:tasks-plan docs/prompts/0047_oauth.md --execute
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<task>` | Yes | **Smart positional**: auto-detects type (see below) |
| `--execute` | No | Run implementation after planning |
| `--auto` | No | Autonomous mode: no checkpoints, errors → mark blocked & continue |
| `--semi` | No | Semi-interactive: checkpoint after planning + on errors (default for human) |
| `--step` | No | Step-by-step: confirm every action |
| `--with-architect` | No | Force architecture review |
| `--with-designer` | No | Force UI/UX design review |
| `--skip-design` | No | Skip design phase entirely |
| `--skip-refinement` | No | Skip refinement phase |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0047` |
| Ends with `.md` | File path | `docs/prompts/0047_oauth.md` |
| Otherwise | Requirements description | `"Add user authentication"` |

## Execution Modes

| Mode | Flag | Checkpoints | Default For |
|------|------|-------------|-------------|
| **Auto** | `--auto` | None (errors only) | Machine/LLM calls |
| **Semi** | `--semi` | After planning + on errors | Human `/tasks-plan` |
| **Step** | `--step` | Every action confirmed | Debugging/learning |

### Mode Detection

```
IF invoked via /tasks-plan (human) → default --semi
IF invoked via Task(super-planner, ...) → default --auto
```

## Workflow

This command delegates to the **super-planner** agent:

```python
Task(
  subagent_type="rd2:super-planner",
  prompt="""Orchestrate workflow: {requirements_or_task}

Mode: {auto|semi|step}
Execute: {true|false}
Flags: {with-architect}, {with-designer}, {skip-design}, {skip-refinement}

Phases:
1. PLANNING
   - Load or create task file
   - Gather requirements
   - IF --semi/--step: checkpoint("Proceed with planning?")
   - Update impl_progress.planning: completed

2. DESIGN (unless --skip-design)
   - Auto-detect specialist needs OR use flags
   - IF architecture needed → delegate to super-architect
   - IF UI/UX needed → delegate to super-designer
   - Update impl_progress.design: completed

3. DECOMPOSITION
   - Break into subtasks via tasks CLI
   - Create task files with dependencies
   - Build execution queue

4. EXECUTION (if --execute)
   FOR each task in queue:
     - IF --step: checkpoint("Start task {WBS}?")
     - tasks update {WBS} wip
     - Delegate to super-coder
     - Delegate to code-review skill
     - IF review fails:
       - Auto-fix (max 3 retries)
       - IF still fails: mark Blocked, continue
     - tasks update {WBS} done
     - IF --step: checkpoint("Continue?")

5. REPORT
   - Summary of completed/blocked tasks
""",
  description="Orchestrate complete workflow"
)
```

## Specialist Auto-Detection

| Pattern in Task | Triggers |
|-----------------|----------|
| database, schema, API, endpoint, integration | `super-architect` |
| UI, component, form, page, layout, accessibility | `super-designer` |
| bug fix, typo, refactor, small change | Neither (skip design) |

## Error Handling

| Mode | Max Retries Exceeded | Behavior |
|------|---------------------|----------|
| `--auto` | Mark task Blocked, continue | Complete other tasks, report at end |
| `--semi` | Pause | Ask: "Skip and continue, or abort?" |
| `--step` | Pause | Ask for decision |

## Examples

### Human-Driven (Interactive)

```bash
# Plan with checkpoints (default --semi)
/rd2:tasks-plan "Build OAuth" --execute

# Output:
# → Creating task file...
# ✓ Task 0087 created
# → Planning complete
# ? Proceed with implementation? [Y/n]
# → Implementing task 0088...
# → Implementing task 0089...
# ✓ All tasks complete
```

### Machine-Driven (Autonomous)

```bash
# From another agent or automated workflow
Task(
  subagent_type="rd2:super-planner",
  prompt="Build OAuth --execute --auto"
)

# No checkpoints, runs to completion
# Blocked tasks reported at end
```

### Step-by-Step (Debugging)

```bash
/rd2:tasks-plan "Refactor auth" --execute --step

# Confirms every action:
# ? Start planning? [Y/n]
# ? Start task 0088? [Y/n]
# ? Task 0088 complete. Continue? [Y/n]
```

## See Also

- **super-planner agent**: `../agents/super-planner.md` - Orchestration logic
- **/rd2:tasks-refine**: Requirement refinement
- **/rd2:tasks-design**: Design phase
- **/rd2:tasks-run**: Single task implementation
- **/rd2:tasks-review**: Single task review
