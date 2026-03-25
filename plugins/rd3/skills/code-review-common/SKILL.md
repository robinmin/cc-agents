---
name: code-review-common
description: "Unified, channel-agnostic code review skill with SECU framework, priority taxonomy, and rd3:run-acp integration. Trigger when user mentions 'code review', 'review this', 'static analysis', or similar."
license: Apache-2.0
version: "1.0.0"
created_at: 2026-03-25
updated_at: 2026-03-25
tags: [execution-core, code-review, static-analysis, security, quality]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,openclaw,opencode,antigravity"
  category: execution-core
  interactions:
    - pipeline
    - reviewer
  severity_levels:
    P1: Security vulnerability, data loss risk, blocking bug
    P2: Performance issue, significant bug, quality concern
    P3: Code smell, maintainability issue, test gap
    P4: Stylistic improvement, minor optimization
  pipeline_steps:
    - name: Scope Definition
      description: Identify target files/modules to review
    - name: Discovery
      description: Glob/Grep to map codebase structure
    - name: Analysis
      description: SECU Framework review (Security, Efficiency, Correctness, Usability)
    - name: Issue Documentation
      description: Record findings with severity and location
    - name: Task Generation
      description: Use rd3:tasks to create fix tasks from findings
  openclaw:
    emoji: "🔍"
see_also:
  - rd3:run-acp
  - rd3:tasks
  - rd3:sys-debugging
  - rd3:tdd-workflow
  - rd3:quick-grep
---

# rd3:code-review-common — Unified Code Review

Comprehensive code review skill providing channel-agnostic review coordination, SECU-based analysis criteria, and structured output workflow. Uses `rd3:run-acp` for cross-channel execution and `rd3:tasks` for review report output.

## Overview

This skill provides a systematic approach to code review using the **SECU Framework** (Security, Efficiency, Correctness, Usability) and **P1-P4 Priority Taxonomy**. It delivers structured findings with severity classification and integrates with `rd3:tasks` for actionable follow-up.

**Key capabilities:**
- SECU-based multi-dimensional analysis
- P1-P4 severity classification with severity calculation formula
- Cross-channel execution via `rd3:run-acp`
- Structured output with `rd3:tasks` integration
- OWASP Top 10 vulnerability detection

## Quick Start

```bash
# Basic code review
rd3:code-review "review src/auth/"

# Security-focused review
rd3:code-review "review src/auth/ --focus security"

# Multi-channel parallel review
acpx codex "review src/api/ --focus security"
acpx opencode "review src/api/ --focus performance"

# Create tasks from findings
tasks create "Fix SQL injection in login.py" --priority critical
```

## When to Use

**Trigger phrases:**
- "review this code"
- "code review"
- "static analysis"
- "security audit"
- "performance review"
- "check for bugs"
- "assess code quality"

**Do NOT use for:**
- Solution/architecture review (→ `rd3:sys-debugging` for bugs, `rd3:backend-architect` for architecture)
- Test implementation (→ `rd3:tdd-workflow`)
- Feature implementation (→ `rd3:sys-developing`)
- Debugging known issues (→ `rd3:sys-debugging`)

## Requirements

### External Tools

| Tool | Purpose | Source |
|------|---------|--------|
| `rd3:run-acp` | Cross-channel agent execution delegation | `rd3:run-acp` skill |
| `rd3:tasks` | Task file creation from review findings | `rd3:tasks` skill |
| `acpx` | Headless ACP CLI (required by `rd3:run-acp`) | `npm i -g acpx` |

### No Custom Scripts Required

This skill is **knowledge-only**. All review execution is delegated through `rd3:run-acp`. No Python or TypeScript scripts are needed.

## Core Principle

**Code review validates implementation quality — not design correctness.**

| Review Type | Scope | Skill |
|------------|-------|-------|
| **Code Review** | Implementation quality (bugs, security, performance, style) | `code-review-common` (this) |
| **Solution Review** | Architecture and design decisions | `rd3:backend-architect` / `rd3:frontend-architect` |
| **Debugging** | Root cause investigation of known issues | `rd3:sys-debugging` |
| **Testing** | Test coverage and quality | `rd3:sys-testing` / `rd3:tdd-workflow` |

## Two-Layer Review Framework

### Layer 1: Code Review (This Skill)

Validates **how** code is written — correctness, security, performance, maintainability.

```
Implemented code → code-review-common → findings → rd3:tasks
```

**Focus areas:**
- Security vulnerabilities
- Performance issues
- Bug detection
- Code quality
- Test coverage

### Layer 2: Solution Review (Architect)

Validates **what** code does — architecture, design patterns, system boundaries.

```
Design → architect review → decisions documented
```

**Focus areas:**
- Architectural correctness
- Design pattern selection
- System integration
- Scalability assessment

## Workflows

### Standard Code Review Workflow

