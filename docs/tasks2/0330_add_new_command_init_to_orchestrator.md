---
name: add new command init to orchestrator
description: add new command init to orchestrator
status: Completed
created_at: 2026-04-05T01:30:22.579Z
updated_at: 2026-04-05T02:46:00.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0330. add new command init to orchestrator

### Background

in `plugins/rd3/skills/orchestration-v2` we already implement the `orchestrator` CLI. To help end user intialize current project, we'd better to add one more new command on it to:
- create `docs/.workflows` and `docs/.workflow-runs` if they are not exist.
- Copy default workflow from `plugins/rd3/skills/orchestration-v2/references/examples/default.yaml` to `docs/.workflows`. If other file also needed, we also need to copy them into the folder.


### Requirements

- add new command `init` to intialize project


### Q&A

**Q: What directories are created?**
A: `docs/.workflows` and `docs/.workflow-runs` relative to CWD.

**Q: What file is copied?**
A: The default pipeline from `plugins/rd3/skills/orchestration-v2/references/examples/default.yaml` is copied to `docs/.workflows/pipeline.yaml`.

**Q: Is the command idempotent?**
A: Yes. Running `init` multiple times reports "already exists" for existing directories and files.


### Design

Added `init` command to the orchestrator CLI that:
1. Creates `docs/.workflows` directory if it doesn't exist
2. Creates `docs/.workflow-runs` directory if it doesn't exist
3. Copies default pipeline to `docs/.workflows/pipeline.yaml` if it doesn't exist
4. Reports status for each operation (created vs already exists)


### Solution

**Modified files:**
- `plugins/rd3/skills/orchestration-v2/scripts/run.ts` - Added `init` command handler
- `plugins/rd3/skills/orchestration-v2/scripts/cli/commands.ts` - Added `init` to valid commands list
- `plugins/rd3/skills/orchestration-v2/tests/commands.test.ts` - Updated tests for new command
- `plugins/rd3/skills/orchestration-v2/tests/run-cli-integration.test.ts` - Added integration tests

**Implementation details:**
- `handleInit()` function creates directories with `mkdirSync` and copies files with `copyFileSync`
- Uses `existsSync` to check existence before creation
- Reports creation status via logger
- Exits with success code 0 on completion


### Plan

1. Add `init` to VALID_COMMANDS list
2. Add `handleInit()` function that:
   - Creates `docs/.workflows` directory
   - Creates `docs/.workflow-runs` directory  
   - Copies default pipeline to `docs/.workflows/pipeline.yaml`
3. Add `init` case to main switch statement
4. Update help text
5. Add unit and integration tests


### Review

**Code review checklist:**
- [x] Command properly added to CLI
- [x] Idempotent - safe to run multiple times
- [x] Handles missing directories
- [x] Handles existing directories gracefully
- [x] Copies default pipeline correctly
- [x] Help text updated
- [x] Tests cover happy path and idempotency


### Testing

**Test results:**
```
bun test plugins/rd3/skills/orchestration-v2/tests/commands.test.ts
85 pass, 0 fail

bun test plugins/rd3/skills/orchestration-v2/tests/run-cli-integration.test.ts
28 pass, 0 fail

bun run check  # lint + typecheck + test
3429 pass, 0 fail
```

**Manual verification:**
```bash
$ bun plugins/rd3/skills/orchestration-v2/scripts/run.ts init
Created directory: docs/.workflows
Created directory: docs/.workflow-runs
Copied default pipeline to: docs/.workflows/pipeline.yaml
Initialization complete.

$ bun plugins/rd3/skills/orchestration-v2/scripts/run.ts init  # second run
Directory already exists: docs/.workflows
Directory already exists: docs/.workflow-runs
Pipeline already exists: docs/.workflows/pipeline.yaml
Initialization complete.
```


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Code | `plugins/rd3/skills/orchestration-v2/scripts/run.ts` | Lord Robb | 2026-04-05 |
| Tests | `plugins/rd3/skills/orchestration-v2/tests/commands.test.ts` | Lord Robb | 2026-04-05 |
| Tests | `plugins/rd3/skills/orchestration-v2/tests/run-cli-integration.test.ts` | Lord Robb | 2026-04-05 |

### References

- [orchestration-v2 SKILL.md](../plugins/rd3/skills/orchestration-v2/SKILL.md)
- [default.yaml pipeline](../plugins/rd3/skills/orchestration-v2/references/examples/default.yaml)
