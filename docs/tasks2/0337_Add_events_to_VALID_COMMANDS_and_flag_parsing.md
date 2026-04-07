---
name: Add events to VALID_COMMANDS and flag parsing
description: Add events to VALID_COMMANDS and flag parsing
status: Done
created_at: 2026-04-06T06:57:32.228Z
updated_at: 2026-04-07T01:02:46.520Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0337. Add events to VALID_COMMANDS and flag parsing

### Background

Add events command registration and --type, --phase, --run flag parsing in CLI commands module. Part of 0335 decomposition.


### Requirements

1. Add 'events' to VALID_COMMANDS array. 2. Add --type flag parsing (comma-separated). 3. Add --phase flag parsing. 4. Update validateCommand() for events command validation.


### Q&A



### Design

CLI command registration following existing patterns for `events` command in orchestration-v2 pipeline. Flag parsing conventions:
- `--type`: comma-separated list for filtering event types
- `--phase`: single value for phase filtering
- `--run`: filter by specific run ID
### Solution

Added `events` command to CLI:

1. **`plugins/rd3/skills/orchestration-v2/scripts/cli/commands.ts`**:
   - Added `'events'` to `VALID_COMMANDS` array (line 26)
   - Added `--type` flag parsing with comma-separated values support (lines 76-79)
   - Added `--phase` flag parsing (lines 62-65)
   - Added `events` command validation requiring `--run` or `taskRef` (lines 172-173)

### Plan

1. ✅ Add 'events' to VALID_COMMANDS array
2. ✅ Add --type flag parsing (comma-separated)
3. ✅ Add --phase flag parsing
4. ✅ Update validateCommand() for events command validation

### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


