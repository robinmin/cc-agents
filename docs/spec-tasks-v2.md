# Tasks v2 Specification

**Version:** 2.1
**Date:** 2026-02-10
**Status:** Implemented
**Design Doc:** [docs/plans/2026-01-26-tasks-refactor-design.md](plans/2026-01-26-tasks-refactor-design.md)

---

## 1. Overview

The Tasks v2 system is a comprehensive workflow orchestration toolset for the rd2 plugin. It provides a unified interface for task planning, decomposition, implementation, and review with support for both human-driven (interactive) and machine-driven (autonomous) execution modes.

### 1.1 Design Principles

| Principle | Description |
|-----------|-------------|
| **Fat Skills, Thin Wrappers** | Commands are thin wrappers that delegate to agents; agents contain the logic |
| **Unified Path** | Human and machine use the same workflow with mode flags |
| **Single Source of Truth** | Task files managed via `tasks` CLI |
| **Clear Boundaries** | Each component has one responsibility |
| **Graceful Degradation** | Specialist unavailable? Continue without blocking workflow |

### 1.2 Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMMAND LAYER (Entry Points)                 │
│  /rd2:tasks-plan  /rd2:tasks-run  /rd2:tasks-review            │
│  /rd2:tasks-refine  /rd2:tasks-design  /rd2:tasks-cli          │
│  /rd2:tasks-brainstorm  /rd2:tasks-unit  /rd2:tasks-fixall     │
│  /rd2:tasks-changelog  /rd2:tasks-gitmsg                       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT LAYER (Coordinators)                   │
│  super-planner  super-coder  super-code-reviewer               │
│  super-architect  super-designer  super-brain                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SKILL LAYER (Implementation)                 │
│  rd2:tasks  rd2:task-workflow  rd2:task-decomposition          │
│  coder-*  code-review-*  tdd-workflow  brainstorm             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Command Specifications

### 2.1 Command Family

| Command | Arguments | Delegates To | Purpose |
|---------|-----------|--------------|---------|
| `/rd2:tasks-plan` | `<task> [--execute] [--auto\|--semi\|--step] [--with-architect] [--with-designer] [--skip-design] [--skip-refinement]` | super-planner | Full workflow orchestration |
| `/rd2:tasks-refine` | `<task> [--force]` | super-planner --refine-only | Requirement refinement |
| `/rd2:tasks-design` | `<task> [--with-architect] [--with-designer] [--skip-assessment]` | super-planner --design-only | Design phase only |
| `/rd2:tasks-run` | `<task> [--tool auto\|gemini\|claude\|auggie\|opencode] [--no-tdd]` | super-coder | Single task implementation |
| `/rd2:tasks-review` | `<task> [--tool auto\|gemini\|claude\|auggie\|opencode] [--focus security\|performance\|testing\|quality\|architecture]` | super-code-reviewer | Single task review |
| `/rd2:tasks-cli` | `<create\|list\|update\|batch-create\|check\|open\|refresh\|config\|decompose\|init\|help> [args]` | rd2:tasks skill | Task file management |
| `/rd2:tasks-brainstorm` | `<issue-description \| task-file-path>` | super-brain | Brainstorm ideas into tasks |
| `/rd2:tasks-unit` | `<verification-command> [<testee>] [threshold=85]` | rd2:unit-tests-generation skill | Generate unit tests |
| `/rd2:tasks-fixall` | `[<validation-command>] [--max-retry=5]` | Self-contained (sys-debugging) | Fix all validation errors |
| `/rd2:tasks-changelog` | `[output-file] [--since <tag\|commit>] [--until <tag\|commit>] [--version <version>]` | Self-contained | Generate changelog from git |
| `/rd2:tasks-gitmsg` | `[--amend] [--breaking]` | Self-contained | Generate conventional commit messages |

### 2.2 Smart Positional Input Pattern

