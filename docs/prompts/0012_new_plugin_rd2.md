---
name: new plugin rd2 - cc-skills and skill-expert and skill-dockor
description: Create rd2 plugin with fat-skills/thin-wrappers architecture following 2025 best practices
status: Done
created_at: 2026-01-19 14:45:57
updated_at: 2026-01-20 08:47:20
completed_at: 2026-01-19
---

## 0012. new plugin rd2 - cc-skills and skill-expert and skill-dockor

### Background

#### Background

After several months of development, the team has identified a need for a new plugin that can handle complex data processing tasks with a more stable and efficient approach. This plugin will be designed as the next generation of our current plugins `rd` which is located in the `plugins/rd` folder.

Meanwhile, we also take this as the opportunity to review and refactor our existing plugins to ensure they are optimized for performance and maintainability with the same or higher standards.

There are few typical pitfalls in current plugin:

- Not following the best practices for agentic coding, or the best practices already obsolete due to the rapid evolution of **agentic coding**
- Some of them against the `precise and concise` rule or `single responsibility` principle
- Some components are not stable and reliable
- Some components are not used ever
- The original understanding of each part of the component is not correct. So far, as `AGENTS.md` and `Agent Skills` become open standards, we need to ensure that our plugins are aligned with these standards.

#### The responsibility of each component

- `Agents` / `Subagent`: The agent is responsible for managing the overall flow of the plugin. It should be responsible for initializing the plugin, handling user input, and coordinating the execution of the plugin's components. => `How & when AI decided to call Skills`
- `Commands` / `Slash Commands`: The command is responsible for handling user input and triggering the execution of the plugin's components. => `How & when human decided to call Skills`
- `Skills`: The skill is responsible for performing a specific task within the plugin. It should be responsible for handling user input, performing the task, and returning the result to the agent. => `The core of doing something as planned`

So, we **MUST** follow the following rules when developing new plugins:

- The core is `Skills`, and `Commands` and `Agents` are the simple wrapers for `Skills` towards different audiences; Fat `Skills` and Thin `Commands` and `Agents`;
- Every thing should be `precise and concise`

#### Source code Reference

- `@plugins/rd/commands/skill-add.md`: Slash command for adding a new skill
- `@plugins/rd/commands/skill-evaluate.md`: Slash command for evaluating a skill
- `@plugins/rd/commands/skill-refine.md`: Slash command for refining a skill
- `@plugins/rd/skills/cc-skills`: Collection of skills for Claude Code Plugins development
- `vendors/skills/skills/skill-creator`: Source code of skill creator from anthropic for claude itself.

### Requirements / Objectives

#### Information Gathering

- Before taking any action on the following tasks, you should have a comprehensive code review on section `Source code Reference` mentioned files to understand the current state of the plugin and identify any potential issues or areas for improvement.

