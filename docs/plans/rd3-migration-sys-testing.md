# Migration Report: test-cycle, test-coverage, unit-tests-generation → sys-testing

**Date:** 2026-03-23
**Goal:** Create a baseline rd3 testing skill that unifies test execution, coverage-driven gap handling, and pragmatic test extension without absorbing TDD or advanced testing.

---

## 1. Current Inventory

### Source rd2 Skills
| Skill | Type | Purpose |
|-------|------|---------|
| `rd2:test-cycle` | Knowledge-only | Universal test execution, fix iteration cycle (max 3), escalation protocol |
| `rd2:test-coverage` | Knowledge-only | Coverage strategy, gap analysis, threshold selection, CI integration |
| `rd2:unit-tests-generation` | Knowledge-only | AI-assisted 8-phase test generation targeting coverage thresholds |

### Existing rd3 Target
| Skill | Status | Purpose |
|-------|--------|---------|
| `rd3:sys-testing` | **Exists** | Test execution, coverage measurement, gap analysis, pragmatic test extension |

### Existing rd3 Reference Files in sys-testing
- `references/coverage-analysis.md` — Coverage types, gap categorization, thresholds (Python examples)
- `references/test-generation-patterns.md` — Language-specific test patterns (Python, TypeScript, Go)

---

## 2. Overlap Analysis

### Where Source Skills Overlap with Existing sys-testing

| Source Content | Overlaps With | Overlap Type |
|----------------|---------------|--------------|
| test-coverage: Coverage targets table | sys-testing Workflow 3: coverage targets | Near-identical (70-95% range) |
| test-coverage: Gap patterns | sys-testing coverage-analysis.md | Identical |
| test-coverage: Anti-patterns | sys-testing test-generation-patterns.md | Identical |
| unit-tests-generation: Gap analysis phases | sys-testing Workflow 2 | Strong overlap |
| test-cycle: Fix iteration cycle | sys-testing Workflow 2: "3 iterations before escalation" | sys-testing has iteration limit but lacks escalation protocol |

### Key Insight
The **overlap is intentional and desirable** — the goal is to unify these concepts in sys-testing. The gaps in the existing sys-testing are:

1. **No escalation protocol** — test-cycle has a detailed escalation report format when 3 fix iterations fail
2. **No blocker detection** — test-cycle has a comprehensive blocker taxonomy
3. **No pre/post-execution checklists** — test-cycle has detailed checklists
4. **No test command detection priority** — test-cycle has language detection logic
5. **No status update delegation** — test-cycle references `rd2:tasks` (should not migrate rd2 coupling)

### What to Keep Pure (Not Migrate)
- `test-cycle` references to `rd2:tasks`, `rd2:anti-hallucination` — rd2 implementation detail
- `test-cycle` "Used by: super-coder, super-code-reviewer..." — caller coupling violates skill purity rule
- `python-module-registration.md` — Python-specific, already covered by test-generation-patterns.md

---

## 3. Target Taxonomy

**Category:** `engineering-core`

sys-testing is correctly categorized as `engineering-core`. It provides execution-layer testing operations that other skills (`tdd-workflow`, `sys-debugging`) sit alongside.

**Boundary:**
- ✅ In scope: test execution, coverage measurement, gap analysis, iterative gap filling, escalation when iteration plateaus
- ❌ Out of scope: TDD methodology (tdd-workflow), debugging failures (sys-debugging), mutation testing (advanced-testing), property-based testing (advanced-testing)
- ❌ Out of scope: AI-assisted test generation with coverage thresholds — unit-tests-generation's 8-phase workflow is essentially coverage-driven gap filling already present in sys-testing

---

## 4. Tech Stack Simplification

All three source skills are **knowledge-only** — no Python scripts to port.

| Item | Action |
|------|--------|
| Python scripts | None present |
| Python tests | None present |
| Python markdown examples | Keep — test-generation-patterns.md already has Python/TS/Go examples |
| Python-specific reference: `python-module-registration.md` | Skip — too specialized; dashed-filename pattern is a conftest concern, not a skill concern |

---

