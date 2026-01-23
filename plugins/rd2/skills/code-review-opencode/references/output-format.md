# Output Format Specification

Structured output format for code-review-opencode review results.

## Overview

All review results follow a consistent YAML frontmatter + Markdown format that enables:
- Machine parsing of review metadata
- Task import automation
- Consistent presentation across all review tools

## File Structure

```yaml
---
type: opencode-code-review
target: <review_target>
mode: review | planning
date: <ISO_timestamp>
model: <model_name>
---

# <Title>

<Review content sections>
```

## Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | ✅ | Always `opencode-code-review` |
| `target` | string | ✅ | What was reviewed (file, directory, or path) |
| `mode` | string | ✅ | `review` or `planning` |
| `date` | string | ❌ | ISO 8601 timestamp of review |
| `model` | string | ❌ | OpenCode model used (e.g., "claude-opus", "gpt-4") |
| `focus_areas` | list | ❌ | List of focus areas applied |
| `files_reviewed` | int | ❌ | Number of files in review |

### Example Frontmatter

```yaml
---
type: opencode-code-review
target: src/auth/
mode: review
date: 2026-01-22T18:00:00Z
model: claude-opus
focus_areas:
  - security
  - performance
files_reviewed: 12
---
```

## Content Sections

### Required Sections

#### Executive Summary
```markdown
## Executive Summary

Brief overview of the review findings. Should include:
- Overall code quality assessment
- Number of issues by priority
- General recommendations
```

#### Priority-Based Issue Sections
```markdown
## Critical Issues (Must Fix)
## High Priority Issues (Should Fix)
## Medium Priority Issues (Consider Fixing)
## Low Priority Issues (Nice to Have)
```

### Optional Sections

```markdown
## Security Analysis
## Performance Review
## Code Quality Assessment
## Testing Coverage
## Architecture Evaluation
## Strengths
## Areas for Improvement
## Follow-up Actions
## Next Steps
```

## Issue Format

### Structured Issue (Recommended)

```markdown
**[PRIORITY-NNN]** Issue Title
- **Location**: file.py:line
- **Issue**: Detailed description
- **Impact**: Risk assessment
- **Fix**: Actionable recommendation
```

### Simple Issue (Fallback)

```markdown
- Brief description of the issue
```

## Quality Score

### Numeric Score

```markdown
Quality Score: 8/10
```

Where:
- `10` = Production-ready, no issues
- `8-9` = High quality, minor issues
- `6-7` = Good, moderate issues
- `4-5` = Fair, significant issues
- `0-3` = Poor, critical issues

### Score Components

Quality is typically based on:
- Security (30%)
- Performance (20%)
- Code Quality (20%)
- Testing (15%)
- Documentation (15%)

## Recommendation Field

```markdown
Recommendation: Approve | Request Changes | Block
```

| Recommendation | Meaning | When to Use |
|----------------|---------|-------------|
| `Approve` | Ready to merge | No critical/high issues |
| `Request Changes` | Fix before merge | Has high/critical issues |
| `Block` | Must not merge | Security vulnerabilities, major bugs |

## Complete Example

```yaml
---
type: opencode-code-review
target: src/auth/
mode: review
date: 2026-01-22T18:00:00Z
model: claude-opus
focus_areas:
  - security
  - performance
files_reviewed: 12
---

# Code Review: src/auth/

## Executive Summary

Reviewed authentication module (12 files). Found **2 critical**, **3 high**, and **5 medium** priority issues. The module has good structure but requires immediate security fixes before production use.

**Overall Assessment**: The authentication flow is well-organized but has critical SQL injection vulnerabilities that must be addressed.

Quality Score: 6/10

Recommendation: Request Changes

## Critical Issues (Must Fix)

**[CRITICAL-001]** SQL Injection Vulnerability in login
- **Location**: src/auth/login.py:45
- **Issue**: User input directly concatenated into SQL query
- **Impact**: Allows arbitrary SQL execution, complete database compromise
- **Fix**: Use parameterized queries

## High Priority Issues (Should Fix)

**[HIGH-001]** Password Storage Without Hashing
- **Location**: src/auth/models.py:23
- **Issue**: Passwords stored in plaintext
- **Impact**: Password exposure in data breach
- **Fix**: Use bcrypt or argon2

## Security Analysis

### Authentication
- ❌ SQL injection in login
- ❌ No password hashing
- ✅ JWT token structure is sound
- ⚠️ Missing rate limiting

### Authorization
- ❌ Admin endpoint not protected
- ✅ Role-based access control defined
- ⚠️ Some endpoints missing permission checks

## Performance Review

- **Database**: N+1 query pattern in user list (src/auth/users.py:78)
- **Caching**: No caching for session validation
- **Queries**: Missing indexes on frequently queried columns

## Strengths

1. Clean module organization
2. Consistent naming conventions
3. Good use of type hints
4. Comprehensive test coverage for happy paths

## Areas for Improvement

1. Add security testing for authentication flows
2. Implement parameterized queries throughout
3. Add rate limiting middleware
4. Improve error messages for debugging
5. Add integration tests for security scenarios
```

## Import Format

The `import` command parses the review file to extract issues:

```python
# Parsed structure
{
    "metadata": {
        "target": "src/auth/",
        "mode": "review",
        "type": "opencode-code-review"
    },
    "issues": [
        ReviewIssue(
            priority="critical",
            identifier="CRITICAL-001",
            title="SQL Injection Vulnerability in login",
            location="src/auth/login.py:45",
            issue_description="User input directly concatenated...",
            impact="Allows arbitrary SQL...",
            fix_recommendation="Use parameterized queries..."
        ),
        # ... more issues
    ]
}
```
