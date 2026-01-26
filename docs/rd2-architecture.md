# RD2 Architecture Documentation

Visual architecture diagram and component interaction patterns for the rd2 plugin.

## Overview

The rd2 plugin implements a "super-\*" agent ecosystem with "fat skills, thin wrappers" architecture pattern. This document provides a visual representation of agent interactions and component relationships.

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           RD2 PLUGIN ARCHITECTURE                                 │
└───────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────┐
│                         USER ENTRY POINTS (COMMANDS)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │/rd2:tasks-   │  │/rd2:tasks-   │  │/rd2:tasks-   │  │/rd2:tasks-cli│         │
│  │     run      │  │   plan       │  │   review     │  │   command    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                 │                  │
└─────────┼─────────────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        AGENT LAYER (COORDINATORS)                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ super-coder  │  │super-planner │  │ super-code-  │  │  rd2:tasks   │         │
│  │   AGENT      │  │   AGENT      │  │   reviewer   │  │   SKILL      │         │
│  │              │  │              │  │   AGENT      │  │              │         │
│  │ - Delegate   │  │ - Scale      │  │ - Auto       │  │ - Task file  │         │
│  │   to coder-* │  │   assess     │  │   select     │  │   mgmt       │         │
│  │   skills     │  │ - Delegate   │  │   tool       │  │ - Kanban     │         │
│  │ - 17-step    │  │   to skills/ │  │ - Present    │  │   sync       │         │
│  │   workflow   │  │   agents     │  │   results    │  │              │         │
│  │              │  │              │  │              │  │              │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────────┘         │
└─────────┼─────────────────┼─────────────────┼──────────────────────────────────────┘
          │                 │                 │
          │                 │                 │
          ▼                 ▼                 ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           COORDINATOR LAYER                                        │
│  ┌──────────────┐  ┌──────────────┐                                               │
│  │super-architect│ │super-designer│                                               │
│  │   AGENT      │  │   AGENT      │                                               │
│  │              │  │              │                                               │
│  │- Solution     │  │- UI/UX       │                                               │
│  │  review      │  │  design      │                                               │
│  │- Architecture │  │- Component   │                                               │
│  │  decisions   │  │  specs       │                                               │
│  │              │  │              │                                               │
│  └──────────────┘  └──────────────┘                                               │
└───────────────────────────────────────────────────────────────────────────────────┘
                                               │
                                               ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                          FAT SKILLS LAYER ("The Real Work")                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │coder-gemini  │  │coder-claude  │  │coder-auggie  │  │coder-opencode│         │
