---
name: coder-agy
version: 1.0.0
description: This skill should be used when the user asks to "generate code with Antigravity", "use agy for code generation", "use Google AI for coding", or mentions "Antigravity", "agy", or wants Google-based code generation. This skill provides Google Antigravity CLI integration for AI code generation. NOT for code review (use code-review-agy instead).
---

# Coder Antigravity (agy)

Use Google Antigravity CLI (`agy chat`) for **AI code generation** with Google's powerful models. Antigravity provides access to Google's state-of-the-art AI models including Gemini for code generation.

**Critical**: This skill is for code generation ONLY. Use code-review-agy for review tasks.

## Quick Start

```bash
# Check Antigravity CLI availability
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-agy/scripts/coder-agy.py check

# Generate code (TDD enabled by default)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-agy/scripts/coder-agy.py generate "Create a REST API endpoint for user authentication" --output auth-api

# Generate with specific mode
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-agy/scripts/coder-agy.py generate "Implement a cache manager" --mode agent --output cache-manager

# Generate WITHOUT TDD (explicit opt-out)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-agy/scripts/coder-agy.py generate "Quick prototype" --no-tdd --output proto
```

## Available Commands

| Command    | Purpose                          | Use Case                                  |
| ---------- | -------------------------------- | ----------------------------------------- |
| `check`    | Validate Antigravity CLI availability | Run before any Antigravity operation        |
| `run`      | Execute short prompts            | Quick questions, design discussions       |
| `run-file` | Execute long prompts from file   | Complex context, multi-file requirements  |
| `generate` | Comprehensive code generation    | Full implementation with structured output|

## Mode Selection Guide

Antigravity supports multiple modes for code generation:

| Mode    | Best For                              | Speed    |
| ------- | ------------------------------------- | -------- |
| `agent` | Complex tasks with multi-step reasoning | Moderate |
| `ask`   | Quick questions and simple tasks     | Fast     |
| `edit`  | Code editing and refactoring         | Fast     |

**Selection heuristics:**

- **Default:** Uses `agent` mode for comprehensive code generation
- **Override for speed:** `--mode ask` for quick questions
- **Override for editing:** `--mode edit` for refactoring tasks

## Key Advantage: Google AI Models

Unlike other code generation tools:
- **Google's latest models** - Access to state-of-the-art Gemini models
- **Deep code understanding** - Excellent for complex algorithms and architecture
- **Multi-file awareness** - Can handle larger codebases efficiently
- **Smart file context** - Add files directly with `--add-file`

## Super-Coder Methodology Integration

All code generation follows the Super-Coder methodology:

**Decision Priority:** Correctness > Simplicity > Testability > Maintainability > Performance

**Working Loop:** Clarify -> Map impact -> Plan minimal diff -> Implement -> Validate -> Refactor -> Report

**Two Hats Rule:** Never add features and refactor simultaneously.

For complete methodology details, see **`references/methodology.md`**.

## Workflow

### 1. Validate Prerequisites

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-agy/scripts/coder-agy.py check
```

Antigravity CLI must be installed and configured.

### 2. Clarify Requirements

Before generating code:
- Understand the business goal
- Identify constraints and edge cases
- Clarify ambiguous requirements

### 3. Execute Generation

**TDD mode (default):**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-agy/scripts/coder-agy.py generate "<requirements>"
```

**With specific mode:**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-agy/scripts/coder-agy.py generate "<requirements>" \
  --mode agent
```

**With file context:**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-agy/scripts/coder-agy.py generate "<requirements>" \
  --add-file path/to/file.py
```

**Standard mode (explicit opt-out from TDD):**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-agy/scripts/coder-agy.py generate "<requirements>" --no-tdd
```

**Note:** By default, the skill invokes `rd2:tdd-workflow` to enforce the complete red-green-refactor cycle. Use `--no-tdd` to disable TDD mode.

### 4. Present Results

Output saves to `docs/plans/[name].md` with:
- YAML frontmatter (metadata, mode used)
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
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-agy/scripts/coder-agy.py generate "<requirements>" --no-tdd
```

## Error Handling

| Error                    | Response                                   |
| ------------------------ | ------------------------------------------ |
| Antigravity not available | Show installation instructions             |
| Configuration missing     | Show configuration instructions            |
| Mode not available        | List available modes                       |
| Timeout                  | Suggest simpler requirements or retry      |

## Tool Comparison

**Use coder-agy when:**
- Want Google's latest AI models
- Need multi-file context support
- Want smart file addition via `--add-file`
- Prefer Google's Gemini models

**Use coder-claude/gemini/opencode when:**
- Single model is sufficient
- Simpler setup preferred
- Native integration desired
- Multi-model comparison needed

For detailed comparison with alternatives, see **`references/tool-comparison.md`**.

## Installation

To install Antigravity CLI, visit: https://antigravity.google/docs/get-started

```bash
# Download and install Antigravity
# Follow the official installation guide for your platform
```

After installation, verify:
```bash
agy chat --help
```

## Additional Resources

### Scripts
- **`scripts/coder-agy.py`** - Utility script for Antigravity CLI integration with commands:
  - `check` - Validate Antigravity CLI availability
  - `run` - Execute short prompts
  - `run-file` - Execute long prompts from file
  - `generate` - Comprehensive code generation with structured output

### Reference Files
- **`references/methodology.md`** - Complete Super-Coder Methodology with principles and working loop
- **`references/tool-comparison.md`** - Detailed comparison with other code generation tools
- **`references/usage-examples.md`** - Comprehensive examples for all commands and modes

### Related Skills
- **`code-review-agy`** - Code review via Antigravity (NOT for implementation)
- **`coder-claude`** - Claude native code generation
- **`coder-gemini`** - Gemini-based code generation
- **`coder-opencode`** - Multi-model code generation
