---
name: build new skills cc-agents
description: <prompt description>
status: Done
created_at: 2026-01-20 14:32:06
updated_at: 2026-01-20 15:34:00
phases:
  - id: "001"
    name: "Create cc-agents skill"
    description: "Create the new cc-agents skill in plugins/rd2/skills/cc-agents/ with skill-evaluate, skill-refine, and skill-add capabilities"
    status: Done
  - id: "002"
    name: "Create rd2 subagents"
    description: "Create rd2:agent-doctor and rd2:agent-expert subagents using the new cc-agents skill (Fat Skills, Thin Wrappers pattern)"
    status: Done
    depends_on: "001"
  - id: "003"
    name: "Create rd2 slash commands"
    description: "Create rd2:agent-add, rd2:agent-refine, and rd2:agent-evaluate slash commands as thin wrappers around the cc-agents skill"
    status: Done
    depends_on: "001"
  - id: "004"
    name: "Improve existing rd2 subagents"
    description: "Apply the new rd2:agent-doctor and rd2:agent-expert to improve skill-doctor and skill-expert subagents"
    status: Done
    depends_on: "002"
impl_progress:
  phase_001: completed
  phase_002: completed
  phase_003: completed
  phase_004: completed
---

## 0039. build new skills cc-agents

### Background

We already have two subagents in plugin `rd` which located in files @plugins/rd/agents/agent-doctor.md and @plugins/rd/agents/agent-expert.md. That means we already have the knowledge of how to build a subagent. We can use this knowledge to build a new subagent. Meanwhile, we also have another slash command in `@plugins/rd/commands/agent-meta.md` which does more or less the same thing as the subagents(It may be not that mature due to the lack of maintenance).

To ensure we can leverage these knowledge everywhere in the same way, we'd better to leverage the following new slash commands to extract these knowledge into a new Skills into folder `@plugins/rd2/skills/cc-agents/`.

- `rd2:skill-evaluate`: Comprehensive security and quality assessment for Claude Code Agent Skill.
- `rd2:skill-refine`: Improve skill quality using cc-skills best practices and relevant domain knowledge.
- `rd2:skill-add`: Create a new Claude Code Agent Skill with templates and best practices

### Requirements / Objectives

#### Build new skills cc-agents

To ensure we can leverage these knowledge everywhere in the same way, we'd better to leverage the following new slash commands to extract these knowledge into a new Skills into folder `@plugins/rd2/skills/cc-agents/`.

- `rd2:skill-evaluate`: Comprehensive security and quality assessment for Claude Code Agent Skill.
- `rd2:skill-refine`: Improve skill quality using cc-skills best practices and relevant domain knowledge.
- `rd2:skill-add`: Create a new Claude Code Agent Skill with templates and best practices

#### Add relevant subagents in `rd2`

As original plugin `rd`, we also need to provide two subagents in this same way:

- `rd2:agent-doctor`: @plugins/rd2/agents/agent-doctor.md responses for evaluating a specified subagent with the new skill `cc-agents`.
- `rd2:agent-expert`: @plugins/rd2/agents/agent-expert.md responses for creating and refining a specific subagent with the new skill `cc-agents`.

But they will follow different approaches: they will be built using the new skills `cc-agents`, and strictly follow the **Fat Skills, Thin Wrappers** rules. They just provide a simple wrapper around the skill for LLMs.

#### Add relevant slash commands in `rd2`

Same as the subagents, we also need to provide two slash commands in this same way:

- `rd2:agent-add`: @plugins/rd2/commands/agent-add.md responses for adding a new subagent with the new skill `cc-agents`.
- `rd2:agent-refine`: @plugins/rd2/commands/agent-refine.md responses for refining a specified subagent with the new skill `cc-agents`.
- `rd2:agent-evaluate`: @plugins/rd2/commands/agent-evaluate.md responses for evaluating a specified subagent with the new skill `cc-agents`.

Again, they also just another simple wrapper around the skill for humans.

#### Apply this new subagents `rd2:agent-doctor` and `rd2:agent-expert` to the following subagents to improve their quality, security and verify their correctness:

- @plugins/rd2/agents/skill-doctor.md
- @plugins/rd2/agents/skill-expert.md

### Solutions / Goals

### Execution Plan

#### Phase 001: Create cc-agents skill
- [ ] Create skill directory: `plugins/rd2/skills/cc-agents/`
- [ ] Create SKILL.md with proper frontmatter and structure
- [ ] Create references/ directory with documentation
- [ ] Create assets/ directory with templates
- [ ] Implement skill-evaluate capability (security and quality assessment)
- [ ] Implement skill-refine capability (improve using cc-skills best practices)
- [ ] Implement skill-add capability (create new skills with templates)
- [ ] Follow cc-skills patterns for structure and evaluation

#### Phase 002: Create rd2 subagents
- [ ] Create `plugins/rd2/agents/agent-doctor.md` (thin wrapper around cc-agents skill)
- [ ] Create `plugins/rd2/agents/agent-expert.md` (thin wrapper around cc-agents skill)
- [ ] Follow "Fat Skills, Thin Wrappers" pattern
- [ ] Ensure subagents use the new cc-agents skill
- [ ] Validate subagent structure

#### Phase 003: Create rd2 slash commands
- [ ] Create `plugins/rd2/commands/agent-add.md`
- [ ] Create `plugins/rd2/commands/agent-refine.md`
- [ ] Create `plugins/rd2/commands/agent-evaluate.md`
- [ ] Ensure commands are thin wrappers around cc-agents skill
- [ ] Validate command structure

#### Phase 004: Improve existing rd2 subagents
- [ ] Apply rd2:agent-doctor to evaluate `plugins/rd2/agents/skill-doctor.md`
- [ ] Apply rd2:agent-expert to refine `plugins/rd2/agents/skill-doctor.md`
- [ ] Apply rd2:agent-doctor to evaluate `plugins/rd2/agents/skill-expert.md`
- [ ] Apply rd2:agent-expert to refine `plugins/rd2/agents/skill-expert.md`
- [ ] Verify improvements and validate correctness

### References

- Existing agents: `plugins/rd/agents/agent-doctor.md`, `plugins/rd/agents/agent-expert.md`
- Existing rd2 agents: `plugins/rd2/agents/skill-doctor.md`, `plugins/rd2/agents/skill-expert.md`
- cc-skills meta-skill: `plugins/rd2/skills/cc-skills/SKILL.md`