│  │   SKILL      │  │   SKILL      │  │   SKILL      │  │   SKILL      │         │
│  │              │  │              │  │              │  │              │         │
│  │- Code gen    │  │- Code gen    │  │- Code gen    │  │- Multi-model │         │
│  │- Gemini CLI  │  │- Claude CLI  │  │- Auggie MCP  │  │  gen         │         │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │code-review-  │  │code-review-  │  │code-review-  │  │code-review-  │         │
│  │   gemini     │  │   claude     │  │   auggie     │  │   opencode   │         │
│  │   SKILL      │  │   SKILL      │  │   SKILL      │  │   SKILL      │         │
│  │              │  │              │  │              │  │              │         │
│  │- Review      │  │- Review      │  │- Review      │  │- Multi-model │         │
│  │- Gemini CLI  │  │- Claude CLI  │  │- Auggie MCP  │  │  review      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐                                           │
│  │ rd2:tdd-     │  │ rd2:cc-      │                                           │
│  │ workflow     │  │ skills       │                                           │
│  │   SKILL      │  │   SKILL      │                                           │
│  │              │  │              │                                           │
│  │- TDD cycle   │  │- Agent       │                                           │
│  │- Red-green-  │  │  skill       │                                           │
│  │  refactor    │  │  mgmt        │                                           │
│  └──────────────┘  └──────────────┘                                           │
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                         │
│  │ rd2:task-   │  │ rd2:tasks   │  │ rd2:cc-      │                         │
│  │ decompositio│  │   SKILL     │  │ skills       │                         │
│  │ n           │  │             │  │   SKILL      │                         │
│  │   SKILL     │  │- Task file  │  │              │                         │
│  │ (Knowledge  │  │  mgmt       │  │- Agent       │                         │
│  │  only)      │  │- Kanban     │  │  skill       │                         │
│  │- Patterns   │  │  sync       │  │  mgmt        │                         │
│  │- Heuristics │  │- WBS assign │  │              │                         │
│  │- Domain     │  │- File ops   │  │              │                         │
│  │  breakdowns │  │             │  │              │                         │
│  └──────────────┘  └──────────────┘  └──────────────┘                         │
└───────────────────────────────────────────────────────────────────────────────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL TOOLS                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │Gemini CLI    │  │Claude CLI    │  │Auggie MCP    │  │OpenCode CLI  │         │
│  │(External)    │  │(Built-in)    │  │(MCP Server)  │  │(External)    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘         │
└───────────────────────────────────────────────────────────────────────────────────┘
```

## Component Categories

### Entry Points (User-Facing Commands)

Commands are **slash commands** that users invoke directly. Commands are thin wrappers that parse arguments and delegate to agents or skills.

**Invocation syntax:** `/rd2:command-name`

| Command               | Purpose                            | Delegates To                |
| --------------------- | ---------------------------------- | --------------------------- |
| `/rd2:tasks-plan`     | Full workflow orchestration        | `super-planner` agent       |
| `/rd2:tasks-run`      | Single task implementation         | `super-coder` agent         |
| `/rd2:tasks-review`   | Single task code review            | `super-code-reviewer` agent |
| `/rd2:tasks-refine`   | Task refinement                    | `super-planner` agent       |
| `/rd2:tasks-design`   | Design phase coordination          | `super-planner` agent       |
| `/rd2:tasks-cli`      | Task file management               | `rd2:tasks` skill           |
| `/rd2:agent-add`      | Create new agent                   | `agent-expert` agent        |
| `/rd2:agent-evaluate` | Evaluate agent quality             | `agent-doctor` agent        |
| `/rd2:agent-refine`   | Improve existing agent             | `agent-expert` agent        |
| `/rd2:skill-add`      | Create new skill                   | `skill-expert` agent        |
| `/rd2:skill-evaluate` | Evaluate skill quality             | `skill-doctor` agent        |
| `/rd2:skill-refine`   | Improve existing skill             | `skill-expert` agent        |

**Note:** As of v2.0 (2026-01-26), `/rd2:code-generate` and `/rd2:code-review` have been renamed to `/rd2:tasks-run` and `/rd2:tasks-review` respectively for namespace consistency.

### Agents (Coordinator Layer)

Agents are **lightweight coordinators** that delegate to skills. Agents are NOT invoked directly with slash commands - they are delegated to by commands or other agents using the Task tool.

**Reference syntax:** `super-agent-name` (internal delegation)

- `super-coder` - Coordinates code generation across multiple tools (gemini/claude/auggie/opencode)
- `super-planner` - Coordinates task breakdown and planning
- `super-code-reviewer` - Coordinates code review across multiple tools
- `super-architect` - Coordinates solution architecture review
- `super-designer` - Coordinates UI/UX design

**How agents are invoked:**

1. Via commands: `/rd2:code-generate` delegates to `super-coder` agent
2. Via other agents: `super-planner` delegates to `super-architect` for complex tasks
3. Via Task tool: Claude Code's Task tool invokes agent prompts directly

### Fat Skills (Implementation Layer)

- **Code Generation Skills**: Actual code generation logic
  - `coder-gemini` - Gemini-based generation
  - `coder-claude` - Claude native generation
  - `coder-auggie` - Semantic codebase-aware generation
  - `coder-opencode` - Multi-model external generation

- **Code Review Skills**: Actual review logic
  - `code-review-gemini` - Gemini-based review
  - `code-review-claude` - Claude native review
  - `code-review-auggie` - Semantic codebase-aware review
  - `code-review-opencode` - Multi-model external review

- **Workflow Skills**: Process and methodology
  - `tdd-workflow` - Test-driven development enforcement
  - `task-decomposition` - Task decomposition knowledge and patterns (knowledge-only skill)
  - `tasks` - Task file and Kanban management with decompose command (file operations)
  - `cc-skills` - Agent skill management
  - `cc-agents` - Agent management

## Interaction Patterns

### Pattern 1: Auto-Selection Flow

```
User Request → Command → Agent → Analyze Requirements → Select Skill → Execute
                                                              ↓
                                              Tool capability matching
```

### Pattern 2: Specialist Delegation

```
super-planner → Assess Scale
                   ↓
         ┌─────────┴─────────┐
         ▼                   ▼
   High complexity     Low complexity
         ↓                   ↓
  super-architect      Direct to
  (solution review)    super-coder
