---
name: create new agent skill indexed-context
description: create new agent skill indexed-context
status: Refined
created_at: 2026-04-28T02:19:16.619Z
updated_at: 2026-04-28T02:19:16.619Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0390. create new agent skill indexed-context

### Background

Claude Code is powerful but it works blind. It doesn't know what a file contains until it opens it. It can't tell a 50-token config from a 2,000-token module. It reads the same file multiple times in one session without noticing. It has no index of your project, no memory of your corrections, and no awareness of what it already tried.

**OpenWolf** gives Claude a second brain: a file index so it knows what files contain before reading them, a learning memory that accumulates your preferences and past mistakes, and a token ledger that tracks everything. All through 6 invisible hook scripts that fire on every Claude action. OpenWolf also includes Design QC (screenshot-based design evaluation), Reframe (UI framework selection guidance), a daemon for cron tasks and live dashboard, and bug tracking memory.

OpenWolf is already installed globally (`npm install -g openwolf`). Its source code is available at `vendors/openwolf` for reference. The tool is licensed AGPL-3.0, but our skill only orchestrates its usage — no code is forked or modified.

**Goal:** Create a comprehensive agent skill `rd3:indexed-context` and a thin wrapper subagent `rd3:second-brain` that together give any coding agent (Claude Code, pi, Codex, OpenCode, OpenClaw, Antigravity) automatic access to OpenWolf's full feature set — file index, cerebrum memory, token tracking, Design QC, Reframe, daemon, dashboard, and bug tracking — without changing the agent's workflow.

### Requirements

#### R1. Source Code Review
- Perform a comprehensive code review of openwolf's source code at `vendors/openwolf/`
- Document the architecture: hooks layer, scanner, tracker, daemon, dashboard, CLI commands
- Identify key integration points: `.wolf/` file formats, hook stdin/stdout protocols, CLI commands
- Note platform-specific behaviors (Claude Code hooks, Node.js version requirements)

#### R2. Create Skill `rd3:indexed-context`
- Location: `plugins/rd3/skills/indexed-context/`
- **Scope: ALL openwolf features** — core hooks (6 lifecycle hooks), anatomy system, cerebrum memory, token tracking, Design QC, Reframe, daemon/cron, dashboard, bug tracking
- **Activation model: Always-on** — loads at session start, proactively provides context
- **Target platforms: All rd3-supported** — Claude Code, pi, Codex, OpenCode, OpenClaw, Antigravity
- Include installation prerequisite note (openwolf must be installed globally)
- Include CLI command reference for all openwolf commands
- Include `.wolf/` file format documentation so agents can read/write correctly
- Include hook behavior documentation so agents understand the enforcement layer
- Include token optimization patterns and best practices
- Include Design QC workflow (capture + evaluation separation)
- Include Reframe decision tree for framework selection
- Include daemon/cron setup and dashboard access guidance
- **After creation:** Delegate to `rd3:expert-skill` for evaluation and refinement

#### R3. Create Subagent `rd3:second-brain`
- Location: `plugins/rd3/agents/second-brain.md`
- **Role:** Thin auto-activation wrapper that injects `.wolf/` context into the agent's working context at session start
- **Responsibilities:**
  - Check if `.wolf/` directory exists; if not, suggest running `openwolf init`
  - Read and inject `anatomy.md`, `cerebrum.md`, `memory.md` summaries
  - Provide token-awareness hints based on `token-ledger.json`
  - Surface `buglog.json` patterns relevant to current task
- **Activation:** Always-on, triggered at session start
- **Does NOT duplicate skill logic** — delegates all knowledge to `rd3:indexed-context`
- **After creation:** Delegate to `rd3:expert-agent` for evaluation and refinement

#### R4. Quality Gates
- Skill must score ≥ B (80%) on `rd3:expert-skill` evaluation
- Subagent must score ≥ B (80%) on `rd3:expert-agent` evaluation
- Both must pass `bun run check` (lint + typecheck + test)
- No circular references between skill and subagent


### Q&A

**Q: Which openwolf features should the skill cover?**
A: All features — core hooks, anatomy, cerebrum, memory, token tracking, Design QC, Reframe, daemon/cron, dashboard, bug tracking.

**Q: Which platforms should be supported?**
A: All rd3-supported platforms: Claude Code, pi, Codex, OpenCode, OpenClaw, Antigravity.

**Q: How should the skill activate?**
A: Always-on — load at session start, proactively provide context to the coding agent.

**Q: AGPL-3.0 license concern?**
A: Minimal — skill only orchestrates usage, no code forked. Include install prerequisite note only.

**Q: Skill vs Subagent boundary?**
A: Skill owns all knowledge + documentation + CLI reference. Subagent owns auto-activation wrapper: check .wolf/ exists, read/inject context files, provide token hints, surface bug patterns.



### Design

**Architecture:**
```
rd3:second-brain (subagent - thin wrapper)
  └── reads: rd3:indexed-context (skill - all knowledge)
  └── reads: .wolf/ directory (openwolf state files)
  └── activates: at session start (always-on)
  └── injects: anatomy, cerebrum, memory, token hints into agent context
```

