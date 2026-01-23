# Usage Examples

Complete examples for using code-review-claude in various scenarios.

## Basic Usage

### Check Claude CLI Availability

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py check
```

**Expected output:**
```
✓ Claude CLI is available
Version: Claude Code 1.x.x
```

### Quick Code Review

```bash
# Review a single file
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/auth.py

# Review a directory
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/

# Review with custom output
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/ \
  --output .claude/plans/auth-review.md
```

## Advanced Review Scenarios

### Security-Focused Review

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/ \
  --focus security
```

**Output highlights:**
- SQL injection vulnerabilities
- Authentication flaws
- Data exposure risks
- Input validation gaps

### Performance Analysis

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/api/ \
  --focus performance
```

**Output highlights:**
- N+1 query patterns
- Unnecessary loops
- Memory usage concerns
- Caching opportunities

### Multi-Focus Review

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/ \
  --focus "security,performance,testing"
```

## Architecture Planning

### Plan Implementation Approach

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/ \
  --plan
```

**Output includes:**
- Current architecture analysis
- Implementation recommendations
- Step-by-step migration plan
- Risk assessment

### Plan with Specific Focus

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/auth/ \
  --plan \
  --focus architecture
```

## Running Custom Prompts

### Short Prompt (Inline)

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py run \
  "Explain the authentication flow in src/auth.py"
```

### Long Prompt (From File)

```bash
# Create prompt file
cat > review-prompt.txt << 'EOF'
Analyze the following codebase for:
1. Security vulnerabilities
2. Performance bottlenecks
3. Code quality issues

Provide prioritized recommendations.
EOF

# Run with file
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py run-file \
  review-prompt.txt \
  --output review-results.md
```

## Importing Review Results as Tasks

### Basic Import

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py import \
  .claude/plans/review-src.md
```

### Filter by Priority

```bash
# Only import critical issues
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py import \
  .claude/plans/review-src.md \
  --priority critical

# Only import high priority issues
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py import \
  .claude/plans/review-src.md \
  --priority high
```

## Custom Timeouts

### Quick Reviews (5 minutes)

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/ \
  --timeout 300
```

### Complex Reviews (15 minutes)

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/ \
  --timeout 900
```

## Common Workflows

### Workflow 1: Pre-PR Review

```bash
# 1. Check Claude availability
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py check

# 2. Review changed files
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/auth/ \
  --focus "security,testing" \
  --output .claude/plans/pre-pr-review.md

# 3. Import critical issues as tasks
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py import \
  .claude/plans/pre-pr-review.md \
  --priority critical
```

### Workflow 2: Architecture Migration

```bash
# 1. Plan the migration
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/old/ \
  --plan \
  --focus architecture \
  --output .claude/plans/migration-plan.md

# 2. Review the plan
cat .claude/plans/migration-plan.md

# 3. Create tasks for implementation steps
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py import \
  .claude/plans/migration-plan.md
```

### Workflow 3: Security Audit

```bash
# Comprehensive security review
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/ \
  --focus security \
  --timeout 900 \
  --output .claude/plans/security-audit.md

# Import all security issues
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py import \
  .claude/plans/security-audit.md
```

## Environment Variables

```bash
# Set custom plugin root
export CLAUDE_PLUGIN_ROOT="/path/to/claude-code/plugins/rd2"

# Then use simplified command
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/
```

## Troubleshooting Examples

### Claude CLI Not Found

```bash
# Check availability first
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py check

# If not available, install Claude Code
# See: https://github.com/anthropics/claude-code
```

### Empty Review Results

```bash
# Try broader scope
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/ \
  --focus "security,performance,quality,testing,architecture"

# Or specific file
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/auth.py
```

### Timeout Issues

```bash
# Increase timeout for large codebases
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/ \
  --timeout 900

# Or review smaller chunks
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/auth/
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py review src/api/
```
