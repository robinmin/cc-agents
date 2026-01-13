---
name: fine tune subagent task-decomposition-expert
description: Enhance task-decomposition-expert agent, create task-runner agent, and improve TodoWrite synchronization
status: Done
current_phase: 6
impl_progress:
  phase_1: completed
  phase_2: completed
  phase_3: completed
  phase_4: completed
  phase_5: completed
created_at: 2026-01-13 11:58:22
updated_at: 2026-01-13 14:42:31
---

## 0007. fine tune subagent task-decomposition-expert

### Background

To have a better developer experience and ensure a more robust task decomposition process, I developed a new subagent `task-decomposition-expert` that can ensure or fine-tune the task decomposition process. What I want to do is to collaborate with the following things together to deliver things always as expected:

- Customized `tasks` tool
- CLaude Code build-in tools(for example `TodoWrite`, `Task`)
- Customized subagents, such as `rd:agent-browser`, `rd:agent-expert`, `rd:task-decomposition-expert` itself and etc.

#### Customized `tasks` tool

This existing command line tool `tasks` is designed to have a file-based task management capability. It allows users to create, update, and track tasks in a structured manner, which implemented in file @plugins/rd/scripts/tasks.sh and all tasks files located in `docs/prompts`.

Each task file at least contains the following information(each section may be blank before the task completion):

- Original request
- Fine-tuned Solution
- Execution Plan
- Status of each step in the implementation plan

#### Customized subagents

Customized subagents are designed to enhance the development experience, like `task-decomposition-expert` itself, which located in `@plugins/rd/agents/task-decomposition-expert.md`.

We are on the way to customize more and more subagents to adapt with my daily works. So we need a robust and highly efficient **task decomposition engine** to ensure the task decomposition process is accurate and efficient as I expected.

### Requirements / Objectives

Currently `task-decomposition-expert` is just a draft version, need to have a comprehensive review to ensure it meets the following **designing goals**:

- Ensure the task decomposition process is accurate and efficient.
- Provide a clear and concise execution plan for each task.
- Ensure the status of each step in the implementation plan is updated accurately.
- Ensure the task decomposition process is scalable and can handle large numbers of tasks.
- Ensure a more close collaboration with claude code build-in tools for todo list management and task tracking/status synchronization.

So far, I already found the following potential issues need to be enhanced:

- Customized `tasks` tool is not working closely with claude code build-in tools for todo list management and task tracking/status synchronization.
- In `task-decomposition-expert`'s content, we still found that some subagents calls are not properly formatted.
- So far, we are lacking of a dedicated subagent for task execution to adapt with our **task execution engine**. You can use subagent `rd:agent-expert` to create a skeleton for this new subagent `task-runner` in `@plugins/rd/agents/task-runner.md`, then implement it with the following steps with the industry best practices and SOTA techniques:
  1. Define the input parameters for the subagent.
  2. Implement the logic for task execution.
  3. Update the status of each step in the implementation plan.

- No batch ensurence for task decomposition process. For example, if we have a big task, we need to use this subagent to decompose it into several smaller tasks and then use above `task-runner` subagent to execute them in parallel or sequentially.

- Once subagent `task-runner` is matured, then we can leverage it to simplify existing slash command `/rd:task-run`. But this is the next task, not in current iteration scope. Just FYI to ensure we have a clear understanding of the next tasks.

### Solutions / Goals

#### Architecture Overview

The task decomposition enhancement consists of three interconnected components working together:

