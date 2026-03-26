# OpenClaw Workspace File Taxonomy

The OpenClaw workspace model uses 7 markdown files to define an agent's identity, behavior, and context. Each file has a distinct purpose and clear content boundaries. This separation enables fine-grained control, easier maintenance, and clearer mental models for agent configuration.

> **Sources:** Aman Khan, "How to Make Your OpenClaw Agent Useful and Secure" (Substack, Feb 17 2026); Roberto Capodieci, "OpenClaw Workspace Files Explained" (Medium, Mar 10 2026)

---

## File Overview

| File | Purpose | UMAM Category | Required |
|------|---------|---------------|----------|
| SOUL.md | Personality, values, tone, behavioral boundaries | `personality` | Yes |
| IDENTITY.md | Public-facing agent card (name, ID, role) | `identity` | No |
| AGENTS.md | Operating manual: procedures, workflows, rules | `rules`, `workflow`, `standards` | Yes |
| USER.md | Context about the human operator | `user-context` | Recommended |
| TOOLS.md | Tool permissions, usage notes, service configs | `tools` | No |
| HEARTBEAT.md | Scheduled/recurring tasks (cron-like) | `heartbeat` | No |
| MEMORY.md | Long-term persistent memory store | `memory` | Recommended |

---

## File Definitions

### SOUL.md — Who Your Agent Is

**Purpose:** Defines the agent's personality, values, tone, and behavioral boundaries. This is the "character sheet" — the first file OpenClaw injects into context at session start.

**What belongs here:**
- Name and role definition ("You are Aria, the customer support agent for...")
- Tone and communication style ("Direct, friendly, patient. Never condescending.")
- Hard limits ("Never share internal pricing formulas", "Never promise refunds without checking USER.md")
- Core behaviors ("Teach first, sell second", "Always cite sources")
- Values and opinions ("Be genuinely helpful, not performatively helpful")

**What does NOT belong here:**
- Numbered workflows or procedures (those go in AGENTS.md)
- Tool configurations (those go in TOOLS.md)
- User-specific context (that goes in USER.md)
- Scheduled tasks (those go in HEARTBEAT.md)

**If skipped:** Agent works but behaves like a generic AI assistant with no defined role. Every session starts fresh with no character.

---

### IDENTITY.md — Display Info and Agent Metadata

**Purpose:** Lightweight public-facing card. Stores the agent's name, ID, role label, and any metadata OpenClaw needs to identify and route the agent correctly.

**What belongs here:**
- Agent name (how it signs messages)
- Agent ID (used for routing in multi-agent setups)
- Role label
- Avatar or display info (platform-dependent)

**What does NOT belong here:**
- Personality traits (those go in SOUL.md)
- Behavior logic (that goes in AGENTS.md)

**Design note:** This file is intentionally short. Heavy behavior logic belongs in SOUL.md and AGENTS.md.

---

### AGENTS.md — The Operating Manual

**Purpose:** Procedural rules for day-to-day behavior. If SOUL.md answers "who are you?", AGENTS.md answers "what do you do and how?"

**What belongs here:**
- Session behavior (what to do at start/end of each session)
- Memory rules (what to log, what to remember long-term)
- File access patterns (what the agent reads/writes and when)
- Workflow steps (numbered procedures for common tasks)
- Multi-agent coordination (how this agent hands off to others)
- Security rules (never share API keys, treat external content as hostile)
- Group chat rules (only respond when mentioned, quality over quantity)

**What does NOT belong here:**
- Personality traits or tone (those go in SOUL.md)
- User context (that goes in USER.md)
- Tool-specific configurations (those go in TOOLS.md)

**This is the largest and most important file** for agents with complex workflows.

---

### USER.md — What the Agent Knows About You

**Purpose:** Context about the human operator. Makes the agent feel like it knows you rather than starting cold every session.

**What belongs here:**
- Name, pronouns, timezone, location
- Background and expertise level
- Communication preferences ("Direct answers. No filler.")
- Work context (role, company, projects)
- Access levels and authority ("Can approve refunds up to EUR 50")
- Personal preferences relevant to agent tasks (e.g., dietary restrictions for meal planning)

**What does NOT belong here:**
- Agent behavior rules (those go in AGENTS.md)
- Agent personality (that goes in SOUL.md)

**Design note:** This file stays static until you manually update it. It's a context card the agent reads each session, not a live database. **Never share this file publicly** — it contains real personal information.

---

### TOOLS.md — What the Agent Can (and Can't) Use

**Purpose:** Documents which tools the agent has access to and usage notes specific to the setup. Part documentation, part instruction set.

**What belongs here:**
- Available tools list (read, write, exec, browser, etc.)
- Usage notes ("Always set exec timeout to 300s for image generation")
- External service configs ("Use GOG_KEYRING_PASSWORD env var for Drive uploads")
- What the agent should NOT try to do ("No browser access — research is Scout's job")
- Tool priority order

