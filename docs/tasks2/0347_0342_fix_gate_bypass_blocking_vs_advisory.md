---
name: Fix gate bypass - distinguish blocking vs advisory human gates
description: Distinguish blocking human gates (pr phase) from advisory gates (review phase) so --auto only bypasses advisory
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

## 0347. Fix gate bypass - distinguish blocking vs advisory human gates

### Background

The `--auto` flag currently bypasses all human gates, making the PR review meaningless. This task distinguishes between:
- **Advisory human gates** (review phase): LLM review is sufficient, human approval optional
- **Blocking human gates** (pr phase): Human must approve PR merge before pipeline continues

### Requirements

- Modify gate checking logic in `runner.ts`
- Add `blocking` property to `GateConfig` type in `model.ts`
- Human gates with `blocking: true` MUST pause pipeline regardless of `--auto`
- Human gates with `blocking: false` (default) can be bypassed by `--auto`
- Update `checkHumanGate()` to respect the blocking flag
- `bun run check` passes after changes

### Files to Modify

| File | Change |
|------|--------|
| `plugins/rd3/skills/orchestration-v2/scripts/model.ts` | Add `blocking` property to `GateConfig` |
| `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts` | Update `checkHumanGate()` logic |

### Implementation Strategy

1. Update `GateConfig` in model.ts:
   ```typescript
   export interface GateConfig {
       readonly type: 'command' | 'auto' | 'human';
       readonly blocking?: boolean; // Default: true for human gates
       // ... existing fields
   }
   ```

2. Modify `checkHumanGate()` in runner.ts:
   - If `options.auto` is true AND `gate.blocking !== true`, return pass immediately
   - If `options.auto` is true AND `gate.blocking === true`, pause for human approval
   - If `options.auto` is false/undefined, always pause for human approval

3. Pass `options.auto` to gate checking methods

### Key Design Decision

**Default behavior**: Human gates are blocking by default. Explicit `blocking: false` is needed for advisory gates.

**Rationale**: Safer defaults. Missing configuration for review gate can be added separately.

### Verification

```bash
# Run pipeline with --auto
# pr phase (blocking) should pause
# review phase (non-blocking) should not pause
bun run check
```