All commands accept a single `<task>` positional argument that auto-detects input type:

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0047` |
| Ends with `.md` | File path | `docs/prompts/0047_oauth.md` |
| Otherwise | Requirements description | `"Add user authentication"` |

**Note:** `tasks-run` and `tasks-review` only accept WBS numbers and file paths (not requirements).

### 2.3 Deprecated Commands (Removed)

| Old Name | New Name | Reason |
|----------|----------|--------|
| `/rd2:code-generate` | `/rd2:tasks-run` | Unified namespace |
| `/rd2:code-review` | `/rd2:tasks-review` | Unified namespace |

### 2.4 Command Details

#### `/rd2:tasks-plan`

**Purpose:** Full workflow orchestration from requirements to implementation.

**Arguments:**

| Argument | Required | Type | Description |
|----------|----------|------|-------------|
| `<task>` | Yes | smart | **Smart positional**: WBS, file path, or requirements description |
| `--execute` | No | flag | Run implementation after planning |
| `--auto` | No | flag | Autonomous mode (no checkpoints) |
| `--semi` | No | flag | Semi-interactive (default for human) |
| `--step` | No | flag | Step-by-step confirmation |
| `--with-architect` | No | flag | Force architecture review |
| `--with-designer` | No | flag | Force UI/UX design review |
| `--skip-design` | No | flag | Skip design phase |
| `--skip-refinement` | No | flag | Skip refinement phase |

**Workflow:**
```python
Task(
  subagent_type="rd2:super-planner",
  prompt="""Orchestrate workflow: {requirements_or_task}
  Mode: {auto|semi|step}
  Execute: {true|false}
  Flags: {with-architect}, {with-designer}, {skip-design}
  """
)
```

#### `/rd2:tasks-run`

**Purpose:** Single task implementation via super-coder.

**Arguments:**

| Argument | Required | Type | Description |
|----------|----------|------|-------------|
| `<task>` | Yes | smart | **Smart positional**: WBS number or file path |
| `--tool` | No | enum | `auto`, `gemini`, `claude`, `auggie`, `opencode` |
| `--no-tdd` | No | flag | Disable TDD mode |

**Workflow:**
```python
Task(
  subagent_type="rd2:super-coder",
  prompt="Implement task: {WBS}"
)
```

#### `/rd2:tasks-review`

**Purpose:** Single task code review.

**Arguments:**

| Argument | Required | Type | Description |
|----------|----------|------|-------------|
| `<task>` | Yes | smart | **Smart positional**: WBS number or file path |
| `--tool` | No | enum | `auto`, `gemini`, `claude`, `auggie`, `opencode` |
| `--focus` | No | enum | `security`, `performance`, `testing`, `quality`, `architecture` |

**Workflow:**
```python
Task(
  subagent_type="rd2:super-code-reviewer",
  prompt="Review task: {WBS}"
)
```

#### `/rd2:tasks-refine`

**Purpose:** Task refinement via quality check and user interaction.

**Arguments:**

| Argument | Required | Type | Description |
|----------|----------|------|-------------|
| `<task>` | Yes | smart | **Smart positional**: WBS number or file path |
| `--force` | No | flag | Force refinement even if no red flags |

**Workflow:**
```python
Task(
  subagent_type="rd2:super-planner",
  prompt="Refine task: {task}\nMode: refinement-only"
)
```

#### `/rd2:tasks-design`

**Purpose:** Design phase with specialist delegation.

**Arguments:**

| Argument | Required | Type | Description |
|----------|----------|------|-------------|
| `<task>` | Yes | smart | **Smart positional**: WBS number or file path |
| `--with-architect` | No | flag | Force architecture review |
| `--with-designer` | No | flag | Force UI/UX design review |
| `--skip-assessment` | No | flag | Skip auto-detection |

**Workflow:**
```python
Task(
  subagent_type="rd2:super-planner",
  prompt="Design task: {task}\nMode: design-only"
)
```

---

## 3. Execution Modes

### 3.1 Mode Overview

| Mode | Flag | Checkpoints | Default For |
|------|------|-------------|-------------|
| **Auto** | `--auto` | None (errors only) | Machine/LLM calls |
| **Semi** | `--semi` | After planning + on errors | Human `/tasks-plan` |
| **Step** | `--step` | Every action confirmed | Debugging/learning |

### 3.2 Mode Detection Logic

```python
IF invoked via /tasks-plan (human):
    default_mode = "--semi"

IF invoked via Task(super-planner, ...):
    default_mode = "--auto"

IF explicit flag provided:
    mode = explicit_flag
