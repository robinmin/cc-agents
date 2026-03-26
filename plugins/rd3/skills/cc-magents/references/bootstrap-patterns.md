# Bootstrap and Onboarding Patterns

Patterns for first-run agent setup, progressive adoption, and guided identity creation.

> **Sources:** Aman Khan, "How to Make Your OpenClaw Agent Useful and Secure" (Substack, Feb 17 2026); Roberto Capodieci, "OpenClaw Workspace Files Explained" (Medium, Mar 10 2026)

---

## The Bootstrap Problem

OpenClaw ships with a BOOTSTRAP.md file designed to run on the agent's very first conversation. It walks the user through:
- Picking a name for the agent
- Setting up its personality
- Filling in USER.md with the human's context

**The problem:** Most users skip it. Their first message is a real question ("hey can you check my calendar"), and the agent prioritizes answering that over running the bootstrap. The result: the agent's identity file stays blank for days or weeks.

**The fix:** When first setting up an agent, send this as the very first message:

> "Hey, let's get you set up. Read BOOTSTRAP.md and walk me through it."

Do this before asking it anything else. It takes 5 minutes and the agent will know who it is and who you are from day one.

---

## Bootstrap-First Pattern

### Principle

The first interaction with a new agent should be dedicated to setup — not real work. This ensures the agent has proper identity, user context, and memory foundations before it starts operating.

### BOOTSTRAP.md Structure

A good bootstrap file includes:

```markdown
# Bootstrap — First-Run Setup

## Step 1: Identity Creation
- Ask the user to choose a name for this agent
- Ask about the agent's primary role
- Write responses to SOUL.md and IDENTITY.md

## Step 2: User Context
- Ask the user's name, timezone, and communication preferences
- Ask about their work context and expertise level
- Write responses to USER.md

## Step 3: Memory Seeding
- Ask about key projects, contacts, or conventions
- Pre-populate MEMORY.md with known facts
- Set up memory/YYYY-MM-DD.md directory

## Step 4: Verification
- Read back the created files
- Ask user to confirm or correct
- Mark bootstrap as complete
```

### Implementation Notes

- BOOTSTRAP.md should be consumed and marked complete after first run
- The agent should check if bootstrap has been completed at session start
- If bootstrap is incomplete, the agent should prompt the user to finish it
- Bootstrap should be idempotent — running it again shouldn't overwrite existing data

---

## Progressive Adoption Timeline

Based on practitioner experience, here's a recommended first-week progression:

### Days 1-2: Just Talk to It

- Have casual conversations to get comfortable with the interaction model
- Ask it to explain things, summarize articles, answer questions
- Goal: get comfortable with the interaction, not productivity
- Send voice messages if the platform supports speech-to-text

### Days 3-4: Connect Your Tools

- Add integrations one at a time (web search, file access, browser)
- Start with markdown files or website links for context
- Each tool connection makes the agent more useful because it has more context
- Don't try to connect everything on day one

### Day 5: Add It to a Group Chat

- Add the agent to a small group chat (1-2 friends)
- Ensure `requireMention: true` is set to prevent spam
- Observe how it handles multi-user context
- This is where shared context and shared history develop

### Days 6-7: Teach It Your Style

- Have the agent draft content (emails, posts, messages)
- Give it feedback: "Too formal." "I wouldn't say it that way." "More concise."
- The agent updates its internal model of your voice through corrections
- Optionally create an explicit writing style guide as a markdown file

---

## Guided Interview Pattern

For platforms that support setup wizards (like OpenAgents.mom), the guided interview pattern generates all 7 workspace files through a Q&A flow:

1. **Purpose:** "What will this agent do?" → SOUL.md, IDENTITY.md
2. **Personality:** "How should it communicate?" → SOUL.md
3. **User Context:** "Tell me about yourself" → USER.md
4. **Tools:** "What should it have access to?" → TOOLS.md
5. **Channels:** "Where will it communicate?" → Config
6. **Workflows:** "What recurring tasks?" → HEARTBEAT.md, AGENTS.md
7. **Memory:** "Any facts to pre-load?" → MEMORY.md

The interview takes about 5 minutes and produces a ready-to-deploy workspace.

---

## Bootstrap in Single-File Platforms

For platforms using single-file configs (CLAUDE.md, .cursorrules), bootstrap guidance translates to a section:

```markdown
## Bootstrap

### First-Run Setup
On first use, verify these sections are populated:
- Identity section has specific name and role (not "helpful assistant")
- User context section has operator name, timezone, and preferences
- Memory section has seed data for key project conventions

### Progressive Adoption
- Week 1: Focus on core workflows — don't enable all tools at once
- Week 2: Add integrations based on actual needs
- Week 3: Review and refine based on observed patterns

### Identity Creation
If identity section is empty or generic:
1. Ask the user for agent name and primary role
2. Ask about communication style preferences
3. Populate identity section with specific, non-generic content
```

---

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Skipping bootstrap entirely | Agent has no identity or user context | Send "Read BOOTSTRAP.md and walk me through it" as first message |
| Sending a real question as first message | Agent prioritizes the question over setup | Dedicate first interaction to bootstrap |
| Over-engineering bootstrap | Too many questions discourages completion | Keep to 4-5 essential questions |
| Not verifying bootstrap output | Created files may have errors | Read back files and ask user to confirm |
| Making bootstrap destructive | Re-running overwrites existing config | Make bootstrap idempotent |
