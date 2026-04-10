---
name: ftree Phase 4: Polish + Skill Integration
description: ftree Phase 4: Polish + Skill Integration
status: Backlog
created_at: 2026-04-10T05:28:46.368Z
updated_at: 2026-04-10T05:28:46.368Z
folder: docs/tasks2
type: task
dependencies: ["0372","0373"]
preset: "standard"
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0374. ftree Phase 4: Polish + Skill Integration

### Background

Phase 4 of ftree skill (task 0369). Final polish: update SKILL.md with implemented commands, agent workflow documentation (PM → architect → engineer → orchestrator), per-role usage examples. Verify coverage >= 90% functions and lines. Final bun run check pass. Depends on Phases 2 (0372) and 3 (0373) both completing.


### Requirements

From task 0369 — R9 (Skill Integration). Update SKILL.md to match all implemented commands and output formats. Document agent consumption workflow with concrete examples for PM agent (ftree init --template, ftree add), architect agent (ftree add --parent, ftree context), engineer agent (ftree link, ftree check-done). Remove daemon/server references from existing SKILL.md. Verify overall coverage >= 90% functions, >= 90% lines. Run final bun run check (lint + typecheck + test). Zero console.* calls — all output via logger.*.


### Q&A



### Design



### Solution



### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


