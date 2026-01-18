---
name: refine task-runner
description: <prompt description>
status: Done
created_at: 2026-01-17 16:40:39
updated_at: 2026-01-17 18:04:42
---

## 0010. refine task-runner

### Background

In previous tasks, we already split the orchestrator responsibility from subagent `rd:task-runner` into a new subagent `rd:orchestrator-expert`. That's said, everytime we want to run a task, we need to involve the following subagents together to complete the task:

- `rd:orchestrator-expert`: responsible for orchestrating the task and managing the subagents involved.
- `rd:task-decomposition-expert`: responsible for decomposing the task into smaller subtasks if needed.
- `rd:task-runner`: responsible for task execution.
- `rd:test-expert`: If current task is a coding task, this subagent is responsible for generating relevant tests code and testing the code.
- Any other subagents required for the task if necessary.

### Requirements / Objectives

Based on this new workflow, I need your help to refine the `rd:task-runner` slash command in `@plugins/rd/commands/task-runner.md`. Slash command `rd:task-runner` is just a wrapper for the `rd:orchestrator-expert` subagent to run a task as expected. But we need to keep all current options and arguments for `rd:task-runner` slash command. That will give us more flexibility and control over the task execution process.

If you need, you can refer to their prompts for above subagents:

- `rd:orchestrator-expert`: @plugins/rd/agents/orchestrator-expert.md.
- `rd:task-decomposition-expert`: @plugins/rd/agents/task-decomposition-expert.md
- `rd:task-runner`: @plugins/rd/agents/task-runner.md
- `rd:test-expert`: @plugins/rd/agents/test-expert.md

### Solutions / Goals

## Proposed Solution

The refined `/rd:task-runner` slash command will be a lightweight wrapper that delegates to `rd:orchestrator-expert`. The orchestrator will then coordinate the appropriate subagents based on the task file state and provided arguments.

### Architecture Overview

```
User Request
    ↓
/rd:task-runner <task-file.md> [options]
    ↓
rd:orchestrator-expert (Meta-Coordinator)
    ├─→ Analyze task file state
    ├─→ Determine required subagents
    ├─→ Coordinate workflow
    └─→ Manage progress & resumption

Subagents (coordinated by orchestrator):
├─→ rd:task-decomposition-expert (Planning phases)
├─→ rd:task-runner (Execution phases)
├─→ rd:test-expert (Test generation)
└─→ Domain experts (Python/TS/Go/MCP/etc.)
```

### Command Behavior

The slash command should:
1. Parse all arguments and options
2. Invoke `rd:orchestrator-expert` with the task file and options
3. Let the orchestrator determine which subagents to use based on task state
4. Maintain all current functionality through the orchestrator coordination

### Argument Mapping

All existing arguments should be passed through to the orchestrator:

| Current Argument | Orchestrator Behavior |
|-----------------|----------------------|
| `<task-file.md>` | Target task file for execution |
| `--dry-run` | Preview mode without modifications |
| `--no-interview` | Skip requirements discovery in planning |
| `--scope <level>` | Planning scope (minimal/standard/comprehensive) |
| `--resume` | Resume from last checkpoint |
| `--verify <cmd>` | Verification command for testing |
| `--execute` | Execute implementation phases |

### Implementation Approach

Update the slash command to:
1. Keep the same interface (all arguments preserved)
2. Change the subagent delegation from task-decomposition-expert/task-runner to orchestrator-expert
3. Pass all arguments through to the orchestrator
4. Let the orchestrator manage the subagent coordination

### Key Benefits

1. **Unified coordination**: Single orchestrator manages all subagents
2. **Flexible delegation**: Orchestrator can invoke any combination of subagents
3. **Resume capability**: Orchestrator tracks state across all subagents
4. **Error recovery**: Orchestrator handles failures at workflow level
5. **Progress monitoring**: Tasks CLI integration through orchestrator

### References
