---
name: quick-reference
description: "Quick reference tables for common decisions"
see_also:
  - rd3:backend-design
---

# Quick Reference

### Common API Patterns

| Pattern | Use Case | HTTP Method |
|---------|----------|-------------|
| CRUD | Standard resource operations | GET, POST, PUT, DELETE |
| RPC | Action-oriented | POST |
| Collection | Bulk operations | POST |
| Sub-resource | Nested resources | /parent/{id}/child |
| Webhook | Event-driven notifications | POST (to subscriber) |
| MCP | AI/LLM integration | JSON-RPC 2.0 |

### Database Index Selection

| Index Type | Use Case | PostgreSQL Syntax |
|-----------|----------|-------------------|
| B-tree | Equality, range, sorting | `CREATE INDEX idx ON t(col)` |
| GIN | Full-text, JSONB, arrays | `CREATE INDEX idx ON t USING gin(col)` |
| Composite | Multi-column queries | `CREATE INDEX idx ON t(col1, col2)` |
| Partial | Filtered subsets | `CREATE INDEX idx ON t(col) WHERE active` |
| Covering | Index-only scans | `CREATE INDEX idx ON t(col1) INCLUDE(col2)` |

### Caching Pattern Selection

| Pattern | Consistency | Latency | Use Case |
|---------|------------|---------|----------|
| Cache-Aside | Eventual | Low reads | General purpose, read-heavy |
| Write-Through | Strong | Higher writes | Data that must be consistent |
| Write-Behind | Eventual | Low writes | High write throughput |
| Refresh-Ahead | Eventual | Lowest reads | Predictable access patterns |

### Auth Mechanism Selection

| Mechanism | Use Case | Token Lifetime |
|-----------|----------|---------------|
| JWT (RS256) | API auth, microservices | 15 min access, 7 day refresh |
| PASETO | Safer JWT alternative | Same as JWT |
| OAuth2 + OIDC | Third-party login | Provider-dependent |
| API Keys | Machine-to-machine | Long-lived, rotatable |
| mTLS | Service mesh, zero-trust | Certificate lifetime |

For detailed reference tables and patterns, see:

- **API Design**: [`references/api-design.md`](references/api-design.md) — REST naming, GraphQL schema, gRPC services, versioning, error handling
- **Database Patterns**: [`references/database-patterns.md`](references/database-patterns.md) — PostgreSQL indexing, MongoDB schema, Redis data structures, connection pooling
- **Caching Patterns**: [`references/caching-patterns.md`](references/caching-patterns.md) — Cache-Aside, Write-Through, Write-Behind, TTL, invalidation
