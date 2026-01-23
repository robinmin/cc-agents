# Code Review Best Practices

Guidelines for conducting effective code reviews with Claude.

## Core Principles

1. **Be Specific** - Reference exact file:line locations
2. **Be Actionable** - Provide concrete fix recommendations
3. **Be Prioritized** - Use Critical/High/Medium/Low consistently
4. **Be Respectful** - Focus on code, not people
5. **Be Thorough** - Cover security, performance, quality, testing

## Review Workflow

### Phase 1: Discovery

```bash
# 1. Understand the scope
Glob: "src/**/*.py"

# 2. Find key files
Grep: "def.*auth"
Grep: "class.*Controller"

# 3. Read strategically
Read: src/auth/login.py
Read: src/api/routes.py
```

### Phase 2: Analysis

Use the **SECU** framework:
- **S**ecurity - Vulnerabilities, exposure points
- **E**fficiency - Performance, resource usage
- **C**orrectness - Logic errors, edge cases
- **U**sability - API design, documentation

### Phase 3: Reporting

Structure findings by priority:
1. Critical - Must fix before merge
2. High - Should fix soon
3. Medium - Consider fixing
4. Low - Nice to have

## Issue Classification

### Critical Issues (Must Fix)

Block merge. Security vulnerabilities, data loss risks, major bugs.

**Examples:**
- SQL injection
- Authentication bypass
- Uncaught exceptions on happy path
- Data loss or corruption
- Privacy violations

**Template:**
```markdown
**[CRITICAL-NNN]** Short Title
- **Location**: file.py:line
- **Issue**: What's wrong
- **Impact**: Why it's critical
- **Fix**: How to fix it (with code example)
```

### High Priority Issues (Should Fix)

Fix before next release. Security concerns, performance problems.

**Examples:**
- Missing error handling
- Performance bottlenecks
- Insecure defaults
- Poor error messages
- Race conditions

### Medium Priority Issues (Consider Fixing)

Technical debt, maintainability concerns.

**Examples:**
- Code duplication
- Poor naming
- Missing type hints
- Inconsistent style
- Missing tests

### Low Priority Issues (Nice to Have)

Minor improvements, optimizations.

**Examples:**
- Comment improvements
- Minor optimizations
- Style inconsistencies
- Documentation gaps

## Security Review Checklist

### Input Validation

- [ ] All user input validated
- [ ] SQL queries parameterized
- [ ] File uploads validated
- [ ] URL parameters sanitized
- [ ] JSON input verified

### Authentication & Authorization

- [ ] Password requirements enforced
- [ ] Passwords hashed (bcrypt/argon2)
- [ ] Session tokens secure
- [ ] JWT properly validated
- [ ] Rate limiting on auth endpoints
- [ ] Permissions checked on sensitive operations

### Data Protection

- [ ] Sensitive data encrypted at rest
- [ ] Secrets not in code
- [ ] HTTPS enforced
- [ ] Sensitive logs masked
- [ ] PII handled correctly
- [ ] Secure headers set

### Common Vulnerabilities

| Vulnerability | Detection | Prevention |
|--------------|-----------|------------|
| SQL Injection | `execute.*%s` | Parameterized queries |
| XSS | `innerHTML` | Sanitize output |
| CSRF | Missing tokens | Add CSRF tokens |
| Path Traversal | `open.*user` | Validate paths |
| Command Injection | `subprocess.*shell=True` | Avoid shell=True |

## Performance Review Checklist

### Database

- [ ] No N+1 queries
- [ ] Indexes on queried columns
- [ ] Connection pooling configured
- [ ] Query result limiting
- [ ] No SELECT *

### Caching

- [ ] Expensive operations cached
- [ ] Cache invalidation strategy
- [ ] TTL configured appropriately
- [ ] Cache keys consistent

### Memory

- [ ] No memory leaks
- [ ] Large objects cleaned up
- [ ] Streaming for large data
- [ ] Resource limits set

### Async

- [ ] I/O operations async
- [ ] No blocking calls in async
- [ ] Proper error handling in async
- [ ] Timeout handling

## Code Quality Checklist

### Readability

- [ ] Clear variable names
- [ ] Self-documenting code
- [ ] Logical organization
- [ ] Appropriate comments
- [ ] Consistent style

### Maintainability

- [ ] DRY principle followed
- [ ] Single responsibility
- [ ] Modular design
- [ ] Interface segregation
- [ ] Dependency injection

### Testing

- [ ] Unit tests for core logic
- [ ] Integration tests for flows
- [ ] Edge cases covered
- [ ] Error cases tested
- [ ] Tests are maintainable

### Type Safety

