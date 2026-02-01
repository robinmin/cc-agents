# Naming Conventions & Agent Routing

## Core Rule [CRITICAL]

**ALWAYS use full namespace**: `plugin-name:resource-name` for plugin resources
**Fat Skills, Thin Wrappers** - Skills are the core (contain logic), Commands/Agents are thin wrappers (delegate to skills)
**File-Based Storage** - All intermediate results saved as local files for traceability and manual intervention for all subagents
**Path-Based Communication** - Subagents only pass file paths, not content (prevents context bloat) for all subagents
**tasks-based task management**: All tasks management **MUST** be conducted through task files by `tasks` CLI, including creation and status management.

---

## Rules for Agent Skills Development

### Core Principle [CRITICAL]

**Fat Skills, Thin Wrappers:**

- **Skills** = core logic, workflows, domain knowledge (source of truth)
- **Commands** = ~50 line wrappers invoking skills for humans
- **Agents** = ~100 line wrappers invoking skills for AI workflows

### Circular Reference Rule [CRITICAL]

**Skills MUST NOT reference their associated agents or commands.**

❌ Bad: `See also: my-agent, /plugin:my-command`
✅ Good: `This skill provides workflows for X.`

### Quick Rules

| Rule          | Requirement                                                         |
| ------------- | ------------------------------------------------------------------- |
| Description   | Third person: "This skill should be used when..." + trigger phrases |
| Writing form  | Imperative: "Create X", not "Creates X" or "You should create"      |
| Body length   | <5k words, move details to `references/`                            |
| Naming        | `verb-ing-noun` (e.g., `image-generating`)                          |
| Namespace     | Always use `plugin-name:skill-name`                                 |
| No name reuse | Across commands/skills/agents                                       |

**See also:** `rd2:cc-skills` skill for complete skill development guidelines.

---

## Rules for Subagent Development

### Core Principle

**Agents are thin wrappers (~100 lines) that invoke skills.**

### Quick Rules

| Rule         | Requirement                                    |
| ------------ | ---------------------------------------------- |
| Structure    | 8 sections, 400-600 lines total                |
| Description  | "Use PROACTIVELY for" + 2-3 `<example>` blocks |
| Competencies | 50+ items across 4-5 categories                |
| Rules        | 8+ DO and 8+ DON'T                             |
| Skills field | Enumerate skills in frontmatter, NOT in body   |
| Naming       | `role-prefix` (e.g., `super-architect`)        |

**8 Sections:** METADATA → PERSONA → PHILOSOPHY → VERIFICATION → COMPETENCIES → PROCESS → RULES → OUTPUT

**See also:** `rd2:cc-agents` skill for complete agent development guidelines.

---

## Rules for Slash Command Development

### Core Principle

**Commands are thin wrappers (~50 lines) that invoke skills directly.**

### Circular Reference Rule [CRITICAL]

**Commands MUST delegate to skills, NOT agents.**

❌ Bad: `Task(agent="wt:tc-writer", ...)`
✅ Good: `Skill(skill="wt:technical-content-creation", ...)`

### Quick Rules

| Rule          | Requirement                                      |
| ------------- | ------------------------------------------------ |
| Delegation    | Use `Skill(skill="plugin:skill-name", ...)`      |
| Description   | <60 chars, clear, actionable                     |
| Writing form  | Imperative: instructions FOR Claude, not TO user |
| argument-hint | Document expected arguments                      |
| Naming        | Simple: `verb-noun`, Grouped: `noun-verb`        |
| Namespace     | Always use `plugin-name:command-name`            |

**See also:** `rd2:cc-commands` skill for complete command development guidelines.

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

## Agent Routing

Auto-routing activates based on these keywords:

| Agent                            | Color              | Role                                                              | Triggers                                                                                         |
| -------------------------------- | ------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **rd2:super-coder**              | 🟩 teal            | Code implementation                                               | implementing features, fixing bugs, refactoring, writing tests, hands-on coding                  |
| **rd2:super-planner**            | 🟪 purple          | Orchestration                                                     | planning complex features, orchestrating workflows, coordinating specialists, task breakdown     |
| **rd2:super-code-reviewer**      | 🟥 crimson         | Code review                                                       | code review requests (best-tool selection or explicit tool)                                      |
| **rd2:super-architect**          | 🟦 blue            | Solution architecture                                             | complex architectural decisions, multiple system integration, solution architecture review       |
| **rd2:super-designer**           | 🩷 pink            | UI/UX design                                                      | UI components, user experience, design systems, accessibility, frontend architecture             |
| **rd2:skill-doctor**             | 💜 lavender        | Skill evaluation                                                  | skill validation, quality assessment, scoring skill structure                                    |
| **rd2:agent-doctor**             | 🟥 crimson         | Agent evaluation                                                  | agent validation, quality assessment, scoring agent structure                                    |
| **rd2:skill-expert**             | 🟩 teal            | Skill creation                                                    | creating new skills, writing SKILL.md, designing workflows, refining skills                      |
| **rd2:agent-expert**             | 🌊 azure           | Agent creation                                                    | creating domain experts, specialized assistants, task-focused subagents                          |
| **rd2:command-expert**           | 🟨 gold            | Command creation & refinement                                     | creating slash commands, writing command frontmatter, refining command structure                 |
| **rd2:command-doctor** 🟧 orange | Command evaluation | command validation, quality assessment, scoring command structure |
| **rd2:knowledge-seeker**         | 🔵 cyan            | Research specialist                                               | knowledge synthesis, literature review, evidence gathering, fact verification, cross-referencing |

