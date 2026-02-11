---
name: workflow-orchestration
description: >
  Workflow template engine for multi-agent orchestration. Defines generic role
  model, 7 workflow templates, and intent-to-workflow mapping. Knowledge-only
  skill. Use when orchestrating multi-agent workflows, selecting workflow
  templates, or mapping user intent to agent sequences. Triggers: workflow
  template, orchestrate agents, select workflow, agent sequence, role-based
  execution, coordinate workflow.
---

# Workflow Orchestration

## Overview

Workflow template engine for multi-agent orchestration. Defines predefined workflow templates that map user intent to agent role sequences, ensuring the orchestrator (super-planner) never performs hands-on work.

**Key distinction:**
- **`rd2:workflow-orchestration`** = Workflow DEFINITIONS (templates, roles, intent mapping, execution flow)
- **`rd2:task-workflow`** = Task-level EXECUTION (13-step implementation workflow per individual task)
- **`rd2:task-decomposition`** = Task BREAKDOWN (splitting requirements into subtasks)

**Integration with agents:**
- **`rd2:super-planner`** — Primary consumer. Reads workflow templates, dispatches agents per role.
- **All specialist agents** — Assigned to roles within workflow templates.

## Quick Start

1. **Select workflow** — Match user request keywords to W1-W7 templates (see Intent-to-Workflow Mapping)
2. **Execute phases** — Dispatch agents in role order: Pre-production → Maker → Post-production → Checker
3. **Apply gates** — Validate Solution section populated before Maker; validate review before Done

## Generic Role Model

Every workflow follows a 5-role structure. Some roles are optional.

| Role | Responsibility | Mandatory | Example Agents |
|------|---------------|-----------|----------------|
| **Orchestrator** | Coordinate workflow, manage checkpoints, track status. Never hands-on. | Yes | super-planner |
| **Pre-production** | Research, architecture, design. Prepare context before core work begins. | No | super-architect, super-designer, knowledge-seeker |
| **Maker** | Execute the core work product. The primary hands-on role. | Yes | super-coder, wt:tc-writer, super-brain |
| **Post-production** | Review, test, validate the Maker's output. Quality gate. | No | super-code-reviewer |
| **Checker** | Final verification. Often the Maker agent in a fix/verify mode. | No | super-coder (fix), knowledge-seeker (verify) |

### Role Execution Order

```
Orchestrator [persistent — coordinates all phases]
    |
    v
Pre-production (if assigned)
    |
    v
Maker (mandatory)
    |
    v
Post-production (if assigned)
    |
    v
Checker (if assigned, else skip)
    |
    v
Orchestrator [report results]
```

### Role Constraints

| Role | Allowed Tools | Prohibited Actions |
|------|--------------|-------------------|
| **Orchestrator** | Task, AskUserQuestion, Skill, Bash (tasks CLI only) | Read/Write/Edit/Grep/Glob, code implementation, architecture design, UI design, code review |
| **Pre-production** | All tools appropriate to specialist | Implementation, final decisions without orchestrator approval |
| **Maker** | All tools appropriate to specialist | Skipping tests, ignoring review feedback |
| **Post-production** | All tools appropriate to specialist | Implementation (must delegate fixes back to Maker/Checker) |
| **Checker** | All tools appropriate to specialist | Introducing new features (fix only) |

## Workflow Templates

All 7 templates follow the generic role model. Orchestrator is always super-planner.

| ID | Name | Pre-production | Maker | Post-production | Checker | Use When |
|----|------|---------------|-------|-----------------|---------|----------|
| W1 | coding | super-architect | super-coder | super-code-reviewer | super-coder (fix) | Backend features, APIs, database, integrations |
| W2 | coding-with-design | super-architect + super-designer | super-coder | super-code-reviewer | super-coder (fix) | Frontend-heavy features, UI components |
| W3 | research | knowledge-seeker | super-brain | -- | knowledge-seeker (verify) | Investigation, literature review, analysis |
| W4 | bugfix | -- | super-coder | super-code-reviewer | super-coder (fix) | Bug fixes, crashes, regressions |
| W5 | refactor | super-architect | super-coder | super-code-reviewer | super-coder (fix) | Restructuring, cleanup, modularization |
| W6 | content | knowledge-seeker | wt:tc-writer | -- | knowledge-seeker (verify) | Articles, documentation, tutorials |
| W7 | planning-only | super-brain | -- | -- | -- | Brainstorming, exploration, strategy |

