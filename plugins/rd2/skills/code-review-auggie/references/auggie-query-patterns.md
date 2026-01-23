# Auggie Query Patterns

Effective patterns for querying Auggie's codebase-retrieval MCP tool for code review.

## Overview

Auggie's codebase-retrieval tool uses semantic search to understand code relationships. Unlike text-based search, Auggie understands:
- Code structure and patterns
- Dependencies between modules
- Function call relationships
- Established conventions in your codebase

---

## Core Query Patterns

### Pattern 1: Find Function Definitions

```python
# Ask about specific functions
"Where is the authenticate_user function defined?"
"Show me the validate_password implementation"
"How is the JWT token created?"
```

**Why this works**: Auggie maps function definitions to their locations and usage.

### Pattern 2: Understand Dependencies

```python
# Explore relationships
"What modules does auth.py depend on?"
"What functions call the database layer?"
"Where is UserService used?"
```

**Why this works**: Auggie tracks import and call relationships.

### Pattern 3: Find Security Issues

```python
# Security-focused queries
"Where does user input go into SQL queries?"
"Find all places where we handle passwords"
"Show me authentication and authorization code"
"Where are external API calls made?"
```

**Why this works**: Auggie recognizes security-sensitive patterns.

### Pattern 4: Performance Analysis

```python
# Performance queries
"Find N+1 query patterns"
"Where are database queries in loops?"
"Show me expensive operations"
"Find synchronous I/O in async functions"
```

**Why this works**: Auggie identifies anti-patterns in code.

---

## Code Review Specific Queries

### Security Review Queries

```python
# Input validation
"Where is user input from HTTP requests validated?"
"Find form data handling without validation"
"Show me user-provided data flows"

# Authentication/Authorization
"Where is authentication checked?"
"Find endpoints without authentication"
"Show me permission checks"
"Where are admin-only operations?"

# Data handling
"Where are secrets or API keys stored?"
"Find database queries with user input"
"Show me file upload handling"
"Where is sensitive data logged?"
```

### Performance Review Queries

```python
# Database patterns
"Find database queries without indexes"
"Show me queries in loops"
"Where are large result sets fetched?"
"Find missing eager loading"

# Algorithm complexity
"Find nested loops over data structures"
"Show me recursive functions"
"Where are expensive computations?"

# Resource management
"Find unclosed database connections"
"Show me memory-intensive operations"
"Where are large files loaded?"
```

### Code Quality Queries

```python
# Code duplication
"Find similar authentication patterns"
"Show me repeated error handling"
"Where is the same validation logic duplicated?"

# Maintainability
"Find functions longer than 50 lines"
"Show me complex conditional logic"
"Where are magic numbers used?"

# Error handling
"Find exceptions that are caught but not handled"
"Show me missing error handling"
"Where is generic exception catching?"
```

### Testing Queries

```python
# Coverage
"What functions lack unit tests?"
"Show me untested error paths"
"Find edge cases not covered"

# Test quality
"Find tests with assertions"
"Show me mocked dependencies"
"Where are integration tests needed?"
```

---

## Architecture Analysis Queries

### Pattern Discovery

```python
# Identify patterns
"What design patterns are used?"
"Show me dependency injection usage"
"Find factory pattern implementations"
"Where is the repository pattern used?"
```

### Module Relationships

```python
# Coupling analysis
"What depends on the auth module?"
"Show me circular dependencies"
"Which modules have high coupling?"

# Layer analysis
"Where does business logic live?"
"Find data access layer patterns"
"Show me controller to service relationships"
```

### Data Flow

```python
# Trace data flow
"How does a user request flow through the system?"
"Trace payment processing from API to database"
"Show me error propagation paths"
```

---

## Contextual Queries

### Before Writing Code

```python
# Check existing patterns
"How do we handle API errors in this codebase?"
"What's the pattern for database transactions?"
"Show me existing middleware implementations"
"How are environment variables used?"
```

### Understanding Legacy Code

```python
# Decipher old code
"Explain the legacy authentication flow"
"What is the purpose of this utility function?"
"Show me where this complex logic is used"
"Find unused or deprecated code"
```

### Refactoring Planning

```python
# Assess refactoring scope
"What would break if I change this function?"
"Where is this class instantiated?"
"Show me all uses of this deprecated pattern"
"Find tight coupling to this module"
```

---

## Advanced Query Techniques

### Combining Concepts

```python
# Multi-aspect queries
"Find async functions that do database I/O"
"Show me authenticated endpoints with file uploads"
"Where do we handle JSON input without validation?"
```

### Comparative Queries

```python
# Compare patterns
"How does auth differ between admin and user?"
"Show me different error handling patterns"
"Compare database access patterns across modules"
```

### Temporal Queries

```python
# Recent changes
"What was added to the auth module recently?"
"Show me new API endpoints"
"Find recently added security code"
```

---

## Query Anti-Patterns

### Avoid Too Broad

```python
# Bad: Too vague
"What does this code do?"
"Explain everything"

# Good: Specific
"What does the authenticate function do?"
"Explain the JWT validation logic"
```

### Avoid Assumptions

```python
# Bad: Assumes knowledge
"Find the bug in auth.py"

# Good: Open-ended exploration
"Find potential security issues in auth.py"
"Show me error handling in auth.py"
```

### Avoid Implementation

```python
# Bad: Asks for code changes
"Rewrite this function to be faster"
"Add error handling here"

# Good: Asks for analysis
"How could this function be improved?"
"What error handling is missing?"
```

---

## Best Practices

### 1. Start Broad, Then Narrow

```python
# First: Understand the area
"Show me the authentication module"

# Then: Specific questions
"How is JWT validation implemented?"
"Where are tokens refreshed?"
```

### 2. Use Semantic Language

```python
# Good: Domain terms
"Where are user permissions checked?"
"Show me payment processing flow"

# Bad: Literal text
"Find 'if user.has_perm'"
"Show me 'def process_payment'"
```

### 3. Leverage Context

```python
# Reference existing code
"Handle errors like the auth module does"
"Use the same pattern as other API endpoints"
```

### 4. Iterate on Results

```python
# First pass gives overview
"What databases queries are in this function?"

# Follow up on specific findings
"Show me the query on line 45"
"Where is this query result used?"
```

---

## Example Review Sessions

### Security Review Session

```python
# 1. Understand authentication
"How does authentication work in this codebase?"

# 2. Find input handling
"Where is user input from API requests processed?"

# 3. Check for vulnerabilities
"Find SQL queries with user input"
"Show me authentication bypass possibilities"
"Where are secrets stored?"

# 4. Verify best practices
"Show me password hashing"
"Find rate limiting implementation"
"Where is HTTPS enforced?"
```

### Performance Review Session

```python
# 1. Identify hot paths
"What are the main API endpoints?"
"Show me database query patterns"

# 2. Find inefficiencies
"Find N+1 query patterns"
"Show me database queries in loops"
"Where are large result sets fetched?"

# 3. Check resource usage
"Find unclosed connections"
"Show me caching opportunities"
"Where is synchronous I/O in async code?"
```

### Architecture Review Session

```python
# 1. Understand structure
"What is the overall architecture pattern?"
"Show me module dependencies"

# 2. Check separation of concerns
"Where does business logic live?"
"Find data access code in controllers"
"Show me service layer patterns"

# 3. Assess coupling
"What modules have high coupling?"
"Find circular dependencies"
"Show me tightly coupled components"
```

---

## See Also

- `../SKILL.md` - Main skill documentation
- `usage-examples.md` - Comprehensive usage examples
- `import-format.md` - Import command format reference
- [Auggie Documentation](https://docs.augmentcode.com/)
