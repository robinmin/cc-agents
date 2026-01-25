# Naming Conventions & Agent Routing

## Core Rule

**ALWAYS use full namespace**: `plugin-name:resource-name` for plugin resources

---

## Quick Reference

| Component     | Pattern         | Example            | Correct Reference            |
| ------------- | --------------- | ------------------ | ---------------------------- |
| Slash Command | `noun-verb`     | `code-generate.md` | `/rd2:code-generate`         |
| Agent Skill   | `verb-ing-noun` | `tdd-workflow`     | `rd2:tdd-workflow`           |
| Subagent      | `role-prefix`   | `super-architect`  | `super-architect` (internal) |

---

## Common Mistakes

| Wrong                        | Why            | Correct            |
| ---------------------------- | -------------- | ------------------ |
| `tasks`                      | Missing prefix | `rd2:tasks`        |
| `/tasks`                     | Missing prefix | `/rd2:tasks-cli`   |
| `generate-code`              | Wrong format   | `code-generate`    |
| `rd2:super-coder` (as skill) | Agent ≠ skill  | Use agent directly |

**Key Rules:**

- Slash commands = grouped by `noun-verb` for alphabetical sorting
- NEVER reuse names across commands/skills/agents
- Agents use bare names internally; skills/commands use full namespace

---

## Agent Routing (rd2 Subagents)

Auto-routing activates based on these keywords:

| Agent                       | Color       | Role                  | Triggers                                                                                     |
| --------------------------- | ----------- | --------------------- | -------------------------------------------------------------------------------------------- |
| **rd2:super-coder**         | 🟩 teal     | Code implementation   | implementing features, fixing bugs, refactoring, writing tests, hands-on coding              |
| **rd2:super-planner**       | 🟪 purple   | Orchestration         | planning complex features, orchestrating workflows, coordinating specialists, task breakdown |
| **rd2:super-code-reviewer** | 🟥 crimson  | Code review           | code review requests (best-tool selection or explicit tool)                                  |
| **rd2:super-architect**     | 🟦 blue     | Solution architecture | complex architectural decisions, multiple system integration, solution architecture review   |
| **rd2:super-designer**      | 🩷 pink     | UI/UX design          | UI components, user experience, design systems, accessibility, frontend architecture         |
| **rd2:skill-doctor**        | 💜 lavender | Skill evaluation      | skill validation, quality assessment, scoring skill structure                                |
| **rd2:agent-doctor**        | 🟥 crimson  | Agent evaluation      | agent validation, quality assessment, scoring agent structure                                |
| **rd2:skill-expert**        | 🟩 teal     | Skill creation        | creating new skills, writing SKILL.md, designing workflows, refining skills                  |
| **rd2:agent-expert**        | 🌊 azure    | Agent creation        | creating domain experts, specialized assistants, task-focused subagents                      |

---

## Why This Matters

1. **Prevents confusion** - LLM knows exactly which resource to use
2. **Avoids name collisions** - Multiple plugins may have `tasks` skill
3. **Enables auto-routing** - Proper namespace triggers correct agent
4. **Documentation clarity** - Clear origin of each resource

---

## See Also

- [Official Claude Code Documentation](https://code.claude.com/docs)