```

### Pattern 3: Two-Level Review

```
Implementation Complete
         ↓
  ┌──────────────┐
  │ Solution     │ ← Optional (super-architect)
  │ Review       │   Architecture/design level
  └──────────────┘
         ↓
  ┌──────────────┐
  │ Code Review  │ ← Mandatory (super-code-reviewer)
  │              │   Implementation quality
  └──────────────┘
         ↓
    Mark Done
```

### Pattern 4: Fat Skills, Thin Wrappers

```
┌─────────────────────────────────────────┐
│ THIN WRAPPER (Agent/Command)            │
│  - Parse user input                     │
│  - Make delegation decisions            │
│  - Invoke appropriate skill             │
│  - Present results                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ FAT SKILL (The Real Work)               │
│  - Implement complex logic              │
│  - Handle edge cases                    │
│  - Interact with external tools         │
│  - Generate structured output           │
└─────────────────────────────────────────┘
```

## Data Flow

### Task File Flow

```
User Request
      ↓
rd2:tasks decompose
      ↓
Enhanced Task File Created
├── Frontmatter (status, dependencies)
├── Background
├── Requirements
├── Q&A (populated during implementation)
├── Solutions/Goals
│   └── Plan (step-by-step)
└── References
      ↓
super-coder consumes
      ↓
Implementation + Tests
      ↓
super-code-reviewer validates
      ↓
Status: Done
```

### Review Results Flow

```
Target Code
      ↓
super-code-reviewer (auto-select tool)
      ↓
code-review-* skill executes
      ↓
Structured Review Result
├── YAML frontmatter
│   ├── type
│   ├── tool
│   ├── model
│   ├── quality_score
│   └── recommendation
├── Executive Summary
├── Critical Issues (Must Fix)
├── High Priority (Should Fix)
├── Medium Priority (Consider)
├── Low Priority (Nice to Have)
└── Overall Assessment
      ↓
Present to User
      ↓
Import as Tasks (optional)
```

## Design Principles

### 1. Fat Skills, Thin Wrappers

- **Skills contain the logic** - All complex operations, tool interactions, and decision-making
- **Agents coordinate** - Parse input, select skills, present results
- **Commands are entry points** - CLI interface to agents

### 2. Auto-Selection with Override

- **Smart defaults** - Analyze requirements and select optimal tool
- **User control** - Allow explicit tool selection via flags
- **Graceful fallback** - Try alternatives if primary tool unavailable

### 3. Two-Level Review

- **Solution Review** (Optional) - Architecture/design validation before implementation
- **Code Review** (Mandatory) - Implementation quality validation after implementation

### 4. Task-Driven Workflow

- **WBS-numbered tasks** - Hierarchical task structure
- **Dependency tracking** - Tasks know what they depend on
- **Enhanced task files** - Q&A, Plan, References sections
- **Kanban visualization** - TodoWrite synchronization

## Component Invocation Guide

**Important:** Each component type has a specific invocation pattern. Using the wrong pattern will fail.

| Component Type | Invocation Syntax    | Example                    | How It Works                                      |
| -------------- | -------------------- | -------------------------- | ------------------------------------------------- |
| **Command**    | `/rd2:command-name`  | `/rd2:code-generate "..."` | User invokes directly via slash command           |
| **Agent**      | Task tool delegation | `super-coder`              | Commands or other agents delegate via Task tool   |
| **Skill**      | `rd2:skill-name`     | `rd2:tdd-workflow`         | Agents invoke skills by reference in their prompt |

### Commands (Entry Points)

Commands are what users invoke directly:

```bash
/rd2:tasks-plan "Build auth system"         # Full workflow orchestration
/rd2:tasks-plan "Build auth" --execute      # Plan and implement in one go
/rd2:tasks-run 0047                         # Implement single task
/rd2:tasks-review 0047                      # Review single task
/rd2:tasks-cli list wip                     # List WIP tasks
```

### Agents (Coordinators)

Agents are NOT invoked directly by users. They are:

1. **Delegated to by commands** - The command parses input and invokes the agent
2. **Delegated to by other agents** - e.g., super-planner delegates to super-architect
3. **Invoked via Task tool** - Claude Code's internal delegation mechanism

### Skills (Implementation)

Skills are invoked by agents within their prompts:

```markdown
# In an agent's prompt

