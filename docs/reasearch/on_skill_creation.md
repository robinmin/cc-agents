---
name: research on skill creation
description: Task: research on skill creation
status: Done
created_at: 2026-03-12 13:41:50
updated_at: 2026-03-13 00:00:00
---

## research on skill creation

### Background
Due to the following things changed, we need to research how to create the same skills for all of these code agents and how to convert [my existing claude code plugins](https://github.com/robinmin/cc-agents) to adaptive these changes:

- Anthropic releasesd its Claude Code Agent Skills 2.0 recently via the new Skill Creator
- Codex already supports programmatic skill creation
- I have lots of existing agent skills need to enable with both claude code and codex and gemini and etc.

You should conduct research based on to compare the following two skill creators:
- [Claude Code Skill Creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator)
- [Codex Skill Creator](https://github.com/openai/codex/tree/main/codex-rs/skills/src/assets/samples/skill-creator)


### Requirements / Objectives
- And you also need to compare both of them with the open standard of [Agent Skills](https://agentskills.io/home).
- You should find out relevant best practices and standards for skill creation with the SOTA tools and techniques.

### Solutions / Goals

Research completed 2026-03-13. **Final consolidated reports:**
- English: `docs/reasearch/how_to_write_skills_en.md`
- Chinese: `docs/reasearch/how_to_write_skills_cn.md`
- Japanese: `docs/reasearch/how_to_write_skills_ja.md`

The report covers 7 platforms (Claude Code, Codex, Gemini CLI, Google Antigravity, OpenClaw, pi-mono, OpenCode) across three dimensions:
- Skill definition format comparison (Sections 1–8)
- Slash command / user-invocable action comparison (Section 9)
- Subagent / agent definition comparison (Section 10)
- Migration guide for cc-agents (Section 11)

**Key findings:**

1. **The agentskills.io open standard is the universal format**: Originally created by Anthropic, now adopted by 30+ agents (Claude Code, Codex, Gemini CLI, GitHub Copilot, VS Code, Cursor, Roo Code, etc.). The base format — `SKILL.md` with `name` + `description` YAML frontmatter and a Markdown body — is fully portable across all platforms.

2. **All three systems share the same core**: `SKILL.md` in a directory with optional `scripts/`, `references/`, `assets/`. Only `name` (max 64 chars, lowercase-hyphen) and `description` (max 1024 chars) are required.

3. **Platform extensions are additive**:
   - Claude Code adds: `disable-model-invocation`, `user-invocable`, `context: fork`, `agent:`, `argument-hint`, `model`, `hooks`, `$ARGUMENTS` substitutions, `!`cmd`` dynamic injection
   - Codex adds: `agents/openai.yaml` (UI metadata: display_name, default_prompt, icon; invocation policy; MCP dependencies), strict frontmatter validation (unknown fields rejected), `scripts/init_skill.py` scaffolding

4. **Cross-platform conversion is straightforward**:
   - Ensure explicit `name:` matching directory name (Codex requires this)
   - Remove or document Claude Code-specific frontmatter fields (Codex rejects unknowns)
   - Move `!`cmd`` injection blocks (not supported by other agents)
   - Add `agents/openai.yaml` for better Codex UX
   - Validate with `skills-ref validate` (agentskills.io tool)

5. **Progressive disclosure is universal**: All platforms use 3-tier loading: metadata (~100 tokens at startup) → SKILL.md body (on trigger) → supporting files (on demand). Keep SKILL.md under 500 lines.

6. **The `description` field is the trigger**: Write it as a comprehensive trigger specification (third person, what + when + keywords). Never put "when to use" logic in the body — the body only loads AFTER triggering.

**Portable SKILL.md base template:**
```markdown
---
name: [lowercase-hyphen-name]
description: [Third person. What + when + keywords. Max 1024 chars]
license: Apache-2.0
metadata:
  author: your-org
  version: "1.0"
---

# [Skill Name]

## Workflow

1. [Step one]
2. [Step two]

## Additional resources

- For [topic]: see [references/topic.md](references/topic.md)
```

### References
- [Claude Code Agent Skills 2.0: From Custom Instructions to Programmable Agents](https://medium.com/@richardhightower/claude-code-agent-skills-2-0-from-custom-instructions-to-programmable-agents-ab6e4563c176)
- [Agent Skills Open Standard](https://agentskills.io/home)
- [agentskills.io Specification](https://agentskills.io/specification)
- [agentskills.io Client Implementation Guide](https://agentskills.io/client-implementation/adding-skills-support)
- [Claude API Agent Skills Overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Claude API Agent Skills Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Claude Skills 2.0 for Product Designers](https://uxplanet.org/claude-skills-2-0-for-product-designers-a86f4518b3ba)
- [Claude Code Skill Creator (Anthropic)](https://github.com/anthropics/skills/tree/main/skills/skill-creator)
- [Codex Skill Creator (OpenAI)](https://github.com/openai/codex/tree/main/codex-rs/skills/src/assets/samples/skill-creator)
- [OpenAI Skills GitHub Repository](https://github.com/openai/skills)
- [Codex Skills Documentation](https://developers.openai.com/codex/skills/)
- [SKILL.md Format Specification for Codex via DeepWiki](https://deepwiki.com/openai/skills/8.1-skill.md-format-specification)
- [agentskills/agentskills GitHub (validation library)](https://github.com/agentskills/agentskills)
