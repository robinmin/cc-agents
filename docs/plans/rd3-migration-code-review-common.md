# rd3 Skill Migration Report: code-review-common

**Date:** 2026-03-25
**Status:** PLANNING COMPLETE — APPLYING MIGRATION

---

## 1. Current Inventory

### Source rd2 Skills (--from)

| Skill | Directory | Purpose | Scripts | References | Assets |
|-------|-----------|---------|---------|-----------|--------|
| `code-review-common` | `plugins/rd2/skills/code-review-common/` | Unified coordinator with auto-selection | `code-review.py` | (none) | (none) |
| `code-review-claude` | `plugins/rd2/skills/code-review-claude/` | Native Claude review via Read/Grep/Glob | `code-review-claude.py` | 6 files | 3 files |
| `code-review-gemini` | `plugins/rd2/skills/code-review-gemini/` | Gemini CLI-based review | `code-review-gemini.py` | 3 files | 3 files |
| `code-review-opencode` | `plugins/rd2/skills/code-review-opencode/` | OpenCode CLI multi-model review | `code-review-opencode.py` | 8 files | 3 files |
| `code-review-auggie` | `plugins/rd2/skills/code-review-auggie/` | Auggie MCP semantic review | `code-review-auggie.py` | 6 files | 3 files |

### Target rd3 Skill (--to)

| Skill | Directory | Status | Rationale |
|-------|-----------|--------|-----------|
| `code-review-common` | `plugins/rd3/skills/code-review-common/` | **DOES NOT EXIST — CREATE NEW** | Clean redesign warranted by goal |

### rd3 Skill Registry (relevant)

| Skill | Status | Notes |
|-------|--------|-------|
| `rd3:run-acp` | EXISTS | Headless ACP CLI for cross-channel delegation |
| `rd3:tasks` | EXISTS | Task management for review report output |
| `rd3:quick-grep` | EXISTS | Code search patterns |
| `rd3:sys-debugging` | EXISTS | Debugging methodology reference |
| `rd3:tdd-workflow` | EXISTS | TDD patterns reference |

---

## 2. Overlap Analysis

### Shared Patterns Across All 5 Source Skills

1. **Identical workflow sequence**: `check` → `run/review` → `import`
2. **Identical focus areas**: security, performance, testing, quality, architecture, comprehensive
3. **Identical priority taxonomy**: Critical → High → Medium → Low
4. **Identical output format**: YAML frontmatter + Markdown sections
5. **Identical SECU framework**: Security, Efficiency, Correctness, Usability
6. **Identical review prompts**: review_prompt.md, planning_prompt.md templates
7. **Identical result format**: code-review-result.md template

### Conceptual Overlap

| Pattern | All 5 Skills Share | Should Be |
|---------|-------------------|-----------|
| Review workflow | ✅ | Unified in one skill |
| Focus area definitions | ✅ | Unified in one skill |
| Priority classification | ✅ | Unified in one skill |
| Output format specification | ✅ | Unified in one skill |
| Issue templates | ✅ | Unified in one skill |
| Tool-specific query patterns | ❌ (claude-query-patterns, auggie-query-patterns, opencode-query-patterns) | Fold into unified patterns |
| Tool comparison tables | ❌ (tool-comparison.md) | **SKIP** — channel-specific, replaced by rd3:run-acp |
| Tool installation docs | ❌ (installation.md) | **SKIP** — channel-specific, delegated to rd3:run-acp |

### What Should Stay (Unified)

- Review coordination logic (criteria, checklists, workflow)
- Focus area definitions and coverage
- SECU-based analysis framework
- Priority taxonomy (Critical/High/Medium/Low)
- Output format specification
- Issue template patterns
- Review result structure

### What Should Be Removed (Channel-Specific)

- Auto-selection heuristics for specific tools (gemini, claude, auggie, opencode)
- Tool-specific query patterns (claude-query-patterns, auggie-query-patterns, opencode-query-patterns)
- Tool comparison tables (auggie vs gemini, etc.)
- Tool installation and setup instructions
- Tool-specific model selection guides (gemini model flags, etc.)
- Python implementation scripts (to be rewritten in TypeScript)
- Direct delegation to `rd2:code-review-*` skills

### What the Goal Changes

