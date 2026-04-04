# Tasks v2 User Manual

A practical guide to using the rd2 tasks workflow system for planning, implementing, and reviewing code.

---

## Quick Start

### Your First Task

```bash
# 1. Create and plan a feature
/rd2:tasks-plan "Add user login with email/password"

# 2. Plan and execute in one go
/rd2:tasks-plan "Add user login with email/password" --execute
```

That's it! The system will:
1. Create a task file
2. Gather and clarify requirements
3. Design the solution (if needed)
4. Implement the code
5. Review the implementation
6. Mark it complete

---

## Table of Contents

1. [Understanding Tasks v2](#1-understanding-tasks-v2)
2. [Commands Reference](#2-commands-reference)
3. [Execution Modes](#3-execution-modes)
4. [Working with Task Files](#4-working-with-task-files)
5. [Common Workflows](#5-common-workflows)
6. [Tips and Best Practices](#6-tips-and-best-practices)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Understanding Tasks v2

### What is Tasks v2?

Tasks v2 is a workflow orchestration system that helps you:
- **Plan** features by breaking them into manageable tasks
- **Design** solutions with architecture and UI/UX review
- **Implement** code following TDD best practices
- **Review** code automatically before marking complete

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Task File** | A markdown file in `docs/prompts/` that tracks requirements, design, and progress |
| **WBS Number** | A unique identifier for each task (e.g., `0047`) |
| **Execution Mode** | How interactive the workflow is (`--auto`, `--semi`, `--step`) |
| **Specialists** | Agents that handle specific aspects (architect for backend, designer for UI) |

### The Workflow

```
Requirements → Planning → Design → Implementation → Review → Done
```

---

## 2. Commands Reference

### Main Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/rd2:tasks-plan` | Full workflow | Starting a new feature |
| `/rd2:tasks-run` | Single task implementation | Implementing one task |
| `/rd2:tasks-review` | Single task review | Reviewing completed code |
| `/rd2:tasks-refine` | Improve task clarity | Task requirements unclear |
| `/rd2:tasks-design` | Get architecture/UI specs | Need design before coding |

### `/rd2:tasks-plan` - Full Workflow

**Basic usage:**
```bash
# Plan only (no implementation)
/rd2:tasks-plan "Build user authentication"

# Plan and implement
/rd2:tasks-plan "Build user authentication" --execute

# Work on existing task by WBS number
/rd2:tasks-plan 0047 --execute

# Work on existing task by file path
/rd2:tasks-plan docs/prompts/0047_oauth.md --execute
```

**Smart Input Detection:**
The first argument auto-detects input type:
- `0047` → WBS number (digits only)
- `docs/prompts/0047_oauth.md` → File path (ends with `.md`)
- `"Build user authentication"` → Requirements description (otherwise)

**Flags:**

| Flag | What it does |
|------|--------------|
| `--execute` | Automatically implement after planning |
| `--auto` | No pauses, runs to completion |
| `--semi` | Pauses after planning (default) |
| `--step` | Pauses at every step |
| `--with-architect` | Force architecture review |
| `--with-designer` | Force UI/UX design review |
| `--skip-design` | Skip design phase |

**Examples:**

```bash
# Simple feature, run without interruption
/rd2:tasks-plan "Add logout button" --execute --auto

# Complex feature, want to review each step
/rd2:tasks-plan "Build payment integration with Stripe" --execute --step

# Backend API, force architecture review
/rd2:tasks-plan "Build REST API for user management" --execute --with-architect

# Frontend feature, force design review
/rd2:tasks-plan "Build admin dashboard" --execute --with-designer
```

### `/rd2:tasks-run` - Single Task Implementation

Implements one specific task without the full planning workflow.

```bash
# By WBS number
/rd2:tasks-run 0047

# By file path
/rd2:tasks-run docs/prompts/0047_oauth.md

# Specify code generation tool
/rd2:tasks-run 0047 --tool gemini

# Skip TDD for simple fixes
/rd2:tasks-run 0047 --no-tdd
```

**Smart Input Detection:** Accepts WBS number (`0047`) or file path (`*.md`).

**Available tools:**
- `auto` - Automatically select best tool (default)
- `gemini` - Google Gemini (good for complex tasks)
- `claude` - Claude native (good for quick tasks)
- `auggie` - Codebase-aware (good for consistent patterns)
- `opencode` - Multi-model (good for comparison)

### `/rd2:tasks-review` - Single Task Review

Reviews the implementation of a specific task.

```bash
# By WBS number
/rd2:tasks-review 0047

# By file path
/rd2:tasks-review docs/prompts/0047_oauth.md

# Focus on security
/rd2:tasks-review 0047 --focus security

# Multiple focus areas
/rd2:tasks-review 0047 --focus security,performance
```

**Smart Input Detection:** Accepts WBS number (`0047`) or file path (`*.md`).

**Focus areas:**
- `security` - Security vulnerabilities
- `performance` - Performance issues
- `testing` - Test coverage gaps
- `quality` - Code quality and readability
- `architecture` - Design patterns

### `/rd2:tasks-refine` - Improve Task Quality

Improves task file clarity and completeness.

```bash
# By WBS number
/rd2:tasks-refine 0047

# By file path
/rd2:tasks-refine docs/prompts/0047_oauth.md

# Force refinement even if no issues
/rd2:tasks-refine 0047 --force
```

**Smart Input Detection:** Accepts WBS number (`0047`) or file path (`*.md`).

### `/rd2:tasks-design` - Get Design Specs

Gets architecture or UI/UX specifications without implementing.

```bash
# By WBS number (auto-detect what design is needed)
/rd2:tasks-design 0047

# By file path
/rd2:tasks-design docs/prompts/0047_oauth.md

# Force architecture review
/rd2:tasks-design 0047 --with-architect

# Force UI design review
/rd2:tasks-design 0047 --with-designer
```

**Smart Input Detection:** Accepts WBS number (`0047`) or file path (`*.md`).

---

## 3. Execution Modes

### Overview

| Mode | Flag | Pauses | Best For |
|------|------|--------|----------|
| **Auto** | `--auto` | Never (except errors) | CI/CD, batch processing |
| **Semi** | `--semi` | After planning, on errors | Normal development |
| **Step** | `--step` | Every action | Learning, debugging |

### Auto Mode (`--auto`)

Runs without any pauses. Errors are logged but don't stop the workflow.

```bash
/rd2:tasks-plan "Add feature" --execute --auto
```

**Behavior:**
- No confirmation prompts
- Failed tasks are marked "Blocked" and skipped
- Workflow continues to next task
- Summary shown at end

**Best for:**
- Automated workflows
- Batch processing multiple tasks
- When you trust the system completely

### Semi Mode (`--semi`) - Default

Pauses at key decision points but not for every action.

```bash
/rd2:tasks-plan "Add feature" --execute --semi
# or simply:
/rd2:tasks-plan "Add feature" --execute
```

**Behavior:**
- Pauses after planning to confirm
- Pauses on errors to ask how to proceed
- Doesn't pause for routine task completion

**Best for:**
- Normal development
- When you want oversight without micromanagement

### Step Mode (`--step`)

Pauses before and after every significant action.

```bash
/rd2:tasks-plan "Add feature" --execute --step
```

**Behavior:**
- Pauses: "Start planning?"
- Pauses: "Planning complete. Proceed to design?"
- Pauses: "Start task 0047?"
- Pauses: "Task 0047 complete. Continue?"
- ...and so on

**Best for:**
- Learning how the system works
- Debugging workflow issues
- Critical features that need close attention

---

## 4. Working with Task Files

### File Location

All task files are stored in:
```
docs/prompts/{WBS}_{name}.md
```

Example: `docs/prompts/0047_add_user_authentication.md`

### File Structure

```yaml
---
name: Add User Authentication
description: Implement email/password login
status: WIP
created_at: 2026-01-26 10:00:00
updated_at: 2026-01-26 12:30:00
impl_progress:
  planning: completed
  design: completed
  implementation: in_progress
  review: pending
  testing: pending
---

## 0047. Add User Authentication

### Background
Why this feature is needed...

### Requirements
- Users can register with email/password
- Users can log in
- Sessions are managed securely

### Q&A
> Q: Should we support OAuth?
> A: Not in this task, separate task for OAuth.

### Design
Architecture specifications from super-architect...

### Plan
1. Create User model
2. Add authentication endpoints
3. Implement session management

### Artifacts
| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Model | src/models/user.py | super-coder | 2026-01-26 |

### References
- [Auth best practices](https://...)
```

### Task Statuses

| Status | Meaning | What to Do |
|--------|---------|------------|
| `Backlog` | Low priority, not started | Move to Todo when ready |
| `Todo` | Ready to work on | Use `/rd2:tasks-run` |
| `WIP` | Currently being worked on | Wait for completion |
| `Testing` | Implementation done, testing | Review test results |
| `Done` | Completed successfully | Nothing |
| `Blocked` | Failed and needs attention | Check blocked_reason |

### Progress Phases

| Phase | Meaning |
|-------|---------|
| `planning` | Requirements gathering |
| `design` | Architecture/UI specifications |
| `implementation` | Writing code |
| `review` | Code review |
| `testing` | Running tests |

Each phase can be: `pending`, `in_progress`, `completed`, `skipped`, or `blocked`

---

## 5. Common Workflows

### Workflow 1: New Feature from Scratch

```bash
# Step 1: Start planning
/rd2:tasks-plan "Build user profile page with avatar upload"

# System will:
# - Create task file
# - Ask clarifying questions
# - Create design specs (if needed)
# - Show you the plan

# Step 2: Review the plan (check docs/prompts/00XX_*.md)
# Make any needed adjustments

# Step 3: Execute
/rd2:tasks-plan --task 00XX --execute
```

### Workflow 2: Quick Feature (One Shot)

```bash
# Plan and execute immediately
/rd2:tasks-plan "Add logout button to navbar" --execute --auto
```

### Workflow 3: Work on Existing Task

```bash
# List available tasks
/rd2:tasks-cli list todo

# Start implementation
/rd2:tasks-run 0047

# Review when done
/rd2:tasks-review 0047
```

### Workflow 4: Handle Blocked Task

```bash
# Check why it's blocked
cat docs/prompts/0047_*.md | grep blocked_reason

# Fix the issue manually or:
/rd2:tasks-refine --task 0047 --force

# Retry implementation
/rd2:tasks-run 0047
```

### Workflow 5: Complex Architecture Review

```bash
# Get architecture review first
/rd2:tasks-design --task 0047 --with-architect

# Review the design in the task file
# Then implement
/rd2:tasks-run 0047
```

---

## 6. Tips and Best Practices

### Choosing the Right Mode

| Situation | Recommended Mode |
|-----------|------------------|
| Simple bug fix | `--auto` |
| New feature | `--semi` (default) |
| Critical security feature | `--step` |
| Learning the system | `--step` |
| Batch processing | `--auto` |

### Writing Good Requirements

**Good:**
```
Add user authentication with:
- Email/password registration
- Login with remember me option
- Password reset via email
- Session timeout after 30 minutes
```

**Not as good:**
```
Add login
```

### When to Force Specialist Review

| Situation | Use |
|-----------|-----|
| New database schema | `--with-architect` |
| API design | `--with-architect` |
| User-facing UI | `--with-designer` |
| Admin dashboard | `--with-designer` |
| Security-critical code | `--with-architect` |

### Handling Failures

1. **Check the blocked_reason** in the task file
2. **Look at impl_progress** to see which phase failed
3. **Use `--step` mode** to debug step by step
4. **Refine the task** if requirements were unclear

---

## 7. Troubleshooting

### Task File Not Found

```
Error: Task 0047 not found
```

**Solution:**
```bash
# List all tasks to find correct number
/rd2:tasks-cli list

# Check the file exists
ls docs/prompts/0047_*.md
```

### Specialist Unavailable

```
Warning: super-architect unavailable, skipping architecture review
```

**Impact:** The workflow continues without architecture review. This is noted in the task file.

**If you need the review:** Wait and try again, or use the specialist's skill directly.

### Max Retries Exceeded

```
Task 0047 marked as Blocked after 3 retry attempts
Reason: Test failures - cannot find module 'xyz'
```

**Solution:**
1. Check the blocked_reason
2. Fix the underlying issue manually
3. Run `/rd2:tasks-run 0047` to retry

### Review Keeps Failing

**In `--semi` or `--step` mode:**
```
Review found issues. Skip and continue, or abort?
```

**Options:**
- **Skip**: Mark as blocked, continue with other tasks
- **Abort**: Stop the entire workflow

**Better approach:** Fix the issues and retry:
```bash
# Fix issues in code
# Then re-review
/rd2:tasks-review 0047
```

### Stuck in Planning Loop

If the planner keeps asking questions:

**Solution:** Provide more specific requirements:
```bash
# Instead of:
/rd2:tasks-plan "Add authentication"

# Be specific:
/rd2:tasks-plan "Add email/password authentication using JWT tokens, with 24h expiry and refresh token support"
```

---

## Quick Reference Card

### Smart Input Pattern

All commands use **smart positional input**:
- `0047` → WBS number (digits only)
- `docs/prompts/0047_oauth.md` → File path (ends with `.md`)
- `"Build feature"` → Requirements description (only for `tasks-plan`)

### Essential Commands

```bash
# Full workflow
/rd2:tasks-plan "description" --execute
/rd2:tasks-plan 0047 --execute            # existing task

# Single task
/rd2:tasks-run 0047

# Review task
/rd2:tasks-review 0047

# List tasks
/rd2:tasks-cli list
/rd2:tasks-cli list wip
/rd2:tasks-cli list todo

# Update task status
/rd2:tasks-cli update 0047 done
```

### Mode Shortcuts

```bash
--auto    # No pauses
--semi    # Key pauses (default)
--step    # All pauses
```

### Specialist Flags

```bash
--with-architect    # Force backend/API review
--with-designer     # Force UI/UX review
--skip-design       # Skip all design
```

### Tool Selection

```bash
--tool auto      # Auto-select (default)
--tool gemini    # Google Gemini
--tool claude    # Claude native
--tool auggie    # Codebase-aware
--tool opencode  # Multi-model
```

---

## Getting Help

- **Documentation**: `docs/spec-tasks-v2.md` (technical specification)
- **Architecture**: `docs/rd2-architecture.md`
- **Workflow Details**: `docs/rd2-workflow.md`
- **Design Decisions**: `docs/plans/2026-01-26-tasks-refactor-design.md`