**No circular references:** Skill does not reference subagent. Subagent references skill via `skills: [rd3:indexed-context]`.

**Platform adaptation:** Skill uses platform-agnostic SKILL.md. Install scripts generate platform-specific companion files.



### Constraints

1. **License:** openwolf is AGPL-3.0 — skill orchestrates usage only, no code forked or modified
2. **Runtime dependency:** openwolf must be installed globally (`npm install -g openwolf`) + Node.js 20+
3. **No circular references:** Skill MUST NOT reference `rd3:second-brain` subagent
4. **Skill content only:** No executable code in skill — documentation, patterns, and CLI reference only
5. **File format fidelity:** `.wolf/` file formats documented from source, not assumed
6. **Platform compatibility:** Must work across all 6 rd3 platforms with install-script adaptation
7. **Scope boundary:** Skill documents openwolf features — it does not re-implement them



### Plan

1. Source code review of `vendors/openwolf/` — architecture, hooks, modules, CLI
2. Create skill `plugins/rd3/skills/indexed-context/` with SKILL.md + references
3. Create agent `plugins/rd3/agents/second-brain.md` as thin wrapper
4. Evaluate both with expert skills, fix issues
5. Verify no circular refs, run quality checks



### Review

**OpenWolf Architecture Review (R1)**

**6 Core Hooks** (pure Node.js file I/O, 5-10s timeout):
1. `session-start.ts` — Creates `_session.json`, appends session header to `memory.md`, increments session counter
2. `pre-read.ts` — Warns on repeated reads, shows anatomy descriptions, tracks hits/misses
3. `pre-write.ts` — Checks cerebrum Do-Not-Repeat patterns, surfaces relevant buglog entries
4. `post-read.ts` — Estimates token count, updates session tracker
5. `post-write.ts` — Updates `anatomy.md` (atomic write), appends to `memory.md`, auto-detects bug fixes, updates buglog
6. `stop.ts` — Writes session summary to `token-ledger.json`, checks missing bug logs, cerebrum freshness

**Key Modules:**
- `scanner/anatomy-scanner.ts` — Full project scan, file description extraction (multi-language), token estimation
- `scanner/description-extractor.ts` — Intelligent description from file content (JSDoc, docstrings, comments)
- `tracker/token-estimator.ts` — Char-to-token ratios (code: 3.5, prose: 4.0, mixed: 3.75)
- `tracker/token-ledger.ts` — Lifetime session tracking, savings estimation
- `tracker/waste-detector.ts` — Repeated reads, stale cerebrum, large reads
- `daemon/wolf-daemon.ts` — Background process for cron, file watching, dashboard
- `daemon/cron-engine.ts` — Scheduled tasks (anatomy rescan, memory consolidation, token audit)
- `designqc/designqc-capture.ts` — Puppeteer screenshots, dev server detection
- `buglog/bug-tracker.ts` + `bug-matcher.ts` — Bug encounter memory with similarity matching

**CLI Commands:** init, status, scan, dashboard, daemon (start/stop/restart/logs), cron (list/run/retry), update, restore, designqc, bug (search)

**`.wolf/` File Formats:**
- `anatomy.md` — Markdown sections per directory, entries: `- \`file\` — description (~N tok)`
- `cerebrum.md` — 4 sections: User Preferences, Key Learnings, Do-Not-Repeat, Decision Log
- `memory.md` — Append-only table with session headers
- `token-ledger.json` — Lifetime stats + per-session entries
- `buglog.json` — Bug entries with id, error, root_cause, fix, tags, occurrences
- `config.json` — openwolf configuration
- `identity.md` — Project name, AI role
- `OPENWOLF.md` — Master instructions Claude follows every turn
- `reframe-frameworks.md` — UI framework comparison knowledge base

**Integration Points:**
- Claude Code hooks registered via `.claude/settings.json` with `$CLAUDE_PROJECT_DIR`
- Hooks receive JSON on stdin, communicate via exit codes and stderr
- All writes use atomic temp+rename pattern
- Session state in `.wolf/hooks/_session.json` (ephemeral per session)



### Testing

**Verification performed:**

| Check | Result |
|-------|--------|
| No circular references (skill → agent) | ✅ PASS — skill does not reference agent |
| One-way dependency (agent → skill) | ✅ PASS — agent declares `skills: [rd3:indexed-context]` |
| File structure correct | ✅ PASS — SKILL.md, README.md, references/ |
| Frontmatter valid | ✅ PASS — all required fields present |
| No console.* calls | ✅ PASS — documentation-only skill |
| File extensions correct | ✅ PASS — all .md files |
| Pre-existing tests not broken | ✅ PASS — 4780 pass, 4 pre-existing fails |
| Expert skill evaluation ≥ B | ✅ PASS — Grade B (82/100) |
| Expert agent evaluation ≥ B | ✅ PASS — Grade B+ (~87/100) |



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Skill | plugins/rd3/skills/indexed-context/ | Lord Robb | 2026-04-28 |
| Agent | plugins/rd3/agents/second-brain.md | Lord Robb | 2026-04-28 |
| Reference | plugins/rd3/skills/indexed-context/references/hooks-protocol.md | Lord Robb | 2026-04-28 |

### References