Use `rd2:tdd-workflow` for test-driven development.
Delegate code generation to `rd2:coder-gemini`.
```

## Component Matrix

### Agents (9 total)

| Agent               | Purpose                         | Delegates To                                                  |
| ------------------- | ------------------------------- | ------------------------------------------------------------- |
| super-coder         | Code generation coordination    | coder-\* skills, tdd-workflow                                 |
| super-planner       | Task decomposition and planning | task-decomposition, tasks, super-architect, super-designer    |
| super-code-reviewer | Code review coordination        | code-review-\* skills                                         |
| super-architect     | Solution architecture review    | backend-architect, frontend-architect, cloud-architect skills |
| super-designer      | UI/UX design                    | ui-ux-design, frontend-design skills                          |
| agent-doctor        | Agent quality evaluation        | cc-agents skill                                               |
| agent-expert        | Agent generation and refinement | cc-agents skill                                               |
| skill-doctor        | Skill quality evaluation        | cc-skills skill                                               |
| skill-expert        | Skill generation and refinement | cc-skills skill                                               |

### Code Generation Skills (4 total)

| Skill          | Purpose                            | External Dependency   |
| -------------- | ---------------------------------- | --------------------- |
| coder-gemini   | Gemini-based code generation       | Gemini CLI            |
| coder-claude   | Claude native code generation      | Claude CLI (built-in) |
| coder-auggie   | Semantic codebase-aware generation | Auggie MCP            |
| coder-opencode | Multi-model external generation    | OpenCode CLI          |

### Code Review Skills (5 total)

| Skill                | Purpose                               | External Dependency   |
| -------------------- | ------------------------------------- | --------------------- |
| code-review-gemini   | Gemini-based code review              | Gemini CLI            |
| code-review-claude   | Claude native code review             | Claude CLI (built-in) |
| code-review-auggie   | Semantic codebase-aware review        | Auggie MCP            |
| code-review-opencode | Multi-model external review           | OpenCode CLI          |
| code-review-common   | Shared review patterns and checklists | None (knowledge-only) |

### Architecture Skills (3 total)

| Skill              | Purpose                        | External Dependency   |
| ------------------ | ------------------------------ | --------------------- |
| backend-architect  | Backend architecture patterns  | None (knowledge-only) |
| frontend-architect | Frontend architecture patterns | None (knowledge-only) |
| cloud-architect    | Cloud infrastructure patterns  | None (knowledge-only) |

### Design Skills (2 total)

| Skill           | Purpose                                 | External Dependency   |
| --------------- | --------------------------------------- | --------------------- |
| ui-ux-design    | UI/UX design patterns and accessibility | None (knowledge-only) |
| frontend-design | Frontend component design patterns      | None (knowledge-only) |

### Workflow & Management Skills (6 total)

| Skill              | Purpose                                        | External Dependency   |
| ------------------ | ---------------------------------------------- | --------------------- |
| tasks              | Task file and Kanban management with decompose | TodoWrite             |
| task-decomposition | Decomposition patterns and heuristics          | None (knowledge-only) |
| tdd-workflow       | Test-driven development workflow               | Testing frameworks    |
| advanced-testing   | Advanced testing patterns                      | Testing frameworks    |
| test-coverage      | Test coverage analysis                         | Testing frameworks    |
| anti-hallucination | Verification-first protocol                    | Web search tools      |

### Agent/Skill Management Skills (2 total)

| Skill     | Purpose                             | External Dependency   |
| --------- | ----------------------------------- | --------------------- |
| cc-agents | Agent anatomy, creation, evaluation | None (knowledge-only) |
| cc-skills | Skill anatomy, creation, evaluation | None (knowledge-only) |

### Knowledge Skills (1 total)

| Skill                | Purpose                            | External Dependency |
| -------------------- | ---------------------------------- | ------------------- |
| knowledge-extraction | Research and information synthesis | Web search tools    |

## External Dependencies

```
┌─────────────────────────────────────────────────────────────┐
                    EXTERNAL DEPENDENCIES
└─────────────────────────────────────────────────────────────┘

CLI Tools:
├── Gemini CLI (google-gemini)
├── OpenCode CLI
└── Claude Code (built-in)

MCP Servers:
└── Auggie (semantic code indexing)

Claude Code Features:
├── TodoWrite (Kanban sync)
├── Hooks (PreToolUse, SessionStart, etc.)
└── Skills/Agents/Commands system
```

## Related Documentation

- **Workflow**: `docs/rd2-workflow.md`
- **Task CLI**: `docs/task-cli-integration.md`
- **Migration Guide**: `docs/migration-0.0-to-0.1.md`
