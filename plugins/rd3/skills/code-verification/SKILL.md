---
name: code-verification
description: Unified code verification skill — combines Phase 7 SECU code review + Phase 8 requirements traceability with findings management. Supports both source-oriented (rd3:dev-review) and task-oriented (rd3:dev-verify) modes.
license: Apache-2.0
version: 1.0.0
created_at: "2026-04-15"
updated_at: "2026-04-15"
platform: rd3
type: technique
tags: [verification, review, secu, requirements, traceability, phase-7, phase-8]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,openclaw,opencode,antigravity,pi"
  category: verification
  interactions: [reviewer, pipeline]
  severity_levels: [P1, P2, P3, P4]
see_also:
  - rd3:code-review-common
  - rd3:functional-review
  - rd3:bdd-workflow
  - rd3:dev-fixall
  - rd3:run-acp
---

# rd3:code-verification — Unified Code Verification

Provides the canonical SECU analysis engine, findings management, requirements traceability, verdict logic, and task file update patterns for both `rd3:dev-review` and `rd3:dev-verify` commands.

## When to Use

Activate `rd3:code-verification` (via `rd3:dev-review` or `rd3:dev-verify` commands) when:

**For code quality review only:**
- Reviewing code via SECU framework (Security/Efficiency/Correctness/Usability)
- Getting findings written to a new or existing task file
- Optional: auto-fix pass with blockers-first or all strategy

**For verification with requirements traceability:**
- Verifying task implementation against task requirements
- Running Phase 7 (SECU) + Phase 8 (requirements traceability) in one pass
- Checking scope drift between requirements and implementation
- Optional: BDD scenario check if feature list exists in task
- Optional: auto-fix pass after verdict (with `--fix`)

**Trigger phrases:** "code review", "verify task", "SECU analysis", "review findings", "requirements traceability", "check implementation"

## Quick Start

```bash
# Source-oriented review (via rd3:dev-review)
Skill(skill="rd3:code-verification", args="--mode source --input src/auth/ --fix blockers-first")

# Source-oriented review with focus (security audit)
Skill(skill="rd3:code-verification", args="--mode source --input src/auth/ --focus security")

# Task-oriented verification (via rd3:dev-verify)
Skill(skill="rd3:code-verification", args="--mode verify --task-ref 0274 --mode-verify full")

# Verify with auto-fix after verdict
Skill(skill="rd3:code-verification", args="--mode verify --task-ref 0274 --fix blockers-first")

# Verify with BDD
Skill(skill="rd3:code-verification", args="--mode verify --task-ref 0274 --bdd true")
```

## Overview

This skill is the **single source of truth** for verification workflow logic. It handles:

| Capability | Description |
|-----------|-------------|
| SECU Analysis | 4-dimension code review (Security/Efficiency/Correctness/Usability) |
| P-Classification | Severity assignment (P1–P4) with auto-fix guidance |
| Requirements Traceability | Map requirements to implementation evidence |
| Findings Management | Build, format, and write findings to task files |
| Verdict Logic | PASS / PARTIAL / FAIL determination |
| Task File Updates | `tasks update` patterns for Review + Requirements sections |

Two modes:

| Mode | Entry Point | Input | Output |
|------|------------|-------|--------|
| `source` | `rd3:dev-review` | Path or directory only (no task-ref) | New findings task |
| `verify` | `rd3:dev-verify` | Task reference (WBS or .md) | Findings written to original task |

## Workflows

Two workflow modes. See reference files for full step-by-step details:

| Mode | Description | Reference |
|------|-------------|-----------|
| `source` | Source-oriented code review | `references/workflow-source-oriented-review-mode-source.md` |
| `verify` | Task-oriented verification | `references/workflow-task-oriented-verification-mode-verify.md` |

