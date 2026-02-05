---
name: coder-auggie
description: Use Auggie MCP for codebase-aware AI code generation with semantic understanding. Trigger when user mentions "Auggie code", "semantic generate", "codebase-aware implementation". NOT for code review.
---

# Coder Auggie

Use Auggie MCP for **codebase-aware code generation** with semantic understanding. Auggie indexes your codebase and uses that context to generate code that integrates naturally with existing patterns.

**Critical**: This skill is for code generation ONLY. Use code-review-auggie for review tasks.

## Quick Start

```bash
# Check Auggie MCP availability
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-auggie/scripts/coder-auggie.py check

# Generate code (TDD enabled by default)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-auggie/scripts/coder-auggie.py generate "Create a REST API endpoint for user authentication" --output auth-api

# Generate WITHOUT TDD (explicit opt-out)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-auggie/scripts/coder-auggie.py generate "Quick prototype" --no-tdd --output proto

# Quick prompt with codebase context
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-auggie/scripts/coder-auggie.py run "Explain the current authentication pattern used in this codebase"
```

## Available Commands

| Command    | Purpose                          | Use Case                                  |
| ---------- | -------------------------------- | ----------------------------------------- |
| `check`    | Validate Auggie MCP availability | Run before any Auggie operation           |
| `run`      | Execute short prompts            | Quick questions with codebase context     |
| `run-file` | Execute long prompts from file   | Complex context, multi-file requirements  |
| `generate` | Comprehensive code generation    | Full implementation with semantic context |

## Key Advantage: Semantic Codebase Understanding

Unlike other tools, Auggie:
- **Indexes your codebase** for semantic search
- **Understands existing patterns** and conventions
- **Generates code that matches** your project's style
- **Finds relevant context** automatically

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

## Workflow

### 1. Validate Prerequisites

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-auggie/scripts/coder-auggie.py check
```

Auggie MCP must be running and configured.

### 2. Ensure Codebase is Indexed

Auggie automatically indexes your codebase for semantic search. If index is stale:

```bash
# Refresh index via Auggie MCP
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-auggie/scripts/coder-auggie.py refresh-index
```

### 3. Execute Generation

**TDD mode (default):**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-auggie/scripts/coder-auggie.py generate "<requirements>"
```

**Standard mode (explicit opt-out from TDD):**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-auggie/scripts/coder-auggie.py generate "<requirements>" --no-tdd
```

**Note:** By default, the skill invokes `rd2:tdd-workflow` to enforce the complete red-green-refactor cycle. Use `--no-tdd` to disable TDD mode.

### 4. Present Results

Output saves to `docs/plans/[name].md` with:
- YAML frontmatter (metadata, semantic context used)
- Implementation matching existing patterns
- Tests following project conventions
- Integration notes specific to your codebase

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
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-auggie/scripts/coder-auggie.py generate "<requirements>" --no-tdd
```

## Error Handling

| Error                    | Response                                   |
| ------------------------ | ------------------------------------------ |
| Auggie MCP not available | Show connection instructions               |
| Index not found          | Suggest index refresh                      |
| Empty context            | Suggest broader scope or manual context    |
| Timeout                  | Suggest simpler requirements               |

## Tool Comparison

| Aspect     | coder-auggie | coder-claude | coder-gemini |
|------------|--------------|--------------|--------------|
| **Tool**   | Auggie MCP   | Claude CLI   | Gemini CLI   |
| **Setup**  | MCP server   | None         | CLI install  |
| **Context**| Semantic     | Manual       | Manual       |
| **Best For**| Codebase-aware | Quick impl | Complex arch |

**Use coder-auggie when:**
- Need semantic understanding of existing codebase
- Want generated code to match project patterns
- Integration with existing code is critical
- Understanding dependencies and relationships matters

**Use coder-claude/gemini when:**
- Starting new project (no existing codebase)
- Need external/fresh perspective
- Codebase context not needed

## Related Skills

- **code-review-auggie** - Code review via Auggie (NOT for implementation)
- **coder-claude** - Claude native code generation
- **coder-gemini** - Gemini-based code generation
- **coder-opencode** - OpenCode multi-model code generation
