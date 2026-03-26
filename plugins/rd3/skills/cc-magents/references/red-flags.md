# Red Flags Checklist

Red flags in main agent configurations require **immediate verification** before proceeding. When a red flag is detected, STOP and verify before continuing.

## Red Flag Categories

### 1. Safety Rule Violations

| Red Flag | Why | Verification |
|----------|-----|--------------|
| Missing `[CRITICAL]` markers on destructive guards | Safety rules may be auto-evolved | Search for `rm -rf`, `force push`, `reset --hard` without CRITICAL markers |
| Overly permissive `bypassPermissions` | Agent can run any tool without confirmation | Check permission boundaries are properly scoped |
| No safety/security section | Basic guardrails missing | Check for Safety, Security, or Constraints sections |

### 2. Configuration Quality

| Red Flag | Why | Verification |
|----------|-----|--------------|
| Empty or near-empty config (<50 lines) | Insufficient guidance for agent | Check line count and section coverage |
| No identity/role section | Agent has no context about purpose | Check for Identity, Role, or Purpose section |
| No tech stack section | Agent cannot make appropriate tool choices | Check for Tech Stack or Tools section |
| Contradictory rules | Agent receives conflicting instructions | Review rules for logical consistency |

### 3. Platform-Specific Issues

| Red Flag | Why | Verification |
|----------|-----|--------------|
| Claude-specific hooks in non-Claude config | Hooks not portable | Check for `hooks:` in non-CLAUDE.md files |
| Memory patterns in portable configs | Memory features are platform-specific | Check for memory references in .cursorrules, AGENTS.md |
| MCP server references in non-Claude targets | MCP not universally supported | Verify target platform supports MCP |

### 4. Evolution Safety

| Red Flag | Why | Verification |
|----------|-----|--------------|
| Evolution proposal modifies CRITICAL sections | Protected sections must not change | Verify proposal scope excludes CRITICAL markers |
| Proposal lacks verification plan | Cannot confirm change is safe | Check for matching test or validation step |
| Deletion-heavy proposal (>30% content removed) | May remove essential guidance | Review deleted content for safety rules |
| Multi-file proposal across skill boundaries | Scope creep risk | Verify all files are within declared target |

### 5. Content Quality

| Red Flag | Why | Verification |
|----------|-----|--------------|
| TODO markers in production config | Incomplete guidance | Search for `TODO`, `FIXME`, `HACK` |
| Second-person language ("you should") | Agents respond better to imperative form | Search for `you should`, `you can`, `you need` |
| Generic persona ("helpful assistant") | No domain specificity | Check for unique identity and constraints |
| No version or maintenance metadata | Cannot track config drift | Check for version number or effective date |

### 6. Workspace File Separation (Multi-File Platforms)

> Sources: Aman Khan (Substack, Feb 2026); Roberto Capodieci (Medium, Mar 2026)

| Red Flag | Why | Verification |
|----------|-----|--------------|
| Procedures in personality section | SOUL.md is for personality and limits; numbered workflows belong in AGENTS.md. Mixing them makes both harder to maintain | Check for numbered steps, workflow keywords in SOUL.md or personality sections |
| Empty USER.md / no user context | Every session starts with zero context about the operator. Five minutes filling this saves hours of re-explaining preferences | Check USER.md exists and has content beyond template placeholders |
| Unseeded MEMORY.md | An empty MEMORY.md works but pre-loading with known facts (naming conventions, key contacts, workarounds) makes the agent useful immediately | Check MEMORY.md for seed data vs. empty or template-only content |
| Over-engineered HEARTBEAT.md | Start with 1-2 checks. Too many scheduled tasks makes debugging harder when the agent does things you forgot you told it to do | Check HEARTBEAT.md for excessive polling or monitoring rules |
| Sharing workspace without redacting USER.md | USER.md contains real personal information (name, timezone, work context, preferences). Never include in public repos | Check for USER.md in public/shared configs; verify .gitignore |
| Dumping everything into SOUL.md | SOUL.md should be personality and limits only. Tool configs, workflows, user context, and memory rules each have their own file | Check SOUL.md line count; flag if >100 lines or contains workflow/tool content |

### 7. Security Anti-Patterns

> Sources: Aman Khan (Substack, Feb 2026); Roberto Capodieci (Medium, Mar 2026)

| Red Flag | Why | Verification |
|----------|-----|--------------|
| No prompt injection defense rules | Agents reading external content can be hijacked by hidden instructions in web pages, emails, or files | Search for prompt injection, untrusted content, or external content rules |
| API keys or tokens in workspace files | Workspace files are plain text, may be version-controlled or shared | Search for hardcoded keys, tokens, passwords in workspace files |
| No tool permission scoping | Agents with unnecessary tool access (e.g., exec on a support agent) increase blast radius under attack | Check for explicit tool restrictions or least-privilege rules |
| No group chat mention requirement | Without @mention requirement, agent responds to every message in group chats | Check for `requireMention`, group chat, or mention rules |
| Gateway bound to 0.0.0.0 | Any device on the network can interact with the agent | Check gateway config for loopback binding |

### 8. Bootstrap and Memory Anti-Patterns

> Sources: Aman Khan (Substack, Feb 2026); Roberto Capodieci (Medium, Mar 2026)

| Red Flag | Why | Verification |
|----------|-----|--------------|
| No bootstrap/onboarding flow | Agent starts with no identity or user context; first interaction should be setup, not real work | Check for BOOTSTRAP.md or bootstrap section in config |
| Skipped bootstrap (generic identity) | Agent has placeholder or generic identity after days of use | Check identity for specificity vs. "helpful assistant" patterns |
| No daily memory pattern | Without `memory/YYYY-MM-DD.md` convention, every session starts from scratch | Search for daily memory, YYYY-MM-DD, or session logging rules |
| No memory curation rules | Daily files accumulate without important facts being promoted to long-term memory | Search for curation, promotion, or review rules in AGENTS.md |
