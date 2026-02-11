---
name: task-workflow
description: 13-step implementation workflow for rd2 agents. Workflow orchestration that delegates all task mechanics to rd2:tasks.
---

# Task Workflow

## Overview

Simplified 13-step implementation workflow for task-driven development. This skill defines **workflow orchestration** (what to do when), while the `rd2:tasks` skill handles **task mechanics** (creation, updates, validation).

**Key Distinction**:
- **This skill** (`rd2:task-workflow`) = Workflow orchestration, decision points, coordination logic
- **rd2:tasks skill** = Task file mechanics (create, update, validate, template, kanban sync)

**Used by**: `super-coder`, `super-planner`, `super-architect`, `super-designer`, `super-code-reviewer`

---

## When to Use

Use this workflow when:
- Following task-driven development with WBS files
- Implementing features through structured process
- Coordinating multi-phase project execution
- Need clear decision points in development workflow

---

## 13-Step Implementation Workflow

### Phase 1: Understand (Steps 1-3)

**Step 1: Read & Parse Task**
- **Action**: Read task file via `tasks open WBS`
- **Parse**: Frontmatter (status, impl_progress), Background, Requirements, References
- **Validate**: Task file format is correct (use `tasks check WBS`)
- **Understand**: Problem domain and context from Background section

**Step 2: Clarify & Document**
- **Action**: If requirements are unclear, ask user for clarification via `AskUserQuestion`
- **Document**: Add Q&A subsection under Requirements with questions and answers
- **Update**: Use `tasks update WBS --section "Q&A" --from-file` to save clarifications
- **Verify**: Re-read task file to confirm updates

**Step 3: Research Context**
- **Action**: For enhancement tasks, find relevant files in codebase
- **Tools**: Use `Grep` and `Glob` to locate related code
- **Understand**: Existing patterns, conventions, and architectural constraints
- **Reference**: Note relevant code patterns in References section

---

### Phase 2: Design (Steps 4-6)

**Step 4: Design Solution**
- **Action**: Create technical approach considering architecture and constraints
- **Consider**: Existing patterns, testability, maintainability, performance
- **Document**: Write design under Design section (architecture, UI specs, approach)
- **Update**: Use `tasks update WBS --section Design --from-file design.md`
- **Solution [MANDATORY]**: Populate Solution section with technical strategy. This is REQUIRED before WIP transition. Solution should contain: approach summary, key decisions, files to create/modify, acceptance criteria.
- **Update**: Use `tasks update WBS --section Solution --from-file solution.md`

**Step 5: Plan Implementation** (optional for simple tasks)
- **Action**: Break down solution into step-by-step implementation phases
- **Structure**: Create Plan subsection with phases and sequencing
- **Include**: Dependencies, prerequisites, verification steps
- **Add**: References to documentation, patterns, similar implementations
- **Update**: Use `tasks update WBS --section Plan --from-file plan.md`

**Step 6: Mark as WIP**
- **Critical Checkpoint**: Transition task status to WIP
- **Command**: `tasks update WBS wip`
- **Validation**: Tiered validation runs automatically (Background, Requirements, Solution must be populated)
- **DO NOT use `--force`**: If validation blocks, go back to Step 4 and populate the missing sections. Using `--force` bypasses quality gates and leads to incomplete task documentation.
- **Phase Sync**: Optionally update impl_progress: `tasks update WBS --phase planning completed`

---

### Phase 3: Execute (Steps 7-13)

**Step 7: Select Approach**
- **Decision**: Choose appropriate coder skill based on task characteristics
- **Factors**: Code complexity, codebase context needs, security requirements
- **Options**: rd2:coder-gemini, rd2:coder-claude, rd2:coder-auggie, rd2:coder-agy, rd2:coder-opencode
- **Reference**: Use `rd2:tool-selection` skill for selection heuristics

**Step 8: Write Tests First** (TDD Red Phase)
- **Action**: Create failing tests that define expected behavior
- **Coverage**: Include happy path, edge cases, error scenarios
- **Run**: Execute tests to verify they fail for the right reasons
- **Reference**: Use `rd2:tdd-workflow` skill for TDD discipline