**Notes:**
- `--` means role is skipped (no agent assigned)
- Checker retries up to 3 times before marking task Blocked
- See `references/workflow-templates.md` for detailed execution sequences and examples
- See `references/registry.json` for machine-readable template definitions

## Intent-to-Workflow Mapping

### Keyword Signals

| Signal Keywords | Workflow | ID |
|----------------|----------|----|
| implement, feature, add, build + (API, database, schema, endpoint, backend, service, integration) | coding | W1 |
| implement, feature, add, build + (UI, component, form, page, layout, frontend, responsive, accessibility) | coding-with-design | W2 |
| research, analyze, investigate, literature, survey, study, evaluate, compare | research | W3 |
| fix, bug, error, crash, regression, broken, failing, debug | bugfix | W4 |
| refactor, restructure, clean up, simplify, reorganize, modularize, extract | refactor | W5 |
| article, blog, content, documentation, tutorial, guide, write-up, README | content | W6 |
| plan, brainstorm, explore, what if, ideate, options, approaches, strategy | planning-only | W7 |

### Mapping Algorithm

```
FUNCTION select_workflow(user_request, explicit_workflow=None):
    # 1. Explicit override always wins
    IF explicit_workflow is provided:
        RETURN workflow_templates[explicit_workflow]

    # 2. Extract keywords from request
    keywords = extract_keywords(user_request)

    # 3. Score each workflow by keyword match count
    scores = {}
    FOR each workflow_id, signal_keywords in mapping_table:
        score = count_matching_keywords(keywords, signal_keywords)
        scores[workflow_id] = score

    # 4. Select highest-scoring workflow
    best_match = max(scores, key=scores.get)

    # 5. Handle ambiguity
    IF top_two_scores_are_close(scores):
        # Ask user to disambiguate
        RETURN ask_user_to_choose(top_candidates)

    # 6. Handle no match
    IF best_match.score == 0:
        # Default to W1 (coding) for implementation requests
        # Default to W7 (planning-only) for exploration requests
        RETURN W1 if has_action_verb(keywords) else W7

    RETURN workflow_templates[best_match]
```

### Disambiguation Rules

| Ambiguity | Resolution |
|-----------|------------|
| "implement UI component" — W1 or W2? | W2 (UI keyword triggers design phase) |
| "fix and refactor auth" — W4 or W5? | W4 (fix takes priority; refactoring follows after bug is resolved) |
| "research then implement" — W3 or W1? | W1 with Pre-production research (knowledge-seeker added to Pre-production) |
| "plan the API" — W7 or W1? | W7 (plan keyword, no implementation verb) |
| "write tests for auth" — W1 or W4? | W1 (writing tests is implementation work) |
| No matching keywords | Ask user via AskUserQuestion |

## Execution Flow

### Complete Orchestration Protocol