- Use web search tools to gather relevant best practices of Agent Skills / Claude Code Plugins development information, especially for the following:
  - [Claude Docs: Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
  - [Claude Code: Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices)

- Use mcp ref to check with the official documentation for the relevant information, such as the official documentation for Agent Skills and Claude Code Plugins development, not limited to the following:
  - [Claude Code Docs: Agent Skills](https://code.claude.com/docs/en/skills)
  - [Claude Docs: Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
  - [Claude Docs: Get started with Agent Skills in the API](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/quickstart)
  - [Claude Docs: Using Agent Skills with the API](https://platform.claude.com/docs/en/build-with-claude/skills-guide)
  - [Agent Skills: Overview](https://agentskills.io/home)
  - [Agent Skills: What are Skills](https://agentskills.io/what-are-skills)
  - [Agent Skills: Specification](https://agentskills.io/specification)
  - [Agent Skills: Integrate skills into your agent](https://agentskills.io/integrate-skills)

#### Requirements Details

- `@plugins/rd2/skills/cc-skills` is almost the copy of official skills `skill-creator` in `@vendors/skills/skills/skill-creator`, we need to based on it, to absorb the good parts we've developed in `@plugins/rd/skills/cc-skills` to make it more concise and reliable meta skills(Except the scripts in `@plugins/rd2/skills/cc-skills/scripts`, we will fix it separately). It's the core of all parts of `@plugins/rd2/skills/cc-skills`, you need to focus on:
  - The specification of the skill
  - How to implement the skill (You need to absorb the relevant information from `@plugins/rd/commands/skill-add.md` and `@plugins/rd2/commands/skill-refine.md.txt`)
  - How to evaluate the skill (You need to absorb the relevant information from `@plugins/rd2/commands/skill-evaluate.md.txt`)
  - what's the best practices for skill development
  - How to test the skill
  - etc.

As the skill itself already has so massive change now, so we can not rely on the old slash commands to create or refine it. We need to build the new foundation to do these things with this new skill.

- `@plugins/rd2/skills/cc-skills/scripts/skills.py`: Universal utility for skill development. You need to consolidate the following scripts from official skills `skill-creator`, including:
  - `@vendors/skills/skills/skill-creator/scripts/init_skill.py`
  - `@vendors/skills/skills/skill-creator/scripts/package_skill.py`
  - `@vendors/skills/skills/skill-creator/scripts/quick_validate.py`

- Based on this new skill in `@plugins/rd2/skills/cc-skills`, customize the same slash command as we'd done in plugin `rd`, including(the key is leveraging skill `@plugins/rd2/skills/cc-skills` and script tool `plugins/rd2/skills/cc-skills/scripts/skills.py` to implement them instead of crafting them from scratch like plugin `rd`):
  - `@plugins/rd2/commands/skill-add.md`
  - `@plugins/rd2/commands/skill-evaluate.md`
  - `@plugins/rd2/commands/skill-refine.md`

- Add two subagents to do the almost same things as above slash commands:
  - `@plugins/rd2/agents/skill-expert.md`: create or optimize a skill with meta skill `@plugins/rd2/skills/cc-skills` and user provided domain expierces. During the creation process, the subagent will use mcp ref and web search/ web fetch tools together to find relevant official web pages and relevant specifications, expierences, and best practices and typical pitfalls. This will make the created skill more powerfuk -- initialization with domain knowledge and experience.
  - `@plugins/rd2/agents/skill-doctor.md`: Call the evaluation function of skill `@plugins/rd2/skills/cc-skills` to evaluate a skill and provide evaluation score as we'd done in plugin `rd`.

Both of these two new subagents will be generated by current subagent `rd:agent-expert`, and be evaluated by subagent `rd:agent-doctor` to ensure their quality and effectiveness.

### Solutions / Goals

#### Completed Deliverables

1. **Consolidated skills.py** (`plugins/rd2/skills/cc-skills/scripts/skills.py`)
   - Merged three official scripts: init_skill.py, package_skill.py, quick_validate.py
   - Unified CLI interface with subcommands: `init`, `validate`, `package`
   - Added comprehensive validation including TODO placeholder detection
   - Supports skill lifecycle: initialization -> development -> validation -> packaging

2. **skill-expert.md Agent** (`plugins/rd2/agents/skill-expert.md`)
   - Creates and optimizes skills with domain knowledge
   - Integrates research tools (ref, WebSearch, WebFetch)
   - Follows fat-skills/thin-wrappers architecture
   - References cc-skills for best practices

3. **skill-doctor.md Agent** (`plugins/rd2/agents/skill-doctor.md`)
   - Comprehensive quality evaluation (7 dimensions, weighted scoring)
   - Security assessment with risk categorization
   - Anti-pattern detection
   - Generates detailed reports with recommendations
   - Read-only guarantee (no modifications)

4. **Thin Wrapper Commands**
   - `skill-add.md` - Create new skills (uses cc-skills + scripts/skills.py)
   - `skill-evaluate.md` - Quality assessment (uses cc-skills)
   - `skill-refine.md` - Improvement workflow (uses cc-skills)

5. **Updated plugin.json**
   - Corrected skills list to reference `cc-skills` (the fat skill)
   - Updated author field

#### Architecture Summary

```
plugins/rd2/
├── .claude/plugin.json           # Lists cc-skills as the skill
├── agents/
│   ├── skill-expert.md           # Create/optimize skills
│   └── skill-doctor.md           # Evaluate skills
├── commands/
│   ├── skill-add.md              # Thin wrapper -> cc-skills
│   ├── skill-evaluate.md         # Thin wrapper -> cc-skills
│   └── skill-refine.md           # Thin wrapper -> cc-skills
└── skills/cc-skills/
    ├── SKILL.md                  # Core skill (from official skill-creator)
    ├── scripts/skills.py         # Consolidated utility (init/validate/package)
    └── references/
        ├── output-patterns.md    # Template patterns
        └── workflows.md          # Workflow patterns
```

#### Key Design Decisions

1. **Fat Skills, Thin Wrappers**: cc-skills contains all logic; commands are minimal wrappers
2. **Consolidated Script**: Single skills.py replaces three separate scripts
3. **Agents Reference Skill**: skill-expert and skill-doctor both use cc-skills
4. **Best Practices Aligned**: Follows 2026 Claude Code Agent Skills documentation

### References

- [Official Skills repository](https://github.com/anthropics/skills)
- [Claude Docs: Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Claude Code: Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Claude Code Docs: Agent Skills](https://code.claude.com/docs/en/skills)
- [Claude Docs: Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Claude Docs: Get started with Agent Skills in the API](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/quickstart)
- [Claude Docs: Using Agent Skills with the API](https://platform.claude.com/docs/en/build-with-claude/skills-guide)
- [Agent Skills: Overview](https://agentskills.io/home)
- [Agent Skills: What are Skills](https://agentskills.io/what-are-skills)
- [Agent Skills: Specification](https://agentskills.io/specification)
- [Agent Skills: Integrate skills into your agent](https://agentskills.io/integrate-skills)
