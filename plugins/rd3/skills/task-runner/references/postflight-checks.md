# Post-Flight Completion Gate Checks

Deterministic checks executed by `scripts/postflight-check.ts` before the `done` transition. Closes the "early-report-finish" reliability gap.

## Check Tiers

| Tier | When Active | Checks | Purpose |
|------|-------------|--------|---------|
| **Mandatory** | Always — every `Done` transition | #1, #3, #4 | Cheap defense-in-depth. Cannot be disabled. |
| **Full audit** | **Default-on** (v1.1+); skip with `--no-postflight-verify` | All 7 | Comprehensive completion gate including testing freshness, coverage, drift, delegation reconciliation. |

The mandatory subset runs even when the operator opts out of the full audit with `--no-postflight-verify`. It exists because the most common early-report-complete failures (hollow sections, `PARTIAL` verdicts, no-diff "fixes") are catchable by three sub-second checks.

## Gate Position

```
Stage 4: Verify (returns PASS)
     ↓
[Default-on, skip with --no-postflight-verify] Stage 5 full audit (#1–#7)
     ↓
[Always] Mandatory subset (#1, #3, #4)
     ↓
  tasks update <WBS> done  (only if both gates pass)
```

## Check Catalog

| # | Tier | Check | Source of Truth | Blocker on Fail |
|---|------|-------|-----------------|-----------------|
| 1 | **Mandatory** | All required task sections populated | `tasks check <WBS> --json` | YES |
| 2 | Full audit | Testing evidence not stale | Test timestamp vs last code mtime | YES |
| 3 | **Mandatory** | Verification verdict equals `PASS` (not `PARTIAL`) | Stage 4 output | YES |
| 4 | **Mandatory** | Code changes exist since task start | `git diff <start-commit>..HEAD` non-empty (skipped for `research` preset) | YES |
| 5 | Full audit | No uncommitted unrelated drift | `git status` vs expected changed paths | WARN |
| 6 | Full audit | Coverage threshold met if `--coverage` set | Re-read test evidence from `## Testing` | YES |
| 7 | Full audit | Delegated evidence reconciled locally | Parse delegated outputs in task file | WARN |

## Invocation

```bash
# Mandatory subset only (always run by task-runner before Done)
bun postflight-check.ts <WBS> --mandatory-only [--start-commit <sha>] [--preset <name>]

# Full audit (Stage 5)
bun postflight-check.ts <WBS> [--coverage <n>] [--start-commit <sha>] [--delegation-used] [--preset <name>]
```

## Verdict Schema

```typescript
interface PostflightVerdict {
  verdict: "PASS" | "BLOCKED";
  checks: Array<{
    name: string;              // e.g. "verification-verdict-pass"
    status: "pass" | "fail" | "warn" | "skip";
    evidence: string;          // Concrete evidence string
    severity: "blocker" | "warn";
    remediation?: string;      // Suggested next action if failed
  }>;
  blockers: Array<{
    check: string;
    reason: string;
    evidence: string;
  }>;
  task_status_recommended: "Done" | "Testing" | "WIP";
}
```

## Blocker Behavior

When `verdict === "BLOCKED"`:

1. Task remains in `Testing` (NOT transitioned to `Done`)
2. `task-runner` writes a `## Completion Blockers` section to the task file listing failures
3. Exit with non-zero code if `--auto`

### Completion Blockers Section Template

```markdown
## Completion Blockers

Post-flight gate failed at <timestamp>. Task not transitioned to `Done`.

- **Check:** <check-name>
  - **Reason:** <why it failed>
  - **Evidence:** <concrete output>
  - **Remediation:** <suggested action>
```

## Warn Behavior

When a check is `warn`:

1. Log the warning
2. Do NOT block `Done` transition
3. Include warning in verdict output for observability

## Skip Behavior

Checks marked `skip` when not applicable (e.g., coverage threshold check when `--coverage` not set).

## Per-Check Detail

### 1. Task Sections Populated

- **Command:** `tasks check <WBS> --json`
- **Pass criteria:** All required sections non-empty per `rd3:tasks` rules
- **Fail remediation:** Backfill missing sections using guards helper

### 2. Testing Evidence Freshness

- **Check:** Compare timestamp of last git commit touching code vs timestamp in `## Testing` section (or mtime of test artifact)
- **Pass criteria:** Testing evidence timestamp ≥ last code change timestamp
- **Fail remediation:** Re-run tests via `rd3:sys-testing`

### 3. Verification Verdict

- **Check:** Parse `## Review` section for verdict keyword
- **Pass criteria:** Contains `PASS` (not `PARTIAL` or `FAIL`)
- **Fail remediation:** Re-run verification or address review findings

### 4. Code Changes Exist

- **Command:** `git diff <task-start-commit>..HEAD --stat`
- **Pass criteria:** Non-empty diff
- **Skip:** When `--start-commit` is omitted, or when `--preset research` is set
- **Fail remediation:** Implement the task or use `--preset research` for research-only tasks

### 5. Uncommitted Drift

- **Command:** `git status --porcelain`
- **Pass criteria:** Only files expected by task scope are modified/untracked
- **Warn remediation:** Review and commit or stash unrelated changes

### 6. Coverage Threshold

- **Check:** If `--coverage <n>` set, parse `## Testing` for coverage percentage
- **Pass criteria:** Coverage ≥ threshold
- **Fail remediation:** Add tests to meet threshold

### 7. Delegated Evidence Reconciliation

- **Check:** If delegation was used, confirm `Solution`, `Plan`, `Review`, `Testing` updated locally
- **Pass criteria:** All expected sections contain current content
- **Warn remediation:** Fetch delegated output and merge into task file

## Exit Codes (when script invoked directly from CI)

| Code | Meaning |
|------|---------|
| 0 | `PASS` — all blocker-severity checks passed |
| 1 | `BLOCKED` — at least one blocker failed |
| 2 | Script error (I/O, parse failure, task not found) |