- [ ] Type hints present
- [ ] No `Any` types without reason
- [ ] Proper error handling
- [ ] Input validation
- [ ] Output contracts

## Writing Effective Reviews

### Do's

✅ **Provide context**: "This SQL query is vulnerable because..."

✅ **Show examples**: Provide both bad and good code

✅ **Explain why**: Not just "fix this" but "this causes X risk"

✅ **Be constructive**: Focus on improvement, not criticism

✅ **Acknowledge good code**: Positive reinforcement works

### Don'ts

❌ **Be vague**: "This code is bad" (explain what and why)

❌ **Use absolute language**: "Always do X" (consider trade-offs)

❌ **Ignore context**: Suggest changes without understanding requirements

❌ **Be pedantic**: Focus on style over substance

❌ **Overwhelm**: Too many issues at once - prioritize

## Code Examples in Reviews

### Good Example

```markdown
**[HIGH-001]** SQL Injection Vulnerability
- **Location**: src/auth/login.py:45
- **Issue**: User input directly concatenated into query
- **Impact**: Allows attackers to execute arbitrary SQL, potentially
  accessing all user data or bypassing authentication.
- **Fix**: Use parameterized queries:

```python
# Current (vulnerable)
query = f"SELECT * FROM users WHERE username = '{username}'"
cursor.execute(query)

# Fixed (parameterized)
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))
```

This ensures the input is treated as data, not executable code.
```

### Bad Example

```markdown
- SQL injection in login.py
- Fix it
```

## Prioritization Framework

### Severity Calculation

```
Severity = (Likelihood × Impact) / Effort

Where:
- Likelihood: 1-5 (5 = very likely)
- Impact: 1-5 (5 = critical)
- Effort: 1-5 (5 = very easy to fix)
```

### Quick Decision Matrix

| Impact | High Effort | Low Effort |
|--------|-----------|------------|
| **High** | High priority | Critical |
| **Medium** | Medium | High |
| **Low** | Low | Medium |

## Review Templates

### Security Review Template

```markdown
## Security Review: <target>

### Authentication
- [ ] Password handling
- [ ] Session management
- [ ] Token validation

### Authorization
- [ ] Permission checks
- [ ] Role enforcement
- [ ] Resource isolation

### Data Protection
- [ ] Encryption at rest
- [ ] Encryption in transit
- [ ] Sensitive data handling

### Common Vulnerabilities
- [ ] SQL injection
- [ ] XSS
- [ ] CSRF
- [ ] Path traversal

## Critical Issues
...

## Recommendations
1. Implement security headers
2. Add rate limiting
3. Enable security logging
```

### Performance Review Template

```markdown
## Performance Review: <target>

### Database Performance
- [ ] Query efficiency
- [ ] Index usage
- [ ] Connection pooling

### Caching Strategy
- [ ] Cache hit rates
- [ ] Invalidation strategy
- [ ] TTL configuration

### Resource Usage
- [ ] Memory profile
- [ ] CPU usage
- [ ] I/O patterns

### Bottlenecks
- [ ] Identified bottlenecks
- [ ] Optimization opportunities
- [ ] Expected improvements

## Critical Issues
...

## Recommendations
1. Add database indexes
2. Implement query caching
3. Optimize hot paths
```

## Continuous Improvement

### Review Your Reviews

After each review, ask:
1. Did I provide actionable feedback?
2. Was I respectful and constructive?
3. Did I prioritize correctly?
4. Did I explain the "why"?
5. Did I acknowledge good code?

### Track Metrics

- Reviews conducted
- Issues found by priority
- Fix rate
- Response time
- Developer satisfaction

### Improve Your Skills

1. Study security vulnerabilities (OWASP Top 10)
2. Learn performance profiling
3. Understand design patterns
4. Practice code review regularly
5. Get feedback on your reviews

## Handling Disagreements

### When Developers Disagree

1. **Listen first** - Understand their perspective
2. **Explain your reasoning** - Reference best practices
3. **Provide evidence** - Show security/impact
4. **Offer alternatives** - Multiple solutions
5. **Escalate if needed** - For critical issues

### What to Escalate

- Security vulnerabilities (unfixed)
- Data loss risks (unfixed)
- Legal/compliance issues
- Architecture violations
- Repeated pattern issues

## Tools and Resources

### Static Analysis

- **Bandit** - Python security
- **Pylint** - Code quality
- **mypy** - Type checking
- **Safety** - Dependency vulnerabilities

### Dynamic Analysis

- **pytest** - Test coverage
- **pytest-cov** - Coverage reports
- **py-spy** - Profiling
- **memory_profiler** - Memory usage

### Documentation

- OWASP Top 10
- CWE Top 25
- Python Security Best Practices
- Google Python Style Guide
