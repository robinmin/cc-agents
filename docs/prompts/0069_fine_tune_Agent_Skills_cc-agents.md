---
name: fine tune Agent Skills cc-agents
description: Task: fine tune Agent Skills cc-agents
status: Done
created_at: 2026-01-24 20:29:04
updated_at: 2026-01-24 20:29:04
---

## 0069. fine tune Agent Skills cc-agents

### Background

According to previous experience, I added a new section "Hybrid Approach for Complex Commands / Subagents" into `.claude/CLAUDE.md`. To ensure it will be treated as a common rule to customize and fine-tune these complex slash commands or subagents, I need your help to absorb this as a concise and precise rule into `plugins/rd2/skills/cc-agents/SKILL.md`.

Additionally, I already prepared a additional reference file in `plugins/rd2/skills/cc-agents/references/ClaudeCodeBuilt-inTools.md`, which contains a comprehensive list of Claude Code built-in tools and their usage examples for reference. You can add a reference to this file in `plugins/rd2/skills/cc-agents/SKILL.md`.

Meanwhile, I downloaded the official plugin 'plugin-dev' into `vendors/claude-code/plugins/plugin-dev`. We can learn from it to improve our knowledge of how to develop and customize agents from the following resources:

- vendors/claude-code/plugins/plugin-dev/agents/agent-creator.md
- vendors/claude-code/plugins/plugin-dev/skills/agent-development

### Requirements / Objectives

- Extract the relevant information from the "Hybrid Approach for Complex Commands / Subagents" section in `.claude/CLAUDE.md` and incorporate it into `plugins/rd2/skills/cc-agents/SKILL.md`.

- Add reference to `plugins/rd2/skills/cc-agents/references/ClaudeCodeBuilt-inTools.md` in `plugins/rd2/skills/cc-agents/SKILL.md`.

- Review the contents of `vendors/claude-code/plugins/plugin-dev/skills/agent-development` to ensure all these valuable information are included in our Agent Skills in `plugins/rd2/skills/cc-agents`. In case of any conflicts, we will accept it to overwrite the existing content as they're from the official plugin 'plugin-dev'. Our goal is to ensure our Agent Skills `plugins/rd2/skills/cc-agents` is accurate and up-to-date and made it as a great Agent Skills.

- Invoke subagents `rd2:skill-expert` and `rd2:skill-doctor` to evaluate and fine tune this skill in `plugins/rd2/skills/cc-agents/`.

- With the same approach, we can extract the relevant valuable information from `vendors/claude-code/plugins/plugin-dev/agents/agent-creator.md` to `plugins/rd2/agents/agent-expert.md` and `plugins/rd2/agents/agent-doctor.md` if needed. The goal is also to ensure that the contents of these files are accurate and up-to-date and made both of them are great subagents.

- Update the following files(They are just the simple wrappers for `plugins/rd2/agents/agent-expert.md` and `plugins/rd2/agents/agent-doctor.md` as we just updated):
  - plugins/rd2/commands/agent-add.md
  - plugins/rd2/commands/agent-evaluate.md
  - plugins/rd2/commands/agent-refine.md

### Solutions / Goals

## Progress Updates

### 2026-01-25

**Completed:**
1. ✅ Extracted "Hybrid Approach for Complex Commands / Subagents" from .claude/CLAUDE.md and added to SKILL.md (lines 78-165)
2. ✅ Added References section to SKILL.md with link to ClaudeCodeBuilt-inTools.md
3. ✅ **Absorbed official plugin-dev content into cc-agents:**
   - `vendors/claude-code/plugins/plugin-dev/skills/agent-development/SKILL.md` → `plugins/rd2/skills/cc-agents/SKILL.md`
   - `vendors/claude-code/plugins/plugin-dev/agents/agent-creator.md` → `plugins/rd2/agents/agent-expert.md`
4. ✅ Verified agent-doctor.md properly delegates to cc-agents skill
5. ✅ Verified wrapper command files (agent-add.md, agent-evaluate.md, agent-refine.md) are thin wrappers

**Content Absorbed into SKILL.md:**
- Detailed Frontmatter Field Specification (name, description, model, color, tools)
- Identifier Validation Rules (3-50 chars, lowercase-hyphens, alphanumeric start/end)
- Description Format Documentation (10-5,000 chars, `<example>` block structure)
- System Prompt Validation (length and structure requirements)
- Agent Organization (directory structure and namespacing)
- Testing Guidance (triggering and system prompt testing)
- Complete Validation Checklist

**Content Absorbed into agent-expert.md:**
- Step 2: Create Identifier (detailed guidelines with examples)
- Step 7: Craft Triggering Examples (explicit `<example>` block format)
- Quality Standards (comprehensive quality requirements)
- Edge Cases (vague requests, conflicts, complex requirements, tool access, model selection)
- Enhanced Output Format (Configuration, File Created, How to Use sections)

**Task complete** - All official plugin-dev content has been absorbed into cc-agents skill and agents.

### References

- [](https://www.vtrivedy.com/posts/claudecode-tools-reference/)