```
1. SCOPE DEFINITION
   └── Identify target files/modules to review

2. DISCOVERY
   └── Glob/Grep to map codebase structure

3. ANALYSIS (SECU Framework)
   └── S - Security review
   └── E - Efficiency/Performance review
   └── C - Correctness review
   └── U - Usability/Maintainability review

4. ISSUE DOCUMENTATION
   └── Record findings with severity and location

5. TASK GENERATION
   └── Use rd3:tasks to create fix tasks from findings
```

### Execution via rd3:run-acp

```bash
# Delegate review to a specific channel agent
acpx <agent> "Review src/auth/ for security issues"

# Multi-channel parallel review
acpx codex "review src/api/ --focus security"
acpx opencode "review src/api/ --focus performance"

# Use rd3:tasks to capture findings
tasks create "Fix SQL injection in login.py"
```

## SECU Framework

### S — Security Review

| Check | What to Look For |
|-------|------------------|
| Injection | SQL, NoSQL, OS command, LDAP injection |
| Authentication | Missing auth, weak passwords, hardcoded credentials |
| Authorization | Broken access control, privilege escalation |
| Data Exposure | PII in logs, secrets in code, insecure storage |
| Cryptography | Weak hashing, unencrypted data transmission |

**Common Vulnerabilities (OWASP Top 10):**

| Vulnerability | Detection Pattern | Prevention |
|--------------|-------------------|------------|
| Injection | `execute.*%s`, `format.*%s`, `eval(`, `exec(` | Parameterized queries, input validation |
| Broken Auth | Missing `@auth`, hardcoded tokens | Proper auth decorators, token validation |
| Data Exposure | `console.log(sensitive)`, `logger.info(password)` | Sanitize logs, use secret masking |
| SSRF | `requests.*user_url`, `fetch.*user_input` | URL validation, allowlist |
| XXE | `parseXML.*user_input`, `etree.parse` | Disable DTD, schema validation |

### E — Efficiency/Performance Review

| Check | What to Look For |
|-------|------------------|
| Algorithmic | O(n²) where O(n) possible, nested loops |
| Database | N+1 queries, missing indexes, SELECT * |
| Caching | Repeated expensive computations, no memoization |
| Memory | Memory leaks, large object allocations |
| I/O | Blocking calls in async context, missing timeouts |

**Performance Hotspots:**

```
# N+1 Query Pattern
for user in users:
    orders = db.query(f"SELECT * FROM orders WHERE user_id = {user.id}")

# Should be:
user_ids = [u.id for u in users]
orders = db.query(f"SELECT * FROM orders WHERE user_id IN ({user_ids})")

# Missing Index
CREATE TABLE users (id, email, created_at);  # No index on email

# Excessive Allocations
data = [func(x) for x in huge_list]  # Materializes entire list

# Should be generator:
data = (func(x) for x in huge_list)
```

### C — Correctness Review

| Check | What to Look For |
|-------|------------------|
| Logic Errors | Off-by-one, wrong operator, missing condition |
| Edge Cases | Null handling, empty inputs, boundary conditions |
| Error Handling | Silent failures, swallowed exceptions, missing try/catch |
| Concurrency | Race conditions, deadlocks, thread safety |
| Type Safety | Unchecked casts, missing null checks |

**Common Logic Errors:**

```typescript
// Off-by-one
for (let i = 0; i <= arr.length; i++)  // Should be i < arr.length

// Wrong operator
if (user.isAdmin || !user.isActive)  // Should be &&

// Null propagation
const name = data?.profile?.name ?? 'Anonymous';

// Race condition
let count = 0;
for (const _ of requests) {
  count++;  // Not atomic in concurrent context
}
```

### U — Usability/Maintainability Review

| Check | What to Look For |
|-------|------------------|
| Readability | Magic numbers, poor naming, missing comments |
| Complexity | Functions > 50 lines, cyclomatic complexity > 10 |
| Coupling | Tight coupling, circular dependencies |
| DRY | Duplicated logic, copy-paste code |
| Documentation | Missing docs for public APIs, outdated comments |

**Maintainability Red Flags:**

```typescript
// Magic numbers
if (user.age > 18)  // What does 18 mean?

// Long function
function processUserData(data, config, logger, db) {
  // 200+ lines - should be split
}

// Tight coupling
class OrderService {
  private emailService = new EmailService();  // Direct instantiation
  private paymentGateway = new StripeGateway();  // Hardcoded dependency
}

// Duplicated code
function validateEmail(email: string) { /* ... */ }
function validateEmailAdmin(email: string) { /* identical copy */ }
```

## Priority Taxonomy

All findings are classified by severity:

| Priority | Label | Definition | Action |
|----------|-------|------------|--------|
| **P1** | Critical | Security vulnerability, data loss risk, blocking bug | Fix immediately, block merge |
| **P2** | High | Performance issue, significant bug, quality concern | Fix before release |
| **P3** | Medium | Code smell, maintainability issue, test gap | Fix in next sprint |
| **P4** | Low | Stylistic improvement, minor optimization | Consider fixing |

### Severity Calculation

```
Severity = (Likelihood × Impact) / Fix_Effort

Where:
- Likelihood: 1-5 (5 = very likely to occur)
- Impact: 1-5 (5 = critical/breaking)
- Fix_Effort: 1-5 (5 = very easy to fix)
```