**Step 9: Implement Code** (TDD Green Phase)
- **Action**: Write minimal code to make tests pass
- **Follow**: Project conventions, patterns discovered in Step 3
- **Track**: `tasks update WBS --phase implementation in_progress`
- **Document**: Note any deviations from plan in task file

**Step 10: Refactor** (TDD Refactor Phase)
- **Action**: Clean up code while keeping tests green
- **Improve**: Code structure, readability, performance
- **Maintain**: All tests must continue passing
- **Verify**: Run full test suite after each refactoring

**Step 11: Run Full Test Suite**
- **Action**: Execute all tests (unit, integration, e2e)
- **Verify**: All existing tests still pass (no regressions)
- **Check**: Code coverage meets project standards (typically 70-80%)
- **Use**: `rd2:test-cycle` skill for test execution workflow

**Step 12: Debug & Fix**
- **Trigger**: If tests fail or errors occur
- **Action**: Apply systematic debugging via `rd2:sys-debugging` skill
- **Process**: Use `rd2:test-cycle` for fix iteration (3-iteration limit with escalation)
- **Document**: Note issues found and solutions in task file

**Step 13: Verify & Complete**
- **Pre-conditions**: All tests passing, coverage adequate, no blockers
- **Transition**: Update task status to Testing: `tasks update WBS testing`
- **Phase Tracking**: Mark implementation complete: `tasks update WBS --phase implementation completed`
- **Artifact**: Log completed work: `tasks update WBS --section Artifacts --append-row "code|path/to/file.py|super-coder|2026-02-10"`
- **Final**: When ready, mark as done: `tasks update WBS done`

---

## Delegation to rd2:tasks

### Infrastructure Handled by rd2:tasks

**DO NOT re-implement these in agents or workflows**:

- **File Creation**: `tasks create "task-name" --background "..." --requirements "..."`
- **Batch Creation**: `tasks batch-create --from-json tasks.json`
- **Status Updates**: `tasks update WBS status`
- **Phase Tracking**: `tasks update WBS --phase implementation completed`
- **Section Updates**: `tasks update WBS --section Design --from-file design.md`
- **Artifact Logging**: `tasks update WBS --section Artifacts --append-row "type|path|agent|date"`
- **Validation**: Built into `tasks update` (tiered: errors, warnings, suggestions)
- **Template**: `docs/.tasks/template.md` defines structure
- **Kanban Sync**: `tasks refresh` aggregates all tasks

### Workflow Handled by task-workflow

**This skill defines these orchestration responsibilities**:

- **Decision Points**: When to move from Phase 1 → Phase 2 → Phase 3
- **Coordination Logic**: Which step comes next based on current state
- **Workflow Guidance**: How to structure Q&A, Design, Plan sections
- **TDD Integration**: When to write tests vs implement vs refactor
- **Error Handling**: When to debug, when to escalate, when to document

---

## Quick Reference

### Typical Workflow Commands

```bash
# Phase 1: Understand
tasks open 47                                    # Step 1: Read task
tasks check 47                                   # Validate format
tasks update 47 --section "Q&A" --from-file qa.md  # Step 2: Document clarifications

# Phase 2: Design
tasks update 47 --section Design --from-file design.md    # Step 4: Design
tasks update 47 --section Plan --from-file plan.md        # Step 5: Plan
tasks update 47 wip                                        # Step 6: Mark WIP

# Phase 3: Execute
tasks update 47 --phase implementation in_progress   # Step 9: Track progress
tasks update 47 --phase implementation completed     # After implementation
tasks update 47 testing                              # Step 13: Transition to testing
tasks update 47 done                                 # Final completion
```

### Status & Phase Flow

```
Task Status:    Backlog → Todo → WIP → Testing → Done
                                   ↓
                                Blocked

impl_progress:  pending → in_progress → completed
                              ↓
                          blocked

Phase Mapping:  Any phase in_progress → Task status: WIP
                All phases completed   → Task status: Done
                Any phase blocked      → Task status: Blocked
```

