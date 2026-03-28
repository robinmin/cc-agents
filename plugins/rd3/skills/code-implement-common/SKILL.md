---
name: code-implement-common
description: "Unified code implementation skill with task-file-driven workflow, git worktree isolation, and TDD enforcement. Primary skill for code implementation across all channels."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-25
updated_at: 2026-03-25
platform: rd3
tags: [execution-core, implementation, code-generation, task-driven, git-worktree]
trigger_keywords:
  - implement
  - write code
  - add feature
  - build
  - create component
  - develop
  - coding task
  - work on task
metadata:
  author: cc-agents
  platforms: "claude-code,codex,openclaw,opencode,antigravity,pi"
  category: execution-core
  interactions:
    - pipeline
    - generator
  openclaw:
    emoji: "🛠️"
see_also:
  - rd3:tasks
  - rd3:tdd-workflow
  - rd3:code-review-common
  - rd3:sys-debugging
  - rd3:sys-developing
---

# rd3:code-implement-common — Unified Code Implementation

Task-file-driven code implementation skill with git worktree isolation, TDD enforcement, and cross-channel execution. This is the **primary implementation skill** for all channels.

## Overview

This skill consolidates code implementation methodology into a unified, channel-agnostic workflow. It emphasizes:

- **Task file as primary input** — All implementation work starts from a task file
- **Git worktree isolation** — Safe branch creation without disrupting main working state
- **TDD enforcement** — Red-green-refactor cycle as non-negotiable discipline
- **Progress persistence** — Update task file after each step for resume capability
- **Code review integration** — Seamless handoff to `rd3:code-review-common`

## Quick Start

```bash
# 1. Create worktree
git worktree add ../feat-example main

# 2. Implement with TDD
cd ../feat-example
# RED: Write failing test
# GREEN: Write minimal code
# REFACTOR: Clean while tests pass

# 3. Push and cleanup
git add . && git commit -m "feat: example"
git push -u origin feat-example
```

## Core Principle

**Implementation quality is determined before writing the first line of code.**

## Scope Boundary

**This skill assumes tasks are already well-decomposed.** It focuses purely on implementation execution. Task decomposition (breaking down requirements into implementable tasks) is handled by `rd3:task-decomposition` before this skill is invoked.

| Phase | Purpose | Output |
|-------|---------|--------|
| Task Analysis | Understand requirements from task file | Clarified scope |
| Worktree Setup | Create isolated branch | Isolated workspace |
| TDD Cycle | Red-green-refactor with fix-and-repeat | Passing tests + implementation |
| Progress Update | Update task file after each step | State persistence |
| Push | Push changes to remote | Remote branch |
| Review Handoff | Delegate to code-review-common (optional, default ON) | Review findings |
| Worktree Cleanup | Remove worktree (optional, default OFF) | Parallel ready |

## When to Use

**Trigger phrases:** "implement", "write code", "add feature", "build", "create component", "develop", "coding task", "work on task"

This is the **default implementation skill**. Use it when:

- Starting new implementation work
- Fixing bugs with tests
- Refactoring with test safety
- Creating new files/modules

**Prerequisites:**

- Task is already decomposed (use `rd3:task-decomposition` if not)
- Task file exists with clear requirements and acceptance criteria
- Implementation can proceed without further clarification

**Do NOT use for:**

- Task decomposition (→ `rd3:task-decomposition`) — tasks must be pre-decomposed
- Architecture design (→ `rd3:backend-architect` / `rd3:frontend-architect`)
- Code review (→ `rd3:code-review-common`)
- Debugging known issues (→ `rd3:sys-debugging`)

## Input Contract

### Task File as Primary Input

Every implementation MUST reference a task file. The task file provides:

- **Background**: Why this work exists
- **Requirements**: What must be implemented
- **Design**: Approved approach (if any)
- **Constraints**: Technical boundaries

**Required format in prompt:**

```
task:docs/tasks/0047_my-task.md
```

The task file name MUST appear in the prompt to enable proper delegation.

### Task File is NOT Created — It is Updated

This skill does NOT create new task files. It receives an existing task file as input and **updates it** after each major step to persist progress. If the process is interrupted (network issue, token exhaustion, etc.), the updated task file allows resume from the last completed step.

### Prompt Format

```bash
# Standard implementation prompt
implement task:docs/tasks/0047_my-task.md

# With inline requirements (task file must still be referenced)
implement task:docs/tasks/0047_my-task.md
requirements: Add user authentication with JWT tokens
```

