# Brainstorm: Enhance Super-Planner (Task 0185)

**Date:** 2026-02-10
**Approach Selected:** Approach 1 — Workflow Template Engine
**Skill Location:** New skill `rd2:workflow-orchestration`

## Problem

`rd2:super-planner` claims to be an orchestrator but executes work itself instead of strictly delegating. Needs predefined workflows mapping user intentions to agent role sequences.

## Selected Approach: Workflow Template Engine

### Generic Role Model

Every workflow follows this structure (some roles optional):

| Role | Responsibility | Example Agent |
|------|---------------|---------------|
| **Orchestrator** (mandatory) | Coordinate workflow, never hands-on | super-planner |
| **Pre-production** (optional) | Research, architecture, design | super-architect, super-designer, knowledge-seeker |
| **Maker** (mandatory) | Execute the core work | super-coder, wt:tc-writer, super-brain |
| **Post-production** (optional) | Review, test, validate | super-code-reviewer |
| **Checker** (optional) | Final verification, can be Maker | super-coder (fix), knowledge-seeker (verify) |

### Workflow Templates

| ID | Workflow | Pre-production | Maker | Post-production | Checker |
|----|----------|---------------|-------|-----------------|---------|
| W1 | coding | super-architect | super-coder | super-code-reviewer | super-coder (fix) |
| W2 | coding-with-design | super-architect + super-designer | super-coder | super-code-reviewer | super-coder |
| W3 | research | knowledge-seeker | super-brain | — | knowledge-seeker (verify) |
| W4 | bugfix | — | super-coder (systematic-debugging) | super-code-reviewer | super-coder |
| W5 | refactor | super-architect | super-coder | super-code-reviewer | super-coder |
| W6 | content | wt:super-researcher | wt:tc-writer | — | knowledge-seeker |
| W7 | planning-only | super-brain | — | — | — |

### Intent → Workflow Mapping

| Keywords / Signals | Workflow |
|-------------------|----------|
| implement, feature, add, build + (API, database, schema, endpoint) | W1: coding |
| implement + (UI, component, form, page, layout) | W2: coding-with-design |
| research, analyze, investigate, literature, survey | W3: research |
| fix, bug, error, crash, regression | W4: bugfix |
| refactor, restructure, clean up, simplify | W5: refactor |
| article, blog, content, documentation, tutorial | W6: content |
| plan, brainstorm, explore, what if | W7: planning-only |

### Execution Flow

```
1. Parse user request
2. Match intent → workflow template
3. Confirm workflow with user (--semi mode)
4. FOR each role in [Pre-prod → Maker → Post-prod → Checker]:
   a. IF role has assigned agent:
      - Task(subagent_type=agent, prompt=context)
      - Quality gate: validate output
      - Update task file via tasks CLI
   b. ELSE: skip role
5. Aggregate results, update status, report
```

### Key Constraint

Super-planner tools MUST be restricted to:
- `Task` (delegate to agents)
- `AskUserQuestion` (user interaction)
- `Skill` (invoke skills)
- `Bash` (tasks CLI only)

REMOVE: `Read`, `Write`, `Edit`, `Grep`, `Glob` — these tempt the orchestrator into doing work itself.

## Sources

- vendors/claude-code-subagents-collection/subagents/episode-orchestrator.md
- vendors/claude-code-subagents-collection/subagents/project-supervisor-orchestrator.md
- vendors/claude-code-subagents-collection/subagents/research-orchestrator.md
- vendors/antigravity-awesome-skills/skills/loki-mode/references/tool-orchestration.md
