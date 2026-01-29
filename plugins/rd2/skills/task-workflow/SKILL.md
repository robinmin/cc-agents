---
name: task-workflow
description: Universal task file content structure and 17-step implementation workflow shared across all rd2 agents. Delegates task mechanics (creation, status updates, kanban sync) to rd2:tasks.
skills:
  - rd2:tasks
---

# Task Workflow

## Overview

Universal task file content structure and 17-step implementation workflow for rd2 agents. This skill defines the **format** and **workflow** for working with task files, while delegating the **mechanics** (file creation, status updates, kanban synchronization) to `rd2:tasks`.

**Key distinction:**
- This skill (`rd2:task-workflow`) = Task file structure and workflow
- `rd2:tasks` skill = Task lifecycle mechanics (create, update, sync)

**Used by:** `super-coder`, `super-planner`, `super-architect`, `super-designer`, `super-code-reviewer`

## Enhanced Task File Structure

### File Organization Pattern

**Main Task File:**
```
docs/prompts/<WBS>_<task_name>.md
```
Example: `docs/prompts/0089_customize_rulesync_to_sync_plugins.md`

**Additional Files (Implementation Artifacts):**
```
docs/prompts/<WBS>/
├── <WBS>_IMPLEMENTATION_SUMMARY.md
├── <WBS>_DESIGN.md
├── <WBS>_NOTES.md
└── ... (other implementation-related files)
```
Example: `docs/prompts/0089/0089_IMPLEMENTATION_SUMMARY.md`

**Key Rules:**
1. **Main task file** stays in `docs/prompts/` with pattern `<WBS>_<name>.md`
2. **Additional files** go into subfolder `docs/prompts/<WBS>/`
3. **Only create subfolder** when additional files are needed (avoid empty folders)
4. **Prefix additional files** with WBS number for consistency

**Rationale:**
- Prevents multiple files with same WBS prefix from cluttering `docs/prompts/`
- Keeps main task files discoverable by the `tasks` CLI
- Groups related implementation artifacts together
- Maintains clear separation between task definition and implementation details

### Frontmatter Format

```yaml
---
name: task-name
description: brief description
status: Backlog | Todo | WIP | Testing | Done
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
impl_progress:
  planning: pending | in_progress | completed | blocked
  design: pending | in_progress | completed | blocked
  implementation: pending | in_progress | completed | blocked
  review: pending | in_progress | completed | blocked
  testing: pending | in_progress | completed | blocked
dependencies: []
tags: []
---
```

### Content Structure

```markdown
## WBS#_task_name

### Background

[Context about the problem domain, why this task exists]

### Requirements / Objectives

**Functional Requirements:**
- Requirement 1
- Requirement 2

**Non-Functional Requirements:**
- Performance constraint
- Security requirement

**Acceptance Criteria:**
- [ ] Criteria 1
- [ ] Criteria 2

#### Q&A

**Q:** [Question from agent]
**A:** [Answer from user]

### Solutions / Goals

**Technology Stack:**
- Technology choices

**Implementation Approach:**
1. Step 1
2. Step 2

#### Plan

1. **Phase 1** - [Description]
   - [ ] Subtask 1
   - [ ] Subtask 2

2. **Phase 2** - [Description]
   - [ ] Subtask 3

### References

- [Documentation link](url)
- [Code reference](path)
```

## impl_progress Tracking

### Purpose

Track phase-by-phase completion in task file frontmatter for checkpoint-based resumption.

### Standard Phases

| Phase | Owner | Description |
|-------|-------|-------------|
| `planning` | super-planner | Requirements gathering, clarification |
| `design` | super-architect/designer | Architecture, UI/UX design |
| `implementation` | super-coder | Code generation, writing |
| `review` | super-code-reviewer | Code review, quality check |
| `testing` | super-coder | Test execution, verification |

### Status Values

- `pending` - Not started
- `in_progress` - Currently executing
- `completed` - Finished, checkpoint written
- `blocked` - Cannot proceed, documented reason

### Transitions

```
pending → in_progress: On phase start
in_progress → completed: On successful completion
in_progress → blocked: On failure with blocker
NEVER: completed → any other state (checkpoints are immutable)
```

### Update Discipline

1. **Before execution** - Set phase to `in_progress` via `rd2:tasks update WBS wip`
2. **After completion** - Set phase to `completed`
3. **Write checkpoint** - Update task file frontmatter immediately
4. **Verify write** - Re-read file to confirm
5. **Sync status** - Update tasks CLI and TodoWrite

### Resumption Support

- On `--resume`: Scan `impl_progress`, find last `in_progress` or `completed`
- Skip completed phases automatically
- Resume from next pending or in-progress phase
- Validate checkpoint integrity before resuming

### Status Mapping to tasks CLI

```
Any phase in_progress → Task status: WIP
All phases completed → Task status: Done
Any phase blocked → Task status: Blocked
```

## 17-Step Implementation Workflow

### Steps 1-6: Understand & Clarify

**Step 1: Read Task File**
- Parse WBS#, Background, Requirements/Objectives, Solutions/Goals, References
- Extract frontmatter (status, impl_progress, dependencies)
- Verify task file format is valid

**Step 2: Understand Context**
- Read Background section
- Understand the problem domain
- Identify related work or dependencies

**Step 3: Parse Requirements**
- Extract objectives from Requirements/Objectives section
- List functional and non-functional requirements
- Review acceptance criteria

**Step 4: Clarify Ambiguities**
- If requirements are unclear, ask user for clarification
- Use `AskUserQuestion` tool for structured clarification
- Document all clarifications in Q&A subsection

