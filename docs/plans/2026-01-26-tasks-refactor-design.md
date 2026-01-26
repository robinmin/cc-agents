# Tasks Workflow Refactoring Design

**Date:** 2026-01-26
**Status:** Implemented
**Task:** 0086 - Refactor code-generate and tasks-plan and its related components

---

## Overview

This document describes the refactored architecture for the `tasks-*` command family and related agents. The goal is to simplify the workflow, clarify responsibility boundaries, and unify human-driven and machine-driven execution paths.

### Design Principles

1. **Fat Skills, Thin Wrappers** - Commands are thin wrappers, agents contain the logic
2. **Unified Path** - Human and machine use the same workflow with mode flags
3. **Single Source of Truth** - Task files managed via `tasks` CLI
4. **Clear Boundaries** - Each component has one responsibility

---

## Command Family

All workflow commands use the `tasks-*` namespace for consistency.

### Command Specifications

All commands use **smart positional input** (`<task>`):
- `0047` → WBS number (digits only)
- `docs/prompts/0047_oauth.md` → File path (ends with `.md`)
- `"Build feature"` → Requirements description (only for `tasks-plan`)

| Command | Arguments | Delegates To | Purpose |
|---------|-----------|--------------|---------|
| `/tasks-plan` | `<task> [--execute] [--auto\|--semi\|--step] [--with-architect] [--with-designer] [--skip-design]` | super-planner | Full workflow orchestration |
| `/tasks-refine` | `<task> [--force]` | super-planner --refine-only | Requirement refinement |
| `/tasks-design` | `<task> [--with-architect] [--with-designer]` | super-planner --design-only | Design phase only |
| `/tasks-run` | `<task> [--tool] [--no-tdd]` | super-coder | Single task implementation |
| `/tasks-review` | `<task> [--tool] [--focus]` | code-review skill | Single task review |

### Renamed Commands

| Old Name | New Name | Reason |
|----------|----------|--------|
| `code-generate` | `tasks-run` | Unified namespace |
| `code-review` | `tasks-review` | Unified namespace |

---

## Execution Modes

Three modes control checkpoint behavior:

| Mode | Flag | Checkpoints | Default For |
|------|------|-------------|-------------|
| **Auto** | `--auto` | None (errors only) | Machine/LLM calls |
| **Semi** | `--semi` | After planning + on errors | Human `/tasks-plan` |
| **Step** | `--step` | Every action confirmed | Debugging/learning |

### Checkpoint Matrix

| Event | `--auto` | `--semi` | `--step` |
|-------|----------|----------|----------|
| After planning/decomposition | Skip | Confirm | Confirm |
| Before each task starts | Skip | Skip | Confirm |
| After each task completes | Skip | Skip | Confirm |
| Review finds issues | Auto-fix (3x) | Confirm | Confirm |
| Max retries exceeded | Mark blocked, continue | Confirm | Confirm |
| Error occurs | Log, continue | Confirm | Confirm |

### Default Mode Detection

```
IF invoked via /tasks-plan (human):
  → default to --semi

IF invoked via Task(super-planner, ...) (machine):
  → default to --auto
```

---

## Agent Architecture

### Agent Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│                      Agent Layer                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  super-planner (orchestrator)                               │
│       ├─ Scale assessment                                   │
│       ├─ Specialist delegation                              │
│       ├─ Task decomposition                                 │
│       └─ Execution loop (if --execute)                      │
│                                                             │
│  super-coder (implementation specialist)                    │
│       ├─ 17-step methodology                                │
│       ├─ TDD workflow                                       │
│       └─ Delegates to rd2:coder-* skills                   │
│                                                             │
│  super-architect (solution architecture)                    │
│       └─ Delegates to architecture skills                   │
│                                                             │
│  super-designer (UI/UX design)                              │
│       └─ Delegates to design skills                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Specialist Auto-Detection

