# Code Review Auggie - Usage Examples

Comprehensive examples for all commands and workflows.

## Table of Contents

1. [Check Command](#check-command)
2. [Run Command](#run-command)
3. [Run-File Command](#run-file-command)
4. [Review Command](#review-command)
5. [Import Command](#import-command)
6. [Multi-Focus Reviews](#multi-focus-reviews)
7. [Batch Workflows](#batch-workflows)
8. [Advanced Patterns](#advanced-patterns)

---

## Check Command

### Basic Check

Validate Auggie MCP availability:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py check
```

**Output:**
```
✓ Auggie MCP tool available
```

### Verbose Check

Show detailed information:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py check --verbose
```

---

## Run Command

### Simple Question

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py run \
  "Explain the difference between OAuth2 and JWT"
```

### With Output Save

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py run \
  "What are the trade-offs between PostgreSQL and MongoDB?" \
  --save auth-comparison
```

### Codebase-Specific Question

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py run \
  "How does the authentication middleware work in this codebase?"
```

---

## Run-File Command

### Create Prompt File

```bash
cat > /tmp/architecture-question.txt << 'EOF'
Analyze the current authentication architecture and suggest improvements.

Consider:
- Current security posture
- Scalability concerns
- Maintainability
- Industry best practices

Provide specific recommendations with code examples where applicable.
EOF
```

### Execute File

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py run-file \
  /tmp/architecture-question.txt \
  --output architecture-analysis.md
```

### With Custom Timeout

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py run-file \
  /tmp/complex-question.txt \
  --timeout 900 \
  --output detailed-analysis.md
```

---

## Review Command

### Single File Review

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/auth/login.py
```

### Directory Review

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/auth/
```

### Full Project Review

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  .
```

### With Focus Areas

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/api/ \
  --focus "security,performance"
```

### With Custom Output Name

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/payment/ \
  --focus security \
  --output payment-security-review
```

### Architecture Planning Mode

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/ \
  --plan \
  --output feature-implementation-plan
```

---

## Import Command

### Import All Issues

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py import \
  .claude/plans/review-src.md
```

### Import Critical Only

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py import \
  .claude/plans/review-src.md \
  --priority critical
```

### Import High Priority

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py import \
  .claude/plans/review-src.md \
  --priority high
```

---

## Multi-Focus Reviews

### Security and Performance

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/api/ \
  --focus "security,performance" \
  --output api-security-performance
```

### Testing and Quality

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/services/ \
  --focus "testing,quality" \
  --output services-test-quality
```

### All Focus Areas

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/ \
  --focus "security,performance,testing,quality,architecture" \
  --output comprehensive-review
```

---

## Batch Workflows

### Review Multiple Directories

```bash
# Define directories to review
dirs=("src/auth" "src/api" "src/db" "src/utils")

# Review each directory
for dir in "${dirs[@]}"; do
  python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
    "$dir" \
    --output "review-$(basename $dir)"
done
```

### Progressive Review

```bash
# Start with critical issues only
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/ \
  --focus security \
  --output security-pass1

# Import and fix critical issues
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py import \
  .claude/plans/security-pass1.md \
  --priority critical

# After fixes, do full review
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/ \
  --output full-review
```

---

## Advanced Patterns

### Git Integration - Review Changed Files

```bash
# Review files changed in current branch
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  $(git diff --name-only main | grep '\.py$') \
  --output pr-review
```

### Pre-Commit Review Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Get staged Python files
files=$(git diff --cached --name-only --diff-filter=ACM | grep '\.py$')

if [ -n "$files" ]; then
  echo "Running Auggie code review on staged files..."
  python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
    $files \
    --output pre-commit-review

  # Check for critical issues
  if grep -q "## Critical Issues" .claude/plans/pre-commit-review.md; then
    echo "Critical issues found. Review .claude/plans/pre-commit-review.md"
    exit 1
  fi
fi
```

### CI/CD Integration

```yaml
# .github/workflows/code-review.yml
name: Auggie Code Review

on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Auggie
        run: npm install -g @augmentcode/auggie@prerelease
      - name: Run Review
        run: |
          python3 plugins/rd2/skills/code-review-auggie/scripts/code-review-auggie.py review \
            src/ \
            --output ci-review
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: review-results
          path: .claude/plans/ci-review.md
```

### Compare Reviews

```bash
# Review with Gemini
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review \
  src/auth/ \
  --output gemini-review

# Review with Auggie
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/auth/ \
  --output auggie-review

# Compare results
echo "=== Gemini Review ==="
cat .claude/plans/gemini-review.md

echo "=== Auggie Review ==="
cat .claude/plans/auggie-review.md
```

---

## Workflow Examples

### New Feature Planning

```bash
# 1. Plan architecture for new feature
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/features/new-auth/ \
  --plan \
  --output new-auth-plan

# 2. Review plan
cat .claude/plans/new-auth-plan.md

# 3. After implementation, review code
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/features/new-auth/ \
  --focus "security,testing" \
  --output new-auth-review

# 4. Import issues as tasks
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py import \
  .claude/plans/new-auth-review.md
```

### Security Audit Workflow

```bash
# 1. Run security-focused review
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/ \
  --focus security \
  --output security-audit

# 2. Import only critical and high issues
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py import \
  .claude/plans/security-audit.md \
  --priority critical

python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py import \
  .claude/plans/security-audit.md \
  --priority high

# 3. Track progress
tasks list wip
```

### Refactoring Planning

```bash
# 1. Plan refactoring with Auggie
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review \
  src/legacy/ \
  --plan \
  --focus "architecture,quality" \
  --output refactor-plan

# 2. Get second opinion from Gemini
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review \
  src/legacy/ \
  --plan \
  --focus "architecture,quality" \
  --output refactor-plan-gemini

# 3. Compare and synthesize plans
```

---

## Tips and Tricks

### Effective Queries

- **Be specific**: "How does JWT authentication work?" vs "Explain auth"
- **Include context**: "In this codebase, how is error handling done?"
- **Ask for alternatives**: "What are different ways to implement caching?"

### Focus Area Selection

- Use `security` for authentication, input validation, data exposure
- Use `performance` for algorithms, queries, memory usage
- Use `testing` for coverage, edge cases, test quality
- Use `quality` for readability, maintainability, DRY
- Use `architecture` for patterns, coupling, design

### Review Frequency

- **Pre-commit**: Quick review of changed files
- **Pre-merge**: Comprehensive review of feature branch
- **Sprint review**: Full project review for planning
- **Security audit**: Focused security review before release

---

## See Also

- `../SKILL.md` - Main skill documentation
- `import-format.md` - Import command format reference
- `auggie-query-patterns.md` - Effective Auggie query patterns
