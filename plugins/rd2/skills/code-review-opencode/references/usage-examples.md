# Usage Examples

Complete examples for using code-review-opencode in various scenarios.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Advanced Review Scenarios](#advanced-review-scenarios)
- [Running Custom Prompts](#running-custom-prompts)
- [Importing Review Results as Tasks](#importing-review-results-as-tasks)
- [Model Selection](#model-selection)
- [Authentication](#authentication)
- [Common Workflows](#common-workflows)
- [Troubleshooting Examples](#troubleshooting-examples)
- [Environment Variables](#environment-variables)

## Basic Usage

### Check OpenCode CLI Availability

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py check
```

**Expected output:**
```
✓ OpenCode CLI is available
Version: 1.0.0
Authenticated: yes
```

### Quick Code Review

```bash
# Review a single file
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/auth.py

# Review a directory
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/

# Review with custom output
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/ \
  --output .claude/plans/auth-review.md

# Architecture planning mode
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/ \
  --plan \
  --focus architecture

# Compare two different models on same code
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/ \
  --model claude-opus \
  --output review-claude.md

python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/ \
  --model gpt-4 \
  --output review-gpt.md
```

## Advanced Review Scenarios

### Security-Focused Review

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/ \
  --focus security
```

**Output highlights:**
- SQL injection vulnerabilities
- Authentication flaws
- Data exposure risks
- Input validation gaps

### Multi-Focus Review

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/ \
  --focus "security,performance,testing"
```

### Architecture Planning

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/ \
  --plan
```

**Output includes:**
- Current architecture analysis
- Implementation recommendations
- Step-by-step migration plan
- Risk assessment

## Running Custom Prompts

### Short Prompt (Inline)

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py run \
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
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py run-file \
  review-prompt.txt \
  --output review-results.md
```

## Importing Review Results as Tasks

### Basic Import

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py import \
  .claude/plans/review-src.md
```

### Filter by Priority

```bash
# Only import critical issues
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py import \
  .claude/plans/review-src.md \
  --priority critical

# Only import high priority issues
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py import \
  .claude/plans/review-src.md \
  --priority high
```

## Model Selection

OpenCode provides access to multiple AI models. You can specify which model to use:

```bash
# Use default model
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/

# Use specific model (if supported)
# Note: Check available models with `opencode agent list`
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/ \
  --model gpt-4
```

## Authentication

### Login

```bash
opencode auth login
```

### Check Authentication Status

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py check
```

The check command will report authentication status and prompt you to login if needed.

## Common Workflows

### Workflow 1: Pre-PR Review

```bash
# 1. Check OpenCode availability
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py check

# 2. Review changed files
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/auth/ \
  --focus "security,testing" \
  --output .claude/plans/pre-pr-review.md

# 3. Import critical issues as tasks
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py import \
  .claude/plans/pre-pr-review.md \
  --priority critical
```

### Workflow 2: Architecture Migration

```bash
# 1. Plan the migration
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/old/ \
  --plan \
  --focus architecture \
  --output .claude/plans/migration-plan.md

# 2. Review the plan
cat .claude/plans/migration-plan.md

# 3. Create tasks for implementation steps
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py import \
  .claude/plans/migration-plan.md
```

### Workflow 3: Security Audit

```bash
# Comprehensive security review
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/ \
  --focus security \
  --timeout 900 \
  --output .claude/plans/security-audit.md

# Import all security issues
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py import \
  .claude/plans/security-audit.md
```

## Troubleshooting Examples

### OpenCode CLI Not Found

```bash
# Check availability
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py check

# If not available, install OpenCode CLI
# Visit: https://opencode.ai/docs/cli/
npm install -g @opencode/cli
```

### Not Authenticated

```bash
# Login to OpenCode
opencode auth login

# Verify authentication
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py check
```

### Empty Review Results

```bash
# Try broader scope
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/ \
  --focus "comprehensive"

# Or specify files directly
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/auth.py
```

### Timeout Issues

```bash
# Increase timeout for large codebases
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/ \
  --timeout 900

# Or review smaller chunks
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/auth/
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/api/
```

## Environment Variables

```bash
# Set custom plugin root
export CLAUDE_PLUGIN_ROOT="/path/to/claude-code/plugins/rd2"

# Then use simplified command
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py review src/
```
