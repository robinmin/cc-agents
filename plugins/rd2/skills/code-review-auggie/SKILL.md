---
name: code-review-auggie
agent: Plan
context: fork
user-invocable: false
description: Use Augment Context Engine (Auggie) MCP for code review and architecture planning. Trigger when user mentions "Auggie", "codebase retrieval", "augmented review". NOT for implementation.
---

# Code Review Auggie

Use Augment Context Engine (Auggie) MCP as a **code review oracle** and **architecture analyzer**. Auggie provides semantic codebase search and context-aware analysis; Claude synthesizes and presents to the user.

**Critical**: This skill is for planning and review ONLY. Never use Auggie to implement changes.

## Quick Start

```bash
# Check availability
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py check

# Code review
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review src/auth/

# Architecture planning
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review src/ --plan

# Import results as tasks
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py import .claude/plans/review-src.md
```

## Available Commands

| Command    | Purpose                          |
| ---------- | -------------------------------- |
| `check`    | Validate Auggie MCP availability  |
| `run`      | Execute short prompts            |
| `run-file` | Execute long prompts from file   |
| `review`   | Comprehensive code review        |
| `import`   | Convert review results to tasks  |

## Workflow

### 1. Validate Prerequisites

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py check
```

### 2. Determine Review Mode

| User Request              | Mode        | Flag      |
| ------------------------- | ----------- | --------- |
| "Review this code"        | Code Review | (default) |
| "Plan how to implement X" | Planning    | `--plan`  |
| "Analyze architecture"    | Planning    | `--plan`  |

### 3. Execute Review

```bash
# Code review with focus
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review <target> \
  --focus "security,performance"

# Architecture planning
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review <target> --plan
```

### 4. Present Results

Output saves to `.claude/plans/[name].md` with:
- YAML frontmatter (metadata, quality score)
- Priority-based issue sections (Critical/High/Medium/Low)
- Detailed analysis by category
- Actionable recommendations

### 5. Import as Tasks (Optional)

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py import .claude/plans/review.md
```

## Focus Areas

Use `--focus` to target specific aspects:

| Area         | Checks                              |
| ------------ | ----------------------------------- |
| `security`   | Injection, auth flaws, data exposure |
| `performance`| Complexity, N+1 queries, memory     |
| `testing`    | Coverage gaps, edge cases           |
| `quality`    | Readability, maintainability        |
| `architecture`| Coupling, cohesion, patterns        |
| `comprehensive`| ALL focus areas (full review)      |

Example: `--focus "security,performance"` or `--focus "comprehensive"` for full review

## Error Handling

| Error                    | Response                                   |
| ------------------------ | ------------------------------------------ |
| Auggie MCP not available | Show MCP server installation instructions  |
| Empty retrieval          | Suggest broader search or different path   |
| Parse error              | Show review file format requirements       |

## Auggie vs Gemini

| Aspect     | Gemini                    | Auggie                  |
| ---------- | ------------------------- | ----------------------- |
| Interface  | Subprocess (CLI)          | MCP tool                |
| Context    | Manual file gathering     | Semantic codebase index |
| Best For   | External analysis         | Context-aware review    |

See `references/tool-comparison.md` for detailed comparison.

## Detailed References

- `references/usage-examples.md` - Comprehensive command examples
- `references/auggie-query-patterns.md` - Effective query patterns
- `references/tool-comparison.md` - Auggie vs Gemini comparison
- `references/output-format.md` - Structured output specification
- `references/best-practices.md` - Review quality guidelines
- `references/import-format.md` - Import command parsing

## Auggie Documentation

- [Quickstart](https://docs.augmentcode.com/context-services/mcp/quickstart-claude-code)
- [CLI Reference](https://docs.augmentcode.com/cli/reference)

## Related Skills

- **code-review-gemini** - Same interface using Gemini CLI
- **code-review-claude** - Same interface using Claude native capabilities
- **code-review-opencode** - Same interface using OpenCode CLI (multi-model)
