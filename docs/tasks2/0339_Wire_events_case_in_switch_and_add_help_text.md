---
name: Wire events case in switch and add help text
description: Wire events case in switch and add help text
status: Done
created_at: 2026-04-06T06:57:41.637Z
updated_at: 2026-04-07T01:15:03.978Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0339. Wire events case in switch and add help text

### Background

Wire the events command into the main CLI entry point: add case statement in switch, import handleEvents, and document in printHelp(). Part of 0335 decomposition.


### Requirements

1. Add 'case events' in main switch statement calling handleEvents(). 2. Add help text for events command in printHelp() function. 3. Document --run, --type, --phase, --json flags.


### Q&A



### Design

Simple wiring task - add case to switch statement, call handleEvents(), update printHelp() text block. No new logic, just CLI integration.

### Solution

Implementation in `plugins/rd3/skills/orchestration-v2/scripts/run.ts`:
- Line 277: `case 'events':` - wired in main switch
- Line 103: `events <task-ref>        Show run events` - help text
- Lines in help block: --run, --type, --phase, --json flags documented

### Plan

1. ✅ Add case 'events' in switch statement
2. ✅ Add help text in printHelp()
3. ✅ Document --run, --type, --phase, --json flags
4. ✅ Verify `bun run check` passes

### Review

Phase 7 Code Review: PASS
- `bun run check` passes (3773 tests, 0 failures)

Phase 8 Requirements Traceability: PASS
| Requirement | Evidence | Status |
|-------------|----------|--------|
| case 'events' in switch | Line 277 | MET |
| Help text in printHelp() | Line 103 | MET |
| --run, --type, --phase, --json docs | Help block | MET |

Note: Kanban Verify button failed because test phase requires implement phase first. Verified manually instead.

### Testing

- Verified case statement is correctly wired to handleEvents()
- Verified help text includes all required flags

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


