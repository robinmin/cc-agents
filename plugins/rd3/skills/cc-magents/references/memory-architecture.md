# Memory Architecture Patterns

Patterns for designing agent memory systems, covering daily memory, long-term curation, memory seeding, and the compound learning effect.

> **Sources:** Aman Khan, "How to Make Your OpenClaw Agent Useful and Secure" (Substack, Feb 17 2026); Roberto Capodieci, "OpenClaw Workspace Files Explained" (Medium, Mar 10 2026)

---

## Overview

Agent memory bridges the gap between stateless LLM sessions. Every session, the agent wakes up fresh — it doesn't remember yesterday's conversation. Memory files are what make it remember your projects, preferences, and context across sessions.

The memory system has two layers:
1. **Daily memory** — working notes written during each session
2. **Long-term memory** — curated facts that persist across weeks and months

---

## Daily Memory Pattern

### File Convention

Daily memory files follow the pattern: `memory/YYYY-MM-DD.md`

Each file captures what happened during that day's sessions:
- Decisions that were made
- Problems that were solved
- New information learned about the user
- Context that might be relevant to future sessions

### AGENTS.md Rules for Daily Memory

Add these rules to the agent's operating manual:

```markdown
## Memory Rules
- Write things down in daily files (`memory/YYYY-MM-DD.md`)
- Log all resolved tasks with outcome
- Log decisions and their rationale
- Log new preferences or corrections from the user
```

### What to Log vs. Skip

| Log | Skip |
|-----|------|
| Decisions and rationale | Routine task completions |
| User corrections ("No, I prefer X") | Small talk or pleasantries |
| New facts about the user | Information already in USER.md |
| Workarounds for problems | Standard procedure executions |
| Errors and how they were resolved | Temporary debugging state |

---

## Long-Term Memory Curation

### MEMORY.md Purpose

`MEMORY.md` is the persistent memory store. Unlike daily files (which accumulate), MEMORY.md is curated — only important patterns, facts, and preferences get promoted here.

### Curation Rules

Add curation rules to AGENTS.md:

```markdown
## Memory Curation
- Curate important stuff into MEMORY.md
- Flag repeated issues (3+ similar in a week) for promotion to MEMORY.md
- When a preference is confirmed multiple times, add it to MEMORY.md
- Review daily files periodically and extract lasting patterns
```

### What Belongs in MEMORY.md

- **Persistent preferences:** "User prefers daily summaries at end of day, not morning"
- **Discovered patterns:** "Users in APAC timezone tend to ask billing questions on Monday mornings"
- **Important context:** "Server migration scheduled for March 15 — warn users if asked about downtime"
- **Corrections:** "iMessage outbound is broken, use WhatsApp instead"
- **Personal facts:** "User likes Thai and Japanese food" (relevant for meal planning tasks)

### The Compound Effect

Over time, the memory system produces a compound learning effect:

> "Every conversation, every correction, every 'no, I meant it this way,' it all compounds into an agent that genuinely knows how I work." — Aman Khan

After a few weeks, the agent knows:
- Your writing style
- Your food preferences
- Your work projects and deadlines
- Your communication patterns
- When not to bother you

None of this is programmed — it accumulates through use and corrections.

---

## Memory Seeding

### Why Seed Memory

An empty MEMORY.md works, but pre-loading it with known facts makes the agent useful immediately instead of after a week of calibration.

### What to Pre-Load

Seed MEMORY.md with facts that:
1. The agent would otherwise learn slowly through trial and error
2. Are stable enough to be worth pre-loading
3. Aren't already in USER.md (avoid duplication)

**Good seeds:**
- Naming conventions used in your project
- Key contacts and their roles
- Common abbreviations or jargon
- Known workarounds for recurring issues
- Timezone preferences for different team members

**Bad seeds:**
- Temporary project state (will become stale)
- Opinions or preferences you haven't validated (may be wrong)
- Information that changes frequently (use USER.md instead)

---

## The "Remember" Prompting Pattern

When working with an agent and you want it to retain something:

> "Remember what we just talked about for next time"

This prompts the agent to:
1. Review the current conversation
2. Extract key decisions, preferences, or facts
3. Write them to today's daily memory file
4. Optionally promote important items to MEMORY.md

This pattern is more effective than relying on the agent to auto-detect what's worth remembering, because the user signals intent explicitly.

---

## Memory Architecture in Single-File Platforms

For platforms using single-file configs (CLAUDE.md, .cursorrules), include memory guidance as a section:

```markdown
## Memory

### Daily Memory
- Write session notes to `memory/YYYY-MM-DD.md`
- Log decisions, corrections, and new facts

### Long-Term Memory
- Curate important patterns into MEMORY.md
- Promote preferences confirmed 3+ times
- Review daily files weekly for lasting patterns

### Memory Seeding
- Pre-load MEMORY.md with known project conventions
- Include key contacts, abbreviations, and workarounds
```

---

## Maintainability Dimension Scoring Mapping

These patterns map to the UMAM evaluation framework's Maintainability dimension:

| Pattern | Sub-check | Signal |
|---------|-----------|--------|
| Daily memory files | `dailyMemory` | References to `YYYY-MM-DD`, daily memory, or memory files |
| Long-term curation | `longTermCuration` | References to MEMORY.md curation, promotion rules |
| Memory seeding | `memorySeeding` | References to seeding, pre-loading, or known facts |
| Compound learning | (implicit) | Presence of both daily + long-term patterns |
