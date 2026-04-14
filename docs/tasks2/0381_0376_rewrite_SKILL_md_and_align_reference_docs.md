---
name: Rewrite SKILL.md and align reference docs
description: Rewrite task-decomposition guidance so SKILL.md and extracted references all match the deterministic rubric contract
status: Done
created_at: 2026-04-14T06:20:00.000Z
updated_at: 2026-04-14T06:20:00.000Z
folder: docs/tasks2
type: task
parent_wbs: "0376"
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0381. Rewrite SKILL.md and align reference docs

### Background

Once the rubric contract exists, the skill package has to align to it. The previous docs mixed narrative advice, contradictory bug-fix guidance, and inconsistent minimum task-size rules.

### Requirements

- Rewrite `SKILL.md` to use the deterministic rubric as the source of truth
- Remove contradictions around phase-based subtasks and bug-fix guidance
- Align extracted references on thresholds, override precedence, and the 2-hour minimum subtask floor
- Preserve the anti-over-decomposition rule: implementation steps stay in the parent `Plan`, not child task files

### Files to Modify

| File | Change |
| ---- | ------ |
| `plugins/rd3/skills/task-decomposition/SKILL.md` | Rewrite decomposition guidance around the rubric |
| `plugins/rd3/skills/task-decomposition/references/*.md` | Align supporting policy docs and examples |

### Implementation Strategy

1. Remove conflicting narrative rules
2. Centralize threshold and override language around the rubric
3. Rewrite examples so deliverable-based decomposition is the only valid pattern
4. Cross-check the supporting references against the executable corpus contract

### Verification

```bash
bun test plugins/rd3/tests/task-decomposition-docs.test.ts
```
