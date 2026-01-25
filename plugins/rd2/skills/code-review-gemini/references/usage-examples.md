# Code Review Gemini - Usage Examples

Comprehensive examples for all commands and use cases.

## Table of Contents

1. [Security-Focused Review](#security-focused-review)
2. [Quick Architecture Questions](#quick-architecture-questions)
3. [Implementation Planning](#implementation-planning)
4. [Fast Review with Flash Model](#fast-review-with-flash-model)
5. [Import Review Results](#import-review-results)
6. [Advanced Workflows](#advanced-workflows)

---

## Security-Focused Review

**User Request:** "Have Gemini review src/auth/ for security issues"

**Command:**
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review src/auth/ \
  --focus security \
  --output auth-security-review
```

**What it does:**
- Runs comprehensive security analysis on authentication code
- Checks for common vulnerabilities (injection, XSS, auth bypasses)
- Generates structured review in `docs/plans/auth-security-review.md`
- Focuses specifically on security concerns

**Expected output format:**
- Critical security issues (must fix)
- High-priority security concerns (should fix)
- Security best practices recommendations
- Compliance notes (OWASP, CWE references)

---

## Quick Architecture Questions

**User Request:** "Ask Gemini about using microservices vs monolith"

**Command:**
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py run \
  "Compare microservices vs monolith architecture for a 10-person team building an e-commerce platform. Consider trade-offs in development speed, scalability, operational complexity, and team expertise requirements." \
  --model gemini-2.5-flash
```

**When to use:**
- Architectural decision-making
- Quick technical consultation
- Trade-off analysis
- Design pattern selection

**Best practices:**
- Include context (team size, constraints, timeline)
- Specify what trade-offs to consider
- Use `gemini-2.5-flash` for faster responses on simple questions
- Use `gemini-3-flash-preview` (default) for more nuanced analysis

---

## Implementation Planning

**User Request:** "Plan how to add authentication to this app"

**Command:**
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review . \
  --plan \
  --output auth-implementation-plan
```

**What `--plan` mode does:**
- Analyzes existing codebase structure
- Identifies files to create/modify
- Suggests implementation sequence
- Highlights architectural decisions needed
- Provides trade-offs for different approaches
- Does NOT generate implementation code

**Output structure:**
- Architecture overview
- Implementation steps with dependencies
- Trade-offs and decisions
- Risks and blockers
- Success criteria

**Use cases:**
- Feature planning before implementation
- Architecture design for new components
- Refactoring strategy development
- Integration planning

---

## Fast Review with Flash Model

**User Request:** "Quick review of this function using flash"

**Command:**
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review src/utils.py \
  --model gemini-2.5-flash
```

**When to use `gemini-2.5-flash`:**
- Single-file reviews (<500 lines)
- Quick bug checks
- Simple refactoring suggestions
- Rapid iteration during development
- Cost-sensitive batch reviews

**Trade-offs:**
- ✅ Faster response time (~30-50% faster)
- ✅ Lower cost
- ⚠️ Less detailed analysis than pro models
- ⚠️ May miss subtle architectural issues

**Comparison:**

| Model | Speed | Detail | Best For |
|-------|-------|--------|----------|
| `gemini-2.5-flash` | Fast | Good | Single files, quick checks |
| `gemini-3-flash-preview` | Fast | Better | Default balanced approach |
| `gemini-2.5-pro` | Moderate | Excellent | Multi-file, architecture |
| `gemini-3-pro-preview` | Slower | Best | Complex analysis, critical code |

---

## Import Review Results

**User Request:** "Create task files from the code review results"

### Import All Issues

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py import docs/plans/review-auth.md
```

**What it does:**
- Parses structured code review result file
- Extracts all issues from priority sections
- Creates individual task files in `docs/prompts/`
- Updates task Background and Requirements sections
- Provides progress tracking

### Import Critical Issues Only

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py import docs/plans/review-auth.md \
  --priority critical
```

**Use cases:**
- Focus on blocking issues first
- Triage large review results
- Separate urgent vs. nice-to-have fixes

### Import High Priority Issues

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py import docs/plans/review-auth.md \
  --priority high
```

**Priority filtering options:**
- `critical` - Must fix before merge/release
- `high` - Should fix soon
- `medium` - Consider fixing
- `low` - Nice to have

### Task File Structure

Each imported issue creates a task file like:

```markdown
---
wbs: 0001
stage: backlog
---

# Background

**Issue**: SQL Injection Vulnerability
**Priority**: critical
**ID**: CRITICAL-001
**Location**: src/auth/login.py:45
**Review Target**: src/auth/
**Reviewed by**: gemini-3-flash-preview

**Issue Description**:
User input directly concatenated into SQL query

**Impact**:
Allows attackers to execute arbitrary SQL

# Requirements

**Recommended Fix**:
Use parameterized queries or ORM

# Solutions

# References
```

### Workflow Integration

Typical workflow:
```bash
# Step 1: Run comprehensive review
python3 code-review-gemini.py review src/auth/ --output auth-review

# Step 2: Import critical issues as tasks
python3 code-review-gemini.py import docs/plans/auth-review.md --priority critical

# Step 3: Track with tasks CLI
tasks list wip
tasks update 0001 done

# Step 4: Import high priority after critical issues fixed
python3 code-review-gemini.py import docs/plans/auth-review.md --priority high
```

---

## Advanced Workflows

### Multi-Focus Review

Combine multiple focus areas:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review src/ \
  --focus "security,performance,testing" \
  --output comprehensive-review
```

**Available focus areas:**
- `security` - Vulnerabilities, auth, data exposure
- `performance` - Algorithm complexity, N+1 queries, memory
- `testing` - Coverage gaps, edge cases
- `quality` - Readability, maintainability, DRY
- `architecture` - Coupling, cohesion, patterns

### Batch Review with Different Models

Review multiple components with appropriate models:

```bash
# Quick utils review with flash
python3 code-review-gemini.py review src/utils/ --model gemini-2.5-flash --output utils-review

# Critical auth with pro
python3 code-review-gemini.py review src/auth/ --model gemini-2.5-pro --focus security --output auth-review

# Architecture planning with default
python3 code-review-gemini.py review . --plan --output architecture-plan
```

### Custom Timeout for Large Codebases

```bash
# Extend timeout for very large reviews
python3 code-review-gemini.py review src/ \
  --timeout 1200 \
  --model gemini-3-flash-preview \
  --output large-codebase-review
```

**Timeout guidelines:**
- Simple (1-3 files): 300s (5 min) - default
- Moderate (4-10 files): 600s (10 min)
- Complex (10+ files): 900s (15 min)
- Very large: 1200s+ (20+ min)

### Planning Mode with Focus Areas

```bash
python3 code-review-gemini.py review src/payments/ \
  --plan \
  --focus "security,architecture" \
  --output payment-refactor-plan
```

**Best for:**
- Refactoring planning
- Feature addition strategy
- Security hardening plans
- Performance optimization roadmaps

---

## Tips for Effective Reviews

### 1. Be Specific with Context

**Instead of:**
```bash
python3 code-review-gemini.py run "Should I use Redis?"
```

**Do this:**
```bash
python3 code-review-gemini.py run \
  "Should I use Redis or Memcached for session caching in a Django app handling 10k concurrent users? Consider latency, persistence requirements, and operational complexity."
```

### 2. Use Appropriate Model for Task

- **Quick checks**: `gemini-2.5-flash`
- **Balanced default**: `gemini-3-flash-preview` (default)
- **Deep analysis**: `gemini-2.5-pro`
- **Cutting edge**: `gemini-3-pro-preview`

### 3. Leverage Focus Areas

Instead of generic review, target specific concerns:
```bash
--focus security,performance  # For API endpoints
--focus testing,quality       # For utility libraries
--focus architecture          # For new features
```

### 4. Name Your Output Files Meaningfully

```bash
--output auth-security-audit-2024-01
--output payment-refactor-plan
--output pre-release-review
```

### 5. Combine Review + Import for Action

```bash
# Review
python3 code-review-gemini.py review src/ --output my-review

# Import critical and high priority
python3 code-review-gemini.py import docs/plans/my-review.md --priority critical
python3 code-review-gemini.py import docs/plans/my-review.md --priority high

# Track with tasks
tasks list
```

---

## Common Patterns

### Pre-Merge Review Checklist

```bash
# 1. Security check
python3 code-review-gemini.py review src/ --focus security --output pre-merge-security

# 2. Performance review
python3 code-review-gemini.py review src/ --focus performance --output pre-merge-performance

# 3. Import critical issues
python3 code-review-gemini.py import docs/plans/pre-merge-security.md --priority critical
python3 code-review-gemini.py import docs/plans/pre-merge-performance.md --priority critical

# 4. Verify all tasks resolved
tasks list wip
```

### New Feature Planning

```bash
# 1. Plan architecture
python3 code-review-gemini.py review . --plan --output feature-plan

# 2. Quick question for trade-offs
python3 code-review-gemini.py run "Compare approach A vs B for [feature]"

# 3. Review implementation draft
python3 code-review-gemini.py review src/new-feature/ --focus architecture,testing
```

### Refactoring Workflow

```bash
# 1. Analyze current code
python3 code-review-gemini.py review src/legacy/ --focus quality,architecture

# 2. Plan refactor
python3 code-review-gemini.py review src/legacy/ --plan --output refactor-plan

# 3. Review refactored code
python3 code-review-gemini.py review src/refactored/ --focus quality,testing
```

---

## Troubleshooting

### Error: Gemini CLI not found

**Solution:**
```bash
# Check installation
python3 code-review-gemini.py check

# Install if needed
npm install -g @google/gemini-cli
# or
brew install gemini-cli
```

### Error: Timeout

**Solution:**
```bash
# Increase timeout
python3 code-review-gemini.py review src/ --timeout 1200

# Or use faster model
python3 code-review-gemini.py review src/ --model gemini-2.5-flash
```

### Error: No files found

**Solution:**
```bash
# Verify path exists
ls src/auth/

# Use absolute path
python3 code-review-gemini.py review /full/path/to/src/
```

### Error: Import fails

**Solution:**
```bash
# Verify review file exists and has correct format
cat docs/plans/review-file.md

# Check YAML frontmatter is present
head -10 docs/plans/review-file.md
```

---

## See Also

- `references/gemini-flags.md` - Complete CLI flag reference
- `references/import-format.md` - Import command parsing rules
- `references/output-format.md` - Review output structure
- `assets/` - Prompt templates
