---
description: Unified code review with auto-selection of gemini/claude/auggie/opencode tools
skills:
  - rd2:code-review-common
  - rd2:code-review-gemini
  - rd2:code-review-claude
  - rd2:code-review-auggie
  - rd2:code-review-opencode
  - rd2:cc-agents
argument-hint: <target> [--tool auto|gemini|claude|auggie|opencode] [--focus security|performance|testing|quality|architecture|comprehensive] [--plan]
---

# Super Code Reviewer

Unified code review coordinator that intelligently selects the optimal review tool (gemini/claude/auggie/opencode) based on code characteristics, or uses explicit tool choice.

**IMPORTANT** [Q4 FROM TASK 0061]: This handles **CODE REVIEW** (implementation quality at Step 9-10), not **SOLUTION REVIEW** (architecture/design at Step 3). Solution review is handled by `super-architect` when needed.

## Quick Start

```bash
# Auto-select best tool (recommended)
/rd2:code-review src/auth/

# Specify tool explicitly
/rd2:code-review --tool gemini src/auth/
/rd2:code-review --tool claude src/utils/
/rd2:code-review --tool auggie src/payment/
/rd2:code-review --tool opencode src/api/

# Focus on specific areas
/rd2:code-review --focus security,performance src/api/

# Architecture planning mode
/rd2:code-review --plan src/
```

## Arguments

| Argument  | Required | Description                                                                                             |
| --------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `target`  | Yes      | Path to code (file or directory)                                                                        |
| `--tool`  | No       | Tool: `auto` (default), `gemini`, `claude`, `auggie`, `opencode`                                        |
| `--focus` | No       | Focus areas: `security`, `performance`, `testing`, `quality` (default), `architecture`, `comprehensive` |
| `--plan`  | No       | Enable architecture planning mode                                                                       |

## Tool Selection (Auto Mode)

When `--tool auto` or not specified:

| Characteristics    | Tool           | Best For                  | Speed    | Setup       |
| ------------------ | -------------- | ------------------------- | -------- | ----------- |
| < 500 LOC          | `claude`       | Quick reviews             | Fast     | None        |
| 500-2000 LOC       | `gemini-flash` | Balanced analysis         | Moderate | CLI install |
| > 2000 LOC         | `gemini-pro`   | Complex/Security analysis | Moderate | CLI install |
| Semantic context   | `auggie`       | Codebase-aware indexing   | Fast     | MCP server  |
| Multi-model access | `opencode`     | External AI perspective   | Variable | CLI + auth  |

## Focus Areas

| Area            | What It Checks                                     |
| --------------- | -------------------------------------------------- |
| `security`      | Injection, auth flaws, data exposure               |
| `performance`   | Algorithm complexity, N+1 queries, memory          |
| `testing`       | Coverage gaps, edge cases                          |
| `quality`       | Readability, maintainability, DRY                  |
| `architecture`  | Coupling, cohesion, patterns                       |
| `comprehensive` | ALL focus areas (may run all tools and synthesize) |

Combine: `--focus security,performance,testing`

## Workflow

1. **Select Tool** - Use `--tool` or auto-select based on code size/complexity
2. **Execute Review** - Delegate to selected `rd2:code-review-*` skill with `--focus`/`--plan`
3. **Present Results** - Display tool attribution, findings by priority, next steps

## Examples

```bash
# Security-focused (auto-selects gemini-pro)
/rd2:code-review --focus security src/auth/

# Quick PR review (fast native)
/rd2:code-review --tool claude pr-1234/

# Semantic architecture review
/rd2:code-review --tool auggie --focus architecture src/

# External AI review (multi-model)
/rd2:code-review --tool opencode src/payment/

# Architecture planning
/rd2:code-review --plan src/
```

## Output Format

Results saved to `.claude/plans/[name].md` with YAML frontmatter:

```yaml
---
type: code-review
tool: {gemini|claude|auggie|opencode}
model: {model_name}
target: {target_path}
focus_areas: {areas}
quality_score: {X}/10
recommendation: {Approve|Request Changes}
---
```

Followed by: Executive Summary, Critical/High/Medium/Low Issues, Detailed Analysis, Overall Assessment.

## Next Steps

```bash
# Import issues as tasks
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-{tool}/scripts/code-review-{tool}.py import .claude/plans/review.md

# Re-review with different tool/focus
/rd2:code-review --tool gemini --focus testing,quality src/
```

## Error Handling

| Error            | Resolution                               |
| ---------------- | ---------------------------------------- |
| Tool unavailable | Suggests alternative, offers to switch   |
| Invalid target   | Shows path error, suggests valid paths   |
| Invalid option   | Displays valid options with examples     |
| Timeout          | Suggests simpler query or different tool |

## Two-Level Review Process [Q4 FROM TASK 0061]

### Solution Review vs Code Review

**Solution Review** (Architecture & Design Level - Step 3, Optional):

- Validates the overall approach and architecture decisions
- Checks if the solution addresses the actual requirements
- Evaluates design patterns, system architecture, scalability
- Reviews integration points and system boundaries
- Assesses security, performance, maintainability at design level
- **Owner**: `super-planner` delegates to `super-architect` when needed
- **When**: During design phase (Step 3 in workflow)

**Code Review** (Implementation Quality Level - Step 9-10, Mandatory):

- Validates code quality, style, and best practices
- Checks for bugs, edge cases, error handling
- Reviews test coverage and test quality
- Verifies adherence to coding standards
- Assesses documentation and code comments
- **Owner**: `code-review` command (via rd2:code-review-common skill and super-code-reviewer agent)
- **When**: After implementation complete (Step 9-10 in workflow)

### Workflow Integration

```
Step 3: Solution Review (optional, if complex)
        ↓
super-architect validates architecture/design
        ↓
Step 7: Implementation (super-coder)
        ↓
Step 9-10: Code Review (mandatory) ← YOU ARE HERE
        ↓
code-review validates implementation
        ↓
Step 10: Mark as Done
```

### What This Command Validates

**Code Review Scope (Step 9-10):**

- Code quality and style
- Best practices adherence
- Bug detection and edge cases
- Error handling completeness
- Test coverage and test quality
- Documentation quality
- Performance issues
- Security vulnerabilities in implementation

**NOT in Scope (handled by super-architect):**

- Overall architecture decisions
- Design pattern selection
- System boundaries and integration
- High-level scalability
- Technology stack choices

## Design Philosophy

**Fat Skills, Thin Wrappers** - This command is a thin coordinator; all review logic lives in `rd2:code-review-*` skills. Auto-selection is the only added value.

## See Also

- `rd2:code-review-gemini` - Gemini-based code review
- `rd2:code-review-claude` - Claude native code review
- `rd2:code-review-auggie` - Auggie semantic code review
- `rd2:code-review-opencode` - OpenCode multi-model code review
