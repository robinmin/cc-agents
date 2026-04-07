---
name: Integration test for PR pipeline gate
description: Integration test verifying pr phase pauses pipeline and blocking human gate is respected with --auto
status: Done
created_at: 2026-04-06T18:00:00.000Z
updated_at: 2026-04-06T18:00:00.000Z
folder: docs/tasks2
type: task
parent_wbs: "0342"
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0349. Integration test for PR pipeline gate

### Background

After implementing the pr phase with blocking human gate (0345, 0347), we need integration tests to verify:
1. Pipeline pauses at pr phase with human gate
2. `--auto` flag does NOT bypass blocking pr gate
3. Pipeline can resume after human approves

### Requirements

- Create integration test in `plugins/rd3/skills/orchestration-v2/tests/integration/`
- Test pipeline behavior with pr phase
- Verify `--auto` does not bypass blocking human gate
- Mock git workflow skill
- `bun test` passes

### Files to Create/Modify

| File | Change |
|------|--------|
| `plugins/rd3/skills/orchestration-v2/tests/integration/pr-gate.test.ts` | New integration test |

### Implementation Strategy

1. Create test fixtures:
   - Minimal task file
   - Pipeline YAML with pr phase and blocking human gate
2. Run pipeline with `--auto` flag
3. Assert:
   - Pipeline pauses at pr phase (status: PAUSED)
   - Run record shows pr phase status: paused
   - No direct commit to main
4. Resume pipeline with approval
5. Assert:
   - Pipeline completes successfully
   - PR was opened

### Test Cases

1. **--auto + blocking gate**: Pipeline pauses at pr, does not continue
2. **blocking gate default**: Human gate pauses regardless of auto flag
3. **Resume approved**: Pipeline completes after human approval
4. **Resume rejected**: Pipeline fails after human rejection

### Verification

```bash
bun test plugins/rd3/skills/orchestration-v2/tests/integration/pr-gate.test.ts
# Expected: all tests pass
```
