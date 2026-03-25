---
name: code-review-output-format
description: "Structured output specification for code review results"
see_also:
  - rd3:code-review-common
  - rd3:tasks
---

# Code Review Output Format

Structured output specification for code review results, enabling task creation via `rd3:tasks`.

## Overview

All review results follow a consistent YAML frontmatter + Markdown format:

```yaml
---
type: code-review
version: 1.0
target: <review_target>
date: <ISO_timestamp>
focus_areas: [security, performance, correctness, usability]
quality_score: <0-10>
recommendation: <Approve|Request Changes|Block>
---

# Code Review: <target>

<Review content>
```

## Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | ✅ | Always `code-review` |
| `version` | string | ✅ | Format version (1.0) |
| `target` | string | ✅ | What was reviewed |
| `date` | string | ✅ | ISO 8601 timestamp |
| `focus_areas` | list | ❌ | Applied focus areas |
| `quality_score` | int | ✅ | Overall score 0-10 |
| `recommendation` | string | ✅ | Approve/Request Changes/Block |
| `files_reviewed` | int | ❌ | Number of files |
| `duration` | string | ❌ | Review duration |

### Example Frontmatter

```yaml
---
type: code-review
version: 1.0
target: src/auth/
date: 2026-03-25T14:30:00Z
focus_areas:
  - security
  - performance
quality_score: 7
recommendation: Request Changes
files_reviewed: 12
---
```

## Content Sections

### Required Sections

#### Executive Summary

```markdown
## Executive Summary

Brief overview including:
- Overall quality assessment
- Number of issues by priority
- General recommendation

**Quality Score:** <score>/10
**Recommendation:** <recommendation>
```

#### Priority Sections

```markdown
## Critical Issues (P1 - Must Fix)

[Blocking issues that must be resolved]

## High Priority Issues (P2 - Should Fix)

[Important issues for next release]

## Medium Priority Issues (P3 - Consider)

[Technical debt, improvements]

## Low Priority Issues (P4 - Nice to Have)

[Stylistic improvements]
```

### Optional Sections

```markdown
## Security Analysis (SECU-S)

[Security-specific findings]

## Performance Analysis (SECU-E)

[Performance-specific findings]

## Correctness Analysis (SECU-C)

[Logic/edge case findings]

## Maintainability Analysis (SECU-U)

[Code quality findings]

## Strengths

[Acknowledged good patterns]

## Recommendations

1. [Actionable next steps]
```

## Issue Format

### Structured Issue (Preferred)

```markdown
**[P1-001]** SQL Injection Vulnerability
- **Location**: src/auth/login.ts:45
- **Issue**: User input directly concatenated into SQL query
- **Impact**: Arbitrary SQL execution, database compromise
- **Fix**: Use parameterized queries:

```typescript
// Vulnerable
const query = `SELECT * FROM users WHERE username = '${username}'`;

// Fixed
const query = "SELECT * FROM users WHERE username = ?";
await db.execute(query, [username]);
```
```

### Simple Issue (Fallback)

```markdown
- Missing input validation on user registration form
```

## Quality Score

### Score Calculation

Quality score is weighted across categories:

| Category | Weight | Description |
|----------|--------|-------------|
| Security (SECU-S) | 30% | Vulnerabilities, data protection |
| Performance (SECU-E) | 20% | Efficiency, resource usage |
| Correctness (SECU-C) | 25% | Logic errors, edge cases |
| Maintainability (SECU-U) | 25% | Readability, complexity |

### Score Interpretation

| Score | Label | Meaning |
|-------|-------|---------|
| 9-10 | Excellent | Production-ready, minor suggestions |
| 7-8 | Good | Ready with minor fixes |
| 5-6 | Fair | Moderate issues, should address P1-P2 |
| 3-4 | Poor | Significant issues, blocking |
| 0-2 | Critical | Major vulnerabilities, must not merge |

## Recommendation

```markdown
**Recommendation:** Approve | Request Changes | Block
```

