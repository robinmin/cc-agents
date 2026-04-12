---
name: enhance workflow default test and refine questions
description: Enhance workflow (1) use bun run check as default test cmd (2) add recommended answers to refine questions
status: Completed
profile: standard
created_at: 2026-04-06T00:30:00.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0333. enhance workflow default test and refine questions

### Background

From dogfooding task 0332, two workflow enhancements identified:

1. **Default Test Command Issue**: When testing the implementation, `tasks server` was used manually. The workflow should use `bun run check` as the default test command.

2. **Refine Questions Issue**: During refine, questions were open-ended without recommended answers. Better UX would provide Yes/No/Other options or recommended solutions.

### Requirements

#### Enhancement 1: Default Test Command
- Update pipeline configuration to use `bun run check` as the default test command
- Location: `docs/.workflows/pipeline.yaml` or relevant skill SKILL.md
- Command should be `bun run check` (lint + typecheck + test)

#### Enhancement 2: Recommended Q&A Answers
- Add recommended answer patterns to `rd3-request-intake` skill
- Questions should include options like:
  - **Yes / No** (binary choices)
  - **Option A / Option B / Other** (multi-choice)
  - **Recommended: X** (suggested approach)
- Location: `rd3-request-intake/SKILL.md` and `references/question-taxonomy.md`

### Constraints

- Must not break existing workflows
- Recommendations should be sensible defaults
- User can always override with custom answers
- Keep backward compatibility with existing question format

### Design

#### Enhancement 1: Default Test Command
- Changed pipeline.yaml `test` phase gate command from `bun test --coverage` to `bun run check`
- This ensures lint + typecheck + test all pass before advancing

#### Enhancement 2: Recommended Q&A Answers
- Added "Recommended Answer Format" section to question-taxonomy.md
- Each question template now includes:
  - Options with 1-4 choices (Yes/No, A/B/C, or Scale)
  - "Custom" option for flexibility
  - "Recommended" field with brief rationale
- Updated SKILL.md to document the enhanced format

### Solution

**Files Changed**:
1. `docs/.workflows/pipeline.yaml`
   - Changed test phase gate command to `bun run check`

2. `~/.agents/skills/rd3-request-intake/references/question-taxonomy.md`
   - Added recommended answer format to all 18 question templates
   - Each question now includes options + recommended answer

3. `~/.agents/skills/rd3-request-intake/SKILL.md`
   - Added "Enhanced Question Format with Recommended Options" section
   - Updated anti-patterns to recommend options over open-ended
   - Added example from Task 0332

### Plan

**Completed**:
- [x] Update pipeline test command to `bun run check`
- [x] Add recommended options to question taxonomy
- [x] Update SKILL.md documentation

### Review

**Enhancement 1 - Default Test Command**:
- ✅ Changed from `bun test --coverage` to `bun run check`
- ✅ `bun run check` runs lint + typecheck + test
- ✅ More comprehensive than just running tests

**Enhancement 2 - Recommended Q&A Answers**:
- ✅ All 18 question templates now include recommended options
- ✅ Options follow consistent format: 1-4 choices + Custom + Recommended
- ✅ SKILL.md documents the new format
- ✅ Example added showing how it works in practice

### Testing

**Verification**:
- [x] `bun run check` passes
- [x] Question taxonomy syntax is valid
- [x] SKILL.md renders correctly

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Pipeline Config | `docs/.workflows/pipeline.yaml` | Lord Robb | 2026-04-06 |
| Question Taxonomy | `~/.agents/skills/rd3-request-intake/references/question-taxonomy.md` | Lord Robb | 2026-04-06 |
| Skill Documentation | `~/.agents/skills/rd3-request-intake/SKILL.md` | Lord Robb | 2026-04-06 |

### References

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References
