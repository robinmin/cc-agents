---
name: enhance super-designer
description: <prompt description>
status: Done
created_at: 2026-01-24 08:51:06
updated_at: 2026-01-24 09:27:38
---

## 0065. enhance super-designer

### Background

To enable we can arme our super-designer as a UI/UX designer, frontend developer, we need to prepare relevant Agents Skills for UI/UX designer and frontend developer.

There are 3 subagents files related to UI/UX designer and frontend developer in current project:

- @plugins/rd/agents/uiux-expert.md
- @plugins/rd/agents/frontend-expert.md
- @vendors/claude-code-subagents-collection/subagents/ui-ux-designer.md

Despite there are not in the Agents Skills format, we can still use them as reference and extract relevant information to create a comprehensive UI/UX designer and frontend developer Agents Skills.

I already used `rd2:skill-expert` to create two dummy Agents Skills for UI/UX designer(plugins/rd2/skills/ui-ux-design/) and frontend developer(plugins/rd2/skills/frontend-design/).

### Requirements / Objectives

- Extract relevant information from the subagents files to create a comprehensive UI/UX designer and frontend developer Agents Skills.
- Invoke `rd:super-researcher` to research and extract relevant information from web resources to enhance the UI/UX designer and frontend developer Agents Skills.
- Merge these extracted information with the existing UI/UX designer and frontend developer Agents Skills.
- Invoke `rd2:skill-expert` and `rd2:skill-doctor` to evaluate and fine-tune both of them as powerful and reliable Agents Skills.
- Following **Fat Skill, Thin wrapper** principles, ensure plugins/rd2/agents/super-designer.md leverages both the new Agents Skills `rd2:ui-ux-design` and `rd2:frontend-design`.
- Invoke `rd2:agent-expert` and `rd2:agent-doctor` to evaluate and fine-tune this new subagent in
  plugins/rd2/agents/super-designer.md as a powerful and reliable subagent.

### Solutions / Goals

### References

- @plugins/rd/agents/uiux-expert.md
- @plugins/rd/agents/frontend-expert.md
- @vendors/claude-code-subagents-collection/subagents/ui-ux-designer.md
