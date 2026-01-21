---
name: fine tune the project structure
description: Align project structure with Claude Code 2026 plugin best practices
status: Done
created_at: 2026-01-08 16:07:28
updated_at: 2026-01-21 09:48:09
---

## 0002. fine tune the project structure

### Background

As the time passint by, this project cumulated somethings need to be enhanced. Meanwhile, some official things also has been changed. For examle, there was no `plugin.json` things during the project beginning. Now we need to support it.

In the section "References", I add 5 web pages from claude code official website. You need to fetch their contents, and follow them to fine tune current project to make it as a good claude code plugin.

### Requirements / Objectives

All the following things need to be done based on a comprehensive code review on curren codebase.

- Remove sample plugin `hello` in folder @plugins/hello.
- Rename @plugins/rd/scripts/prompts.sh as @plugins/rd/scripts/tasks.sh: In practice, we already add alias tasks to point it to this script, so we'd better to aliagn all of them.
- Enhance the strunctures and contents for the following files to adapt with the most latest format as of 2026 begenning: - @.claude-plugin/marketplace.json - @plugins/rd/plugin.json - @plugins/wt/plugin.json

- Fine tune the following key slash commands based these official web contents you already loaded: - @plugins/rd/commands/task-run.md - @plugins/rd/commands/task-fixall.md - @plugins/rd/commands/task-spec.md - @plugins/rd/commands/agent-meta.md - @plugins/rd/commands/skill-add.md - @plugins/rd/commands/skill-evaluate.md - @plugins/rd/commands/skill-refine.md

### Solutions / Goals

#### Architecture Overview

This task modernizes the cc-agents project to comply with Claude Code 2026 plugin specifications. Key changes:

1. **Remove deprecated sample plugin** - The `hello` plugin is no longer needed
2. **Align script naming** - Rename `prompts.sh` → `tasks.sh` to match the `tasks` alias
3. **Update plugin.json format** - Add required fields per 2026 spec: `commands`, `skills`, `agents` auto-discovery
4. **Update marketplace.json** - Align with plugin discovery format
5. **Fine-tune slash commands** - Add proper frontmatter fields per official spec

#### Key Changes Based on Official Documentation

**From Subagents Docs:**

- Agent frontmatter requires: `name`, `description` (with `<example>` blocks), `model`, `color`
- Optional: `tools`, `permissionMode`, `skills`, `hooks`
- Description should include triggering conditions and 2-4 example blocks

**From Skills Docs:**

- SKILL.md frontmatter: `name` (max 64 chars, lowercase-hyphens), `description` (max 1024 chars)
- Use third-person in descriptions
- Keep SKILL.md under 500 lines, use progressive disclosure

**From Skill Best Practices:**

- Be concise - only add context Claude doesn't already have
- Use evaluation-first approach
- Avoid deeply nested references (one level deep from SKILL.md)
- Include MCP tool references with fully qualified names

**plugin.json 2026 Format:**

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": { "name": "...", "email": "..." },
  "homepage": "https://...",
  "repository": "https://github.com/...",
  "license": "MIT",
  "keywords": ["..."],
  "commands": "./commands",
  "skills": "./skills",
  "agents": "./agents"
}
```

**Slash Command Frontmatter:**

```yaml
---
description: Brief action-oriented description (≤80 chars ideal)
argument-hint: <required-arg> [optional-arg]
allowed-tools: Tool1, Tool2
---

