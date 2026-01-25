# Task CLI Integration Guide

Complete guide for the tasks CLI - task file management, Kanban synchronization, and workflow integration.

## Overview

The tasks CLI provides external task management for the rd2 plugin's three-agent workflow. It integrates with TodoWrite for Kanban visualization and supports WBS-numbered task files with enhanced structure.

### Architectural Separation: task-decomposition vs tasks

The rd2 plugin maintains a clear separation between decomposition knowledge and file operations:

**`rd2:task-decomposition` (Knowledge Skill):**
- Domain-specific decomposition patterns (layer-based, feature-based, phase-based, risk-based)
- Task breakdown strategies and heuristics
- Domain-specific templates (auth, API, UI, database, etc.)
- Task sizing and complexity estimation
- Dependency identification patterns
- **No scripts** - knowledge only, no file operations

**`rd2:tasks` (File Operations Skill):**
- Task file operations (create, update, delete, open)
- WBS number assignment
- Status management (Backlog → Todo → WIP → Testing → Done)
- Kanban board synchronization
- TodoWrite integration

**Workflow Integration:**
```
super-planner receives requirements
    ↓
Consults rd2:task-decomposition for decomposition patterns
    ↓
Delegates to rd2:tasks decompose for file creation
    ↓
Result: WBS-numbered task files with proper structure
```

This separation allows:
- **Knowledge reuse** - Decomposition patterns apply regardless of file format
- **Flexible file ops** - Tasks can be managed via CLI, API, or manual editing
- **Clear responsibilities** - Skills focus on their core competency

## Quick Start

```bash
# Create a new task
tasks create "Implement user authentication"

# List all tasks
tasks list

# List tasks by stage
tasks list backlog
tasks list todo
tasks list wip
tasks list testing
tasks list done

# Update task status
tasks update 47 todo
tasks update 47 wip
tasks update 47 testing
tasks update 47 done

# Refresh Kanban board
tasks refresh
```

## Installation

The tasks CLI is part of the rd2 plugin. Ensure the plugin is installed and available in your Claude Code environment.

```bash
# Verify tasks CLI is available
tasks --help

# Check tasks directory
ls docs/prompts/
```

## Task File Structure

### Enhanced Task File Format

Task files follow the enhanced structure from Task 0061:

```markdown
---
name: task-name
description: brief description
status: Backlog | Todo | WIP | Testing | Done
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
wbs: 0047
dependencies: [0045, 0046]
parent: null
estimated_hours: null
priority: medium
tags: [authentication, security, oauth2]
---

## 0047. task-name

### Background

[Context about the problem, why this task exists, dependencies]

### Requirements / Objectives

[What needs to be accomplished, acceptance criteria]

#### Q&A

[Clarifications from user, decisions made during implementation]

### Solutions / Goals

[Technical approach, architecture decisions]

#### Plan

[Step-by-step implementation plan]

### References

[Documentation links, code examples, similar implementations]
```

### Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Short, descriptive task name |
| `description` | string | Yes | One-line summary of the task |
| `status` | enum | Yes | `Backlog`, `Todo`, `WIP`, `Testing`, `Done` |
| `created_at` | date | Yes | Creation date (YYYY-MM-DD) |
| `updated_at` | date | Yes | Last modification date |
| `wbs` | string | Yes | 4-digit WBS number (e.g., 0047) |
| `dependencies` | list | No | List of WBS numbers this task depends on |
| `parent` | string | No | Parent task WBS for subtasks |
| `estimated_hours` | number | No | Estimated effort in hours |
| `priority` | enum | No | `low`, `medium`, `high`, `critical` |
| `tags` | list | No | List of category tags |

## Commands

### tasks create

Create a new task file with automatic WBS# assignment.

```bash
tasks create "Implement user authentication"
```

**Output:**
- Creates task file: `docs/prompts/0047_implement_user_authentication.md`
- Assigns next available WBS#
- Initializes frontmatter with default values

### tasks list

