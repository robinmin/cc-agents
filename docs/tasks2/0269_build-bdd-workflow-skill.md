---
name: build-bdd-workflow-skill
description: build-bdd-workflow-skill
status: Done
created_at: 2026-03-27T06:18:51.055Z
updated_at: 2026-03-27T16:51:23.059Z
folder: docs/tasks2
type: task
priority: "high"
estimated_hours: 20
dependencies: []
tags: ["skill","phase-8","sprint-2","novel"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: pending
  testing: pending

---

## 0269. build-bdd-workflow-skill

### Background

Phase 8a of the 9-phase workflow requires a 'bdd-workflow' skill for machine-first functional verification. This skill generates BDD scenarios in Gherkin format from task requirements, then executes them as machine-verifiable checks using verification-chain's deterministic checkers. This is the most technically novel missing skill — the Gherkin-to-checker execution engine has no precedent in the existing skillset.


### Q&A

**Research findings on BDD and Gherkin execution:**

- Cucumber.js, Behave (Python), SpecFlow (.NET) are leading BDD frameworks
- LLM-based test generation (CodiumAI, Qodo) maps requirements to Gherkin scenarios
- Gherkin-to-code translation: Given=setup, When=action, Then=verify pattern
- Deterministic checkers (cli, file-exists, content-match) provide 80%+ coverage
- Living documentation via Pickles, SpecFlow+LivingDoc maintains traceability
- verification-chain skill provides: cli, file-exists, content-match, llm, human checkers


### Design

Created SKILL.md with:
- Persona: Senior QA Architect
- Three modes: generate, execute, full
- LLM-interpreted execution with deterministic checker delegation
- Step-to-checker mapping table (Given->file-exists, When->cli, Then->content-match)
- 80%+ deterministic checker requirement (quality gate)
- references/gherkin-syntax.md (step patterns, best practices)
- references/checker-mapping.md (config patterns per checker)
- references/example-features.md (3 complete examples with execution reports)
- scripts/validate-feature.ts (Gherkin syntax validation)


### Solution

Created:
- `plugins/rd3/skills/bdd-workflow/SKILL.md` - Main skill file
- `plugins/rd3/skills/bdd-workflow/references/gherkin-syntax.md` - Syntax reference
- `plugins/rd3/skills/bdd-workflow/references/checker-mapping.md` - Step-to-checker mapping
- `plugins/rd3/skills/bdd-workflow/references/example-features.md` - 3 complete examples
- `plugins/rd3/skills/bdd-workflow/scripts/validate-feature.ts` - Gherkin validator


### Plan

- [x] Create SKILL.md following Fat Skills pattern
- [x] Create references/gherkin-syntax.md
- [x] Create references/checker-mapping.md
- [x] Create references/example-features.md
- [x] Create scripts/validate-feature.ts
- [x] Verify lint, typecheck, tests pass


### Testing

All tests pass:
```
bun run check: 1909 pass, 0 fail
```


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| created | plugins/rd3/skills/bdd-workflow/SKILL.md | orchestrator | 2026-03-27 |
| created | plugins/rd3/skills/bdd-workflow/references/gherkin-syntax.md | orchestrator | 2026-03-27 |
| created | plugins/rd3/skills/bdd-workflow/references/checker-mapping.md | orchestrator | 2026-03-27 |
| created | plugins/rd3/skills/bdd-workflow/references/example-features.md | orchestrator | 2026-03-27 |
| created | plugins/rd3/skills/bdd-workflow/scripts/validate-feature.ts | orchestrator | 2026-03-27 |


### References


