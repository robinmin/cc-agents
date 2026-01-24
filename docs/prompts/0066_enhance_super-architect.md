---
name: enhance super-architect
description: <prompt description>
status: Done
created_at: 2026-01-24 09:11:27
updated_at: 2026-01-24 14:00:00
---

## 0066. enhance super-architect

### Background

To enable we can arm our super-architect as a comprehensive full-stack senior architect, we need to create and fine-tune the following Agents Skills first:

- backend-architect
- frontend-architect
- cloud-architect

There also are several related to them but in different format and purpose in current project:

- @vendors/claude-code-subagents-collection/subagents/backend-architect.md
- @vendors/claude-code-subagents-collection/subagents/cloud-architect.md
- @vendors/everything-claude-code/agents/architect.md
- @vendors/claude-code-subagents-collection/subagents/architect-review.md
- @vendors/claude-code-subagents-collection/commands/architecture-review.md
- @vendors/claude-code-subagents-collection/commands/create-architecture-documentation.md
- @vendors/claude-code-subagents-collection/commands/architecture-scenario-explorer.md

Despite there are not in different format, we can still use them as reference and extract relevant information to create above Agents Skills.

I already used `rd2:skill-expert` to create two dummy Agents Skills for them:

- backend-architect: plugins/rd2/skills/backend-architect
- frontend-architect: plugins/rd2/skills/frontend-architect
- cloud-architect: plugins/rd2/skills/cloud-architect

### Requirements / Objectives

- Extract relevant information from these existing files to create/update the relevant Agents Skills.
- For each of these three Agents Skills:
  - Invoke `rd:super-researcher` to research and extract relevant information from web resources to merge into current Agents Skills.
  - Invoke `rd2:skill-expert` and `rd2:skill-doctor` to evaluate and fine-tune current Agents Skills as a powerful and reliable Agents Skills.
- Following **Fat Skill, Thin wrapper** principles, ensure `@plugins/rd2/agents/super-architect.md` leverages all of these 3 Agents Skills `rd2:backend-architect`, `rd2:frontend-architect`, and `rd2:cloud-architect`.
- Invoke `rd2:agent-expert` and `rd2:agent-doctor` to evaluate and fine-tune this new subagent in `@plugins/rd2/agents/super-architect.md` as a powerful and reliable subagent.

### Solutions / Goals

### References

- @vendors/claude-code-subagents-collection/subagents/backend-architect.md
- @vendors/claude-code-subagents-collection/subagents/cloud-architect.md
- @vendors/everything-claude-code/agents/architect.md
- @vendors/claude-code-subagents-collection/subagents/architect-review.md
- @vendors/claude-code-subagents-collection/commands/architecture-review.md
- @vendors/claude-code-subagents-collection/commands/create-architecture-documentation.md
- @vendors/claude-code-subagents-collection/commands/architecture-scenario-explorer.md
