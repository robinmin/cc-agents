---
name: build-orchestration-dev-skill
description: build-orchestration-dev-skill
status: Done
created_at: 2026-03-27T06:18:51.055Z
updated_at: 2026-03-27T16:51:24.424Z
folder: docs/tasks2
type: task
priority: "high"
estimated_hours: 25
dependencies: ["build-request-intake-skill","build-bdd-workflow-skill","build-functional-review-skill","build-code-docs-skill","add-profile-field-to-tasks-schema"]
tags: ["skill","orchestrator","sprint-3"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: pending
  testing: pending

---

## 0271. build-orchestration-dev-skill

### Background

The 9-phase workflow needs an orchestrator skill (`orchestration-dev`) that reads the task profile, determines which phases to run, delegates each phase to its specialist skill, and manages gates (human approval + auto-verification). This is the capstone skill that ties the entire pipeline together.


### Q&A

**Research findings on orchestration patterns:**

- CI/CD tools (GitHub Actions, GitLab CI) use stage/job models with gates
- SDLC orchestration (Azure DevOps, Jira) uses phase transitions with approval gates
- AI orchestration (LangGraph, CrewAI, AutoGen) uses graph-based delegation
- Feature flag systems (LaunchDarkly) use profile-driven execution
- The 9-phase model combines CI/CD gating with AI delegation patterns


### Design

Created SKILL.md with:
- Persona: Senior Workflow Architect
- Profile-driven phase matrix (simple/standard/complex/research)
- Sequential delegation with auto/human gates
- Rework loop (max 2 iterations) before escalation
- Dry-run mode for plan preview
- references/phase-matrix.md (full profile x phase table)
- references/gate-definitions.md (auto vs human gate criteria)
- references/delegation-map.md (phase -> skill mapping)
- scripts/plan.ts (execution plan generator)


### Solution

Created:
- `plugins/rd3/skills/orchestration-dev/SKILL.md` - Main skill file
- `plugins/rd3/skills/orchestration-dev/references/phase-matrix.md` - Phase execution matrix
- `plugins/rd3/skills/orchestration-dev/references/gate-definitions.md` - Gate criteria
- `plugins/rd3/skills/orchestration-dev/references/delegation-map.md` - Skill delegation map
- `plugins/rd3/skills/orchestration-dev/scripts/plan.ts` - Execution plan generator


### Plan

- [x] Create SKILL.md following Fat Skills pattern
- [x] Create references/phase-matrix.md
- [x] Create references/gate-definitions.md
- [x] Create references/delegation-map.md
- [x] Create scripts/plan.ts
- [x] Verify lint, typecheck, tests pass


### Testing

All tests pass:
```
bun run check: 1909 pass, 0 fail
```


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| created | plugins/rd3/skills/orchestration-dev/SKILL.md | orchestrator | 2026-03-27 |
| created | plugins/rd3/skills/orchestration-dev/references/phase-matrix.md | orchestrator | 2026-03-27 |
| created | plugins/rd3/skills/orchestration-dev/references/gate-definitions.md | orchestrator | 2026-03-27 |
| created | plugins/rd3/skills/orchestration-dev/references/delegation-map.md | orchestrator | 2026-03-27 |
| created | plugins/rd3/skills/orchestration-dev/scripts/plan.ts | orchestrator | 2026-03-27 |


### References


