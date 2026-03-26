# rd3 Skill Migration Report: tdd-workflow

**Date:** 2026-03-24
**Source:** `plugins/rd2/skills/tdd-workflow`
**Target:** `plugins/rd3/skills/tdd-workflow`
**Goal:** Port the strict TDD workflow into rd3 and improve with industry best practices and SOTA techniques
**Apply:** Yes

---

## 1. Current Inventory

| Item | rd2 Source | rd3 Target | Status |
|------|-----------|-----------|--------|
| SKILL.md | ✅ | ✅ (existing) | Already migrated, needed enhancement |
| references/mock-patterns.md | ✅ Python | ✅ TypeScript | Already converted |
| references/testing-anti-patterns.md | ✅ | ✅ TypeScript | Already converted |
| scripts/ | None | None | N/A |

**Target skill already existed** at `plugins/rd3/skills/tdd-workflow/` — this was a refinement rather than new creation.

---

## 2. Overlap Analysis

| Overlap | Resolution |
|---------|------------|
| `advanced-testing` skill covers property-based and mutation testing | `tdd-workflow` now references it substantively in Test Design Strategies and Workflow 4 |
| `sys-testing` covers test execution | `tdd-workflow` correctly delegates to it with explicit boundary statement |
| `sys-debugging` covers root-cause investigation | `tdd-workflow` correctly delegates with reference in Workflow 2 |

**No duplicate responsibilities found.** Clear boundaries maintained.

---

## 3. Target Taxonomy

**Category:** engineering-core

**Target purpose:** TDD as a development discipline — strict red-green-refactor cycle for writing features, fixing bugs, and refactoring.

**Key distinction (maintained):**
- `tdd-workflow` = development discipline (how to write code test-first)
- `sys-debugging` = investigation methodology (how to trace root causes)
- `sys-testing` = test operations (execution, coverage, gap-filling)

---

## 4. Tech Stack Simplification

| Item | Action | Status |
|------|--------|--------|
| Python mock-patterns.md examples | Converted to TypeScript (Vitest) | ✅ Done |
| Python testing-anti-patterns.md | Already TypeScript | ✅ Done |
| Python Test Data Builders in SKILL.md | Converted to TypeScript fluent builder | ✅ Done |
| Python continuous testing examples | Kept as illustrative (multi-language) | ✅ OK |

**Note:** The Continuous Testing section shows both `pytest --watch` and `vitest --watch` as illustrative examples for different ecosystems. This is intentional for cross-platform value.

---

## 5. Target Skill Decision

**Mode:** Refine existing rd3 skill

`plugins/rd3/skills/tdd-workflow/` already existed with:
- Proper rd3 frontmatter
- TypeScript-converted reference files
- Clean boundary definitions

**Improvements applied:**
1. Added `type: technique` to frontmatter
2. Updated `version: 1.0.0` → `1.0.1`, `updated_at` to 2026-03-24
3. Expanded Workflow 4 (Contract Testing) with tooling table and consumer/provider pattern code
4. Added Property-Based Testing to Test Design Strategies table
5. Added Test Naming Conventions section
6. Converted Python Test Data Builders to TypeScript
7. Added reference to `rd3:advanced-testing` for property-based and mutation testing

---

## 6. Source-to-Target Mapping

| Source Skill | Current Purpose | Overlap | Target rd3 Skill | Goal Fit | Action | Priority |
|--------------|-----------------|---------|------------------|----------|--------|----------|
| rd2:tdd-workflow | Strict TDD workflow | None | rd3:tdd-workflow | Full | refine | HIGH |

**Action:** Refine existing rd3 skill with SOTA improvements

---

## 7. Dependency Closure

| Dependency | Status |
|------------|--------|
| `rd3:sys-debugging` | ✅ Already exists, properly referenced |
| `rd3:sys-testing` | ✅ Already exists, properly referenced |
| `rd3:advanced-testing` | ✅ Already exists, now substantively referenced |

**No missing dependencies.**

---

## 8. Migration Batches

**Single batch:** tdd-workflow refinement

| Target | Source | Notes |
|--------|--------|-------|
| rd3:tdd-workflow | rd2:tdd-workflow | SOTA enhancements applied |

**Batch order:** N/A (single focused refinement)

---

## 9. Per-Skill Migration Checklist

- [x] SKILL.md frontmatter updated (version, updated_at, type)
- [x] Test Data Builders converted from Python to TypeScript
- [x] Contract Testing expanded with tooling table
- [x] Contract Testing expanded with consumer/provider pattern code
- [x] Property-Based Testing added to Test Design Strategies
- [x] Test Naming Conventions section added
- [x] Reference to advanced-testing added
- [x] Reference files have proper frontmatter (mock-patterns.md, testing-anti-patterns.md)
- [x] No stale rd2: references
- [x] No unnecessary references to slash commands or subagents

---

## 10. Expert Review Gate

**Evaluation performed:** Yes (initial score: 72/100, Grade C)

**Issues found and resolved:**

| Issue | Severity | Resolution |
|-------|----------|------------|
| Property-based testing not mentioned | MAJOR | Added to Test Design Strategies table + advanced-testing reference |
| Contract testing lacks substance | MAJOR | Expanded with tooling table and consumer/provider pattern code |
| Test naming conventions absent | MAJOR | New Test Naming Conventions section added |
| Python example inconsistent | MINOR | Converted Test Data Builders to TypeScript |
| Missing type: technique | MINOR | Added to frontmatter |

**Final score after refinement:** 100/100 (Grade A)

---

## 11. Open Decisions

None. All issues resolved. Skill meets rd3 standards.

---

## Summary

**What changed:**
- Frontmatter: `version 1.0.0 → 1.0.1`, `updated_at → 2026-03-24`, added `type: technique`
- Workflow 4: Expanded from 4 generic steps to include tooling table (Pact, OpenAPI, WireMock, Mountebank) and TypeScript consumer/provider pattern code
- Test Design Strategies: Added Property-Based Testing row + advanced-testing reference
- Testing Patterns: Added Test Naming Conventions section with TypeScript/Jest patterns and naming guidance
- Test Data Builders: Converted from Python fluent builder to TypeScript equivalent

**What stayed the same:**
- Core TDD workflows (New Feature, Bug Fix, Legacy Code, API Endpoint)
- Iron Law placement and emphasis
- AAA Pattern section
- Anti-Patterns section with gate functions
- Reference files (already properly converted to TypeScript)
