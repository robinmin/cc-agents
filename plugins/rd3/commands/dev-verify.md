---
description: Verify task implementation completeness and correctness
argument-hint: "<task-ref> [--review-only] [--skip-confirm] [--focus <area>]"
allowed-tools: ["Read", "Glob", "Grep", "Bash", "Edit", "Skill"]
---

# Dev Verify

Verify a task's implementation is complete and correct — no missing features, no scope drift. Review against the task file's Requirements, Design, and Solution sections, then fix all findings by severity.

## When to Use

- After implementation, before marking a task Done
- Suspecting scope drift between requirements and implementation
- Needing a final quality gate before merge

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `task-ref` | Yes | — | WBS number or task file path |
| `--review-only` | No | `false` | Report findings only — do NOT fix |
| `--skip-confirm` | No | `false` | Skip confirmation, fix immediately |
| `--focus` | No | `comprehensive` | `security\|performance\|correctness\|usability\|comprehensive` |

Resolve `task-ref`: digits → glob `docs/tasks2/{digits}_*.md`, ends with `.md` → use as-is.

## Workflow (Claude Code)

Parse `$ARGUMENTS` for `task-ref`, `--review-only`, `--skip-confirm`, and `--focus`.

### Phase 1: Load & Parse
Resolve task-ref to file path. Read frontmatter, extract Requirements/Design/Solution sections. Determine source scope from Design/Solution paths or auto-detect. Include test files.

### Phase 2: Requirements Traceability
Search source for each requirement's implementation evidence. Classify **met**/**partial**/**unmet** — require specific `file:line` evidence. Detect scope drift: flag code with no requirement mapping.

### Phase 3: Code Quality (SECU)
Run SECU review (**S**ecurity, **E**fficiency, **C**orrectness, **U**sability), constrained by `--focus`. Score each finding P1–P4.

### Phase 4: Findings Report
Merge functional + quality findings, sort P1→P4. Present the report.
- `--review-only` → **STOP**
- `--skip-confirm` → proceed to Phase 5
- Otherwise → ask user to confirm

### Phase 5: Fix by Severity (skipped if --review-only)
Fix P1→P2→P3→P4 in severity order. Validate with `bun run check` after each batch. If 3 consecutive fixes fail → **STOP**, report architectural concern.

### Phase 6: Verdict
Re-run traceability on fixed code. Write final verdict to the task file Review section.

| Verdict | Condition |
|---------|-----------|
| **PASS** | All requirements met, no P1/P2 |
| **PARTIAL** | Partial requirements or P2 only, no P1 |
| **FAIL** | Unmet requirements or P1 remaining |

## Severity Taxonomy

| Priority | Definition |
|----------|------------|
| **P1** Critical | Security, data loss, blocking bug, unmet requirement |
| **P2** High | Significant bug, performance, partially met requirement |
| **P3** Medium | Code smell, scope drift, fragile requirement |
| **P4** Low | Stylistic, minor optimization |

## Report Format

```
## Verification Report: {task-ref}
**Status:** {PASS|PARTIAL|FAIL} | **Score:** {n}/10
**Requirements:** {met}/{total} met, {partial} partial, {unmet} unmet

### [P1-001] {title}
- Location: file:line | Category: {SECU-S|E|C|U|REQ-MISSING}
- Issue: {description} | Fix: {recommendation}

### Requirements Traceability
| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
```

## Examples

<example>
```bash
/rd3:dev-verify 0274
```
<commentary>Default: all 6 phases, presents findings, asks confirmation before fixing.</commentary>
</example>

<example>
```bash
/rd3:dev-verify 0274 --review-only
```
<commentary>Stops at Phase 4. Useful for CI gates or manual fixes.</commentary>
</example>

<example>
```bash
/rd3:dev-verify 0274 --skip-confirm --focus security
```
<commentary>Fixes automatically, SECU review constrained to Security only.</commentary>
</example>

## See Also

- **/rd3:dev-review** — Phase 7 code review (no requirements traceability)
- **/rd3:dev-fixall** — Fix all lint/type/test errors

## Platform Notes

- **Claude Code**: Parse `$ARGUMENTS` for flags. Delegate via `Skill()`.
- **Codex**: Run via Bash. Extract arguments from prompt context.
- **Gemini CLI**: Run via Bash. Arguments from TOML prompt template.
- **OpenClaw**: Run via Bash. Arguments via `command-dispatch` metadata.
- **OpenCode/Antigravity**: Run via Bash. Extract arguments from user message.
- **Script path** (non-Claude): `bun plugins/rd3/skills/functional-review/scripts/review.ts <task-ref> --focus <scope>`

**Note:** `$ARGUMENTS` and `Skill()` are Claude Code–only. Other platforms pass arguments via user message or prompt context.