### One-Line Prompt Convention

For streamlined delegation, use the compact format:

```
implement <task_file_path>
```

Example: `implement docs/tasks/0047_user_auth.md`

### Execution Channel

This skill may also receive:

```typescript
interface ImplementationRouting {
  execution_channel?: string; // Default: 'current'
}
```

- `current` means execute in the current channel.
- Any ACP agent name means the caller should route execution through `rd3:run-acp` and preserve the same value in the delegated input.

## Git Worktree Workflow

Git worktree provides **isolated workspaces** for implementation without disrupting the main working directory.

For detailed workflow, commands, and recovery procedures, see [Git Worktree Workflow](references/git-worktree-workflow.md).

### Why Worktree?

| Approach | Main Branch | Isolation | Risk |
|---------|-------------|-----------|------|
| Direct commit | Polluted | None | High |
| Stash + pop | Clean | None | Medium |
| Manual branch | Clean | Full | Low |
| **Worktree** | Clean | Full | **Lowest** |

## TDD Enforcement

**Iron Law: NO production code without a failing test first.**

For detailed TDD patterns, cycle steps, and examples, see [TDD Patterns](references/tdd-patterns.md).

For testing patterns (AAA structure, mocking, test factories, E2E, contract testing), see [Testing Patterns](references/testing-patterns.md).

### TDD Cycle with Fix-and-Repeat

```
RED (Fail) ──→ GREEN (Pass) ──→ REFACTOR (Improve)
   │                │                  │
   ▼                ▼                  ▼
Write test      Write minimal      Clean code
that fails     code to pass      Keep tests green
                    │
                    ▼
               If test fails:
               FIX code, re-test
               until all pass
```

## Progress Reporting

After each major step, **update the input task file** to persist progress.

For detailed update examples and templates, see [Progress Reporting](references/progress-reporting.md).

## Delegation to Other Channels

This skill supports cross-channel execution by delegating to specialist agents.

Use `rd3:run-acp` when implementation should execute on another channel:

```bash
# Current channel
implement task:docs/tasks/0047_my-task.md

# Other channel via ACP
acpx codex "implement task:docs/tasks/0047_my-task.md"
```

## Integration with rd3:tasks

Task files provide the **immutable input contract** for implementation, and are **updated** during implementation to track progress.

For task file template and lifecycle, see [Task Template](references/task-template.md).

## Code Review Integration (Optional, Default ON)

After implementation, delegate review to `rd3:code-review-common`. Use `--no-review` to skip if doing parallel batch review.

For delegation patterns and focus selection, see [Code Review Integration](references/code-review-integration.md).

### Review Focus Selection

| Focus | Coverage |
|-------|----------|
| `security` | SECU-S, OWASP Top 10 |
| `performance` | SECU-E, algorithm complexity |
| `correctness` | SECU-C, logic, edge cases |
| `usability` | SECU-U, maintainability |
| `comprehensive` | All SECU categories |

## Implementation Checklist

For detailed checklist, see [Implementation Checklist](references/implementation-checklist.md).

## Decision Priority

Apply this priority when implementing:

1. **Correctness & invariants** — Code must work; invalid states are impossible
2. **Simplicity (KISS > DRY)** — Manage complexity; simple changes should be simple
3. **Testability / verifiability** — Every change must be verifiable
4. **Maintainability (ETC)** — Design to be easier to change
5. **Performance** — Measure first; optimize last

## Two Hats Rule

Never add features and refactor simultaneously:

- **Feature hat:** Adding new behavior (tests drive implementation)
- **Refactor hat:** Changing structure (tests preserve behavior)

## Error Handling

For detailed error responses and recovery procedures, see [Error Handling](references/error-handling.md).

| Error | Response |
|-------|----------|
| Task file not found | Read from task file path |
| Worktree exists | Remove existing or use --reuse-worktree |
| Tests failing | Continue FIX → TEST cycle until pass |
| Push rejected | Fetch + merge or rebase |
| Review blocked | Fix critical P1 issues first |
| Process interrupted | Task file has progress, resume from last step |

## Platform Notes

### Cross-Platform Usage

All shell commands shown are Unix-compatible. Windows users should use Git Bash, WSL, or adapt paths accordingly.

### Permissions

Implementation assumes:
- Git available on PATH
- Write access to repository
- Network access for push/pull
- No elevated permissions required

## Additional Resources

See [Additional Resources](references/external-resources.md) for detailed content.
