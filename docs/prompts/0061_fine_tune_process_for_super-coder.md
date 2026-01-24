---
name: fine tune process for super-coder
description: Brainstorm and clarify boundaries between super-planner and super-coder roles in rd2 ecosystem
status: Done
created_at: 2026-01-23 10:34:22
updated_at: 2026-01-23 15:42:00
---

## 0061. fine tune process for super-coder

### Background

#### Full picture of my coding agents

Architecturely, my coding agents composed by the following components:

- super-code-reviewer: Done, response for requirements / implementation verification (mark task files as done once pass)
- super-planner: Todo, response for task decomposition, task planning and orchestration (generate task files)
- super-coder: WIP(Current), response for task implementation (enhance the contents of task files and mark task files as wip once started)
- super-architect: Todo, response for architecture design and optimization with knowledge / skills for backend architecture, frontend architecture, and cloud architecture (enhance the contents of task files and mark task files as wip once started)
- super-designer: Todo, response for design implementation with knowledge / skills for UI/UX design and frontend design (enhance the contents of task files and mark task files as wip once started)
- super-tester: not decided (or implement with the tdd-workflow support?). As I so far do not know how to place super-tester with super-code-reviewer if we have it. Who will response to act as the gate to ensure the implementation's correctness and integrity?

#### Existing old implementation in plugin `rd`

In plugin `rd`, we more or less implemented some of them with different approaches. For example, we have:

- @plugins/rd/skills/super-coder: Methodology to build software reliably and efficiently
- @plugins/rd/skills/code-patterns: how to write code
- @plugins/rd/skills/sys-debugging: how to debug
- @plugins/rd/agents/backend-architect.md: backend architecture subagent
- @plugins/rd/agents/frontend-expert.md: frontend architecture subagent
- @plugins/rd/agents/orchestrator-expert.md: orchestrator subagent
- @plugins/rd/agents/reviewer-expert.md: code review subagent
- @plugins/rd/agents/super-coder.md: super-coder subagent, more like a mini orchestrator
- @plugins/rd/agents/task-decomposition-expert.md: task decomposition subagent
- @plugins/rd/agents/task-runner.md: task runner subagent, more like Senior Task Execution Specialist & Programming Workflow Engineer
- @plugins/rd/agents/test-expert.md: test subagent
- @plugins/rd/agents/uiux-expert.md: UI/UX design subagent
- And, the other programming languages dedicated subagents etc.

It's messy and too complicated, that's the reason we want to develop a new plugin `rd2`. Hope it can provide a more streamlined and efficient workflow for software development with the same or higher knowledge support.

#### Current Status of relevant parts in plugin `rd2`

As we almost implement the task file based `super-coder` featured with tdd-workflow support. But still, there are some issues / uncompleted steps that need to be addressed.

### Requirements / Objectives

Meanwhile, we also planned another big thing `super-planner`, which will be implemented after the super-coder feature is completed. We need to figure out which parts should be included in the `super-planner` and which parts should be included in the `super-coder`. We also need to figure out how the `super-planner` should interact with the `super-coder`.

Right now, here are the steps I can split the whole process into:
| Step | Action | Owner | Remarks |
| --- | --- | --- | --- |
| 1 | Receive user requirements and specifications. | `super-planner` |  |
| 2 | Scale assesment and high level solution choice | `super-planner` |  |
| 3 | Solution architecture design if needed | `super-planner` -> `super-architect` | optional |
| 4 | UI/frontend design if needed | `super-planner` -> `super-designer` | optional |
| 5 | Task decomposition if needed, create task files | `super-planner` | optional, Q1  |
| 6 | With loop to delegate tasks to `super-coder` one-by-one | `super-planner` -> `super-coder` |  |
| 7 | Implement the task, mark task file as wip once started | `super-coder` | Q2 |
| 8 | Generate unit tests and ensure all unit tests pass | `super-coder` | with tdd-workflow, sys-debug, test-generation, Q3 |
| 9 | Delegate to check the correctness and integrity of the implementation | `super-planner` -> `super-code-reviewer` | Q4 |
| 10 | Review the code and solution for the task, mark task file as done once passed  | `super-code-reviewer` |  |

> Questions:
> - Q1: with new Agent Skills task-decomposition? Or this will make `super-planner` too heavy?
> 	-Q2: There are more sub-steps need to be done in this step, including but not limited:
> 	- Understand the sections of "background" and "Requirements / Objectives" and fine tune them if needed
> 	- CLarify with user for the hiden requests or unclear parts
> 	- Add new sub-section "Q&A" into section "Requirements / Objectives" to write down the clarifications and decitions
> 	- Design the whole solution for this task
> 	- Update section "Solutions / Goals" to write down the solition for the task
> 	- Figure out implementtion plan, and add a sub-section "plan" under section ""Solutions / Goals""
> 	- Add exteral informations if needed (For example, find out the relevant parts for existing code enhancement tasks)
> 	- Start to do the real implementation works
> - Q3: That's the reason I pospon to decide whether we need a new role `super-tester` or not as we already complete the things here. This is another potential requirement to convert test-expert subagent in plugin rd to a component of tdd-worflow for plugin rd2
> - Q4: Not only code reviewer but also solition review.