```

### 3.3 Checkpoint Matrix

| Event | `--auto` | `--semi` | `--step` |
|-------|----------|----------|----------|
| After planning/decomposition | Skip | **Confirm** | **Confirm** |
| Before each task starts | Skip | Skip | **Confirm** |
| After each task completes | Skip | Skip | **Confirm** |
| Review finds issues | Auto-fix (3x) | **Confirm** | **Confirm** |
| Max retries exceeded | Mark blocked, continue | **Confirm** | **Confirm** |
| Error occurs | Log, continue | **Confirm** | **Confirm** |

### 3.4 Checkpoint Implementation

```python
def checkpoint(message: str, mode: str) -> bool:
    """Returns True to proceed, False to abort."""
    if mode == "auto":
        return True  # Never pause

    # --semi and --step pause for user input
    response = AskUserQuestion(
        question=message,
        options=[
            {"label": "Yes", "description": "Continue"},
            {"label": "No", "description": "Abort"},
        ]
    )
    return response == "Yes"
```

---

## 4. Agent Architecture

### 4.1 Agent Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Layer                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  super-planner (orchestrator)                                   │
│       ├─ Scale assessment                                       │
│       ├─ Specialist delegation                                  │
│       ├─ Task decomposition                                     │
│       └─ Execution loop (if --execute)                          │
│                                                                 │
│  super-coder (implementation specialist)                        │
│       ├─ 13-step methodology (Phase 1: Understand 1-3, Phase 2: Design 4-6, Phase 3: Execute 7-13) │
│       ├─ TDD workflow                                           │
│       └─ Delegates to rd2:coder-* skills                        │
│                                                                 │
│  super-code-reviewer (review coordinator)                       │
│       ├─ Auto-select review tool                                │
│       └─ Delegates to rd2:code-review-* skills                  │
│                                                                 │
│  super-architect (solution architecture)                        │
│       └─ Delegates to architecture skills                       │
│                                                                 │
│  super-designer (UI/UX design)                                  │
│       └─ Delegates to design skills                             │
│                                                                 │
│  super-brain (brainstorming specialist)                          │
│       ├─ 5-phase workflow (Input → Research → Output → Tasks)   │
│       └─ Delegates to rd2:brainstorm skill                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Specialist Auto-Detection

| Pattern in Task | Triggers |
|-----------------|----------|
| database, schema, API, endpoint, integration, microservice | `super-architect` |
| UI, component, form, page, layout, accessibility, responsive | `super-designer` |
| bug fix, typo, refactor, rename, small change | Neither (skip design) |

### 4.3 Override Flags

| Flag | Effect |
|------|--------|
| `--with-architect` | Force architecture review regardless of auto-detection |
| `--with-designer` | Force design review regardless of auto-detection |
| `--skip-design` | Skip design phase entirely |

### 4.4 Specialist Availability Fallbacks

| Specialist | Unavailable Fallback |
|------------|---------------------|
| super-architect | Skip, note risk in task file |
| super-designer | Skip, use basic design |
| super-coder | Report unavailable, cannot proceed |
| super-code-reviewer | Skip review, note risk |

---

## 5. Task File Structure

### 5.1 File Location

**Multi-Folder Support** (v2.1+):

Task files can be organized across multiple folders, configured in `docs/.tasks/config.jsonc`:

```jsonc
{
  "$schema_version": 1,
  "active_folder": "docs/tasks",
  "folders": {
    "docs/prompts": { "base_counter": 0, "label": "Phase 1" },
    "docs/tasks": { "base_counter": 184, "label": "Phase 2" }
  }
}
```

**Default Location**:

```
docs/prompts/{WBS}_{name}.md
```

**Centralized Metadata**:

```
docs/.tasks/
├── config.jsonc          # Multi-folder configuration
├── kanban.md              # Kanban board (aggregates all folders)
├── template.md            # Task file template (config mode)
├── sync/                   # Cross-platform symlinks
├── brainstorm/             # Brainstorming workspace
└── decompose/              # Task decomposition cache
```

Example: `docs/prompts/0047_add_oauth2_authentication.md`

### 5.2 Frontmatter Schema

```yaml
---
name: Feature Name                    # Required: Human-readable name
description: Brief description        # Required: One-line summary
status: Backlog | Todo | WIP | Testing | Done | Blocked  # Required
created_at: YYYY-MM-DD HH:MM:SS       # Auto-generated
updated_at: YYYY-MM-DD HH:MM:SS       # Auto-updated

