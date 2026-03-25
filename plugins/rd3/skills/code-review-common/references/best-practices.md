---
name: code-review-best-practices
description: "Comprehensive review checklists for security, performance, correctness, and maintainability"
see_also:
  - rd3:code-review-common
  - rd3:quick-grep
  - rd3:sys-debugging
---

# Code Review Best Practices

Comprehensive checklists and guidelines for conducting effective code reviews using the SECU framework.

## Core Principles

1. **Be Specific** — Reference exact file:line locations
2. **Be Actionable** — Provide concrete fix recommendations
3. **Be Prioritized** — Classify using P1-P4 taxonomy
4. **Be Constructive** — Focus on code improvement, not criticism
5. **Be Thorough** — Cover all SECU categories

## Discovery Workflow

### Phase 1: Scope Definition

```bash
# Define review scope
Glob: "src/**/*.ts"
Glob: "src/**/*.py"

# Target specific modules
Glob: "src/auth/**/*"
Glob: "src/api/**/*.py"
```

### Phase 2: Structure Mapping

```bash
# Find entry points and key files
Glob: "*/main.py"
Glob: "*/app.ts"
Glob: "*/index.js"

# Map dependencies
Grep: "from.*import"
Grep: "^import "

# Find key classes and functions
Grep: "class.*Controller"
Grep: "class.*Service"
Grep: "def.*handler"
```

### Phase 3: Targeted Analysis

```bash
# Security-sensitive patterns
Grep: "password"
Grep: "token"
Grep: "secret"
Grep: "auth"

# Performance-sensitive patterns
Grep: "for.*in.*:\\s*query\\("
Grep: "SELECT.*FROM.*%s"
Grep: "for.*in.*:\\s*requests\\."
```

---

## Security Review Checklist

### Input Validation

| Check | Pattern | Fix |
|-------|---------|-----|
| All user input validated | `request\.json\[`, `request\.args\[` | Add validation schema |
| SQL parameterized | `execute.*%s`, `query.*format` | Use parameterized queries |
| File uploads validated | `open.*user`, `upload.*path` | Validate file type, size, path |
| URL sanitized | `fetch.*user`, `requests.*user` | URL validation, allowlist |
| JSON verified | `JSON\.parse.*user` | Schema validation |

### Authentication & Authorization

| Check | Pattern | Fix |
|-------|---------|-----|
| Password hashing | No `bcrypt`, `argon2`, `scrypt` | Use secure hashing |
| JWT validated | `jwt\.decode` without verification | Always verify signature |
| Session secure | No `session = user_id` | Use server-side sessions |
| Rate limiting | No `@rate_limit` | Add rate limiting |
| Permissions checked | Missing `@require_auth` | Add auth decorators |

### Data Protection

| Check | Pattern | Fix |
|-------|---------|-----|
| No secrets in code | `password.*=.*"`, `api_key.*=.*"` | Use environment variables |
| Sensitive logs | `console\.log.*password`, `logger\.info.*token` | Sanitize sensitive data |
| HTTPS enforced | `http://` in production | Use HTTPS only |
| Secure headers | Missing security headers | Add CSP, X-Frame-Options |

### Common Vulnerabilities

| Vulnerability | Detection | Prevention |
|--------------|-----------|------------|
| **SQL Injection** | `execute.*%s`, `f"SELECT.*{.*}"` | Parameterized queries |
| **XSS** | `innerHTML.*user`, `dangerouslySetInnerHTML` | Sanitize output |
| **CSRF** | Missing `@csrf_exempt` | Add CSRF tokens |
| **Path Traversal** | `open.*user_path`, `read_file.*user` | Validate paths |
| **Command Injection** | `subprocess.*shell=True`, `exec.*user` | Avoid shell=True |
| **XXE** | `etree\.parse.*user` | Disable DTD |
| **SSRF** | `requests.*user_url`, `fetch.*user_input` | URL validation |

---

## Performance Review Checklist

### Database

| Check | Detection | Fix |
|-------|----------|-----|
| No N+1 queries | `for.*in.*:\\s*query\\(` | Use JOIN or eager loading |
| Indexes present | Columns in WHERE without index | Add indexes |
| Connection pooling | Creating new connection per request | Use connection pool |
| Query limiting | `SELECT *` without LIMIT | Add LIMIT |
| No SELECT * | `SELECT \*` | Select only needed columns |

### Caching

| Check | Detection | Fix |
|-------|----------|-----|
| Expensive ops cached | Repeated computation | Add caching layer |
| Cache invalidation | Missing cache clear | Implement invalidation |
| TTL configured | Cache never expires | Set appropriate TTL |
| Cache keys consistent | Different formats for same key | Standardize key format |

### Memory

| Check | Detection | Fix |
|-------|----------|-----|
| No memory leaks | Growing resident set | Check cleanup paths |
| Large objects | Loading entire file into memory | Stream processing |
| Resource cleanup | Missing `close()`, `cleanup()` | Add finally blocks |
| Limits set | No `max_size` on collections | Add size limits |

### Async

| Check | Detection | Fix |
|-------|----------|-----|
| I/O async | `requests\.get\(`, `fetch\(.*await` | Use async/await |
| No blocking calls | `time\.sleep` in async | Use `asyncio\.sleep` |
| Proper error handling | Silent `except` in async | Add error handling |
| Timeout handling | No timeout on I/O | Add timeouts |

