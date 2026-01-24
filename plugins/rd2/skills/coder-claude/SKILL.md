---
name: coder-claude
agent: Plan
context: fork
user-invocable: false
description: Use Claude's native capabilities for AI-assisted code generation. Trigger when user mentions "Claude code", "native generate", "quick implementation". NOT for code review.
---

# Coder Claude

Use Claude's native codebase analysis capabilities for **code generation**. No external tools required - Claude uses Read, Grep, and Glob directly via a subprocess-isolated script.

**Critical**: This skill is for code generation ONLY. Use code-review-claude for review tasks.

## Quick Start

```bash
# Check Claude CLI availability
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-claude/scripts/coder-claude.py check

# Generate code (TDD enabled by default)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-claude/scripts/coder-claude.py generate "Create a REST API endpoint for user authentication" --output auth-api

# Generate WITHOUT TDD (explicit opt-out)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-claude/scripts/coder-claude.py generate "Quick prototype" --no-tdd --output proto

# Quick prompt
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-claude/scripts/coder-claude.py run "Explain the best approach for implementing rate limiting"
```

## Available Commands

| Command    | Purpose                          | Use Case                                  |
| ---------- | -------------------------------- | ----------------------------------------- |
| `check`    | Validate Claude CLI availability | Run before any Claude operation           |
| `run`      | Execute short prompts            | Quick questions, design discussions       |
| `run-file` | Execute long prompts from file   | Complex context, multi-file requirements  |
| `generate` | Comprehensive code generation    | Full implementation with structured output|

## Super-Coder Methodology Integration

All code generation follows these principles:

### Decision Priority

1. **Correctness & invariants** - Code must work; invalid states are impossible
2. **Simplicity (KISS > DRY)** - Manage complexity; simple changes should be simple
3. **Testability / verifiability** - Every change must be verifiable
4. **Maintainability (ETC)** - Design to be easier to change
5. **Performance** - Measure first; optimize last

### Working Loop

**Clarify** -> **Map impact** -> **Plan minimal diff** -> **Implement** -> **Validate** -> **Refactor** -> **Report**

### Two Hats Rule

Never add features and refactor simultaneously:
- **Feature hat:** Adding new behavior (tests drive implementation)
- **Refactor hat:** Changing structure (tests preserve behavior)

## Workflow

### 1. Validate Prerequisites

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-claude/scripts/coder-claude.py check
```

### 2. Clarify Requirements

Before generating code:
- Understand the business goal
- Identify constraints and edge cases
- Clarify ambiguous requirements
- Document acceptance criteria

### 3. Execute Generation

**TDD mode (default):**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-claude/scripts/coder-claude.py generate "<requirements>"
```

**Standard mode (explicit opt-out from TDD):**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-claude/scripts/coder-claude.py generate "<requirements>" --no-tdd
```

**Note:** By default, the skill invokes `rd2:tdd-workflow` to enforce the red-green-refactor cycle. Use `--no-tdd` to disable TDD mode.

### 4. Present Results

Output saves to `.claude/plans/[name].md` with:
- YAML frontmatter (metadata, methodology adherence)
- Implementation sections (code, tests, documentation)
- Verification steps
- Residual risks

### 5. Validate and Integrate

1. **Review generated code** for methodology adherence
2. **Run generated tests** to verify correctness
3. **Identify integration points** with existing codebase

## Error Handling

| Error                    | Response                                   |
| ------------------------ | ------------------------------------------ |
| Claude CLI not available | Show installation instructions              |
| Empty generation         | Suggest broader scope or different approach|
| Parse error              | Show generation file format requirements   |
| Timeout                  | Suggest simpler requirements               |

## Tool Comparison

| Aspect     | coder-claude | coder-gemini | coder-auggie |
|------------|-------------|--------------|--------------|
| **Tool**   | Claude CLI  | Gemini CLI   | Auggie MCP   |
| **Setup**  | None        | CLI install  | MCP server   |
| **Context**| Manual      | Manual       | Semantic     |
| **Best For**| Quick impl | Complex arch | Codebase-aware |

**Use coder-claude when:**
- No external tool setup desired
- Quick, simple implementations needed
- Single-file or straightforward features

**Use coder-gemini/auggie when:**
- Need external/fresh perspective
- Complex multi-file generation
- Semantic codebase understanding needed

## TDD Mode

**By default** (when no `--no-tdd` flag is specified), the skill will:

1. **Invoke rd2:tdd-workflow** - The TDD workflow skill enforces the complete red-green-refactor cycle
2. **Generate tests first** - Write failing tests based on requirements
3. **Generate implementation** - Write minimal code to pass tests
4. **Follow red-green-refactor** - Verify each step of the TDD cycle

The `rd2:tdd-workflow` skill ensures:
- **Iron Law**: No production code without a failing test first
- **Red phase**: Write test, verify it fails for the right reason
- **Green phase**: Write minimal code to pass the test
- **Refactor phase**: Clean up while keeping tests green
- **70-80% coverage**: Industry standard for production code

**To disable TDD mode**, use the `--no-tdd` flag:
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-claude/scripts/coder-claude.py generate "<requirements>" --no-tdd
```

## Related Skills

- **code-review-claude** - Code review via Claude (NOT for implementation)
- **coder-gemini** - Gemini-based code generation
- **coder-auggie** - Auggie semantic code generation
- **coder-opencode** - OpenCode multi-model code generation