User explicitly wants:
1. **Unified** code review skill — NOT tool-specific wrappers
2. **rd3:run-acp** for cross-channel execution — NOT direct delegation
3. **Industry best practices and SOTA** — upgrade review criteria
4. **rd3:tasks** for review reports — findings in Background, requirements in Requirements

---

## 3. Target Taxonomy

### rd3 Skill Category

**Category:** `execution-core` (generic coding, generic review, ACP delegation)

### Target Skill Definition: `code-review-common`

**Purpose:** Unified code review skill that provides channel-agnostic review coordination, criteria, and workflow integration. Uses `rd3:run-acp` for cross-channel execution and `rd3:tasks` for review report output.

**Boundaries:**

| Included | Excluded |
|----------|----------|
| Review coordination logic | Channel-specific tool delegation |
| Focus area criteria (SECU) | Tool installation/setup |
| Priority taxonomy | Auto-selection heuristics |
| Output format specification | Tool comparison tables |
| Issue template patterns | Python script maintenance |
| Review result structure | Vendor-specific query patterns |

**Source Skills Feeding Target:**
- `code-review-common` → review coordination, workflow integration
- `code-review-claude` → SECU framework, best-practices, output-format, query-patterns
- `code-review-gemini` → model selection heuristics (as general principles)
- `code-review-opencode` → (contributed to unified patterns)
- `code-review-auggie` → (contributed to unified patterns)

---

## 4. Tech Stack Simplification

### Python Scripts → TypeScript

All 5 source skills have Python scripts. These will be **rewritten in TypeScript** as part of the migration:

| Source Script | Lines | Action | Target |
|---------------|-------|--------|--------|
| `code-review-common/scripts/code-review.py` | ~400 | **PORT** | `plugins/rd3/skills/code-review-common/scripts/code-review.ts` |
| `code-review-claude/scripts/code-review-claude.py` | ~600 | **PORT** | Same, consolidated |
| `code-review-gemini/scripts/code-review-gemini.py` | ~1500 | **PORT** | Same, consolidated |
| `code-review-opencode/scripts/code-review-opencode.py` | ~500 | **PORT** | Same, consolidated |
| `code-review-auggie/scripts/code-review-auggie.py` | ~400 | **PORT** | Same, consolidated |

### Python Tests → Bun Test

All Python test files will be **rewritten in Bun test**:

| Source Test | Action |
|-------------|--------|
| `code-review-claude/tests/*.py` | Rewrite to `.test.ts` |
| `code-review-gemini/tests/*.py` | Rewrite to `.test.ts` |
| `code-review-opencode/tests/*.py` | Rewrite to `.test.ts` |
| `code-review-auggie/tests/*.py` | Rewrite to `.test.ts` |

### Python Examples → TypeScript

Generic Python code examples in markdown files will be **converted to TypeScript**:

- All code examples in `references/*.md` → TypeScript equivalents
- Python-specific examples that teach Python idioms → **KEEP** as Python (noted in references)

### Assets

| Asset | Action |
|-------|--------|
| `assets/review_prompt.md` | **MIGRATE** (generic, channel-agnostic) |
| `assets/planning_prompt.md` | **MIGRATE** (generic, channel-agnostic) |
| `assets/code-review-result.md` | **MIGRATE** (generic, channel-agnostic) |

---

## 5. Target Skill Decision

### Mode: **CREATE NEW rd3 skill**

**Status:** `plugins/rd3/skills/code-review-common/` does NOT exist

**Justification:**
- Goal explicitly requests a unified, channel-agnostic code review skill
- Existing rd3 skills do not cover this scope
- Creating new is correct because no existing rd3 skill has this boundary
- `rd3:run-acp` already handles cross-channel delegation separately

**Goal Fit:**
- ✅ Unified skill — achieved by consolidating all channel-specific logic
- ✅ rd3:run-acp integration — skill will delegate via ACP instead of direct tool calls
- ✅ Industry best practices — SECU framework + OWASP + CWE taxonomy
- ✅ rd3:tasks integration — review findings flow into task files

**Scope Conflict Resolution:**
- The old `code-review-common` was a **coordinator** that delegated to channel-specific skills
- The new `code-review-common` is a **unified review skill** that uses `rd3:run-acp` for channel execution
- This is a redesign, not a 1:1 port

---

## 6. Source-to-Target Mapping

