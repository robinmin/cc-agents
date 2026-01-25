# Code Review Best Practices

Guidelines for conducting effective code reviews with OpenCode CLI.

## Table of Contents

- [Core Principles](#core-principles)
- [Mode Selection Guide](#mode-selection-guide)
- [Review Workflow](#review-workflow)
- [Issue Classification](#issue-classification)
- [OpenCode-Specific Best Practices](#opencode-specific-best-practices)
- [Review Templates](#review-templates)
- [Writing Effective Reviews](#writing-effective-reviews)
- [Quality Score Guidelines](#quality-score-guidelines)

## Core Principles

1. **Be Specific** - Reference exact file:line locations
2. **Be Actionable** - Provide concrete fix recommendations
3. **Be Prioritized** - Use Critical/High/Medium/Low consistently
4. **Be Respectful** - Focus on code, not people
5. **Be Thorough** - Cover security, performance, quality, testing

## Mode Selection Guide

### Review Mode vs Planning Mode

| Use Review Mode when: | Use Planning Mode when: |
|----------------------|------------------------|
| Analyzing existing code | Designing new features |
| Finding bugs/vulnerabilities | Planning refactoring |
| Assessing code quality | Evaluating architecture changes |
| Pre-PR code review | Migration planning |
| Focused area analysis | System-level design |

### Hybrid Workflow

For comprehensive analysis:

```bash
# 1. First, review current state
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/ --focus security

# 2. Then, plan improvements
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/ --plan --focus architecture

# 3. Import results as tasks
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py import docs/plans/review.md
```

## Review Workflow

### Phase 1: Discovery

```bash
# 1. Understand the scope
ls -la src/auth/

# 2. Find key files
find src/ -name "*.py" | head -20

# 3. Check dependencies
grep -r "import " src/ | sort | uniq
```

### Phase 2: Analysis

Use the **SECU** framework:
- **S**ecurity - Vulnerabilities, exposure points
- **E**fficiency - Performance, resource usage
- **C**orrectness - Logic errors, edge cases
- **U**sability - API design, documentation

### Phase 3: Reporting

Structure findings by priority:
1. Critical - Must fix before merge
2. High - Should fix soon
3. Medium - Consider fixing
4. Low - Nice to have

## Issue Classification

### Critical Issues (Must Fix)

Block merge. Security vulnerabilities, data loss risks, major bugs.

**Examples:**
- SQL injection
- Authentication bypass
- Uncaught exceptions on happy path
- Data loss or corruption

### High Priority Issues (Should Fix)

Fix before next release. Security concerns, performance problems.

**Examples:**
- Missing error handling
- Performance bottlenecks
- Insecure defaults
- Poor error messages

### Medium Priority Issues (Consider Fixing)

Technical debt, maintainability concerns.

**Examples:**
- Code duplication
- Poor naming
- Missing type hints
- Inconsistent style

### Low Priority Issues (Nice to Have)

Minor improvements, optimizations.

**Examples:**
- Comment improvements
- Minor optimizations
- Style inconsistencies

## OpenCode-Specific Best Practices

### Model Selection

| Task Type | Recommended Model | Reason |
|-----------|------------------|--------|
| Security audit | claude-opus | Most thorough |
| Quick review | gpt-4o-mini | Fast and cheap |
| Code explanation | claude-3-5-sonnet | Clear explanations |
| Architecture | gpt-4 or claude-opus | Big-picture thinking |
| Pattern recognition | claude-opus | Strong pattern recognition |

### Prompt Engineering for OpenCode

#### DO ✅

```
Review src/auth/login.py for SQL injection vulnerabilities:

Context: Authentication system for web application
Code:
```python
def authenticate(username, password):
    query = f"SELECT * FROM users WHERE username='{username}'"
    cursor.execute(query)
```

Check for:
1. String concatenation in queries
2. Missing input validation
3. Hardcoded credentials
```

#### DON'T ❌

```
Review my code.
```

### Cost Optimization

OpenCode charges per model. Optimize your usage:

| Strategy | When to Use | Savings |
|----------|-------------|---------|
| Use claude-3-5-haiku | Quick scans, large files | 90% cost reduction |
| Use gpt-4o-mini | Simple reviews | 80% cost reduction |
| Batch similar files | Process together | Reduced overhead |
| Specific focus areas | Narrow scope | Fewer tokens needed |

## Review Templates

### Security Review Template

```
Conduct security review of:

Target: [target_path]

Focus Areas:
1. Authentication & Authorization
2. Input Validation
3. Data Protection
4. API Security
5. Dependency Vulnerabilities

For each area:
- Identify vulnerabilities (CWE/OWASP)
- Reference specific file:line
- Provide fix recommendations
- Assess severity (Critical/High/Medium/Low)
```

### Performance Review Template

```
Conduct performance analysis of:

Target: [target_path]

Focus Areas:
1. Algorithm Efficiency
2. Database Queries
3. Memory Usage
4. I/O Operations
5. Caching Strategy

For each area:
- Identify bottlenecks
- Suggest optimizations
- Provide before/after comparisons
- Estimate performance gain
```

## Writing Effective Reviews

### Do's

✅ **Provide context**: "This SQL query is vulnerable because..."

✅ **Show examples**: Provide both bad and good code

✅ **Explain why**: Not just "fix this" but "this causes X risk"

✅ **Be constructive**: Focus on improvement, not criticism

✅ **Acknowledge good code**: Positive reinforcement works

### Don'ts

❌ **Be vague**: "This code is bad" (explain what and why)

❌ **Use absolute language**: "Always do X" (consider trade-offs)

❌ **Ignore context**: Suggest changes without understanding requirements

❌ **Overwhelm**: Too many issues at once - prioritize

## Quality Score Guidelines

### Scoring Rubric

| Score Range | Quality Level | Characteristics |
|-------------|---------------|----------------|
| 9-10 | Excellent | Production-ready, minor nitpicks |
| 7-8 | Good | Solid code, some improvements needed |
| 5-6 | Fair | Functional but needs work |
| 3-4 | Poor | Significant issues present |
| 0-2 | Critical | Must fix before use |

### Scoring by Category

**Security (30%):**
- 10: No vulnerabilities found
- 7: Minor issues only
- 4: Some vulnerabilities
- 1: Critical vulnerabilities

**Performance (20%):**
- 10: Optimized performance
- 7: Minor inefficiencies
- 4: Clear bottlenecks
- 1: Severe performance issues

**Code Quality (20%):**
- 10: Clean, readable, maintainable
- 7: Generally good code
- 4: Some quality issues
- 1: Poor code quality

**Testing (15%):**
- 10: Comprehensive coverage
- 7: Good coverage
- 4: Gaps in coverage
- 1: Insufficient testing

**Documentation (15%):**
- 10: Well-documented
- 7: Adequate documentation
- 4: Missing key docs
- 1: Poor documentation