**Interaction steps:**
- Source mode: `Step 1` (input) → `Step 2` (task create) → `Step 3` (SECU) → `Step 4` (findings) → `Step 5` (fix pass) → `Step 6` (gate) → `Step 7` (verdict) → `Step 8` (status)
- Verify mode: `Step 1` (load task) → `Step 2` (Phase 7 SECU) → `Step 3` (Phase 8 traceability) → `Step 4` (BDD) → `Step 5` (merge) → `Step 6` (write findings) → `Step 7` (gate) → `Step 8` (verdict) → `Step 9` (show conclusion) → `Step 10` (fix pass if --fix) → `Step 11` (post-fix status)

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--focus` | No | `all` | SECU dimensions to analyze: `all`, `security`, `efficiency`, `correctness`, `usability`, or comma-separated list |
| `--mode` | Yes | — | `source` (code review only) or `verify` (review + traceability) |
| `--input` | No | `src/` | For source mode: directory path or file path (no task-ref) |
| `--task-ref` | No | — | For verify mode: WBS or .md file path |
| `--fix` | No | `none` | Fix strategy: `none`, `blockers-first`, `all` (both modes; in verify mode runs after verdict) |
| `--mode-verify` | No | `full` | For verify mode: `full`, `review-only`, `func-only` |
| `--bdd` | No | `false` | For verify mode: enable BDD scenario check |
| `--auto` | No | `false` | Skip confirmations |
| `--channel` | No | `auto` | Execution channel: `auto`, `current`, or remote agent |

## Shared Reference: Focus Filter (`--focus`)

Controls which SECU dimensions to analyze. Default is `all`.

| Value | Dimensions Analyzed |
|-------|--------------------|
| `all` | Security + Efficiency + Correctness + Usability (default) |
| `security` | Security only |
| `efficiency` | Efficiency only |
| `correctness` | Correctness only |
| `usability` | Usability only |
| `security,efficiency` | Two specific dimensions |
| `correctness,usability` | Two specific dimensions |

**Parsing:** Split by comma, trim whitespace, normalize to lowercase.
**Conditional execution:** If a dimension is NOT in the focus set, skip all checks for that dimension.

**Example:**
```bash
Skill(skill="rd3:code-verification", args="--mode source --input src/auth/ --focus security")
```

## Shared Reference: SECU Analysis Framework

The **SECU framework** is the canonical code analysis engine used by both modes.

**Conditional execution:** If `--focus` excludes a dimension, skip all checks for that dimension.

### Security  (P1/P2 priority)

| Sub-check | Examples | P-Priority |
|-----------|----------|------------|
| Injection | SQLi (`' OR 1=1`), XSS (`innerHTML`, `dangerouslySetInnerHTML`), template injection, command injection | P1 |
| Auth/Authz | Broken auth, IDOR, missing authorization checks, insecure JWT validation | P1 |
| Secrets | Hardcoded API keys, tokens, passwords, private keys, AWS credentials | P1 |
| Data Exposure | Missing PII validation, over-logging sensitive data, missing rate limiting | P2 |
| Dependencies | Known CVEs in node_modules or bun.lockb | P1/P2 |

**Detection patterns:**

```bash
# Hardcoded secrets
rg -n 'api[_-]?key|secret|token|password|credential' --type ts | rg -v 'process\.env|\\$[A-Z_]+' | head -20

# SQL injection
rg -n "'" --type ts | rg 'query|sql|where|select' | rg '\${.*}|\+.*\+.*|format' | head -10

# XSS
rg -n 'innerHTML|dangerouslySetInnerHTML|document\.write' --type ts | head -10
```

### Efficiency  (P2/P3 priority)

| Sub-check | Examples | P-Priority |
|-----------|----------|------------|
| Algorithm | O(n²) where O(n) possible, recursive without memoization | P2 |
| N+1 Queries | Loop inside loop with DB/repository calls | P2 |
| Missing Caching | Repeated computations, redundant API calls | P3 |
| Blocking I/O | Sync fs in hot path, blocking network calls | P3 |
| Memory | Unbounded array growth, missing cleanup | P3 |

**Detection patterns:**

```bash
# N+1 queries
rg -n 'for.*of.*await|forEach.*await' --type ts | head -10
# Look for patterns like: for (const id of ids) { await db.find(id) }

# Unbounded growth
rg -n '\.push\(|array\.concat|\.append' --type ts | head -10
```

### Correctness  (P1/P2 priority)

| Sub-check | Examples | P-Priority |
|-----------|----------|------------|
| Logic Bugs | Off-by-one, wrong operator, inverted condition, missing else | P1 |
| Edge Cases | null/undefined, empty input, zero division, overflow | P2 |
| Error Handling | Swallowed exceptions, empty catch blocks, missing error propagation | P2 |
| Concurrency | Race conditions, shared mutable state, deadlocks | P1 |
| Type Safety | Excessive `any`, missing null checks, unsafe casts | P2 |

**Detection patterns:**

```bash
# Empty catch blocks
rg -n 'catch.*\{[\s\n]*\}' --type ts | head -10

# Excessive any
rg -n ': any\b' --type ts | head -20

# Missing null checks
rg -n '\.[a-z]+\(' --type ts | rg -v '\?\.' | rg '\.' | head -10
```

### Usability  (P3/P4 priority)

| Sub-check | Examples | P-Priority |
|-----------|----------|------------|
| API Clarity | Confusing signatures, missing JSDoc, inconsistent naming | P3 |
| Error Messages | Generic stack traces, no user-facing messages | P3 |
| Maintainability | Copy-paste duplication, magic numbers, missing constants | P4 |
| Testability | Tight coupling, hardcoded deps, untestable code | P3 |

## Shared Reference: P-Classification Table

| Level | Label | Criteria | Auto-fix? |
|-------|-------|----------|-----------|
| P1 | Blocker | Security vuln, data loss risk, blocking bug | Yes, if mechanical |
| P2 | Warning | Performance issue, significant bug | Yes, if mechanical |
| P3 | Info | Code smell, test gap, maintainability | Manual review |
| P4 | Suggestion | Stylistic improvement, minor optimization | Optional |