```

#### Implementation Plan

##### Phase 1: Cleanup & Rename [Complexity: Low]

**Goal**: Remove deprecated content and align naming

- [ ] Delete `plugins/hello/` directory entirely
- [ ] Rename `plugins/rd/scripts/prompts.sh` → `plugins/rd/scripts/tasks.sh`
- [ ] Update any internal references to the script name

**Deliverable**: Clean project structure with aligned naming

##### Phase 2: Update plugin.json Files [Complexity: Medium]

**Goal**: Align with 2026 plugin.json specification

**2.1 Update `plugins/rd/plugin.json`:**

```json
{
  "name": "rd",
  "version": "1.2.0",
  "description": "Rapid Development: Systematic 10-stage TDD workflow, task management, skill development, and code quality tools",
  "author": {
    "name": "Robin Min",
    "email": "minlongbing@gmail.com"
  },
  "homepage": "https://github.com/user/cc-agents",
  "repository": "https://github.com/user/cc-agents",
  "license": "MIT",
  "keywords": [
    "tdd",
    "testing",
    "workflow",
    "task-management",
    "skills",
    "agents",
    "development",
    "quality"
  ],
  "commands": "./commands",
  "skills": "./skills",
  "agents": "./agnts"
}
```

**2.2 Update `plugins/wt/plugin.json`:**

```json
{
  "name": "wt",
  "version": "1.1.0",
  "description": "Writing Tools: Style extraction, application, and professional translation",
  "author": {
    "name": "Robin Min",
    "email": "minlongbing@gmail.com"
  },
  "homepage": "https://github.com/user/cc-agents",
  "repository": "https://github.com/user/cc-agents",
  "license": "MIT",
  "keywords": [
    "writing",
    "style",
    "translation",
    "voice",
    "content-generation",
    "copywriting"
  ],
  "commands": "./commands"
}
```

**Deliverable**: Updated plugin.json files with auto-discovery paths

##### Phase 3: Update marketplace.json [Complexity: Low]

**Goal**: Align with plugin discovery format

Update `.claude-plugin/marketplace.json` to remove `hello` plugin and use simplified format:

```json
{
  "name": "cc-agents",
  "owner": {
    "name": "Robin Min",
    "email": "minlongbing@gmail.com"
  },
  "plugins": [
    {
      "name": "wt",
      "source": "./plugins/wt",
      "description": "Writing Tools: Style extraction, application, and professional translation"
    },
    {
      "name": "rd",
      "source": "./plugins/rd",
      "description": "Rapid Development: TDD workflow, task management, skill development, and code quality tools"
    }
  ]
}
```

**Deliverable**: Cleaned marketplace.json without hello plugin

##### Phase 4: Fine-tune Slash Commands [Complexity: Medium]

**Goal**: Add proper frontmatter and ensure best practices

**4.1 Commands needing frontmatter updates:**

| Command             | Current State                                       | Updates Needed                     |
| ------------------- | --------------------------------------------------- | ---------------------------------- |
| `task-run.md`       | Has `description`                                   | Add `argument-hint`                |
| `task-fixall.md`    | Has `description`, `argument-hint`                  | ✓ Good                             |
| `task-spec.md`      | Has `description`, `argument-hint`, `allowed-tools` | ✓ Good                             |
| `agent-meta.md`     | Has `description`                                   | Add `argument-hint`                |
| `skill-add.md`      | Missing frontmatter                                 | Add `description`, `argument-hint` |
| `skill-evaluate.md` | Has `description`                                   | Add `argument-hint`                |
| `skill-refine.md`   | Missing frontmatter                                 | Add `description`, `argument-hint` |

**4.2 Frontmatter additions:**

**skill-add.md:**

```yaml
---
description: Create a new Claude Code Agent Skill with templates and best practices
argument-hint: <plugin-name> <skill-name> [template-type]
---

```

**skill-refine.md:**

```yaml
---
description: Improve skill quality using cc-skills meta-skill best practices
argument-hint: <skill-folder>
---

```

**task-run.md:**

```yaml
---
description: Analyze a task, design a solution blueprint, and create a detailed implementation plan
argument-hint: <task-file.md> [--dry-run] [--no-interview] [--scope <level>]
---

```

**agent-meta.md:**

```yaml
---
description: Expert prompt engineering analysis and refinement for prompts, slash commands, and agent skills
argument-hint: <file_path> [focus_area]
---

```

**Deliverable**: All slash commands with proper frontmatter

##### Phase 5: Validation [Complexity: Low]

**Goal**: Verify all changes work correctly

- [ ] Verify `tasks` command still works after rename
- [ ] Test that plugins load correctly with new plugin.json format
- [ ] Verify slash commands are discoverable
- [ ] Check that skills and agents auto-discover correctly

**Deliverable**: Validated, working plugin structure

### References

- [Discover and install prebuilt plugins through marketplaces](https://code.claude.com/docs/en/discover-plugins)
- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [Agent Skills](https://code.claude.com/docs/en/skills)
- [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

---

For the following slash commands, We are not only need to enhance their formats, we also need fine tune their contents.

I need your act as the master of prompt enginering and claude code to fine tune their contents one-by-one based on the most latest industry best practices:

- @plugins/rd/commands/task-run.md
- @plugins/rd/commands/task-fixall.md
- @plugins/rd/commands/task-spec.md
- @plugins/rd/commands/agent-meta.md
- @plugins/rd/commands/skill-add.md
- @plugins/rd/commands/skill-evaluate.md
- @plugins/rd/commands/skill-refine.md