### Quick Decision Matrix

| Impact | High Effort | Low Effort |
|--------|-------------|------------|
| **High** | P2 (High) | P1 (Critical) |
| **Medium** | P3 (Medium) | P2 (High) |
| **Low** | P4 (Low) | P3 (Medium) |

## Output Format

### Review Result Structure

```yaml
---
type: code-review
version: 1.0
target: <path_reviewed>
date: <ISO_timestamp>
focus_areas: [security, performance, correctness, usability]
quality_score: <0-10>
recommendation: <Approve|Request Changes|Block>
---

# Code Review: <target>

## Executive Summary

Brief overview of findings.

**Quality Score:** <score>/10
**Recommendation:** <recommendation>

## Critical Issues (P1 - Must Fix)

[Issues that block merge]

## High Priority Issues (P2 - Should Fix)

[Important issues for next release]

## Medium Priority Issues (P3 - Consider)

[Technical debt, improvements]

## Low Priority Issues (P4 - Nice to Have)

[Stylistic improvements]

## Analysis by Category

### Security (SECU-S)

[Security findings]

### Efficiency (SECU-E)

[Performance findings]

### Correctness (SECU-C)

[Logic/edge case findings]

### Usability (SECU-U)

[Maintainability findings]

## Recommendations

1. [Actionable fix recommendations]
```

### Issue Format

**Structured format (preferred):**

```markdown
**[P1-001]** SQL Injection Vulnerability
- **Location**: src/auth/login.ts:45
- **Issue**: User input directly concatenated into SQL query
- **Impact**: Allows arbitrary SQL execution
- **Fix**: Use parameterized queries
```

**Simple format (fallback):**

```markdown
- Missing input validation on user registration form
```

## Integration with rd3:tasks

After completing a review, create task files for findings:

```bash
# Create task for critical finding
tasks create "Fix SQL injection in login.ts:45" \
  --priority critical \
  --folder docs/.tasks \
  --description "Fix SQL injection vulnerability at src/auth/login.ts:45"

# List created tasks
tasks list --folder docs/.tasks
```

### Task File Structure

Findings from the review should be folded into task file's `Background` section as subsections:

```markdown
---
type: task
priority: critical
created_from: code-review-common
issue_id: P1-001
---

# Background

## Issue Summary

**ID:** P1-001
**Location:** src/auth/login.ts:45
**Category:** Security (SECU-S)

**Issue Description:**
SQL injection vulnerability — user input directly concatenated into SQL query.

**Impact:**
Allows arbitrary SQL execution, potential database compromise.

**Review Finding Source:**
Code review of src/auth/ conducted 2026-03-25.

---

# Requirements

Fix the SQL injection vulnerability by using parameterized queries.

**Recommended Fix:**
Replace string concatenation with parameterized queries.
```

## Focus Areas

Specify `--focus` to prioritize specific aspects:

| Focus | Aliases | Coverage |
|-------|---------|----------|
| `security` | `sec`, `vuln` | SECU-S, OWASP Top 10, CWE Top 25 |
| `performance` | `perf`, `speed` | SECU-E, algorithm complexity, N+1 |
| `correctness` | `logic`, `bugs` | SECU-C, edge cases, error handling |
| `usability` | `maintain`, `quality` | SECU-U, readability, complexity |
| `comprehensive` | `full`, `all` | All SECU categories |

## Effective Review Practices

### Discovery Phase

1. **Define scope first** — Glob to find files in target
2. **Map structure** — Grep for key patterns (classes, functions, imports)
3. **Read strategically** — Focus on changed/complex files

### Analysis Phase

1. **Start with security** — Check for OWASP Top 10 patterns
2. **Then performance** — Look for N+1, missing indexes
3. **Then correctness** — Trace logic, check edge cases
4. **Finally usability** — Assess readability, complexity

### Reporting Phase

1. **Prioritize clearly** — P1 issues first
2. **Be specific** — Exact file:line references
3. **Explain impact** — Why this matters
4. **Provide fix** — Concrete recommendation

## Review Quality Checklist

Before presenting findings:

- [ ] All P1 issues have exact file:line locations
- [ ] All P1 issues include concrete fix recommendations
- [ ] Impact is explained in business terms
- [ ] Priority classification follows severity calculation
- [ ] No duplicate findings reported
- [ ] rd3:tasks used to create fix tasks

## Additional Resources

| Resource | Description |
|---------|-------------|
| `references/best-practices.md` | Comprehensive review checklists by category |
| `references/output-format.md` | Detailed output format specification |
| `references/query-patterns.md` | Code search patterns for discovery |
| `assets/review_prompt.md` | Review prompt template |
| `assets/planning_prompt.md` | Planning prompt template |
| `assets/code-review-result.md` | Result output template |

## See Also

- **rd3:run-acp** — Cross-channel execution delegation
- **rd3:tasks** — Task creation for review findings
- **rd3:sys-debugging** — Root cause investigation
- **rd3:quick-grep** — Code search patterns
- **rd3:tdd-workflow** — Test-driven development