| Source Skill | Current Purpose | Overlap | Target rd3 Skill | Goal Fit | Action | Priority | Notes |
|--------------|-----------------|---------|------------------|----------|--------|----------|-------|
| `code-review-common` | Coordinator with auto-selection | High — coordination logic | `code-review-common` | ✅ | **MERGE** | P0 | Core coordination logic, workflow integration, SECU criteria |
| `code-review-claude` | Native Claude review | High — SECU, best-practices, output-format | `code-review-common` | ✅ | **MERGE** | P0 | Query patterns become unified, output format standardized |
| `code-review-gemini` | Gemini CLI review | Medium — model selection heuristics | `code-review-common` | ✅ | **MERGE** | P1 | Generalize model selection to channel-agnostic principles |
| `code-review-opencode` | OpenCode CLI review | Medium — patterns | `code-review-common` | ✅ | **MERGE** | P1 | Unified into generic patterns |
| `code-review-auggie` | Auggie MCP review | Low — semantic patterns | `code-review-common` | ✅ | **MERGE** | P2 | Semantic search patterns folded into unified approach |

### Actions Explained

| Action | Count | Rationale |
|--------|-------|-----------|
| **MERGE** | 5 | All channel-specific skills share identical workflow, focus areas, priority taxonomy — consolidating into one unified skill |
| **SKIP** | 0 | No skill is entirely irrelevant — all contributed to the unified approach |
| **FOLD-INTO-EXISTING** | 0 | Target doesn't exist yet — creating new |

---

## 7. Dependency Closure

### Missing Dependencies

None identified. All required rd3 skills already exist:

| Required Skill | Status | Purpose |
|----------------|--------|---------|
| `rd3:run-acp` | ✅ EXISTS | Cross-channel execution delegation |
| `rd3:tasks` | ✅ EXISTS | Review report → task file creation |
| `rd3:quick-grep` | ✅ EXISTS | Code search reference |
| `rd3:sys-debugging` | ✅ EXISTS | Debugging reference |
| `rd3:tdd-workflow` | ✅ EXISTS | TDD reference |

### New Dependency Created

The migrated `code-review-common` skill will **depend on**:
- `rd3:run-acp` — for cross-channel review execution
- `rd3:tasks` — for creating review report task files

### Dependency Resolution Order

1. ✅ No blocking dependencies — all required skills already exist
2. The migrated skill will reference `rd3:run-acp` and `rd3:tasks` in its documentation

---

## 8. Migration Batches

### Single Batch: `code-review-common` (P0)

**Target:** `plugins/rd3/skills/code-review-common/`

**Source Skills:** All 5 channel-specific skills

**Why Order Matters:** This is a focused 5:1 consolidation. The order within the migration is:
1. Create unified SKILL.md with consolidated criteria
2. Consolidate references (best-practices, output-format, query-patterns)
3. Migrate assets (review_prompt, planning_prompt, code-review-result)
4. Rewrite Python scripts to TypeScript
5. Rewrite Python tests to Bun test

**Acceptance Criteria:**
- [ ] SKILL.md is channel-agnostic (no mentions of gemini/claude/auggie/opencode as separate skills)
- [ ] Review coordination uses `rd3:run-acp` for execution
- [ ] Review findings output via `rd3:tasks` task files
- [ ] Focus areas defined using SECU taxonomy
- [ ] Priority taxonomy: Critical → High → Medium → Low
- [ ] TypeScript scripts compile with `bun tsc --noEmit`
- [ ] Bun tests pass with `bun test`
- [ ] All references use rd3-native conventions
- [ ] No stale `rd2:` references remain

---

## 9. Per-Skill Migration Checklist

### code-review-common (source) → code-review-common (target)