---

## Correctness Review Checklist

### Logic Errors

| Check | Detection | Fix |
|-------|----------|-----|
| Off-by-one | `i <= arr.length` | Use `i < arr.length` |
| Wrong operator | `||` instead of `&&` | Fix boolean logic |
| Null handling | Accessing `.property` without check | Add optional chaining |
| Edge cases | Missing empty input handling | Add edge case tests |

### Error Handling

| Check | Detection | Fix |
|-------|----------|-----|
| Silent failures | `except: pass`, `catch { }` | Log errors properly |
| Swallowed exceptions | `except Exception: pass` | Re-raise or handle |
| Missing try/catch | Unhandled promise rejection | Add error boundaries |
| No error messages | `throw new Error()` | Include context |

### Concurrency

| Check | Detection | Fix |
|-------|----------|-----|
| Race conditions | Shared mutable state | Use locks/mutex |
| Deadlocks | Nested locks | Lock ordering |
| Thread safety | Global mutable state | Use thread-local |
| Atomic operations | `count++` in concurrent | Use atomic types |

### Type Safety

| Check | Detection | Fix |
|-------|----------|-----|
| Unchecked casts | `(Type) variable` | Use type guards |
| Missing null checks | `obj.property` without check | Use optional chaining |
| Any types | `: any` without reason | Specify proper types |
| Implicit any | Missing type annotations | Add explicit types |

---

## Maintainability Review Checklist

### Readability

| Check | Detection | Fix |
|-------|----------|-----|
| Clear naming | Single letter vars, cryptic names | Rename to descriptive |
| Self-documenting | Missing comments on complex logic | Add explanatory comments |
| Logical organization | Code in random order | Group related logic |
| Consistent style | Mixed `let`/`const`, `==`/`===` | Enforce style guide |
| No magic numbers | `if (x > 18)` | Define as constants |

### Complexity

| Check | Detection | Fix |
|-------|----------|-----|
| Function length | Functions > 50 lines | Split into smaller |
| Cyclomatic complexity | Deep nesting, many branches | Simplify logic |
| Class size | Classes > 300 lines | Extract responsibilities |
| Import count | > 20 imports per file | Reduce coupling |

### Coupling

| Check | Detection | Fix |
|-------|----------|-----|
| Tight coupling | Direct instantiation | Use dependency injection |
| Circular deps | A imports B, B imports A | Break cycle |
| God objects | Classes doing everything | Split responsibilities |
| Feature envy | Class accessing others' data | Move methods closer |

### DRY Violations

| Check | Detection | Fix |
|-------|----------|-----|
| Code duplication | Copy-paste patterns | Extract to function |
| Magic strings | Repeated string literals | Define as constants |
| Duplicate logic | Same if/else in multiple places | Extract to function |

---

## Issue Classification Examples

### P1 - Critical (Block Merge)

```markdown
**[P1-001]** SQL Injection in Login
- **Location**: src/auth/login.ts:45
- **Issue**: User input concatenated into SQL query
- **Impact**: Arbitrary SQL execution, database compromise
- **Fix**: Use parameterized queries
```

### P2 - High (Fix Before Release)

```markdown
**[P2-001]** Missing Rate Limiting
- **Location**: src/api/auth.ts:10
- **Issue**: No rate limiting on login endpoint
- **Impact**: Brute force attack vulnerability
- **Fix**: Add rate limiting middleware
```

### P3 - Medium (Next Sprint)

```markdown
**[P3-001]** N+1 Query Pattern
- **Location**: src/users/list.ts:78
- **Issue**: Query inside loop for user orders
- **Impact**: Performance degradation with many users
- **Fix**: Use JOIN or batch query
```

### P4 - Low (Nice to Have)

```markdown
**[P4-001]** Magic Number
- **Location**: src/auth/validation.ts:23
- **Issue**: Hardcoded value 18 for age check
- **Impact**: Unclear what value represents
- **Fix**: Define as `MINIMUM_AGE` constant
```

---

## Writing Effective Reviews

### Do's

- ✅ **Provide context**: Explain why this is an issue
- ✅ **Show examples**: Both bad AND good code
- ✅ **Explain impact**: Business/reliability impact
- ✅ **Be constructive**: Offer improvement paths
- ✅ **Acknowledge good code**: Positive reinforcement

### Don'ts

- ❌ **Be vague**: "This code is bad" without specifics
- ❌ **Use absolute language**: "Always do X" without exceptions
- ❌ **Ignore context**: Suggest changes without understanding requirements
- ❌ **Be pedantic**: Focus on style over substance
- ❌ **Overwhelm**: Too many issues at once

---

## Continuous Improvement

### After Each Review

1. Did I provide actionable feedback?
2. Was I specific with locations?
3. Did I prioritize correctly?
4. Did I explain the "why"?
5. Did I acknowledge good patterns?

### Tracking Metrics

- Reviews conducted
- Issues found by priority
- Fix rate (P1s fixed before merge)
- Response time
- Developer feedback

### Review Your Reviews

Use this checklist to improve review quality:

| Question | Yes | No |
|----------|-----|-----|
| Are all P1s actionable? | | |
| Are locations exact (file:line)? | | |
| Is impact explained? | | |
| Are fixes concrete? | | |
| Is priority consistent? | | |