```
FUNCTION orchestrate_workflow(user_request, mode, flags):
    # Phase 1: INTENT PARSING
    workflow = select_workflow(user_request, flags.workflow)
    IF mode in [semi, step]:
        confirm = AskUserQuestion("Selected workflow: {workflow.name}. Proceed?")
        IF NOT confirm: ABORT or re-select

    # Phase 2: TASK SETUP
    IF flags.task_wbs:
        task = tasks_open(flags.task_wbs)
    ELSE:
        task = tasks_create(user_request)
    tasks_update(task.wbs, phase="planning", status="in_progress")

    # Phase 3: PRE-PRODUCTION (if role assigned)
    IF workflow.pre_production:
        FOR agent in workflow.pre_production:
            result = Task(subagent_type=agent, prompt=context)
            # Write specialist output to task file sections
            save_result_to_task(task, "Design", result)      # Architecture/design output
        tasks_update(task.wbs, phase="design", status="completed")

    # Phase 4: SOLUTION GATE [MANDATORY]
    # The Solution section MUST be populated before any Maker execution.
    # This is the "what will be done" summary derived from Pre-production output.
    # If Pre-production was skipped, the orchestrator writes Solution from the
    # task's Background + Requirements.
    #
    # Implementation:
    #   Write solution summary to temp file, then:
    #   Bash("tasks update {wbs} --section Solution --from-file /tmp/solution.md")
    #
    # The Solution section should contain:
    #   - Approach summary (1-3 paragraphs)
    #   - Key technical decisions
    #   - Files/components to be created or modified
    #   - Acceptance criteria derived from Requirements
    #
    IF task.get_section("Solution") is empty or placeholder:
        solution = summarize_approach(task.background, task.requirements, pre_prod_output)
        Bash("tasks update {task.wbs} --section Solution --from-file /tmp/solution.md")

    # Phase 5: DECOMPOSITION (if needed)
    IF task_is_complex(task):
        Skill(skill="rd2:task-decomposition", args=requirements)
        subtasks = tasks_batch_create(decomposition_output)
        execution_queue = build_dependency_ordered_queue(subtasks)
        # Each subtask also needs Solution populated before Maker runs.
        # Copy parent Solution as baseline, specialists can refine per subtask.
        FOR each subtask in execution_queue:
            Bash("tasks update {subtask.wbs} --section Solution --from-file /tmp/solution.md")
    ELSE:
        execution_queue = [task]

    # Phase 6: MAKER EXECUTION
    IF workflow.maker AND flags.execute:
        FOR each subtask in execution_queue:
            IF mode == step:
                AskUserQuestion("Start task {subtask.wbs}?")

            # VALIDATION GATE: Do NOT use --force. Sections must be populated.
            # tasks update will block if Background/Requirements/Solution are empty.
            tasks_update(subtask.wbs, "wip")

            # Dispatch Maker agent with task context
            maker_result = Task(subagent_type=workflow.maker, prompt=subtask_context)
            tasks_update(subtask.wbs, phase="implementation", status="completed")

            # Write Maker artifacts back to task file
            Bash("tasks update {subtask.wbs} --section Artifacts --append-row ...")

            # Phase 7: POST-PRODUCTION (if role assigned)
            IF workflow.post_production:
                review_result = Task(subagent_type=workflow.post_production, prompt=review_context)

                # Phase 8: CHECKER (if review fails)
                IF review_result.failed AND workflow.checker:
                    retry = 0
                    WHILE retry < 3 AND review_result.failed:
                        Task(subagent_type=workflow.checker, prompt=fix_context)
                        review_result = Task(subagent_type=workflow.post_production, prompt=review_context)
                        retry += 1

                    IF review_result.failed:
                        handle_failure(subtask, mode)  # blocked or ask user

            tasks_update(subtask.wbs, "done")

    # Phase 9: REPORT
    report_results(execution_queue, mode)
```

### Section Update Rules [MANDATORY]

The orchestrator MUST update task file sections at these points:

| When | Section | Content Source | Command |
|------|---------|---------------|---------|
| After Pre-production | Design | Architect/designer output | `tasks update WBS --section Design --from-file design.md` |
| Before Maker (Phase 4 gate) | Solution | Summary of approach from Pre-production or Background+Requirements | `tasks update WBS --section Solution --from-file solution.md` |
| After Maker | Artifacts | Files created/modified | `tasks update WBS --section Artifacts --append-row "type\|path\|agent\|date"` |
| After Post-production | Q&A | Review feedback (if any) | `tasks update WBS --section Q&A --from-file qa.md` |

**Solution section content template:**

```markdown
Approach: {1-3 paragraph summary of what will be done}

Key decisions:
- {decision 1}
- {decision 2}

Files to create/modify:
- {file path 1} — {purpose}
- {file path 2} — {purpose}

Acceptance criteria:
- {criterion derived from Requirements}
```

