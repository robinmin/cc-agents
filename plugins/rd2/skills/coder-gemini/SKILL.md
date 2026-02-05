---
name: coder-gemini
description: Use Google Gemini CLI for AI-assisted code generation. Trigger when user mentions "Gemini code", "ask Gemini to implement", "Gemini generate". NOT for code review.
---

# Coder Gemini

Use Google Gemini CLI as a **code generation oracle**. Gemini analyzes requirements and generates code; Claude validates and integrates the results.

**Critical**: This skill is for code generation ONLY. Use code-review-gemini for review tasks.

## Quick Start

```bash
# Validate Gemini CLI
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-gemini/scripts/coder-gemini.py check

# Generate code (TDD enabled by default)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-gemini/scripts/coder-gemini.py generate "Create a REST API endpoint for user authentication" --output auth-api

# Generate WITHOUT TDD (explicit opt-out)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-gemini/scripts/coder-gemini.py generate "Quick prototype" --no-tdd --output proto

# Quick prompt
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-gemini/scripts/coder-gemini.py run "Explain the best approach for implementing rate limiting"
```

## Available Commands

| Command    | Purpose                          | Use Case                                  |
| ---------- | -------------------------------- | ----------------------------------------- |
| `check`    | Validate Gemini CLI availability | Run before any Gemini operation           |
| `run`      | Execute short prompts            | Quick questions, design discussions       |
| `run-file` | Execute long prompts from file   | Complex context, multi-file requirements  |
| `generate` | Comprehensive code generation    | Full implementation with structured output|

## Model Selection Guide

| Model                              | Best For                                          | Speed    | Cost     |
| ---------------------------------- | ------------------------------------------------- | -------- | -------- |
| `gemini-2.5-pro`                   | Complex multi-file generation, architecture       | Moderate | Higher   |
| `gemini-2.5-flash`                 | Quick implementations, single-file generation     | Fast     | Lower    |
| `gemini-3-pro-preview`             | State-of-the-art reasoning (preview)              | Slower   | Highest  |
| `gemini-3-flash-preview` (default) | Balanced capability/speed (preview)               | Fast     | Moderate |

**Selection heuristics:**

- **Default:** `gemini-3-flash-preview` (balanced speed/capability for most tasks)
- **Override to gemini-2.5-pro:** Complex multi-file generation, architectural implementations
- **Override to gemini-2.5-flash:** Simple single-file implementations, speed priority

## Super-Coder Methodology Integration

All code generation follows these principles:

### Decision Priority

1. **Correctness & invariants** - Code must work; invalid states are impossible
2. **Simplicity (KISS > DRY)** - Manage complexity; simple changes should be simple
3. **Testability / verifiability** - Every change must be verifiable
4. **Maintainability (ETC)** - Design to be easier to change
5. **Performance** - Measure first; optimize last

### Working Loop

**Clarify** → **Map impact** → **Plan minimal diff** → **Implement** → **Validate** → **Refactor** → **Report**

### Two Hats Rule

Never add features and refactor simultaneously:
- **Feature hat:** Adding new behavior (tests drive implementation)
- **Refactor hat:** Changing structure (tests preserve behavior)

## Workflow

### 1. Validate Prerequisites

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-gemini/scripts/coder-gemini.py check
```

If this fails, display installation instructions and abort.

### 2. Clarify Requirements

Before generating code:
- Understand the business goal
- Identify constraints and edge cases
- Clarify ambiguous requirements
- Document acceptance criteria

### 3. Execute Generation

**TDD mode (default):**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-gemini/scripts/coder-gemini.py generate "<requirements>" \
  --model gemini-2.5-pro
```

**Standard mode (explicit opt-out from TDD):**

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-gemini/scripts/coder-gemini.py generate "<requirements>" \
  --no-tdd \
  --model gemini-2.5-pro
```

**Note:** By default, the skill invokes `rd2:tdd-workflow` to enforce the red-green-refactor cycle. Use `--no-tdd` to disable TDD mode.

### 4. Present Results

Generation output is automatically saved to `docs/plans/[name].md` in a structured format:

- **YAML frontmatter** with metadata (model, target, methodology adherence)
- **Implementation sections** (code, tests, documentation)
- **Verification steps** (how to validate the implementation)
- **Residual risks** (known limitations, edge cases)

Present findings with clear attribution:

```markdown
## Gemini Generation

[Generated content from docs/plans/...]

---

Model: gemini-2.5-pro
Methodology: super-coder (Correctness → Simplicity → Testability)
Verification: [test commands]
```

### 5. Validate and Integrate

After presenting Gemini's generation:

1. **Review generated code** for methodology adherence
2. **Run generated tests** to verify correctness
3. **Identify integration points** with existing codebase
4. **Document residual risks** if tests were incomplete

## Error Handling

| Error                | Response                             |
| -------------------- | ------------------------------------ |
| Gemini not installed | Show installation instructions       |
| Gemini timeout       | Suggest simpler requirements or flash model |
| API rate limit       | Wait and retry, or inform user       |
| Empty response       | Retry once, then report failure      |
| Invalid requirements | Ask for clarification                |

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
python3 ${CLAUDE_PLUGIN_ROOT}/skills/coder-gemini/scripts/coder-gemini.py generate "<requirements>" --no-tdd
```

Output structure in TDD mode:

```markdown
## TDD Workflow Execution

[rd2:tdd-workflow will guide through the complete cycle]

## Generated Tests
[Test code - generated first]

## Generated Implementation
[Implementation code - generated to pass tests]

## Verification
[Commands to run tests and verify coverage]
```

## Structured Output Format

Code generation uses a structured template:

```yaml
---
type: gemini-code-generation
version: 1.0
model: gemini-2.5-pro
requirements: "..."
mode: standard|tdd
methodology: super-coder
---
```

**Key sections:**
- **Requirements Summary** - What was requested
- **Generated Code** - Implementation with file structure
- **Generated Tests** - Test suite (if TDD or tests requested)
- **Verification Steps** - How to validate
- **Integration Notes** - How to integrate with codebase
- **Residual Risks** - Known limitations

## Related Skills

- **code-review-gemini** - Code review via Gemini CLI (NOT for implementation)
- **coder-claude** - Claude native code generation
- **coder-auggie** - Auggie semantic code generation
- **coder-opencode** - OpenCode multi-model code generation
