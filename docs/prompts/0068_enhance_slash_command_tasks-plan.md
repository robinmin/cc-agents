---
name: enhance slash command tasks-plan
description: Task: enhance slash command tasks-plan
status: Done
created_at: 2026-01-24 18:36:17
updated_at: 2026-01-24 19:30:00
---

## 0068. enhance slash command tasks-plan

### Background

We already have a slash command for planning tasks, but it could be enhanced to provide more features and flexibility.

Meanwhile, we also have another slash command in old plugin rd, we can also learn from it: @plugins/rd/commands/task-runner.md

#### Current major issues

- **Not Accept task file as input**: according to its argument-hint in frontmatter, it only accepts a description of the request as input. However, our whole plugin rd2 is designed to work with task files. The task file is the core and single source of truth for tasks. We need to enhance the slash command to accept task files as input.

- **Customized output format**: the current slash command defined its own output location and format. This point deviated from our original design goal. We need to follow the original design goal and leverage the existing Agents Skills to complete the task, including but not limited to the following:
  - rd2:task-decomposition
  - rd2:tasks

### Requirements / Objectives

- Understand above two issues and have a comprehensive understanding of the current slash command tasks-plan.
- Figure out the solution to enhance the slash command tasks-plan.
- Enhance the slash command tasks-plan to accept task files as input.
- Enhance the slash command tasks-plan to follow the original design goal and leverage the existing Agents Skills to complete the task.
- By default, we need tasks-plan to run with the mode turning `--orchestrate` on.

#### Designing rules **tasks-plan** MUST follow

- **Task file in, Task file out**: except the --orchestrate mode dedicated to other subagents to generate code, the major works of tasks-plan should be work with task files as input and output task files as output. Including other architect stage or design stage or implementation stage: All these specialists' tasks should be finished their work separately and generate relevant stuffs if needed and link back into the task file, so that the others can leverage their efforts in the upcoming stages. Of course, if we receive some task description, we can create a task file from it and then working with it.

- **Manage task files via rd2:tasks**: No direct creation or deletion of task files is allowed. All task files must be managed through the `rd2:tasks` skill. There are opportunities to update task if needed. But the creation and deletion and status management should be done through the `rd2:tasks` skill.

Any other enhancement suggestions are welcome, but must confirm with me first. Even if you feel we need to spit task-plan into multiple tasks, that's also discussable.

### Solutions / Goals

## Analysis

### Current Implementation Review

**Command:** `/rd2:tasks-plan`
- Location: `/Users/robin/projects/cc-agents/plugins/rd2/commands/tasks-plan.md`
- Delegate to: `super-planner` agent
- Input: `<requirements>` (description string only)
- Output: `docs/plans/[name].md` (custom format)
- Options: `--complexity`, `--architect`, `--design`, `--skip-decomposition`, `--orchestrate`

**Agent:** `super-planner`
- Location: `/Users/robin/projects/cc-agents/plugins/rd2/agents/super-planner.md`
- Role: ORCHESTRATOR for planning and delegation
- Skills: `rd2:task-decomposition`, `rd2:tasks`, `rd2:cc-agents`

### Key Changes Required

1. **Accept task files as input**
   - Currently: `argument-hint: "<requirements>" [--options]`
   - Change to: `argument-hint: "<requirements|task-file.md>" [--options]`
   - Support both WBS number (e.g., `0047`) and file path (e.g., `docs/prompts/0047_*.md`)

2. **Task file workflow**
   - When task file provided: Load task, check status, determine next steps
   - When description provided: Create task via `rd2:tasks create`, then proceed with task workflow
   - All specialist work (architect, designer) links back to task file's Solutions section

3. **Remove custom output format**
   - Stop outputting to `docs/plans/[name].md`
   - All output goes to task files in `docs/prompts/`
   - Task status managed via `rd2:tasks update`

4. **Make `--orchestrate` default**
   - Add `--no-orchestrate` flag for decomposition-only mode
   - Default behavior: orchestrate implementation via super-coder

## Implementation Plan

1. Update `tasks-plan.md` command
   - Change argument-hint to accept both requirements and task files
   - Add `--no-orchestrate` flag
   - Update documentation

2. Update `super-planner.md` agent
   - Add task file loading workflow
   - Update Phase 1 to detect input type (description vs task file)
   - Add task file workflow for existing tasks
   - Remove custom output format section
   - Update orchestration to be default

3. Update examples in both files
   - Show task file input usage
   - Update Quick Start sections
   - Update workflow diagrams

### References