| Pattern in Task | Triggers |
|-----------------|----------|
| database, schema, API, endpoint, integration, microservice | `super-architect` |
| UI, component, form, page, layout, accessibility, responsive | `super-designer` |
| bug fix, typo, refactor, rename, small change | Neither (skip design) |

### Override Flags

- `--with-architect` - Force architecture review
- `--with-designer` - Force design review
- `--skip-design` - Skip design phase entirely

---

## Task File Structure

### Frontmatter

```yaml
---
name: Feature Name
description: Brief description
status: Backlog | Todo | WIP | Testing | Done | Blocked
created_at: YYYY-MM-DD HH:MM:SS
updated_at: YYYY-MM-DD HH:MM:SS
impl_progress:
  planning: pending | in_progress | completed | skipped
  design: pending | in_progress | completed | skipped
  implementation: pending | in_progress | completed | skipped
  review: pending | in_progress | completed | skipped
  testing: pending | in_progress | completed | skipped
blocked_reason: "Optional: reason for blocked status"
blocked_at: "Optional: timestamp when blocked"
---
```

### Sections

| Section | Purpose |
|---------|---------|
| `Background` | Context and motivation |
| `Requirements` | Acceptance criteria |
| `Q&A` | Clarifications from planning |
| `Design` | Architecture/UI specs from specialists |
| `Plan` | Step-by-step implementation plan |
| `Artifacts` | Generated files table |
| `References` | Links to docs, related tasks |

### Task Statuses

| Status | Meaning |
|--------|---------|
| `Backlog` | Not started, low priority |
| `Todo` | Ready to start |
| `WIP` | In progress |
| `Testing` | Implementation done, testing |
| `Done` | Completed |
| `Blocked` | Failed after max retries |

---

## Complete Workflow

```
Entry Points:
├─ Human: /tasks-plan "Build OAuth" --execute --semi
└─ Machine: Task(super-planner, "Build OAuth --execute --auto")

super-planner Workflow:
│
├─ PHASE 1: PLANNING
│   ├─ Assess scale (low/medium/high)
│   ├─ Gather requirements
│   ├─ IF --semi/--step: checkpoint("Proceed with planning?")
│   └─ Update impl_progress.planning: completed
│
├─ PHASE 2: DESIGN (if needed or forced)
│   ├─ IF architecture needed → delegate to super-architect
│   ├─ IF UI/UX needed → delegate to super-designer
│   ├─ Write specs to Design section
│   └─ Update impl_progress.design: completed
│
├─ PHASE 3: DECOMPOSITION
│   ├─ Break into subtasks via tasks CLI
│   ├─ Create task files with dependencies
│   └─ Build execution queue ordered by dependencies
│
└─ PHASE 4: EXECUTION (if --execute)
    FOR each task in queue:
      ├─ IF --step: checkpoint("Start task {WBS}?")
      ├─ tasks update {WBS} wip
      ├─ Delegate to super-coder for implementation
      ├─ Delegate to code-review skill for review
      ├─ IF review fails:
      │   ├─ Auto-fix (max 3 retries)
      │   └─ IF still fails:
      │       ├─ Mark task as Blocked
      │       ├─ Set blocked_reason
      │       └─ Continue to next task
      ├─ Update impl_progress phases
      ├─ tasks update {WBS} done
      └─ IF --step: checkpoint("Task complete. Continue?")

    Report: Summary of completed/blocked tasks
```

---

## Error Handling

### Retry Strategy

- Implementation errors: Auto-retry up to 3 times
- Test failures: Auto-fix up to 3 times
- Review issues: Auto-fix up to 3 times

### On Max Retries Exceeded

| Mode | Behavior |
|------|----------|
| `--auto` | Mark task Blocked, continue with next task |
| `--semi` | Pause, ask user: "Skip and continue, or abort?" |
| `--step` | Pause, ask user for decision |

### Blocked Task Fields

