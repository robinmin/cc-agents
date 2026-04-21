---
description: Generate daily summary reports from AI coding agent usage data, git history, and user annotations. Orchestrates ccusage CLI and git commands to produce structured markdown summaries.
argument-hint: "[--date YYYY-MM-DD] [--dry-run] [--output <path>] [--no-git] [--no-ccusage]"
allowed-tools: ["Read", "Glob", "Grep", "Bash", "Write"]
---

# Dev Daily Summary

Generate a structured daily summary report combining token usage data, git history, and your annotations. This is designed to be run at the **end of your workday** or first thing the next morning.

## When to Use

- End of day wrap-up before finishing work
- Morning review of previous day's activity
- Tracking AI coding patterns for optimization
- Generating personal productivity reports

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--date YYYY-MM-DD` | No | Target date (default: today, also: `yesterday`) |
| `--dry-run` | No | Preview summary without writing file |
| `--output <path>` | No | Write to custom path instead of default |
| `--no-git` | No | Skip git history collection |
| `--no-ccusage` | No | Skip token usage collection |

## Data Sources

| Source | Tool | Data Retrieved |
|--------|------|---------------|
| Claude Code usage | ccusage daily | Tokens, cost, conversations |
| Git history | git log/diff | Commits, files changed |
| User annotations | Interactive prompt | Learnings, issues, pending |

## Interactive Prompts

When you run this command, you'll be prompted for:

```
1. What did you learn today?
2. What issues did you fix?
3. What's pending for tomorrow?
```

Press **Enter** to skip any annotation.

## Output

**File:** `docs/daily/summary_yyyymmdd.md`

**Sections:**

- **Meta** — Date, platforms detected
- **Token Usage** — Input/output/cache tokens, estimated cost
- **Git Activity** — Commits, files changed, insertions/deletions
- **Commits** — List of commits with hash and message
- **Learnings** — What you learned (optional)
- **Issues Fixed** — Problems resolved (optional)
- **Pending** — Tomorrow's agenda (optional)

## Examples

```bash
# Generate today's summary
/rd3:dev-daily-summary

# Generate yesterday's summary
/rd3:dev-daily-summary --date yesterday

# Preview without writing
/rd3:dev-daily-summary --dry-run

# Summary for a specific date
/rd3:dev-daily-summary --date 2026-04-17
```

## Prerequisites

- **ccusage** must be installed for token usage data
- **git** must be available for commit history
- `docs/daily/` directory will be created if it doesn't exist

## See Also

- **rd3:dev-changelog**: Generate changelogs from git commits
- **rd3:handover**: Generate handover documents when blocked
- **rd3:tasks**: Task file management