- Current command: `/Users/robin/projects/cc-agents/plugins/rd2/commands/tasks-plan.md`
- Current agent: `/Users/robin/projects/cc-agents/plugins/rd2/agents/super-planner.md`
- Reference task-runner: `/Users/robin/projects/cc-agents/plugins/rd/commands/task-runner.md`
- tasks skill: `/Users/robin/projects/cc-agents/plugins/rd2/skills/tasks/SKILL.md`
- task-decomposition skill: `/Users/robin/projects/cc-agents/plugins/rd2/skills/task-decomposition/SKILL.md`

## Implementation Summary

### Changes Made

#### 1. `tasks-plan.md` Command Updates

- **Argument hint updated**: Now accepts both `<requirements>` and `<task-file.md>` as input
  - Changed: `argument-hint: "<requirements>"`
  - To: `argument-hint: "<requirements|task-file.md>" [--complexity low|medium|high] [--architect] [--design] [--skip-decomposition] [--no-orchestrate] [--task <WBS|path>]`

- **`--no-orchestrate` flag added**: Orchestration is now DEFAULT, use `--no-orchestrate` to disable

- **Arguments table updated**:
  - `requirements` now marked as "No*" (optional if `--task` is provided)
  - `--task` option added for existing task orchestration
  - `--no-orchestrate` flag documented

- **Quick Start examples updated**:
  - Added task file input examples
  - Removed `--orchestrate` flag (now default)
  - Added `--no-orchestrate` example

- **Orchestration Mode section updated**:
  - Changed from "When `--orchestrate` flag is specified" to "**Orchestration is enabled by default.** Use `--no-orchestrate` for decomposition-only mode."

- **Examples section completely rewritten**:
  - Example 1: Simple Feature from Description (with orchestration)
  - Example 2: Architecture-Heavy (with orchestration)
  - Example 3: Orchestrate Existing Task File (NEW)
  - Example 4: Decomposition Only (No Orchestration)

- **Output Format section updated**:
  - Removed custom `docs/plans/[name].md` format
  - Documented task file management via `rd2:tasks`
  - Added "No custom output format" note

- **Design Philosophy section updated**:
  - Added "Task File Centric" subsection
  - Documented "Task file in, Task file out" principle

- **Workflow diagrams updated**:
  - Added task file input path
  - Added "Task File Workflow" diagram
  - Updated orchestration to be default

- **See Also section updated**:
  - Added reference to `rd:task-runner` for comparison

#### 2. `super-planner.md` Agent Updates

- **Option Parsing section updated**:
  - Reordered options (input detection first)
  - Changed `--orchestrate` to `--no-orchestrate`
  - Updated descriptions

- **Phase 1 (Receive Requirements) updated**:
  - Added input type detection logic
  - Added task file loading workflow
  - Added task file status checking

- **Phase 5 header updated**:
  - Changed from "If --orchestrate" to "Default, skipped with --no-orchestrate"
  - Added note: "Orchestration is enabled by default"

- **"What I Always Do" section updated**:
  - Added input type detection
  - Added task file loading
  - Added task file creation via `rd2:tasks create`
  - Added orchestration by default
  - Added "Task file in, Task file out" principle

- **"What I Never Do" section updated**:
  - Added "Create task files directly" (use `rd2:tasks create`)
  - Added "Update task status directly" (use `rd2:tasks update`)
  - Added "Bypass rd2:tasks for any task file operations"
  - Added "Output to custom format (`docs/plans/`)"
  - Added "Violate 'Task file in, Task file out' principle"

- **Quick Reference updated**:
  - Added task file input examples
  - Removed `--orchestrate` flag examples
  - Added `--no-orchestrate` example

- **Final summary updated**:
  - Added "Orchestration is enabled by default"
  - Added "Follow 'Task file in, Task file out' principle"

### Design Rules Verified

All design rules from the task requirements are now followed:

1. **Task file in, Task file out**: ✓ Implemented
   - Command accepts both task files and descriptions
   - Task files created automatically from descriptions
   - All specialist work links back to task files

2. **Manage task files via rd2:tasks**: ✓ Implemented
   - Task creation via `rd2:tasks create`
   - Task status updates via `rd2:tasks update`
   - Task decomposition via `rd2:tasks decompose`
   - No direct file operations

3. **Default orchestrate mode**: ✓ Implemented
   - `--orchestrate` is now default behavior
   - `--no-orchestrate` flag for decomposition-only mode

### Testing Recommendations

1. Test task file input:
   ```bash
   /rd2:tasks-plan --task 0047
   /rd2:tasks-plan docs/prompts/0047_feature.md
   ```

2. Test description input (auto-create task):
   ```bash
   /rd2:tasks-plan "Implement new feature"
   ```

3. Test decomposition-only mode:
   ```bash
   /rd2:tasks-plan --no-orchestrate "Break down complex task"
   ```

4. Verify task file management:
   - Check tasks are created via `rd2:tasks create`
   - Check status updates via `rd2:tasks update`
   - Verify no custom output to `docs/plans/`
