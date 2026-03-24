---
name: sys-developing
description: "Production-ready implementation patterns for common development tasks: REST/GraphQL API design, testing (unit/integration/E2E), Docker containerization, and database operations. Trigger when: designing an API, writing tests, containerizing an application, setting up database migrations, or optimizing database queries."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
type: pattern
tags: [coding, patterns, api-design, testing, docker, database, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw,pi"
  category: engineering-core
see_also:
  - rd3:tdd-workflow
  - rd3:sys-testing
  - rd3:sys-debugging
---

# rd3:sys-developing — Implementation Patterns

A curated collection of production-ready patterns for common development tasks. This is the **execution knowledge hub** — the default skill for routine implementation work.

**Trigger when:**
- Designing a REST API or adding endpoints
- Writing unit, integration, or E2E tests
- Containerizing an application with Docker
- Setting up database migrations or optimizing queries

## Overview

`sys-developing` provides verified production-ready patterns for four implementation domains: API design, testing, Docker containerization, and database operations. Each domain is documented in a dedicated reference file with patterns, anti-patterns, and concrete examples.

For rd3 work, prefer Bun, TypeScript, and Biome when the task is runtime- or toolchain-specific.

Use the decision tree below to route to the appropriate pattern file, then apply the templates to your codebase.

## Quick Start

1. **Identify the domain** — Which area does the task fall under: API, testing, Docker, or database?
2. **Read the reference file** — Open the relevant `references/*.md` for detailed patterns
3. **Apply the template** — Use the code examples as starting points
4. **Adapt to context** — Adjust for your specific requirements and conventions

## Workflows

### Applying a Pattern

```
1. Match the request to a domain (API / Testing / Docker / Database)
2. Read the pattern file for that domain
3. Select the appropriate pattern from the catalog
4. Apply the pattern template to your code
5. Adapt the pattern to your specific requirements
```

### Pattern Selection Decision Tree

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

## Pattern Application

### Step-by-Step

1. **Identify the domain** — Determine which area the task falls under (API, testing, Docker, database)

2. **Read the relevant pattern file** — Reference the appropriate `references/*.md` file

3. **Apply the pattern** — Use provided code examples as templates

4. **Adapt as needed** — Patterns are starting points; adjust to specific requirements

## Available Pattern Files

| Pattern | File | Topics |
|---------|------|--------|
| API Design | [references/api-patterns.md](references/api-patterns.md) | REST, GraphQL, error handling, pagination, authentication |
| Testing | [references/testing-patterns.md](references/testing-patterns.md) | Unit, integration, E2E, mocking, test data |
| Docker | [references/docker-patterns.md](references/docker-patterns.md) | Multi-stage builds, security, compose, health checks |
| Database | [references/database-patterns.md](references/database-patterns.md) | Migrations, queries, indexing, ORM, transactions |

## Quick Reference

### API Design

- **REST**: Resource-based URLs, proper HTTP verbs
- **Error handling**: Structured errors with error codes
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

## Worked Examples

### Example: Creating a REST API

```
User: "Design a REST API for user management"

1. Identify domain: API design
2. Read: references/api-patterns.md
3. Apply:
   - Use resource-based URLs (/api/v1/users)
   - Implement proper HTTP verbs (GET, POST, PUT, DELETE)
   - Add standard error response format
   - Include cursor-based pagination
4. Adapt: Add custom fields based on requirements
```

### Example: Writing Unit Tests

```
User: "Add unit tests for the UserService.createUser method"

1. Identify domain: Testing
2. Read: references/testing-patterns.md
3. Apply:
   - Use AAA pattern (Arrange, Act, Assert)
   - Mock external dependencies (userRepository)
   - Test both success and error cases
   - Use descriptive test names (methodName_scenario_expectedResult)
4. Adapt: Add edge cases specific to business rules
```

### Example: Containerizing a Bun/TypeScript App

```
User: "Add Docker to our Bun API service"

1. Identify domain: Docker
2. Read: references/docker-patterns.md
3. Apply:
   - Use multi-stage build with Bun's official image
   - Set non-root user for security
   - Add HEALTHCHECK for the health endpoint
   - Optimize layer caching with package.json and bun.lock first
4. Adapt: Adjust the build and entrypoint commands to match project output
```

### Example: Database Migration

```
User: "Add a migration to add a roles table to the database"

1. Identify domain: Database
2. Read: references/database-patterns.md
3. Apply:
   - Use up/down migration pattern
   - Keep migrations small and focused
   - Test the down migration works
   - Use IF EXISTS/IF NOT EXISTS for safety
4. Adapt: Add appropriate indexes for common query patterns
```

## When to Use This Skill

Reference these patterns when:

1. Starting a new API or service
2. Setting up test infrastructure
3. Containerizing an application
4. Designing database schema
5. Reviewing code for best practices

## Platform Notes

Language-bound code examples are TypeScript-first where practical. Infrastructure snippets use their native formats such as Dockerfile, SQL, YAML, JSON, Bash, and GraphQL.

For rd3 work, prefer:
- `bun test` and `bun:test` for test examples
- `bun install --frozen-lockfile` and `bun run <script>` for Bun projects
- `biome format` / `biome lint` when formatter or lint examples are needed

## Security Considerations

All reference files include common security anti-patterns and secure alternatives:
- **API**: Structured error responses that avoid leaking internal details
- **Testing**: Safe mocking patterns that do not expose secrets
- **Docker**: Non-root users, minimal base images, read-only filesystems
- **Database**: Parameterized queries to prevent injection, connection pooling

## Additional Resources

| Resource | Description |
|----------|-------------|
| [API Patterns](references/api-patterns.md) | REST/GraphQL conventions, error handling, pagination, auth |
| [Testing Patterns](references/testing-patterns.md) | Unit, integration, E2E patterns, mocking, test data |
| [Docker Patterns](references/docker-patterns.md) | Multi-stage builds, security, compose, health checks |
| [Database Patterns](references/database-patterns.md) | Migrations, queries, indexing, transactions, ORM |
