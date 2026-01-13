---
name: code-patterns
description: Use for API design, testing, Docker, CI/CD, or database work. Contains verified patterns and best practices.
---

# Code Patterns Reference

A curated collection of production-ready patterns for common development tasks.

## Available Pattern Files

| Pattern | File | Topics |
|---------|------|--------|
| API Design | [api-patterns.md](api-patterns.md) | REST, GraphQL, error handling, pagination |
| Testing | [testing-patterns.md](testing-patterns.md) | Unit, integration, E2E, mocking |
| Docker | [docker-patterns.md](docker-patterns.md) | Multi-stage builds, security, compose |
| Database | [database-patterns.md](database-patterns.md) | Migrations, queries, indexing, ORM |

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
| Building REST API | api-patterns.md |
| Adding GraphQL | api-patterns.md |
| Writing tests | testing-patterns.md |
| Test data setup | testing-patterns.md |
| Docker setup | docker-patterns.md |
| Production deployment | docker-patterns.md |
| Schema design | database-patterns.md |
| Query optimization | database-patterns.md |

## Integration with Expert Agents

Expert agents should reference these patterns:

```markdown
## Competency Lists

### Patterns Reference
- API patterns: See skills/code-patterns/api-patterns.md
- Testing patterns: See skills/code-patterns/testing-patterns.md
- Docker patterns: See skills/code-patterns/docker-patterns.md
- Database patterns: See skills/code-patterns/database-patterns.md
```