impl_progress:                        # 5-phase progress tracking
  planning: pending | in_progress | completed | skipped
  design: pending | in_progress | completed | skipped
  implementation: pending | in_progress | completed | skipped
  review: pending | in_progress | completed | skipped
  testing: pending | in_progress | completed | skipped

blocked_reason: "Optional reason"     # Only when status: Blocked
blocked_at: YYYY-MM-DDTHH:MM:SS       # Only when status: Blocked
---
```

### 5.3 Section Schema

| Section | Purpose | Owner |
|---------|---------|-------|
| `Background` | Context and motivation | User/Planner |
| `Requirements` | Acceptance criteria | User/Planner |
| `Solution` | Technical strategy/approach | super-coder/super-architect |
| `Q&A` | Clarifications from planning | super-planner |
| `Design` | Architecture/UI specs | super-architect/super-designer |
| `Plan` | Step-by-step implementation plan | super-planner |
| `Artifacts` | Generated files table | super-coder |
| `References` | Links to docs, related tasks | All |

### 5.4 Task Statuses

| Status | Meaning | Transition From |
|--------|---------|-----------------|
| `Backlog` | Not started, low priority | (initial) |
| `Todo` | Ready to start | Backlog |
| `WIP` | In progress | Todo |
| `Testing` | Implementation done, testing | WIP |
| `Done` | Completed | Testing |
| `Blocked` | Failed after max retries | WIP, Testing |

### 5.5 impl_progress Phases

| Phase | Owner | Description |
|-------|-------|-------------|
| `planning` | super-planner | Requirements gathering, clarification |
| `design` | super-architect/designer | Architecture, UI/UX design |
| `implementation` | super-coder | Code generation, writing |
| `review` | super-code-reviewer | Code review, quality check |
| `testing` | super-coder | Test execution, verification |

### 5.6 Write Guard Hook (v2.1+)

**Purpose**: Prevent direct creation of task files via Write tool, ensuring all task creation goes through the `tasks` CLI for proper WBS numbering and validation.

**Hook Location**: `.claude/hooks/hooks.json` → `PreToolUse`

**Behavior**:
- Blocks Write operations on task file paths (`docs/prompts/{WBS}_*.md`)
- Edit operations on task files are still allowed (for content updates)
- Reads folder list from `docs/.tasks/config.jsonc` dynamically

**Exit Codes**:
- `0` = allow operation
- `1` = warn but allow
- `2` = block operation

**Usage**:
```bash
# Correct: Create via CLI
tasks create "Implement feature"

# Blocked: Direct Write tool
Write("docs/prompts/0047_feature.md", content)  # BLOCKED by hook

# Allowed: Edit tool for content updates
Edit("docs/prompts/0047_feature.md", old_string, new_string)  # OK
```

---

## 6. Workflow Specification

### 6.1 Complete Workflow Diagram

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

### 6.2 Refinement-Only Mode

```
Trigger: /rd2:tasks-refine --task 0047

Flow:
1. Load task file
2. Quality check (red flag detection)
3. IF red flags OR --force:
   - Generate refinement suggestions
   - AskUserQuestion: "Approve all / Review section by section / Skip"
4. Apply approved changes
5. Update impl_progress.planning: completed
6. Report changes
```

### 6.3 Design-Only Mode

```
Trigger: /rd2:tasks-design --task 0047

