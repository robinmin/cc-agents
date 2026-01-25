# Hybrid Architecture: Commands and Subagents

Detailed patterns for complex slash commands and subagents that orchestrate workflows.

## Overview

For complex slash commands and subagents that orchestrate workflows, use a **hybrid approach** that separates concerns:

- **Command Layer (.md files)** - Thin wrappers with pseudocode for orchestration
- **Agent Layer (.md agents)** - Fat skills with flexible logic for adaptation

## Command Layer (.md files)

Use **pseudocode with built-in tools** for workflow orchestration:

- **Built-in tools**: Task, SlashCommand, AskUserQuestion
- **Explicit workflow sequences**: "Step 1 → Step 2 → Step 3"
- **Self-documenting**: The pseudocode IS the specification
- **Focus on**: "what to call" and "when to call it"

### Command Template

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

## Agent Layer (.md agents)

Use **flexible natural language** with conditional logic:

- **Adaptive behavior** based on task state, user responses, context
- **Error handling**, retries, fallback strategies
- **Decision-making** based on conditions
- **Focus on**: "how to adapt" and "decision-making"

### Agent Template Pattern

```markdown
# 6. ANALYSIS PROCESS

## Phase 1: Diagnose

When receiving a request:
1. Assess task complexity and requirements
2. Identify available resources and constraints
3. Determine if user input is needed
4. Check for red flags or potential issues

## Phase 2: Solve

Execute the task with adaptive behavior:
1. If analysis reveals gaps → Ask user for clarification
2. If multiple approaches exist → Present options
3. If errors occur → Retry with alternative strategy
4. If dependencies missing → Suggest setup steps

## Phase 3: Verify

Confirm successful completion:
1. Validate output meets requirements
2. Check for errors or warnings
3. Verify edge cases are handled
4. Document any assumptions made
```

## Architecture Diagram

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

## Why This Hybrid Approach Works

1. **Explicit workflows** - Claude knows exactly when to use tools
2. **Self-documenting** - Pseudocode in commands doubles as spec
3. **Flexible execution** - Agents can adapt to real-world complexity
4. **Separation of concerns** - Commands = orchestration, Agents = adaptation
5. **Easier debugging** - Can trace which step failed in the workflow
6. **Testable components** - Commands and agents can be tested independently

## Built-in Tools for Commands

| Tool              | Purpose                | Example                                              |
| ----------------- | ---------------------- | ---------------------------------------------------- |
| `Task`            | Delegate to subagent   | `Task(subagent_type="super-planner", prompt="...")`  |
| `SlashCommand`    | Call another command   | `SlashCommand(skill="rd2:tasks-refine", args="...")` |
| `AskUserQuestion` | Interactive user input | Ask clarifying questions with options                |

## Key Rules

- **Commands are thin wrappers** - Use pseudocode for orchestration
- **Agents are adaptive coordinators** - Use flexible language for decision-making
- **Always document the workflow** - Include "When to Use" and "Examples"
- **Use full namespace for resources** - e.g., `rd2:tasks`, `rd2:super-planner`
- **Keep agents as skills-based** - Agents delegate to skills, don't implement directly

## Examples

### Example 1: Simple Orchestration Command

```markdown
---
description: Plan complex task via decomposition
argument-hint: "<user-request>"
---

# Tasks Plan

Break down complex user requests into structured task files.

## When to Use

- User asks for complex feature requiring multiple steps
- Need to create task file for three-agent workflow
- Task has unclear requirements or dependencies

## Workflow

1. Parse user request to identify core requirements
2. Call rd2:task-decomposition-expert with parsed request
3. Ask user to approve generated task structure
4. Create task file at approved location
5. Report completion with file path
```

### Example 2: Adaptive Agent Behavior

```markdown
## Analysis Process

### Assessment Phase

Examine the task and determine:
- Is this a research task or implementation task?
- Are requirements clear or need clarification?
- What skills/tools are needed?
- What are the potential failure points?

### Adaptive Execution

**IF research task:**
- Use Task tool with general-purpose agent
- Compile findings into structured summary
- Present to user with recommendations

**IF implementation task:**
- Check if requirements are clear
  - IF unclear: Ask user for clarification
  - IF clear: Proceed with implementation
- Use TodoWrite to track progress
- Execute implementation steps
- Verify with tests

**IF task fails:**
- Identify failure point
- Retry with alternative approach
- If 3 retries fail, ask user for guidance
```

## Common Patterns

### Pattern 1: Sequential Orchestration

```markdown
## Workflow

1. Step 1: Validate inputs
2. Step 2: Process with agent A
3. Step 3: Review with agent B
4. Step 4: Confirm with user
5. Step 5: Execute final action
```

### Pattern 2: Conditional Branching

```markdown
## Workflow

1. Assess request type
2. IF type A:
   - Call agent X
   - Apply transformation Y
3. IF type B:
   - Call agent Y
   - Apply transformation Z
4. Present result
```

### Pattern 3: Retry Logic

```markdown
## Error Handling

IF operation fails:
1. Identify error type
2. IF transient error:
   - Retry with exponential backoff
3. IF configuration error:
   - Suggest fix to user
   - Ask for permission to apply
4. IF unknown error:
   - Log error details
   - Ask user for guidance
```

## Testing Hybrid Components

### Test Commands

1. Verify command documentation is complete
2. Test pseudocode executes correctly
3. Verify tool calls use correct syntax
4. Check error handling is documented

### Test Agents

1. Give agent typical task in its domain
2. Verify it follows process steps
3. Test edge cases mentioned in prompt
4. Confirm quality standards are met
5. Test adaptive behavior with different scenarios