| Recommendation | When to Use |
|----------------|--------------|
| **Approve** | No P1 or P2 issues, ready to merge |
| **Request Changes** | Has P1 or P2 issues, fix before merge |
| **Block** | Critical P1 issues, security vulnerabilities |

## Task Creation via rd3:tasks

### From Review to Tasks

Each finding can become a task via `rd3:tasks`:

```bash
# Create task for critical finding
tasks create "Fix SQL injection in login.ts:45" \
  --priority critical \
  --folder docs/.tasks

# The task file's Background section captures the review finding
```

### Task File Integration

Findings from the review are folded into task file's `Background` as subsections:

```markdown
---
type: task
priority: critical
created_from: code-review-common
issue_id: P1-001
---

# Background

## Review Finding: P1-001

**Issue:** SQL Injection Vulnerability
**Location:** src/auth/login.ts:45
**Category:** Security (SECU-S)
**Review Date:** 2026-03-25
**Review Target:** src/auth/

**Issue Description:**
User input directly concatenated into SQL query string.

**Impact:**
Allows arbitrary SQL execution, potential database compromise.

**Fix Recommendation:**
Replace string concatenation with parameterized queries.

---

# Requirements

Fix the SQL injection vulnerability at src/auth/login.ts:45 by using parameterized queries.
```

## Complete Example

```yaml
---
type: code-review
version: 1.0
target: src/auth/
date: 2026-03-25T14:30:00Z
focus_areas:
  - security
  - performance
quality_score: 6
recommendation: Request Changes
files_reviewed: 12
---

# Code Review: src/auth/

## Executive Summary

Reviewed authentication module (12 files). Found **2 critical**, **3 high**, and **5 medium** priority issues. The module has good structure but requires immediate security fixes.

**Quality Score:** 6/10
**Recommendation:** Request Changes

## Critical Issues (P1 - Must Fix)

**[P1-001]** SQL Injection Vulnerability in Login
- **Location**: src/auth/login.ts:45
- **Issue**: User input directly concatenated into SQL query
- **Impact**: Arbitrary SQL execution, database compromise
- **Fix**: Use parameterized queries

**[P1-002]** Missing Authentication on Admin Endpoint
- **Location**: src/api/admin.ts:10
- **Issue**: No authentication check on admin endpoint
- **Impact**: Unauthorized administrative access
- **Fix**: Add `@require_auth` decorator

## High Priority Issues (P2 - Should Fix)

**[P2-001]** Password Storage Without Hashing
- **Location**: src/auth/models.ts:23
- **Issue**: Passwords stored in plaintext
- **Impact**: Password exposure in data breach
- **Fix**: Use bcrypt or argon2

- Missing rate limiting on login endpoint
- Insecure session token generation

## Medium Priority Issues (P3 - Consider)

- Insufficient logging for security events
- Missing input validation on user registration
- No account lockout after failed attempts

## Security Analysis (SECU-S)

- ❌ SQL injection in login
- ❌ No password hashing
- ✅ JWT token structure is sound
- ⚠️ Missing rate limiting

## Performance Analysis (SECU-E)

- ⚠️ N+1 query pattern in user list (src/users/list.ts:78)
- ⚠️ No caching for session validation
- ⚠️ Missing indexes on frequently queried columns

## Strengths

1. Clean module organization
2. Consistent naming conventions
3. Good use of type hints
4. Comprehensive test coverage for happy paths

## Recommendations

1. [P1] Fix SQL injection immediately
2. [P1] Add admin endpoint authentication
3. [P2] Implement password hashing
4. [P2] Add rate limiting
5. [P3] Add security event logging
```

## Validation Rules

### Frontmatter

- `type` must be `code-review`
- `version` must be `1.0`
- `target` must be non-empty
- `quality_score` must be 0-10
- `recommendation` must be Approve/Request Changes/Block

### Issue Sections

- Priority sections must follow P1-P4 taxonomy
- Structured issues must have location information
- P1 issues must have concrete fix recommendations

### Content

- Executive summary is required
- At least one issue section must be present
- All file:line references should be verifiable