Flow:
1. Load task file
2. Scale assessment (unless --skip-assessment)
3. Delegate to specialists (based on auto-detect or flags)
4. Update Design section with specialist outputs
5. Update impl_progress.design: completed
6. Report specialist contributions
```

### 6.4 13-Step Implementation Workflow

**Phase 1: Understand (Steps 1-3)**

| Step | Action | Command |
|------|--------|---------|
| 1 | Read & Parse Task | `tasks open {WBS}` |
| 2 | Clarify & Document | `tasks update {WBS} --section Q&A --from-file qa.md` |
| 3 | Research Context | Use `rd2:anti-hallucination` skill for external APIs |

**Phase 2: Design (Steps 4-6)**

| Step | Action | Command |
|------|--------|---------|
| 4 | Design Solution | `tasks update {WBS} --section Design --from-file design.md` |
| 5 | Plan Implementation | `tasks update {WBS} --section Plan --from-file plan.md` |
| 6 | Mark as WIP | `tasks update {WBS} wip` |

**Phase 3: Execute (Steps 7-13)**

| Step | Action | Command |
|------|--------|---------|
| 7 | Select Approach | Auto-detect or manual `--tool` selection |
| 8 | Write Tests First | TDD Red phase |
| 9 | Implement Code | TDD Green phase |
| 10 | Refactor | TDD Refactor phase |
| 11 | Run Full Test Suite | Verify all tests pass |
| 12 | Debug & Fix | Address failures |
| 13 | Verify & Complete | `tasks update {WBS} done` |

**Decision Points:**

1. After Step 2: User clarification needed?
2. After Step 5: Design/plan approved?
3. After Step 6: Ready to code? (Status: WIP)
4. After Step 11: Tests passing? Ready for review?
5. After Step 13: Ready to mark done? (Status: Done)

### 6.5 Red Flag Detection (Tiered Validation)

**Tier 2 (Required for WIP transition)**:
- Empty Background (< 50 chars)
- Empty Requirements (< 50 chars)
- Empty Solution (< 50 chars)

**Tier 3 (Suggestions)**:
- Missing Design section
- Missing Plan section
- Very brief content (< 50 chars for quality)

| Category | Red Flag | Threshold |
|----------|----------|-----------|
| Frontmatter | Empty description | < 10 chars |
| Content | Empty Requirements | < 10 chars |
| Content | Empty Solution | < 10 chars (Tier 2) |
| Quality | Very brief Requirements | < 50 chars |
| Quality | Very brief Background | < 50 chars (Tier 2) |
| Quality | No acceptance criteria | Missing |

---

## 7. Error Handling

### 7.1 Retry Strategy

| Error Type | Max Retries | Recovery Action |
|------------|-------------|-----------------|
| Implementation errors | 3 | Auto-retry with error context |
| Test failures | 3 | Auto-fix based on failure message |
| Review issues | 3 | Auto-fix based on review feedback |

### 7.2 On Max Retries Exceeded

| Mode | Behavior |
|------|----------|
| `--auto` | Mark task Blocked, continue with next task |
| `--semi` | Pause, ask: "Skip and continue, or abort?" |
| `--step` | Pause, ask for decision |

### 7.3 Blocked Task Fields

```yaml
status: Blocked
blocked_reason: "Test failures after 3 retry attempts"
blocked_at: 2026-01-26T10:30:00
impl_progress:
  implementation: blocked  # Phase that failed
```

### 7.4 Error Recovery Flow

```python
def handle_task_error(task, error, mode, retry_count):
    if retry_count < MAX_RETRIES:
        # Auto-retry
        fix_error(task, error)
        return retry_task(task)

    # Max retries exceeded
    if mode == "auto":
        mark_blocked(task, error)
        return continue_workflow()
    else:
        response = AskUserQuestion(
            question=f"Task {task.wbs} failed: {error}",
            options=[
                {"label": "Skip", "description": "Mark blocked and continue"},
                {"label": "Abort", "description": "Stop workflow"},
            ]
        )
        if response == "Skip":
            mark_blocked(task, error)
            return continue_workflow()
        else:
            return abort_workflow()
```

---

## 8. Tool Selection

### 8.1 Code Generation Tool Selection

| Characteristics | Tool | Best For |
|-----------------|------|----------|
| Simple function/class | `claude` | Quick implementations |
| Multi-file feature | `gemini` | Complex architecture |
| Codebase context needed | `auggie` | Pattern-matching |
| External perspective | `opencode` | Multi-model comparison |

### 8.2 Code Review Tool Selection

| Characteristics | Tool | Best For |
|-----------------|------|----------|
| < 500 LOC | `claude` | Quick reviews |
| 500-2000 LOC | `gemini-flash` | Balanced analysis |
| > 2000 LOC | `gemini-pro` | Complex analysis |
| Semantic context | `auggie` | Codebase-aware |

### 8.3 Focus Areas for Review

| Area | What It Checks |
|------|----------------|
| `security` | Injection, auth flaws, data exposure |
| `performance` | Algorithm complexity, N+1 queries |
| `testing` | Coverage gaps, edge cases |
| `quality` | Readability, maintainability, DRY |
| `architecture` | Coupling, cohesion, patterns |

---

## 9. Integration Points

### 9.1 With rd2:tasks CLI

```bash
# Task creation
tasks create "Feature name"                           # Create task file
tasks create "Feature" --background "Context" --requirements "Criteria"
tasks create --from-json task.json                      # Create from JSON

