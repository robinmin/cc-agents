---
name: build-request-intake-skill
description: build-request-intake-skill
status: Done
created_at: 2026-03-27T06:18:51.054Z
updated_at: 2026-03-27T16:51:22.231Z
folder: docs/tasks2
type: task
priority: "high"
estimated_hours: 10
dependencies: ["add-profile-field-to-tasks-schema"]
tags: ["skill","phase-1","sprint-1"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: pending
  testing: pending

---

## 0267. build-request-intake-skill

### Background

Phase 1 of the 9-phase workflow requires a 'request-intake' skill that transforms vague one-liner feature requests into fully-populated task files with Background, Requirements, Constraints, and auto-assigned profile. Currently there is no skill that guides users through structured Q&A to enrich task content. This skill fills the pipeline entry point gap — without it, task files start with incomplete content that degrades downstream phases.


### Q&A

**Research findings on requirements elicitation:**

- IEEE 29148 provides standard for requirements engineering processes
- BABOK Guide defines knowledge areas for requirements elicitation
- User story mapping (Jeff Patton) helps prioritize MVP scope
- Jobs-to-be-Done framework focuses on user motivation over features
- GitHub Copilot Workspace uses guided prompts but limited structured Q&A

**Profile assignment heuristics:**
- simple: Single file/function, 0-1 dependencies, single domain
- standard: 2-5 files/modules, 2-3 dependencies, 2 domains
- complex: 6+ files/systems, 4+ dependencies, 3+ domains
- research: Novel domain, unknown dependencies, cross-disciplinary


### Design

Created SKILL.md with:
- Persona: Senior Business Analyst
- Input schema: task_ref, description, domain_hints
- 7-step workflow: analyze → questions → Q&A → synthesize → assign profile → persist
- Profile heuristics table with 5 signals
- Integration with tasks CLI
- references/question-taxonomy.md with 18 categorized templates


### Solution

Created:
- `plugins/rd3/skills/request-intake/SKILL.md` - Main skill file (8KB)
- `plugins/rd3/skills/request-intake/references/question-taxonomy.md` - 18 question templates


### Plan

- [x] Create SKILL.md following Fat Skills pattern
- [x] Create references/question-taxonomy.md with 18 templates
- [x] Verify lint, typecheck, tests pass


### Testing

All tests pass:
```
bun run check: 1909 pass, 0 fail
```


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| created | plugins/rd3/skills/request-intake/SKILL.md | orchestrator | 2026-03-27 |
| created | plugins/rd3/skills/request-intake/references/question-taxonomy.md | orchestrator | 2026-03-27 |


### References


