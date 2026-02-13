---
description: Workflow-aware orchestration with planning, design, and execution
argument-hint: <task> [--execute] [--auto|--semi|--step] [--workflow <name>] [--list-workflows] [--with-architect] [--with-designer] [--with-researcher] [--skip-design] [--skip-review] [--skip-refinement]
---

# Tasks Plan

Orchestrate complete task workflow by selecting a workflow template from `rd2:workflow-orchestration` and dispatching specialist agents per role. Supports both human-driven (interactive) and machine-driven (autonomous) execution.

**IMPORTANT**: This is an ORCHESTRATOR command. It delegates to `super-planner` which delegates to specialist agents. No implementation happens here.

## Quick Start

```bash
# Auto-detect workflow from intent (default)
/rd2:tasks-plan "Implement OAuth2 authentication"

# Explicit workflow selection
/rd2:tasks-plan "Build API gateway" --workflow coding --execute

# UI feature (auto-selects coding-with-design)
/rd2:tasks-plan "Add user dashboard with charts" --execute

# Bug fix (auto-selects bugfix workflow)
/rd2:tasks-plan "Fix login crash on Safari" --execute

# Research workflow
/rd2:tasks-plan "Evaluate caching strategies" --workflow research

# List available workflows
/rd2:tasks-plan --list-workflows

# Orchestrate existing task by WBS number
/rd2:tasks-plan 0047 --execute

# Orchestrate existing task by file path
/rd2:tasks-plan docs/tasks/0047_oauth.md --execute
```

## Arguments

| Argument            | Required | Description                                                                           |
| ------------------- | -------- | ------------------------------------------------------------------------------------- |
| `<task>`            | Yes      | **Smart positional**: auto-detects type (see below)                                   |
| `--execute`         | No       | Run implementation after planning                                                     |
| `--workflow <name>` | No       | Force specific workflow template (see Workflow Templates below)                       |
| `--list-workflows`  | No       | Show available workflow templates and exit                                            |
| `--auto`            | No       | Autonomous mode: no checkpoints, errors mark blocked and continue                     |
| `--semi`            | No       | Semi-interactive: checkpoint after workflow selection + on errors (default for human) |
| `--step`            | No       | Step-by-step: confirm every agent dispatch                                            |
| `--with-architect`  | No       | Add super-architect to Pre-production role                                            |
| `--with-designer`   | No       | Add super-designer to Pre-production role                                             |
| `--with-researcher` | No       | Add knowledge-seeker to Pre-production role                                           |
| `--skip-design`     | No       | Skip Pre-production phase entirely                                                    |
| `--skip-review`     | No       | Skip Post-production and Checker phases                                               |
| `--skip-refinement` | No       | Skip refinement phase                                                                 |

### Smart Positional Detection

| Input Pattern      | Detection                | Example                     |
| ------------------ | ------------------------ | --------------------------- |
| Digits only        | WBS number               | `0047`                      |
| Ends with `.md`    | File path                | `docs/tasks/0047_oauth.md`  |
| `--list-workflows` | List mode                | Shows templates and exits   |
| Otherwise          | Requirements description | `"Add user authentication"` |

## Workflow Templates

Seven predefined workflows from `rd2:workflow-orchestration`. If no `--workflow` flag is provided, super-planner auto-detects from keywords in the request.

| ID  | Name                 | Pre-production                   | Maker        | Post-production     | Checker          | Auto-detect Keywords                                  |
| --- | -------------------- | -------------------------------- | ------------ | ------------------- | ---------------- | ----------------------------------------------------- |
| W1  | `coding`             | super-architect                  | super-coder  | super-code-reviewer | super-coder      | implement, feature, add, build + API/database/backend |
| W2  | `coding-with-design` | super-architect + super-designer | super-coder  | super-code-reviewer | super-coder      | implement + UI/component/form/page/layout             |
| W3  | `research`           | knowledge-seeker                 | super-brain  | --                  | knowledge-seeker | research, analyze, investigate, evaluate              |
| W4  | `bugfix`             | --                               | super-coder  | super-code-reviewer | super-coder      | fix, bug, error, crash, regression                    |
| W5  | `refactor`           | super-architect                  | super-coder  | super-code-reviewer | super-coder      | refactor, restructure, simplify, modularize           |
| W6  | `content`            | knowledge-seeker                 | wt:tc-writer | --                  | knowledge-seeker | article, blog, documentation, tutorial                |
| W7  | `planning-only`      | super-brain                      | --           | --                  | --               | plan, brainstorm, explore, what if                    |

