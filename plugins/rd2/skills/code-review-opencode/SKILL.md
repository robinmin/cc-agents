---
name: code-review-opencode
agent: Plan
context: fork
user-invocable: false
description: Use OpenCode CLI for code review. Trigger when user mentions "opencode review", "AI-assisted review", "external AI review". NOT for implementation.
---

# Code Review Opencode

Use OpenCode CLI's AI capabilities for **code review** and **architecture assessment**. OpenCode provides access to multiple AI models through a unified CLI interface.

**Critical**: This skill is for planning and review ONLY. Never use code-review-opencode to implement changes.

## Overview

**OpenCode CLI** is a unified command-line interface that provides access to multiple AI models (Claude, GPT-4, Gemini, and more) for code analysis and review. It acts as an AI-powered code review assistant that can:

- Analyze code for security vulnerabilities, performance issues, and quality problems
- Generate implementation plans and architecture recommendations
- Provide actionable feedback with specific file:line references
- Compare results across different AI models

**Key Benefits:**
- **Multi-model access**: Choose the best AI model for each task
- **External AI perspective**: Get analysis outside Claude's native context
- **Structured output**: Consistent format that integrates with task management
- **Flexible pricing**: Select models based on cost/performance needs

## When to Use

Use code-review-opencode when:

| Scenario | Use This Skill Because |
|----------|----------------------|
| User mentions "opencode review", "AI-assisted review", "external AI review" | Direct trigger keywords |
| Need access to multiple AI models (Claude, GPT-4, Gemini) | OpenCode supports model selection |
| Want to compare results from different AI models | Run same review with different models |
| Need external AI perspective (outside Claude's context) | OpenCode uses separate AI service |
| Already have OpenCode CLI installed and configured | Leverage existing setup |
| Want flexible model pricing options | Choose cost-effective models |

**Do NOT use when:**

| Situation | Use Instead |
|-----------|-------------|
| Need quick native Claude review | `code-review-claude` |
| Want semantic codebase search | `code-review-auggie` |
| Only need one specific model | Dedicated tool for that model |
| Implementing code changes | Use task-runner or direct implementation |

## Quick Start

```bash
# Check OpenCode CLI availability
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py check

# Code review
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/auth/

# Architecture planning
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/ --plan

# Import results as tasks
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py import docs/plans/review-src.md
```

## Available Commands

| Command    | Purpose                          |
| ---------- | -------------------------------- |
| `check`    | Validate OpenCode CLI availability  |
| `run`      | Execute short prompts            |
| `run-file` | Execute long prompts from file   |
| `review`   | Comprehensive code review        |
| `import`   | Convert review results to tasks  |

## Workflow

### 1. Validate Prerequisites

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py check
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
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review <target> \
  --focus "security,performance"

# Architecture planning
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review <target> --plan
```

### 4. Present Results

Output saves to `docs/plans/[name].md` with:
- YAML frontmatter (metadata, quality score)
- Priority-based issue sections (Critical/High/Medium/Low)
- Detailed analysis by category
- Actionable recommendations

### 5. Import as Tasks (Optional)

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py import docs/plans/review.md
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
| OpenCode CLI not available | Show installation instructions              |
| Not authenticated          | Prompt to run `opencode auth login`        |
| Empty retrieval          | Suggest broader search or different path   |
| Parse error              | Show review file format requirements       |
| Timeout                  | Suggest simpler query or smaller target     |

## Tool Comparison

| Tool | Best For | Key Benefit |
|------|----------|-------------|
| **code-review-opencode** | Multi-model access | Model selection flexibility |
| **code-review-claude** | Quick native reviews | Fastest, no setup |
| **code-review-auggie** | Large codebase analysis | Semantic search |
| **code-review-gemini** | Gemini-specific features | Gemini Pro's large context |

See [`references/tool-comparison.md`](references/tool-comparison.md) for detailed comparison including setup, costs, and usage examples.

## Model Selection

| Task | Recommended Model | Why |
|------|------------------|-----|
| Security audit | `claude-opus` | Most thorough analysis |
| Quick scan | `claude-haiku` or `gpt-4o-mini` | Fast, cost-effective |
| Code explanation | `claude-3-5-sonnet` | Clear explanations |
| Architecture planning | `gpt-4` or `claude-opus` | Big-picture thinking |

See [`references/best-practices.md`](references/best-practices.md#model-selection) for detailed comparison.

## Detailed Documentation

Comprehensive guides are available in `references/`:

- `references/installation.md` - OpenCode CLI setup and authentication
- `references/usage-examples.md` - Complete command examples and workflows
- `references/opencode-query-patterns.md` - Effective prompt patterns for OpenCode
- `references/tool-comparison.md` - OpenCode vs other review tools
- `references/output-format.md` - Structured output specification
- `references/best-practices.md` - Review quality guidelines
- `references/import-format.md` - Import command parsing and task creation

## Quick Reference

### Effective Reviews

1. **Start with discovery**: Understand the codebase structure
2. **Be specific**: Reference exact file:line locations
3. **Prioritize clearly**: Use Critical/High/Medium/Low
4. **Actionable fixes**: Provide concrete recommendations
5. **Model selection**: Choose appropriate AI model for task

### Token Efficiency

- Provide clear context in prompts
- Specify focus areas to narrow analysis
- Use planning mode for architecture questions
- Review targeted code sections first

## Related Skills

- **code-review-gemini** - Gemini-specific code review
- **code-review-claude** - Claude native code review
- **code-review-auggie** - Semantic codebase review via Auggie MCP
