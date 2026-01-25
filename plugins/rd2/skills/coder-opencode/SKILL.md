---
name: coder-opencode
agent: Plan
context: fork
user-invocable: false
description: Use OpenCode CLI for multi-model AI code generation with external AI perspective. Trigger when user mentions "OpenCode", "multi-model generate", "external AI perspective". NOT for code review.
---

# Coder OpenCode

Use OpenCode CLI for **multi-model code generation**. OpenCode provides access to multiple AI backends (OpenAI, Anthropic, local models) for diverse perspectives on code generation.

**Critical**: This skill is for code generation ONLY. Use code-review-opencode for review tasks.

## Quick Start

```bash
# Check OpenCode CLI availability
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-opencode/scripts/coder-opencode.py check

# Generate code (TDD enabled by default)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-opencode/scripts/coder-opencode.py generate "Create a REST API endpoint for user authentication" --output auth-api

# Generate with specific model
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-opencode/scripts/coder-opencode.py generate "Implement a cache manager" --model gpt-4o --output cache-manager

# Generate WITHOUT TDD (explicit opt-out)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-opencode/scripts/coder-opencode.py generate "Quick prototype" --no-tdd --output proto
```

## Available Commands

| Command    | Purpose                          | Use Case                                  |
| ---------- | -------------------------------- | ----------------------------------------- |
| `check`    | Validate OpenCode CLI availability | Run before any OpenCode operation        |
| `run`      | Execute short prompts            | Quick questions, design discussions       |
| `run-file` | Execute long prompts from file   | Complex context, multi-file requirements  |
| `generate` | Comprehensive code generation    | Full implementation with structured output|

## Model Selection Guide

OpenCode supports multiple AI providers:

| Model          | Best For                              | Speed    |
| -------------- | ------------------------------------- | -------- |
| `gpt-4o`       | General purpose, fast                 | Fast     |
| `gpt-4-turbo`  | Complex reasoning                     | Moderate |
| `claude-3-opus`| Deep analysis, nuanced code           | Slower   |
| `claude-3-sonnet`| Balanced speed/quality              | Moderate |
| `local/codellama`| Privacy-sensitive, offline          | Variable |

**Selection heuristics:**

- **Default:** Uses OpenCode's configured default model
- **Override for speed:** `--model gpt-4o`
- **Override for quality:** `--model gpt-4-turbo` or `--model claude-3-opus`
- **Privacy-sensitive:** `--model local/codellama`

## Key Advantage: External Perspective

Unlike Claude-native generation:
- **Fresh perspective** from different AI models
- **Cross-model validation** - compare approaches
- **Diverse training data** - different knowledge bases
- **Offline options** - local model support

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
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-opencode/scripts/coder-opencode.py check
```

OpenCode CLI must be installed and configured with API keys.

### 2. Clarify Requirements

Before generating code:
- Understand the business goal
- Identify constraints and edge cases
- Clarify ambiguous requirements

### 3. Execute Generation

**TDD mode (default):**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-opencode/scripts/coder-opencode.py generate "<requirements>"
```

**With specific model:**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-opencode/scripts/coder-opencode.py generate "<requirements>" \
  --model gpt-4o
```

**Standard mode (explicit opt-out from TDD):**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-opencode/scripts/coder-opencode.py generate "<requirements>" --no-tdd
```

**Note:** By default, the skill invokes `rd2:tdd-workflow` to enforce the complete red-green-refactor cycle. Use `--no-tdd` to disable TDD mode.

### 4. Present Results

Output saves to `docs/plans/[name].md` with:
- YAML frontmatter (metadata, model used)
- Implementation sections
- Tests (if TDD mode)
- Verification steps

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
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-opencode/scripts/coder-opencode.py generate "<requirements>" --no-tdd
```

## Error Handling

| Error                    | Response                                   |
| ------------------------ | ------------------------------------------ |
| OpenCode not available   | Show installation instructions             |
| API key missing          | Show configuration instructions            |
| Model not available      | List available models                      |
| Timeout                  | Suggest simpler requirements or faster model|

## Tool Comparison

| Aspect     | coder-opencode | coder-claude | coder-gemini |
|------------|----------------|--------------|--------------|
| **Tool**   | OpenCode CLI   | Claude CLI   | Gemini CLI   |
| **Models** | Multiple       | Claude only  | Gemini only  |
| **Setup**  | CLI + API keys | None         | CLI install  |
| **Best For**| Multi-model   | Quick impl   | Complex arch |

**Use coder-opencode when:**
- Want external AI perspective
- Need multi-model comparison
- Privacy requires local models
- Want to leverage specific model strengths

**Use coder-claude/gemini when:**
- Single model is sufficient
- Simpler setup preferred
- Native integration desired

## Related Skills

- **code-review-opencode** - Code review via OpenCode (NOT for implementation)
- **coder-claude** - Claude native code generation
- **coder-gemini** - Gemini-based code generation
- **coder-auggie** - Auggie semantic code generation
