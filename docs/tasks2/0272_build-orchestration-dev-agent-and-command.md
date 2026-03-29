---
name: build-orchestration-dev-agent-and-command
description: build-orchestration-dev-agent-and-command
status: Done
created_at: 2026-03-27T06:18:51.056Z
updated_at: 2026-03-28T20:58:00.000Z
folder: docs/tasks2
type: task
priority: "medium"
estimated_hours: 3
dependencies: ["build-orchestration-dev-skill"]
tags: ["agent","command","sprint-3"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: pending
  testing: pending

---

## 0272. build-orchestration-dev-agent-and-command

### Background

The orchestration-dev skill needs a thin agent wrapper and slash command as primary entry points for users to invoke the 9-phase pipeline. Following the Fat Skills, Thin Wrappers pattern.


### Q&A

Agent patterns follow existing expert-* agents (expert-skill.md). Command follows existing command pattern (skill-add.md). Both are ~50-line wrappers that delegate to the underlying skill.


### Design

Created:
- jon-snow.md - Agent with all 16 phase skills listed
- dev-run.md plus profile-specific dev-*.md wrappers - command surface for orchestration skill entry points


### Solution

Created / updated:
- `plugins/rd3/agents/jon-snow.md` - Thin orchestration agent wrapper (renamed from `orchestrator-dev.md`)
- `plugins/rd3/commands/dev-run.md` - Primary slash command for full orchestration
- `plugins/rd3/commands/dev-plan.md`, `plugins/rd3/commands/dev-review.md`, `plugins/rd3/commands/dev-docs.md`, `plugins/rd3/commands/dev-unit.md`, `plugins/rd3/commands/dev-refine.md` - profile-specific orchestration entry points


### Plan

- [x] Create jon-snow.md agent (renamed from orchestrator-dev.md)
- [x] Create orchestration command surface (`dev-run` + profile-specific `dev-*` commands)
- [x] Verify lint, typecheck, tests pass


### Testing

All tests pass:
```
bun run check: 1909 pass, 0 fail
```


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| renamed | plugins/rd3/agents/jon-snow.md | orchestrator | 2026-03-28 |
| verified | plugins/rd3/commands/dev-run.md | orchestrator | 2026-03-28 |
| verified | plugins/rd3/commands/dev-plan.md | orchestrator | 2026-03-28 |
| verified | plugins/rd3/commands/dev-review.md | orchestrator | 2026-03-28 |
| verified | plugins/rd3/commands/dev-docs.md | orchestrator | 2026-03-28 |
| verified | plugins/rd3/commands/dev-unit.md | orchestrator | 2026-03-28 |
| verified | plugins/rd3/commands/dev-refine.md | orchestrator | 2026-03-28 |


### References

