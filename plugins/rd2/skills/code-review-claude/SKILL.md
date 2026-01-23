---
name: code-review-claude
agent: Plan
context: fork
user-invocable: false
description: Use Claude's native capabilities (Read, Grep, Glob) for code review. Trigger when user mentions "Claude review", "native review", "internal review". NOT for implementation.
---

# Code Review Claude

Use Claude's native codebase analysis capabilities for **code review** and **architecture assessment**. No external tools required—Claude uses Read, Grep, and Glob directly via a subprocess-isolated script.

**Critical**: This skill is for planning and review ONLY. Never use code-review-claude to implement changes.

## Quick Start

```bash
# Check Claude CLI availability
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py check

# Code review
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/auth/

# Architecture planning
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/ --plan

# Import results as tasks
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py import .claude/plans/review-src.md
```

## Available Commands

| Command    | Purpose                          |
| ---------- | -------------------------------- |
| `check`    | Validate Claude CLI availability  |
| `run`      | Execute short prompts            |
| `run-file` | Execute long prompts from file   |
| `review`   | Comprehensive code review        |
| `import`   | Convert review results to tasks  |

## Workflow

### 1. Validate Prerequisites

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py check
```

### 2. Determine Review Mode

| User Request              | Mode        | Flag      |
| ------------------------- | ----------- | --------- |
| "Review this code"        | Code Review | (default) |
| "Plan how to implement X" | Planning    | `--plan`  |
| "Analyze architecture"    | Planning    | `--plan`  |

### 3. Execute Review

```bash
# Code review with focus areas
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review <target> \
  --focus "security,performance"

# Architecture planning
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review <target> --plan
```

### 4. Present Results

Output saves to `.claude/plans/[name].md` with:
- YAML frontmatter (metadata, quality score)
- Priority-based issue sections (Critical/High/Medium/Low)
- Detailed analysis by category
- Actionable recommendations

### 5. Import as Tasks (Optional)

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py import .claude/plans/review.md
```

## Focus Areas

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
| Claude CLI not available | Show installation instructions              |
| Empty retrieval          | Suggest broader search or different path   |
| Parse error              | Show review file format requirements       |
| Timeout                  | Suggest simpler query or smaller target     |

## Tool Comparison

| Aspect     | code-review-claude | code-review-gemini | code-review-auggie |
|------------|-------------------|---------------------|-------------------|
| **Tool**   | Claude CLI (native) | Gemini CLI | Auggie MCP |
| **Setup**  | Claude Code required | CLI install | MCP server |
| **Context**| Manual discovery | Manual files | Semantic index |
| **Best For**| Quick reviews | External perspective | Codebase-aware |

**Use code-review-claude when:**
- No external tool setup desired
- Quick, targeted review needed
- Simple codebase structure

**Use code-review-gemini/auggie when:**
- Need external/fresh perspective
- Want semantic codebase search
- Complex architecture analysis

## Detailed Documentation

Comprehensive guides are available in `references/`:

- `usage-examples.md` - Complete command examples and workflows
- `claude-query-patterns.md` - Effective patterns for Read/Grep/Glob
- `tool-comparison.md` - Detailed comparison with alternatives
- `output-format.md` - Structured output specification
- `best-practices.md` - Code review quality guidelines
- `import-format.md` - Import command parsing and task creation

## Quick Reference

### Effective Reviews

1. **Start with discovery**: Use Glob/Grep to understand scope
2. **Read strategically**: Focus on changed/complex files first
3. **Be specific**: Reference exact file:line locations
4. **Prioritize clearly**: Use Critical/High/Medium/Low
5. **Actionable fixes**: Provide concrete recommendations

### Query Patterns

```bash
# Find all files in scope
Glob: "src/**/*.py"

# Search for specific patterns
Grep: "sql.*SELECT.*from.*user"  # Potential SQL injection
Grep: "def.*test_.*:"              # Find test functions
Grep: "import.*requests"            # Find HTTP calls

# Cross-reference
Grep: "from.*auth.*import"          # Find auth module usage
```

### Token Efficiency

- Use Glob to define scope before reading files
- Use Grep to find relevant code sections
- Read only files that matter for review
- Avoid reading entire codebase unnecessarily

## Related Skills

- **code-review-gemini** - External analysis via Gemini CLI
- **code-review-auggie** - Semantic codebase review via Auggie MCP
- **code-review-opencode** - External analysis via OpenCode CLI (multi-model)