| Item | Status | Notes |
|------|--------|-------|
| SKILL.md | ✅ MIGRATE | Rewrite as channel-agnostic coordinator |
| scripts/code-review.py | ✅ PORT | Rewrite in TypeScript |
| references/* | N/A | None exist |

### code-review-claude (source) → code-review-common (target)

| Item | Status | Notes |
|------|--------|-------|
| SKILL.md | ✅ MERGE | Key content into unified SKILL |
| references/best-practices.md | ✅ MERGE | SECU framework, checklists |
| references/output-format.md | ✅ MERGE | Unified output format |
| references/claude-query-patterns.md | ✅ MERGE | Becomes generic query-patterns |
| references/tool-comparison.md | ❌ SKIP | Channel-specific, replaced by rd3:run-acp |
| references/import-format.md | ✅ MERGE | Task creation patterns → rd3:tasks |
| references/usage-examples.md | ✅ MERGE | Generic examples |
| assets/* | ✅ MIGRATE | review_prompt, planning_prompt, code-review-result |
| scripts/* | ✅ PORT | Consolidated TypeScript |
| tests/* | ✅ PORT | Bun test |

### code-review-gemini (source) → code-review-common (target)

| Item | Status | Notes |
|------|--------|-------|
| SKILL.md | ✅ MERGE | Model selection → channel principles |
| references/gemini-flags.md | ❌ SKIP | Tool-specific, delegated to rd3:run-acp |
| references/import-format.md | ✅ MERGE | Import patterns → rd3:tasks |
| references/usage-examples.md | ✅ MERGE | Generic examples |
| assets/* | ✅ MIGRATE | (already covered by claud's assets) |
| scripts/* | ✅ PORT | Consolidated TypeScript |
| tests/* | ✅ PORT | Bun test |

### code-review-opencode (source) → code-review-common (target)

| Item | Status | Notes |
|------|--------|-------|
| SKILL.md | ✅ MERGE | Multi-model patterns → generic |
| references/installation.md | ❌ SKIP | Tool-specific |
| references/usage-examples.md | ✅ MERGE | Generic examples |
| references/best-practices.md | ✅ MERGE | (already covered) |
| references/tool-comparison.md | ❌ SKIP | (already skipped) |
| assets/* | ✅ MIGRATE | (already covered) |
| scripts/* | ✅ PORT | Consolidated TypeScript |
| tests/* | ✅ PORT | Bun test |

### code-review-auggie (source) → code-review-common (target)

| Item | Status | Notes |
|------|--------|-------|
| SKILL.md | ✅ MERGE | Semantic patterns → generic |
| references/auggie-query-patterns.md | ✅ MERGE | Semantic search → generic |
| references/tool-comparison.md | ❌ SKIP | (already skipped) |
| assets/* | ✅ MIGRATE | (already covered) |
| scripts/* | ✅ PORT | Consolidated TypeScript |
| tests/* | ✅ PORT | Bun test |

---

## 10. Expert Review Gate

**Required:** Before closing migration, delegate to `rd3:expert-skill` for quality enforcement.

Steps:
1. Invoke `rd3:expert-skill` to evaluate `plugins/rd3/skills/code-review-common` at full scope
2. Review evaluation findings
3. If issues remain, invoke `rd3:expert-skill` to refine
4. Repeat until skill meets acceptable standard

**Fallback if rate limited:**
```text
Agent(subagent_type="rd3:expert-skill", prompt="Evaluate plugins/rd3/skills/code-review-common for: frontmatter quality, trigger coverage, boundary clarity, content structure, reference quality, cross-references, purity (no agent coupling), platform metadata. Report a score 0-100 with critical/major/minor issues.")
```

---

## 11. Open Decisions

| Decision | Status | Resolution |
|----------|--------|------------|
| How to handle tool-specific query patterns | RESOLVED | Fold into unified query-patterns reference, generalized for any channel |
| Whether to keep Python examples | RESOLVED | Convert all generic examples to TypeScript; keep only explicitly Python-teaching examples |
| Review report output format | RESOLVED | Use `rd3:tasks` to create task files — findings in Background, requirements in Requirements |
| Channel-specific asset templates | RESOLVED | Migrate generic templates (review_prompt, planning_prompt, code-review-result) as assets |
| Auto-selection logic | RESOLVED | Remove — `rd3:run-acp` handles channel selection |

---

## Summary

| Metric | Value |
|--------|-------|
| Source skills | 5 |
| Target skill | 1 (NEW) |
| Skills merged | 5 |
| Skills skipped | 0 |
| Skills split | 0 |
| Python scripts to port | 5 |
| Python tests to port | ~15 |
| References to consolidate | ~15 |
| Assets to migrate | 3 (templates) |

**Migration Type:** many:1 **MERGE** with **REWRITE**

The migrated skill will be a unified, channel-agnostic code review coordinator that:
1. Uses `rd3:run-acp` for cross-channel execution
2. Uses `rd3:tasks` for review report output
3. Applies SECU-based review criteria
4. Follows Critical → High → Medium → Low priority taxonomy
5. Is written in TypeScript (Bun-native)