# Batch creation (v2.1)
tasks batch-create --from-json tasks.json               # Create multiple tasks
tasks batch-create --from-agent-output brainstorm.md  # From agent footer

# Task viewing
tasks list [status]                                     # List tasks
tasks check [WBS]                                        # Validate single/all tasks
tasks open 47                                             # Open task file

# Task status updates
tasks update 47 wip                                      # Update status
tasks update 47 wip --force                              # Bypass validation warnings
tasks update 47 done

# Phase tracking (v2.1)
tasks update 47 --phase planning completed              # Update impl_progress phase
tasks update 47 --phase implementation in_progress       # Auto-advances status to WIP
tasks update 47 --phase testing completed                 # Auto-advances to Done

# Content updates (v2.1)
tasks update 47 --section Design --from-file design.md    # Update section from file
tasks update 47 --section Artifacts --append-row "t|p|a|d"  # Append row to Artifacts table

# Task decomposition
tasks decompose "Build authentication system"

# Multi-folder configuration (v2.1)
tasks config                                              # Show configuration
tasks config set-active docs/next-phase                   # Change active folder
tasks init                                                 # Initialize task system

# Kanban sync
tasks refresh                                             # Sync kanban board
```

### 9.2 With TodoWrite

The `rd2:tasks` skill synchronizes with Claude Code's TodoWrite for visual task tracking:

```
Task File (docs/prompts/*)  ←→  TodoWrite  ←→  Kanban Board
```

### 9.3 Task Decomposition Integration

The `rd2:task-decomposition` skill is integrated into 6 agents for automatic breakdown:

| Agent | Trigger Condition | Output |
|-------|-----------------|--------|
| **super-planner** | Planning phase, complex requirements | Structured subtask array |
| **super-architect** | Architecture-driven decomposition | Layer-based task breakdown |
| **super-brain** | After brainstorming session | Ideas converted to tasks |
| **super-coder** | Implementation exceeds 500 LOC or 5+ files | Subtask delegation |
| **super-designer** | Design spans 10+ components | Component-based breakdown |
| **super-code-reviewer** | 5+ issues found | Remediation task tracking |

**Structured Output Protocol:**

```json
[
  {
    "name": "implement-user-authentication-api",
    "background": "Users need OAuth2 authentication...",
    "requirements": "- Support Google OAuth2\n- JWT token validation",
    "solution": "Use passport-oauth2 middleware...",
    "parent_wbs": "0047"
  }
]
```

**Agent Usage Pattern:**

```python
Skill(skill="rd2:task-decomposition", args=f"context: {task_context}")
Write("/tmp/decomposition.json", json_output)
Bash("tasks batch-create --from-json /tmp/decomposition.json")
```

### 9.4 With External Tools

| Tool | Integration Point |
|------|------------------|
| Gemini CLI | coder-gemini, code-review-gemini skills |
| Claude CLI | coder-claude, code-review-claude skills |
| Auggie MCP | coder-auggie, code-review-auggie skills |
| OpenCode CLI | coder-opencode, code-review-opencode skills |

---

## 10. File Locations

### 10.1 Commands

```
plugins/rd2/commands/
├── tasks-plan.md        # Full workflow orchestration
├── tasks-refine.md      # Refinement command
├── tasks-design.md      # Design command
├── tasks-run.md         # Single task implementation
├── tasks-review.md      # Single task review
├── tasks-cli.md         # Task file management
├── tasks-brainstorm.md  # Brainstorming to tasks
├── tasks-unit.md        # Unit test generation
├── tasks-fixall.md      # Fix all validation errors
├── tasks-changelog.md    # Generate changelog from git
└── tasks-gitmsg.md      # Generate conventional commits
```

### 10.2 Agents

```
plugins/rd2/agents/
├── super-planner.md       # Orchestration coordinator
├── super-coder.md         # Implementation specialist (13-step workflow)
├── super-code-reviewer.md # Review coordinator (with decomposition)
├── super-architect.md     # Solution architecture
├── super-designer.md      # UI/UX design (with decomposition)
└── super-brain.md         # Brainstorming and ideation specialist
```

### 10.3 Skills

```
plugins/rd2/skills/
├── tasks/                  # Task file management (CLI)
│   ├── SKILL.md
│   ├── scripts/tasks.py
│   └── assets/.template.md
├── task-workflow/          # 13-step implementation workflow
│   └── SKILL.md
├── task-decomposition/     # Task breakdown into subtasks
│   └── SKILL.md
├── brainstorm/             # 5-phase brainstorming workflow
│   └── SKILL.md
├── coder-gemini/          # Code generation skills
├── coder-claude/
├── coder-auggie/
├── coder-opencode/
├── code-review-gemini/     # Code review skills
├── code-review-claude/
├── code-review-auggie/
├── code-review-opencode/
├── tdd-workflow/           # TDD enforcement
└── unit-tests-generation/  # Unit test generation
```

### 10.4 Task Files

```
docs/
├── .tasks/                 # Centralized metadata (v2.1+)
│   ├── config.jsonc       # Multi-folder configuration
│   ├── kanban.md          # Kanban board (aggregates all folders)
│   ├── template.md        # Task file template
│   ├── sync/              # Cross-platform symlinks
│   ├── brainstorm/        # Brainstorming workspace
│   └── decompose/         # Task decomposition cache
│
└── prompts/               # Default task folder (Phase 1)
    ├── .kanban.md        # Kanban board view (legacy)
    ├── 0001_feature_a.md # Task files
    ├── 0002_feature_b.md
    └── ...
```

---

## 11. API Reference

### 11.1 Agent Invocation

```python
# From command to agent
Task(
    subagent_type="rd2:super-planner",
    prompt="...",
    description="Planning workflow"
)

# From agent to agent
Task(
    subagent_type="rd2:super-architect",
    prompt="...",
    description="Architecture review"
)

# From agent to skill
# Skills are invoked by reference in agent prompts
# e.g., "Use rd2:tdd-workflow for TDD"
```

### 11.2 AskUserQuestion for Checkpoints

```python
AskUserQuestion(
    questions=[{
        "question": "Proceed with implementation?",
        "header": "Confirm",
        "multiSelect": False,
        "options": [
            {"label": "Yes", "description": "Continue with implementation"},
            {"label": "No", "description": "Abort workflow"},
        ]
    }]
)
```

### 11.3 Task Status Updates

```bash
# Via CLI
tasks update 0047 wip
tasks update 0047 done
tasks update 0047 blocked

# Via skill in agent context
rd2:tasks update 0047 wip
```

---

## 12. Changelog

### v2.1 (2026-02-10)

- **Added**: Multi-folder task organization with `docs/.tasks/config.jsonc`
- **Added**: 13-step implementation workflow (simplified from 17-step)
- **Added**: `rd2:task-decomposition` skill integrated into 6 agents
- **Added**: `super-brain` agent with 5-phase brainstorming workflow
- **Added**: Tiered validation (Tier 2: Background/Requirements/Solution; Tier 3: Design/Plan)
- **Added**: `Solution` section to task schema (technical strategy)
- **Added**: New CLI commands: `tasks-brainstorm`, `tasks-unit`, `tasks-fixall`, `tasks-changelog`, `tasks-gitmsg`
- **Added**: Phase tracking with `--phase` flag (auto-advances status)
- **Added**: Content updates with `--section` flag
- **Added**: Write guard hook preventing direct task file creation
- **Fixed**: WBS numbering bug (collision on task deletion)
- **Changed**: Red flag detection uses "Empty Solution" instead of "Empty Design"
- **Changed**: All agents use `tasks open {WBS}` instead of hardcoded paths
- **Changed**: Code review happens post-Phase 3 (after Step 13) instead of Step 9-10

### v2.0 (2026-01-26)

- **Added**: Execution modes (`--auto`, `--semi`, `--step`)
- **Added**: Unified human/machine workflow path
- **Added**: 5-phase impl_progress tracking
- **Added**: Blocked status with blocked_reason
- **Added**: Smart positional input pattern (auto-detect WBS, file path, or requirements)
- **Renamed**: `code-generate` → `tasks-run`
- **Renamed**: `code-review` → `tasks-review`
- **Removed**: `--task` flag (replaced by smart positional)
- **Removed**: Deep nesting in planner workflow
- **Changed**: Commands are thin wrappers, agents contain logic

### v1.0 (Previous)

- Initial tasks workflow implementation
- Separate human and machine paths
- No execution modes
- No blocked status handling
