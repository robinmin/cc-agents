---
research_date: 2026-03-12
topic: Agent Skills and Slash Commands — Cross-Platform Comparison
confidence: HIGH
sources_count: 45+
search_date: 2026-03-13
status: Final
platforms_covered: Claude Code, Codex, Gemini CLI, Google Antigravity, OpenClaw, pi-mono, OpenCode
---

# Agent Skills and Slash Commands: Cross-Platform Comparison Research Report

## Background & Motivation

This research was initiated to address the following changes in the AI coding agent landscape:

- **Anthropic released Claude Code Agent Skills 2.0** via the new Skill Creator, introducing programmatic skill creation with `SKILL.md` as the portable format
- **OpenAI Codex supports programmatic skill creation** with its own `skill-creator` skill and `agents/openai.yaml` UI metadata extension
- **Existing cc-agents plugins** ([github.com/robinmin/cc-agents](https://github.com/robinmin/cc-agents)) need to be adapted to work across Claude Code, Codex, Gemini CLI, and other emerging AI coding agents

**Research objectives:**
1. Compare the Claude Code Skill Creator and Codex Skill Creator implementations
2. Compare both against the [agentskills.io open standard](https://agentskills.io/home)
3. Extend the comparison to Gemini CLI, Google Antigravity, OpenClaw, pi-mono, and OpenCode
4. Identify cross-platform portability requirements and best practices for multi-agent skill authoring
5. Provide concrete migration guidance for converting existing Claude Code plugins to adaptive cross-platform skills

The research was further extended (beyond skills) to compare:
- **Slash command / user-invocable action systems** across all platforms (Section 9)
- **Subagent / agent definition systems** across all platforms (Section 10)

---

## Executive Summary

1. **The Agent Skills open standard (agentskills.io) is the de facto cross-platform format**: Originally created by Anthropic, it has been adopted by 30+ AI coding agents including Claude Code, OpenAI Codex, Gemini CLI, GitHub Copilot, VS Code, Cursor, Roo Code, and many more. The core format is a `SKILL.md` file with YAML frontmatter (`name` + `description` required) and a Markdown body.

2. **All three systems share the same base format**: A skill directory containing `SKILL.md`, with optional `scripts/`, `references/`, and `assets/` subdirectories. The YAML frontmatter fields `name` (max 64 chars, lowercase-hyphen) and `description` (max 1024 chars) are universal across all platforms. Confidence: HIGH.

3. **Platform-specific extensions exist but are non-breaking**: Claude Code adds `disable-model-invocation`, `user-invocable`, `context`, `agent`, `argument-hint`, `model`, and `hooks` fields. Codex adds `agents/openai.yaml` for UI metadata and invocation policy. These are additive — a base-standard SKILL.md with only `name` and `description` works everywhere.

4. **Progressive disclosure is the universal architectural principle**: All platforms load skill metadata at startup (~100 tokens), load the full `SKILL.md` body only when triggered, and load supporting files on demand. Keep `SKILL.md` under 500 lines.

5. **Cross-platform portability is achievable today**: A skill authored to the base agentskills.io specification works on all 30+ compatible agents without modification. Platform-specific enhancements require conditional adaptation documented below.

## Confidence: HIGH

**Sources**: 12 sources from agentskills.io, platform.claude.com, code.claude.com, developers.openai.com, GitHub (anthropics/skills, openai/skills), deepwiki.com
**Evidence Quality**: HIGH — primary documentation from official sources
**Date Range**: 2025 - 2026-03-12
**Search Date**: 2026-03-12

## Search Strategy

**Databases Searched**:
- agentskills.io (official open standard): full specification and client implementation guide
- platform.claude.com: Agent Skills overview and best practices (Anthropic official docs)
- code.claude.com: Claude Code Skills documentation
- developers.openai.com: Codex skills documentation
- GitHub anthropics/skills: skill-creator SKILL.md
- GitHub openai/skills: skill-creator SKILL.md via deepwiki.com
- WebSearch: "Claude Code Agent Skills 2.0 SKILL.md 2026", "OpenAI Codex skill creator agents/openai.yaml"

**Inclusion Criteria**: Official documentation, primary source repositories, current 2025-2026 content
**Exclusion Criteria**: Blog posts without primary source backing, pre-2025 content

---

## 1. Claude Code Skills (Agent Skills / Claude Code)

### Format & Schema

Claude Code follows the agentskills.io open standard with a set of proprietary extensions. The file format is a Markdown file with YAML frontmatter.

**Minimum valid SKILL.md:**
```markdown
---
name: skill-name
description: What this skill does and when to use it.
---

# Skill Name

[Instructions here]
```

**Complete frontmatter reference (Claude Code specific):**

| Field | Required | Standard | Description |
|---|---|---|---|
| `name` | No (defaults to dir name) | Yes | Lowercase, hyphens, max 64 chars |
| `description` | Recommended | Yes | Max 1024 chars, what + when |
| `argument-hint` | No | No | Autocomplete hint: `[issue-number]` |
| `disable-model-invocation` | No | No | `true` = user-only invocation |
| `user-invocable` | No | No | `false` = Claude-only invocation |
| `allowed-tools` | No | Yes (experimental) | Space-delimited: `Read, Grep, Bash(git:*)` |
| `model` | No | No | Override model for this skill |
| `context` | No | No | `fork` = run in subagent |
| `agent` | No | No | Subagent type: `Explore`, `Plan`, `general-purpose` |
| `hooks` | No | No | Lifecycle hooks scoped to this skill |

**Dynamic context injection (Claude Code only):**
```yaml
---
name: pr-summary
description: Summarize a pull request
context: fork
agent: Explore
---

PR diff: !`gh pr diff`
PR comments: !`gh pr view --comments`
```

The `!`command`` syntax executes shell commands before Claude sees the prompt, injecting live data.

**String substitutions (Claude Code only):**
- `$ARGUMENTS` — all arguments passed at invocation
- `$ARGUMENTS[N]` or `$N` — positional argument by index
- `${CLAUDE_SESSION_ID}` — current session ID
- `${CLAUDE_SKILL_DIR}` — absolute path to the skill directory

### Directory Structure

```
skill-name/
├── SKILL.md           # Required entrypoint
├── reference.md       # Optional supplemental docs
├── examples/
│   └── sample.md      # Example outputs
└── scripts/
    └── validate.sh    # Executable scripts
```

### Trigger Mechanism

Two modes:
1. **Automatic**: Claude reads all skill `description` fields at startup and matches them to the current task. The description IS the trigger.
2. **Manual**: User types `/skill-name` (if `user-invocable` is not false).
3. **Blocked automatic**: Set `disable-model-invocation: true` — only manual invocation works.

Skills live at:
- `~/.claude/skills/<name>/SKILL.md` — personal (all projects)
- `.claude/skills/<name>/SKILL.md` — project-local
- `<plugin>/skills/<name>/SKILL.md` — plugin-scoped (namespaced as `plugin:skill`)
- Enterprise managed settings — organization-wide

### Key Features

- **Subagent execution** (`context: fork`): Skill runs in an isolated subagent context
- **Dynamic context injection** (`!`cmd``): Live shell data injected before Claude sees prompt
- **Invocation control**: Fine-grained control over who/what triggers a skill
- **Hooks integration**: Lifecycle hooks (pre/post) scoped to skill activation
- **Plugin namespacing**: `plugin-name:skill-name` prevents cross-plugin name collisions
- **Nested discovery**: Automatic discovery from subdirectory `.claude/skills/` (monorepo support)
- **Permission control**: `allowed-tools` grants pre-approved tool access during skill execution
- **Pre-built skills**: PowerPoint, Excel, Word, PDF skills available via API with `skill_id`

### Best Practices (Anthropic)

- **Description writes the trigger**: Include both "what it does" AND "when to use it" in `description`. Use third person. Include domain-specific keywords users would naturally type.
- **500-line body limit**: Keep `SKILL.md` under 500 lines; move detail to referenced files.
- **Progressive disclosure pattern**: SKILL.md is a table of contents; reference files load on demand.
- **Never include "When to Use" in the body**: The body only loads after triggering; trigger logic belongs solely in `description`.
- **Avoid auxiliary docs**: No README.md, INSTALLATION_GUIDE.md — only files needed for the task.
- **Test with multiple models**: Haiku, Sonnet, Opus behave differently; calibrate verbosity accordingly.
- **Evaluation-driven development**: Build 3 evaluations BEFORE writing extensive documentation.

---

## 2. OpenAI Codex Skill Creator

### Format & Schema

Codex follows the agentskills.io base standard with one major additive extension: the `agents/openai.yaml` file for UI metadata and invocation policy.

**Frontmatter fields (Codex):**

| Field | Required | Standard | Description |
|---|---|---|---|
| `name` | Yes | Yes | Hyphen-case, max 64 chars, lowercase |
| `description` | Yes | Yes | Max 1024 chars; primary trigger mechanism |
| `license` | No | Yes | License name or reference |
| `metadata` | No | Yes | Arbitrary key-value map |
| `allowed-tools` | No | Yes (experimental) | Tool permissions |

**Note**: Codex enforces `name` as Required (vs Claude Code where it defaults to directory name). Codex validation explicitly rejects unknown frontmatter fields; only the five above are permitted.

**agents/openai.yaml (Codex-specific):**

This optional file provides UI metadata and invocation policy:

```yaml
interface:
  display_name: "Skill Creator"
  short_description: "Create or update a skill"
  default_prompt: "Create a new skill for..."
  icon_small: "assets/icon-16.png"   # optional
  icon_large: "assets/icon-64.png"   # optional
  brand_color: "#FF6B35"             # optional

policy:
  allow_implicit_invocation: true    # default: true; false = explicit-only

dependencies:
  - type: mcp
    value: "github"
    description: "GitHub MCP server"
    transport: stdio
    url: "..."
```

**Skill initialization script (Codex-specific):**

Codex's skill-creator ships `scripts/init_skill.py` for scaffolding new skills:
```bash
scripts/init_skill.py my-skill --path skills/public --resources scripts,references
```

And `scripts/quick_validate.py` for pre-flight validation:
```bash
scripts/quick_validate.py path/to/skill-folder
```

And `scripts/generate_openai_yaml.py` for generating `agents/openai.yaml`:
```bash
scripts/generate_openai_yaml.py path/to/skill-folder --interface display_name="My Skill"
```

### Directory Structure

```
skill-name/
├── SKILL.md                    # Required entrypoint
├── agents/
│   └── openai.yaml             # Codex UI metadata (recommended)
├── scripts/                    # Executable code
│   ├── init_skill.py           # Scaffolding (skill-creator only)
│   └── quick_validate.py       # Validation (skill-creator only)
├── references/                 # Documentation loaded on demand
└── assets/                     # Output files (templates, icons)
```

### Trigger Mechanism

Two modes (same as Claude Code):
1. **Implicit**: Codex matches task to `description` field and auto-activates
2. **Explicit**: User invokes via `/skills` command or `$skill-name` prefix
3. **Implicit blocked**: Set `allow_implicit_invocation: false` in `agents/openai.yaml`

Codex requires `name` to be explicitly declared in frontmatter (no directory-name fallback).

### Key Features

- **`agents/openai.yaml`**: UI chips, display name, default prompt, icon, brand color, dependency declarations
- **Dependency declarations**: Can declare MCP server dependencies in `agents/openai.yaml`
- **Validation tooling**: Built-in `quick_validate.py` catches frontmatter and naming issues early
- **Scaffolding script**: `init_skill.py` generates a properly structured template directory
- **Forward-testing protocol**: Specific guidance for using subagents to stress-test skills without leaking context
- **Validation integrity principle**: Subagent validators should receive raw artifacts, not conclusions

### Best Practices (OpenAI Codex)

- **"Concise is key"**: Context window is a public good; challenge every token.
- **Codex is already smart**: Only add context Codex doesn't already have; avoid explaining what it already knows.
- **Set appropriate degrees of freedom**: High freedom (text instructions) for variable tasks; low freedom (specific scripts) for fragile operations.
- **Include all "when to use" in description**: Body loads AFTER triggering; put trigger logic only in description.
- **Do NOT include README.md, INSTALLATION_GUIDE.md, CHANGELOG.md**: Only task-essential files.
- **Start with reusable resources**: Implement scripts/references/assets FIRST, then write SKILL.md around them.
- **Forward-test with subagents**: Stress-test by asking subagents to use the skill, passing raw artifacts not conclusions.
- **Protect validation integrity**: Subagent prompts should look like "Use $skill at /path to solve Y", not "Test this skill".

---

## 3. Agent Skills Open Standard (agentskills.io)

### Specification

The Agent Skills format was originally created by Anthropic, released as an open standard, and is hosted at https://agentskills.io with a public GitHub repository at https://github.com/agentskills/agentskills.

**Core definition**: A skill is a directory containing, at minimum, a `SKILL.md` file.

**Required frontmatter fields:**

| Field | Required | Constraints |
|---|---|---|
| `name` | Yes | Max 64 chars; `[a-z0-9-]+`; no consecutive hyphens; no leading/trailing hyphens; must match directory name |
| `description` | Yes | Max 1024 chars; non-empty; describes what + when |

**Optional frontmatter fields:**

| Field | Description |
|---|---|
| `license` | License name or reference to bundled file |
| `compatibility` | Environment requirements (max 500 chars) |
| `metadata` | Arbitrary key-value map |
| `allowed-tools` | Space-delimited pre-approved tools (experimental) |

**Minimal valid SKILL.md:**
```markdown
---
name: skill-name
description: A description of what this skill does and when to use it.
---
```

**Example with optional fields:**
```markdown
---
name: pdf-processing
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
license: Apache-2.0
metadata:
  author: example-org
  version: "1.0"
---
```

**Directory conventions (spec-defined):**
```
skill-name/
├── SKILL.md          # Required
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files
```

**Cross-client discovery paths (convention, not mandated by spec):**
- `.agents/skills/` — cross-client standard path
- `.<client>/skills/` — client-specific path
- `~/.agents/skills/` — user-level cross-client
- `~/.claude/skills/` — widely used by existing skills

### Three-tier progressive disclosure (universal):

| Tier | Content | When Loaded | Token Cost |
|---|---|---|---|
| 1. Catalog | name + description | Session start | ~50-100 tokens per skill |
| 2. Instructions | Full SKILL.md body | When skill activated | <5000 tokens (recommended) |
| 3. Resources | scripts/, references/, assets/ | When instructions reference them | Varies |

### Conformance Analysis

**Claude Code conformance**: FULL + EXTENSIONS
- All required and optional standard fields supported
- Extensions: `disable-model-invocation`, `user-invocable`, `context`, `agent`, `argument-hint`, `model`, `hooks`, `$ARGUMENTS` substitutions, `!`cmd`` injection
- Lenient on `name`: does not require match to directory name (defaults to directory name instead)

**Codex conformance**: FULL + EXTENSIONS
- All required and optional standard fields supported
- Extensions: `agents/openai.yaml` (UI metadata and invocation policy), `dependencies` declarations
- Strict on `name`: required in frontmatter; validation rejects unknown fields
- Only five standard fields allowed in frontmatter (no non-standard frontmatter)

### Adoption

Confirmed adopters as of 2026-03-12 (from agentskills.io home page):
- Anthropic: Claude Code, Claude.ai, Claude API
- OpenAI: Codex
- Google: Gemini CLI
- Microsoft: GitHub Copilot, VS Code (Copilot)
- JetBrains: Junie
- Cursor, Amp, OpenCode, OpenHands, Roo Code, Goose, Mux (Coder), Letta, Firebender, Databricks, Snowflake, Laravel Boost, Spring AI, Factory, Emdash, VT Code, Qodo, TRAE (ByteDance), Autohand, Agentman, Mistral Vibe, Command Code, Ona, Piebald

Total: 30+ AI coding agents.

The standard is **actively maintained** and open to contributions from the ecosystem.

**Validation tooling**: `skills-ref` reference library (https://github.com/agentskills/agentskills/tree/main/skills-ref) validates SKILL.md and generates prompt XML:
```bash
skills-ref validate ./my-skill
```

---

## 4. Comparison Matrix

| Dimension | Claude Code | Codex | agentskills.io Spec | OpenClaw | pi-mono | OpenCode |
|---|---|---|---|---|---|---|
| **File format** | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter |
| **`name` required** | No (defaults to dir name) | Yes | Yes | Yes | Yes | Yes (hard; must match dir name) |
| **`description` required** | Recommended | Yes | Yes | Yes | Yes | Yes (hard; min 20 chars) |
| **`license` field** | Not in spec | Yes | Yes | Not supported | Not documented | Silently ignored |
| **`compatibility` field** | Not in spec | Not in spec | Yes | Not supported | Not documented | Silently ignored |
| **`metadata` field** | Not in spec | Yes | Yes | Yes (single-line JSON; `metadata.openclaw` extension key) | Not supported | Silently ignored (no extension keys) |
| **`allowed-tools` field** | Yes | Yes | Yes (experimental) | Not in standard usage | Not supported | Not supported |
| **Invocation control** | `disable-model-invocation`, `user-invocable` | `agents/openai.yaml` `allow_implicit_invocation` | Not in spec | `user-invocable`, `disable-model-invocation`, `command-dispatch: tool` | Not supported | Config-level only: `permission.skill` allow/deny/ask patterns |
| **UI metadata** | Not in spec | `agents/openai.yaml` | Not in spec | `metadata.openclaw.emoji` (macOS Skills UI only) | Not supported | Not supported |
| **Dependency declarations** | Not in spec | `agents/openai.yaml` | Not in spec | `metadata.openclaw.requires.*` (binary/env/config load-time gating) | Not supported | Not supported |
| **Subagent execution** | `context: fork`, `agent:` | Not in spec | Not in spec | `sessions_spawn` tool (config-based, not skill frontmatter) | Not supported | Not in SKILL.md; via `agent:` config or `.opencode/agents/` files |
| **Dynamic context injection** | `` !`cmd` `` syntax | Not in spec | Not in spec | Not supported | Not supported | Not in SKILL.md; supported in command templates only |
| **Argument substitution** | `$ARGUMENTS`, `$N`, `${CLAUDE_SKILL_DIR}` | Not in spec | Not in spec | Raw args string; `{baseDir}` for skill dir path | Not supported | Not in SKILL.md; `$ARGUMENTS`, `$NAME`, `$1`, `$2` in command templates only |
| **Hooks** | `hooks:` field | Not in spec | Not in spec | Not in skill frontmatter | Not supported | Not in SKILL.md; JS plugin hooks system separate from skills |
| **Discovery paths** | `.claude/skills/`, `~/.claude/skills/`, plugin | `~/.codex/`, project-local | `.agents/skills/`, `.<client>/skills/` | `<workspace>/skills/`, `~/.openclaw/skills/`, bundled | `~/.pi/agent/skills/`, `.agents/skills/`, `.pi/skills/` | `.opencode/skills/`, `.claude/skills/`, `.agents/skills/`; global mirrors; walks git worktree |
| **Validation tool** | Built-in | `quick_validate.py` | `skills-ref` CLI | Not built-in | Not documented | Not documented |
| **Scaffolding tool** | Not built-in | `init_skill.py` | Not in spec | Not built-in | Not documented | Not documented |
| **`agents/` dir** | Not used | `agents/openai.yaml` | Not in spec | Not used | Not used | Not used for skills; `.opencode/agents/` for agent definitions |
| **Name/dir match required** | No | Yes | Yes | Yes | Yes | Yes (hard) |
| **Unknown frontmatter fields** | Ignored | Runtime: ignored; VS Code: warns | Warn, load anyway | Silently ignored | Silently ignored | Silently ignored |
| **Max SKILL.md body** | 500 lines recommended | 500 lines recommended | 5000 tokens recommended | 500 lines recommended | Not documented | Not documented |
| **Progressive disclosure** | Yes (3 tiers) | Yes (3 tiers) | Yes (3 tiers) | Yes (3 tiers) | Yes (3 tiers) | Yes (3 tiers; true lazy load) |
| **Cross-platform spec compliance** | Full + extensions | Full + extensions | Reference | Full + extensions | Full (minimal) | Full + permission config extension |

---

## 5. Cross-Platform Portability Analysis

### Common Ground

All three share these fundamentals, forming the portable base:

1. **File format**: Markdown with YAML frontmatter between `---` delimiters
2. **Required fields**: `name` and `description` in frontmatter
3. **Directory structure**: `scripts/`, `references/`, `assets/` subdirectories
4. **Progressive disclosure**: 3-tier loading (metadata → instructions → resources)
5. **Body length limit**: 500 lines / 5000 tokens
6. **Trigger mechanism**: `description` field controls when the skill activates
7. **No README.md in skill**: Only task-essential files
8. **Forward slashes in paths**: Unix-style always

**Portable base SKILL.md template:**
```markdown
---
name: my-skill
description: [Third-person description of what skill does + when to trigger it. Max 1024 chars]
---

# My Skill

## Overview

[Brief description — assume the agent is smart, avoid explaining basics]

## Workflow

1. Step one
2. Step two
3. Step three

## Additional resources

- For API details: see [reference.md](references/reference.md)
- To process files: run `scripts/process.py`
```

### Platform-Specific Requirements

**Claude Code only:**
- `disable-model-invocation: true` — prevent auto-triggering
- `user-invocable: false` — hide from `/` menu
- `context: fork` + `agent:` — subagent isolation
- `!`cmd`` — dynamic context injection
- `$ARGUMENTS`, `$N`, `${CLAUDE_SKILL_DIR}` — string substitutions
- `hooks:` — lifecycle hooks
- Plugin namespacing via `plugin-name:skill-name`
- `argument-hint:` — autocomplete hint text
- `model:` — per-skill model override

**Codex only:**
- `agents/openai.yaml` — UI metadata (display_name, short_description, default_prompt, icon, brand_color)
- `agents/openai.yaml` `policy.allow_implicit_invocation: false` — prevent auto-triggering
- `agents/openai.yaml` `dependencies` — MCP server dependency declarations
- `metadata:` in frontmatter — structured additional metadata
- `scripts/init_skill.py` + `scripts/quick_validate.py` — skill tooling
- Strict frontmatter: only 5 allowed fields; unknown fields cause validation failure

**agentskills.io spec only (not in Claude Code/Codex):**
- `compatibility:` — environment requirements field (max 500 chars)
- `.agents/skills/` — cross-client discovery path convention

### Migration Considerations

**Converting existing Claude Code skills to cross-platform:**

1. **Preserve the SKILL.md core** — it already satisfies the base standard if `name` and `description` are present
2. **Move description to be explicit** — if relying on directory-name fallback for `name`, add explicit `name:` field
3. **Externalize Claude Code extensions** — `disable-model-invocation`, `context: fork`, `hooks` are ignored by non-Claude agents but not harmful
4. **Add `agents/openai.yaml` for Codex** — generate with `scripts/generate_openai_yaml.py` from the skill-creator skill
5. **Add `compatibility:` for spec completeness** — e.g., `compatibility: Designed for Claude Code and Codex`
6. **Unknown frontmatter**: Codex rejects unknown fields; Claude Code ignores them. This is the main compat risk.
7. **`!`cmd`` injection**: Codex and other agents do not support this syntax; it appears as literal text. Remove or wrap in conditional logic.
8. **`$ARGUMENTS` substitutions**: These are Claude Code-specific; other agents receive the raw text literally.

**Risk table for conversion:**

| Feature | Risk | Mitigation |
|---|---|---|
| Missing explicit `name:` | MEDIUM (Codex rejects) | Add explicit `name:` matching directory name |
| Unknown frontmatter fields | HIGH (Codex rejects) | Move Claude Code-specific fields to comments or separate file |
| `!`cmd`` injection | LOW (becomes literal text) | Remove or document as Claude Code-only |
| `$ARGUMENTS` substitutions | LOW (other agents use raw) | Document as Claude Code-only feature |
| `context: fork` | LOW (ignored by others) | Safe to leave; no effect on other agents |
| `hooks:` field | LOW (unknown → Codex rejects) | Remove for cross-platform builds |
| `agents/openai.yaml` absence | LOW (optional for Codex) | Add for better Codex UX |

---

## 6. Recommendations

### Best Practices for Multi-Platform Skills

**Rule 1: Keep the base SKILL.md clean for portability**

Use only the five standard fields in frontmatter for cross-platform skills:
- `name` (explicit, matching directory name)
- `description` (comprehensive trigger text, third person)
- `license` (if needed)
- `metadata` (for versioning/author info)
- `allowed-tools` (if tool restrictions needed)

**Rule 2: Write descriptions as trigger specifications**

The `description` field is the single most important field. It determines when the skill fires. Write it as:
- What the skill does (concrete actions)
- Specific trigger keywords users would type
- File types or task patterns
- Enumerated use cases

Example:
```yaml
description: Analyzes and summarizes Git pull requests by examining diffs, comments, and changed files. Use when reviewing a PR, writing PR summaries, checking PR status, or when the user mentions pull request, PR review, or code review.
```

**Rule 3: Use progressive disclosure architecture**

```
my-skill/
├── SKILL.md        # Overview + links to details (under 500 lines)
├── references/
│   ├── domain-a.md # Loaded only when domain A is relevant
│   └── domain-b.md # Loaded only when domain B is relevant
└── scripts/
    └── process.py  # Executed without loading into context
```

**Rule 4: Place platform extensions in a known location**

For Claude Code-specific extensions, use a companion directory or document them:
```
my-skill/
├── SKILL.md              # Cross-platform base
├── .claude/              # Claude Code-specific overrides (optional pattern)
│   └── SKILL.claude.md   # Claude Code extension: context: fork, hooks, etc.
└── agents/
    └── openai.yaml       # Codex-specific UI metadata
```

**Rule 5: Validate before distributing**

- Run `skills-ref validate ./my-skill` (agentskills.io standard)
- Run `scripts/quick_validate.py ./my-skill` if targeting Codex
- Check `description` is non-empty and under 1024 chars
- Verify `name` matches directory name exactly

**Rule 6: Never include auxiliary documentation**

Do NOT create: README.md, INSTALLATION_GUIDE.md, CHANGELOG.md, QUICK_REFERENCE.md inside skill directories. These add noise for the agent and inflate context. All context should serve the agent, not human readers.

**Rule 7: Use scripts for deterministic operations**

When the same code would be regenerated repeatedly, or when consistency is critical, put the logic in `scripts/` and reference it from SKILL.md. Scripts execute without loading into context (only their output is consumed).

### Conversion Guide: Claude Code Skills to Multi-Platform

**Step 1: Audit existing SKILL.md**

Check for:
- [ ] Explicit `name:` field (not relying on directory name)
- [ ] Unknown frontmatter fields (`disable-model-invocation`, `context`, `agent`, `hooks`, `argument-hint`, `user-invocable`, `model`)
- [ ] `!`cmd`` injection patterns in body
- [ ] `$ARGUMENTS`, `$N`, `${CLAUDE_SKILL_DIR}` substitutions in body

**Step 2: Create a portable base**

```bash
# Create the standard structure
mkdir -p my-skill/agents my-skill/references my-skill/scripts
```

Base SKILL.md for cross-platform:
```markdown
---
name: my-skill
description: [Comprehensive trigger description with keywords]
license: [Your license]
metadata:
  author: your-org
  version: "1.0"
  platforms: "claude-code,codex,gemini-cli"
---

# My Skill

[Content here — pure Markdown, no Claude Code-specific syntax]
```

**Step 3: Create Codex UI metadata**

```yaml
# agents/openai.yaml
interface:
  display_name: "My Skill"
  short_description: "Short description for UI chips"
  default_prompt: "Help me with [task]"

policy:
  allow_implicit_invocation: true
```

**Step 4: Document Claude Code extensions separately**

If you need Claude Code-specific features (`context: fork`, hooks, dynamic injection), document them in SKILL.md as a conditional section or maintain a `.claude/` companion config. The base SKILL.md should remain standard-compliant.

**Step 5: Test cross-platform**

1. Validate with `skills-ref validate ./my-skill`
2. Test in Claude Code via `/skill-name`
3. Test in Codex via `$skill-name` or `/skills`
4. Verify no `!`cmd`` syntax appears as literal text on non-Claude platforms

---

## 7. Sources & Citations

| Source | URL | Date Accessed |
|---|---|---|
| agentskills.io Home | https://agentskills.io/home | 2026-03-12 |
| agentskills.io Specification | https://agentskills.io/specification | 2026-03-12 |
| agentskills.io What Are Skills | https://agentskills.io/what-are-skills | 2026-03-12 |
| agentskills.io Client Implementation | https://agentskills.io/client-implementation/adding-skills-support | 2026-03-12 |
| Claude API Agent Skills Overview | https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview | 2026-03-12 |
| Claude API Agent Skills Best Practices | https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices | 2026-03-12 |
| Claude Code Skills Documentation | https://code.claude.com/docs/en/skills | 2026-03-12 |
| anthropics/skills GitHub | https://github.com/anthropics/skills/ | 2026-03-12 |
| anthropics/skills skill-creator directory | https://github.com/anthropics/skills/tree/main/skills/skill-creator | 2026-03-12 |
| openai/skills GitHub | https://github.com/openai/skills | 2026-03-12 |
| openai/skills SKILL.md spec via DeepWiki | https://deepwiki.com/openai/skills/8.1-skill.md-format-specification | 2026-03-12 |
| Codex Skills Documentation | https://developers.openai.com/codex/skills/ | 2026-03-12 |
| OpenAI Codex skill-creator GitHub | https://github.com/openai/codex/tree/main/codex-rs/skills/src/assets/samples/skill-creator | 2026-03-12 |
| Gemini CLI Agent Skills Docs | https://geminicli.com/docs/cli/skills/ | 2026-03-12 |
| Gemini CLI Creating Skills Docs | https://geminicli.com/docs/cli/creating-skills/ | 2026-03-12 |
| Gemini CLI Changelog | https://geminicli.com/docs/changelogs/ | 2026-03-12 |
| Gemini CLI Epic Issue #15327 | https://github.com/google-gemini/gemini-cli/issues/15327 | 2026-03-12 |
| Gemini CLI Issue #15895 (Interoperability Gaps) | https://github.com/google-gemini/gemini-cli/issues/15895 | 2026-03-12 |
| Gemini CLI Custom Commands Docs | https://geminicli.com/docs/cli/custom-commands/ | 2026-03-12 |
| Gemini CLI DeepWiki Agent Skills | https://deepwiki.com/google-gemini/gemini-cli/3.11-agent-skills-and-sub-agents | 2026-03-12 |
| Codex Issue #8609 (Invalid YAML Frontmatter) | https://github.com/openai/codex/issues/8609 | 2026-03-12 |
| VS Code Issue #294520 (Frontmatter Validation) | https://github.com/microsoft/vscode/issues/294520 | 2026-03-12 |
| Claude Code Issue #14882 (Skills Token Loading Bug) | https://github.com/anthropics/claude-code/issues/14882 | 2026-03-12 |
| Claude Code Skills Budget Research (Gist) | https://gist.github.com/alexey-pelykh/faa3c304f731d6a962efc5fa2a43abe1 | 2026-03-12 |
| Claude Skills Deep Dive (Lee Han Chung) | https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/ | 2026-03-12 |
| Codex Skills Blog (fsck.me) | https://blog.fsck.com/2025/12/19/codex-skills/ | 2026-03-12 |
| Agent Skills Directory Standardization Issue #15 | https://github.com/agentskills/agentskills/issues/15 | 2026-03-12 |
| agentskills.io Extensibility Analysis | https://spec-weave.com/docs/guides/agent-skills-extensibility-analysis/ | 2026-03-12 |
| Google Codelabs: Gemini CLI Skills | https://codelabs.developers.google.com/gemini-cli/how-to-create-agent-skills-for-gemini-cli | 2026-03-12 |
| Claude Code Skill Budget Research | https://www.codewithseb.com/blog/claude-code-skills-reusable-ai-workflows-guide | 2026-03-12 |
| OpenCodeDocs Codex Platform Integration | https://lzw.me/docs/opencodedocs/obra/superpowers/platforms/codex/ | 2026-03-12 |
| OpenClaw Slash Commands Docs | Local: `vendors/openclaw/docs/tools/slash-commands.md` | 2026-03-13 |
| OpenClaw Skills Docs | Local: `vendors/openclaw/docs/tools/skills.md` | 2026-03-13 |
| OpenClaw Subagents Docs | Local: `vendors/openclaw/docs/tools/subagents.md` | 2026-03-13 |
| OpenClaw Session Tool Docs | Local: `vendors/openclaw/docs/concepts/session-tool.md` | 2026-03-13 |
| OpenClaw Multi-Agent Docs | Local: `vendors/openclaw/docs/concepts/multi-agent.md` | 2026-03-13 |
| OpenClaw ACP Agents Docs | Local: `vendors/openclaw/docs/tools/acp-agents.md` | 2026-03-13 |
| pi-mono GitHub README | https://github.com/badlogic/pi-mono | 2026-03-13 |
| OpenCode Skills Documentation | https://opencode.ai/docs/skills/ | 2026-03-13 |
| OpenCode Agents Documentation | https://opencode.ai/docs/agents/ | 2026-03-13 |
| OpenCode Commands Documentation | https://opencode.ai/docs/commands/ | 2026-03-13 |
| OpenCode Config Schema | https://opencode.ai/docs/config/ | 2026-03-13 |
| OpenCode Plugin System | https://opencode.ai/docs/plugins/ | 2026-03-13 |
| OpenCode Custom Tools | https://opencode.ai/docs/custom-tools/ | 2026-03-13 |

---

## Appendix: Validated Portable SKILL.md Template

This template satisfies the agentskills.io specification and is compatible with Claude Code, Codex, Gemini CLI, and all other compliant agents.

```markdown
---
name: [lowercase-hyphen-name]
description: [Third person. What the skill does + when to use it. Specific keywords. Max 1024 chars]
license: [Apache-2.0 | MIT | Proprietary | etc.]
metadata:
  author: [your-org-or-name]
  version: "1.0"
---

# [Skill Name]

## Overview

[1-2 sentence description assuming the agent is intelligent. Avoid explaining basics.]

## Workflow

1. [Step one — imperative form]
2. [Step two]
3. [Step three]

## Advanced options

- For [domain A] tasks: see [references/domain-a.md](references/domain-a.md)
- For [domain B] tasks: see [references/domain-b.md](references/domain-b.md)

## Scripts

Run `scripts/process.py [input]` to [action].
```
```

---

## 8. Deep-Dive: Implementation Differences Across Platforms

**Research Date**: 2026-03-12
**Confidence**: MEDIUM–HIGH (primary sources confirmed for most sections; sections marked LOW where only indirect evidence available)

---

### 8.1 Gemini CLI Skill Support

#### Version Timeline

Agent Skills support in Gemini CLI was introduced in four rapid increments:

| Version | Date | Status | What Changed |
|---|---|---|---|
| v0.23.0 | 2026-01-07 | Experimental preview | Skills require opt-in via `/settings`; install with `npm install -g @google/gemini-cli@preview` |
| v0.24.0 | 2026-01-14 | Enhanced preview | Significant advancements; remote agents support added |
| v0.25.0 | 2026-01-20 | Enabled by default | `/skills reload`, `/skills install`, `/skills uninstall` commands added |
| v0.26.0 | 2026-01-27 | Stable + built-in skills | `skill-creator` skill bundled; `pr-creator` skill added; skills on by default for all users |

Source: [Gemini CLI Changelog](https://geminicli.com/docs/changelogs/), verified 2026-03-12.

#### Frontmatter Field Support

Gemini CLI validates **only two frontmatter fields** in SKILL.md:

| Field | Required | Validated | Notes |
|---|---|---|---|
| `name` | Yes | Yes | Must match directory name |
| `description` | Yes | Yes | Discovery and trigger mechanism |
| `license` | No | No (ignored) | Passes through without effect |
| `compatibility` | No | No (ignored) | Passes through without effect |
| `metadata` | No | No (ignored) | Passes through without effect |
| `allowed-tools` | No | No (ignored) | Read but not enforced — see §8.5 |
| `disable-model-invocation` | No | Ignored (Claude Code-specific) | Appears as literal text |
| `user-invocable` | No | Ignored (Claude Code-specific) | Appears as literal text |
| `context` | No | Ignored (Claude Code-specific) | No subagent execution |
| `agent` | No | Ignored (Claude Code-specific) | No effect |
| `hooks` | No | Ignored (Claude Code-specific) | No effect |
| `argument-hint` | No | Ignored (Claude Code-specific) | No effect |
| `model` | No | Ignored (Claude Code-specific) | No effect |

**Critical limitation confirmed by GitHub Issue #15895**: Gemini CLI's implementation "validates only `name` and `description`" while ignoring `compatibility`, `allowed-tools`, and `metadata`. A skill written for Claude Code "works across all Agent Skills Open Standard-compliant CLIs... except Gemini CLI," breaking interoperability specifically around these fields.

Source: [Gemini CLI Issue #15895](https://github.com/google-gemini/gemini-cli/issues/15895), verified 2026-03-12. Confidence: HIGH.

#### Discovery Paths

Three resolution tiers with two path variants each:

| Tier | Primary Path | Cross-client Alias |
|---|---|---|
| Workspace (project-level) | `.gemini/skills/<name>/SKILL.md` | `.agents/skills/<name>/SKILL.md` |
| User (global) | `~/.gemini/skills/<name>/SKILL.md` | `~/.agents/skills/<name>/SKILL.md` |
| Extension-bundled | `~/.gemini/extensions/<ext-name>/.gemini/skills/SKILL.md` | — |

The `.agents/skills/` paths are the cross-client interoperability convention (see §8.7). Gemini CLI also scans `.agents/skills/` at both project and user scope for compatibility with skills installed by other compliant clients.

Source: [Gemini CLI Skills Docs](https://geminicli.com/docs/cli/skills/), [Gemini CLI Epic Issue #15327](https://github.com/google-gemini/gemini-cli/issues/15327), verified 2026-03-12.

#### No `agents/google.yaml` Equivalent

Gemini CLI has no vendor-specific metadata file equivalent to Codex's `agents/openai.yaml`. There is no `agents/google.yaml` or `agents/gemini.yaml` convention — confirmed by exhaustive search across official documentation, GitHub issues, and community resources. Invocation control is handled only through the standard `description` field (implicit triggering) or the `/skills install` command (explicit activation).

Confidence: HIGH (absence confirmed from multiple primary sources).

#### Dynamic Context Injection: Different Syntax

Claude Code uses `` !`command` `` backtick syntax for shell injection inside SKILL.md. Gemini CLI does NOT support this syntax in SKILL.md files. In a Gemini CLI context, `` !`command` `` appears as literal text and is not executed.

Gemini CLI supports an analogous injection syntax (`!{...}`) only in **custom commands** (TOML files stored in `.gemini/commands/`), not in SKILL.md files. Custom commands are a different primitive from skills — they are saved prompt shortcuts, not on-demand expertise modules.

Confidence: HIGH (confirmed from [Gemini CLI Custom Commands Docs](https://geminicli.com/docs/cli/custom-commands/)). The absence in SKILL.md context is confirmed by negative evidence across all Gemini CLI documentation.

#### `$ARGUMENTS` Handling

Gemini CLI does not support `$ARGUMENTS`, `$1`, `$2`, or `${CLAUDE_SKILL_DIR}` substitutions in SKILL.md. These strings appear as literal text when a skill is loaded on Gemini CLI. The equivalent in Gemini CLI custom commands is `{{args}}`, but this applies only to TOML command files, not SKILL.md.

Confidence: HIGH (confirmed by negative evidence across all Gemini CLI docs and issue tracker).

#### Progressive Disclosure: Partial Implementation

Gemini CLI implements tiers 1 and 2 of progressive disclosure but has a documented gap at tier 3:

- **Tier 1 (Catalog)**: Name + description disclosed at session start. Confirmed.
- **Tier 2 (Instructions)**: Full SKILL.md loaded on activation via `activate_skill` tool. Confirmed.
- **Tier 3 (Resources)**: NOT implemented as of March 2026. Gemini CLI's `getFolderStructure()` returns a flat list of all files rather than loading them selectively on demand. When a skill activates, ALL supporting files are potentially exposed rather than loaded lazily when the SKILL.md body references them.

Source: [GitHub Issue #15895](https://github.com/google-gemini/gemini-cli/issues/15895). Confidence: HIGH.

#### Subagent Execution: Not Supported

Gemini CLI does not implement the `context: fork` subagent pattern from Claude Code. All skills execute within the main conversation context. Gemini CLI has a separate subagent system (`.gemini/agents/` TOML or Markdown files) but this is independent from the skills system.

Confidence: HIGH.

---

### 8.2 Frontmatter Field Handling: Precise Behavioral Differences

#### Correction to Previous Report

The previous report (Section 4) stated: "Codex validation explicitly rejects unknown frontmatter fields." This is **incorrect as stated**. The reality is more nuanced:

1. **Codex runtime**: At runtime, the Codex engine silently ignores unknown frontmatter fields. Unknown fields do not cause skill loading failure. Only fields Codex reads (`name`, `description`, and standard optional fields) have any runtime effect. Source: [VS Code Issue #294520](https://github.com/microsoft/vscode/issues/294520), confirmed 2026-03-12.

2. **`quick_validate.py`**: The validation script validates against a strict allowlist and will emit warnings/errors for unknown fields. However, this is a development tool, not a runtime loader. Failing `quick_validate.py` does not prevent the skill from loading in Codex.

3. **VS Code editor**: VS Code's SKILL.md language support validates against a fixed allowlist of `compatibility`, `description`, `license`, `metadata`, `name` (plus recently added `argument-hint`, `disable-model-invocation`, `user-invocable`). Extended Claude Code fields (`context`, `model`, `agent`, `allowed-tools`) produce cosmetic lint warnings in VS Code that cannot be suppressed. These warnings have no runtime effect but clutter the Problems panel and may pollute AI context when VS Code diagnostics are shared with the language model.

4. **Hard failure condition (all platforms)**: A SKILL.md with completely unparseable YAML — for example, an unquoted colon in a `description` value like `description: Use when: the user asks about PDFs` — causes all platforms to skip the skill with a parse error. Codex hard-fails on invalid YAML with an "invalid YAML" error (confirmed [Codex Issue #8609](https://github.com/openai/codex/issues/8609)). The recommended fix is quoting values containing colons: `description: "Use when: the user asks about PDFs"`.

#### Precise Per-Platform Behavior Table

| Scenario | Claude Code | Codex (runtime) | Codex (quick_validate.py) | VS Code editor | Gemini CLI |
|---|---|---|---|---|---|
| Unknown frontmatter field (e.g., `context: fork`) | Processed as Claude Code feature | Silently ignored | Warning/error emitted | Lint warning | Silently ignored |
| Missing `name` field | Defaults to directory name | Skill rejected (required) | Error emitted | Error shown | Skill rejected (required) |
| Missing `description` field | Skill loads but won't auto-trigger | Skill rejected | Error emitted | Error shown | Skill rejected |
| `name` != directory name | Accepted (lenient) | Warned, loads anyway* | Error emitted | Error shown | Warned, loads anyway* |
| Unquoted colon in value | YAML parse error, skill skipped | YAML parse error, skill skipped | Caught pre-flight | Caught statically | YAML parse error, skill skipped |
| `name` contains uppercase | Warned, loads anyway* | Warned, loads anyway* | Error emitted | Error shown | Warned, loads anyway* |
| `name` > 64 chars | Warned, loads anyway* | Warned, loads anyway* | Error emitted | Error shown | Warned, loads anyway* |

\* Per agentskills.io client implementation guide: "lenient validation" — warn on cosmetic violations but load anyway. This is the recommended behavior for all compliant clients.

Source: [VS Code Issue #294520](https://github.com/microsoft/vscode/issues/294520), [Codex Issue #8609](https://github.com/openai/codex/issues/8609), [agentskills.io Client Implementation Guide](https://agentskills.io/client-implementation/adding-skills-support), verified 2026-03-12.

#### `name` Field Character Set: Cross-Platform Comparison

The agentskills.io spec mandates `[a-z0-9-]+` only — lowercase letters, numbers, hyphens, no consecutive hyphens, no leading/trailing hyphens. Underscores (`_`), uppercase letters, and numbers at the start are explicitly NOT permitted by the spec.

| Character | Spec | Claude Code | Codex | Gemini CLI |
|---|---|---|---|---|
| Lowercase `a-z` | Required | Yes | Yes | Yes |
| Numbers `0-9` | Allowed | Yes | Yes | Yes |
| Hyphen `-` | Allowed (not at start/end) | Yes | Yes | Yes |
| Underscore `_` | NOT allowed | Loads with warning* | Loads with warning* | Loads with warning* |
| Uppercase | NOT allowed | Loads with warning* | Loads with warning* | Loads with warning* |
| Number at start | NOT allowed | Loads with warning* | Loads with warning* | Loads with warning* |
| Consecutive hyphens `--` | NOT allowed | Loads with warning* | Loads with warning* | Loads with warning* |
| Length > 64 chars | NOT allowed | Loads with warning* | Loads with warning* | Loads with warning* |

\* The agentskills.io client implementation guide recommends all clients apply lenient validation (warn but load) for naming violations. No platform hard-rejects these cases at skill load time, though `quick_validate.py` will flag them.

**Practical implication**: If your existing skill uses underscores in `name` (e.g., `name: my_skill`), it will load on all three platforms with a warning, but it violates the spec and will fail `skills-ref validate`. Migration requires renaming to `my-skill` and updating the directory name to match.

Confidence: HIGH for spec rules; MEDIUM for per-platform runtime behavior (based on lenient validation recommendation in client guide, not per-platform testing).

---

### 8.3 Skill Matching and Trigger Algorithm Differences

#### Claude Code: Pure LLM Reasoning Over a Character-Budgeted Catalog

Claude Code does not use semantic embeddings, cosine similarity, regex matching, or any algorithmic intent classifier to decide which skill to activate. The matching is pure LLM reasoning:

1. At session start, all available skill names and descriptions are formatted into an XML block (`<available_skills>`) and embedded in the Skill tool's description.
2. Claude's language model reads this catalog as part of its context during its forward pass.
3. When the model determines a skill is relevant to the current task, it invokes the Skill tool with the skill name.

**The decision is made inside the transformer's forward pass — no application-level matching code exists.**

Source: [Claude Skills Deep Dive (Lee Han Chung, 2025)](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/), confirmed 2026-03-12.

**Token budget for the catalog**: The `<available_skills>` catalog has a hard limit of approximately **15,500–16,000 characters** (not tokens). Each skill entry consumes ~109 characters of XML formatting overhead plus the description length. With typical 263-character descriptions, approximately **42 skills fit** in the catalog. With compressed 130-character descriptions, approximately **67 skills fit**. Skills beyond this limit are silently excluded from the catalog and the model never sees them.

This budget appears to be set dynamically at ~2% of the context window (fallback: 16,000 characters) but has no configuration option.

Source: [Claude Code Issue #14882](https://github.com/anthropics/claude-code/issues/14882), [Skills Budget Gist](https://gist.github.com/alexey-pelykh/faa3c304f731d6a962efc5fa2a43abe1), confirmed 2026-03-12. Confidence: HIGH.

#### CRITICAL BUG — Skills Loading (As of March 2026, Unfixed)

The documented progressive disclosure behavior (only frontmatter loaded at startup) does not match actual Claude Code behavior. A controlled test confirmed that **full SKILL.md bodies are loaded at startup**, not just descriptions:

- A ~200-token test skill loaded 156 tokens (full body content), not ~10-15 tokens (description only).
- With official `claude-plugins-official/plugin-dev` plugin alone, 50,000+ tokens are consumed at session start.

This is logged as a confirmed bug ([Issue #14882](https://github.com/anthropics/claude-code/issues/14882)) but remained unfixed as of the last update in March 2026. The implication: the 500-line SKILL.md body length recommendation matters more urgently than documented, because the body is loaded immediately at session start, not on demand.

Confidence: HIGH (controlled empirical test reported in primary source).

#### Codex: LLM Reasoning Over Description Field

Codex uses the same LLM-reasoning approach as Claude Code. The `description` field is the primary trigger signal. Codex's `allow_implicit_invocation` flag in `agents/openai.yaml` controls whether implicit matching is enabled at all (default: `true`).

Notably, skill context **does not persist across turns** in Codex unless explicitly re-mentioned. A skill activated in turn 1 must be re-invoked in turn 3 if it is needed again; there is no automatic session-level skill persistence. This is a behavioral difference from Claude Code where skill instructions remain in context once loaded.

Source: [Codex Skills Blog (fsck.me)](https://blog.fsck.com/2025/12/19/codex-skills/), confirmed 2026-03-12. Confidence: MEDIUM (single community source; needs direct testing to confirm turn-persistence behavior).

#### Gemini CLI: LLM Reasoning via `activate_skill` Tool

Gemini CLI uses a dedicated `activate_skill` tool. The model receives the skill catalog in the system prompt and, when it determines a skill is relevant, calls `activate_skill(name="skill-name")` to load the full SKILL.md body. This is functionally equivalent to Claude Code's Skill tool invocation.

The system prompt instructs: "If a specialized skill is available for the task at hand, activate it before proceeding." This makes activation mandatory when the model determines a match, rather than optional.

There is no confirmation that Gemini CLI uses semantic embedding similarity for matching. All available evidence indicates it relies on LLM judgment over the description text, consistent with the other two platforms.

Source: [Gemini CLI DeepWiki](https://deepwiki.com/google-gemini/gemini-cli/3.11-agent-skills-and-sub-agents), confirmed 2026-03-12. Confidence: MEDIUM.

#### Maximum Skills and Priority/Ordering Rules

| Platform | Catalog Limit | Priority When Name Collision |
|---|---|---|
| Claude Code | ~42 skills at 263-char avg descriptions; ~67 at 130-char | Project-level overrides user-level; plugin-scoped skills use `plugin:skill` namespace (no collision possible) |
| Codex | No confirmed limit documented | Project-level overrides user-level (agentskills.io convention) |
| Gemini CLI | No confirmed limit documented | Project-level overrides user-level; warning logged on collision |
| agentskills.io spec | ~20 skills per 2000-character budget recommendation | Project-level overrides user-level (universal convention) |

Confidence: HIGH for Claude Code limit (empirical research); LOW for Codex and Gemini CLI limits (not documented; needs direct testing).

#### `user-invocable: false` Cross-Platform Behavior

`user-invocable: false` is a Claude Code-specific frontmatter field. Its behavior on other platforms:

- **Claude Code**: Hides the skill from the `/` slash-command menu; skill can only be activated programmatically (by the model or another skill).
- **Codex**: Field is silently ignored. Skill remains user-invocable via `$skill-name`. No equivalent behavior.
- **Gemini CLI**: Field is silently ignored. Skill remains user-invocable via `/skills` commands. No equivalent behavior.

The Codex equivalent is `policy.allow_implicit_invocation: false` in `agents/openai.yaml`, which blocks model-driven activation but not user-explicit invocation. There is no Codex field that hides a skill from user-invocation entirely.

Gemini CLI has no equivalent invocation-control mechanism beyond the standard `description`-based triggering. Confidence: HIGH.

---

### 8.4 Context Loading and Token Budget Differences

#### Tier 1 (Catalog) Loading

| Platform | What Loads | When | Budget |
|---|---|---|---|
| Claude Code | `name` + `description` from all skills | Session start | ~15,500–16,000 chars total (~42 skills at avg) |
| Codex | `name` + `description` from all skills | Session start | No confirmed character limit documented |
| Gemini CLI | `name` + `description` from all skills | Session start | No confirmed character limit documented |
| agentskills.io spec | `name` + `description` | Session start | ~50-100 tokens per skill (recommended) |

Confidence: HIGH for Claude Code budget (empirical); LOW for Codex and Gemini CLI budgets (unverified — needs direct testing).

#### Tier 2 (Full SKILL.md Body) Loading

| Platform | When Loaded | Actual Behavior |
|---|---|---|
| Claude Code | Documented: when skill activated. Actual: at session start (bug) | Full body loaded immediately at session start regardless of activation state. 50,000+ tokens consumed with multiple plugins. |
| Codex | When skill activated by model or user | Not confirmed as bugged; assumed to work as documented |
| Gemini CLI | When `activate_skill` tool is called | Body injected into system prompt on activation |

**The Claude Code Tier 2 loading bug is the highest-impact practical difference across platforms.** Authors targeting Claude Code must treat SKILL.md body size as a startup cost, not a lazy-load cost. The 500-line / 5000-token body recommendation becomes a hard constraint, not a guideline.

Confidence: HIGH for Claude Code (confirmed bug with empirical evidence); MEDIUM for Codex and Gemini CLI (no equivalent bug reports found, but no direct verification performed).

#### Tier 3 (Resources) Loading

| Platform | `references/` loading | `scripts/` loading |
|---|---|---|
| Claude Code | On demand when SKILL.md body references them | Agent decides to execute; output injected |
| Codex | On demand | Agent decides to execute; output injected |
| Gemini CLI | All files exposed at activation (flat list); on-demand loading NOT implemented | Not selectively loaded — flat dump |

Gemini CLI's flat resource dump (confirmed by Issue #15895) means a skill with large `references/` files will inject all of them into context when activated, not just the referenced subset. This is a known architectural gap.

Confidence: HIGH for Gemini CLI gap (confirmed from primary source).

#### File Size Limits for `scripts/`

No official documented maximum file size for `scripts/` files exists across any of the three platforms. The agentskills.io spec does not define a limit. Practical constraints come from context window sizes (script outputs that get injected into context must fit within the window). Unverified — needs direct testing.

---

### 8.5 `allowed-tools` Permission System Differences

#### Syntax Specification

The agentskills.io spec defines `allowed-tools` as:

```yaml
allowed-tools: Bash(git:*) Bash(jq:*) Read
```

Key syntax rules:
- Space-delimited list (not a YAML array)
- Tool names match the host agent's tool naming convention
- Glob patterns are supported: `Bash(git:*)` permits all `git` subcommands
- The field is marked **experimental** in the spec

#### Per-Platform Behavior

| Platform | `allowed-tools` Status | Syntax | Effect |
|---|---|---|---|
| Claude Code | Supported (experimental) | Space-delimited; `ToolName` or `Bash(cmd:*)` | Pre-approves tools; bypasses per-tool confirmation prompts |
| Codex | Supported (experimental) | Space-delimited; same `Bash(cmd:*)` pattern | Confirmation behavior varies; direct effect unconfirmed |
| Gemini CLI | Parsed but not enforced (Issue #15895) | Space-delimited | Field read but has no effect on tool gating |

Gemini CLI's Issue #15895 explicitly calls out `allowed-tools` as one of three critical implementation gaps: "Gemini CLI validates only `name` and `description`" and the `allowed-tools` field is ignored.

Confidence: HIGH for Claude Code; MEDIUM for Codex; HIGH for Gemini CLI gap.

#### Tool Name Differences Across Platforms

Claude Code tool names and their approximate equivalents:

| Claude Code Tool | Codex Equivalent | Gemini CLI Equivalent |
|---|---|---|
| `Read` | `Read` (same) | Read file tool (name varies by implementation) |
| `Write` | `Write` (same) | Write file tool |
| `Edit` | `Edit` (same) | Edit file tool |
| `Bash` | `Bash` (same) | Shell execution tool |
| `Bash(git:*)` | `Bash(git:*)` (same pattern) | Unverified — `allowed-tools` not enforced |
| `TodoWrite` | `update_plan` | N/A |
| `Task` (subagent) | `spawn_agent` + `wait` | N/A (no subagent in skills) |
| `Grep` | Native Bash grep | Native Bash grep |
| `Glob` | Native Bash find | Native Bash find |

**Practical risk**: A skill with `allowed-tools: Bash(git:*) Read` pre-approves git and file reads on Claude Code. On Codex, the field is parsed and has partial effect. On Gemini CLI, it has no effect and the model will ask for confirmation on every tool call.

Source: [OpenCodeDocs Codex Platform Integration](https://lzw.me/docs/opencodedocs/obra/superpowers/platforms/codex/), [agentskills.io Extensibility Analysis](https://spec-weave.com/docs/guides/agent-skills-extensibility-analysis/), confirmed 2026-03-12.

#### What Happens When `allowed-tools` Lists a Non-Existent Tool

Per the agentskills.io client implementation guide: unknown tool names in `allowed-tools` should be silently ignored by the agent. The field is advisory — it lists tools to pre-approve, not tools to require. An `allowed-tools` entry for a tool the platform doesn't have should not cause skill load failure.

Confidence: MEDIUM (derived from spec intent; not confirmed by per-platform testing).

---

### 8.6 Namespacing and Plugin Scoping

#### Claude Code: Plugin Namespace via Directory Convention

Claude Code implements namespacing through the `plugin-name:skill-name` convention for skills loaded from plugin directories. A skill at `.claude/plugins/rd2/skills/my-skill/SKILL.md` is addressable as `rd2:my-skill`. This namespace isolation means:

- Two plugins can each have a skill named `code-review` without collision.
- User-level and project-level skills use bare names (`/code-review`).
- Plugin-scoped skills use namespaced invocation (`/rd2:code-review`).

There is no YAML-level `namespace:` field; namespacing is entirely path-derived.

#### Codex: Namespace via `superpowers:` Prefix Convention

Codex's skills ecosystem (particularly via the "Superpowers" skill collection) uses a `superpowers:` prefix convention for bundled skills. Personal skills use bare names. Personal skills can override official bundled skills with the same name, enabling local customization.

Codex does not have an equivalent to Claude Code's plugin directory that auto-derives namespaces. All skills live in a flat namespace unless the skill author includes the prefix in the `name` field itself (e.g., `name: superpowers-brainstorming`).

Source: [OpenCodeDocs Codex Platform Integration](https://lzw.me/docs/opencodedocs/obra/superpowers/platforms/codex/), confirmed 2026-03-12.

#### Gemini CLI: Flat Namespace with Extension Scoping

Gemini CLI does not implement a plugin namespace convention equivalent to Claude Code's. Skills installed via extensions appear under the extension's directory path but are addressed by bare `name` in the `activate_skill` tool call.

For MCP tool namespacing (a separate system), Gemini CLI uses `mcp_{serverName}_{toolName}` as a fully qualified name to prevent cross-server collisions. This pattern does not extend to skills.

**Name collision resolution**: Project-level skills override user-level skills with the same name. Within the same scope, the last-registered skill overwrites previous ones (no warning system for this within-scope collision as of March 2026).

Confidence: MEDIUM (MCP namespace behavior confirmed; skill-specific namespace behavior inferred from documentation patterns).

#### Cross-Platform Standard for Namespacing

There is **no cross-platform standard for skill namespacing**. The agentskills.io spec constrains `name` to `[a-z0-9-]+` but defines no namespace separator or plugin scope mechanism. The `plugin-name:skill-name` convention is Claude Code-specific.

**Practical implication**: A skill named `code-review` distributed as a shared package will conflict with any other skill named `code-review` on Codex and Gemini CLI. For public distribution, use globally unique names by incorporating an organization prefix in the name itself: `myorg-code-review`.

Confidence: HIGH.

---

### 8.7 `agents/` Directory Convention Evolution

#### Current State (March 2026)

The `agents/` directory convention is specific to OpenAI Codex. The `agents/openai.yaml` file provides UI metadata (display name, icon, color, default prompt) and invocation policy (`allow_implicit_invocation`). No other major platform has adopted a parallel `agents/<vendor>.yaml` convention.

**Confirmed absence of parallel files:**
- No `agents/google.yaml` or `agents/gemini.yaml` exists in any official Gemini CLI documentation, repository, or example.
- No `agents/anthropic.yaml` exists in Claude Code's skill format.
- No `agents/microsoft.yaml` or `agents/github.yaml` exists in GitHub Copilot's skills implementation.

The `agents/` directory within a skill is a Codex-specific extension, not a cross-platform pattern.

Source: Confirmed by exhaustive search across official documentation and GitHub repositories for all three platforms, 2026-03-12. Confidence: HIGH.

#### Discovery Path Standardization: `.agents/skills/`

The active community standardization effort (tracked in [agentskills/agentskills Issue #15](https://github.com/agentskills/agentskills/issues/15)) focuses on the **skill discovery path**, not on vendor-specific YAML files. The proposal: all tools should scan `.agents/skills/` as a universal cross-client skill directory.

Status of `.agents/skills/` adoption as of March 2026:

| Platform | `.agents/skills/` Status |
|---|---|
| Claude Code | Pending — not yet implemented (listed in Issue #15 as "to-do") |
| Codex | Implemented |
| Gemini CLI | Implemented (aliased alongside `.gemini/skills/`) |
| VS Code (Copilot) | Implemented |
| Cursor | Implemented |
| Amp | Implemented |
| Windsurf | Implemented |
| OpenCode | Implemented |
| Augment Code | Implemented |
| Goose | Implemented |

Source: [agentskills/agentskills Issue #15](https://github.com/agentskills/agentskills/issues/15), confirmed 2026-03-12.

**Note**: Claude Code is one of the few platforms NOT yet scanning `.agents/skills/`, despite being the originator of the standard. Skills placed in `.agents/skills/` will NOT be visible to Claude Code until this is implemented. For full portability today, skills must be placed in both `.agents/skills/` (for all others) and `.claude/skills/` (for Claude Code) — or symlinked.

Confidence: HIGH.

#### Is the `agents/<vendor>.yaml` Pattern Being Generalized?

No evidence of generalization. The pattern is not being standardized in the agentskills.io spec. The community effort focuses on discovery path convergence (`.agents/skills/`), not on vendor-specific metadata files. If Gemini CLI or other platforms need per-skill UI metadata, they would likely implement their own patterns independently.

Confidence: HIGH (confirmed by absence in spec proposals and community discussions).

---

### 8.8 Adaptive Skill Design Patterns

Based on all findings above, the following patterns represent concrete approaches for writing skills that work well across Claude Code, Codex, and Gemini CLI.

#### Pattern 1: The Portable Base with Platform Extension Directories

Structure:
```
my-skill/
├── SKILL.md                # Portable base — only standard fields
├── agents/
│   └── openai.yaml         # Codex UI metadata (does not affect other platforms)
├── references/
│   └── details.md
└── scripts/
    └── process.py
```

The `SKILL.md` contains only the five standard fields (`name`, `description`, `license`, `metadata`, `allowed-tools`). Claude Code-specific extensions (`context: fork`, `hooks`, `argument-hint`, `model`) are documented as comments in SKILL.md rather than as active frontmatter fields, to avoid breaking Codex's `quick_validate.py` if that tool is used. The `agents/openai.yaml` is invisible to Claude Code and Gemini CLI and has no effect on them.

**What this achieves**: A single skill directory that works on all three platforms without modification, with Codex getting enhanced UI metadata.

#### Pattern 2: Conditional Instruction Blocks (Markdown Sectioning)

For skills that need to give different instructions depending on the platform, use a clearly labeled conditional section in the SKILL.md body. The LLM on each platform will read the section relevant to its own context:

```markdown
## Platform Notes

### Claude Code
If running in Claude Code: use `$ARGUMENTS` for arguments and `!`git status`` for
live git data injection.

### Codex / Gemini CLI / Other
If running outside Claude Code: run `git status` directly via Bash tool.
Arguments are provided in natural language without substitution.
```

This pattern works because all platforms load the full SKILL.md body — each platform's LLM reads the complete text and applies the relevant section based on its self-knowledge of which platform it is. No runtime branching code is needed.

**Limitation**: Relies on the LLM correctly self-identifying its platform. This generally works but is not guaranteed. Do not use this for security-critical behavior.

#### Pattern 3: Graceful Degradation for Platform-Specific Features

For features that have no equivalent on some platforms, design the body to be useful without the feature. The skill should complete its core task without `!`cmd`` injection, `$ARGUMENTS`, or `context: fork`. Platform-specific enhancements are additive, not required:

```markdown
## Getting PR data

Run `gh pr diff` and `gh pr view --comments` to get the PR data needed.

<!-- Claude Code enhancement: the following injections fire automatically
PR diff: !`gh pr diff`
PR comments: !`gh pr view --comments`
-->

[Proceed to analyze the PR data provided above]
```

On Claude Code, the backtick injections execute and pre-populate the PR data before the LLM sees the prompt. On Codex and Gemini CLI, the comment is ignored and the LLM executes the gh commands itself via Bash tool. The outcome is the same; only the efficiency differs.

**Note**: HTML comments in SKILL.md do hide the injection syntax from Codex and Gemini CLI's LLMs (since the comments are stripped from rendered Markdown), but they do NOT hide it from Claude Code's injection processor, which operates on raw text before rendering.

#### Anti-Patterns to Avoid

**Anti-pattern 1: Claude Code-specific frontmatter in cross-platform skills**

```yaml
# DO NOT do this for cross-platform skills
---
name: my-skill
description: Does something useful.
context: fork
agent: Explore
hooks:
  pre: scripts/setup.sh
---
```

`context`, `agent`, and `hooks` are silently ignored by Codex and Gemini CLI at runtime, but `quick_validate.py` will emit errors and VS Code will show lint warnings. For cross-platform skills, move these to documentation comments or a separate `SKILL.claude.md` companion file (not auto-loaded by other platforms).

**Anti-pattern 2: Relying on `allowed-tools` for security on Gemini CLI**

```yaml
# DO NOT rely on this providing security guarantees on Gemini CLI
allowed-tools: Bash(git:*) Read
```

On Gemini CLI, this field is currently parsed but has no enforcement effect. The skill will still prompt for confirmation for every tool call regardless of this field. Do not architect security models assuming `allowed-tools` is enforced cross-platform.

**Anti-pattern 3: Large `references/` directories on Gemini CLI**

Gemini CLI dumps all files in the skill directory at activation (flat list, non-lazy). Skills with extensive `references/` subdirectories will inject all reference file content into context immediately when activated on Gemini CLI, potentially consuming large amounts of context. Keep `references/` files individually small and few when targeting Gemini CLI.

**Anti-pattern 4: Long descriptions that consume catalog budget on Claude Code**

```yaml
# Problematic for Claude Code with 50+ skills installed
description: |
  This skill does X, Y, and Z. It handles cases A, B, C, D, E, F.
  Use it whenever the user is working with PDFs, including extraction,
  merging, filling, splitting, converting, watermarking, encrypting...
  [400 characters]
```

With Claude Code's ~15,500-character catalog budget, descriptions averaging 400 characters allow only ~28 skills. With 50+ skills, overflow skills are silently excluded. Keep descriptions at or below 130 characters for large skill collections. Front-load the most important trigger keywords in the first 50 characters.

**Anti-pattern 5: Assuming skills persist across turns in Codex**

A skill activated in turn 1 in Codex does not automatically persist into turn 3. Design workflows that either complete within a single turn or explicitly re-invoke the skill in subsequent turns. This differs from Claude Code where skill instructions remain in context once loaded (modulo the loading bug described in §8.3).

---

### 8.9 Platform Support Matrix (Updated)

This matrix supersedes the comparison in Section 4, adding Gemini CLI and incorporating precise behavioral details from this deep-dive.

| Dimension | Claude Code | Codex | Gemini CLI | agentskills.io Spec | OpenClaw | pi-mono | OpenCode |
|---|---|---|---|---|---|---|---|
| **File format** | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter |
| **`name` required** | No (defaults to dir name) | Yes (hard) | Yes (hard) | Yes | Yes | Yes | Yes (hard; must match dir name exactly) |
| **`description` required** | Recommended | Yes (hard) | Yes (hard) | Yes | Yes | Yes | Yes (hard; min 20 chars enforced) |
| **`license` field** | Ignored at runtime | Supported | Ignored | Supported | Not supported | Not documented | Silently ignored |
| **`compatibility` field** | Ignored | Partially supported | Ignored (Issue #15895) | Supported | Not supported | Not documented | Silently ignored |
| **`metadata` field** | Ignored | Supported | Ignored (Issue #15895) | Supported | Yes (single-line JSON only; `openclaw` key for extensions) | Not supported | Silently ignored (no extension keys) |
| **`allowed-tools` field** | Enforced (experimental) | Partially enforced (experimental) | Parsed but not enforced (Issue #15895) | Supported (experimental) | Not in standard usage | Not supported | Not supported |
| **Unknown frontmatter fields** | Silently ignored at runtime | Silently ignored at runtime; `quick_validate.py` warns | Silently ignored | Lenient: warn, load anyway | Silently ignored | Silently ignored | Silently ignored |
| **VS Code editor lint for unknown fields** | Warns (cosmetic) | Warns (cosmetic) | Warns (cosmetic) | N/A | Warns (cosmetic) | Warns (cosmetic) | Warns (cosmetic) |
| **`name` character set** | `[a-z0-9-]` enforced with warning | `[a-z0-9-]` enforced with warning | `[a-z0-9-]` enforced with warning | `[a-z0-9-]` strict | `[a-z0-9-]` | `[a-z0-9-]` | `^[a-z0-9]+(-[a-z0-9]+)*$` strict regex |
| **`name`/dir match required** | No (lenient) | Warned, loads anyway | Warned, loads anyway | Yes (strict spec) | Yes | Yes | Yes (hard enforcement) |
| **Invocation control** | `disable-model-invocation`, `user-invocable` | `agents/openai.yaml` `allow_implicit_invocation` | None (description-only control) | Not in spec | `user-invocable`, `disable-model-invocation`, `command-dispatch: tool` | Not supported | Config-only: `permission.skill` allow/deny/ask patterns (not in SKILL.md) |
| **UI metadata** | Not supported | `agents/openai.yaml` | Not supported | Not in spec | `metadata.openclaw.emoji` (macOS Skills UI only) | Not supported | Not supported |
| **Dependency declarations** | Not supported | `agents/openai.yaml` | Not supported | Not in spec | `metadata.openclaw.requires.*` (binary/env/config gating) | Not supported | Not supported |
| **`agents/<vendor>.yaml`** | None | `agents/openai.yaml` | None (no `agents/google.yaml`) | Not in spec | None | None | None |
| **Subagent execution** | `context: fork` + `agent:` | Not supported | Not supported | Not in spec | `sessions_spawn` tool (config-based) | Not supported | Not in SKILL.md; via agent config or `.opencode/agents/` files |
| **Dynamic context injection** | `` !`cmd` `` executes shell | Appears as literal text | Appears as literal text | Not in spec | Not supported | Not supported | Not in SKILL.md; supported in command templates only |
| **Argument substitution** | `$ARGUMENTS`, `$N`, `${CLAUDE_SKILL_DIR}` | Appears as literal text | Appears as literal text | Not in spec | Raw args string; `{baseDir}` for skill path | Not supported | Not in SKILL.md; `$ARGUMENTS`, `$NAME`, `$1`, `$2` in command templates |
| **`{{args}}` injection** | Not supported | Not supported | Custom commands only (not SKILL.md) | Not in spec | Not supported | Not supported | Not supported in SKILL.md |
| **Hooks** | `hooks:` field | Not supported | Not supported | Not in spec | Not in skill frontmatter | Not supported | Not in SKILL.md; JS plugin hooks separate from skills |
| **Plugin namespacing** | `plugin:skill` (path-derived) | `superpowers:skill` (convention only) | None (flat namespace) | Not in spec | Flat (skill `name` only) | Flat (`/skill:name`) | Flat (skill `name` only) |
| **Skill matching algorithm** | LLM reasoning (no embeddings) | LLM reasoning | LLM reasoning via `activate_skill` tool | Not specified | LLM reasoning (XML catalog in system prompt) | LLM reasoning | LLM reasoning via `skill` tool with `<available_skills>` XML catalog |
| **Skill catalog budget** | ~15,500–16,000 chars total | Not documented | Not documented | ~50-100 tokens per skill | 195 chars base + 97 per skill | Not documented | Not documented |
| **Tier 1 loading (catalog)** | Frontmatter only (intended); full body (bug) | Frontmatter only (intended) | Frontmatter only | Frontmatter only | Frontmatter only | Frontmatter only | Frontmatter only (via `<available_skills>` in skill tool description) |
| **Tier 2 loading (body)** | At session start (bug — not on demand) | On demand at activation | On demand via `activate_skill` | On activation | On demand | On demand | On demand via `skill({ name: "..." })` tool call (true lazy load) |
| **Tier 3 loading (resources)** | On demand | On demand | Flat dump at activation (not lazy — Issue #15895) | On demand | On demand | Not documented | On demand via file tools |
| **Max SKILL.md body** | 500 lines recommended (critical — loads at startup) | 500 lines recommended | 500 lines recommended | 5000 tokens recommended | 500 lines recommended | Not documented | Not documented |
| **Discovery paths (project)** | `.claude/skills/` | `.codex/skills/` | `.gemini/skills/`, `.agents/skills/` | `.agents/skills/`, `.<client>/skills/` | `<workspace>/skills/` | `.pi/skills/`, `.agents/skills/` | `.opencode/skills/`, `.claude/skills/`, `.agents/skills/` (walks git worktree) |
| **Discovery paths (user)** | `~/.claude/skills/` | `~/.codex/skills/` | `~/.gemini/skills/`, `~/.agents/skills/` | `~/.agents/skills/`, `~/.<client>/skills/` | `~/.openclaw/skills/` | `~/.pi/agent/skills/`, `~/.agents/skills/` | `~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.agents/skills/` |
| **`.agents/skills/` support** | Not yet (pending) | Yes | Yes | Convention (not mandated) | No (uses own path) | Yes | Yes (native; all three project-local and all three user-global paths) |
| **Skill persistence across turns** | Yes (once loaded, stays in context) | No (single-turn only) | Yes (injected into system prompt) | Not specified | Yes (snapshot at session start) | Not documented | Not documented (likely stays in context after load) |
| **Validation tool** | Built-in (lint warnings) | `quick_validate.py` (script) | Not documented | `skills-ref validate` CLI | Not built-in | Not documented | Not documented |
| **Scaffolding tool** | Not built-in | `init_skill.py` (script) | Not documented | Not in spec | Not built-in | Not documented | Not documented |
| **Version skill support added** | Before 2025 (original creator) | 2025 (adoption) | v0.23.0 (2026-01-07) | Spec published 2025-12-18 | Not documented | Not documented | Not documented (v1.x; supports `.agents/skills/` natively) |
| **Skill support maturity** | Stable | Stable | Stable (since v0.26.0, 2026-01-27) | Reference | Stable | Stable | Stable |

**Confidence Note on Codex columns**: Several Codex cells (skill persistence, catalog budget) are rated MEDIUM confidence as they derive from community documentation rather than official primary sources. Cells marked explicitly in §8.3 supersede these.

**Confidence Note on Gemini CLI columns**: Gaps documented in Issue #15895 are HIGH confidence. Cells not directly addressed by that issue or the changelog are MEDIUM confidence.

**Confidence Note on OpenCode columns**: HIGH confidence for frontmatter fields, discovery paths, skill tool catalog mechanism, and permission model (from official docs). MEDIUM confidence for skill persistence behavior (inferred from lazy-load architecture) and skill catalog budget (not documented).

---

### 8.10 OpenClaw Skill System

**Confidence: HIGH** — verified from primary source local files (`/Users/robin/projects/gitops/vendors/openclaw/docs/tools/skills.md`, `skills.md`, `creating-skills.md`, bundled SKILL.md files), 2026-03-13.

#### Format and Standard Compliance

OpenClaw uses **AgentSkills-compatible** skill folders (the `agentskills.io` open standard). Each skill is a directory containing a `SKILL.md` with YAML frontmatter and instructions, matching the base specification exactly. The documentation explicitly states: "We follow the AgentSkills spec for layout/intent."

Minimum valid SKILL.md for OpenClaw is identical to the base standard:

```markdown
---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image
---
```

#### Frontmatter Fields

OpenClaw recognizes and enforces several frontmatter fields beyond the base `name` and `description` pair. Unlike other platforms, OpenClaw adds a `metadata` single-line JSON convention for all platform-specific extensions.

| Field | Standard? | OpenClaw Behavior |
|---|---|---|
| `name` | Yes | Required for load; used as skill identifier and slash command name |
| `description` | Yes | Trigger mechanism; injected into system prompt as skill catalog entry |
| `homepage` | No (OpenClaw + `metadata.openclaw.homepage`) | URL shown in macOS Skills UI as "Website" |
| `user-invocable` | Shared with Claude Code | `true/false` (default: `true`); when `true`, skill is exposed as a user slash command |
| `disable-model-invocation` | Shared with Claude Code | `true/false` (default: `false`); when `true`, skill is excluded from model prompt but still available via user invocation |
| `command-dispatch` | No (OpenClaw only) | When set to `tool`, slash command bypasses model and dispatches directly to a named tool |
| `command-tool` | No (OpenClaw only) | Tool name to invoke when `command-dispatch: tool` is set |
| `command-arg-mode` | No (OpenClaw only) | `raw` (default); forwards raw args string to tool |
| `metadata` | Spec-supported | Must be a **single-line JSON object** (multi-line fails the parser) |

The `skill-creator` SKILL.md (OpenClaw's bundled skill for authoring new skills) states: **"Do not include any other fields in YAML frontmatter"** — this means that from the Codex skill-creator's perspective, only `name` and `description` are intended. OpenClaw's own bundled skills do use the additional fields documented above.

#### The `metadata.openclaw` Key

OpenClaw-specific extensions live under a `metadata.openclaw` JSON object. The full documented schema:

```yaml
metadata:
  {
    "openclaw": {
      "emoji": "🧩",
      "homepage": "https://example.com",
      "always": true,
      "os": ["darwin", "linux", "win32"],
      "requires": {
        "bins": ["uv"],
        "anyBins": ["claude", "codex"],
        "env": ["GEMINI_API_KEY"],
        "config": ["browser.enabled"]
      },
      "primaryEnv": "GEMINI_API_KEY",
      "skillKey": "custom-key",
      "install": [...]
    }
  }
```

Fields under `metadata.openclaw`:

| Field | Purpose |
|---|---|
| `emoji` | macOS Skills UI display emoji |
| `homepage` | URL shown as "Website" in macOS Skills UI |
| `always` | When `true`, always include skill (skip all other load-time gates) |
| `os` | Platform filter: `["darwin"]`, `["linux"]`, `["win32"]` or combinations |
| `requires.bins` | Array; all listed binaries must exist on `PATH` |
| `requires.anyBins` | Array; at least one must exist on `PATH` |
| `requires.env` | Array; env vars must exist or be provided in config |
| `requires.config` | Array; `openclaw.json` config paths that must be truthy |
| `primaryEnv` | Env var name for `skills.entries.<name>.apiKey` convenience |
| `skillKey` | Override the `skills.entries` config key (default: skill `name`) |
| `install` | Array of installer specs for macOS Skills UI (brew/node/go/uv/download) |

There is **no `user-invocable` equivalent inside `metadata.openclaw`** — that field is a top-level frontmatter key, not nested under `metadata`. There is also no color, branding, or `default_prompt` field equivalent to Codex's `agents/openai.yaml` interface block.

#### Discovery Paths

Skills are loaded from three locations with explicit precedence:

| Tier | Path | Precedence |
|---|---|---|
| **Workspace** | `<workspace>/skills/<name>/SKILL.md` | Highest |
| **Managed/local** | `~/.openclaw/skills/<name>/SKILL.md` | Middle |
| **Bundled** | Shipped with the npm package or OpenClaw.app | Lowest |

Additional paths configurable via `skills.load.extraDirs` in `~/.openclaw/openclaw.json` (lowest precedence of all). In **multi-agent setups**, workspace skills are per-agent (each agent has its own workspace), while `~/.openclaw/skills/` is shared across all agents on the same machine.

Plugins can also ship skills by listing `skills` directories in `openclaw.plugin.json`.

#### Skill Catalog Injection

OpenClaw injects an XML skills list into the system prompt for each agent run using `formatSkillsForPrompt` from `pi-coding-agent`. The cost formula is deterministic: **195 characters base** + **97 characters per skill** + field lengths. Skills are snapshot at session start and reused for all turns in that session; a watcher can hot-reload on `SKILL.md` changes.

#### Gating and Load-time Filtering

OpenClaw filters skills at load time using the `metadata.openclaw.requires.*` fields. If the required binaries, env vars, or config values are absent, the skill is silently excluded from the session. This is fundamentally different from Claude Code (which loads all skills and relies on LLM judgment) and Codex (which validates but does not gate by env/binary presence).

#### Relationship to Codex `skill-creator`

OpenClaw bundles its own version of the `skill-creator` skill. The bundled OpenClaw `skill-creator/SKILL.md` was derived from the Codex version — its Step 3 and packaging workflow reference `init_skill.py` and `package_skill.py` scripts, and it states the `.skill` package format is a zip with a `.skill` extension. However, the OpenClaw `skill-creator` is authored for use with the Codex agent (the skill body calls these as bash commands), not the OpenClaw agent itself.

#### Public Registry: ClawHub

OpenClaw has a public skills registry at `clawhub.com`, managed via the `clawhub` CLI tool (`npm install -g clawhub`). The `clawhub` skill itself is a bundled skill that teaches the agent how to use the CLI.

#### `{baseDir}` Variable

Skills can reference `{baseDir}` in instructions to get the absolute path to the skill folder. This is equivalent to Claude Code's `${CLAUDE_SKILL_DIR}`.

---

### 8.11 pi-mono Skill System

**Confidence: HIGH** — verified from `github.com/badlogic/pi-mono` README and package documentation (WebFetch, 2026-03-13). Note: OpenClaw embeds `@mariozechner/pi-coding-agent` from pi-mono as its agent runtime.

#### What pi-mono Is

pi-mono (`github.com/badlogic/pi-mono`) by Mario Zechner is a monorepo containing several packages:

- `@mariozechner/pi-ai` — Unified multi-provider LLM API (OpenAI, Anthropic, Google, etc.)
- `@mariozechner/pi-agent-core` — Agent runtime with tool calling and state management
- `@mariozechner/pi-coding-agent` — Interactive coding agent CLI (the `pi` command)
- `@mariozechner/pi-tui` — Terminal UI library
- `@mariozechner/pi-web-ui` — Web components for AI chat interfaces
- `@mariozechner/pi-pods` — CLI for managing vLLM deployments on GPU pods
- `@mariozechner/pi-mom` — Slack bot that delegates messages to the pi coding agent

The standalone `pi` CLI is invoked as `pi "task"` (interactive) or `pi -p "task"` (non-interactive/print mode).

#### Skill Support

Pi supports skills following the **Agent Skills standard** (`SKILL.md` format). Skills are on-demand capability packages invoked via `/skill:name` syntax or loaded automatically by the agent.

**Discovery paths** (searched in order):

| Path | Scope |
|---|---|
| `~/.pi/agent/skills/` | User-global |
| `~/.agents/skills/` | Cross-client standard path |
| `.pi/skills/` | Project-local (from cwd upward) |
| `.agents/skills/` | Cross-client standard path (from cwd upward) |
| Pi packages | Distributed via npm or git |

Pi uses the `.agents/skills/` cross-client convention, making skills installed by other agentskills.io-compliant tools (including Gemini CLI) automatically discoverable by pi.

#### Frontmatter Fields

Pi is a minimal implementation. The documented minimum is:

```markdown
---
name: skill-name
description: What this skill does and when to use it.
---
```

Pi reads and enforces `name` and `description`. There is no documented support for:
- `user-invocable` (no UI concept — pi is TUI-only)
- `disable-model-invocation`
- `context: fork` or `agent:` (no subagent system — see below)
- `metadata.openclaw` (pi-specific metadata not documented)
- `argument-hint`, `hooks`, `model`, `allowed-tools`

The frontmatter fields supported by pi are effectively limited to the base agentskills.io specification (`name`, `description`, and pass-through of `license`, `compatibility`, `metadata` without enforcement).

#### Slash Commands

Pi has an extensive built-in slash command system. Commands include:
`/login`, `/logout`, `/model`, `/settings`, `/resume`, `/new`, `/tree`, `/fork`, `/compact`, `/copy`, `/export`, `/share`, `/reload`, `/hotkeys`, `/changelog`, `/quit`

Skills are invoked via `/skill:name` syntax. Extensions can register custom commands. Prompt templates expand via `/templatename`.

This is distinct from other platforms: pi uses `/skill:name` with a colon as the separator, while Claude Code uses `/plugin:skill` and Codex uses `$skill-name`.

#### Built-in Tools

Pi ships with four default tools: `read`, `write`, `edit`, `bash`. Additional tools include `grep`, `find`, `ls`. This is a minimal toolset compared to Claude Code (which ships over 20 tools including browser, MCP integration, and agent spawning tools).

#### Agent Architecture: Deliberately Single-Agent

Pi explicitly and deliberately has **no built-in sub-agent system**. The documentation states: "No sub-agents. There's many ways to do this. Spawn pi instances via tmux, or build your own with extensions, or install a package that does it your way."

This is a design philosophy choice: pi deliberately avoids baking in an orchestration model, instead allowing users to compose multi-agent workflows externally (via tmux, shell scripts, or custom extensions).

#### Context and System Prompt

Pi supports project-level system prompts via `.pi/SYSTEM.md` (project) or `~/.pi/agent/SYSTEM.md` (global). Pi also reads `AGENTS.md` or `CLAUDE.md` context files from the workspace (loaded from multiple locations including cwd and parent directories).

#### Anthropic Prompt Caching

Pi added Anthropic prompt caching support in January 2026 (PR #584, merged Jan 2026). This is noted in the OpenClaw `coding-agent` skill as a significant improvement.

#### OpenClaw's Relationship to pi-mono

OpenClaw embeds the `@mariozechner/pi-agent-core` and `@mariozechner/pi-coding-agent` packages as its agent runtime. Specifically:
- OpenClaw uses pi's **models/tools code** (via `createAgentSession()`)
- OpenClaw does **NOT** use pi's session management or agent runtime loop
- OpenClaw does **NOT** ship the `pi` CLI or require it as a dependency

When a user installs pi separately (`npm install -g @mariozechner/pi-coding-agent`) and runs `pi "task"`, they get the full standalone pi TUI experience. When a user chats with OpenClaw, they get OpenClaw's gateway-managed agent loop (which internally uses pi's model API wrapper). These are **different experiences** with the same underlying LLM API layer but different tool sets, session management, skill loading, and multi-channel capabilities.

---

### 8.12 OpenCode Skill System

**Confidence: HIGH** — verified from official OpenCode documentation at `opencode.ai/docs/skills/`, `opencode.ai/docs/config/`, `opencode.ai/docs/agents/`, `opencode.ai/docs/plugins/`, `opencode.ai/docs/custom-tools/` (WebFetch, 2026-03-13), and local design document `2025-11-22-opencode-support-design.md`.

#### Format and Standard Compliance

OpenCode uses the **agentskills.io open standard** format natively. Each skill is a directory containing a `SKILL.md` file with YAML frontmatter. OpenCode explicitly adopts and extends the `agentskills.io` multi-client path conventions — it searches `.agents/skills/` in addition to its own `.opencode/skills/` paths, making it fully interoperable with skills installed for Gemini CLI, pi-mono, and other `agentskills.io`-compliant tools.

Unlike OpenClaw (which adds a `metadata.openclaw` extension key) or Claude Code (which adds `disable-model-invocation` and `user-invocable` frontmatter flags), OpenCode's SKILL.md format is a nearly unmodified adoption of the base standard. The main extension is the `permission` block in `opencode.jsonc` that governs skill access control — this is config-level, not skill-level.

#### Frontmatter Fields

| Field | Required | Enforced | Description |
|---|---|---|---|
| `name` | Yes | Hard — must match directory name | 1–64 chars, `^[a-z0-9]+(-[a-z0-9]+)*$` regex; directory name must match exactly |
| `description` | Yes | Hard — minimum 20 chars enforced | 1–1024 chars; shown in `<available_skills>` catalog to agent |
| `license` | No | Silently ignored at runtime | Pass-through from agentskills.io spec |
| `compatibility` | No | Silently ignored at runtime | Pass-through from agentskills.io spec |
| `metadata` | No | Silently ignored at runtime | String-to-string mapping; no OpenCode-specific extension keys |
| Unknown fields | — | Silently ignored | No runtime warning; VS Code plugin warns cosmetically |

OpenCode does **not** support `disable-model-invocation`, `user-invocable`, `context: fork`, `agent:`, `argument-hint`, `hooks`, or `allowed-tools` in SKILL.md frontmatter. There is no equivalent frontmatter mechanism for invocation control — this is handled entirely via the `permission.skill` config block.

#### Discovery Paths

| Path | Scope | Priority |
|---|---|---|
| `.opencode/skills/<name>/SKILL.md` | Project-local | Highest |
| `.claude/skills/<name>/SKILL.md` | Project-local (cross-client) | High |
| `.agents/skills/<name>/SKILL.md` | Project-local (cross-client) | High |
| `~/.config/opencode/skills/<name>/SKILL.md` | User-global | Medium |
| `~/.claude/skills/<name>/SKILL.md` | User-global (cross-client) | Medium |
| `~/.agents/skills/<name>/SKILL.md` | User-global (cross-client) | Medium |

For project-local paths, OpenCode walks up from the current working directory until it reaches the git worktree root. The system loads all matching definitions along the walk and merges them with global definitions. OpenCode is the only platform in this comparison (alongside Gemini CLI) that natively supports the `.agents/skills/` cross-client convention, giving it automatic interoperability with skills installed for other agentskills.io-compatible tools.

#### Skill Loading Mechanism

OpenCode uses **lazy loading** via the native `skill` tool. The mechanism works as follows:

1. **Catalog injection (Tier 1)**: At session start, the `skill` tool's description is populated with an `<available_skills>` XML block containing every discovered skill's `name` and `description` fields. This is the catalog the agent sees.
2. **Body loading (Tier 2)**: The agent calls `skill({ name: "skill-name" })` explicitly when it decides a skill is relevant. Only at this point is the full SKILL.md body loaded into context.
3. **Resource loading (Tier 3)**: Supporting files in `references/`, `scripts/`, and `assets/` are accessed on demand via the agent's file tools after the skill body is loaded.

This is **true lazy loading** — unlike Claude Code (which loads all skill bodies at session start due to a known bug), OpenCode defers body content until the agent actively requests it. This preserves context window space for skills that are never triggered.

The skill tool can be disabled per agent via `tools: { skill: false }` in agent config, which removes the `<available_skills>` section entirely from that agent's context.

#### Permission Model (Access Control)

OpenCode implements permission-based skill access control at the config level (not frontmatter). In `opencode.jsonc`:

```json
"permission": {
  "skill": {
    "*": "allow",
    "internal-*": "deny",
    "experimental-*": "ask"
  }
}
```

Behaviors: `allow` (immediate loading), `deny` (skill hidden from agent, access rejected), `ask` (user prompted before loading). Last matching rule takes precedence. Permissions can be overridden per agent in the agent config block or agent markdown file frontmatter.

This permission system has no direct equivalent in Claude Code (which relies on `user-invocable` and `disable-model-invocation` frontmatter flags) or in any other platform in this comparison. It is the most granular skill-level access control mechanism across all platforms examined.

#### Plugin System

OpenCode has a JavaScript/TypeScript plugin system separate from its skill system. Plugins are `.js` or `.ts` files placed in:
- Project-level: `.opencode/plugins/`
- Global: `~/.config/opencode/plugins/`
- NPM packages declared in `opencode.jsonc` under `"plugin": [...]`

The `opencode.jsonc` at `~/.config/opencode/opencode.jsonc` confirms this with `"plugin": ["oh-my-opencode", "opencode-antigravity-auth@1.2.8", "opencode-openai-codex-auth"]` — these are npm package plugins loaded at startup.

Plugins export a function receiving `{ project, client, $, directory, worktree }` context and return a hooks object. Available hooks include the full session lifecycle (`session.created`, `session.compacted`, `session.idle`, `session.updated`, `session.error`, `session.diff`, `session.deleted`), file events (`file.edited`, `file.watcher.updated`), tool events (`tool.execute.before`, `tool.execute.after`), permission events, LSP events, message events, command events, TUI events, and more.

The plugin system is how the **superpowers plugin** (from `2025-11-22-opencode-support-design.md`) injects skill content at session start. The design uses a `session.started` hook (note: the official docs list `session.created` as the available hook, not `session.started`) to inject skill catalog and tool mapping instructions into the session context.

Plugins can also register **custom tools** that the agent sees alongside built-in tools. Plugin tools override built-in tools with matching names. Custom tool files can also be placed in `.opencode/tools/` (project) or `~/.config/opencode/tools/` (global) as standalone TypeScript files, where the filename becomes the tool name.

This plugin-plus-custom-tool architecture has the closest parallel to Claude Code's hook system (`PreToolUse`, `PostToolUse`, `Stop`) and MCP integration, though it is implemented as a JavaScript module system rather than JSON hooks or MCP servers.

#### Invocation Control

OpenCode has **no SKILL.md frontmatter mechanism** for invocation control. There is no `user-invocable`, `disable-model-invocation`, or equivalent. Instead:

- Whether a skill is available to the agent is governed by `permission.skill` config (pattern-based allow/deny/ask)
- Whether the agent sees the skill tool at all is governed by `tools: { skill: false }` per-agent config
- User-direct invocation of skills requires manually typing the skill name in chat for the agent to understand and call the `skill` tool

This is a significant architectural difference from Claude Code and OpenClaw, which allow per-skill invocation control at the frontmatter level.

---

## 9. Slash Commands vs Skills: How Each Platform Defines User-Invocable Actions

### 9.1 The Problem: Same Markdown Format, Completely Different Systems

All three major platforms (Claude Code, Codex, Gemini CLI) use a `SKILL.md` file in a skill directory as their primary extension format. The YAML frontmatter `name` and `description` fields look almost identical across all of them. Yet beneath this surface similarity lies a significant architectural divergence in *how users explicitly invoke* a skill as a command.

The key distinction: a **skill** is passive — the model loads it when it judges the skill to be relevant. A **command** is active — the user types something specific to fire it regardless of model judgment. These are categorically different behaviors, and each platform implements the "command" half differently.

Claude Code uniquely has *two* systems for this:

1. **Old-style plugin commands** (`.claude/commands/`, `<plugin>/commands/`) — markdown files treated as instruction prompts for Claude, with their own namespace and built-in orchestration pseudocode.
2. **Skills 2.0 with `disable-model-invocation: true`** — the same SKILL.md format with a frontmatter flag that restricts auto-firing, effectively converting a skill into a user-invocable command.

These two systems are architecturally different despite both using Markdown. Codex achieves command UI via `agents/openai.yaml`. Gemini CLI has a completely separate TOML-based custom command system that is distinct from its SKILL.md-based skill system. Google Antigravity primarily uses implicit agent-triggered invocation with optional `@skill-name` syntax.

---

### 9.2 Claude Code Old-Style Plugin Commands

**File location**: `<plugin>/commands/<name>.md` or `.claude/commands/<name>.md` or `~/.claude/commands/<name>.md`
**Invocation**: `/plugin:command-name` or `/command-name` (for project/personal-scope commands)

Old-style commands predate Skills 2.0. They are `.md` files that Claude reads and executes as instruction prompts. The body of a command is Claude's instruction set — it can contain natural language, pseudocode, and calls to built-in tools. The key architectural difference from skills is that the command body can contain explicit workflow orchestration pseudocode that Claude executes step-by-step.

**Confidence: HIGH** — verified from official Claude Code documentation [code.claude.com/docs/en/skills, 2026] and primary source files in this repo.

#### Frontmatter Schema

| Field | Required | Description |
|---|---|---|
| `description` | Recommended | Short text shown in `/help` output; used by Claude to decide whether to surface the command |
| `argument-hint` | No | Autocomplete hint showing expected argument format, e.g., `<task> [--execute] [--auto]` |
| `allowed-tools` | No | Space-delimited list of tools the command can invoke without per-call confirmation |
| `model` | No | Override model for this command invocation |
| `disable-model-invocation` | No | `true` = prevents Claude from firing this command automatically (user-only) |
| `user-invocable` | No | `false` = hides from `/` menu (Claude-only invocation) |

Note: `disable-model-invocation` and `user-invocable` also work in old-style command files since the documentation states that `.claude/commands/` files "support the same frontmatter" as SKILL.md files [code.claude.com/docs/en/skills, 2026].

#### Body Structure and Built-in Pseudocode Tools

Old-style commands — as used in practice in this codebase and in documented patterns — can contain pseudocode that invokes built-in orchestration constructs. These are not literally executed code; they are instruction templates that Claude interprets as steps to follow:

| Construct | Purpose | Example |
|---|---|---|
| `Task(subagent_type="...", prompt="...")` | Spawn a subagent with a given prompt | Delegate to `rd2:super-coder` |
| `Skill(skill="plugin:skill-name", args="...")` | Invoke a named skill | Call `rd2:anti-hallucination` |
| `AskUserQuestion(...)` | Pause and prompt user for input | Confirm before destructive action |
| `SlashCommand(skill="...", args="...")` | Chain to another command | Call `/rd2:tasks-review` |
| `$ARGUMENTS` | Inject the arguments passed by the user | From `/tasks-run 0047`, `$ARGUMENTS` = `0047` |
| `$N` | Positional argument shorthand | `$0` = first argument |
| `` !`shell-cmd` `` | Execute a shell command and inject output | `` !`git diff --cached` `` |

The `Task(subagent_type=...)` pattern is the most powerful: it spawns a full subagent context with complete conversation isolation, allowing complex multi-step workflows without polluting the main session.

#### Key Characteristics

- Commands are **thin wrappers**: the convention in this codebase (documented in `.claude/CLAUDE.md`) is ~50 lines. Logic lives in skills; commands are orchestration entry points.
- Commands invoke agents; they do **not** implement behavior directly.
- The `argument-hint` field drives CLI autocomplete, showing users what to type after the command name.
- Commands support **namespace scoping** via the plugin path: a file at `plugins/rd2/commands/tasks-run.md` becomes `/rd2:tasks-run`.
- Personal commands in `~/.claude/commands/` use `/command-name` (no namespace prefix).
- Project commands in `.claude/commands/` use `/project:command-name` syntax.

#### Example (Minimal Working Command)

```markdown
---
description: Deploy the application to production
argument-hint: <environment> [--dry-run]
disable-model-invocation: true
---

# Deploy

Deploy $ARGUMENTS to production:

Task(
  subagent_type="rd2:super-coder",
  prompt="""Deploy to environment: $ARGUMENTS

Steps:
1. Run test suite
2. Build application
3. Push to deployment target
4. Verify deployment succeeded
  """
)
```

---

### 9.3 Claude Code Skills 2.0 as Commands (`user-invocable` + `disable-model-invocation`)

**File location**: `<plugin>/skills/<name>/SKILL.md` or `.claude/skills/<name>/SKILL.md`
**Invocation**: `/skill-name` or `/plugin:skill-name`

Skills 2.0 merged the old command system into the skill system. According to the official documentation: "Custom commands have been merged into skills. A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way." [code.claude.com/docs/en/skills, 2026]

**Confidence: HIGH** — verified from official Claude Code documentation.

#### How It Replaces Old Commands

The critical insight from the documentation: "Your existing `.claude/commands/` files keep working. Skills add optional features: a directory for supporting files, frontmatter to control whether you or Claude invokes them, and the ability for Claude to load them automatically when relevant."

A skill becomes functionally equivalent to a command when:
- `disable-model-invocation: true` is set (user types `/skill-name`, Claude never fires it automatically)
- `argument-hint:` is set (gives autocomplete hints)
- The skill body contains step-by-step task instructions rather than reference knowledge

#### Frontmatter Fields for Command Behavior

| Field | Effect on Command Behavior |
|---|---|
| `disable-model-invocation: true` | Prevents Claude from firing automatically; user must type `/skill-name` |
| `user-invocable: false` | Hides from `/` menu; only Claude can invoke (opposite of a command) |
| `argument-hint: <arg>` | Shows hint in CLI autocomplete |
| `context: fork` | Runs skill body as a subagent in an isolated context |
| `agent: <type>` | Specifies which subagent type executes when `context: fork` is set |
| `$ARGUMENTS` | Receives user-passed arguments when skill is invoked as `/skill-name <args>` |

#### Invocation Control Table

| Frontmatter | User can invoke | Claude can invoke | In context catalog |
|---|---|---|---|
| (default) | Yes — `/skill-name` | Yes — auto-fires | Yes |
| `disable-model-invocation: true` | Yes — `/skill-name` | No | No (removed from catalog) |
| `user-invocable: false` | No | Yes — auto-fires | Yes |

#### What Old Commands Can Do That Skills 2.0 Cannot

The key gap: **Skills 2.0 bodies cannot contain `Task(subagent_type=...)` pseudocode orchestration in the same way old commands do.**

Old-style command bodies are interpreted as instruction templates with Claude executing the pseudocode constructs (`Task(...)`, `Skill(...)`, `AskUserQuestion(...)`) as orchestration steps. A Skills 2.0 body is a prompt — Claude reads it and acts on it, but there is no formal pseudocode layer.

In practice, a Skills 2.0 body can say "Launch a subagent to do X" in natural language, and Claude will do so — but it lacks the explicit `Task(subagent_type="rd2:super-coder", prompt="""...""")` structure that makes the invocation deterministic and auditable.

The codebase-level convention (documented in `.claude/CLAUDE.md`) reflects this: **commands are ~50-line thin wrappers with pseudocode; skills are the fat logic layer.** A skill body tells Claude *how* to do something; a command body tells Claude *what to call*.

#### Limitations vs Old Commands

| Capability | Old Command | Skills 2.0 |
|---|---|---|
| Explicit `Task(subagent_type=...)` pseudocode | Yes (by convention) | No (natural language only) |
| Supporting files directory | No | Yes (`references/`, `scripts/`, `examples/`) |
| Dynamic shell injection `` !`cmd` `` | Yes | Yes |
| `argument-hint` autocomplete | Yes | Yes |
| `$ARGUMENTS` substitution | Yes | Yes |
| Plugin namespace | Yes (`plugin:cmd`) | Yes (`plugin:skill`) |
| Portability (agentskills.io base spec) | No — Claude Code only | Yes (base fields work cross-platform) |
| `context: fork` subagent isolation | No (uses `Task()` instead) | Yes |

**Confidence: HIGH** for structural differences; **MEDIUM** for the "no pseudocode in Skills 2.0" claim — the distinction is a convention enforced by this codebase's CLAUDE.md, not a technical impossibility. Claude can interpret natural language instructions to spawn subagents from any SKILL.md.

---

### 9.4 Codex: UI Chips via `agents/openai.yaml`

**File location**: `<skill>/agents/openai.yaml` (optional metadata file alongside `SKILL.md`)
**Invocation**: UI chip click or explicit `$skill-name` text prefix; also `/skills` command to list available skills

Codex takes a different approach to explicit invocation. Rather than a separate command file format, Codex extends the base SKILL.md with an optional `agents/openai.yaml` metadata file that configures a **UI chip** — a clickable button that appears in the Codex interface to surface the skill as a user-accessible action.

**Confidence: HIGH** — verified from official Codex documentation [developers.openai.com/codex/skills/, 2026] and search results referencing the official configuration reference.

#### `agents/openai.yaml` Schema

```yaml
interface:
  display_name: "Optional user-facing name"
  short_description: "Optional user-facing description"
  icon_small: "./assets/small-logo.svg"
  icon_large: "./assets/large-logo.png"
  brand_color: "#3B82F6"
  default_prompt: "Optional surrounding prompt to use the skill with"

policy:
  allow_implicit_invocation: false

dependencies:
  tools:
    - type: "mcp"
      value: "openaiDeveloperDocs"
      description: "Tool description"
      transport: "streamable_http"
      url: "https://example.com/mcp"
```

#### `agents/openai.yaml` Field Reference

| Section | Field | Required | Description |
|---|---|---|---|
| `interface` | `display_name` | No | User-facing name shown in the UI chip |
| `interface` | `short_description` | No | Tooltip text shown when hovering the UI chip |
| `interface` | `default_prompt` | No | Pre-filled prompt text when user clicks the chip |
| `interface` | `icon_small` | No | Path to small icon SVG/PNG |
| `interface` | `icon_large` | No | Path to large icon SVG/PNG |
| `interface` | `brand_color` | No | Hex color for the chip background |
| `policy` | `allow_implicit_invocation` | No | Default: `true`. When `false`, Codex will not auto-select this skill; explicit `$skill-name` still works |
| `dependencies` | `tools` | No | MCP tool dependencies declared for this skill |

#### Explicit Text Invocation

When no `agents/openai.yaml` is present, or when `allow_implicit_invocation: false` is set, users invoke Codex skills through two mechanisms:
1. Type `$` in the Codex chat interface to get a skill mention picker, then select the skill name.
2. Type `$skill-name` directly in the prompt.
3. Run `/skills` to see available skills, then select one.

There is no `/skill-name` slash syntax in Codex for skills. The slash namespace is reserved for meta-commands. The dollar-sign prefix (`$skill-name`) is the explicit invocation mechanism.

#### How This Compares to Slash Commands

| Dimension | CC Old Commands | CC Skills 2.0 | Codex |
|---|---|---|---|
| Explicit invocation syntax | `/plugin:command-name` | `/plugin:skill-name` | `$skill-name` or UI chip |
| User-facing label | `description` field | `description` field | `interface.display_name` |
| Autocomplete hint | `argument-hint:` | `argument-hint:` | `interface.default_prompt` |
| Visual branding | None | None | Full (name, color, icon) |
| Implicit suppression | `disable-model-invocation: true` | `disable-model-invocation: true` | `policy.allow_implicit_invocation: false` |
| Portability | Claude Code only | agentskills.io base fields portable | Codex UI only |

**Confidence: HIGH** for `agents/openai.yaml` schema and `$skill-name` syntax.

---

### 9.5 Gemini CLI: Two Separate Systems for Skills and Commands

Gemini CLI has a **fundamental architectural split** that does not exist in Claude Code or Codex: the skill system and the slash command system are completely separate mechanisms using different file formats. This is the largest structural divergence among the three platforms.

**Confidence: HIGH** — verified from official Gemini CLI documentation [geminicli.com/docs/cli/custom-commands/, 2026] and [google-gemini.github.io/gemini-cli/docs/cli/commands.html, 2026].

#### System 1: SKILL.md-Based Skills (Implicit Invocation)

Gemini CLI implements the agentskills.io base standard: SKILL.md files in `.gemini/skills/` or `.agents/skills/` directories with `name` and `description` frontmatter. These are loaded by the `activate_skill` tool when the model judges them relevant. There is no native user-facing slash command syntax for skills in Gemini CLI — skills are invoked implicitly by the model.

The SKILL.md frontmatter for Gemini CLI supports only:
- `name` (required, hard constraint)
- `description` (required, hard constraint)
- Standard fields like `allowed-tools` (parsed but not enforced — Issue #15895)

Gemini CLI does **not** support `disable-model-invocation`, `user-invocable`, `context: fork`, or `agent:` fields. There is no mechanism in Gemini CLI to mark a skill as "user-only" or to suppress automatic invocation while keeping it available for manual trigger. **Confidence: HIGH** (from Issue #15895 analysis in §8 of this report).

#### System 2: TOML-Based Custom Slash Commands (Explicit Invocation)

For user-triggered explicit commands, Gemini CLI uses a completely separate TOML file format stored in `.gemini/commands/` or `~/.gemini/commands/`.

**TOML Command Schema:**

| Field | Required | Description |
|---|---|---|
| `prompt` | Yes | The prompt text sent to the model when the command is invoked |
| `description` | No | Short description shown in `/help` output (auto-generated from filename if omitted) |

**Dynamic content injection within `prompt`:**

| Syntax | Description |
|---|---|
| `{{args}}` | Replaced with all user-provided arguments; shell-escaped inside `!{...}` blocks |
| `!{command}` | Executes a shell command and injects output (requires user confirmation) |
| `@{path/to/file}` | Embeds file content directly into the prompt |
| `@{path/to/dir}` | Traverses directory and embeds contents (respects `.gitignore`) |

**Naming and namespacing:**

Command names derive from file paths. Subdirectories create colon-separated namespaces:
- `~/.gemini/commands/test.toml` → `/test`
- `.gemini/commands/git/commit.toml` → `/git:commit`

**Scoping:**
- User-scoped: `~/.gemini/commands/` (available across all projects)
- Project-scoped: `.gemini/commands/` (current project only)

#### Key Contrast: Why This Split Matters

In Claude Code, one SKILL.md with `disable-model-invocation: true` serves both purposes: it is a skill (with supporting files, references, scripts) and a command (user can `/invoke-it`). In Gemini CLI, these are **structurally separate**:

| Dimension | Gemini CLI Skills (SKILL.md) | Gemini CLI Commands (TOML) |
|---|---|---|
| File format | Markdown + YAML frontmatter | TOML |
| Directory | `.gemini/skills/` | `.gemini/commands/` |
| Invocation | Implicit (model decides via `activate_skill`) | Explicit (`/command-name` user types) |
| Argument syntax | None native (body instructions only) | `{{args}}` placeholder |
| Shell injection | Not supported in SKILL.md body | `!{command}` (with confirmation) |
| File embedding | Not supported natively | `@{path}` |
| Portability | agentskills.io base spec | Gemini CLI specific |
| MCP integration | Standard skill mechanism | MCP Prompts exposed as slash commands |

Note: Gemini CLI also exposes MCP Prompts as slash commands, using the MCP prompt's `name` and `description` as the command name and description. This gives a third path to user-invocable commands in Gemini CLI.

---

### 9.6 Google Antigravity: Agent-Triggered with Optional Explicit Syntax

**What Antigravity is**: Google Antigravity is an agent-first IDE announced in November 2025 alongside Gemini 3. It is a heavily modified fork of Visual Studio Code with two primary views: an Editor view (standard IDE with agent sidebar) and a Manager view (multi-agent orchestration control center). It is free for personal Gmail users during public preview as of early 2026.

**Confidence: HIGH** — verified from [developers.googleblog.com, 2026], [codelabs.developers.google.com, 2026], and multiple review sources.

#### Skill Format in Antigravity

Antigravity follows the agentskills.io standard with the same SKILL.md format used by Claude Code and Codex. Skills live in:
- Workspace-specific: `<workspace-root>/.agent/skills/`
- Global: `~/.gemini/antigravity/skills/`

The SKILL.md frontmatter in Antigravity supports:
- `name` (optional, defaults to directory name, lowercase-hyphens)
- `description` (mandatory, the "trigger phrase" for semantic matching)

The body follows the same structure as agentskills.io: goal, step-by-step logic, examples, constraints.

**Confidence: MEDIUM** — verified from the official Antigravity Codelab [codelabs.developers.google.com/getting-started-with-antigravity-skills, 2026], which is an official Google source but early-stage documentation.

#### Skill Invocation in Antigravity

The primary invocation model is **agent-triggered**: Antigravity employs progressive disclosure — the agent scans available skills, reads descriptions, and determines applicability without requiring special command syntax. The agent "automatically detects the user's intent and dynamically equips the specific expertise required." [codelabs.developers.google.com/getting-started-with-antigravity-skills, 2026]

For explicit invocation, multiple sources indicate `@skill-name` syntax works (mention-style), consistent with the VS Code extension model. The `/skill-name` slash syntax may also work as an alternative. Neither `$skill-name` (Codex syntax) nor `disable-model-invocation` (Claude Code concept) appear in Antigravity documentation.

**Confidence: LOW-MEDIUM** for explicit invocation syntax — primary documentation does not specify this clearly. The Codelab describes auto-triggered invocation only; `@skill-name` is inferred from the VS Code integration model and secondary sources.

#### No Equivalent to "User-Only" Commands

Antigravity does not document any mechanism equivalent to `disable-model-invocation: true` (Claude Code) or `allow_implicit_invocation: false` (Codex). All skills are primarily designed for agent-triggered use. There is no separate TOML command system (as in Gemini CLI) or old-style command directory.

---

### 9.7 Comparison Matrix: Slash Command Systems

| Dimension | CC Old Commands | CC Skills 2.0 | Codex | Gemini CLI | Antigravity | OpenClaw | pi-mono | OpenCode |
|---|---|---|---|---|---|---|---|---|
| **Invocation syntax** | `/plugin:cmd` | `/plugin:skill` | `$skill-name` or UI chip | `/cmd-name` (TOML) or implicit (SKILL.md) | `@skill-name` or implicit | `/skill-name [input]` or `/skill <name>` | `/skill:name` | `/cmd-name` for commands; no direct skill invocation syntax |
| **File format** | `commands/*.md` | `skills/*/SKILL.md` | `SKILL.md` + optional `agents/openai.yaml` | `SKILL.md` for skills; `.toml` for commands | `SKILL.md` | `SKILL.md` + optional `command-dispatch`/`command-tool` frontmatter | `SKILL.md` | JSON config `command:` section or `.opencode/commands/<name>.md` (separate from skills) |
| **File location** | `<plugin>/commands/` or `.claude/commands/` | `<plugin>/skills/` or `.claude/skills/` | `<skill>/agents/openai.yaml` alongside SKILL.md | `.gemini/skills/` (skills) or `.gemini/commands/` (commands) | `.agent/skills/` or `~/.gemini/antigravity/skills/` | `<workspace>/skills/`, `~/.openclaw/skills/`, bundled | `.pi/skills/`, `.agents/skills/`, `~/.pi/agent/skills/` | `.opencode/commands/` or `~/.config/opencode/commands/` for commands; `opencode.jsonc` `command:` section |
| **UI customization** | None | `argument-hint` only | Full: `display_name`, `brand_color`, `icon_small/large`, `default_prompt` | None for skills; `description` for TOML commands | None documented | `metadata.openclaw.emoji` (macOS Skills UI only); native Discord/Telegram autocomplete | None | `description` field shown in TUI autocomplete; no color/icon |
| **Workflow pseudocode in body** | Yes (Task, Skill, AskUserQuestion, SlashCommand) | No (natural language only) | No | No | No | No (natural language only) | No (natural language only) | No (template strings; no pseudocode) |
| **Auto-trigger suppression** | `disable-model-invocation: true` | `disable-model-invocation: true` | `policy.allow_implicit_invocation: false` | Not supported for SKILL.md skills; TOML commands are always explicit | Not supported | `user-invocable: false` or `disable-model-invocation: true` | Not supported | Not supported in SKILL.md; commands are always explicit by definition |
| **Direct tool dispatch (no LLM)** | Not supported | Not supported | Not supported | Not supported | Not documented | `command-dispatch: tool` + `command-tool: <name>` | Not supported | Not supported |
| **Subagent execution** | `Task(subagent_type="...")` pseudocode in body | `context: fork` + `agent:` frontmatter | Not built-in | Not supported | Not documented | Via `sessions_spawn` tool | Not supported | Via `agent:` field in command config (routes to named agent) |
| **Argument handling** | `$ARGUMENTS`, `$N` substitution | `$ARGUMENTS`, `$N` substitution | `interface.default_prompt` template | `{{args}}` in TOML prompt (not in SKILL.md) | Not documented | Raw args string passed to model or tool | Natural language | `$ARGUMENTS`, `$NAME` (named placeholders), `$1`, `$2` in template |
| **Shell injection** | `` !`cmd` `` | `` !`cmd` `` | Not applicable | `!{command}` in TOML (with confirmation) | Not documented | Not supported | Not documented | `` !`cmd` `` in command templates; `@filename` file inclusion |
| **Portability** | Claude Code only | agentskills.io base fields are cross-platform | Codex UI only | Gemini CLI TOML is proprietary | agentskills.io compatible | `metadata.openclaw.*` and `command-dispatch` are OpenClaw-only | `/skill:name` syntax is pi-specific | Commands are OpenCode-only; no cross-platform equivalent |
| **Namespace/scoping** | `plugin:cmd` (path-derived) | `plugin:skill` (path-derived) | Flat namespace | Colon-separated path (`/git:commit`) | Not documented | Flat (sanitized to `a-z0-9_`, max 32 chars) | Flat (`/skill:name`) | Flat (command key name from config or filename) |
| **Native platform registration** | N/A (terminal only) | N/A (terminal only) | N/A (terminal only) | N/A (terminal only) | N/A | Yes (Discord/Telegram autocomplete; text fallback elsewhere) | N/A (TUI-only) | N/A (TUI-only) |
| **MCP integration** | Not applicable | Not applicable | `dependencies.tools` in agents/openai.yaml | MCP Prompts exposed as `/commands` | Not documented | Via Gateway config (not per-skill) | Not documented | Via MCP servers in `opencode.jsonc` `mcp:` section (not per-command) |
| **Supporting files** | No (flat .md file only) | Yes (`references/`, `scripts/`, `examples/`) | Yes (same as skills) | No for TOML; Yes for SKILL.md | Yes (same as skills) | Yes (`references/`, `scripts/`, `assets/`) | Yes (agentskills.io standard) | No (commands are single files or JSON config entries) |
| **Status** | Supported (legacy, not deprecated) | Current standard | Current standard | Two separate systems | Early preview | Current standard | Current standard | Current standard |

---

### 9.8 Design Patterns for Cross-Platform Invocable Actions

Given the architectural differences documented above, three practical patterns emerge for authors who need skills that work as commands across multiple platforms.

#### Pattern A: Skills-First (Recommended for New Work)

Use Skills 2.0 as the primary format. Add `agents/openai.yaml` for Codex UI metadata.

```
my-skill/
├── SKILL.md                    # Base skill — works everywhere
│   # Frontmatter:
│   # disable-model-invocation: true   (Claude Code: user-only)
│   # argument-hint: <arg>             (Claude Code: autocomplete)
├── agents/
│   └── openai.yaml             # Codex: UI chip + explicit-only
│       # policy.allow_implicit_invocation: false
│       # interface.display_name: "..."
└── references/
    └── guide.md
```

For Gemini CLI users who need explicit invocation, provide a companion `.toml` file separately (the TOML and SKILL.md systems cannot be unified in one file).

**When to use**: New skills intended for Claude Code + Codex distribution where the same content is the right entrypoint for both.

#### Pattern B: Hybrid (Old Commands for Claude Code + Skills for Others)

Keep old-style command files for Claude Code (for `Task(subagent_type=...)` orchestration pseudocode), and maintain a corresponding SKILL.md for other platforms.

```
plugin/
├── commands/
│   └── deploy.md              # Claude Code: Task(...) orchestration
└── skills/
    └── deploy/
        └── SKILL.md           # Other platforms: natural language equivalent
```

**When to use**: Complex multi-step workflows where deterministic subagent dispatch matters (the `Task(subagent_type=...)` pseudocode pattern). The natural language equivalent in SKILL.md will work on other platforms but with less structural precision.

#### Pattern C: Gemini CLI Dual-Mode

For Gemini CLI specifically, maintain both a SKILL.md (implicit) and a TOML command (explicit):

```
.gemini/
├── skills/
│   └── deploy/
│       └── SKILL.md           # Auto-triggered when relevant
└── commands/
    └── deploy.toml            # Explicit: /deploy <target>
    # prompt = "Deploy {{args}} to production:\n1. Run tests\n2. Build\n3. Push"
```

**When to use**: Projects targeting Gemini CLI users who need both ambient assistance (skill auto-fires when editing deployment config) and explicit control (`/deploy production`).

#### Summary: Which Platform Needs What for Explicit Invocation

| Platform | Required for Explicit Invocation | Optional Enhancement |
|---|---|---|
| Claude Code | `disable-model-invocation: true` in SKILL.md frontmatter | `argument-hint:` for autocomplete |
| Codex | `policy.allow_implicit_invocation: false` in `agents/openai.yaml` | Full `interface:` block for UI chip |
| Gemini CLI | Separate `.toml` file in `.gemini/commands/` | MCP Prompt registration |
| Antigravity | No documented mechanism — rely on `@skill-name` mention | N/A |

**Confidence: HIGH** for Claude Code and Codex columns. **MEDIUM** for Gemini CLI (TOML commands are explicit, but integration with SKILL.md content requires duplication). **LOW** for Antigravity (no primary documentation on explicit invocation).

#### What is Not Portable

The following Claude Code command features have **no equivalent** on other platforms and require platform-specific workarounds:

- `Task(subagent_type="rd2:super-coder", prompt="""...""")` pseudocode in command bodies — Claude Code only
- `Skill(skill="plugin:skill-name", args="...")` invocation — Claude Code only
- `AskUserQuestion(...)` checkpoint pattern — Claude Code only
- `context: fork` + `agent: Explore` subagent isolation — Claude Code only
- Plugin namespace inheritance (`/rd2:tasks-run` from `plugins/rd2/commands/tasks-run.md`) — Claude Code only

---

**Sources for Section 9:**

- [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills) (2026-03-12, HIGH confidence)
- [Agent Skills — Codex Documentation](https://developers.openai.com/codex/skills/) (2026-03-12, HIGH confidence)
- [Configuration Reference — Codex](https://developers.openai.com/codex/config-reference/) (2026-03-12, HIGH confidence)
- [Custom Commands — Gemini CLI](https://geminicli.com/docs/cli/custom-commands/) (2026-03-12, HIGH confidence)
- [CLI Commands — Gemini CLI](https://google-gemini.github.io/gemini-cli/docs/cli/commands.html) (2026-03-12, MEDIUM confidence)
- [Build with Google Antigravity — Google Developers Blog](https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/) (2026-03-12, HIGH confidence)
- [Authoring Google Antigravity Skills — Google Codelabs](https://codelabs.developers.google.com/getting-started-with-antigravity-skills) (2026-03-12, MEDIUM confidence)
- [Claude Code Slash Commands Guide — alexop.dev](https://alexop.dev/posts/claude-code-slash-commands-guide/) (2026-03-12, MEDIUM confidence)
- Local source files in `/Users/robin/projects/cc-agents/plugins/rd2/commands/` (HIGH confidence)
- Local source files in `/Users/robin/projects/cc-agents/plugins/wt/commands/` (HIGH confidence)
- Local `.claude/CLAUDE.md` conventions documentation (HIGH confidence)

---

### 9.9 OpenClaw: Skill Invocation in Chat Context

**Confidence: HIGH** — verified from primary source local files (`/Users/robin/projects/gitops/vendors/openclaw/docs/tools/slash-commands.md`, `skills.md`), 2026-03-13.

#### The Fundamental Difference

OpenClaw is a **multi-channel messaging gateway**, not a terminal CLI. Users interact via WhatsApp, Telegram, Discord, Slack, iMessage, and other chat surfaces. This context defines everything about how skills are invoked.

#### Two Invocation Mechanisms

**1. Implicit (description-driven) invocation**: The model reads the skills catalog (injected as XML into the system prompt) and decides which skill to load based on description matching. This works identically to Claude Code and Codex — users just type naturally and the agent activates the appropriate skill.

**2. Explicit (slash command) invocation**: Users type `/skill-name [input]` in any supported chat channel. The Gateway parses the command and routes it to the matching skill.

The key frontmatter field controlling which mode is active:
- `user-invocable: true` (default) — skill is exposed as a slash command by name
- `user-invocable: false` — skill is available only to the model (no user-visible slash command)
- `disable-model-invocation: true` — skill excluded from model prompt; only accessible via explicit slash command

#### Slash Command System Details

OpenClaw has a comprehensive slash command system defined in `docs/tools/slash-commands.md`. Commands must be sent as a **standalone message starting with `/`**.

There are three categories:

**A. Built-in commands** (always available): `/help`, `/commands`, `/status`, `/whoami`/`/id`, `/reset`/`/new`, `/model`, `/think`, `/verbose`, `/compact`, `/stop`, `/restart`, `/subagents`, `/acp`, `/focus`, `/unfocus`, `/agents`, `/usage`, `/tts`, etc. (~30+ commands total)

**B. Directives** (mode-setting inline hints): `/think`, `/verbose`, `/reasoning`, `/elevated`, `/exec`, `/model`, `/queue` — these are stripped from the message before the model sees it. In directive-only messages they persist to the session; in mixed messages they act as per-turn hints.

**C. Skill commands** (user-authored): Skills with `user-invocable: true` (the default) are automatically exposed as `/skill-name [input]`. Names are sanitized to `a-z0-9_` (max 32 chars); collisions get numeric suffixes (`_2`). The invocation:

```
/skill-name optional input text here
```

A generic `skill` command also exists for fallback: `/skill <skill-name> [input]`, useful when native per-skill commands cannot be registered (e.g., due to platform limits).

#### Native vs Text Command Registration

OpenClaw differentiates between text commands (typed in chat, parsed by gateway) and **native commands** (registered as platform-native slash commands with Discord/Telegram autocomplete). Configuration:

```json5
{
  commands: {
    native: "auto",        // register native commands (Discord/Telegram: on; Slack: off)
    nativeSkills: "auto",  // register skill commands natively (Discord/Telegram: on; Slack: off)
    text: true             // always parse /... in chat messages
  }
}
```

This means on Discord and Telegram, skill slash commands appear in the native command picker with autocomplete. On WhatsApp, Signal, iMessage, and Web Chat, users type `/skill-name` as plain text. The experience differs by channel but the underlying routing is the same.

#### `command-dispatch: tool` — Direct Tool Routing (No Model)

OpenClaw has a unique capability where a skill slash command can bypass the model entirely and route directly to a named tool:

```yaml
---
name: prose
description: Control OpenProse formatting settings.
command-dispatch: tool
command-tool: prose_settings
command-arg-mode: raw
---
```

When `/prose on` is typed, OpenClaw invokes the `prose_settings` tool with `{ command: "on", commandName: "prose", skillName: "prose" }` — deterministic, instant, no LLM call. This has no equivalent in Claude Code, Codex, or Gemini CLI.

#### ACP-Based Invocation

OpenClaw's ACP (Agent Client Protocol) bridge exposes slash commands to IDE integrations. When an IDE (e.g., Zed) connects via `openclaw acp`, available skill commands are advertised via `available_commands_update` events. The ACP bridge translates IDE prompts into Gateway `chat.send` calls, so skill invocation flows work identically through ACP as through direct chat.

#### Session Management Commands with Slash Syntax

Users can reset their session with `/reset` or `/new` (configurable via `resetTriggers`). This integrates with the context compaction system: `/compact [instructions]` compacts the context. These are not skills — they are built-in gateway commands.

#### Platform-Specific Differences

| Channel | Skill slash command availability | Native picker |
|---|---|---|
| Discord | Yes, as native slash commands (auto-registered) | Yes (with autocomplete) |
| Telegram | Yes, as native commands (auto-registered) | Yes (button menu) |
| Slack | Yes, but requires manual Slack app setup per command | No (requires manual setup) |
| WhatsApp, Signal, iMessage | Yes, text-parsed `/skill-name` | No (text only) |
| Web Chat | Yes, text-parsed `/skill-name` | No |

---

### 9.10 pi-mono: Explicit Command Invocation

**Confidence: HIGH** — verified from `github.com/badlogic/pi-mono` README (WebFetch, 2026-03-13).

#### Built-in Slash Commands

Pi has an extensive built-in slash command system in the TUI. All commands are prefixed with `/`:

| Command | Purpose |
|---|---|
| `/login`, `/logout` | Authentication |
| `/model` | Switch models |
| `/settings` | Configuration panel |
| `/resume` | Pick previous sessions |
| `/new` | New session |
| `/tree` | Navigate session history |
| `/fork` | Fork current session |
| `/compact` | Compact context |
| `/copy`, `/export`, `/share` | Output management |
| `/reload` | Reload configuration |
| `/hotkeys` | Show hotkey reference |
| `/changelog` | View changelog |
| `/quit` | Exit |

These are native TUI commands, not skill invocations.

#### Skill Invocation Syntax

Skills are invoked via `/skill:name` syntax (colon separator):

```
/skill:coding-standards
/skill:pr-review
```

This is distinct from:
- Claude Code: `/plugin:skill` (colon separator, but slash followed by namespace)
- Codex: `$skill-name` (dollar prefix, no slash)
- Gemini CLI: `/install-skill` to activate, then implicit use; no direct invocation syntax
- OpenClaw: `/skill-name` (skill name directly as command)

Pi does not have a `user-invocable` or `disable-model-invocation` equivalent in frontmatter. All skills with a `name` field can be invoked via `/skill:name`. There is no mechanism in pi's frontmatter to restrict a skill to model-only or user-only invocation.

#### Extension-Registered Commands

Pi extensions can register custom slash commands. The exact API for this is in the pi-agent-core package and is available to extension authors who want to add non-skill commands to the TUI.

#### Prompt Templates

Pi supports prompt templates that expand via `/templatename`. This is a shortcut system separate from skills — templates are predefined prompt fragments that expand when invoked.

#### No User-Invocable Distinction

Unlike Claude Code (which has `user-invocable: true/false`) or OpenClaw (same field), pi has no frontmatter mechanism to restrict who can invoke a skill. The model sees all skills in the catalog; users can invoke all skills via `/skill:name`. There is no "model-only" vs "user-only" distinction.

---

### 9.11 OpenCode: Command Invocation Model

**Confidence: HIGH** — verified from official OpenCode documentation at `opencode.ai/docs/commands/` and `opencode.ai/docs/config/` (WebFetch, 2026-03-13), and local `opencode.jsonc` at `~/.config/opencode/opencode.jsonc`.

#### The `command:` Config Section

The `command:` section in `opencode.jsonc` defines custom commands that users can invoke with a slash prefix in the TUI. The schema:

```json
{
  "command": {
    "test": {
      "template": "Run the full test suite and report failures",
      "description": "Run tests",
      "agent": "build",
      "model": "anthropic/claude-sonnet-4-20250514"
    }
  }
}
```

Supported fields:

| Field | Required | Description |
|---|---|---|
| `template` | Yes | The prompt template sent to the LLM when the command executes |
| `description` | No | Human-readable label shown in TUI autocomplete |
| `agent` | No | Which agent executes the command (`"build"`, `"plan"`, or a custom agent name) |
| `model` | No | Model override for this command execution |

The local `opencode.jsonc` (`~/.config/opencode/opencode.jsonc`) shows the `"command": {}` section present but empty — no custom commands are configured in the reference user's setup. This is the expected state for users who have not yet defined commands.

Commands can also be defined as **markdown files** in `~/.config/opencode/commands/` (global) or `.opencode/commands/` (project-level). File names become command names. This mirrors the agentskills.io pattern of using directories for skills, but applied to simpler single-file command definitions.

#### Template Syntax and Dynamic Placeholders

Command templates support several dynamic mechanisms:

| Syntax | Behavior |
|---|---|
| `$ARGUMENTS` | All arguments passed at invocation time |
| `$NAME` | Named placeholder — TUI prompts user to enter value |
| `$1`, `$2` | Positional argument by index |
| `` !`cmd` `` | Shell command injection — executes command and injects output |
| `@filename` | File inclusion — injects file contents |

This is the same `` !`cmd` `` syntax as Claude Code's dynamic context injection in SKILL.md, but applied to command templates rather than skill bodies. Commands also support `@filename` inclusion, which has no equivalent in other platforms' skill systems.

Custom commands can override built-in commands with matching names (e.g., defining a command named `help` overrides the built-in `/help`).

#### Explicit Skill Invocation

OpenCode does **not** have a dedicated slash-command syntax for directly invoking a specific skill. Unlike:
- Claude Code: `/plugin:skill-name` or `/skill-name`
- pi-mono: `/skill:name`
- OpenClaw: `/skill-name` or `/skill <name> [input]`

In OpenCode, skills are invoked by the agent via the `skill` tool — not by user typing a specific syntax. The user must describe what they want, and the agent decides which skill (if any) to load via the skill tool.

The closest equivalent to explicit user-driven skill invocation in OpenCode is:
1. Define a **custom command** in `opencode.jsonc` with a template that instructs the agent to use a specific skill: `"template": "Use the git-release skill to create a release"`
2. Or simply tell the agent in natural language: "use the git-release skill"

This is a notable gap compared to other platforms — there is no first-class user-invocable skill syntax in OpenCode's TUI.

#### Built-in Commands

OpenCode includes the following built-in slash commands in the TUI:

| Command | Purpose |
|---|---|
| `/init` | Initialize OpenCode in a new project |
| `/undo` | Undo the last file modification |
| `/redo` | Redo the last undone modification |
| `/share` | Share the current session |
| `/help` | Show help and available commands |

This is a notably small set of built-in commands compared to other platforms: OpenClaw has ~30+ built-in gateway commands, pi-mono has ~15+ TUI commands, and Gemini CLI's TOML command system adds further options. OpenCode compensates by making custom command definition extremely low-friction via both JSON config and markdown files.

#### Slash Command Support Summary

OpenCode has a slash command system, but it is **command-as-prompt-template** rather than **command-as-skill-alias**. The system is designed for users to package frequently-used prompts as invocable commands — not for creating direct entry points into the skill system. Custom commands can route to specific agents and models, making them more powerful than simple skill aliases (they are effectively lightweight, configured prompt + agent + model bundles).

The absence of a user-invocable skill syntax is a deliberate design gap: OpenCode's philosophy is that the agent's skill tool should handle skill selection automatically, with commands serving as prompt shortcuts rather than skill dispatch mechanisms.

---

## 10. Subagent / Agent Definition Comparison Across Platforms

### 10.1 The Concept: What Is a "Subagent"?

Every major AI coding platform has converged on the same architectural pattern: a **primary agent** that can spawn **specialized secondary agents** to handle focused subtasks. These secondary agents go by different names across platforms — "subagents" (Claude Code, Gemini CLI), "agent roles" or "workers" (Codex), or simply "agents" in the Agents SDK — but the functional concept is the same:

1. The parent agent identifies a task better handled by a specialist
2. It delegates that task to a named, pre-defined secondary agent
3. The secondary agent runs in an isolated context with its own system prompt and restricted tool access
4. Only the final result returns to the parent; intermediate steps remain isolated

The key motivations are **context preservation** (keep verbose intermediate work out of the main conversation), **tool restriction** (enforce read-only or domain-specific constraints), and **specialization** (give the agent a custom persona and expertise without bloating the parent's system prompt).

The agentskills.io open standard covers **skills** (reusable workflow instructions) but does not define a cross-platform agent definition format. Each platform has developed its own agent definition system independently. There is no `AGENT.md` convention in the agentskills.io specification as of 2026-03-12.

---

### 10.2 Claude Code Subagents

**Confidence: HIGH** — verified from official Claude Code documentation at `code.claude.com/docs/en/sub-agents` (2026-03-12)

#### File Location and Naming

Subagent definition files are Markdown files stored in four possible locations, listed in priority order (highest first):

| Location | Scope | Priority |
|---|---|---|
| `--agents` CLI flag (JSON, no file) | Current session only | 1 (highest) |
| `.claude/agents/<name>.md` | Current project | 2 |
| `~/.claude/agents/<name>.md` | All projects for this user | 3 |
| `<plugin>/agents/<name>.md` | Where plugin is installed | 4 (lowest) |

When multiple subagents share the same `name` field, the higher-priority location wins. Plugin subagents follow the pattern `plugins/rd2/agents/super-coder.md` and are namespaced as `rd2:super-coder` for invocation.

**Subagents are loaded at session start.** If you create a new `.md` file while a session is running, you must restart or use `/agents` to load it immediately.

#### Frontmatter Schema

Only `name` and `description` are required. All other fields are optional.

| Field | Required | Type | Description | Default |
|---|---|---|---|---|
| `name` | Yes | string | Unique identifier; lowercase letters and hyphens | — |
| `description` | Yes | string | When Claude should delegate to this subagent; the primary delegation trigger | — |
| `tools` | No | space-delimited string or list | Allowlist of tools the subagent can use | Inherits all tools |
| `disallowedTools` | No | string or list | Denylist of tools to remove from inherited or specified set | None |
| `model` | No | string | `sonnet`, `opus`, `haiku`, full model ID (e.g., `claude-opus-4-6`), or `inherit` | `inherit` |
| `permissionMode` | No | string | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` | `default` |
| `maxTurns` | No | integer | Maximum agentic turns before the subagent stops | Unlimited |
| `skills` | No | list | Skills to inject into the subagent's context at startup (full content injected, not made available for invocation) | None |
| `mcpServers` | No | list | MCP servers available to this subagent (inline definition or string reference) | Inherits parent's MCP servers |
| `hooks` | No | object | Lifecycle hooks scoped to this subagent (`PreToolUse`, `PostToolUse`, `Stop`) | None |
| `memory` | No | string | Persistent memory scope: `user`, `project`, or `local` | None (no persistence) |
| `background` | No | boolean | `true` = always run as a background task | `false` |
| `isolation` | No | string | `worktree` = run in a temporary git worktree (isolated repository copy) | None |
| `color` | No | string | UI background color for identifying the subagent in the interface | System default |

**Note on the `color` field**: This field is used in this codebase (e.g., `color: purple` in `super-planner.md`, `color: teal` in `super-coder.md`) but is not listed as a standard frontmatter field in the official docs; it is likely a display-only annotation stored in the agent file but processed by the platform UI.

**Minimal valid subagent definition:**

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices. Use proactively after code changes.
tools: Read, Grep, Glob
model: inherit
---

You are a code reviewer. When invoked, analyze code and provide
actionable feedback on quality, security, and best practices.
```

#### Body Structure: System Prompt

The Markdown body after the frontmatter becomes the **system prompt** for the subagent. The subagent receives only this system prompt plus basic environment context (working directory), not the full Claude Code system prompt and not the parent conversation history.

There is no mandated section structure for the system prompt body. However, this codebase applies a conventional **8-section anatomy** for all subagent definitions:

1. **METADATA** — Name, role, purpose, specialization
2. **PERSONA** — Identity description, expertise areas, core philosophy
3. **PHILOSOPHY** — Core principles and mental model
4. **VERIFICATION** — Anti-hallucination protocols, search-first mandates
5. **COMPETENCIES** — Domain knowledge (50+ items across 4-5 categories)
6. **PROCESS** — Step-by-step operational workflow
7. **RULES** — DO and DON'T lists (8+ items each)
8. **OUTPUT** — Response format templates

This 8-section structure is a **local convention** for this project (documented in `.claude/CLAUDE.md`), not an official Claude Code requirement.

#### Built-in Agent Types

Claude Code ships with several built-in subagents that are automatically invoked when appropriate:

| Agent | Model | Tools | Purpose |
|---|---|---|---|
| **Explore** | Haiku | Read-only (no Write/Edit) | Fast codebase search and exploration; invoked with thoroughness levels: `quick`, `medium`, `very thorough` |
| **Plan** | Inherits | Read-only (no Write/Edit) | Research agent used in plan mode to gather context before presenting a plan |
| **general-purpose** | Inherits | All tools | Complex multi-step tasks requiring both exploration and modification |
| **Bash** | Inherits | Bash | Running terminal commands in a separate context |
| **statusline-setup** | Sonnet | UI tools | Invoked when user runs `/statusline` |
| **Claude Code Guide** | Haiku | Read | Answers questions about Claude Code features |

**Important constraint**: Built-in subagents (especially `Explore` and `Plan`) are read-only. They cannot write or edit files.

#### Context Isolation Model

Each subagent invocation creates a **new, isolated context window**:

- The subagent starts fresh — no parent conversation history
- The only channel from parent to subagent is the `Agent` tool's prompt string
- The subagent receives its system prompt + CLAUDE.md files (via `settingSources`) + the prompt passed via the `Agent` tool
- The subagent does **not** receive the parent's system prompt, conversation history, or tool results
- Only the subagent's **final message** returns to the parent as the `Agent` tool result
- All intermediate tool calls and results remain inside the subagent's context window

**Subagent transcripts** are stored at `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl` and persist independently from the main conversation, cleaned up after `cleanupPeriodDays` (default: 30 days).

#### Nesting

**Subagents cannot spawn other subagents.** This is an explicit design constraint. The documentation states: "Subagents cannot spawn other subagents. If your workflow requires nested delegation, use Skills or chain subagents from the main conversation."

For workflows that require nested delegation, the recommended approach is to chain subagents from the main conversation: the first subagent returns its results, then the main conversation spawns the second subagent.

If an agent is running as the **main thread** (launched with `claude --agent`), it can spawn subagents using the `Agent` tool. The `tools: Agent(worker, researcher)` allowlist syntax restricts which subagent types it can spawn.

#### Parallel Execution

Multiple subagents can run in parallel. Claude Code supports two execution modes:

- **Foreground** (blocking): Subagent blocks the main conversation; permission prompts and `AskUserQuestion` calls pass through to the user
- **Background** (concurrent): Subagent runs while you continue working; press Ctrl+B to background a running task; missing permissions auto-deny

To spawn multiple subagents in parallel from the main conversation, Claude issues multiple `Agent` tool calls simultaneously (analogous to multiple `Task()` pseudocode calls in skills/commands within this codebase).

Maximum concurrency is governed by `agents.max_threads` in the Codex config model, but Claude Code does not expose an explicit thread cap in its settings.

#### Invocation Mechanisms

Subagents can be invoked in three ways:

1. **Automatic delegation**: Claude reads all subagent `description` fields and automatically delegates when a task matches. Including "use proactively" in the description encourages proactive delegation.
2. **Explicit user request**: User mentions the subagent by name ("Use the code-reviewer subagent to look at my recent changes")
3. **Programmatic via Agent tool**: From skills and commands using the `Task(subagent_type="plugin:name", prompt="...")` pseudocode (which maps to the `Agent` tool call at runtime)

**Note on tool naming**: In Claude Code v2.1.63, the `Task` tool was renamed to `Agent`. Existing `Task(...)` references in settings and agent definitions still work as aliases. The SDK documentation notes both names should be checked for compatibility.

#### Relationship Between `context: fork` in Skills and Explicit Subagents

These two mechanisms use the same underlying runtime but are configured differently:

| Aspect | `context: fork` in SKILL.md | Explicit subagent `.md` file |
|---|---|---|
| Definition location | `context:` and `agent:` fields in SKILL.md frontmatter | Separate file in `agents/` directory |
| System prompt source | SKILL.md body becomes the system prompt | The agent `.md` body becomes the system prompt |
| Agent type | Specified via `agent: Explore`, `agent: Plan`, `agent: general-purpose` | A named custom subagent |
| Reusability | Scoped to that skill | Available to any skill/command/main conversation |
| Tool access | Inherited from the specified `agent:` type | Configured via `tools:` in the agent's frontmatter |

The official documentation describes this as "the inverse" relationship: with `context: fork` in a skill, the skill content is injected into the agent you specify; with `skills:` in a subagent definition, the subagent controls the system prompt and loads skill content.

#### Example: Local Subagent Definition

From `/Users/robin/projects/cc-agents/plugins/rd2/agents/super-planner.md`:

```yaml
---
name: super-planner
description: |
  Workflow orchestrator that coordinates multi-agent task execution...
  Use PROACTIVELY for planning complex features...
tools:
  - Task
  - AskUserQuestion
  - Skill
  - Bash
model: inherit
color: purple
---
```

The `tools: [Task, AskUserQuestion, Skill, Bash]` list (also written as `tools: [Read, Write, Edit, Grep, Glob, Skill, Bash]` in `super-coder.md`) demonstrates how tool access is explicitly restricted per subagent in this codebase.

---

### 10.3 Codex Subagent / Agent Model

**Confidence: MEDIUM** — verified from `developers.openai.com/codex/multi-agent/` and `developers.openai.com/codex/guides/agents-sdk/` (2026-03-12). Some details inferred from the multi-agent documentation; official deep-dive docs may contain additional fields.

#### Agent Definition Format

Codex does **not** use separate `.md` files for subagent definitions. Instead, agents are defined using two complementary mechanisms:

1. **TOML configuration** in `~/.codex/config.toml` or project-level `.codex/config.toml` (for native Codex multi-agent workflows)
2. **OpenAI Agents SDK** Python/TypeScript `Agent()` class (for programmatic orchestration)

There is no `agents/*.md` directory convention in Codex (the `agents/openai.yaml` file under a skill directory is for **skill invocation policy**, not agent definition — see Section 2 of this report).

#### Native Multi-Agent: TOML-Based Agent Roles

Agent roles are defined in the `[agents]` section of `config.toml`:

```toml
[agents]
max_threads = 6      # concurrent agent thread cap (default: 6)
max_depth = 1        # nesting depth: 1 = direct children only (default: 1)
job_max_runtime_seconds = 1800  # per-worker timeout for CSV batch jobs

[agents.explorer]
description = "Read-only codebase exploration role"
config_file = "agents/explorer.toml"   # role-specific config (optional)
sandbox_mode = "read-only"             # restrict to read operations
model = "o3"                           # override model
```

**Configuration fields per role:**

| Field | Type | Description |
|---|---|---|
| `description` | string | Human-facing role guidance shown to Codex when deciding which role to use |
| `config_file` | string | Optional path to a role-specific TOML config (resolved relative to defining config) |
| `model` | string | Override default model selection for this role |
| `model_reasoning_effort` | string | Reasoning effort level for supported models |
| `sandbox_mode` | string | `read-only` for restricted roles |
| `developer_instructions` | string | Role-specific instructions injected into the system prompt |

**Built-in roles** (shipped with Codex):

| Role | Purpose |
|---|---|
| `default` | General-purpose fallback |
| `worker` | Execution-focused; implementation and fixes |
| `explorer` | Read-heavy codebase exploration |
| `monitor` | Long-running command/task monitoring (optimized for waiting/polling) |

#### Spawning Agents: The `spawn_agents` Tool

Codex exposes the following agent-spawning tools within multi-agent workflows:

- **`spawn_agents`**: Spawn one or more subagents with specific instructions; handles orchestration including routing follow-up instructions, waiting for results, and closing agent threads
- **`spawn_agents_on_csv`**: Read a CSV file, spawn one worker subagent per row, wait for the batch to complete, and export combined results to CSV; each worker must call `report_agent_job_result` exactly once

The `spawn_agents_on_csv` parameters include:
- `csv_path` — path to the input CSV
- `instruction` — template with `{column_name}` placeholders
- `id_column` — column identifying each row
- `output_schema` — structure of expected output
- `output_csv_path` — where combined results are written

#### Agents SDK Integration

For more complex orchestration, Codex integrates with the OpenAI Agents SDK by running as an **MCP server**:

```bash
codex mcp-server
```

This exposes two tools: `codex()` to initiate sessions and `codex-reply()` to continue conversations. In the Agents SDK, agents are defined as:

```python
designer_agent = Agent(
    name="Game Designer",
    instructions="Come up with an idea for a game...",
    model="gpt-5",
    handoffs=[developer_agent],  # agents it can delegate to
    mcp_servers=[codex_server],
)
```

**SDK agent definition fields:**

| Field | Type | Description |
|---|---|---|
| `name` | string | Identifier |
| `instructions` | string | System prompt / role-specific behavioral guidance |
| `model` | string | LLM selection |
| `handoffs` | list | Agents this agent can delegate to |
| `mcp_servers` | list | Connected MCP servers |
| `tools` | list | Optional capabilities |

All executions are traced through OpenAI's Traces dashboard.

#### Context Isolation

Subagents in Codex are described as "context-isolated agents that run independently from your main session — your main agent delegates work and only the final result flows back." Sub-agents inherit the parent sandbox policy and live runtime overrides (approvals, sandbox choices), but their conversation history is separate.

#### Nesting

`agents.max_depth` (default: 1) controls spawning depth. At depth 1, direct child agents are allowed but those children cannot spawn further agents. This is configurable (unlike Claude Code's hard prohibition on nesting).

#### Parallel Execution

`agents.max_threads` (default: 6) caps concurrent agent threads. The `spawn_agents_on_csv` tool provides structured batch parallelism.

#### Comparison to Claude Code Subagents

| Aspect | Claude Code | Codex |
|---|---|---|
| Definition format | Markdown + YAML frontmatter (`.md` files) | TOML config sections or SDK `Agent()` class |
| Definition location | `agents/` directory (plugin, project, user) | `config.toml` `[agents]` section |
| Built-in roles | Explore, Plan, general-purpose, Bash | default, worker, explorer, monitor |
| Nesting depth | Hard limit: 0 (subagents cannot spawn) | Configurable via `max_depth` (default: 1) |
| Parallel agents | Yes (foreground/background modes) | Yes (max_threads cap, default: 6) |
| Model override | `model:` frontmatter field | `model:` in role config |
| Tool restriction | `tools:` and `disallowedTools:` fields | `sandbox_mode: read-only` or SDK `tools:` |
| Batch spawning | Not built-in (requires multiple Agent tool calls) | `spawn_agents_on_csv` for CSV-driven batch |

---

### 10.4 Gemini CLI Agent Model

**Confidence: MEDIUM** — verified from `geminicli.com/docs/core/subagents/` and community sources (2026-03-12). The official Gemini CLI documentation describes an **experimental** subagent system; some implementation details vary across sources.

#### Agent Definition Format

Gemini CLI subagents are defined as Markdown files with YAML frontmatter — the same base format as Claude Code subagents. Two storage locations are supported:

| Location | Scope |
|---|---|
| `.gemini/agents/<name>.md` | Project-level (current project only) |
| `~/.gemini/agents/<name>.md` | User-level (all projects) |

**Note on format inconsistency**: One source reports the format as TOML (not YAML) with a `[prompts]` section structure. The official `geminicli.com/docs/core/subagents/` documentation uses YAML frontmatter. This inconsistency likely reflects different versions of the feature: the TOML format appears to be an earlier experimental implementation, while YAML frontmatter is the current official format. This report relies on the official documentation.

#### Frontmatter Schema

| Field | Required | Type | Description | Default |
|---|---|---|---|---|
| `name` | Yes | string | Unique identifier (slug); lowercase, numbers, hyphens, underscores only | — |
| `description` | Yes | string | Agent's purpose; helps main agent decide when to invoke | — |
| `kind` | No | string | `local` (default) or `remote` | `local` |
| `tools` | No | array | List of accessible tools | Platform defaults |
| `model` | No | string | Model override (e.g., `gemini-2.5-pro`) | Inherits main session |
| `temperature` | No | float | Response variability (0.0–2.0) | Platform default |
| `max_turns` | No | integer | Maximum conversation turns | 15 |
| `timeout_mins` | No | integer | Maximum execution time in minutes | 5 |

**Example definition from official docs:**

```yaml
---
name: security-auditor
description: Specialized in finding security vulnerabilities in code.
kind: local
tools:
  - read_file
  - grep_search
model: gemini-2.5-pro
temperature: 0.2
max_turns: 10
---

You are a security auditor. When invoked, analyze code for vulnerabilities...
```

The Markdown body becomes the system prompt.

#### Context Isolation

Subagents run in **independent context windows**. When the main agent delegates, "the sub-agent's entire execution is consolidated into a single result entry in the main conversation history." This is the same isolation model as Claude Code: verbose intermediate steps are compressed and only the summary returns to the parent.

Gemini CLI differentiates its two agent extension mechanisms:

- **Agent Skills**: On-demand specializations activated **within** the main agent's context; augment the main agent's system prompt with domain-specific instructions without spawning a new context
- **Subagents**: Independent agent instances with their own context window; execute in isolation and return a consolidated summary

#### Invocation

Subagents are "exposed to the main agent as a tool of the same name." When the main agent decides to delegate, it calls that tool. The user can also explicitly prompt the main agent to use a specific subagent by name.

#### Concurrency Constraints

"The system enforces strict concurrency rules for sub-agents, prohibiting running multiple subagents in a single turn if their abilities mutate the same files or resources to prevent race conditions." Read-only subagents may run concurrently; write-capable subagents are serialized.

#### Nesting

Not explicitly documented in the official Gemini CLI subagents page. Community implementations (such as the Maestro project) demonstrate hierarchical orchestration via TechLead-style coordinator agents, but whether this relies on nesting or sequential chaining from the main conversation is unclear from official sources. **Confidence: LOW** on nesting behavior.

#### Remote Subagents

Gemini CLI also supports **remote subagents** (experimental) via the `kind: remote` field. These connect to external agent services rather than running locally. Documented at `geminicli.com/docs/core/remote-agents/`.

---

### 10.5 Google Antigravity Agent Model

**Confidence: LOW-MEDIUM** — verified from `developers.googleblog.com`, `codelabs.developers.google.com/getting-started-google-antigravity`, and secondary sources (2026-03-12). Antigravity's agent model is primarily described in terms of UX/workflow patterns rather than formal definition schemas. Detailed technical documentation for agent definition files has not been found in primary sources.

#### Platform Overview

Google Antigravity is described as an "agent-first IDE" where "the AI is not just a tool for writing code but an autonomous actor capable of planning, executing, validating, and iterating on complex engineering tasks with minimal human intervention." It bifurcates the developer experience into:

- **Editor View**: Traditional AI-assisted coding (analogous to Cursor or VS Code Copilot)
- **Manager Surface ("Mission Control")**: Multi-agent orchestration interface for spawning and monitoring parallel agents

#### Agent Definition: Skills-Based, Not File-Based

Unlike Claude Code and Gemini CLI, Antigravity does **not** appear to use a formal `.md` agent definition file format for user-customized agents. Instead, agents are configured through:

1. **Skills (SKILL.md)**: Reusable capabilities that can be chained; future evolution of skills involves "Multi-Agent Orchestration where a single user prompt might trigger multiple skills that work in sequence"
2. **Policy configuration**: Terminal Execution Policy (Always/Review/Deny), JavaScript Execution Policy, Review Policy — set during workspace setup rather than per-agent
3. **Natural language dispatch**: Users invoke agents via conversational requests to the Manager Surface

There is no documented `.agent/agents/` directory convention or YAML/TOML-based custom agent definition format in primary Antigravity documentation as of 2026-03-12.

#### Manager Surface

The Manager Surface provides:
- **Visual dispatch**: Users type conversational requests to spawn agents (e.g., "Refactor the authentication module")
- **Parallel monitoring**: Visualization of multiple agents working asynchronously across workspaces
- **Artifact review**: Agents produce verifiable deliverables (task lists, implementation plans, screenshots, browser recordings)
- **Asynchronous task management**: Background agents can be dispatched and monitored while continuing other work

Supported models include: Gemini 3 Pro (High/Low), Gemini 3 Flash, Claude Sonnet 4.5, Claude Sonnet 4.5 with Thinking, Claude Opus 4.5, GPT-OSS 1208.

#### Invocation

Invocation is via natural language in two interfaces:
- **Manager Surface**: "Dispatch agents for long-running maintenance tasks or bug fixes in the background"
- **Editor Side Panel**: `Cmd + L` (conversation) or `Cmd + I` (inline command)

There is no programmatic `Task()` or `spawn_agents()` equivalent for skills-level orchestration documented in primary sources.

---

### 10.6 agentskills.io: Does the Standard Cover Agents?

**Confidence: HIGH** — verified directly from `agentskills.io/specification` (2026-03-12)

The agentskills.io open specification covers **skills only**. As of 2026-03-12:

- There is **no `AGENT.md` convention** in the specification
- There is **no subagent spawning protocol** in the specification
- There is **no agent definition file format** in the specification
- The `allowed-tools` field (experimental) is the only tool-restriction mechanism in the spec, and it applies to skills, not agents

The specification defines exactly one artifact: a skill directory containing a `SKILL.md` file with `name` and `description` in YAML frontmatter, followed by a Markdown body. The optional directories (`scripts/`, `references/`, `assets/`) and optional frontmatter fields (`license`, `compatibility`, `metadata`, `allowed-tools`) are fully documented and stable.

The spec is explicitly focused on reusable workflow instructions for AI coding agents, not on the orchestration or definition of those agents themselves.

**Platform-specific subagent systems are extensions that exist outside the agentskills.io standard.** Each platform independently developed its subagent model:

- Claude Code: Markdown + YAML frontmatter in `agents/` directories
- Codex: TOML-based role config in `config.toml`
- Gemini CLI: Markdown + YAML frontmatter in `.gemini/agents/`
- Antigravity: No formal definition format (policy + natural language)

There is no cross-platform agent definition portability equivalent to the SKILL.md portability guarantee.

---

### 10.7 Comparison Matrix: Subagent Systems

| Dimension | Claude Code | Codex | Gemini CLI | Antigravity | OpenClaw | pi-mono | OpenCode |
|---|---|---|---|---|---|---|---|
| **Agent definition format** | Markdown + YAML frontmatter (`.md` files) | TOML `[agents]` section in `config.toml` | Markdown + YAML frontmatter (`.md` files) | None — policy + natural language | Config-based (`openclaw.json` `agents.list`); no Markdown agent files | None — single-agent design | Dual: JSON `agent:` section in `opencode.jsonc` OR Markdown `.md` files |
| **Definition file location** | `<plugin>/agents/`, `.claude/agents/`, `~/.claude/agents/` | `~/.codex/config.toml`, `.codex/config.toml` | `.gemini/agents/`, `~/.gemini/agents/` | N/A | `~/.openclaw/openclaw.json` | N/A | `.opencode/agents/` (project), `~/.config/opencode/agents/` (global), or `opencode.jsonc` `agent:` section |
| **Invocation mechanism** | `Agent` tool (formerly `Task`); automatic via description matching | `spawn_agents` tool; SDK `Agent()` handoffs | Tool exposure (agent exposed as tool by name) | Natural language to Manager Surface | `sessions_spawn` tool; `/subagents spawn` command; ACP `runtime:"acp"`; bash via `coding-agent` skill | N/A (no sub-agents) | `@agent-name task` in TUI (user-direct); automatic by primary agent (description-matching); internal `task` tool |
| **Built-in agent types** | Explore (Haiku, read-only), Plan (read-only), general-purpose (all tools), Bash, statusline-setup, Claude Code Guide | default, worker, explorer (read-only), monitor | None documented | None documented | None predefined | N/A | Build (primary, full tools), Plan (primary, edits/bash ask), General (subagent, full), Explore (subagent, read-only), Compaction/Title/Summary (hidden system) |
| **Context isolation** | Full isolation: fresh context window; only prompt string passes from parent | Full isolation: "context-isolated agents"; only final result returns | Full isolation: independent context window | Not explicitly documented | Full: own context window; only announce result flows back to chat | N/A | Full: child session with own context window; result returns to parent session |
| **Tool inheritance** | Inherits all parent tools unless `tools:` or `disallowedTools:` specified | Inherits parent sandbox policy; `sandbox_mode: read-only` available | Controlled by `tools:` list in frontmatter | Controlled by policy (Terminal/JS execution) | All tools except session tools (configurable via `tools.subagents.tools`) | N/A | Configurable via `tools` map (boolean flags or glob patterns); `permission` block per agent |
| **Model selection per agent** | Yes: `model:` field (`sonnet`, `opus`, `haiku`, full ID, or `inherit`) | Yes: `model:` per role in config | Yes: `model:` field (e.g., `gemini-2.5-pro`) | Yes: multi-model support in Manager (Gemini 3, Claude 4.5, GPT-OSS) | Yes: per-agent config + per-spawn override via `sessions_spawn.model` | `/model` command per session only (no per-agent override) | Yes: `model:` field per agent (e.g., `anthropic/claude-sonnet-4-20250514`); subagents without `model` inherit from invoking primary |
| **Parallel execution** | Yes: foreground (blocking) or background (Ctrl+B); no explicit thread cap in docs | Yes: `max_threads` (default: 6) caps concurrency | Yes: concurrent if read-only; serialized if writing to same files | Yes: Manager Surface supports multiple parallel agents | Yes: `maxConcurrent` (default 8); `maxChildrenPerAgent` (default 5) | No built-in (external: tmux/shell) | Not documented in public docs (LOW confidence); session tree implies sequential navigation |
| **Nesting depth** | 0 — subagents cannot spawn subagents (hard constraint) | Configurable: `max_depth` (default: 1; allows direct children) | Not documented; LOW confidence | Not documented | 1–5 (`maxSpawnDepth`, default 1); depth-2 workers cannot spawn | N/A | Not documented (LOW confidence) |
| **User-direct invocation** | Yes: by name in main conversation; or automatic via description | Yes: explicit request or automatic | Yes: prompt main agent to use by name | Yes: natural language dispatch | Yes: `/subagents spawn <agentId> <task>` from chat | N/A | Yes: `@agent-name task` in TUI with autocomplete dropdown (Tab to open `@` menu) |
| **Programmatic invocation** | Yes: `Agent(subagent_type="name", prompt="...")` tool call; `Task()` alias still works | Yes: SDK `Agent()` class with `handoffs`; `codex mcp-server` for SDK integration | Yes: tool call to subagent's exposed tool | Not documented | Yes: `sessions_spawn` tool call from agent context | N/A | Yes: internal `task` tool call by primary agent (not user-facing API) |
| **Persistent memory** | Yes: `memory: user/project/local` field | Not documented | Not documented | Not documented | Yes: workspace files persist; `sessions_history` for transcript | Yes: `.pi/SYSTEM.md`, `AGENTS.md` persist across sessions | Not documented (session files persist on disk; no `memory:` field equivalent) |
| **Session resume** | Yes: by agent ID from transcript | Not documented | Not documented | Not documented | Yes: via ACP bridge `loadSession`; `sessions_history` | Yes: `/resume` command picks previous sessions | Not documented |
| **Lifecycle hooks** | Yes: `PreToolUse`, `PostToolUse`, `Stop` in subagent frontmatter | Not documented | Not documented | Not documented | No per-sub-agent hooks; global `tools.allow/deny` at agent config level | Not documented | No per-agent hooks in agent files; global JS plugin hooks (`tool.execute.before`, `tool.execute.after`, `session.*`) via plugin system |
| **Skills injection** | Yes: `skills:` field injects full skill content into subagent context | N/A (skills and agents are separate systems) | N/A (agent skills augment main agent, not subagents) | Implicit via skills chaining | No (sub-agents receive only `AGENTS.md` + `TOOLS.md`) | N/A | No `skills:` injection field; each agent uses the `skill` tool independently (can be disabled per agent via `tools: { skill: false }`) |
| **Standard compliance** | No — extends agentskills.io but agent system is proprietary | No — TOML config is independent of agentskills.io | No — `.gemini/agents/` is independent of agentskills.io | No | No — proprietary `openclaw.json` config | N/A | No — proprietary `opencode.jsonc` config; Markdown agent format is OpenCode-specific |
| **Batch spawning** | Not built-in | `spawn_agents_on_csv` (CSV-driven batch) | Not documented | Not documented | Not built-in (loop over `sessions_spawn`) | N/A | Not built-in |
| **Announce result to chat** | No (returns inline to parent context) | No | No | No | Yes: automatic announce step posts to requester's chat channel | N/A | No (returns to parent session context) |
| **Thread-bound sessions** | No | No | No | No | Yes: Discord threads, Telegram topics (`mode:"session"`, `thread:true`) | N/A (TUI-only) | No (TUI-only; session tree navigation via keyboard) |
| **External harness support** | No (is a target, not orchestrator) | No | No | No | Yes: Pi, Claude Code, Codex, OpenCode, Gemini CLI, Kimi via ACP (`runtime:"acp"`) | No (is a target) | No (is a target; OpenClaw can orchestrate OpenCode via ACP) |
| **Confidence** | HIGH | MEDIUM | MEDIUM | LOW | HIGH | HIGH | HIGH (definition format, invocation, built-ins); MEDIUM (nesting depth, parallel execution) |

---

### 10.8 Design Patterns for Cross-Platform Agent Orchestration

#### What Is Claude Code-Only With No Equivalent

The following subagent capabilities are **Claude Code-specific** and have no documented equivalent on other platforms:

1. **`Task(subagent_type="plugin:name", prompt="""...""")` pseudocode in skill/command bodies** — The pattern of embedding subagent dispatch instructions as pseudocode in Markdown body files. On other platforms, orchestration is done via code (SDK) or TOML config, not Markdown pseudocode.

2. **`context: fork` + `agent: Explore/Plan` in SKILL.md** — Running a skill in an isolated subagent context via frontmatter flags. No equivalent in the agentskills.io spec or other platforms.

3. **Plugin namespace inheritance** — `rd2:super-coder` naming convention that combines plugin name and agent name. Codex and Gemini CLI do not have an equivalent namespaced agent reference system.

4. **`skills:` injection into subagent context** — Pre-loading full skill content into a subagent at startup. Codex and Gemini CLI have no equivalent mechanism.

5. **`memory: user/project/local` persistent agent memory** — Cross-session memory persistence scoped to an agent. Not documented on other platforms.

6. **`isolation: worktree`** — Running a subagent in a temporary git worktree for isolated filesystem operations. Unique to Claude Code.

7. **Subagent lifecycle hooks** — `PreToolUse`, `PostToolUse`, `Stop` events scoped to a specific subagent's execution. Not documented on other platforms.

8. **`AskUserQuestion` checkpoint in subagent workflows** — The pattern of using `AskUserQuestion` for user checkpoints within multi-step orchestration. Not available in headless/background agents on other platforms.

#### What Patterns Generalize Across Platforms

The following concepts are shared across platforms, though implementation details differ:

1. **Description-driven delegation** — All platforms use the agent's `description` field as the primary signal for when to invoke it. Writing clear, specific, keyword-rich descriptions is universally important.

2. **Context isolation** — All platforms that have formal subagent systems (Claude Code, Codex, Gemini CLI) isolate subagent context from the parent. Design for subagents that receive all needed information in the dispatch prompt.

3. **Tool restriction** — All platforms support some form of tool restriction per agent. Design read-only agents for exploration tasks (they are safer and faster across all platforms).

4. **Model override per agent** — All platforms with formal subagent systems support model override. Route cheap tasks to faster/smaller models (`haiku`, `gemini-flash`) and expensive tasks to capable models.

5. **Single result return** — All platforms return only the final result from a subagent, not the intermediate steps. Design subagents to produce concise, structured output.

6. **Parallel execution** — All platforms support some form of parallel agent execution. Decompose independent tasks into separate agents for throughput.

#### Recommended Approach for Multi-Platform Agent Workflows

For skills and commands that orchestrate agents, follow this tiered approach:

**Tier 1: Portable core (works everywhere)**
- Express all coordination logic as natural language in the SKILL.md body
- Use description-matching to trigger the right agents
- Avoid assuming any specific invocation syntax

**Tier 2: Claude Code optimization (agent definitions)**
- Create dedicated agent `.md` files in `<plugin>/agents/` for reusable specialist roles
- Restrict tools explicitly (`tools: [Read, Grep, Glob]` for read-only roles)
- Set model explicitly to control cost/quality tradeoff
- Use the 8-section anatomy for complex agents (METADATA → PERSONA → PHILOSOPHY → VERIFICATION → COMPETENCIES → PROCESS → RULES → OUTPUT)

**Tier 3: Claude Code orchestration pseudocode (commands)**
- Use `Task(subagent_type="plugin:name", prompt="...")` in command `.md` files for deterministic dispatch
- Document that this is Claude Code-only; provide natural language equivalent in the skill body
- Use `AskUserQuestion` for checkpoints in `--semi` or `--step` modes

**When choosing between skill-level fork and explicit subagent:**
- Use `context: fork` + `agent: Explore` in SKILL.md when the skill itself IS the agent workflow
- Use a named subagent `.md` file when the agent persona is **reused** across multiple skills/commands

---

**Sources for Section 10:**

- [Create custom subagents — Claude Code Docs](https://code.claude.com/docs/en/sub-agents) (2026-03-12, HIGH confidence)
- [Subagents in the SDK — Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/subagents) (2026-03-12, HIGH confidence)
- [Multi-agents — Codex Documentation](https://developers.openai.com/codex/multi-agent/) (2026-03-12, MEDIUM confidence)
- [Use Codex with the Agents SDK — Codex Documentation](https://developers.openai.com/codex/guides/agents-sdk/) (2026-03-12, MEDIUM confidence)
- [Subagents (experimental) — Gemini CLI](https://geminicli.com/docs/core/subagents/) (2026-03-12, MEDIUM confidence)
- [How to Create Custom Sub-Agents in Gemini CLI](https://website-nine-gules.vercel.app/blog/how-to-create-custom-sub-agents-gemini-cli) (2026-03-12, MEDIUM confidence — unofficial)
- [Build with Google Antigravity — Google Developers Blog](https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/) (2026-03-12, MEDIUM confidence)
- [Getting Started with Google Antigravity — Google Codelabs](https://codelabs.developers.google.com/getting-started-google-antigravity) (2026-03-12, MEDIUM confidence)
- [Specification — agentskills.io](https://agentskills.io/specification) (2026-03-12, HIGH confidence)
- Local source files: `/Users/robin/projects/cc-agents/plugins/rd2/agents/` (HIGH confidence — primary source)
- Local source files: `/Users/robin/projects/cc-agents/plugins/wt/agents/` (HIGH confidence — primary source)
- Local `.claude/CLAUDE.md` conventions documentation (HIGH confidence)

---

### 10.9 OpenClaw: Multi-Agent Model

**Confidence: HIGH** — verified from primary source local files (`/Users/robin/projects/gitops/vendors/openclaw/docs/tools/subagents.md`, `docs/concepts/session-tool.md`, `docs/concepts/multi-agent.md`, `docs/tools/acp-agents.md`, `docs.acp.md`, `skills/coding-agent/SKILL.md`), 2026-03-13.

#### Architecture Overview

OpenClaw has the most sophisticated multi-agent system in this comparison. There are three distinct mechanisms, each serving different use cases:

1. **OpenClaw native sub-agents** (`sessions_spawn` tool) — OpenClaw manages the lifecycle
2. **ACP harness sessions** (`sessions_spawn` with `runtime:"acp"`) — External coding agents (Pi, Claude Code, Codex, Gemini CLI, OpenCode) run via the Agent Client Protocol
3. **Bash process spawning** (via the `coding-agent` skill) — External agents launched as OS processes

#### Mechanism 1: Native Sub-Agents (`sessions_spawn`)

The primary programmatic spawning mechanism is the `sessions_spawn` tool. Sub-agents run in dedicated sessions (`agent:<agentId>:subagent:<uuid>`) and announce their results back to the requester chat channel when finished.

**Tool parameters:**

| Parameter | Default | Description |
|---|---|---|
| `task` | required | Task prompt for the sub-agent |
| `label` | optional | Display label for logs/UI |
| `agentId` | optional | Spawn under a different OpenClaw agent identity |
| `model` | optional | Override model for this run |
| `thinking` | optional | Override thinking level |
| `runTimeoutSeconds` | 0 (no timeout) | Abort sub-agent after N seconds |
| `thread` | false | Bind result to a chat thread (Discord/Telegram) |
| `mode` | `run` (or `session` when `thread:true`) | One-shot (`run`) vs. persistent thread-bound (`session`) |
| `cleanup` | `keep` | `delete` archives transcript immediately after announce |
| `sandbox` | `inherit` | `require` rejects spawn unless target is sandboxed |
| `runtime` | `subagent` | `acp` for external coding harnesses |
| `attachments` | optional | Inline files materialized into child workspace |

**Nesting depth**: Sub-agents default to `maxSpawnDepth: 1` (no sub-sub-agents). Set `maxSpawnDepth: 2` to enable orchestrator pattern (main → orchestrator → workers). Maximum configurable depth is 5.

**Concurrency**: `maxConcurrent` defaults to 8; `maxChildrenPerAgent` defaults to 5 per session.

**Announce back**: After a sub-agent run completes, OpenClaw runs an announce step inside the sub-agent session and posts the result to the requester's chat channel. The announce includes `Status`, `Result`, runtime stats, `sessionKey`, and transcript path. The main agent is instructed to rewrite the announce in normal voice (not forward raw metadata).

**Tool policy**: Sub-agents at depth 1 (leaf) receive all tools except session tools (`sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`). Depth-1 orchestrators (when `maxSpawnDepth >= 2`) additionally receive `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` to manage their children. Depth-2 workers never get `sessions_spawn`.

**Bootstrap injection**: Sub-agent sessions inject only `AGENTS.md` and `TOOLS.md` from the workspace (not `SOUL.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, or `BOOTSTRAP.md`).

**User control**: `/subagents spawn <agentId> <task>` triggers a sub-agent from chat as a user command. `/subagents list|kill|log|info|send|steer` manages running sub-agents.

#### Mechanism 2: ACP Harness Sessions

OpenClaw can run **external coding agents** (Pi, Claude Code, Codex, OpenCode, Gemini CLI, Kimi) as ACP sessions via the `acpx` backend plugin. These are not OpenClaw-native sub-agents; they run on the host outside the sandbox.

```json
{
  "task": "Open the repo and fix failing tests",
  "runtime": "acp",
  "agentId": "codex",
  "thread": true,
  "mode": "session"
}
```

ACP sessions are managed via `/acp spawn|cancel|steer|close|status|...` commands. The `coding-agent` SKILL.md describes this as the correct approach when "spawn/run Codex or Claude Code in a Discord thread" (vs. bash-process spawning, which is for non-thread-bound use cases).

The ACP bridge (`openclaw acp` over stdio) also allows IDEs like Zed to connect to an OpenClaw Gateway session, translating IDE prompts into Gateway `chat.send` calls.

#### Mechanism 3: Bash Process Spawning (via `coding-agent` skill)

The bundled `coding-agent` skill provides instructions for spawning external coding agents as OS-level processes using the `bash` tool:

```bash
# For Codex/Pi/OpenCode (PTY required)
bash pty:true workdir:~/project command:"codex exec 'Your prompt'"

# For Claude Code (no PTY)
bash workdir:~/project command:"claude --permission-mode bypassPermissions --print 'Your task'"

# Background execution with monitoring
bash pty:true workdir:~/project background:true command:"pi 'task'"
process action:log sessionId:XXX
```

This is the "bash-first" approach: leveraging the agent's `bash` tool to launch processes, not a native spawning mechanism. Background sessions are monitored via the `process` tool (actions: `list`, `poll`, `log`, `write`, `submit`, `send-keys`, `paste`, `kill`).

**Important distinction**: Bash process spawning has no context sharing, no announce-back mechanism, no transcript integration, and no session tool visibility. It is fundamentally different from `sessions_spawn`. The `coding-agent` skill explicitly states: for "thread-bound ACP harness requests in chat (spawn/run Codex or Claude Code in a Discord thread)" use `sessions_spawn` with `runtime:"acp"`, not bash spawning.

#### Mechanism 4: Multi-Agent Routing (Multiple Isolated Agents)

Separate from sub-agent spawning, OpenClaw supports running **multiple isolated OpenClaw agents** on a single Gateway. Each agent has its own workspace, `agentDir`, session store, and auth profiles. Routing rules (bindings) connect inbound messages from specific channels/accounts/peers to specific agents.

Example: route WhatsApp to a `chat` agent and Telegram to a `deep-work` agent; or route different phone numbers to different agents (one per user).

This is a **horizontal** multi-agent topology (parallel isolated agents, each handling different input streams), not a **vertical** one (parent spawning children for task delegation). These two topologies are independent and composable.

#### Cross-Agent Communication (`sessions_send` + `sessions_spawn`)

Agents can communicate via:
- `sessions_send` — send a message to another session and optionally await a reply (up to `maxPingPongTurns`, default 5)
- `sessions_spawn` — spawn a sub-agent and await its announced result

Cross-agent messaging requires `tools.agentToAgent.enabled: true` and explicit allowlisting (`tools.agentToAgent.allow`).

#### What OpenClaw Cannot Do (Compared to Claude Code)

| Capability | OpenClaw | Claude Code |
|---|---|---|
| Define agent persona in SKILL.md frontmatter | No (agents defined in `openclaw.json` config) | Yes (`context: fork`, `agent:` field) |
| Reuse a named agent role across skills | No (sub-agents are task-scoped, not persona-scoped) | Yes (named agent `.md` files) |
| Inject skills into sub-agent context | No (sub-agents only receive `AGENTS.md` + `TOOLS.md`) | Yes (`skills:` field) |
| Persistent cross-session agent memory | Yes (workspace files, sessions history via `sessions_history`) | Yes (`memory: user/project/local`) |
| Lifecycle hooks scoped to sub-agent | No (global `tools.allow/deny` per agent config) | Yes (`PreToolUse`, `PostToolUse`, `Stop`) |
| Sub-agent spawning depth > 1 | Yes (`maxSpawnDepth: 2`, configurable up to 5) | No (hard limit: 0) |
| Concurrent sub-agent cap | Yes (`maxConcurrent: 8`, `maxChildrenPerAgent: 5`) | Not documented explicitly |
| Thread-bound persistent sub-agent sessions | Yes (Discord/Telegram, `mode: "session"`, `thread: true`) | No |
| External coding harness via ACP | Yes (`runtime: "acp"` with acpx plugin) | No (is the target, not the orchestrator) |
| Announce sub-agent result to chat | Yes (automatic announce step) | No (result returns inline to parent context) |

---

### 10.10 pi-mono: Agent Architecture

**Confidence: HIGH** — verified from `github.com/badlogic/pi-mono` README and packages/coding-agent documentation (WebFetch, 2026-03-13).

#### Explicit Single-Agent Design

Pi is **deliberately single-agent**. The documentation states: "No sub-agents. There's many ways to do this. Spawn pi instances via tmux, or build your own with extensions, or install a package that does it your way."

This is a principled architectural choice: pi declines to bake in an orchestration model and instead lets users compose multi-agent workflows at the OS/shell level or via extensions.

#### Available Tools

Pi ships with a minimal, focused toolset:

**Default tools** (always available):
- `read` — read file contents
- `write` — write file contents
- `edit` — edit file contents
- `bash` — execute shell commands

**Additional tools** (also available):
- `grep` — search file contents
- `find` — find files by path/pattern
- `ls` — list directory contents

This is notably minimal compared to other platforms: Claude Code ships 20+ tools (including browser, MCP integration, Agent/Task, web fetch), Codex ships comparable tools plus `spawn_agents`, and OpenClaw ships the pi toolset plus session tools, ACP, browser, canvas, nodes, cron, and more.

#### What pi-mono Does Not Have

| Capability | pi-mono | Notes |
|---|---|---|
| Sub-agent spawning | No | Deliberate design choice |
| `Task()` / `spawn_agents` equivalent | No | Users spawn via shell/tmux externally |
| Multi-agent orchestration | No | No built-in mechanism |
| Agent definition format | No | No `.pi/agents/` or equivalent |
| Tool restriction per skill/context | Not documented | |
| Model override per skill/context | Not documented (only `/model` command) | |
| MCP integration | Not documented | |
| Context injection from skills | Yes (skill body injected on activation) | |
| Thread-bound sessions | No (TUI-only) | |
| Announce-back mechanism | No | |

#### Extensions as the Escape Hatch

Pi's deliberate minimalism is offset by an **extension system**. Extensions can:
- Register custom slash commands
- Add custom tools
- Implement multi-agent workflows in custom ways

This is how users who need sub-agent functionality are expected to proceed: write an extension. The core pi CLI stays minimal; capability growth happens in the extension ecosystem.

#### pi as a Target, Not Orchestrator

In practice, pi is more often a **target** of orchestration than an orchestrator itself:
- OpenClaw can spawn `pi` as an ACP harness session (via `sessions_spawn` with `runtime:"acp"`, `agentId:"pi"`)
- The `coding-agent` skill in OpenClaw includes pi as a bash-spawnable option: `bash pty:true command:"pi 'task'"`
- The pi-mono `pi-mom` package is a Slack bot that delegates messages to the pi coding agent

This positions pi as a high-quality single-task executor that other orchestrators can deploy, rather than as a coordinator of other agents.

#### Anthropic Prompt Caching

Pi added Anthropic prompt caching (PR #584, January 2026), enabling significant cost reduction for long sessions with Anthropic models. This feature is significant enough that the OpenClaw `coding-agent` skill mentions it as a note: "Pi now has Anthropic prompt caching enabled (PR #584, merged Jan 2026)!"

---

### 10.11 OpenCode: Agent Architecture

**Confidence: HIGH** — verified from official OpenCode documentation at `opencode.ai/docs/agents/`, `opencode.ai/docs/config/`, and `opencode.ai/docs/commands/` (WebFetch, 2026-03-13), and local design document `2025-11-22-opencode-support-design.md`, and local `opencode.jsonc` config.

#### The `agent:` Config Section

The `agent:` section in `opencode.jsonc` defines custom named agents. The local `opencode.jsonc` (`~/.config/opencode/opencode.jsonc`) shows `"agent": {}` empty — the reference user has not defined custom agents. The full schema:

```json
{
  "agent": {
    "code-reviewer": {
      "description": "Specialized agent for reviewing code quality and security",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-20250514",
      "prompt": "{file:./prompts/reviewer.txt}",
      "temperature": 0.3,
      "tools": { "write": false },
      "permission": { "bash": { "git push": "deny" } },
      "steps": 50,
      "color": "#ff6b6b",
      "hidden": false,
      "disable": false
    }
  }
}
```

Supported agent config fields:

| Field | Description | Default |
|---|---|---|
| `description` | Purpose shown in `@` autocomplete and TUI | Required |
| `mode` | `"primary"`, `"subagent"`, or `"all"` | `"all"` |
| `model` | Override global model (e.g., `"anthropic/claude-sonnet-4-20250514"`) | Inherited |
| `prompt` | System prompt file path via `{file:./path}` or inline text | None |
| `temperature` | Randomness (0.0–1.0) | Model default |
| `top_p` | Alternative diversity control (0.0–1.0) | Model default |
| `tools` | Tool enable/disable map (`{ "write": false, "mymcp_*": false }`) | Inherited |
| `permission` | Per-agent permission overrides for `edit`, `bash`, `webfetch`, `skill`, `task` | Global default |
| `steps` | Max agentic iterations before text-only response | Global default |
| `color` | Visual appearance in TUI (hex or theme color) | None |
| `hidden` | Hide from `@` autocomplete (subagent mode only) | `false` |
| `disable` | Deactivate this agent | `false` |

Agents can also be defined as **markdown files** in `~/.config/opencode/agents/` (global) or `.opencode/agents/` (project-level). The filename (`agent-name.md`) becomes the agent's accessible name. Markdown agent files support the same frontmatter fields plus a freeform markdown body for system prompt content — this is functionally analogous to Claude Code's agent definition format (`.claude/agents/<name>.md` with YAML frontmatter).

#### The `@mention` Subagent System

OpenCode's primary mechanism for user-directed subagent invocation is the `@mention` syntax:

```
@code-reviewer review the auth module for security issues
```

This directly invokes the named subagent with the task text as its prompt. Key behaviors:

- **Automatic dispatch**: Primary agents can invoke subagents automatically without user `@` syntax, when the primary agent judges the task warrants a specialist
- **Manual dispatch**: Users can directly `@mention` any subagent by name in the TUI
- **Autocomplete**: Typing `@` in the TUI triggers an autocomplete dropdown listing available subagents (respecting `hidden: true`)
- **Session hierarchy**: Subagent work runs in a child session navigable via `session_child_first` / `session_child_cycle` / `session_parent` key bindings

The `@mention` syntax is the functional equivalent of Claude Code's `Agent(subagent_type="name", prompt="...")` tool call — both dispatch a named agent with a task prompt. The key difference is that `@mention` is user-typed (interactive) while Claude Code's `Agent` tool is invoked programmatically within an agent's execution context.

Task permissions control which subagents can be invoked:

```json
"permission": {
  "task": { "*": "deny", "orchestrator-*": "allow" }
}
```

#### Agent Definition Files

OpenCode supports **two formats** for custom agent definition:

1. **JSON config** (`opencode.jsonc` `agent:` section): In-file definition with all fields
2. **Markdown files**: `.opencode/agents/<name>.md` (project) or `~/.config/opencode/agents/<name>.md` (global)

The markdown file format supports frontmatter with the same fields as the JSON config, plus the markdown body serves as the agent's system prompt (analogous to Claude Code's agent `.md` format). This gives OpenCode the same dual-format flexibility as Claude Code.

Discovery precedence:
- Project-level `.opencode/agents/` takes priority over global `~/.config/opencode/agents/`
- JSON config agents coexist with file-based agents; name collisions favor config

#### Multi-Agent Orchestration

OpenCode's multi-agent model has these characteristics:

**Built-in agent types** (always available):

| Agent | Mode | Description |
|---|---|---|
| `build` | Primary (default) | Full tool access; default for development work |
| `plan` | Primary | File edits and bash set to `ask`; read/analyze without modification |
| `general` | Subagent | Full tool access (except todo); multi-step parallel tasks and research |
| `explore` | Subagent | Fast, read-only codebase exploration |
| `compaction` | Hidden system | Automatic context compaction (not user-selectable) |
| `title` | Hidden system | Session title generation (not user-selectable) |
| `summary` | Hidden system | Session summarization (not user-selectable) |

**Orchestration mechanics**:
- Primary agents invoke subagents via an internal `task` tool (equivalent to Claude Code's `Agent`/`Task` tool)
- Subagents run in isolated child sessions with their own context windows
- Only the final result returns to the parent session context
- Sessions form a navigable tree (parent → children via keyboard shortcuts)
- `maxConcurrent` and `maxChildrenPerAgent` are not exposed in public docs (unlike OpenClaw); parallelism details are LOW confidence

**Tool restrictions per agent** are configured via the `tools` object (boolean flags or glob patterns like `"mymcp_*": false`) and the `permission` object (bash command patterns, skill access patterns, task invocation patterns).

**Model selection per agent** uses the `model` field with provider/model-id format. Subagents without an explicit model inherit from the invoking primary agent's model configuration.

#### Comparison to Claude Code Subagents

| Dimension | OpenCode | Claude Code |
|---|---|---|
| **Agent definition format** | YAML frontmatter in `.md` files or JSON config | YAML frontmatter in `.md` files |
| **Definition file location** | `.opencode/agents/`, `~/.config/opencode/agents/` | `.claude/agents/`, `~/.claude/agents/`, `<plugin>/agents/` |
| **Invocation by user** | `@agent-name task` in TUI | Agent name in conversation; or `/plugin:agent` |
| **Invocation by agent** | Automatic (description-matching) or internal `task` tool | `Agent(subagent_type="name", prompt="...")` tool |
| **Built-in primary agents** | Build (full), Plan (read/ask) | general-purpose, Bash, statusline-setup |
| **Built-in subagents** | General (full), Explore (read-only) | Explore (Haiku, read-only), Plan (read-only) |
| **Context isolation** | Full: own context window | Full: own context window |
| **Tool restriction** | Yes: `tools` map + `permission` block | Yes: `tools:` + `disallowedTools:` |
| **Model override** | Yes: `model:` field per agent | Yes: `model:` field per agent |
| **Skills injection into agent** | No (agents use the skill tool independently) | Yes: `skills:` field pre-loads skill content |
| **Subagent nesting** | Not documented (LOW confidence) | No — hard constraint (0 depth) |
| **Lifecycle hooks** | Not per-agent; global plugin hooks only | Yes: `PreToolUse`, `PostToolUse`, `Stop` in agent frontmatter |
| **Persistent memory** | Not documented | Yes: `memory: user/project/local` |
| **Session resume** | Not documented | Yes: by agent ID from transcript |
| **Workflow pseudocode in body** | No (natural language system prompt) | No (agent `.md` body is system prompt) |
| **Plugin namespace inheritance** | No formal namespacing | Yes: `plugin:agent-name` |

The most significant gap between OpenCode and Claude Code agents: OpenCode has no equivalent to Claude Code's `skills:` injection field (which pre-loads specific skill content into a subagent's context at startup), no equivalent to subagent lifecycle hooks (`PreToolUse`, `PostToolUse`), and no formal plugin namespace system for agents. These are Claude Code-specific capabilities with no OpenCode parallel.

The most significant advantage OpenCode has: the `@mention` syntax is more discoverable for users (autocomplete in TUI) compared to Claude Code where users must know agent names in advance.

---

## 11. Conclusion & Migration Guide for cc-agents

### 11.1 Key Findings Summary

This research compared 7 AI coding agent platforms across three dimensions: skill definition, slash command systems, and subagent/agent definition.

**Universal truths (apply to all 7 platforms):**

1. **agentskills.io is the de facto standard.** All 7 platforms implement the `SKILL.md` format with `name` + `description` YAML frontmatter. A skill with only these two fields works everywhere.
2. **The `description` field is the trigger.** Write it as a trigger specification — what + when + keywords — in third person. Never put "when to use" logic in the body.
3. **Progressive disclosure is universal.** Three tiers: catalog (startup) → body (on activation) → resources (on demand). Keep SKILL.md under 500 lines.
4. **Skills and commands are architecturally separate** on all platforms, despite using the same file format. The "passive auto-trigger" (skill) vs "active explicit invocation" (command) distinction matters for design.
5. **No cross-platform agent definition standard exists.** Unlike skills, there is no `AGENT.md` open standard. Each platform has its own agent/subagent system.

**Platform-specific critical facts:**

| Platform | Most Unique Feature | Key Compatibility Risk |
|---|---|---|
| **Claude Code** | `context: fork` subagent execution, `!`cmd`` injection, plugin namespacing, `skills:` injection in agents | CC-specific frontmatter ignored (LOW risk) or breaks (Codex) |
| **Codex** | `agents/openai.yaml` UI chips + dependency declarations | `name` required; VS Code lints unknown frontmatter (cosmetic only) |
| **Gemini CLI** | Dual system: SKILL.md + separate `.gemini/commands/*.toml`; `activate_skill` tool | Issue #15895: `allowed-tools`, `metadata`, `compatibility` parsed but ignored |
| **Google Antigravity** | Agent-first IDE; `@skill-name` implicit invocation; `.agent/skills/` path | Minimal public documentation; specs inferred |
| **OpenClaw** | `metadata.openclaw.requires` load-time binary/env gating; chat-surface slash commands; ACP multi-agent orchestration | Proprietary extensions; pi-mono as embedded runtime |
| **pi-mono** | Deliberate single-agent design; `/skill:name` colon syntax; `.agents/skills/` cross-client path | No subagent mechanism; no invocation control at frontmatter level |
| **OpenCode** | Strictest `name` validation (must match dir name); true lazy loading; dual agent format (JSON config OR `.md`); `@mention` TUI autocomplete | No `skills:` injection into subagents; no lifecycle hooks per agent |

### 11.2 Migration Guide: Converting cc-agents to Cross-Platform Skills

The cc-agents repository (`github.com/robinmin/cc-agents`) contains skills authored for Claude Code with Claude Code-specific extensions. To make them cross-platform:

#### Step 1: Audit Existing Skills

For each skill in `plugins/*/skills/`:
```bash
# Check for Claude Code-specific frontmatter
grep -r "context:\|agent:\|disable-model-invocation:\|user-invocable:\|hooks:\|argument-hint:\|model:" plugins/*/skills/*/SKILL.md

# Check for dynamic injection syntax
grep -r '!`' plugins/*/skills/*/SKILL.md

# Check for argument substitutions
grep -r '\$ARGUMENTS\|\${CLAUDE' plugins/*/skills/*/SKILL.md
```

#### Step 2: Classify Each Skill

| Skill Type | Cross-Platform Risk | Action |
|---|---|---|
| Pure natural language body, standard frontmatter | **None** | Ready as-is |
| Uses `context: fork` or `agent:` | **LOW** — ignored by others | Keep; document as CC-specific |
| Uses `disable-model-invocation` or `user-invocable` | **LOW** — ignored by others | Keep; OpenClaw also supports |
| Uses `!`cmd`` injection | **MEDIUM** — appears as literal text | Remove or wrap in CC-only section |
| Uses `$ARGUMENTS` / `$N` substitutions | **LOW** — others use raw text | Document; no breaking effect |
| Uses `hooks:` field | **LOW** — ignored by others | Keep; Codex VS Code lints (cosmetic) |
| Missing explicit `name:` field | **MEDIUM** — Codex/OpenCode require it | Add explicit `name:` |
| Uses plugin namespace `plugin:skill-name` | **LOW** — only CC understands it | Keep; other platforms use flat names |

#### Step 3: Create a Portable Base

Add these two lines to any SKILL.md missing them:
```yaml
---
name: skill-name-matching-directory   # ← Required for Codex and OpenCode
description: [Comprehensive trigger text...]
# Claude Code extensions below — safely ignored by other platforms:
context: fork
agent: Explore
---
```

The CC-specific fields (`context`, `agent`, `disable-model-invocation`, etc.) are **safely ignored** at runtime by Codex, Gemini CLI, OpenClaw, pi-mono, and OpenCode. The only risk is Codex's VS Code extension emitting lint warnings (cosmetic only, does not affect runtime).

#### Step 4: Add Codex/OpenCode UX Enhancement (Optional)

For skills you want to work well in Codex:
```bash
# Use the codex skill-creator to generate agents/openai.yaml
scripts/generate_openai_yaml.py ./plugins/rd2/skills/my-skill \
  --interface display_name="My Skill" short_description="Brief description"
```

For OpenCode, ensure `name` matches directory name exactly (OpenCode enforces this strictly, unlike Claude Code).

#### Step 5: Add `.agents/skills/` Discovery Path

OpenCode, pi-mono, and the agentskills.io spec recommend `.agents/skills/` as a cross-client discovery path. Consider adding symlinks or dual publishing:
```bash
mkdir -p .agents/skills
# Symlink individual skills
ln -s ../../plugins/rd2/skills/my-skill .agents/skills/rd2-my-skill
```

#### Step 6: Validate

```bash
# Validate against agentskills.io standard
skills-ref validate ./plugins/rd2/skills/my-skill

# Validate name matches directory (for OpenCode/Codex strict mode)
for dir in plugins/*/skills/*/; do
  name=$(grep '^name:' "$dir/SKILL.md" | cut -d' ' -f2 | tr -d '"')
  dirname=$(basename "$dir")
  if [ "$name" != "$dirname" ] && [ -n "$name" ]; then
    echo "Name mismatch: $dir → frontmatter='$name' dir='$dirname'"
  fi
done
```

### 11.3 Slash Command Compatibility

Claude Code's old-style commands (`.claude/commands/*.md`, `plugins/*/commands/*.md`) have **no direct equivalent** on other platforms. They are Claude Code-specific. When migrating:

| Claude Code Feature | Best Cross-Platform Equivalent |
|---|---|
| Old-style command body with `Task()` / `Skill()` pseudocode | Convert to a SKILL.md with natural language instructions |
| `/plugin:command-name` invocation | Use SKILL.md with `user-invocable: true` + set `name` to desired command name |
| `argument-hint:` autocomplete | Keep for CC; ignored by others |
| Commands in `plugins/*/commands/` | Skills work cross-platform; commands are CC-only |

For users wanting Codex UI chip invocation: set `policy.allow_implicit_invocation: false` in `agents/openai.yaml` to get explicit-only behavior equivalent to `disable-model-invocation: true`.

### 11.4 Subagent/Agent Portability

**There is no cross-platform agent definition standard.** Claude Code subagents (`.claude/agents/*.md`) are Claude Code-specific. No migration path exists for direct equivalents:

| Claude Code Agent Feature | Cross-Platform Status |
|---|---|
| `plugins/*/agents/*.md` subagent files | CC-only; not portable |
| `skills:` injection field | CC-only capability |
| `PreToolUse`/`PostToolUse` hooks in agents | CC-only capability |
| `plugin:agent-name` namespace | CC-only; OpenCode has no equivalent |
| `context: fork` on SKILL.md | CC-only; ignored by others |

**Recommendation**: Keep Claude Code subagents as Claude Code-specific. For cross-platform agent orchestration, use the agentskills.io SKILL.md format with natural language instructions that other agents can load and follow — even without formal subagent invocation.

### 11.5 Recommended cc-agents Strategy

1. **Skill layer**: Keep `SKILL.md` files as-is. Add explicit `name:` fields where missing. CC-specific extensions are harmless on other platforms.

2. **Command layer**: Continue using old-style commands for Claude Code. For cross-platform scenarios, create parallel SKILL.md counterparts in `.agents/skills/`.

3. **Agent layer**: Continue using Claude Code agent files. Accept that subagent orchestration is Claude Code-specific. Design skill bodies to work as standalone instructions when no subagent system is available.

4. **New skills**: Author using the portable base template (Section 5). Add Claude Code extensions as needed — they remain harmless to others.

5. **Codex/OpenCode readiness**: Ensure `name:` matches directory name in all SKILL.md frontmatter. This is the single most impactful change for cross-platform compatibility.

---


