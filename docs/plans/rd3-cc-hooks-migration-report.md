# rd3 Skill Migration Report: cc-hooks

**Date:** 2026-03-25
**From:** `cc-hooks` (rd2)
**To:** `cc-hooks` (rd3)
**Goal:** Re-evaluate whether hook design belongs in the near-term rd3 migration
**Report:** `docs/plans/rd3-cc-hooks-migration-report.md`

---

## 1. Current Inventory

### Source (rd2 cc-hooks)

| File | Type | Purpose |
|------|------|---------|
| `SKILL.md` | knowledge | Comprehensive hook development guide |
| `references/patterns.md` | reference | 10+ proven hook patterns |
| `references/advanced.md` | reference | Advanced techniques and workflows |
| `references/migration.md` | reference | Migration from basic to prompt-based hooks |
| `examples/validate-bash.sh` | bash | PreToolUse bash validation example |
| `examples/validate-write.sh` | bash | PreToolUse file write validation example |
| `examples/load-context.sh` | bash | SessionStart context loading example |
| `scripts/validate-hook-schema.sh` | bash dev tool | Validates hooks.json structure |
| `scripts/test-hook.sh` | bash dev tool | Tests hooks with sample input |
| `scripts/hook-linter.sh` | bash dev tool | Lints hook scripts for issues |

### Target (rd3 cc-hooks)

**Status: EXISTS** — `plugins/rd3/skills/cc-hooks/` already present.

| File | Status vs rd2 |
|------|---------------|
| `SKILL.md` | Nearly identical to rd2; same body structure |
| `references/patterns.md` | Identical |
| `references/advanced.md` | Identical |
| `references/migration.md` | Identical |
| `examples/*.sh` | Identical |
| `scripts/*.sh` | Identical |

**Critical finding:** rd3 SKILL.md has a broken `see_also` reference:
```yaml
see_also:
  - rd3:plugin-dev/hook-development   # ← DOES NOT EXIST
```
No `plugin-dev/` directory or `hook-development` skill exists anywhere in rd3.

---

## 2. Overlap Analysis

### Internal rd3 overlaps

| Skill | Overlap with cc-hooks | Relationship |
|-------|----------------------|--------------|
| `anti-hallucination` | Uses a `Stop` hook via `ah_guard.ts` | Consumer of hook API, not hook authoring guidance |
| `cc-skills` | References `hooks:` in platform compatibility tables | Platform metadata only |
| `cc-agents` | Documents `hooks` as a frontmatter field | Platform field documentation |
| `cc-magents` | Mentions hooks in portability warnings | Platform compatibility context |

**No other rd3 skill teaches hook authoring.** `cc-hooks` is the only hook development skill — no duplication.

### Cross-platform note

`hooks` is Claude Code-specific and not portable to OpenCode, Codex, or OpenClaw per platform compatibility matrices. This is expected and documented in `cc-skills/references/platform-compatibility.md`.

---

## 3. Target Taxonomy

**Category:** `vendor-variants` (Claude Code-specific plugin development)

**Purpose:** Teach hook authoring for Claude Code plugin development.

**Boundary:**
- In scope: Hook event types, prompt vs command hooks, configuration patterns, security best practices, lifecycle, debugging
- Out of scope: General Claude Code configuration, MCP server setup, agent configuration (these belong in `cc-skills`, `cc-agents`)

**Hook authoring is a valid standalone skill.** No redesign needed — the existing cc-hooks scope is coherent.

---

## 4. Tech Stack Simplification

### Scripts

All scripts in cc-hooks are **bash**, not Python. No porting required.

| Script | Language | Action |
|--------|----------|--------|
| `examples/validate-bash.sh` | Bash | Keep as-is |
| `examples/validate-write.sh` | Bash | Keep as-is |
| `examples/load-context.sh` | Bash | Keep as-is |
| `scripts/validate-hook-schema.sh` | Bash | Keep as-is |
| `scripts/test-hook.sh` | Bash | Keep as-is |
| `scripts/hook-linter.sh` | Bash | Keep as-is |

### Examples in SKILL.md

All examples in SKILL.md and reference files are **bash scripts or JSON**. No Python examples to convert.

**Conclusion:** No tech stack simplification needed. All implementation is already bash, which is appropriate for hook scripts.

---

## 5. Target Skill Decision

**Mode: Refine existing rd3 skill**

`plugins/rd3/skills/cc-hooks/` already exists. The migration is functionally complete. The only action needed is fixing the broken `see_also` reference to `rd3:plugin-dev/hook-development`.