### Why `--force` Must NOT Be Used

The `--force` flag bypasses Tier 2 validation (empty Background/Requirements/Solution).
Using it defeats the purpose of the quality gate system.

**Instead of `--force`:** Populate the sections first, then transition status normally.

```
# WRONG: bypass validation
tasks update 0186 wip --force    # Solution is empty, but forced through

# CORRECT: populate then transition
tasks update 0186 --section Solution --from-file /tmp/solution.md
tasks update 0186 wip            # Passes validation naturally
```

### Quality Gates

| Gate | Between Roles | Pass Criteria | Fail Action |
|------|--------------|---------------|-------------|
| Design Gate | Pre-production -> Maker | Design section populated, architecture approved | Re-run Pre-production or ask user |
| Implementation Gate | Maker -> Post-production | Tests pass, code compiles, artifacts exist | Re-run Maker or mark blocked |
| Review Gate | Post-production -> Done | Review approved, no blocking issues | Checker fixes (max 3 retries) |

### Failure Handling by Mode

| Mode | Gate Failure | Max Retries Exceeded | Agent Unavailable |
|------|-------------|---------------------|-------------------|
| `--auto` | Retry via Checker | Mark Blocked, continue next task | Skip role, note risk, continue |
| `--semi` | Retry via Checker, then ask user | Ask: "Skip and continue, or abort?" | Ask user for alternative |
| `--step` | Ask user before each retry | Ask for decision | Ask user for alternative |

## Workflow Customization

### Adding Pre-production to Any Workflow

Any workflow can have additional Pre-production agents injected via flags:

```
--with-architect    → Add super-architect to Pre-production
--with-designer     → Add super-designer to Pre-production
--with-researcher   → Add knowledge-seeker to Pre-production
```

### Skipping Phases

```
--skip-design       → Skip Pre-production entirely
--skip-review       → Skip Post-production and Checker
--skip-decomposition → Skip task decomposition, treat as single task
```

### Workflow Override

```
--workflow coding           → Force W1
--workflow coding-with-design → Force W2
--workflow research         → Force W3
--workflow bugfix           → Force W4
--workflow refactor         → Force W5
--workflow content          → Force W6
--workflow planning-only    → Force W7
```

## Workflow Template Registry

Machine-readable template definitions are in `references/registry.json`. The registry contains all 7 workflow templates with role assignments and keyword signals for programmatic workflow selection.

## Absolute Rules

### Always Do

- [ ] Follow the 5-role model (Orchestrator/Pre-production/Maker/Post-production/Checker)
- [ ] Select workflow via intent mapping or explicit --workflow flag
- [ ] Respect role constraints (orchestrator never hands-on)
- [ ] Execute roles in order: Pre-production -> Maker -> Post-production -> Checker
- [ ] Apply quality gates between role transitions
- [ ] Handle failures per execution mode (--auto/--semi/--step)
- [ ] Allow workflow customization via flags (--with-architect, --skip-design, etc.)
- [ ] Track task status via rd2:tasks CLI throughout workflow
- [ ] Report results at workflow completion

### Never Do

- [ ] Allow orchestrator to perform hands-on work (code, design, review, research)
- [ ] Skip mandatory roles (Orchestrator, Maker)
- [ ] Execute roles out of order
- [ ] Ignore quality gate failures
- [ ] Hard-code agent assignments (use template registry)
- [ ] Create new workflow templates without updating the registry
- [ ] Mix workflow orchestration with task-level execution (use rd2:task-workflow for that)

## Related Skills

- **`rd2:task-workflow`** — 13-step implementation workflow for individual tasks (used BY Maker agents)
- **`rd2:task-decomposition`** — Task breakdown patterns (used DURING decomposition phase)
- **`rd2:tasks`** — Task file mechanics (create, update, status management)
- **`rd2:tool-selection`** — Agent/tool selection heuristics (used BY specialists)
- **`rd2:super-planner`** agent — Primary consumer of this skill
