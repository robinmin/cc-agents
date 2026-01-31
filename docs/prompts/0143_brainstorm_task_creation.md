---
name: brainstorm-task-creation
description: Implement Phase 4: Task Creation for rd2:brainstorm skill
status: Done
created_at: 2026-01-30
updated_at: 2026-01-30
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
dependencies: [0140, 0141, 0142]
tags: [brainstorm, skill, task-creation, tasks-cli]
---

## 0143. Brainstorm Task Creation

### Background

Phase 3 generates structured markdown output with approaches and recommendations. Phase 4 needs to:
1. Present task-worthy items from the brainstorming session
2. Use AskUserQuestion to confirm which items to convert to task files
3. Batch create task files using the tasks CLI
4. Update kanban board

This is the final phase that connects brainstorming to the task-based workflow.

### Requirements / Objectives

**Functional Requirements:**
- Extract potential tasks from brainstorming output
- Present items to user for selection
- Use AskUserQuestion tool for confirmation
- Batch create task files using tasks CLI
- Update kanban board after creation
- Support "create all", "create some", "skip task creation" options

**Non-Functional Requirements:**
- Use tasks CLI for all task operations (don't re-implement)
- Provide clear feedback during task creation
- Handle errors gracefully
- Confirm successful task creation

**Acceptance Criteria:**
- [ ] Task-worthy items extracted from brainstorming output
- [ ] AskUserQuestion used to confirm task creation
- [ ] "Create all" option creates tasks for all items
- [ ] "Create some" option allows selective task creation
- [ ] "Skip" option exits without creating tasks
- [ ] Tasks created via tasks CLI with proper WBS numbers
- [ ] Kanban board refreshed after creation
- [ ] User receives confirmation with created task paths

#### Q&A

**Q:** How do we determine what's "task-worthy"?
**A:** Items that are concrete action items, have clear objectives, and can be executed independently. Items should pass the "can be worked on" test.

**Q:** What WBS numbers should be used?
**A:** Use the tasks CLI which auto-assigns the next available WBS numbers.

### Solutions / Goals

**Technology Stack:**
- tasks CLI for task creation and management
- AskUserQuestion tool for user interaction
- Bash tool for executing tasks CLI commands

**Implementation Approach:**
1. Analyze brainstorming output for task-worthy items
2. Group related items logically
3. Present grouped items to user for selection
4. Execute tasks CLI to create selected tasks
5. Refresh kanban board
6. Report completion with task paths

#### Plan

1. **Task Extraction** - Identify task-worthy items
   - [ ] Parse brainstorming output for action items
   - [ ] Filter for concrete, executable items
   - [ ] Group related items together
   - [ ] Generate task names from descriptions

2. **User Confirmation** - Present options using AskUserQuestion
   - [ ] Show grouped task items
   - [ ] Provide options: "Create all", "Create some", "Skip"
   - [ ] If "Create some", allow item-by-item confirmation
   - [ ] Handle user selection

3. **Task Creation** - Use tasks CLI to create tasks
   - [ ] Execute `tasks create` for each selected item
   - [ ] Capture assigned WBS numbers
   - [ ] Track created task file paths
   - [ ] Handle errors gracefully

4. **Kanban Update** - Refresh kanban board
   - [ ] Execute `tasks refresh` to update kanban
   - [ ] Confirm successful update

5. **Completion Report** - Provide summary
   - [ ] List created task files with WBS numbers
   - [ ] Provide absolute file paths
   - [ ] Confirm kanban board updated
   - [ ] Offer next steps (e.g., run tasks-plan on new tasks)

### References

- Tasks skill: `plugins/rd2/skills/tasks/SKILL.md`
- Tasks CLI script: `plugins/rd2/skills/tasks/scripts/tasks.py`
- Task workflow: `plugins/rd2/skills/task-workflow/SKILL.md`
- Task file template: `docs/prompts/.template.md`
