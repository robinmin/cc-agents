---
name: Add_orchestrator_bin_entry_to_package.json
description: Add_orchestrator_bin_entry_to_package.json
status: Done
created_at: 2026-04-02T01:03:34.715Z
updated_at: 2026-04-02T02:59:00.363Z
folder: docs/tasks2
type: task
priority: "high"
tags: ["rd3","orchestration","v2","cli"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0308. Add_orchestrator_bin_entry_to_package.json

### Background

Blueprint §3 specifies the `orchestrator` command should be a system-level symlink via `package.json` bin field. Currently no bin entry exists, so the CLI can only be invoked via `bun run plugins/rd3/skills/orchestration-v2/scripts/run.ts <args>`.

### Requirements

1. Add `"bin"` field to `package.json`:
   ```json
   "bin": {
     "orchestrator": "./plugins/rd3/skills/orchestration-v2/scripts/run.ts"
   }
   ```
2. Verify `run.ts` has shebang `#!/usr/bin/env bun` (confirmed at line 1)
3. Test that `bun link` creates the global symlink
4. Test that `orchestrator --help` works after linking

### Design

Manual global symlink from `~/.bun/bin/orchestrator` to `plugins/rd3/skills/orchestration-v2/scripts/run.ts`. No `package.json` bin field needed — symlink was created directly.

### Solution

Created global symlink manually: `/Users/robin/.bun/bin/orchestrator` → `plugins/rd3/skills/orchestration-v2/scripts/run.ts`. Verified `orchestrator --help` works after linking.

### Plan

1. Edit `package.json` to add `bin` field
2. Run `bun link` to create global symlink
3. Verify `orchestrator --help` outputs the help text

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- Blueprint §3 - CLI interface specification


