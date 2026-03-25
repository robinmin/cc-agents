---
name: code-review-prompt-template
description: "Prompt template for conducting code reviews"
see_also:
  - rd3:code-review-common
  - rd3:run-acp
---

# Code Review Prompt Template

Use this template when conducting a code review via `rd3:run-acp`.

## Template

```
## Code Review Request

**Target:** {target_path}
**Focus Areas:** {focus_areas}
**Priority:** {priority}

### Review Scope

Review the code at {target_path} for:
{focus_list}

### Analysis Framework

Use the SECU framework:
- **S**ecurity: Vulnerabilities, injection, auth flaws
- **E**fficiency: Performance issues, N+1, complexity
- **C**orrectness: Logic errors, edge cases, error handling
- **U**sability: Readability, maintainability, documentation

### Priority Taxonomy

Classify findings:
- **P1 (Critical)**: Security vulnerabilities, blocking bugs
- **P2 (High)**: Performance issues, significant bugs
- **P3 (Medium)**: Code smells, maintainability concerns
- **P4 (Low)**: Stylistic improvements

### Output Format

Provide findings in this format:

```yaml
---
type: code-review
target: {target_path}
focus_areas: [{focus_areas}]
quality_score: <0-10>
recommendation: <Approve|Request Changes|Block>
---

## Critical Issues (P1)

[Structured issues with file:line locations]

## High Priority Issues (P2)

[Structured issues]

## Medium Priority Issues (P3)

[Simple or structured issues]

## Low Priority Issues (P4)

[Suggestions]
```

### Review Guidelines

1. **Be specific**: Reference exact file:line locations
2. **Be actionable**: Provide concrete fix recommendations
3. **Prioritize**: P1 issues first, explain impact
4. **Be constructive**: Focus on improvement, not criticism
5. **Use SECU**: Cover all four dimensions

### Code Examples

When showing fixes, provide before/after code:

**Vulnerable:**
```typescript
const query = `SELECT * FROM users WHERE name = '${userName}'`;
db.execute(query);
```

**Fixed:**
```typescript
const query = "SELECT * FROM users WHERE name = ?";
db.execute(query, [userName]);
```

### Notes

{additional_context}
```

## Usage with rd3:run-acp

```bash
# Basic review
acpx codex "Review src/auth/ for security issues"

# With focus areas
acpx codex "Review src/api/ --focus security,performance"

# Full comprehensive review
acpx opencode "Conduct comprehensive code review of src/ using SECU framework"
```

## Focus Area Expansion

| Focus | Expands To |
|-------|------------|
| `security` | S - Security review (OWASP Top 10, CWE Top 25) |
| `performance` | E - Efficiency review (N+1, indexing, complexity) |
| `correctness` | C - Logic review (edge cases, error handling) |
| `usability` | U - Maintainability review (readability, complexity) |
| `comprehensive` | All four SECU dimensions |
