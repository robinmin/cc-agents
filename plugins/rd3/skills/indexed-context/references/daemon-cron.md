---
name: daemon-cron
description: "Extracted section: Daemon & Cron"
see_also:
  - rd3:indexed-context
---

# Daemon & Cron

Optional background process for scheduled maintenance.

## Starting the Daemon

```bash
# Via dashboard (auto-starts daemon)
openwolf dashboard

# Via PM2 (persistent)
openwolf daemon start
```

## Cron Tasks

| Task | Schedule | Purpose |
|------|----------|---------|
| `anatomy-rescan` | Every 6 hours | Full project file rescan |
| `memory-consolidation` | Daily | Compact memory.md entries |
| `token-audit` | Weekly | Generate waste reports |
| `cerebrum-reflection` | Weekly | AI review of cerebrum entries |
| `project-suggestions` | Weekly | AI-generated improvement ideas |

## Cron Commands

```bash
openwolf cron list       # Show all tasks with next run times
openwolf cron run <id>   # Manually trigger a task
openwolf cron retry <id> # Retry a dead-lettered task
```

## Dashboard

Live web dashboard at `http://localhost:18791` when daemon is running. Shows token usage, session history, file activity, and cron status.

```bash
openwolf dashboard       # Open browser to dashboard
```

## AI Tasks

The daemon's AI tasks (`cerebrum-reflection` and `project-suggestions`) use `claude -p` to invoke the Claude CLI. These use your Claude subscription credentials — not API credits.

If `ANTHROPIC_API_KEY` is set in your environment, OpenWolf automatically strips it when spawning `claude -p` to ensure the subscription OAuth token is used instead.