**Step 5: Document Q&A**
- Add new "Q&A" subsection under Requirements/Objectives
- Include questions asked and answers received
- Update task file with clarifications

**Step 6: Research Existing Code**
- For enhancement tasks, find relevant files in codebase
- Use `Grep` and `Glob` to locate related code
- Understand existing patterns and conventions

### Steps 7-10: Design & Plan

**Step 7: Design Solution**
- Create technical approach considering architecture constraints
- Consider existing patterns and conventions
- Think about testability and maintainability

**Step 8: Update Solutions Section**
- Write solution design under Solutions/Goals
- Include technology choices and rationale
- Document approach and trade-offs

**Step 9: Create Implementation Plan**
- Add "Plan" subsection under Solutions/Goals
- Break down into step-by-step implementation phases
- Include dependencies and sequencing

**Step 10: Add References**
- Include relevant documentation links
- Reference code patterns and examples
- Link to existing implementations or similar tasks

### Step 11: Status Transition

**Step 11: Mark Task as WIP**
- Update task file status to "WIP" in frontmatter via `rd2:tasks update WBS wip`
- Set appropriate impl_progress phase to `in_progress`
- Confirm update was successful

### Steps 12-17: Execute & Verify

**Step 12: Select Code Generation**
- Delegate to appropriate coder skill based on task characteristics
- Consider: complexity, codebase context, security needs
- Use tool selection heuristics (see `rd2:tool-selection`)

**Step 13: Apply TDD Workflow**
- Use `rd2:tdd-workflow` skill for test-driven development
- Follow red-green-refactor cycle
- Generate tests before implementation when appropriate

**Step 14: Implement Code**
- Write implementation code following the plan
- Follow project conventions and patterns
- Document any deviations from the plan

**Step 15: Generate Tests**
- Create unit tests ensuring code correctness
- Target 70-80% test coverage for production code
- Include edge cases and error scenarios

**Step 16: Debug Issues**
- Apply systematic debugging if tests fail or errors occur
- Use `rd2:test-cycle` for test execution and fix iteration
- Follow 3-iteration fix cycle with escalation

**Step 17: Verify Completion**
- Ensure all tests pass before marking as ready for review
- Update impl_progress phase to `completed`
- Update task status to "Testing" via `rd2:tasks update WBS testing`

## Task-Driven Mode Workflow

When an agent is invoked with `--task WBS#`:

```
1. Detect input format:
   ├── If contains "/" or ".md" → treat as file path
   │   └── Read directly: <path>
   └── If numeric/short (e.g., 0047) → treat as WBS#
       └── Search: docs/prompts/<wbs_number>_*.md

2. Extract WBS# from filename (first 4 digits before underscore)

3. Parse frontmatter (name, description, status, impl_progress)

4. Follow 17-step workflow:
   ├── Steps 1-6: Understand & Clarify
   ├── Steps 7-10: Design & Plan
   ├── Step 11: Mark as WIP (via rd2:tasks update)
   └── Steps 12-17: Execute & Verify

5. Update task file with:
   ├── Q&A subsection (if clarifications made)
   ├── Plan subsection (implementation steps)
   ├── References (docs, patterns, examples)
   └── impl_progress updates

6. Delegate mechanics to rd2:tasks:
   ├── Status updates: tasks update WBS wip
   ├── Kanban sync: tasks refresh
   └── TodoWrite sync: automatic via hooks
```

## Delegation to rd2:tasks

### What rd2:tasks Handles

**Do NOT re-implement in this skill:**
- Task file creation (`tasks create`)
- Status lifecycle management (`tasks update WBS status`)
- Kanban board synchronization (`tasks refresh`)
- TodoWrite integration (automatic via hooks)
- Task templates and format

**What this skill defines:**
- Task file content structure (sections, subsections)
- Workflow for working through task files (17 steps)
- Phase progress tracking format (impl_progress)
- Q&A, Plan, References formats

### Correct Usage Pattern

```python
# ❌ WRONG: Don't re-implement task status management
update_task_status(wbs, "wip")  # Don't do this

# ✅ CORRECT: Delegate to rd2:tasks
invoke_skill("rd2:tasks", f"update {wbs} wip")  # Do this instead
```

## Quick Reference

### WBS# Extraction

- Filename: `0032_update_evaluation_md.md` → WBS# = `0032`
- Filename: `0047_add_oauth_support.md` → WBS# = `0047`
- WBS# is always the 4-digit prefix before the first underscore

### Task Status Flow

```
Backlog → Todo → WIP → Testing → Done
```

### impl_progress Status Values

```
pending → in_progress → completed
                    ↓
                  blocked
```

### File Organization Pattern

**Main Task File:**
```
docs/prompts/<WBS>_<task_name>.md
```
Example: `docs/prompts/0089_customize_rulesync.md`

**Additional Implementation Artifacts:**
```
docs/prompts/<WBS>/
├── <WBS>_IMPLEMENTATION_SUMMARY.md
├── <WBS>_DESIGN.md
└── ... (other files)
```
Example: `docs/prompts/0089/0089_IMPLEMENTATION_SUMMARY.md`

**Key Rule:** Create subfolder `docs/prompts/<WBS>/` only when additional files are needed during implementation.

### Example Commands

```bash
# By WBS# (auto-search in docs/prompts/)
/rd2:tasks-run --task 0047

# By file path (reads directly, extracts WBS# from filename)
/rd2:tasks-run --task docs/prompts/0047_add_auth.md

# Update status via rd2:tasks
tasks update 47 wip
tasks update 0047 testing
tasks update 47 done
```

## References

- `rd2:tasks` skill - Task lifecycle mechanics
- Task file template: `docs/prompts/.template.md`
- Kanban board: `docs/prompts/.kanban.md`
