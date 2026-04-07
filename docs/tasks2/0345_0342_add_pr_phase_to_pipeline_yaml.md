---
name: Add pr phase to pipeline.yaml with human gate
description: Add pr phase to docs/.workflows/pipeline.yaml with human gate that cannot be bypassed by --auto flag
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

## 0345. Add pr phase to pipeline.yaml with human gate

### Background

The pipeline currently commits directly to `main` with no PR step. The `--auto` flag bypasses all human gates, making review meaningless. This task adds a `pr` phase that:
1. Runs AFTER `docs` phase completes
2. Creates a feature branch and opens a PR
3. Has a hard human gate that pauses the pipeline for manual PR review/merge

### Requirements

- Add `pr` phase to `docs/.workflows/pipeline.yaml`
- Phase runs after `docs` (after: [docs])
- Gate type: `human` with `blocking: true` (cannot be bypassed by --auto)
- Pipeline pauses at `pr` phase until human approves PR merge
- Update preset phase lists to include `pr` after `docs`

### Files to Modify

| File | Change |
|------|--------|
| `docs/.workflows/pipeline.yaml` | Add pr phase definition |

### Implementation Strategy

1. Add `pr` phase definition:
   ```yaml
   pr:
     skill: rd3:git-workflow
     gate:
       type: human
       blocking: true  # Cannot be bypassed by --auto
     after: [docs]
   ```
2. Update `standard` preset: add `pr` to phase list
3. Update `complex` preset: add `pr` to phase list
4. Keep `simple` preset unchanged (no PR for quick fixes)

### Key Design Decision

The `blocking: true` flag on human gate distinguishes it from advisory gates. The `--auto` flag should only bypass advisory human gates (like `review` phase where LLM review suffices). PR review gate MUST be blocking regardless of `--auto`.

### Verification

```bash
# Run pipeline with --auto on a task
# Verify pipeline pauses at pr phase
# Verify human approval required to continue
cat docs/.workflows/pipeline.yaml | grep -A 5 "pr:"
```