List tasks with filtering and sorting options.

```bash
# List all tasks
tasks list

# List by stage
tasks list backlog
tasks list todo
tasks list wip
tasks list testing
tasks list done

# List with filter
tasks list --tag authentication
tasks list --priority critical

# List with sort
tasks list --sort priority
tasks list --sort created
```

**Output Format:**
```
┌──────┬──────────────────────────────┬──────────┬───────────────┬───────────┐
│ WBS  │ Name                         │ Status   │ Dependencies  │ Priority  │
├──────┼──────────────────────────────┼──────────┼───────────────┼───────────┤
│ 0047 │ Implement user auth          │ Todo     │ -             │ high      │
│ 0048 │ Create user model            │ Backlog  │ 0047          │ high      │
│ 0049 │ Add auth tests               │ Backlog  │ 0048          │ medium    │
└──────┴──────────────────────────────┴──────────┴───────────────┴───────────┘
```

### tasks update

Update task status and metadata.

```bash
# Update status
tasks update 47 todo
tasks update 47 wip
tasks update 47 testing
tasks update 47 done

# Update priority
tasks update 47 --priority critical

# Add tag
tasks update 47 --tag security

# Set estimate
tasks update 47 --estimate 8
```

**Status Flow:**
```
Backlog → Todo → WIP → Testing → Done
                ↓       ↓
          (coding) (tests)
```

### tasks refresh

Synchronize task files with TodoWrite Kanban board.

```bash
tasks refresh
```

**What it does:**
1. Reads all task files from `docs/prompts/`
2. Parses frontmatter for status and metadata
3. Updates TodoWrite Kanban board
4. Reports synchronization results

**Output:**
```
Syncing tasks to TodoWrite...
✓ Backlog: 5 tasks
✓ Todo: 3 tasks
✓ WIP: 1 tasks
✓ Testing: 2 tasks
✓ Done: 15 tasks
Kanban updated successfully.
```

### tasks show

Display detailed task information.

```bash
tasks show 47
```

**Output:**
```
Task: 0047 - Implement user authentication
Status: Todo
Priority: high
Dependencies: None
Created: 2026-01-23
Updated: 2026-01-23

Description:
Add OAuth2 and JWT-based authentication system

Plan:
1. Design authentication architecture
2. Implement user model
3. Implement auth service
4. Add authentication endpoints
5. Write tests
```

### tasks delete

Delete a task file.

```bash
tasks delete 47
```

**Warning:** This permanently deletes the task file. Use with caution.

## Integration with Three-Agent Workflow

### orchestrator-expert Usage

The `orchestrator-expert` agent uses tasks CLI for progress tracking:

```python
# Before any action
tasks list  # Check current progress

# After task completion
tasks update 47 done  # Mark task as done

# Sync Kanban
tasks refresh  # Update TodoWrite
```

### task-runner Usage

The `task-runner` agent updates task status during execution:

```python
# Start task
tasks update 47 wip

# After code complete
tasks update 47 testing

# After tests pass
tasks update 47 done
```

### tasks decompose Usage

The `tasks decompose` command creates multiple task files from a requirement:

```bash
# Decompose requirement into subtasks
tasks decompose "Build user authentication"

# Creates:
# - 0047_design_authentication_architecture.md
# - 0048_implement_user_model.md
# - 0049_implement_auth_service.md
# - 0050_add_auth_endpoints.md
# - 0051_add_auth_tests.md
```

## TodoWrite Integration

### Kanban Board Mapping

| Task Status | Kanban Column |
|-------------|---------------|
| `Backlog` | Backlog |
| `Todo` | Todo |
| `WIP` | In Progress |
| `Testing` | Testing |
| `Done` | Done |

### Sync Behavior

When `tasks refresh` is run:

1. **Read Task Files** - Scan `docs/prompts/*.md`
2. **Parse Frontmatter** - Extract status, WBS#, metadata
3. **Update TodoWrite** - Sync Kanban columns
4. **Verify** - Confirm all tasks accounted for

