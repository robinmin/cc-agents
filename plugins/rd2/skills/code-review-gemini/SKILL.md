---
name: code-review-gemini
agent: Plan
context: fork
user-invocable: false
description: Use Google Gemini CLI for code review and architecture planning. Trigger when user mentions "Gemini", "ask Gemini", "second opinion". NOT for implementation.
---

# Gemini Oracle

Use Google Gemini CLI as a **planning oracle** and **code reviewer**. Gemini provides analysis and recommendations; Claude synthesizes and presents to the user.

**Critical**: This skill is for planning and review ONLY. Never use Gemini to implement changes.

## Quick Start

```bash
# Validate Gemini CLI
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py check

# Code review
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review src/auth/

# Architecture planning
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review src/ --plan

# Quick prompt
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py run "Explain the trade-offs of using Redis vs Memcached"

# Import review results as tasks
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py import .claude/plans/review-src.md
```

## Available Commands

| Command    | Purpose                          | Use Case                                  |
| ---------- | -------------------------------- | ----------------------------------------- |
| `check`    | Validate Gemini CLI availability | Run before any Gemini operation           |
| `run`      | Execute short prompts            | Quick questions, explanations             |
| `run-file` | Execute long prompts from file   | Complex context, multi-file analysis      |
| `review`   | Comprehensive code review        | Full code analysis with structured output |
| `import`   | Convert review results to tasks  | Generate task files for issue tracking    |

## Model Selection Guide

| Model                              | Best For                                          | Speed    | Cost     |
| ---------------------------------- | ------------------------------------------------- | -------- | -------- |
| `gemini-2.5-pro`                   | Complex analysis, multi-file review, architecture | Moderate | Higher   |
| `gemini-2.5-flash`                 | Quick feedback, single-file review                | Fast     | Lower    |
| `gemini-2.5-flash-lite`            | High-volume, cost-sensitive tasks                 | Fastest  | Lowest   |
| `gemini-3-pro-preview`             | State-of-the-art reasoning (preview)              | Slower   | Highest  |
| `gemini-3-flash-preview` (default) | Balanced capability/speed (preview)               | Fast     | Moderate |

**Selection heuristics:**

- **Default:** `gemini-3-flash-preview` (balanced speed/capability for most tasks)
- **Override to gemini-2.5-pro:** Complex multi-file analysis, architecture planning, security audits
- **Override to gemini-2.5-flash:** User explicitly requests speed or simple single-file tasks

## Workflow

### 1. Validate Prerequisites

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py check
```

If this fails, display installation instructions and abort.

### 2. Determine Review Mode

| User Request              | Mode        | Command Flag |
| ------------------------- | ----------- | ------------ |
| "Review this code"        | Code Review | (default)    |
| "Plan how to implement X" | Planning    | `--plan`     |
| "Analyze architecture"    | Planning    | `--plan`     |
| "Find bugs in this"       | Code Review | (default)    |

### 3. Execute Review

**Code Review** (default):

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review <target> \
  --model gemini-2.5-pro \
  --focus "security,performance"
```

**Architecture Planning**:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review <target> \
  --plan \
  --model gemini-2.5-pro
```

### 4. Present Results

Review output is automatically saved to `.claude/plans/[name].md` in a structured format using the code-review-result template. The output includes:

- **YAML frontmatter** with metadata (model, target, quality score, recommendation)
- **Structured sections** (Critical/High/Medium/Low priority issues)
- **Detailed analysis** (Security, Performance, Code Quality, Testing)
- **Overall assessment** (Strengths, Improvements, Follow-up actions)

Present findings with clear attribution:

```markdown
## Gemini Analysis

[Review content from .claude/plans/...]

---

