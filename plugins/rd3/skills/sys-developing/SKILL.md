---
name: sys-developing
description: "Production-ready implementation patterns: REST/GraphQL API design, unit/integration/E2E testing, Docker containerization, and database operations. Use when designing APIs, writing tests, containerizing apps, or optimizing DB queries."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-24
type: pattern
tags: [coding, patterns, api-design, testing, docker, database, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw,pi"
  category: engineering-core
  interactions:
    - knowledge-only
  openclaw:
    emoji: "🛠️"
see_also:
  - rd3:tdd-workflow
  - rd3:sys-testing
  - rd3:sys-debugging
---

# rd3:sys-developing — Implementation Patterns

A curated collection of production-ready patterns for common development tasks. This is the **execution knowledge hub** — the default skill for routine implementation work.

**Trigger when:**
- Applying REST/GraphQL API conventions (URL structure, error format, pagination, auth)
- Using testing patterns (AAA structure, mocking, page objects, contract tests)
- Containerizing an application with Docker (multi-stage builds, security hardening)
- Designing database schema, migrations, or query patterns (repository, indexing, transactions)

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
    ├─ Tests/Testing/Mocking/TDD?
    │   └─> [rd3:code-implement-common/references/testing-patterns.md](references/testing-patterns.md)
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
| Testing | **Moved to** [rd3:code-implement-common](references/testing-patterns.md) | Unit, integration, E2E, mocking, test data |
| Docker | [references/docker-patterns.md](references/docker-patterns.md) | Multi-stage builds, security, compose, health checks |
| Database | [references/database-patterns.md](references/database-patterns.md) | Migrations, queries, indexing, ORM, transactions |

## Quick Reference

### API Design

- **REST**: Resource-based URLs, proper HTTP verbs
- **Error handling**: Structured errors with error codes
- **Pagination**: Cursor-based for large datasets
- **Versioning**: URL versioning (`/api/v1/`)

### Testing

> **Note:** Testing patterns (including TDD, unit, integration, E2E) are now in [rd3:code-implement-common/references/testing-patterns.md](references/testing-patterns.md). This includes AAA structure, mocking, test factories, page objects, contract testing, and the test pyramid.

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
2. Containerizing an application
3. Designing database schema
4. Reviewing code for best practices

**For testing patterns**, use [rd3:code-implement-common/references/testing-patterns.md](references/testing-patterns.md) which includes TDD, unit, integration, E2E, and contract testing.

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
