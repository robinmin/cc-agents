---
name: Create rubric model and executable golden corpus
description: Define the deterministic rubric model, extend the golden corpus, and make the docs contract executable for task-decomposition
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

## 0380. Create rubric model and executable golden corpus

### Background

`0376` replaces heuristic decomposition guidance with a deterministic rubric. That only works if the rubric is expressed as an executable contract with representative corpus cases that protect the score thresholds and override precedence.

### Requirements

- Define the deterministic rubric model in `references/rubric-model.md`
- Add or refine golden corpus cases in `references/golden-corpus.md`
- Ensure the executable docs test validates rubric decisions directly from corpus cases
- Cover the critical boundaries called out in review:
  - raw `score = 5` must decompose
  - `effortHours > 16` must trigger `force-must-effort`
  - localized `force-skip` must still work in the 3-4 score band

### Files to Modify

| File | Change |
| ---- | ------ |
| `plugins/rd3/skills/task-decomposition/references/rubric-model.md` | Define deterministic signals, bands, and overrides |
| `plugins/rd3/skills/task-decomposition/references/golden-corpus.md` | Add representative corpus cases and expected decomposition shapes |
| `plugins/rd3/tests/task-decomposition-docs.test.ts` | Make the docs contract executable and regression-safe |

### Implementation Strategy

1. Encode the rubric as a stable score-and-override model
2. Express real task examples as machine-readable `yaml corpus-case` blocks
3. Validate corpus decisions, override precedence, and forbidden phase-based subtasks in test code
4. Add explicit boundary coverage so future threshold drift breaks the test suite

### Verification

```bash
bun test plugins/rd3/tests/task-decomposition-docs.test.ts
```