```
┌─────────────────────────────────────────────────────────────────┐
│                     /rd:task-run (Orchestrator)                  │
│  Entry point that coordinates planning and execution workflows   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│ task-decomposition  │         │    task-runner      │
│      -expert        │────────▶│      (NEW)          │
│  (Planning Phase)   │         │ (Execution Phase)   │
└─────────────────────┘         └─────────────────────┘
          │                               │
          │         ┌─────────────────────┤
          ▼         ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Synchronization Layer                         │
│  Task File (source of truth) ←→ TodoWrite (visibility mirror)   │
│  tasks CLI tool ←→ impl_progress tracking                        │
└─────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. User invokes `/rd:task-run <task-file.md>`
2. `task-decomposition-expert` creates hierarchical plan with phases
3. `task-runner` executes phases sequentially with checkpoints
4. Each phase completion updates both task file AND TodoWrite for visibility

#### Core Components

- **task-decomposition-expert (Enhanced)**: Workflow architect that decomposes complex goals into actionable phases. Enhancements include proper subagent call formatting, TodoWrite mirroring, and batch task handling.

- **task-runner (New Agent)**: Execution specialist that runs implementation phases sequentially with checkpoints. Handles status updates, progress tracking, and TodoWrite synchronization.

- **Synchronization Protocol**: Bidirectional sync between task file frontmatter (`impl_progress`) and Claude Code's `TodoWrite` tool for real-time visibility.

#### Data Model

**Task File Frontmatter (Enhanced):**
```yaml
---
name: Task Name
status: Done
current_phase: 6           # Planning phase (1-6)
impl_progress:             # Execution tracking
  phase_1: completed       # pending | in_progress | completed | blocked
  phase_2: in_progress
  phase_3: pending
created_at: 2026-01-13
updated_at: 2026-01-13 14:42:31
---
```

**TodoWrite Mirror Format:**
```
- [x] Phase 1: Foundation (completed)
- [.] Phase 2: Core Logic (in_progress)
- [ ] Phase 3: Integration (pending)
```

#### API / Interface Design

**task-runner Input Parameters:**
- `task_file`: Path to task file with implementation plan
- `phase`: Specific phase to execute (optional, defaults to next pending)
- `--continue`: Resume from last in_progress phase
- `--dry-run`: Preview execution without changes

**Synchronization Interface:**
- On phase start: Set `impl_progress.phase_N: in_progress`, update TodoWrite
- On phase complete: Set `impl_progress.phase_N: completed`, mark TodoWrite `[x]`
- On blocker: Set `impl_progress.phase_N: blocked`, document reason

#### Key Implementation Details

1. **Subagent Call Formatting**: Use proper Task tool invocation format:
   ```
   Task(subagent_type="rd:agent-name", prompt="...", description="...")
   ```

2. **Sequential Execution with Checkpoints**: Execute one phase at a time, write checkpoint to disk immediately after completion before proceeding.

3. **TodoWrite Mirroring Protocol**:
   - Read `impl_progress` from task file
   - Generate TodoWrite entries with matching statuses
   - Call `TodoWrite` tool to sync visibility
   - Task file remains source of truth

4. **Batch Decomposition**: For large tasks, decompose into phases where each phase can be independently validated.

#### Edge Cases Handled

- **Context limit interruption**: Progress preserved in task file, `--resume` continues from checkpoint
- **Blocked phase**: Mark as `blocked` with reason, skip to next independent phase if possible
- **Tool failure**: Retry with exponential backoff, mark as blocked after 3 failures
- **Missing task file**: Error with guidance to use `tasks create <name>` first

---

#### Implementation Plan

##### Phase 1: Enhance task-decomposition-expert [Complexity: Medium]

**Goal**: Fix subagent call formatting and add TodoWrite mirroring capability

**Status**: pending

- [ ] Review current agent for subagent call format issues
- [ ] Update Section 5.3 (Expert Agent Capabilities) with correct Task tool invocation format
- [ ] Add TodoWrite synchronization protocol to Section 4 (Verification Protocol)
- [ ] Add batch decomposition pattern to Section 5.1 (Decomposition Patterns)
- [ ] Update examples to show proper Task tool usage

**Deliverable**: Enhanced `task-decomposition-expert.md` with proper formatting and sync protocol
**Dependencies**: None

##### Phase 2: Create task-runner Agent Skeleton [Complexity: High]

**Goal**: Generate new task-runner agent following 8-section anatomy

**Status**: pending

- [ ] Use `rd:agent-expert` to generate skeleton for `task-runner`
- [ ] Define persona: Task Execution Specialist with checkpoint discipline
- [ ] Define competency lists: execution patterns, status management, error handling
- [ ] Define verification protocol: checkpoint validation, progress tracking
- [ ] Define absolute rules: sequential execution, immediate disk writes, TodoWrite sync

**Deliverable**: New `task-runner.md` agent file (400-600 lines)
**Dependencies**: Phase 1 (needs consistent formatting patterns)

##### Phase 3: Implement TodoWrite Synchronization [Complexity: Medium]

**Goal**: Establish bidirectional sync between task file and TodoWrite

**Status**: pending

- [ ] Define sync protocol in task-runner agent
- [ ] Add `impl_progress` → TodoWrite mapping logic
- [ ] Document sync timing (on phase start, on phase complete, on blocker)
- [ ] Add sync validation in checkpoint protocol

**Deliverable**: Working synchronization between task file and TodoWrite visibility
**Dependencies**: Phase 2 (task-runner implements the sync)

##### Phase 4: Integrate with /rd:task-run Command [Complexity: Medium]

**Goal**: Update task-run command to orchestrate both agents

**Status**: pending

- [ ] Review current `/rd:task-run` command workflow
- [ ] Add task-runner invocation after planning phases complete
- [ ] Ensure checkpoint handoff between decomposition and execution
- [ ] Update documentation with new workflow

**Deliverable**: Integrated workflow from planning to execution
**Dependencies**: Phase 2, Phase 3

##### Phase 5: Testing and Validation [Complexity: Low]

**Goal**: Validate the complete workflow with a real task

**Status**: pending

- [ ] Create a test task using `tasks create "Test Task"`
- [ ] Run `/rd:task-run` on the test task
- [ ] Verify TodoWrite shows correct progress
- [ ] Verify task file frontmatter updates correctly
- [ ] Test resume capability after simulated interruption
- [ ] Document any issues found and fixes applied

**Deliverable**: Validated end-to-end workflow with documented test results
**Dependencies**: Phase 4

---

#### Dependency Graph

```
Phase 1 (Enhance task-decomposition-expert)
    ↓