Model: gemini-2.5-pro
Quality Score: 8/10
Recommendation: Request Changes
```

### 5. Synthesize and Act

After presenting Gemini's analysis:

1. **Identify critical issues** requiring immediate attention
2. **Summarize key recommendations** in order of priority
3. **If multiple approaches exist**, use `AskUserQuestion` to clarify preference
4. **Write action plan** to `~/.claude/plans/[plan-name].md`
5. **Call `ExitPlanMode`** to present for user approval

## Focus Areas

Use `--focus` to prioritize specific review aspects:

| Focus Area     | What It Checks                            |
| -------------- | ----------------------------------------- |
| `security`     | Injection, auth flaws, data exposure      |
| `performance`  | Algorithm complexity, N+1 queries, memory |
| `testing`      | Coverage gaps, edge cases                 |
| `quality`      | Readability, maintainability, DRY         |
| `architecture` | Coupling, cohesion, patterns              |
| `comprehensive`| ALL focus areas (full review)             |

Example: `--focus "security,performance"` or `--focus "comprehensive"` for full review

## Error Handling

| Error                | Response                             |
| -------------------- | ------------------------------------ |
| Gemini not installed | Show installation instructions       |
| Gemini timeout       | Suggest simpler query or flash model |
| API rate limit       | Wait and retry, or inform user       |
| Empty response       | Retry once, then report failure      |
| No files found       | Verify target path exists            |

## Usage Examples

See `references/usage-examples.md` for comprehensive examples.

### Quick Start Examples

**Security Review:**
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review src/auth/ \
  --focus security \
  --output auth-security-review
```

**Architecture Planning:**
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review . \
  --plan \
  --output feature-implementation-plan
```

**Import Critical Issues as Tasks:**
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py import .claude/plans/review-auth.md \
  --priority critical
```

For more examples including multi-focus reviews, batch workflows, and advanced patterns, see `references/usage-examples.md`.

## Best Practices for Effective Reviews

### Prompting Tips

1. **Be specific about context**: Include relevant constraints, team size, timeline
2. **Specify output format**: Request structured output for actionable items
3. **Focus the review**: Use `--focus` to prioritize what matters most
4. **Provide acceptance criteria**: Help Gemini understand what "good" looks like

### When to Use Each Model

| Scenario                | Recommended Model      |
| ----------------------- | ---------------------- |
| PR review (< 500 lines) | `gemini-2.5-flash`     |
| Architecture analysis   | `gemini-2.5-pro`       |
| Security audit          | `gemini-2.5-pro`       |
| Quick question          | `gemini-2.5-flash`     |
| Complex reasoning       | `gemini-3-pro-preview` |

### Review Quality Indicators

Good reviews from Gemini should include:

- Specific file and line references
- Severity ratings (Critical/High/Medium/Low)
- Clear impact descriptions
- Actionable fix recommendations

If reviews lack these, consider:

- Providing more context
- Using a more capable model
- Narrowing the review scope

## Structured Output Format

Code reviews (not planning) are formatted using a structured template that serves as a communication protocol for further actions:

```yaml
---
type: gemini-code-review
version: 1.0
model: gemini-2.5-pro
target: src/auth/
mode: review
focus_areas: security,performance
quality_score: 8
recommendation: Request Changes
files_reviewed: 5
---
```

**Key sections:**
- **Executive Summary** - High-level overview
- **Critical Issues (Must Fix)** - Blocking issues that must be resolved
- **High Priority Issues (Should Fix)** - Important improvements
- **Medium Priority Issues (Consider Fixing)** - Suggested enhancements
- **Low Priority Issues (Nice to Have)** - Optional improvements
- **Detailed Analysis** - Security, Performance, Quality, Testing
- **Overall Assessment** - Strengths, improvements, next steps

**Benefits:**
- Machine-readable metadata (YAML frontmatter)
- Human-readable content (Markdown sections)
- Enables automated task generation via `import` command
- Consistent structure across reviews
- Easy to parse for further processing

**Priority Section Format:**

Issues can be formatted in two ways:

1. **Structured format** (recommended for `import` command):
```markdown
## Critical Issues (Must Fix)

**[CRITICAL-001]** SQL Injection Vulnerability
- **Location**: src/auth/login.py:45
- **Issue**: User input directly concatenated into SQL query
- **Impact**: Allows attackers to execute arbitrary SQL
- **Fix**: Use parameterized queries or ORM
```

2. **Simple bullet format**:
```markdown
## High Priority Issues (Should Fix)

- Missing input validation on user registration form
- No rate limiting on API endpoints
- Passwords stored without hashing
```

Both formats are supported by the `import` command for task file generation.

## Additional Resources

### Reference Files

- **`references/usage-examples.md`** - Comprehensive examples for all commands and workflows
- **`references/import-format.md`** - Detailed import command parsing rules and format specifications
- **`references/gemini-flags.md`** - Complete model and CLI flag documentation

### Prompt Templates

- **`assets/planning_prompt.md`** - Architecture planning template
- **`assets/review_prompt.md`** - Code review template
- **`assets/code-review-result.md`** - Structured output template

### Scripts

- **`scripts/code-review-gemini.py`** - Main CLI tool with all commands (1,511 lines, 98/98 tests passing)