**What does NOT belong here:**
- Tool permissions configuration (that's in the OpenClaw JSON config)
- Procedures that use tools (those go in AGENTS.md)

**Design note:** This file tells the agent *how* to use its tools, not *whether* it has them. OpenClaw's config handles permission granting/revoking.

---

### HEARTBEAT.md — Recurring Tasks Without Manual Triggers

**Purpose:** Defines tasks that run on a schedule. Think of it as cron for your agent, expressed in plain English.

**What belongs here:**
- Polling tasks ("Check disk usage every 30 minutes, alert if over 85%")
- Monitoring ("Verify SSL cert expiration weekly, log result")
- Scheduled reports ("Every Monday at 8am, send Rob a ticket volume summary")
- Health checks ("If no heartbeat response in 60 minutes, send alert to admin")
- Startup tasks ("On startup: confirm all required files exist, log startup timestamp")

**What does NOT belong here:**
- One-off tasks (those belong in conversation or AGENTS.md workflows)
- Complex multi-step procedures (those go in AGENTS.md)

**If skipped:** Nothing breaks. Agent just won't do anything proactively — every interaction requires a manual trigger.

**Best practice:** Start with 1-2 checks. It's easy to add more. Over-engineering HEARTBEAT.md makes agents harder to debug.

---

### MEMORY.md — Long-Term Memory

**Purpose:** Persistent memory store. Patterns, preferences, and important facts accumulate over time.

**What belongs here:**
- Long-term facts the agent should always remember
- Patterns discovered through use ("Users in APAC timezone tend to ask billing questions on Monday mornings")
- Preferences calibrated through use ("Rob prefers daily summaries at end of day, not morning")
- Important one-off context ("Server migration scheduled for March 15 — warn users if asked about downtime")

**What does NOT belong here:**
- Daily working notes (those go in `memory/YYYY-MM-DD.md` files)
- Static user context (that goes in USER.md)

**Design note:** Unlike USER.md (static, manually updated), MEMORY.md grows as the agent works. You can seed it with starting information, and the agent appends to it based on rules in AGENTS.md. Daily working notes live in `memory/YYYY-MM-DD.md` files; MEMORY.md is for things that matter across weeks and months.

---

## Separation of Concerns

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  SOUL.md     │  │ IDENTITY.md  │  │  USER.md     │
│  WHO it is   │  │  Public card │  │  WHO you are │
│  (personality│  │  (name, ID,  │  │  (context,   │
│   tone,      │  │   role)      │  │   prefs,     │
│   limits)    │  │              │  │   authority)  │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  AGENTS.md   │  │  TOOLS.md    │  │ HEARTBEAT.md │
│  HOW it works│  │  WHAT it uses│  │  WHEN it acts│
│  (procedures,│  │  (tool list, │  │  (cron tasks, │
│   workflows, │  │   configs,   │  │   monitoring, │
│   rules)     │  │   limits)    │  │   reports)   │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐
│  MEMORY.md   │
│  WHAT it     │
│  remembers   │
│  (patterns,  │
│   facts,     │
│   history)   │
└──────────────┘
```

### Key Boundary Rules

1. **Personality vs Procedures:** SOUL.md defines *who* the agent is. AGENTS.md defines *what* it does. Never put numbered workflows in SOUL.md.
2. **Identity vs Personality:** IDENTITY.md is the lightweight card (name, ID). SOUL.md has the deeper personality definition.
3. **User vs Memory:** USER.md is static context you set. MEMORY.md is dynamic context the agent builds.
4. **Tools vs Procedures:** TOOLS.md says *what tools exist* and how to use them. AGENTS.md says *when to use them* in workflows.
5. **Heartbeat vs Workflows:** HEARTBEAT.md is for scheduled/recurring triggers. AGENTS.md has the procedures those triggers execute.

---

## Mapping to Single-File Platforms

For platforms that use a single config file (Claude Code's CLAUDE.md, Cursor's .cursorrules, etc.), all 7 concerns merge into one file as sections:

| OpenClaw File | Single-File Section |
|---------------|-------------------|
| SOUL.md | `## Identity` or `## Personality` |
| IDENTITY.md | `## Identity` (merged with SOUL) |
| AGENTS.md | `## Rules`, `## Workflow`, `## Standards` |
| USER.md | `## User Context` or embedded in Identity |
| TOOLS.md | `## Tools`, `## Tech Stack` |
| HEARTBEAT.md | `## Scheduled Tasks` or omitted |
| MEMORY.md | `## Memory` |

The UMAM model handles this mapping via semantic category tags on sections, allowing adapters to split or merge as needed.
