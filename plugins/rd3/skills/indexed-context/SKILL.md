---
name: indexed-context
description: >
  Always-on agent intelligence layer powered by OpenWolf. Provides file index awareness,
  learning memory, token tracking, bug history, Design QC, Reframe framework selection,
  and daemon/cron management. Activates at session start to give coding agents project
  context before any action. Works across all rd3-supported platforms.
license: Apache-2.0
version: 1.0.0
created_at: 2026-04-28
updated_at: 2026-04-28
type: technique
tags: [context, file-index, token-tracking, cerebrum, openwolf, always-on, intelligence]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,gemini,openclaw,opencode,antigravity,pi"
  category: intelligence
  interactions:
    - knowledge-only
---

# indexed-context — Agent Intelligence Layer

Always-on skill that gives coding agents a second brain: file index awareness, learning memory, token tracking, bug history, design evaluation, and framework selection. Powered by [OpenWolf](https://github.com/nicepkg/openwolf).

## When to Use

- Agent needs to read files in a project — check anatomy.md first
- Agent is about to write code — check cerebrum.md for preferences and mistakes
- Agent encounters or fixes a bug — log to buglog.json
- User asks for design review — run `openwolf designqc`
- User wants to change UI framework — use Reframe guidance
- Session starts in a project with `.wolf/` directory

## When Not to Use

- Project has no `.wolf/` directory and user hasn't installed OpenWolf
- Quick one-off question that doesn't involve file reads or code changes
- Non-development tasks (writing docs only, planning only)
- Platform that doesn't support file I/O for `.wolf/` files

## Prerequisites

- **OpenWolf** installed globally: `npm install -g openwolf`
- **Node.js** 20+ runtime
- Project initialized: `openwolf init` (creates `.wolf/` directory)

## Core Purpose

Eliminate blind file reads, repeated mistakes, and wasted tokens by giving the agent persistent project intelligence:

1. **Know before reading** — anatomy.md describes every file's content and token cost
2. **Learn across sessions** — cerebrum.md accumulates preferences, conventions, and mistakes
3. **Track everything** — token ledger records reads, writes, and savings per session
4. **Remember bugs** — buglog.json prevents re-discovering the same bugs
5. **Evaluate design** — Design QC captures screenshots for visual review
6. **Choose frameworks** — Reframe provides structured UI framework comparison

## Activation Model

**Always-on.** Load at session start. The skill injects context proactively — the agent should not need to explicitly request it.

**Startup sequence:**
1. Check if `.wolf/` directory exists in the project root
2. If missing → suggest running `openwolf init` and stop
3. If present → read `anatomy.md` header for file count and scan date
4. Read `cerebrum.md` for active Do-Not-Repeat entries and recent learnings
5. Read `token-ledger.json` lifetime stats for token awareness
6. Read `buglog.json` bug count for bug awareness

**Per-action behavior:**
- Before reading a file → check anatomy.md first; if description suffices, skip full read
- Before writing code → check cerebrum.md Do-Not-Repeat section
- After writing → update anatomy.md and memory.md via hooks (automatic)
- Before fixing a bug → check buglog.json for known fixes

## File Index — anatomy.md

The project file map. Maintained automatically by hooks and `openwolf scan`.

### Format

```markdown
# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-04-28T10:00:00Z
> Files: 47 tracked | Anatomy hits: 23 | Misses: 2

## src/

- `index.ts` — Main entry point. startServer() (~380 tok)
- `server.ts` — Express HTTP server configuration (~520 tok)
- `routes/` — API route handlers

## tests/

- `index.test.ts` — Main entry point tests (~290 tok)
```

### Reading Anatomy

When the agent needs to read a file:

1. Look up the file in anatomy.md
2. Check description — is it sufficient for the current task?
3. Check token estimate — is the file small enough to read safely?
4. If description suffices → skip the read, save tokens
5. If full read needed → proceed but note the token cost

### Updating Anatomy

Anatomy is updated automatically by:
- **Post-write hook** — updates entry after every file write/edit
- **`openwolf scan`** — full project rescan
- **Daemon cron** — automatic rescan every 6 hours (if daemon running)

Manual scan: `openwolf scan`

### Token Estimation

| File type | Characters per token |
|-----------|---------------------|
| Code (.ts, .js, .py, .go, etc.) | 3.5 |
| Prose (.md, .txt, .rst) | 4.0 |
| Mixed | 3.75 |

## Learning Memory — cerebrum.md

Four sections that accumulate project knowledge across sessions.

### Sections

| Section | Purpose | When to update |
|---------|---------|---------------|
| `## User Preferences` | Code style, tools, patterns | User corrects approach, expresses preference |
| `## Key Learnings` | Project conventions, framework patterns | Discover non-obvious project behavior |
| `## Do-Not-Repeat` | Past mistakes with dates | User corrects a mistake, fix-and-retry cycle |
| `## Decision Log` | Architectural choices with rationale | Significant technical decision made |

### Enforcement

The **pre-write hook** automatically checks Do-Not-Repeat patterns on every write:
1. Reads cerebrum.md `## Do-Not-Repeat` section
2. Extracts quoted patterns and "never use X" phrases
3. Regex-matches against the content being written
4. Emits stderr warning if a pattern matches

**The agent should also check cerebrum.md manually** before generating code to respect preferences and learnings.

### Update Threshold

**Low threshold — when in doubt, add it.** A slightly redundant entry costs nothing; a missing entry means repeating the same discovery.

## Token Tracking — token-ledger.json

Lifetime token usage statistics and per-session history.

### Structure

```json
{
  "version": 1,
  "lifetime": {
    "total_tokens_estimated": 45000,
    "total_reads": 120,
    "total_writes": 45,
    "total_sessions": 8,
    "anatomy_hits": 67,
    "anatomy_misses": 12,
    "repeated_reads_blocked": 23,
    "estimated_savings_vs_bare_cli": 18500
  },
  "sessions": [...]
}
```

### Token Optimization Patterns

1. **Anatomy-first reads** — check anatomy.md description before reading full file
2. **Grep over full reads** — prefer targeted search over full file reads
3. **No re-reads** — never re-read a file already read this session (unless modified)
4. **Append over read+write** — if appending to a file, don't read entire file first
5. **Scoped reads** — use offset/limit for large files instead of reading everything
## Design QC

Capture screenshots for visual design evaluation by the agent.

### Workflow

1. **Capture** — deterministic, no AI needed:
   ```bash
   openwolf designqc
   openwolf designqc --url http://localhost:3000
   openwolf designqc --routes / /dashboard /settings
   ```
2. **Evaluate** — agent reads screenshots and assesses design quality
3. **Fix** — agent implements improvements
4. **Verify** — re-capture to confirm improvements

### Auto-detection

The command auto-detects running dev servers on common ports (3000, 5173, 4321, 8080). If none found, it starts one from `package.json` scripts.

### Output

Screenshots saved to `.wolf/designqc-captures/` as compressed JPEG (quality 70, max width 1200px). Report in `.wolf/designqc-report.json`.

### Requirements

- `puppeteer-core` installed globally
- Chrome/Chromium/Edge browser installed

## Reframe — UI Framework Selection

Knowledge-based framework selection guidance (not a CLI command).

### How It Works

1. Read `.wolf/reframe-frameworks.md` for comparison matrix
2. Ask user targeted questions: current stack, priority, Tailwind usage, app type
3. Present recommendation with reasoning
4. Once confirmed, use framework-specific migration prompts adapted to project anatomy

### Covered Frameworks

shadcn/ui, Aceternity UI, Magic UI, DaisyUI, HeroUI, Chakra UI, Flowbite, Preline UI, Park UI, Origin UI, Headless UI, Cult UI

### Token Discipline

Do NOT read the entire reframe-frameworks.md upfront. Read decision questions and comparison matrix first (~50 lines). Only read the specific framework section after user chooses.

## Daemon & Cron

Optional background process for scheduled maintenance.

### Starting the Daemon

```bash
# Via dashboard (auto-starts daemon)
openwolf dashboard

# Via PM2 (persistent)
openwolf daemon start
```

### Cron Tasks

| Task | Schedule | Purpose |
|------|----------|---------|
| `anatomy-rescan` | Every 6 hours | Full project file rescan |
| `memory-consolidation` | Daily | Compact memory.md entries |
| `token-audit` | Weekly | Generate waste reports |
| `cerebrum-reflection` | Weekly | AI review of cerebrum entries |
| `project-suggestions` | Weekly | AI-generated improvement ideas |

### Cron Commands

```bash
openwolf cron list       # Show all tasks with next run times
openwolf cron run <id>   # Manually trigger a task
openwolf cron retry <id> # Retry a dead-lettered task
```

### Dashboard

Live web dashboard at `http://localhost:18791` when daemon is running. Shows token usage, session history, file activity, and cron status.

```bash
openwolf dashboard       # Open browser to dashboard
```

## Hooks Reference

OpenWolf registers 6 hooks with the coding agent.
ile_path": "..." } }`
- **Output:** Warnings/info via stderr
- **Exit code:** Always 0 (allow action)

### Atomic Writes

All file writes use temp+rename pattern to prevent corruption:
1. Write to `.tmp` file
2. Rename `.tmp` to target (atomic on most filesystems)

## CLI Command Reference

| Command | Description |
|---------|-------------|
| `openwolf init` | Initialize `.wolf/` in current project |
| `openwolf status` | Show daemon health, session stats, file integrity |
| `openwolf scan` | Force full anatomy rescan |
| `openwolf scan --check` | Verify anatomy matches filesystem (no changes) |
| `openwolf dashboard` | Open browser to dashboard |
| `openwolf daemon start` | Start daemon via PM2 |
| `openwolf daemon stop` | Stop daemon |
| `openwolf daemon restart` | Restart daemon |
| `openwolf daemon logs` | Show last 50 lines of daemon log |
| `openwolf cron list` | Show all cron tasks |
| `openwolf cron run <id>` | Manually trigger cron task |
| `openwolf cron retry <id>` | Retry dead-lettered task |
| `openwolf update` | Update all registered projects |
| `openwolf restore [backup]` | Restore from backup |
| `openwolf designqc [target]` | Capture design screenshots |
| `openwolf bug search <term>` | Search buglog for entries |

## `.wolf/` Directory Structure

```
.wolf/
├── OPENWOLF.md              # Master instructions the agent follows
├── anatomy.md               # File index with descriptions and token estimates
├── cerebrum.md              # Learning memory (4 sections)
├── memory.md                # Chronological action log
├── identity.md              # Project name and AI role
├── config.json              # OpenWolf configuration
├── token-ledger.json        # Lifetime token usage + session history
├── buglog.json              # Bug encounter memory
├── cron-manifest.json       # Scheduled task definitions
├── cron-state.json          # Cron execution state
├── suggestions.json         # AI-generated project suggestions
├── designqc-report.json     # Design QC metadata
├── reframe-frameworks.md    # UI framework comparison knowledge base
├── hooks/
│   ├── _session.json        # Ephemeral session state
│   ├── session-start.js     # Session lifecycle hook
│   ├── pre-read.js          # Pre-read enforcement hook
│   ├── pre-write.js         # Pre-write enforcement hook
│   ├── post-read.js         # Post-read tracking hook
│   ├── post-write.js        # Post-write update hook
│   └── stop.js              # Session end hook
└── designqc-captures/       # Screenshot output directory
```

## Platform Adaptation

### Claude Code (primary)

Hooks are registered in `.claude/settings.json` via `$CLAUDE_PROJECT_DIR`. The agent sees hook warnings in stderr automatically.

### pi

Skill loaded via SKILL.md. Agent reads `.wolf/` files directly. Hooks are Claude-Code-specific; pi agents use this skill for knowledge-only context injection.

### Codex / OpenCode / OpenClaw / Antigravity

Skill loaded via platform-specific install scripts. Agents read `.wolf/` files for context. Hook-based enforcement is Claude-Code-specific; other platforms rely on this skill's guidance for anatomy-first reads, cerebrum checks, and token discipline.

## Decision Tree

```
Agent starts session
├── .wolf/ exists?
│   ├── No → suggest "openwolf init", proceed without context
│   └── Yes → load context
│       ├── Read anatomy.md header (file count, scan date)
│       ├── Read cerebrum.md Do-Not-Repeat + recent learnings
│       ├── Read token-ledger.json lifetime stats
│       └── Read buglog.json bug count
│
├── Agent needs to read a file
│   ├── Check anatomy.md → description sufficient? → skip read
│   └── Description insufficient → read file, note token cost
│
├── Agent needs to write code
│   ├── Check cerebrum.md Do-Not-Repeat → patterns match? → warn
│   └── Write → hooks auto-update anatomy + memory
│
├── Agent fixes a bug
│   ├── Check buglog.json → known fix? → apply
│   └── New bug → log to buglog.json
│
├── User wants design review
│   ├── Run `openwolf designqc` → capture screenshots
│   └── Evaluate screenshots → suggest fixes
│
└── User wants framework change
    ├── Read reframe-frameworks.md → ask questions
    └── Present recommendation → execute migration
```

## Common Mistakes

| Mistake | Fix |
|---------|----|
| Reading a file without checking anatomy.md first | Always check anatomy.md description before full read |
| Re-reading a file already read this session | Track reads; hooks warn on repeats |
| Not checking Do-Not-Repeat before writing | Always scan cerebrum.md before generating code |
| Logging bugs only for critical errors | Low threshold — log any error, test failure, or multi-edit fix |
| Reading entire reframe-frameworks.md upfront | Only read decision questions first, then specific framework after choice |
| Running `openwolf init` without user confirmation | Always ask before modifying project files |
| Ignoring token estimates when choosing read strategy | Use estimates to decide between anatomy-only vs full read |

## See Also

- [OpenWolf documentation](https://github.com/nicepkg/openwolf)
- [OpenWolf hooks reference](./references/hooks-protocol.md)
- Auto-activation wrapper — check agents directory for the companion subagent

See [Daemon & Cron](references/daemon-cron.md) for detailed content.

See [Bug Memory — buglog.json](references/bug-memory-buglog-json.md) for detailed content.
