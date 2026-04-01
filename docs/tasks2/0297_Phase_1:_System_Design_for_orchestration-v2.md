---
name: Phase 1: System Design for orchestration-v2
description: Phase 1: System Design for orchestration-v2
status: Done
created_at: 2026-03-31T23:37:23.951Z
updated_at: 2026-04-01T21:49:14.735Z
folder: docs/tasks2
type: task
priority: "high"
dependencies: ["0296"]
tags: ["rd3","orchestration","v2","design"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0297. Phase 1: System Design for orchestration-v2

### Background

Create implementation-ready specifications from the blueprint. CLI arg parsing design, module dependency graph with build order, common library extraction plan, SKILL.md + all reference documents (cli-reference.md, pipeline-yaml-guide.md, error-codes.md, agent-cooperation.md, example YAML files), and test strategy per module.


### Requirements

1. Design CLI arg parsing (hand-rolled or library) with --phases and --preset flags (DAG-first phase selection). 2. Produce module dependency graph with exact build order. 3. Write SKILL.md frontmatter + body. 4. Write references/cli-reference.md (11 commands including prune and migrate). 5. Write references/pipeline-yaml-guide.md (presets with defaults, not profiles). 6. Write references/error-codes.md. 7. Write references/agent-cooperation.md. 8. Create references/examples/default.yaml, quick-fix.yaml, security-first.yaml. 9. Define test strategy per module with coverage targets.


### Q&A



### Design

Hand-rolled CLI arg parser in `scripts/cli/commands.ts` with positional + flag parsing. Module dependency graph follows build phases 0-7 from blueprint. SKILL.md with full frontmatter. Reference docs cover CLI commands, YAML guide, error codes, and agent cooperation patterns.

### Solution

All design deliverables implemented:
- `SKILL.md` with frontmatter, quick start, core concepts, CLI reference table
- `references/cli-reference.md` — all 11 commands documented with flags, examples, exit codes
- `references/pipeline-yaml-guide.md` — schema, DAG deps, presets, extends, hooks, validation rules
- `references/error-codes.md` — 18 error codes across 4 categories with recovery strategies
- `references/agent-cooperation.md` — reading state, resuming, customizing, error patterns
- `references/examples/default.yaml` (10 phases, 4 presets), `quick-fix.yaml`, `security-first.yaml`
- Additional examples: `docs.yaml`, `plan.yaml`, `refine.yaml`, `review.yaml`, `unit.yaml`
- CLI arg parsing in `scripts/cli/commands.ts` with `--phases`, `--preset`, and all other flags

### Plan

1. Write SKILL.md with frontmatter and body content
2. Create reference documents (cli-reference, pipeline-yaml-guide, error-codes, agent-cooperation)
3. Create example pipeline YAMLs (default, quick-fix, security-first + extras)
4. Implement CLI arg parser in commands.ts
5. Verify all docs are consistent with blueprint

### Review

All 9 requirements verified. CLI reference covers all 11 commands. YAML guide explains presets (not profiles). Error codes match model.ts definitions. Example YAMLs validate against schema.

### Testing

Verification: SKILL.md, all 4 reference docs, and all example YAMLs exist and are substantive. CLI arg parsing tested via 27 test files covering the orchestration-v2 skill.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