Phase 2 (Create task-runner skeleton)
    ↓
Phase 3 (TodoWrite Sync) ←── depends on Phase 2
    ↓
Phase 4 (Integrate with /rd:task-run) ←── depends on Phase 2, 3
    ↓
Phase 5 (Testing and Validation) ←── depends on Phase 4
```

#### Critical Path

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Minimum timeline determined by sequential dependencies. No parallel execution opportunities due to each phase building on previous.

#### Risks and Blockers

| Risk | Impact | Mitigation |
|------|--------|------------|
| Agent skeleton generation fails validation | High | Use agent-doctor to validate before proceeding |
| TodoWrite API changes | Medium | Test with current Claude Code version first |
| Task file format conflicts with existing tasks | Medium | Ensure backward compatibility in frontmatter parsing |

#### Validation Checkpoints

1. **After Phase 1**: Verify task-decomposition-expert passes agent-doctor validation
2. **After Phase 2**: Verify task-runner has all 8 sections, 50+ competency items
3. **After Phase 3**: Verify TodoWrite updates reflect task file state
4. **After Phase 4**: Verify `/rd:task-run` orchestrates both agents correctly
5. **Final**: End-to-end test with real task creation and execution

#### Confidence: HIGH

**Reasoning**:
- Clear requirements from interview phase
- Existing patterns in agent-expert provide solid template
- Well-defined 8-section anatomy ensures consistent structure
- Sequential execution with checkpoints reduces complexity

### References

- [Claude Code Built-in Tools Reference](https://www.vtrivedy.com/posts/claudecode-tools-reference/)