### Workflow Selection Priority

```
1. --workflow flag (explicit override, always wins)
2. --with-architect/--with-designer flags (augment auto-selected template)
3. Auto-detection from intent keywords
4. Ambiguity -> AskUserQuestion in --semi/--step mode
5. Default -> W1 (coding) if action verb present, W7 (planning-only) otherwise
```

## Execution Modes

| Mode     | Flag     | Checkpoints                          | Default For         |
| -------- | -------- | ------------------------------------ | ------------------- |
| **Auto** | `--auto` | None (errors only)                   | Machine/LLM calls   |
| **Semi** | `--semi` | After workflow selection + on errors | Human `/tasks-plan` |
| **Step** | `--step` | Every agent dispatch confirmed       | Debugging/learning  |

### Mode Detection

```
IF invoked via /tasks-plan (human) -> default --semi
IF invoked via Task(super-planner, ...) -> default --auto
```

## Delegation

This command delegates to the **super-planner** agent with workflow context:

```python
# Handle --list-workflows first (no agent dispatch needed)
IF "--list-workflows" in args:
    Print workflow templates table from rd2:workflow-orchestration
    RETURN

Task(
  subagent_type="rd2:super-planner",
  prompt="""Orchestrate workflow: {requirements_or_task}

Mode: {auto|semi|step}
Execute: {true|false}
Workflow: {workflow_name or "auto-detect"}
Flags: {with-architect}, {with-designer}, {with-researcher}, {skip-design}, {skip-review}, {skip-refinement}

Follow the rd2:workflow-orchestration skill for template selection and role dispatch:

1. INTENT PARSING
   - IF --workflow provided: use that template directly
   - ELSE: auto-detect from intent keywords per rd2:workflow-orchestration mapping
   - IF --semi/--step: checkpoint("Selected workflow: {name}. Proceed?")

2. TASK SETUP
   - Load or create task file via tasks CLI

3. PRE-PRODUCTION (unless --skip-design)
   - Dispatch Pre-production agent(s) per workflow template
   - {with-architect}, {with-designer}, {with-researcher} add to Pre-production

4. DECOMPOSITION
   - Delegate to rd2:task-decomposition skill if complex
   - Batch-create subtasks via tasks CLI

5. EXECUTION (if --execute)
   - Dispatch Maker agent per workflow template
   - Dispatch Post-production agent (unless --skip-review)
   - Checker retries on review failure (max 3)
   - IF --step: checkpoint each agent dispatch

6. REPORT
   - Workflow used, tasks completed/blocked, next steps
""",
  description="Orchestrate workflow: {requirements_or_task}"
)
```

## Error Handling

| Mode     | Max Retries Exceeded        | Behavior                            |
| -------- | --------------------------- | ----------------------------------- |
| `--auto` | Mark task Blocked, continue | Complete other tasks, report at end |
| `--semi` | Pause                       | Ask: "Skip and continue, or abort?" |
| `--step` | Pause                       | Ask for decision                    |

## Examples

### Auto-Detect Workflow (Default)

```bash
# Keywords "add" + "API" auto-select W1 (coding)
/rd2:tasks-plan "Add REST API for user management" --execute

# Output:
# -> Intent: "add" + "API" -> W1 (coding)
# -> Pre-production: super-architect
# -> Maker: super-coder
# -> Post-production: super-code-reviewer
# ? Selected workflow: coding. Proceed? [Y/n]
# -> Dispatching super-architect...
# -> Dispatching super-coder...
# -> Dispatching super-code-reviewer... Review passed.
# -> All tasks complete.
```

