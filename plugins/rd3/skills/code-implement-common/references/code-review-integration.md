---
name: code-review-integration
description: "Code review integration: delegation patterns, focus selection, and review options"
see_also:
  - rd3:code-implement-common
  - rd3:code-review-common
---

# Code Review Integration

After implementation, delegate review to `rd3:code-review-common`. Use `--no-review` to skip if doing parallel batch review.

## Review Invocation

```bash
# Default: Review after implementation
implement task:docs/tasks/0047_my-task.md

# Skip review (for parallel batch)
implement task:docs/tasks/0047_my-task.md --no-review

# Later: centralized review via rd3:code-review-common
```

## Review Focus Selection

| Focus | Coverage |
|-------|----------|
| `security` | SECU-S, OWASP Top 10 |
| `performance` | SECU-E, algorithm complexity |
| `correctness` | SECU-C, logic, edge cases |
| `usability` | SECU-U, maintainability |
| `comprehensive` | All SECU categories |

## Review Delegation Patterns

After parallel implementation:

```bash
# Centralized review after parallel implementation
Task("review-agent", "review ./src --focus security,correctness")
```

For focused review:

```bash
# Security-focused review
Task("review-agent", "review ./src --focus security")

# Correctness-focused review
Task("review-agent", "review ./src --focus correctness")

# Comprehensive review
Task("review-agent", "review ./src --focus comprehensive")
```
