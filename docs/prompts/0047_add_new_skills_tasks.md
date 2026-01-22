---
name: add new skills tasks
description: Improve tasks CLI tool, convert shell script to Python, add PreToolUse hook integration
status: Done
created_at: 2026-01-21 14:22:18
updated_at: 2026-01-21 15:20:00
dependencies: []
---

## Orchestration Context
- **Checkpoint**: Task completed successfully
- **POC Created**: TodoWrite PreToolUse hook configuration verified
- **Implementation**: Python tasks.py script (545 lines) completed
- **Tests**: 26 tests pass with 77% coverage
- **Validation**: Linter (ruff + mypy) passes all checks
- **Files**:
  - `.claude/hooks/todowrite-poc.py` - Hook POC script
  - `.claude/hooks/hooks.json` - Hook configuration
  - `plugins/rd2/skills/tasks/scripts/tasks.py` - Main implementation
  - `plugins/rd2/skills/tasks/tests/test_tasks.py` - Test suite

## 0047. add new skills tasks

### Background

Currently, we use `tasks` to manage our todo list and synchronize with Claude Code's todo list manually. Actually, it's just a symbolic link to the installed version of `plugins/rd/scripts/tasks.sh`.

It provides the following command to maintain markdown files under docs/prompts for each project:

```bash
tasks --help
Usage: tasks <subcommand> [arguments]

Subcommands:
  init                     Initialize the tasks management tool
  create <task name>       Create a new task
  list [stage]             List tasks (optionally filter by stage)
  update <WBS> <stage>     Update a task's stage
  open <WBS>               Open a task file in default editor
  refresh                  Refresh the kanban board
  help                     Show this help message
```

It works well, but we can improve it by adding more features and making it more user-friendly and avoid some known issues as shown below:

- With manual synchronization, we may miss some changes or conflicts.
- Duo LLM hallucination or some other unknown issues, sometimes LLM will generate incorrect formatting.
- Not all commands are supported WBS#, sometimes, it's not very convenient.
- Sometimes, LLM will generate other interim documents for a particular task. If we put all of them into @docs, it will become very mess soon. My manual practice is create a subfolder dedicate for the task like `docs/prompts/<WBS>/`. This will help us organize the files better and avoid cluttering the main directory. This is my actual practice. If no further documentation is needed, we do not need to create a subfolder. This is my actual practice but not contain in current script. I want to add it.
- For the format of each task file(docs/prompts/.template.md), we can enhance it to contain more detailed information about the task, such as task category, time cost, and so on so forth -- TBD.
- Make it work more close with Claude Code itself, so that we will have a more reliable tool for daily works.
- To unify the technical stack, we need to convert this tool as python instead of shell script.
- I alredy use `/rd2:skill-add rd2 tasks` to create a new Agent Skills `rd2:tasks` in folder @plugins/rd2/skills/tasks. We will implement the new script in `@plugins/rd2/skills/tasks/scripts/tasks.py`, then we will start to complete the skills. But that will be a new task and out of current scope. In this task, we just focus on the script.

### Requirements / Objectives

#### POC - verify whether we can use `PreToolUse` hook with `TodoWrite` build-in tool

As mentioned by [Add TodoWrite to PreToolUse Hook Matchers](https://github.com/anthropics/claude-code/issues/6975), there is a hidden feature for us to use `PreToolUse` hook with `TodoWrite` build-in tool.

If it's true, then we can leverage this feature to automate the process of creating new tasks and adding them to the task list and updating the task files status.

So we need to do a simple test script into local Claude Code config folder @.claude for quick verification.

#### Design the features with this new script and the layout of the task file

According to current script in @plugins/rd/scripts/tasks.sh and its kanban file layout in @docs/prompts/.kanban.md and its template file in docs/prompts/.template.md to design the new one.

#### Implement the new script and the layout of the task file

#### Add unit tests for the new script and the layout of the task file

#### Use `make lint` and `make test` to ensure the new script and the layout of the task file are working as expected.

### Solutions / Goals

### References

- [Add TodoWrite to PreToolUse Hook Matchers](https://github.com/anthropics/claude-code/issues/6975)
- [Get started with Claude Code hooks](https://code.claude.com/docs/en/hooks-guide)