### Validation Tiers

When running `tasks update WBS status`:

- **Tier 1 (Errors)**: Always block (missing frontmatter)
- **Tier 2 (Warnings)**: Block when empty Background, Requirements, or Solution. Fix: populate the sections first.
- **Tier 3 (Suggestions)**: Informational only (empty References)

Example:
```bash
tasks update 47 wip          # Blocked if Background/Requirements/Solution empty

# CORRECT: populate sections first, then transition
tasks update 47 --section Solution --from-file /tmp/solution.md
tasks update 47 wip          # Now passes validation

# AVOID: --force bypasses quality gates and leads to incomplete documentation
# tasks update 47 wip --force  # Use only as last resort
```

---

## Integration with Other Skills

### Workflow Coordination

| Phase | Primary Skill | Supporting Skills |
|-------|---------------|-------------------|
| Understand | rd2:task-workflow | rd2:tasks (open, check) |
| Design | rd2:task-workflow | rd2:tasks (update --section) |
| Execute | rd2:tdd-workflow | rd2:tasks (update --phase), rd2:test-cycle, rd2:sys-debugging |
| Review | rd2:code-review-* | rd2:tasks (update status) |

### Correct Delegation Pattern

```python
# ✅ CORRECT: Delegate to rd2:tasks
invoke_skill("rd2:tasks", f"update {wbs} wip")
invoke_skill("rd2:tasks", f"update {wbs} --phase implementation completed")

# ❌ WRONG: Don't re-implement task mechanics
update_task_status(wbs, "wip")  # Don't do this
write_impl_progress(wbs, "implementation", "completed")  # Don't do this
```

---

## Workflow Optimization Tips

### Skip Steps When Appropriate

- **Step 2 (Clarify)**: Skip if requirements are crystal clear
- **Step 3 (Research)**: Skip for greenfield/new features
- **Step 4 (Design)**: Lightweight for simple tasks
- **Steps 8-10 (TDD)**: Can collapse for trivial fixes (but prefer full TDD)

### Workflow Checkpoints

Key decision points where workflow can pause for review:

1. **After Step 2**: User clarification needed?
2. **After Step 5**: Design/plan approved?
3. **After Step 6**: Ready to code? (Status: WIP)
4. **After Step 11**: Tests passing? Ready for review?
5. **After Step 13**: Ready to mark done? (Status: Done)

### Multi-Agent Coordination

Different agents handle different phases:

- **super-planner**: Steps 1-5 (understand, design, plan)
- **super-architect**: Step 4 (technical design)
- **super-coder**: Steps 7-13 (execute, implement, verify)
- **super-code-reviewer**: Post-Step 13 (review before done)

---

## References

- **rd2:tasks** skill - Task file mechanics and CLI commands
- **rd2:tdd-workflow** skill - Test-driven development discipline
- **rd2:test-cycle** skill - Test execution and fix iteration
- **rd2:sys-debugging** skill - Systematic debugging methodology
- **rd2:tool-selection** skill - Coder skill selection heuristics
- **Template**: `docs/.tasks/template.md` - Task file structure
- **Kanban**: `docs/.tasks/kanban.md` - Visual task board

---

## Migration Notes

**Changes from previous version (393 lines → 198 lines)**:

- ✅ Simplified 17 steps → 13 steps (24% reduction)
- ✅ Removed redundant infrastructure (file organization, frontmatter, content structure)
- ✅ Removed impl_progress mechanics (now use `tasks update --phase`)
- ✅ Removed WBS extraction logic (tasks CLI handles this)
- ✅ Removed status flow diagrams (delegated to rd2:tasks)
- ✅ Clearer TDD integration (Steps 8-10 explicitly map to red-green-refactor)
- ✅ All task mechanics delegated to rd2:tasks skill

**Backward Compatibility**: Agents using the previous 17-step workflow will continue to work - the 13 steps are consolidations, not removals of functionality.