## Shared Reference: Findings Table Format

Findings are presented in a markdown table sorted by P-level.

```markdown
| # | Title | Dimension | Location | Recommendation |
|---|-------|-----------|----------|----------------|
| 1 | Hardcoded API key | Security | src/config.ts:12 | Remove key; use $API_KEY env variable |
| 2 | N+1 query in user list | Efficiency | src/db/users.ts:38 | Add batch loading with DataLoader pattern |
| 3 | Missing null check | Correctness | src/api/handler.ts:56 | Add ?? guard before property access |
```

**Columns:**
- **#**: Sequential number
- **Title**: Brief finding title
- **Dimension**: SECU category — `Security` / `Efficiency` / `Correctness` / `Usability`
- **Location**: `file:line` — be specific
- **Recommendation**: Specific fix action, not vague

## Shared Reference: Task File Update Patterns

### Build Review Section

```bash
cat > /tmp/review_findings.md << 'EOF'
## Review — {date}

**Status:** {n} findings
**Scope:** {scope}
**Mode:** {source|verify}
**Channel:** {inline|<agent>}
**Gate:** `bun run check` → {pass|fail}

### P1 — Blockers
| # | Title | Dimension | Location | Recommendation |
|---|-------|-----------|----------|----------------|
### P2 — Warnings
| # | Title | Dimension | Location | Recommendation |
|---|-------|-----------|----------|----------------|
### P3 — Info
| # | Title | Dimension | Location | Recommendation |
|---|-------|-----------|----------|----------------|
### P4 — Suggestions
| # | Title | Dimension | Location | Recommendation |
|---|-------|-----------|----------|----------------|
EOF
```

Append findings rows in format: `| N | <title> | <dimension> | <file:line> | <recommendation> |`

### Update Task File

```bash
# For source mode (append to existing task):
tasks update "$WBS" --section Review --from-file /tmp/review_findings.md

# For source mode (new findings task):
tasks update "$FINDINGS_WBS" --section Review --from-file /tmp/review_findings.md

# For verify mode (original task):
tasks update "$WBS" --section Review --from-file /tmp/review_findings.md
```

### Requirements Section Update (verify mode only)

```bash
cat > /tmp/requirements_verdict.md << 'EOF'
## Requirements

- [x] **R1**: {text} → **MET** | Evidence: `src/auth.ts:42 createUser()`
- [ ] **R2**: {text} → **UNMET** | Missing: no test coverage
- [~] **R3**: {text} → **PARTIAL** | Evidence: `src/api.ts:38` (impl only, no test)
EOF

tasks update "$WBS" --section Requirements --from-file /tmp/requirements_verdict.md
```

## Shared Reference: Gate Check

Always run after fix pass:

```bash
if ! bun run check; then
  echo "Gate check failed. Fix remaining issues before continuing."
  exit 1
fi
```
# Channel Delegation Pattern

For `--channel` values other than `current` or `auto`:

```bash
if [[ "$CHANNEL" != "current" ]] && [[ "$CHANNEL" != "auto" ]]; then
  # Build delegated prompt
  if [[ "$MODE" == "source" ]]; then
    DELEGATED_PROMPT="Source-oriented code review for: $INPUT
    Scope: $REVIEW_SCOPE
    Fix mode: $FIX_MODE
    Run SECU analysis. Write findings to task file.
    Then run: bun run check"
  else
    DELEGATED_PROMPT="Task-oriented verification for: $TASK_REF
    Mode: $MODE
    Run SECU analysis + requirements traceability.
    Write findings to original task file.
    Then run: bun run check"
  fi
  
  Skill(skill="rd3:run-acp", args="$CHANNEL exec \"$DELEGATED_PROMPT\"")
fi
```

## Circular Reference Prevention

**Dogfood rule**: When verifying code that includes `rd3:run-acp` or `rd3:code-verification` itself, use `--channel current` and run inline. Delegating would create a circular dependency.

## Additional Resources

| Resource | Description |
|---------|-------------|
| SECU Framework | 4-dimension code quality model (Security/Efficiency/Correctness/Usability) |
| OWASP Top 10 | Security vulnerability reference for SECU Security dimension |
| P1-P4 Classification | Severity levels for findings (Blocker/Warning/Info/Suggestion) |
| rd3 Tasks CLI | Task file management for findings output |

## See Also

- **rd3:code-review-common**: SECU framework source (reference for patterns)
- **rd3:functional-review**: Requirements traceability (Phase 8 reference)
- **rd3:bdd-workflow**: BDD scenario execution
- **rd3:dev-fixall**: Systematic lint/type/test fixer (used in fix pass)
- **rd3:run-acp**: Cross-channel delegation

See [Workflow: Source-Oriented Review (`--mode source`)](references/workflow-source-oriented-review-mode-source.md) for detailed content.

See [Workflow: Task-Oriented Verification (`--mode verify`)](references/workflow-task-oriented-verification-mode-verify.md) for detailed content.
