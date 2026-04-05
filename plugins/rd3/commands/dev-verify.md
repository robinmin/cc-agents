---
description: Verify a task via review, traceability, and optional fixes
argument-hint: "<task-ref> [--skip-review] [--review-only] [--skip-confirm] [--channel <auto|current|claude-code|codex|openclaw|opencode|antigravity|pi>]"
allowed-tools: ["Read", "Glob", "Bash", "Edit", "Skill"]
---

# Dev Verify

Meta-command for final task verification. Optionally runs Phase 7 code review, always runs requirements traceability, then offers an optional remediation pass before the task is marked Done.

**Coordinates:** `/rd3:dev-review` + `rd3:functional-review` + optional local fix pass

## When to Use

- After implementation, before marking a task Done
- Needing one command that checks both code quality and requirements completeness
- Suspecting scope drift between requirements and implementation

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `task-ref` | Yes | — | WBS number or task file path |
| `--skip-review` | No | `false` | Skip `/rd3:dev-review`; run functional verification only |
| `--review-only` | No | `false` | Report findings only; do NOT apply fixes |
| `--skip-confirm` | No | `false` | Skip confirmation, fix immediately |
| `--channel <auto\|current\|claude-code\|codex\|openclaw\|opencode\|antigravity\|pi>` | No | `auto` | Execution channel for the `/rd3:dev-review` leg only |

Resolve `task-ref`: digits → glob `docs/tasks2/{digits}_*.md`, ends with `.md` → use as-is.

## Workflow

Parse `$ARGUMENTS` for `task-ref`, `--skip-review`, `--review-only`, `--skip-confirm`, and `--channel`.

### Step 1: Resolve Task Scope

Resolve `task-ref` to a task file. Read the task frontmatter and Requirements/Design/Solution sections so downstream review and traceability use the same scope.

### Step 2: Optional Code Review
Unless `--skip-review` is present, run `/rd3:dev-review` semantics first.

```text
Skill(skill="rd3:orchestration-v2", args="{task-ref} --preset review --channel {channel}")
```

This step owns implementation-quality review only:
- Security, correctness, performance, maintainability
- Phase 7 gate behavior and delegated execution channel
- Findings from `rd3:code-review-common`

### Step 3: Functional Review
Run `rd3:functional-review` on the active execution context to verify requirements traceability and completeness.

```text
Skill(skill="rd3:functional-review", args="{task-ref}")
```

This step owns requirements verification only:
- Requirement-by-requirement met/partial/unmet verdicts
- Specific evidence (`file:line`, symbol names, tests)
- Scope drift between task requirements and delivered code

### Step 4: Unified Verification Report
Merge the outputs from Step 2 and Step 3 into one ordered report:
- Phase 7 findings from `/rd3:dev-review`
- Phase 8 verdict from `rd3:functional-review`
- A final summary: `PASS`, `PARTIAL`, or `FAIL`

- `--review-only` → **STOP**
- `--skip-confirm` → proceed to Step 5
- Otherwise → ask user to confirm

### Step 5: Optional Fix Pass
If the user confirms, or `--skip-confirm` is set, fix the combined findings locally in severity order:
- Blockers from `dev-review`
- Unmet/partial requirements from `functional-review`
- Regression tests and validation updates needed to close the gap

Validate with `bun run check` after each fix batch. If remediation changes code, rerun:
- `/rd3:dev-review` unless `--skip-review`
- `rd3:functional-review`

### Step 6: Final Verdict
Produce a final verification verdict after the review/traceability loop completes.

| Verdict | Condition |
|---------|-----------|
| **PASS** | Functional review passes and no blocking review findings remain |
| **PARTIAL** | Requirements are partial or only non-blocking review findings remain |
| **FAIL** | Unmet requirements or blocking review findings remain |

## Ownership Boundaries

| Concern | Owned By |
|---------|----------|
| Code quality, bugs, security, performance | `/rd3:dev-review` |
| Requirements completeness, traceability, scope drift | `rd3:functional-review` |
| Final remediation loop | `/rd3:dev-verify` |

## Report Format

```text
## Verification Report: {task-ref}
**Status:** {PASS|PARTIAL|FAIL}
**Code Review:** {skipped|passed|findings}
**Functional Review:** {pass|partial|fail}

### Phase 7 Findings
- {severity} {title} — {file:line}

### Phase 8 Traceability
| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|

### Final Verdict
- Decision: {PASS|PARTIAL|FAIL}
- Next action: {mark done|fix remaining findings|re-run verification}
```

## Examples

<example>
```bash
/rd3:dev-verify 0274
```
<commentary>Runs dev-review first, then functional-review, then asks before remediation.</commentary>
</example>

<example>
```bash
/rd3:dev-verify 0274 --skip-review --review-only
```
<commentary>Runs functional verification only and reports results without applying fixes.</commentary>
</example>

<example>
```bash
/rd3:dev-verify 0274 --skip-confirm --channel codex
```
<commentary>Delegates the review leg to Codex, runs functional review in the active execution context, then applies fixes without asking again.</commentary>
</example>

## See Also

- **/rd3:dev-review** — Phase 7 code review shortcut
- **/rd3:dev-run** — Full pipeline execution when you want orchestration to own all phases
- **/rd3:dev-fixall** — Fix all lint/type/test errors

## Platform Notes

- **Claude Code**: Coordinate `/rd3:dev-review` and `Skill("rd3:functional-review", ...)`, then apply fixes locally if requested.
- **Other platforms**: Treat this command as an orchestration prompt template. The review leg may delegate remotely; functional review and remediation stay on the active execution context.
- **Channel behavior**: `--channel` applies only to the review leg. Functional review runs on the active execution context; use `auto` for the configured default backend.
