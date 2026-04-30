# MEMORY — Long-Term Context

> **Note:** This file is **reference-only**. The install script does NOT concatenate it into the deployed AGENTS.md / CLAUDE.md. Each target coding agent (Claude Code, Codex, Gemini, etc.) maintains its own persistent memory at the install location. Use this file as a seed template when bootstrapping a new agent.

## Purpose

- **Daily working notes** live in `memory/YYYY-MM-DD.md` (append-only, per session).
- **Long-term curated facts** live in this file (`MEMORY.md`) — promoted from daily notes after 3+ confirmations or when the fact is a non-obvious workaround.
- **What the agent knows about Robin from session 1** lives in `USER.md` — distinct from learned facts, which live here.

## Seed Examples (replace with real entries before first use)

### Projects & Active Systems

```
- cc-agents (this repo): /Users/robin/projects/cc-agents
  - Stack: Bun + TypeScript + Biome
  - Pre-commit gate: `bun run check` (lint + typecheck + test)
  - Plugin layout: plugins/{rd3,wt,...}/skills, agents, commands
  - Active phase: rd3; rd2 deprecated; rd uninstalled

- Project X: /path/to/project
  - Tech: ...
  - Key services: ...
  - Quirks: ...
```

### Naming & Convention Patterns

```
- Plugin entities use {plugin}-{name} format (e.g., rd3-cc-agents).
- Claude Code uses colons (rd3:cc-agents); install scripts rewrite to hyphens for other platforms.
- Skill names MUST be unique within a plugin across all entity types.
```

### Architecture Decisions (with rationale)

```
- Decision: SOUL/IDENTITY/AGENTS/USER are concatenated, not separate files in deployed install.
  Why: Single CLAUDE.md is what Claude Code reads; multi-file model only fits OpenClaw.
  Source: scripts/command/magents.sh:46-51.

- Decision: V8 function coverage requires explicit empty constructors with biome suppression.
  Why: V8 doesn't count implicit constructors; drops % Funcs below 90% threshold.
  Suppression: `biome-ignore lint/complexity/noUselessConstructor` (only permitted exception).
```

### Known Workarounds & Gotchas

```
- `import()` worker leak in Bun's V8 coverage tracker:
  Mitigation: prefer mock loader pattern (see inline.test.ts); use afterAll not afterEach.

- `git diff` external diff died:
  Workaround: GIT_EXTERNAL_DIFF=cat git --no-pager diff <file>
```

### Key Contacts & Roles

```
- (Add as relationships emerge — name, role, channel, what they know about.)
```

### Abbreviations & Jargon

```
- WBS — Work Breakdown Structure (used in rd3:tasks).
- UMAM — Universal Main Agent Model (cc-magents internal representation).
- UAM — Universal Agent Model (cc-agents subagent representation; frontmatter-based, 8-section anatomy).
- MECE — Mutually Exclusive, Collectively Exhaustive.
```

### Confirmed Preferences (promoted from daily memory)

```
- Robin prefers conventional commits with scoped prefixes (e.g., fix(tasks): …).
- Robin prefers tables over prose when comparing options (3+ options).
- Robin's "Hmm" or "Wait" = skeptical pushback; re-examine before proceeding.
```

## Curation Rules

- **Promote to MEMORY.md when:** a preference is confirmed 3+ times; a workaround prevents recurring failure; a project convention is documented in code review or commits.
- **Demote / remove when:** a project is archived; a workaround is fixed upstream; a preference is reversed.
- **Review cadence:** weekly skim of recent `memory/YYYY-MM-DD.md` files; promote stable patterns; flag stale entries.

## Anti-Patterns

- **Don't seed with opinions you haven't validated** — they may be wrong, and wrong seeds are harder to dislodge than absent ones.
- **Don't duplicate USER.md content here** — USER.md is "who Robin is," MEMORY.md is "what was learned working with Robin."
- **Don't store secrets, tokens, or PII** — this file may be version-controlled or shared.
- **Don't store temp debug state, commit hashes, or one-off values** — they rot.

---

_Template version: 2026-04-30. Replace seed examples with real entries on first deployment._
