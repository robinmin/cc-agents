---
name: code-patterns
version: 1.0.0
description: This skill should be used when the user asks to "design a REST API", "add pagination to endpoints", "set up Docker", "write database migrations", "implement unit tests", "containerize an application", "optimize database queries", "add error handling to API", "create multi-stage Docker build", "write integration tests", or mentions API design, testing patterns, Docker configuration, or database patterns. Provides verified production-ready patterns and best practices.
---

# Code Patterns Reference

A curated collection of production-ready patterns for common development tasks.

## How to Apply These Patterns

### Pattern Selection Workflow

Follow this decision tree to select the appropriate pattern:

```
User Request
    │
    ├─ API/Endpoints/GraphQL?
    │   └─> references/api-patterns.md
    │
    ├─ Tests/Testing/Mocking?
    │   └─> references/testing-patterns.md
    │
    ├─ Docker/Container/Deployment?
    │   └─> references/docker-patterns.md
    │
    └─ Database/Schema/Queries?
        └─> references/database-patterns.md
```

### Step-by-Step Application

1. **Identify the domain** - Determine which area the task falls under (API, testing, Docker, database)

2. **Read the relevant pattern file** - Reference the appropriate `references/*.md` file for detailed patterns

3. **Apply the pattern** - Use the provided code examples and best practices as templates

4. **Adapt as needed** - Patterns are starting points; adjust based on specific requirements

### Example: Creating a REST API

```bash
# User asks: "Design a REST API for user management"

# Claude workflow:
1. Identify domain: API design
2. Read: references/api-patterns.md
3. Apply:
   - Use resource-based URLs (/api/v1/users)
   - Implement proper HTTP verbs (GET, POST, PUT, DELETE)
   - Add standard error response format
   - Include cursor-based pagination
4. Adapt: Add custom fields based on user requirements
```

### Integration for Expert Agents

When implementing features that require patterns, expert agents should:

1. **Reference patterns proactively** - Before generating code, check relevant pattern files
2. **Use pattern structure** - Follow the established conventions and formats
3. **Adapt, don't copy** - Patterns are templates; adjust to specific context
4. **Cite the pattern** - Mention which pattern was applied for transparency

```markdown
## Pattern Integration Example

User: "Create a paginated user list endpoint"

Agent: I'll design this following REST API patterns from references/api-patterns.md:

- Use cursor-based pagination for stability
- Return standard pagination metadata
- Apply proper HTTP status codes
```

## Available Pattern Files

| Pattern | File | Topics |
|---------|------|--------|
| API Design | [references/api-patterns.md](references/api-patterns.md) | REST, GraphQL, error handling, pagination |
| Testing | [references/testing-patterns.md](references/testing-patterns.md) | Unit, integration, E2E, mocking |
| Docker | [references/docker-patterns.md](references/docker-patterns.md) | Multi-stage builds, security, compose |
| Database | [references/database-patterns.md](references/database-patterns.md) | Migrations, queries, indexing, ORM |

## Quick Reference

### API Design

- **REST**: Resource-based URLs, proper HTTP verbs
- **Error handling**: Structured errors with codes
- **Pagination**: Cursor-based for large datasets
- **Versioning**: URL versioning (`/api/v1/`)

### Testing

- **Unit tests**: Isolate dependencies, test behavior not implementation
- **Integration tests**: Real dependencies, cleanup after
- **E2E tests**: Critical paths only, stable selectors
- **Test pyramid**: 70% unit, 20% integration, 10% E2E

### Docker

- **Multi-stage**: Separate build and runtime
- **Security**: Non-root user, minimal base images
- **Layers**: Cache-friendly ordering, combine RUN
- **Health checks**: Always add HEALTHCHECK

### Database

- **Migrations**: Up/down pattern, keep small
- **Queries**: Repository pattern, avoid N+1
- **Indexing**: B-tree for most, analyze EXPLAIN
- **Transactions**: Use appropriate isolation level

## When to Use This Skill

Reference these patterns when:

1. Starting a new API or service
2. Setting up test infrastructure
3. Containerizing an application
4. Designing database schema
5. Reviewing code for best practices

## Pattern Selection Guide

| Scenario | Pattern File |
|----------|--------------|
| Building REST API | references/api-patterns.md |
| Adding GraphQL | references/api-patterns.md |
| Writing tests | references/testing-patterns.md |
| Test data setup | references/testing-patterns.md |
| Docker setup | references/docker-patterns.md |
| Production deployment | references/docker-patterns.md |
| Schema design | references/database-patterns.md |
| Query optimization | references/database-patterns.md |

## Additional References

For detailed patterns on specific topics, see:

- **`references/api-patterns.md`** - REST API conventions, error handling, pagination, authentication
- **`references/testing-patterns.md`** - Unit testing, integration testing, E2E patterns, test data
- **`references/docker-patterns.md`** - Multi-stage builds, security, layer optimization, compose
- **`references/database-patterns.md`** - Migrations, query patterns, indexing, transactions, ORM