### Conflict Resolution

If task file status differs from TodoWrite:

- **Task file is source of truth** - Always use task file status
- **TodoWrite is updated** - Kanban reflects task files
- **Manual TodoWrite changes** - Overwritten on next refresh

## Advanced Features

### Dependency Tracking

Tasks can specify dependencies in frontmatter:

```yaml
---
dependencies: [0045, 0046]
---
```

**Dependency validation:**
- Prevents circular dependencies
- Blocks task execution until dependencies met
- Visualized in task list

### Hierarchical Task Structure

Support for parent-child relationships:

```yaml
---
parent: 0047
---
```

**Subtask numbering:**
- Parent: `0047`
- Children: `0047.1`, `0047.2`, `0047.3`

### WBS# Auto-Assignment

Automatic sequential numbering:

```python
# Current max WBS: 0046
tasks create "New task"  # Creates 0047
tasks create "Another"   # Creates 0048
```

### Bulk Operations

Update multiple tasks at once:

```bash
# Move all backlog to todo
tasks list backlog | xargs tasks update {} todo

# Tag all auth-related tasks
tasks list --filter auth | xargs tasks update {} --tag security
```

## Workflow Integration

### Starting a New Workflow

```bash
# 1. Create initial task
tasks create "Build feature X"

# 2. Decompose into subtasks
tasks decompose "Break down feature X"

# 3. Start first task
tasks update 47 todo

# 4. Delegate to code-generate (which invokes super-coder)
/rd2:code-generate --task 0047
```

### Monitoring Progress

```bash
# Check overall progress
tasks list

# Check what's in progress
tasks list wip

# Check what's ready to start
tasks list todo

# View Kanban
tasks refresh
```

### Completing Tasks

```bash
# Mark as testing
tasks update 47 testing

# Run tests
pytest tests/

# Mark as done
tasks update 47 done

# Sync Kanban
tasks refresh
```

## Troubleshooting

### Task File Not Found

**Error:** `Task file not found: 0047`

**Solution:**
- Verify WBS# is correct: `ls docs/prompts/ | grep 0047`
- Check file extension: Should be `.md`
- Verify directory: `docs/prompts/`

### Status Update Failed

**Error:** `Failed to update task status`

**Solution:**
- Check file permissions: `ls -la docs/prompts/`
- Verify frontmatter syntax: Use YAML format
- Check status value: Must be `Backlog`, `Todo`, `WIP`, `Testing`, or `Done`

### Kanban Sync Failed

**Error:** `TodoWrite sync failed`

**Solution:**
- Verify TodoWrite is available
- Check hooks configuration: `plugins/rd2/hooks/hooks.json`
- Run `tasks list` to verify task files are valid

### Circular Dependencies

**Error:** `Circular dependency detected: 0047 → 0048 → 0047`

**Solution:**
- Review dependency chains
- Remove circular reference
- Use parent-child relationship instead

## Best Practices

### Task Sizing

- **Ideal size:** 2-8 hours per task
- **Too small:** < 1 hour (consider combining)
- **Too large:** > 16 hours (needs decomposition)

### Task Naming

**Good:**
- "Implement user authentication API"
- "Add OAuth2 Google provider"
- "Create user model with email verification"

**Avoid:**
- "Auth stuff"
- "Fix bugs"
- "Work on feature"

### Status Transitions

```
Backlog → Todo → WIP → Testing → Done
    ↑                              ↓
    └──────────────────────────────┘
              (reopen if needed)
```

### Dependency Management

- Keep dependencies minimal (< 3 per task)
- Document why dependency exists
- Use blocking vs related dependency types
- Avoid circular dependencies

## Related Documentation

- **Workflow**: `/docs/rd2-workflow.md`
- **Architecture**: `/docs/rd2-architecture.md`
- **Migration**: `/docs/migration-0.0-to-0.1.md`
- **tasks skill**: `/plugins/rd2/skills/tasks/SKILL.md`