This **IS NOT** a task for any implementation, but a task to brainstorm and clarify the boundary of each `super-*` role, so that we can implement them in the upcoming tasks.

### Solutions / Goals

#### Executive Summary

Research completed via `rd:super-researcher` analysis of 8 rd2 source files. Key findings:

**Recommendation**: Follow "fat skills, thin wrappers" pattern - delegate complex logic to specialized skills, keep coordinators lightweight.

**Confidence**: HIGH - Based on current rd2 architecture patterns and existing skill implementations.

---

#### Q1: Task Decomposition - Embedded vs Skill-Based?

**Question**: Should `super-planner` use the new `rd2:task-decomposition` Agent Skill, or would this make `super-planner` too heavy?

**Answer**: **Use `rd2:task-decomposition` skill** (do not embed decomposition logic in `super-planner`)

**Rationale**:
- Follows "fat skills, thin wrappers" pattern established in rd2
- Delegates specialized work to `rd2:task-decomposition` (which already handles WBS assignment)
- `super-planner` remains a lightweight coordinator that delegates to appropriate skills
- Consistent with how `super-coder` delegates to coder skills and `tdd-workflow`

**Architecture Impact**:
```
super-planner (coordinator)
    ├─→ rd2:task-decomposition (for breaking down tasks)
    ├─→ super-architect (for architecture design)
    ├─→ super-designer (for UI/UX design)
    └─→ rd2:tasks (for task file creation/management)
```

---

#### Q2: Implementation Sub-Steps for Step 7

**Question**: What are the detailed sub-steps for "Implement the task" (Step 7)?

**Answer**: **Expanded from 7 to 17 detailed steps**

**Complete Implementation Sub-Steps** (when `super-coder` receives a task):

1. **Read Task File**: Parse WBS#, Background, Requirements/Objectives, Solutions/Goals, References
2. **Understand Context**: Read Background section, understand the problem domain
3. **Parse Requirements**: Extract objectives from Requirements/Objectives section
4. **Clarify Ambiguities**: If unclear, use `AskUserQuestion` tool to clarify with user
5. **Document Q&A**: Add new "Q&A" subsection under Requirements/Objectives
6. **Research Existing Code**: For enhancement tasks, find relevant files in codebase
7. **Design Solution**: Create technical approach considering architecture constraints
8. **Update Solutions Section**: Write solution design under Solutions/Goals
9. **Create Implementation Plan**: Add "Plan" subsection under Solutions/Goals
10. **Add References**: Include relevant documentation, code patterns, examples
11. **Mark Task as WIP**: Update task file status to "WIP" in frontmatter
12. **Select Code Generation**: Delegate to appropriate coder skill (auggie/gemini/claude/opencode)
13. **Apply TDD Workflow**: Use `rd2:tdd-workflow` skill for test-driven development
14. **Implement Code**: Write implementation code following the plan
15. **Generate Tests**: Create unit tests ensuring code correctness
16. **Debug Issues**: Use `rd2:sys-debugging` if tests fail or errors occur
17. **Verify Completion**: Ensure all tests pass before marking as ready for review

**Workflow Diagram**:
```
Task File Received
        ↓
[Steps 1-6]: Understand & Clarify
        ↓
[Steps 7-10]: Design & Plan
        ↓
[Step 11]: Mark as WIP
        ↓
[Steps 12-17]: Execute & Verify
        ↓
Ready for Review (super-code-reviewer)
```

---

#### Q3: super-tester vs Enhanced tdd-workflow?

**Question**: Should we create a new `super-tester` role, or enhance `rd2:tdd-workflow`?

**Answer**: **Enhance `rd2:tdd-workflow`** (do not create `super-tester`)

**Rationale**:
- `super-coder` already handles test generation via TDD workflow
- Creating `super-tester` would create confusion about responsibility with `super-code-reviewer`
- Better to enhance `tdd-workflow` skill with capabilities from `rd:test-expert`
- `super-code-reviewer` acts as the final gate for correctness and integrity
- Cleaner separation: coding+testing (super-coder) vs verification (super-code-reviewer)

**Enhanced tdd-workflow Should Include**:
- Test generation strategies (unit, integration, e2e)
- Mock design patterns
- Coverage optimization
- Test assertion best practices
- Integration with test frameworks (pytest, vitest, jest, etc.)