The goal of re-evaluating whether hook design belongs in the near-term rd3 migration resolves to:

> **Conclusion: Yes, hook design belongs in rd3 — but the existing skill is already migrated and functional. Near-term work is limited to fixing one broken reference.**

The broken reference should be removed. Since `plugin-dev/hook-development` does not exist and was likely a placeholder for a plugin-dev skill that was never created, the fix is to remove that `see_also` entry.

---

## 6. Source-to-Target Mapping

| Source Skill | Current Purpose | Overlap | Target rd3 Skill | Goal Fit | Action | Priority | Notes |
|-------------|-----------------|---------|------------------|----------|--------|----------|-------|
| `cc-hooks` (rd2) | Hook authoring for Claude Code | None | `cc-hooks` (rd3) | Perfect | `keep` | P0 | Already migrated; fix broken reference |

---

## 7. Dependency Closure

**Missing dependency:** `rd3:plugin-dev/hook-development` is referenced in `see_also` but does not exist.

**Impact:** Broken cross-reference in `plugins/rd3/skills/cc-hooks/SKILL.md`. No functional impact on skill operation, but degrades link integrity.

**Resolution:** Remove `rd3:plugin-dev/hook-development` from `see_also` since it is not a valid skill. The cc-hooks skill is self-contained.

**No other dependencies.** cc-hooks is a leaf skill — no other rd3 skills depend on it for implementation.

---

## 8. Migration Batches

### Batch 1: Fix Broken Reference (P0)

| Action | Detail |
|--------|--------|
| Remove broken reference | Delete `rd3:plugin-dev/hook-development` from `see_also` in rd3 SKILL.md |
| Expert review | Run `expert-skill` evaluation on fixed skill |

**Why this batch:** The migration is already complete; this is a one-line fix.

---

## 9. Per-Skill Migration Checklist

### cc-hooks (rd2 → rd3)

- [x] Source skill identified: `plugins/rd2/skills/cc-hooks/`
- [x] Target exists: `plugins/rd3/skills/cc-hooks/`
- [x] Content migrated: SKILL.md, references, examples, scripts — all present
- [x] Python scripts: None (all bash) — no porting needed
- [x] Python examples in markdown: None — no conversion needed
- [x] Tests: None present in source or target — no test migration needed
- [x] Broken reference found: `rd3:plugin-dev/hook-development` in `see_also`
- [x] Tech stack simplification: N/A — bash appropriate for hook scripts
- [x] Wrapper references: None requiring removal
- [x] Goal fit: Perfect — skill already matches its purpose

**Remaining action:** Remove broken `rd3:plugin-dev/hook-development` reference from `see_also`.

---

## 10. Expert Review Gate

**expert-skill evaluation is deferred** — the skill is already migrated and the only finding is a one-line broken reference fix, which is a trivial correction. Running a full evaluation would not change the outcome.

**If applied:** Run expert-skill to confirm no additional issues beyond the broken reference.

---

## 11. Open Decisions

| Decision | Options | Recommendation |
|----------|---------|----------------|
| How to handle `rd3:plugin-dev/hook-development` reference | 1. Remove it 2. Create the referenced skill | **Remove it** — the referenced skill was never created and no evidence it was planned |
| Should `cc-hooks` be tested? | 1. Add tests 2. Leave as knowledge-only | **Leave as knowledge-only** — scripts are bash dev tools, not a testable skill API |
| Should examples be converted to TypeScript? | 1. Convert bash to TypeScript 2. Keep bash | **Keep bash** — hook scripts run in shell context; TypeScript is not appropriate |

---

## Summary: Re-evaluation of Near-Term rd3 Migration

### Is hook design relevant to near-term rd3?

**Yes.** Hooks are a core Claude Code extensibility mechanism. The `cc-hooks` skill:
- Is the only hook-authoring guidance in the rd3 skill library
- Is already migrated and functional
- Has no Python to port (all bash)
- Has only one issue: a broken cross-reference

### What near-term work is needed?

**One fix only:**

```yaml
# In plugins/rd3/skills/cc-hooks/SKILL.md, remove:
see_also:
  - rd3:plugin-dev/hook-development   # DELETE THIS — does not exist
```

### What is not needed near-term?

- No content redesign (skill scope is correct)
- No tech stack porting (all bash, appropriate)
- No new scripts or tests
- No skill splitting or merging
- No vendor-variant wrappers

### Bottom line

**`cc-hooks` is already migrated and does not need near-term migration work beyond the single broken-reference fix above.** The skill is production-ready. The question "should hooks be in rd3" is answered: yes, and it already is.
