---
wbs: "0384"
name: Refactor dev-verify and dev-review into skill + thin wrappers
status: Done
created_at: "2026-04-15"
updated_at: 2026-04-16T00:04:50.652Z
preset: standard
feature_id: ""
tags: [slash-command, skill, refactor, verification, review, thin-wrapper]
background: "Extract shared verification workflow logic into rd3:code-verification skill; refactor dev-verify and dev-review to be thin wrappers."
requirements: "Create rd3:code-verification skill. Refactor dev-verify.md and dev-review.md as thin wrappers delegating to it. Evaluate both commands."
solution: "Created plugins/rd3/skills/code-verification/SKILL.md (17KB). Rewrote both commands as thin wrappers (~3KB each). dev-review: purely source-based (path only, no task-ref). dev-verify: task-oriented (WBS/.md). Both: 92% Grade A. Skill: 100%."
design: "rd3:code-verification = skill (all workflow logic). dev-verify = wrapper (--mode verify). dev-review = wrapper (--mode source). Fat Skill, Thin Wrapper pattern."
plan: "Phase 1: Create skill. Phase 2: Refactor commands. Phase 3: Evaluate."
source:
---

### Background

Both `dev-verify.md` (432 lines) and `dev-review.md` (422 lines) were fully self-contained standalone commands. The evaluation flagged "Structure & Brevity" as 60% WARN, with the recommendation to "move detailed logic into a skill."

Solution: create a canonical `rd3:code-verification` skill, then make both commands thin wrappers.

### Requirements

1. Create `rd3:code-verification` skill at `plugins/rd3/skills/code-verification/SKILL.md`
2. Extract all shared logic: SECU framework, P-classification, findings management, verdict logic, task file update patterns, gate check
3. Implement both workflows: source-oriented (dev-review) and task-oriented (dev-verify)
4. Rewrite both command files as thin wrappers (~100 lines each)
5. Both commands must pass cc-commands evaluation at 80%+

### Solution

#### Phase 1: Create Skill

Created `plugins/rd3/skills/code-verification/SKILL.md` (17,725 bytes) with:

| Section | Content |
|---------|---------|
| Overview | Two modes: `source` and `verify` |
| Arguments | Unified: `--mode`, `--input`, `--task-ref`, `--fix`, `--mode-verify`, `--bdd`, `--auto`, `--channel` |
| SECU Analysis | 4-dimension checklist with bash `rg` detection patterns |
| P-Classification | P1–P4 table with criteria and auto-fix guidance |
| Findings Management | Table format, Review section builder, Requirements verdict badges |
| Task File Updates | `tasks update` patterns for all scenarios |
| Gate Check | `bun run check` pattern |
| Source Workflow | Steps 1–8 |
| Verify Workflow | Steps 1–9 |
| Channel Delegation | Pattern for remote agents |
| Dogfood Rule | Circular reference prevention |

#### Phase 2: Refactor Commands

**`dev-review.md`** (3,699 bytes → ~85 lines):
```bash
Skill(skill="rd3:code-verification", args="--mode source --input $INPUT --fix $FIX_MODE --auto $AUTO --channel $CHANNEL")
```

**`dev-verify.md`** (3,286 bytes → ~80 lines):
```bash
Skill(skill="rd3:code-verification", args="--mode verify --task-ref $TASK_REF --mode-verify $MODE --bdd $BDD --auto $AUTO --channel $CHANNEL")
```

#### Phase 3: Evaluation Results

| Command | Before | After | Grade |
|---------|--------|-------|-------|
| `dev-review.md` | 89% B | **92% A** | ✅ |
| `dev-verify.md` | 89% B | **92% A** | ✅ |

**Dimension improvement:**

| Dimension | Before | After |
|-----------|--------|-------|
| Structure & Brevity | 60% ⚠️ | **100% PASS** ✅ |

### Design

Fat Skill, Thin Wrapper pattern.

- `rd3:code-verification` = skill (all workflow logic, SECU, findings, verdict)
- `dev-verify` = thin wrapper (--mode verify)
- `dev-review` = thin wrapper (--mode source, path-only input, creates new findings task)

Both commands delegate all work to the skill via `Skill()`. They retain: argument-hint, allowed-tools, When to Use, Examples, See Also, Platform Notes, Dogfood rule.

### Plan

Phase 1: Create skill with all shared logic.

Phase 2: Refactor commands as thin wrappers (~100 lines each).

Phase 2b: Strip task-ref from dev-review — `dev-review` is purely source-based.

Phase 3: Evaluate with cc-commands evaluate script.

Phase 3b: Re-evaluate after design change — dev-review stripped of task-ref. Skill updated.

### Files Changed

| File | Action | Size |
|------|--------|------|
| `plugins/rd3/skills/code-verification/SKILL.md` | Created (updated after dev-review redesign) | 11,885 bytes |
| `plugins/rd3/commands/dev-review.md` | Rewritten as thin wrapper (purely source-based) | 3,273 bytes (−93%) |
| `plugins/rd3/commands/dev-verify.md` | Rewritten as thin wrapper | 3,286 bytes (−93%) |

### Validation

- `bun run check`: lint ✅, typecheck ✅, test ✅ (98.15% line coverage)
- cc-commands evaluate: both **PASS 92% Grade A**

### Architecture

```
dev-verify.md  ──→ rd3:code-verification  ←── dev-review.md
  (task-oriented)     (skill, ~12KB)         (source-only, path)
                            ↓
                  ┌────────┴────────┐
            code-review-common  functional-review
                      ↓
                  bdd-workflow   dev-fixall
```
