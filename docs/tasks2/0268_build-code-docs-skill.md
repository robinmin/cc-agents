---
name: build-code-docs-skill
description: build-code-docs-skill
status: Done
created_at: 2026-03-27T06:18:51.055Z
updated_at: 2026-03-27T16:51:22.597Z
folder: docs/tasks2
type: task
priority: "medium"
estimated_hours: 6
dependencies: []
tags: ["skill","phase-9","sprint-1"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: pending
  testing: pending

---

## 0268. build-code-docs-skill

### Background

Phase 9 of the 9-phase workflow requires a 'code-docs' skill that auto-generates documentation artifacts: JSDoc/TSDoc inline comments, API reference stubs, task file References section, and changelog entries. Currently documentation is entirely manual, creating a bottleneck and inconsistency in the pipeline. This is the smallest missing skill and can be built independently as a confidence builder.


### Q&A

**Research findings on documentation generation:**

- TypeDoc is the standard for TypeScript documentation
- Microsoft API Extractor uses ts.createProgram for accurate symbol extraction
- TSDoc is the emerging standard for TypeScript-specific JSDoc extensions
- JSDoc remains widely used with @param, @returns, @throws, @example tags
- AI-powered docs (Mintlify, Swimm) use context-aware generation with quality filters


### Design

Created SKILL.md with:
- Persona: Senior Technical Writer
- Input schema: task_ref, source_paths[], doc_types[], style
- Workflows for jsdoc, api-ref, task-refs, changelog-entry
- Quality checklist for rejecting generic descriptions
- references/doc-templates.md with all template types
- references/quality-checklist.md with rejection criteria
- Note: scripts/extract-symbols.ts reference implementation deferred due to strict TS types


### Solution

Created:
- `plugins/rd3/skills/code-docs/SKILL.md` - Main skill file
- `plugins/rd3/skills/code-docs/references/doc-templates.md` - JSDoc, API ref, changelog templates
- `plugins/rd3/skills/code-docs/references/quality-checklist.md` - Quality criteria and rejection rules


### Plan

- [x] Create SKILL.md following Fat Skills pattern
- [x] Create references/doc-templates.md with all template types
- [x] Create references/quality-checklist.md with quality criteria
- [x] Verify lint, typecheck, tests pass


### Testing

All tests pass:
```
bun run check: 1909 pass, 0 fail
```


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| created | plugins/rd3/skills/code-docs/SKILL.md | orchestrator | 2026-03-27 |
| created | plugins/rd3/skills/code-docs/references/doc-templates.md | orchestrator | 2026-03-27 |
| created | plugins/rd3/skills/code-docs/references/quality-checklist.md | orchestrator | 2026-03-27 |


### References


