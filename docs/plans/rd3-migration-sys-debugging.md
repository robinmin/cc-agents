# rd3 Migration Report: sys-debugging

**Date**: 2026-03-23
**From**: `rd2:sys-debugging`
**To**: `rd3:sys-debugging` (new)
**Goal**: Port the root-cause-first debugging workflow into rd3
**Mode**: Report + Apply

---

## 1. Current Inventory

### Source: rd2:sys-debugging

| Property | Value |
|----------|-------|
| Location | `plugins/rd2/skills/sys-debugging/` |
| Type | Knowledge-only (no scripts) |
| Files | SKILL.md + EXAMPLES.md |
| Total lines | ~561 |
| Python scripts | None |
| Python tests | None |
| Python examples in markdown | Yes — Example 1 (JWT debugging) |

**Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `SKILL.md` | 184 | Four-phase methodology, red flags, language tools |
| `EXAMPLES.md` | 377 | 3 real-world walkthroughs (Python, TypeScript, Go) |

### Target: rd3:sys-debugging

**Does not exist.** `plugins/rd3/skills/sys-debugging/` is a new target.

### rd3 skills relevant to this migration

| Skill | Relevance |
|-------|-----------|
| `rd3:task-decomposition` | Adjacent — decomposition vs debugging are different phases |
| `rd3:tasks` | Adjacent — task lifecycle, not debugging methodology |
| `rd3:anti-hallucination` | Unrelated |

### Back-references to remove

| Reference | Count | Category |
|-----------|-------|----------|
| `rd2:testing-patterns` | 1 | Non-existent skill, remove |
| `rd2:code-review` | 1 | Non-existent in rd3, remove |
| `rd2:10-stages-developing` | 1 | Non-existent skill, remove |
| `rd2:tdd-workflow` | 1 | Planned for Wave 1, remove reference |

---

## 2. Overlap Analysis

**No overlap** with existing rd3 skills. Debugging methodology is distinct from:
- `rd3:task-decomposition` — planning phase, not execution
- `rd3:tasks` — file operations, not investigation methodology
- `rd3:anti-hallucination` — verification, not debugging

**Purity assessment:**

The source skill is **mostly pure** — the core four-phase methodology is caller-agnostic. Issues:
1. "Integration with Other Skills" section (lines 174-178) references 3 rd2-specific skills that don't exist in rd3
2. Language-specific tool table (lines 150-172) is generic and portable — keep as-is

---

## 3. Target Taxonomy

### Category: `engineering-core`

Debugging is an execution-stage skill, not a planning primitive.

### Target purpose

Provide a systematic four-phase debugging methodology: root cause first, then fix. Applies to all languages and platforms.

### Target boundaries

| Concern | In-scope | Out-of-scope |
|---------|----------|--------------|
| Debugging methodology | Four-phase (investigate, analyze, hypothesize, implement) | Writing new features |
| Root cause tracing | Traces call chains backward to origin | Full system redesign |
| Hypothesis testing | Scientific method, one variable at a time | Arbitrary patching |
| Language-agnostic diagnostics | Commands and tools per language | Language-specific syntax teaching |
| Integration with rd3:tasks | Create failing test before fixing | Task file lifecycle management |

---

## 4. Tech Stack Simplification

**Knowledge-only — no scripts to port.**

Python examples in EXAMPLES.md demonstrate debugging concepts (JWT silent failure, Go error handling). These are kept as-is — they are the skill content, not Python-specific teaching.

No conversion needed.

---

## 5. Target Skill Decision

**Create new rd3 skill** — `plugins/rd3/skills/sys-debugging/` does not exist.

---

## 6. Source-to-Target Mapping

| Source | Action | Rationale |
|--------|--------|-----------|
| `rd2:sys-debugging` | `rewrite` | Clean migration; strip 4 rd2 references, add rd3 frontmatter, preserve all methodology |

---

## 7. Dependency Closure

**No blockers.** All referenced rd2 skills are either planned for migration or intentionally dropped. The debugging methodology is standalone.

---

## 8. Migration Batches

Wave 1, standalone. No prerequisites.

---

## 9. Per-Skill Migration Checklist

- [x] Create `plugins/rd3/skills/sys-debugging/` directory
- [x] Create `SKILL.md` with rd3 frontmatter
- [x] Preserve four-phase methodology (Root Cause → Pattern → Hypothesis → Implementation)
- [x] Strip "Integration with Other Skills" section (rd2 references)
- [x] Keep language-agnostic diagnostics and tool table
- [x] Create `EXAMPLES.md` — port all 3 examples (Python, TypeScript, Go)
- [x] Add rd3-standard frontmatter to EXAMPLES.md
- [x] Add `see_also: [rd3:tasks]` for the "create failing test" workflow
- [x] Run expert-skill evaluation

---

## 10. Verification

| Check | Result |
|-------|--------|
| Directory structure | Valid |
| No stale `rd2:` references | 0 |
| No agent/wrapper coupling | 0 |
| Frontmatter on SKILL.md | Valid |
| Frontmatter on EXAMPLES.md | Valid |
| Python examples preserved | Yes (as skill content, not teaching) |

---

## 11. Expert Review Gate

**Grade: B (78/100)** — passed threshold.

**Major issues fixed during review:**
1. Shortened frontmatter description (~140 chars)
2. Added frontmatter to EXAMPLES.md with name, description, see_also
3. Added cross-reference to rd3:tasks for test-before-fix workflow

**Minor issues accepted:**
- Content is somewhat concise; could benefit from more narrative prose
- `interactions` metadata could specify "generator" for structured output

---

## 12. Open Decisions

All resolved. No blocking decisions.

| Decision | Resolution |
|----------|------------|
| rd2:tdd-workflow reference | Removed — skill is pure debugging, TDD is separate |
| rd2:testing-patterns reference | Removed — non-existent skill |
| rd2:code-review reference | Removed — non-existent skill |
| rd2:10-stages-developing reference | Removed — non-existent skill |
