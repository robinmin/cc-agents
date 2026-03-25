---
name: code-review-result-template
description: "Template for structured code review results"
see_also:
  - rd3:code-review-common
  - rd3:tasks
---

# Code Review Result Template

Use this template when documenting the results of a code review.

## Template

```yaml
---
type: code-review
version: 1.0
target: <path_reviewed>
date: <ISO_timestamp>
focus_areas: [<areas>]
quality_score: <0-10>
recommendation: <Approve|Request Changes|Block>
files_reviewed: <count>
reviewer: <agent_or_user>
---

# Code Review: <target>

## Executive Summary

[2-3 sentence overview of review findings]

**Quality Score:** <score>/10
**Recommendation:** <recommendation>
**Issues Found:** P1:<n>, P2:<n>, P3:<n>, P4:<n>

---

## Critical Issues (P1 - Must Fix)

<!-- Block merge - security vulnerabilities, data loss risks -->

**[P1-001]** <Issue Title>
- **Location**: <file>:<line>
- **Issue**: <What's wrong>
- **Impact**: <Why it's critical>
- **Fix**: <How to fix>

**[P1-002]** <Issue Title>
- **Location**: <file>:<line>
- **Issue**: <What's wrong>
- **Impact**: <Why it's critical>
- **Fix**: <How to fix>

---

## High Priority Issues (P2 - Should Fix)

<!-- Fix before release - performance, significant bugs -->

**[P2-001]** <Issue Title>
- **Location**: <file>:<line>
- **Issue**: <What's wrong>
- **Impact**: <Impact on release>
- **Fix**: <How to fix>

**[P2-002]** <Issue Title>
- **Location**: <file>:<line>
- **Issue**: <What's wrong>
- **Impact**: <Impact on release>
- **Fix**: <How to fix>

---

## Medium Priority Issues (P3 - Consider)

<!-- Technical debt, improvements for next sprint -->

- <Issue description> (<file>:<line>)
- <Issue description> (<file>:<line>)
- <Issue description> (<file>:<line>)

---

## Low Priority Issues (P4 - Nice to Have)

<!-- Stylistic improvements, minor optimizations -->

- <Suggestion> (<file>:<line>)
- <Suggestion> (<file>:<line>)

---

## Analysis by Category

### Security (SECU-S)

| Check | Status | Notes |
|-------|--------|-------|
| SQL Injection | ✅/❌ | <status> |
| Input Validation | ✅/❌ | <status> |
| Auth/AuthZ | ✅/❌ | <status> |
| Data Protection | ✅/❌ | <status> |
| Secrets | ✅/❌ | <status> |

### Efficiency (SECU-E)

| Check | Status | Notes |
|-------|--------|-------|
| N+1 Queries | ✅/❌ | <status> |
| Indexes | ✅/❌ | <status> |
| Caching | ✅/❌ | <status> |
| Complexity | ✅/❌ | <status> |

### Correctness (SECU-C)

| Check | Status | Notes |
|-------|--------|-------|
| Logic Errors | ✅/❌ | <status> |
| Error Handling | ✅/❌ | <status> |
| Edge Cases | ✅/❌ | <status> |
| Type Safety | ✅/❌ | <status> |

### Maintainability (SECU-U)

| Check | Status | Notes |
|-------|--------|-------|
| Readability | ✅/❌ | <status> |
| Complexity | ✅/❌ | <status> |
| Duplication | ✅/❌ | <status> |
| Documentation | ✅/❌ | <status> |

---

## Strengths

- <What works well>
- <What works well>
- <What works well>

---

## Recommendations

1. [Immediate action] <P1 fix description>
2. [Before release] <P2 fix description>
3. [Next sprint] <P3 fix description>
4. [Consider] <P4 suggestion>

---

## Task Creation

Use `rd3:tasks` to create fix tasks:

```bash
tasks create "<P1-001 summary>" --priority critical
tasks create "<P2-001 summary>" --priority high
```

---

**Review completed:** <date>
**Reviewer:** <agent_or_user>
**Next review:** <date or 'pending'>
```

## Quick Reference

### Status Icons

| Icon | Meaning |
|------|---------|
| ✅ | Passes review |
| ❌ | Fails review |
| ⚠️ | Partial pass, needs attention |
| — | Not applicable |

### Priority Quick Reference

| Priority | Label | Action | SLA |
|----------|-------|--------|-----|
| P1 | Critical | Fix immediately | Before merge |
| P2 | High | Fix before release | This sprint |
| P3 | Medium | Consider fixing | Next sprint |
| P4 | Low | Nice to have | Backlog |

### Recommendation Values

| Value | When to Use |
|-------|-------------|
| **Approve** | No P1 or P2 issues |
| **Request Changes** | Has P1 or P2 issues |
| **Block** | Critical P1 issues, security vulnerabilities |