---

## Why This Matters

1. **Prevents confusion** - LLM knows exactly which resource to use
2. **Avoids name collisions** - Multiple plugins may have `tasks` skill
3. **Enables auto-routing** - Proper namespace triggers correct agent
4. **Documentation clarity** - Clear origin of each resource

---

## Hybrid Approach for Complex Commands / Subagents

### When to Use Pseudocode

For complex slash commands and subagents that orchestrate workflows, use a **hybrid approach**:

**Command Layer (.md files):**

- Use **pseudocode with built-in tools** (Task, SlashCommand, AskUserQuestion)
- Explicit workflow sequences: "Step 1 → Step 2 → Step 3"
- Self-documenting: the pseudocode IS the specification
- Focus on: "what to call" and "when to call it"

**Agent Layer (.md agents):**

- Use **flexible natural language** with conditional logic
- Adaptive behavior based on task state, user responses, context
- Error handling, retries, fallback strategies
- Focus on: "how to adapt" and "decision-making"

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Command Layer (.md files) - THIN WRAPPERS                   │
│  - Pseudocode for tool invocation sequence                    │
│  - Explicit "When to use" and "Examples" sections            │
│  - Clear: "Calls: super-planner → refine → design → run"     │
│  - Built-in tools: Task, SlashCommand, AskUserQuestion      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Agent Layer (super-planner.md) - FAT SKILLS                │
│  - Flexible logic, conditionals, error handling             │
│  - Can adapt based on task state, user responses            │
│  - NOT hardcoded pseudocode                                  │
│  - Coordinates: rd2:tasks, rd2:task-decomposition, etc.    │
└─────────────────────────────────────────────────────────────┘
```

### Why This Hybrid Approach Works

1. **Explicit workflows** - Claude knows exactly when to use tools
2. **Self-documenting** - Pseudocode in commands doubles as spec
3. **Flexible execution** - Agents can adapt to real-world complexity
4. **Separation of concerns** - Commands = orchestration, Agents = adaptation
5. **Easier debugging** - Can trace which step failed in the workflow
6. **Testable components** - Commands and agents can be tested independently

### Command Template Example

```markdown
---
description: Task refinement via quality check
argument-hint: "<task-file.md>" [--force-refine]
---

# Tasks Refine

Refine task files by detecting gaps, suggesting improvements, and getting user approval.

## When to Use

- Task file has empty/missing sections
- Requirements are unclear or incomplete
- Need user clarification before proceeding

## Workflow

This command delegates to **super-planner** agent with refinement mode:

Task(
subagent_type="super-planner",
prompt="""Refine task: {task_file}

Mode: refinement-only
Flags: {force_refine}

Steps:

1. Check task file quality (empty sections, content length)
2. If red flags found OR --force-refine:
   - Generate refinement draft
   - Ask user for approval via AskUserQuestion
3. Update task file with approved changes
4. Report completion
   """
   )
```

### Built-in Tools for Commands

| Tool              | Purpose                | Example                                              |
| ----------------- | ---------------------- | ---------------------------------------------------- |
| `Task`            | Delegate to subagent   | `Task(subagent_type="super-planner", prompt="...")`  |
| `SlashCommand`    | Call another command   | `SlashCommand(skill="rd2:tasks-refine", args="...")` |
| `AskUserQuestion` | Interactive user input | Ask clarifying questions with options                |

### Key Rules

- **Commands are thin wrappers** - Use pseudocode for orchestration
- **Agents are adaptive coordinators** - Use flexible language for decision-making
- **Always document the workflow** - Include "When to Use" and "Examples"
- **Use full namespace for resources** - e.g., `rd2:tasks`, `rd2:super-planner`
- **Keep agents as skills-based** - Agents delegate to skills, don't implement directly

---

## See Also

- [Official Claude Code Documentation](https://code.claude.com/docs)
- [Reference: rd:task-runner](../plugins/rd/commands/task-runner.md) - Example of pseudocode approach