```yaml
status: Blocked
blocked_reason: "Test failures after 3 retry attempts"
blocked_at: 2026-01-26T10:30:00
impl_progress:
  implementation: blocked  # Phase that failed
```

---

## Files to Modify

### Commands (Thin Wrappers)

| File | Action | Notes |
|------|--------|-------|
| `plugins/rd2/commands/tasks-plan.md` | Modify | Add mode flags, delegate to super-planner |
| `plugins/rd2/commands/tasks-refine.md` | Modify | Delegate to super-planner --refine-only |
| `plugins/rd2/commands/tasks-design.md` | Modify | Delegate to super-planner --design-only |
| `plugins/rd2/commands/tasks-run.md` | Create | New name for code-generate |
| `plugins/rd2/commands/tasks-review.md` | Create | New name for code-review |
| `plugins/rd2/commands/code-generate.md` | Delete | Replaced by tasks-run |
| `plugins/rd2/commands/code-review.md` | Delete | Replaced by tasks-review |

### Agents

| File | Action | Notes |
|------|--------|-------|
| `plugins/rd2/agents/super-planner.md` | Modify | Add execution loop, mode handling |
| `plugins/rd2/agents/super-coder.md` | Minor | Align with new phases |
| `plugins/rd2/agents/super-architect.md` | Keep | No changes |
| `plugins/rd2/agents/super-designer.md` | Keep | No changes |

### Infrastructure (Done)

| File | Status | Notes |
|------|--------|-------|
| `plugins/rd2/skills/tasks/assets/.template.md` | ✓ Done | New 5-phase structure |
| `plugins/rd2/skills/tasks/scripts/tasks.py` | ✓ Done | Added Blocked status |

---

## Implementation Plan

### Phase 1: Command Layer ✓ COMPLETED
1. ✓ Create `tasks-run.md` (copy from code-generate, simplify)
2. ✓ Create `tasks-review.md` (copy from code-review, simplify)
3. ✓ Modify `tasks-plan.md` (add mode flags, simplify to wrapper)
4. ✓ Modify `tasks-refine.md` (simplify to wrapper)
5. ✓ Modify `tasks-design.md` (simplify to wrapper)
6. ✓ Delete `code-generate.md` and `code-review.md`

### Phase 2: Agent Layer ✓ COMPLETED
1. ✓ Modify `super-planner.md` (add execution loop, mode handling, checkpoints)
2. ✓ Update `super-coder.md` (align with new phases)

### Phase 3: Testing
1. Test human workflow: `/tasks-plan "test" --execute --semi`
2. Test machine workflow: `Task(super-planner, "test --execute --auto")`
3. Test single-task commands: `/tasks-run 0087`, `/tasks-review 0087`
4. Test error handling and blocked status

---

## Appendix: Command Templates

### tasks-plan.md Template

```markdown
---
description: Full workflow orchestration with planning, design, and execution
argument-hint: "<task-file.md> [--execute] [--auto|--semi|--step]"
---

# Tasks Plan

Orchestrate complete task workflow: planning → design → implementation → review.

## Arguments

- `task`: Task file or description
- `--execute`: Run implementation after planning
- `--auto`: Autonomous mode (no checkpoints)
- `--semi`: Key checkpoints only (default for human)
- `--step`: Confirm every action
- `--with-architect`: Force architecture review
- `--with-designer`: Force design review
- `--skip-design`: Skip design phase

## Workflow

Task(
  subagent_type="super-planner",
  prompt="""
  Task: {task}
  Mode: {auto|semi|step}
  Execute: {true|false}
  Flags: {with-architect, with-designer, skip-design}
  """
)
```

### tasks-run.md Template

```markdown
---
description: Single task implementation
argument-hint: "<WBS-number>"
---

# Tasks Run

Implement a single task using super-coder.

## Arguments

- `task-id`: WBS number (e.g., 0087)

## Workflow

Task(
  subagent_type="super-coder",
  prompt="Implement task {task-id}"
)
```