**Gatekeeper Responsibility**:
- **super-coder**: Generates tests, ensures tests pass (implementation correctness)
- **super-code-reviewer**: Final verification of implementation AND test quality (solution integrity)

---

#### Q4: Solution Review vs Code Review?

**Question**: What's the difference between "solution review" and "code review"?

**Answer**: **Two distinct review levels with different scopes**

**Solution Review** (Architecture & Design Level):
- Validates the overall approach and architecture decisions
- Checks if the solution addresses the actual requirements
- Evaluates design patterns, system architecture, scalability
- Reviews integration points and system boundaries
- Assesses security, performance, maintainability at design level
- **Owner**: `super-planner` delegates to `super-architect` when needed
- **When**: During design phase (Step 3 in workflow)

**Code Review** (Implementation Quality Level):
- Validates code quality, style, and best practices
- Checks for bugs, edge cases, error handling
- Reviews test coverage and test quality
- Verifies adherence to coding standards
- Assesses documentation and code comments
- **Owner**: `super-code-reviewer`
- **When**: After implementation complete (Step 9-10 in workflow)

**Two-Level Review Process**:
```
Step 3: Solution Review (optional, if complex)
        ↓
super-architect validates architecture/design
        ↓
Step 7: Implementation (super-coder)
        ↓
Step 9-10: Code Review (mandatory)
        ↓
super-code-reviewer validates implementation
        ↓
Step 10: Mark as Done
```

---

#### Updated Workflow Table

| Step | Action | Owner | Type |
| --- | --- | --- | --- |
| 1 | Receive user requirements and specifications | `super-planner` | Planning |
| 2 | Scale assessment and high-level solution choice | `super-planner` | Planning |
| 3 | Solution architecture design (if needed) | `super-planner` → `super-architect` | Optional: Solution Review |
| 4 | UI/frontend design (if needed) | `super-planner` → `super-designer` | Optional: Design Review |
| 5 | Task decomposition, create task files | `super-planner` → `rd2:task-decomposition` | Planning |
| 6 | Delegate tasks to `super-coder` (loop) | `super-planner` → `super-coder` | Orchestration |
| 7 | Implement task (17 sub-steps) | `super-coder` → coder skills | Implementation |
| 8 | Generate tests, ensure tests pass | `super-coder` → `rd2:tdd-workflow` | Testing |
| 9 | Delegate to `super-code-reviewer` | `super-planner` → `super-code-reviewer` | Code Review |
| 10 | Review and mark task as done | `super-code-reviewer` | Verification |

---

#### Recommended Task File Structure

Based on findings, enhanced task file structure:

```markdown
---
name: task-name
description: brief description
status: Backlog | Todo | WIP | Testing | Done
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
---

## XXXX. task-name

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

---

#### Implementation Path (6 Phases)

**Phase 1**: Task Refinement (Immediate)
- Add "Q&A" subsection to task files
- Add "Plan" subsection under Solutions/Goals
- Update super-coder to handle these new sections

**Phase 2**: tdd-workflow Enhancement (Short-term)
- Integrate rd:test-expert capabilities into tdd-workflow
- Add test generation strategies, mock patterns
- Ensure framework-agnostic test guidance

**Phase 3**: super-planner Development (Medium-term)
- Create super-planner coordinator following "fat skills, thin wrappers"
- Integrate rd2:task-decomposition for task breakdown
- Implement orchestration loop to delegate tasks to super-coder

**Phase 4**: super-architect & super-designer (Medium-term)
- Create super-architect (backend, frontend, cloud architecture)
- Create super-designer (UI/UX, frontend design)
- Ensure proper delegation flow from super-planner

**Phase 5**: Two-Level Review Integration (Long-term)
- Implement solution review (Step 3) via super-architect
- Ensure super-code-reviewer handles code review (Step 9-10)
- Define clear handoff criteria between levels

**Phase 6**: Complete Workflow (Long-term)
- End-to-end testing of full 10-step workflow
- Refine role boundaries based on practical usage
- Documentation and examples

---

### References

**Analyzed Source Files** (8 total):
- `plugins/rd2/skills/super-code-reviewer/`
- `plugins/rd2/skills/coder-auggie/`
- `plugins/rd2/skills/coder-claude/`
- `plugins/rd2/skills/coder-gemini/`
- `plugins/rd2/skills/coder-opencode/`
- `plugins/rd2/skills/tdd-workflow/`
- `plugins/rd2/commands/super-coder.md`
- `plugins/rd2/agents/super-coder.md`

**Related rd2 Patterns**:
- "Fat Skills, Thin Wrappers" architecture
- Task file based workflow with WBS# assignment
- Coordinator delegation pattern (super-coder → coder skills)
- TDD-first development via rd2:tdd-workflow
