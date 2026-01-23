# OpenCode Query Patterns

Effective prompt patterns for getting the best code reviews from OpenCode CLI.

## Prompt Principles

1. **Be Specific** - Target exact files and issues
2. **Provide Context** - Include relevant code snippets
3. **Ask for Format** - Request structured output
4. **Set Scope** - Define boundaries for review

## Security Review Patterns

### SQL Injection Detection

```
Review the following code for SQL injection vulnerabilities:

[Insert code snippet]

Check for:
1. String concatenation in queries
2. Unparameterized user input
3. Dynamic SQL construction
4. ORM raw query usage
```

### Authentication Review

```
Analyze the authentication system for security issues:

Files:
- src/auth/login.py
- src/auth/middleware.py

Check:
1. Password storage and hashing
2. Session management
3. Token validation
4. Rate limiting
5. Multi-factor authentication
```

## Performance Review Patterns

### N+1 Query Detection

```
Review for N+1 query problems in:

[Insert code or describe files]

Look for:
1. Loops with database queries
2. Missing eager loading
3. Unoptimized relationships
4. Missing indexes
```

### Memory Leak Analysis

```
Analyze memory usage patterns in:

[Insert code]

Check for:
1. Unclosed resources
2. Circular references
3. Cache without limits
4. Growing data structures
```

## Architecture Review Patterns

### Design Pattern Analysis

```
Review the architecture of:

[Describe system]

Analyze:
1. Design patterns used
2. Coupling between modules
3. Adherence to SOLID principles
4. Separation of concerns
```

### Scalability Assessment

```
Evaluate the scalability of:

[Insert code or system]

Consider:
1. Current bottlenecks
2. Horizontal scaling options
3. Vertical scaling needs
4. Caching opportunities
```

## Comprehensive Review Pattern

```
Conduct a comprehensive code review of:

Target: [directory or files]
Focus Areas:
- Security (injection, auth, data exposure)
- Performance (algorithms, queries, memory)
- Testing (coverage, edge cases)
- Quality (readability, maintainability)
- Architecture (patterns, coupling, cohesion)

For each category:
1. Identify issues
2. Prioritize by severity (Critical/High/Medium/Low)
3. Provide specific file:line references
4. S actionable fixes

Output format:
- Quality score (1-10)
- Issues by priority
- Overall recommendation
```

## Planning Review Patterns

### Implementation Planning

```
Create an implementation plan for:

[Describe feature or system]

Include:
1. Current architecture analysis
2. Recommended architecture
3. Migration steps
4. Risk assessment
5. Testing strategy
6. Estimated timeline
```

### Refactoring Strategy

```
Plan refactoring for:

[Insert code description]

Provide:
1. Current code issues
2. Refactoring phases
3. Testing approach
4. Rollback strategy
```

## Model Selection Guide

OpenCode supports multiple AI models. Choose based on task:

| Task Type | Recommended Model | Rationale |
|-----------|------------------|-----------|
| Security audit | Claude, GPT-4 | Thorough analysis |
| Quick review | GPT-3.5-Turbo | Fast turnaround |
| Code explanation | Claude, Gemini | Clear explanations |
| Architecture planning | GPT-4, Claude | Big-picture thinking |
| Pattern recognition | Claude | Strong pattern recognition |

## Effective Prompt Templates

### Template 1: Targeted Review

```
Review [specific file or component] for [specific focus areas]:

Context:
[Insert relevant context]

Code to review:
[Insert code snippet or file references]

Please analyze:
1. [Specific aspect 1]
2. [Specific aspect 2]
3. [Specific aspect 3]

Provide:
- File:line references for issues
- Severity assessment
- Specific fix recommendations
```

### Template 2: Comprehensive Review

```
Conduct comprehensive code review of:

Target: [directory or files]
Focus: All areas (security, performance, testing, quality, architecture)

For each category:
1. List findings with severity
2. Reference exact locations
3. Provide actionable fixes
4. Suggest improvements

Output structured review with:
- Executive summary
- Quality score (1-10)
- Issues by priority (Critical/High/Medium/Low)
- Overall recommendation
```

### Template 3: Planning Request

```
Create implementation plan for:

Feature: [description]
Current state: [current implementation]
Target state: [desired outcome]

Provide:
1. Architecture recommendations
2. Step-by-step implementation plan
3. Risk assessment per step
4. Dependencies and prerequisites
5. Testing strategy
6. Timeline estimation
```

## Error Recovery

### Poor Quality Review

```
The review was too generic. How can I get better results?

Response: Be more specific:
1. Target exact files instead of entire directory
2. Provide code context in prompt
3. Ask for specific vulnerability types
4. Request structured output format
```

### Missing Context

```
The review missed important context. What should I include?

Response: Add context like:
1. Purpose of the code
2. External dependencies
3. Security requirements
4. Performance constraints
5. Usage patterns
```

### Timeout Issues

```
The review timed out. How can I fix this?

Response: Reduce scope:
1. Review specific files instead of full directory
2. Focus on one area at a time
3. Split large reviews into multiple runs
4. Use shorter, more targeted prompts
```

## Best Practices

### DO

✅ Provide file paths and context
✅ Specify focus areas clearly
✅ Request structured output format
✅ Include code snippets when relevant
✅ Set appropriate timeout for large reviews

### DON'T

❌ Ask "review everything" without focus
❌ Provide vague context like "fix my code"
❌ Expect mind-reading of your intent
❌ Skip mentioning specific concerns
❌ Use extremely long prompts without structure