### Explicit Workflow Selection

```bash
# Force research workflow regardless of keywords
/rd2:tasks-plan "WebSocket vs SSE for notifications" --workflow research

# Output:
# -> Workflow: W3 (research) [explicit]
# -> Pre-production: knowledge-seeker
# -> Maker: super-brain
# -> Checker: knowledge-seeker
# ? Selected workflow: research. Proceed? [Y/n]
```

### UI Feature (Auto-Detects coding-with-design)

```bash
# Keywords "build" + "dashboard" + "component" auto-select W2
/rd2:tasks-plan "Build analytics dashboard with chart components" --execute

# Output:
# -> Intent: "build" + "dashboard" + "component" -> W2 (coding-with-design)
# -> Pre-production: super-architect + super-designer
# -> Maker: super-coder
# -> Post-production: super-code-reviewer
```

### Bug Fix (No Pre-production)

```bash
# Keywords "fix" + "crash" auto-select W4 (bugfix)
/rd2:tasks-plan "Fix login crash on Safari" --execute --auto

# No checkpoints (--auto), no Pre-production (W4 skips it)
# -> super-coder debugs -> super-code-reviewer reviews -> done
```

### Augment Workflow with Extra Specialists

```bash
# W4 bugfix + add architect for structural review
/rd2:tasks-plan "Fix auth module crash" --execute --with-architect

# W1 coding + add designer for UI considerations
/rd2:tasks-plan "Add settings page" --execute --with-designer
```

### Skip Phases

```bash
# Skip Pre-production, go straight to Maker
/rd2:tasks-plan "Quick typo fix" --execute --skip-design

# Skip Post-production review
/rd2:tasks-plan "Prototype feature" --execute --skip-review
```

### Machine-Driven (Autonomous)

```bash
# From another agent or automated workflow
Task(
  subagent_type="rd2:super-planner",
  prompt="Build OAuth --execute --auto --workflow coding"
)

# No checkpoints, explicit workflow, runs to completion
```

### List Available Workflows

```bash
/rd2:tasks-plan --list-workflows

# Output:
# Available workflow templates (rd2:workflow-orchestration):
#
# W1  coding              super-architect -> super-coder -> super-code-reviewer
# W2  coding-with-design  super-architect + super-designer -> super-coder -> super-code-reviewer
# W3  research            knowledge-seeker -> super-brain -> knowledge-seeker (verify)
# W4  bugfix              super-coder -> super-code-reviewer
# W5  refactor            super-architect -> super-coder -> super-code-reviewer
# W6  content             knowledge-seeker -> wt:tc-writer -> knowledge-seeker (verify)
# W7  planning-only       super-brain
```

## Backward Compatibility

All existing invocations continue to work unchanged:

| Old Invocation                                              | New Behavior                                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/rd2:tasks-plan "Build OAuth" --execute`                   | Auto-detects W1 (coding). Same result as before.                                                     |
| `/rd2:tasks-plan 0047 --execute`                            | Loads task, auto-detects workflow from requirements.                                                 |
| `/rd2:tasks-plan "Add dashboard" --execute --with-designer` | Auto-detects W2 (coding-with-design). `--with-designer` is now redundant but harmless.               |
| `/rd2:tasks-plan "Bug fix" --execute --skip-design`         | Auto-detects W4 (bugfix). `--skip-design` is redundant since W4 has no Pre-production, but harmless. |

## See Also

- **super-planner agent**: `../agents/super-planner.md` -- Orchestration runtime
- **rd2:workflow-orchestration skill**: `../skills/workflow-orchestration/SKILL.md` -- Workflow templates and role model
- **/rd2:tasks-refine**: Requirement refinement
- **/rd2:tasks-design**: Design phase
- **/rd2:tasks-run**: Single task implementation
- **/rd2:tasks-review**: Single task review