## 5. Target Skill Decision

**Mode:** Refine existing rd3 skill

`plugins/rd3/skills/sys-testing/` already exists with a solid foundation. The migration will **absorb the best pieces** from the three source skills without creating duplicate content.

**Goal fit:** The goal says "unifies test execution, coverage-driven gap handling, and pragmatic test extension without absorbing TDD or advanced testing" — this maps directly to enhancing the existing sys-testing skill.

---

## 6. Source-to-Target Mapping

| Source Skill | Current Purpose | Overlap | Target rd3 Skill | Goal Fit | Action | Priority | Notes |
|--------------|----------------|---------|------------------|----------|--------|----------|-------|
| `test-cycle` | Test execution, 3-iteration fix, escalation | Iteration limit exists in sys-testing but escalation protocol missing | sys-testing | Full | **merge** | High | Add escalation protocol, blocker detection, checklists |
| `test-coverage` | Coverage strategy, gap analysis | Fully overlaps with sys-testing coverage-analysis.md | sys-testing | Full | **fold-into-existing** | Medium | Add coverage targets table, CI integration notes to sys-testing |
| `unit-tests-generation` | AI-assisted test generation, 8-phase workflow | Gap analysis already in sys-testing | sys-testing | Partial | **fold-into-existing** | Low | The "gap analysis + targeted test generation" phases map to existing Workflow 2; 8-phase structure is over-engineered for sys-testing's scope |

---

## 7. Dependency Closure

No new dependencies introduced. sys-testing already references `rd3:tdd-workflow` and `rd3:sys-debugging` — both exist.

---

## 8. Migration Batches

Single batch: enhance `rd3:sys-testing` with content from the three source skills.

**Batch 1: sys-testing Enhancement**

| Content | Source | Action |
|---------|--------|--------|
| Escalation protocol | test-cycle | Add to Workflow 2 |
| Blocker detection | test-cycle | Add as reference section |
| Pre/post-execution checklists | test-cycle | Add to SKILL.md |
| Test command detection priority | test-cycle | Add to Workflow 1 |
| Coverage targets table | test-coverage | Merge into Workflow 3 |
| Best practices (research citations) | unit-tests-generation | Add to reference or SKILL.md sources |

---

## 9. Per-Skill Migration Checklist

### rd2:test-cycle → rd3:sys-testing
- [x] Escalation protocol: Add escalation report format to Workflow 2
- [x] Blocker detection: Add blocker taxonomy (skip rd2:tasks references)
- [x] Pre/post-execution checklists: Add to SKILL.md (trim rd2:tasks coupling)
- [x] Test command detection priority: Add language detection table to Workflow 1
- [x] Remove "Used by: super-coder..." — caller coupling violates purity
- [x] Remove references to `rd2:tasks`, `rd2:anti-hallucination`

### rd2:test-coverage → rd3:sys-testing
- [x] Coverage targets by module type: Merge into Workflow 3 (already has project-type targets)
- [x] CI integration patterns: Add to SKILL.md or coverage-analysis.md
- [x] Coverage anti-patterns: Already in sys-testing references — skip duplicates

### rd2:unit-tests-generation → rd3:sys-testing
- [x] 8-phase workflow: Too prescriptive for sys-testing; map gap analysis phases to Workflow 2
- [x] Research-based best practices: Add sources section to SKILL.md (citations)
- [x] Python/TypeScript/Go examples: Already covered in test-generation-patterns.md
- [x] python-module-registration.md: Skip — too specialized

---

## 10. Expert Review Gate

Completed on 2026-03-23 using the same validation/evaluation logic wrapped by `rd3:expert-skill`:

- `bun run plugins/rd3/skills/cc-skills/scripts/validate.ts plugins/rd3/skills/sys-testing`
  - Result: passed with no warnings
- `bun run plugins/rd3/skills/cc-skills/scripts/evaluate.ts plugins/rd3/skills/sys-testing --scope full`
  - Result: 90/90 (100%), 0 findings, 0 recommendations

---

## 11. Open Decisions

None — the migration plan is coherent and executable.
