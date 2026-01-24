# RD2 Architecture Documentation

Visual architecture diagram and component interaction patterns for the rd2 plugin.

## Overview

The rd2 plugin implements a "super-*" agent ecosystem with "fat skills, thin wrappers" architecture pattern. This document provides a visual representation of agent interactions and component relationships.

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           RD2 PLUGIN ARCHITECTURE                                 │
└───────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────┐
│                              USER ENTRY POINTS                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ /super-coder │  │/super-planner│  │/super-review │  │  /tasks CLI  │         │
│  │   command    │  │   command    │  │   command    │  │    command   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                 │                  │
└─────────┼─────────────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           THIN WRAPPER LAYER                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ super-coder  │  │super-planner │  │super-review  │  │  rd2:tasks   │         │
│  │   AGENT      │  │   AGENT      │  │   AGENT      │  │   SKILL      │         │
│  │              │  │              │  │              │  │              │         │
│  │ - Parse user │  │ - Scale      │  │ - Auto       │  │ - Task file  │         │
│  │   input      │  │   assess     │  │   select     │  │   mgmt       │         │
│  │ - Delegate   │  │ - Delegate   │  │   tool       │  │ - Kanban     │         │
│  │   to skills  │  │   to skills/ │  │ - Present    │  │   sync       │         │
│  │ - Present    │  │   agents     │  │   results    │  │              │         │
│  │   results    │  │              │  │              │  │              │         │
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

### Entry Points (User-Facing)

- **Commands**: Slash commands that users invoke directly
  - `/super-coder` - Code generation and implementation
  - `/super-planner` - Task decomposition and planning
  - `/super-code-reviewer` - Code review coordination
  - `/tasks` - Task file management

### Thin Wrappers (Coordinator Layer)

- **Agents**: Lightweight coordinators that delegate to skills
  - `super-coder` - Coordinates code generation across multiple tools
  - `super-planner` - Coordinates task breakdown and planning
  - `super-code-reviewer` - Coordinates code review across multiple tools
  - `super-architect` - Coordinates solution architecture review
  - `super-designer` - Coordinates UI/UX design

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

## Component Matrix

| Component | Type | Purpose | Dependencies |
|-----------|------|---------|--------------|
| super-coder | Agent | Code generation coordination | coder-* skills, tdd-workflow |
| super-planner | Agent | Task decomposition and planning | task-decomposition, tasks, super-architect, super-designer |
| super-code-reviewer | Agent | Code review coordination | code-review-* skills |
| super-architect | Agent | Solution architecture review | Backend/frontend/cloud knowledge |
| super-designer | Agent | UI/UX design | Frontend design systems knowledge |
| coder-gemini | Skill | Gemini-based generation | Gemini CLI |
| coder-claude | Skill | Claude native generation | Claude CLI (built-in) |
| coder-auggie | Skill | Semantic code generation | Auggie MCP |
| coder-opencode | Skill | Multi-model generation | OpenCode CLI |
| code-review-gemini | Skill | Gemini-based review | Gemini CLI |
| code-review-claude | Skill | Claude native review | Claude CLI (built-in) |
| code-review-auggie | Skill | Semantic code review | Auggie MCP |
| code-review-opencode | Skill | Multi-model review | OpenCode CLI |
| tdd-workflow | Skill | TDD cycle enforcement | Testing frameworks |
| task-decomposition | Skill | Decomposition patterns and heuristics | None (knowledge-only) |
| tasks | Skill | Task file and Kanban management with decompose | TodoWrite |

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

- **Workflow**: `/docs/rd2-workflow.md`
- **Task CLI**: `/docs/task-cli-integration.md`
- **Migration Guide**: `/docs/migration-0.0-to-0.1.md`
