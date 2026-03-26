---
name: backend-design
description: "Backend implementation patterns: API endpoint design (REST/GraphQL/gRPC), database schema design (PostgreSQL/MongoDB/Redis), caching implementation (Cache-Aside/Write-Through), authentication flows (OAuth2/JWT/mTLS), observability instrumentation (OpenTelemetry), and backend testing strategies. Trigger when designing API endpoints, database schemas, caching layers, auth flows, or planning backend testing."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-26
updated_at: 2026-03-26
type: technique
tags: [backend, api-design, database, caching, authentication, observability, testing, rest, graphql, grpc, postgresql, redis, opentelemetry]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - pipeline
  pipeline_steps:
    - design-api-endpoints
    - design-database-schema
    - design-caching-layer
    - design-auth-flow
    - instrument-observability
    - plan-backend-testing
  trigger_keywords:
    - api-endpoint-design
    - database-schema
    - caching-strategy
    - authentication-flow
    - observability-setup
    - backend-testing
    - rest-api
    - graphql-schema
    - grpc-service
see_also:
  - rd3:backend-architect
  - rd3:sys-developing
  - rd3:sys-testing
  - rd3:pl-typescript
---

# rd3:backend-design — Backend Implementation Patterns

Backend implementation patterns and design guidance for building production-ready services using 2026 best practices.

## Overview

This skill provides implementation-level guidance for backend development, covering API endpoint design, database schema design, caching layer implementation, authentication flows, observability instrumentation, and testing strategies.

For high-level system architecture decisions (service decomposition, distributed systems topology, cloud infrastructure, scalability strategy), use `rd3:backend-architect` instead.

## When to Use

- Designing REST, GraphQL, or gRPC endpoint contracts
- Planning database schemas, indexes, and query patterns
- Implementing caching layers (Cache-Aside, Write-Through, Write-Behind)
- Designing authentication/authorization flows (OAuth2, JWT, mTLS)
- Setting up observability instrumentation (metrics, logs, traces)
- Planning backend testing strategies (unit, integration, contract)
- Choosing connection pooling and query optimization strategies
- Implementing API versioning, pagination, and error handling

**Not the right fit when:**
- Making high-level architecture decisions (service boundaries, distributed systems topology) — use `rd3:backend-architect`
- Writing actual implementation code — use `rd3:sys-developing`
- Debugging existing backend code — use `rd3:sys-debugging`
- Frontend design — use `rd3:frontend-design`

## Quick Start

Use the workflow that matches your current task:

**1. API Endpoint Design** → Follow `Design API Endpoints` workflow to plan resource naming, HTTP methods, status codes, versioning, and error responses.

**2. Database Schema Design** → Follow `Design Database Schema` workflow to plan tables/collections, indexes, partitioning, and connection pooling.

**3. Caching Layer** → Follow `Design Caching Layer` workflow to select caching patterns, TTL strategies, and invalidation approaches.

**4. Authentication Flow** → Follow `Design Auth Flow` workflow to plan OAuth2 flows, token management, and service-to-service auth.

**5. Observability** → Follow `Instrument Observability` workflow to set up metrics (RED/USE), structured logging, and distributed tracing.

**6. Testing** → Follow `Plan Backend Testing` workflow (60% unit, 25% integration, 15% contract/E2E).

## Workflows

### Design API Endpoints

Follow this workflow when designing API endpoints:

```
1. IDENTIFY resources
   - List domain entities and their relationships
   - Map to URL paths using noun-based naming
   - Identify sub-resources (e.g., /orders/{id}/items)

2. DEFINE operations
   - Map CRUD operations to HTTP methods
   - GET: Read (idempotent, cacheable)
   - POST: Create (non-idempotent)
   - PUT: Full update (idempotent)
   - PATCH: Partial update
   - DELETE: Remove (idempotent)

3. DESIGN response format
   - Consistent envelope: { data, error, meta }
   - Pagination: cursor-based for large datasets
   - Filtering: query params (?status=active&sort=-created)
   - Include HATEOAS links for discoverability

4. PLAN error handling
   - Standard HTTP status codes (400, 401, 403, 404, 409, 422, 500)
   - Error body: { code, message, details[] }
   - Include request_id for traceability
   - Never leak internal details in error responses

5. DESIGN versioning strategy
   - URL path versioning (/v1/users) for public APIs
   - Header versioning for internal APIs
   - Plan deprecation timeline and sunset headers

6. VALIDATE design
   - [ ] Resource names are plural nouns
   - [ ] Consistent response envelope
   - [ ] Pagination on all list endpoints
   - [ ] Rate limiting headers included
   - [ ] Idempotency keys for non-idempotent operations
```

### Design Database Schema

Follow this workflow when designing database schemas:

```
1. MODEL entities
   - Identify domain entities and relationships
   - Choose normalization level (3NF for OLTP, denormalized for reads)
   - Define primary keys (UUID v7 for distributed, BIGSERIAL for single-node)
   - Add audit columns (created_at, updated_at, deleted_at for soft deletes)

2. DESIGN indexes
   - B-tree for equality and range queries (default)
   - GIN for full-text search and JSONB
   - Composite indexes for multi-column queries (most selective first)
   - Partial indexes for filtered queries (WHERE active = true)
   - Covering indexes (INCLUDE) to avoid table lookups

3. PLAN partitioning
   - Range partitioning for time-series data
   - Hash partitioning for even distribution
   - List partitioning for categorical data
   - Partition size target: 10M-100M rows per partition

4. CONFIGURE connection pooling
   - PgBouncer for PostgreSQL (transaction mode)
   - Pool size: 2-3x CPU cores
   - Statement timeout to prevent long-running queries
   - Idle timeout to reclaim connections

5. OPTIMIZE queries
   - Use EXPLAIN ANALYZE for query plans
   - Avoid SELECT * — list needed columns
   - Use CTEs for readability, subqueries for performance
   - Batch inserts with VALUES lists or COPY

6. VALIDATE schema
   - [ ] All foreign keys have indexes
   - [ ] No N+1 query patterns in common access paths
   - [ ] Soft delete via deleted_at (not hard delete)
   - [ ] Timestamps use TIMESTAMPTZ (not TIMESTAMP)
   - [ ] JSON columns have GIN indexes if queried
```

### Design Caching Layer

Follow this workflow when designing caching:

```
1. IDENTIFY cacheable data
   - Read-heavy data with low write frequency
   - Expensive computations or aggregations
   - External API responses
   - Session and user preference data

2. SELECT caching pattern
   - Cache-Aside (Lazy Loading): Read from cache, miss → read DB → populate cache
   - Write-Through: Write to cache + DB together (strong consistency)
   - Write-Behind: Write to cache, async flush to DB (higher throughput)
   - Refresh-Ahead: Proactively refresh before expiry (low latency)

3. DESIGN key structure
   - Namespace: {service}:{entity}:{id} (e.g., orders:order:123)
   - Include version for cache busting: v2:orders:order:123
   - Use hash tags for Redis Cluster co-location: {order:123}:items

4. SET TTL strategy
   - Hot data: 5-15 minutes
   - Warm data: 1-4 hours
   - Cold/static data: 24+ hours
   - Add jitter to prevent thundering herd: TTL + random(0, TTL * 0.1)

5. PLAN invalidation
   - Event-driven: Invalidate on write events
   - Tag-based: Group related keys for bulk invalidation
   - Versioned keys: Increment version on schema change
   - Never rely on TTL alone for data that must be fresh

6. VALIDATE strategy
   - [ ] Cache hit ratio target defined (>90% for hot paths)
   - [ ] Thundering herd protection (jitter, locks, or coalescing)
   - [ ] Graceful degradation when cache is unavailable
   - [ ] Monitoring for cache hit/miss ratio and eviction rate
   - [ ] No sensitive data cached without encryption
```

### Design Auth Flow

Follow this workflow when designing authentication:

```
1. CHOOSE auth mechanism
   - OAuth2 + OIDC: Third-party identity providers (Google, GitHub)
   - JWT (RS256): Stateless API auth with short-lived tokens
   - PASETO: Safer JWT alternative (no algorithm confusion)
   - API Keys: Machine-to-machine, rate-limited
   - mTLS: Service-to-service in zero-trust networks

2. DESIGN token lifecycle
   - Access token: Short-lived (15 min), contains claims
   - Refresh token: Long-lived (7 days), stored securely
   - Token rotation: Issue new refresh token on each use
   - Revocation: Maintain blocklist for compromised tokens

3. IMPLEMENT authorization
   - RBAC: Role-based access control for simple hierarchies
   - ABAC: Attribute-based for fine-grained policies
   - Middleware: Validate token → extract claims → check permissions
   - Resource-level: Check ownership before data access

4. SECURE token storage
   - Server: httpOnly, Secure, SameSite=Strict cookies
   - Mobile: OS keychain (iOS Keychain, Android Keystore)
   - Service-to-service: Vault or cloud secrets manager
   - Never store tokens in localStorage

5. PLAN error responses
   - 401 Unauthorized: Missing or invalid credentials
   - 403 Forbidden: Valid credentials, insufficient permissions
   - Include WWW-Authenticate header with 401
   - Never reveal whether user exists on auth failure

6. VALIDATE flow
   - [ ] Tokens are short-lived with refresh rotation
   - [ ] Secrets use Vault or KMS (not env vars in code)
   - [ ] Rate limiting on auth endpoints
   - [ ] Brute-force protection (account lockout, CAPTCHA)
   - [ ] Audit logging for all auth events
```

### Instrument Observability

Follow this workflow when setting up observability:

```
1. DEFINE metrics (RED method for services)
   - Rate: Requests per second
   - Errors: Error rate and error types
   - Duration: Latency percentiles (p50, p95, p99)
   - Also USE method for resources: Utilization, Saturation, Errors

2. IMPLEMENT structured logging
   - JSON format with consistent fields
   - Required: timestamp, level, message, service, trace_id
   - Context: request_id, user_id, correlation_id
   - Avoid logging PII or secrets
   - Use log levels correctly: DEBUG < INFO < WARN < ERROR

3. SET UP distributed tracing
   - OpenTelemetry SDK for auto-instrumentation
   - Propagate W3C Trace Context headers
   - Create spans for: HTTP handlers, DB queries, external calls
   - Add attributes: db.statement, http.method, rpc.service
   - Sampling: 100% for errors, 10-20% for normal traffic

4. DESIGN SLOs
   - Availability SLO: 99.9% = 8.76h downtime/year
   - Latency SLO: p99 < 500ms for API endpoints
   - Error budget: 0.1% of requests can fail
   - Alert on burn rate, not raw error count

5. BUILD dashboards
   - Service overview: RED metrics + error budget
   - Dependency map: Upstream/downstream health
   - Database: Query latency, connection pool, cache hit ratio
   - Infrastructure: CPU, memory, disk, network

6. VALIDATE instrumentation
   - [ ] All HTTP handlers emit RED metrics
   - [ ] Trace IDs propagated across service boundaries
   - [ ] Structured logs include trace context
   - [ ] SLOs defined for critical user journeys
   - [ ] Alerts on error budget burn rate
```

### Plan Backend Testing

Follow this workflow when planning backend testing:

```
1. DEFINE testing scope
   - Unit tests: 60% — Business logic, utilities, validators
   - Integration tests: 25% — API endpoints, DB operations
   - Contract tests: 10% — API contracts between services
   - E2E tests: 5% — Critical end-to-end flows

2. SELECT testing tools
   - Unit: Vitest/Jest (TypeScript), pytest (Python), go test (Go)
   - Integration: Supertest + Testcontainers (real DB in Docker)
   - Contract: Pact for consumer-driven contracts
   - E2E: API client + test environment
   - Mocking: MSW for HTTP, pg-mem or Testcontainers for DB

3. PLAN test data
   - Factories for consistent test data (Factory pattern)
   - Database seeding for integration tests
   - Fixtures for deterministic scenarios
   - Cleanup: Truncate tables between tests, not after

4. DESIGN integration tests
   - Test against real database (Testcontainers)
   - Test full request/response cycle
   - Verify side effects (DB writes, events published)
   - Test error paths and edge cases

5. PLAN contract tests
   - Consumer defines expected interactions
   - Provider verifies against consumer expectations
   - Run in CI on both sides
   - Version contracts alongside API versions

6. VALIDATE strategy
   - [ ] Unit tests for all business logic
   - [ ] Integration tests for all API endpoints
   - [ ] Contract tests for service boundaries
   - [ ] Tests run in CI/CD pipeline
   - [ ] Coverage threshold enforced (80%+)
   - [ ] No mocked database in integration tests
```

## Quick Reference

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

## Additional Resources

- **PostgreSQL Documentation**: https://www.postgresql.org/docs/ — Official PostgreSQL docs
- **Redis Documentation**: https://redis.io/docs/ — Redis data structures and patterns
- **OpenTelemetry**: https://opentelemetry.io/docs/ — Observability instrumentation
- **OAuth2 RFC 6749**: https://datatracker.ietf.org/doc/html/rfc6749 — Authorization framework
- **Pact**: https://docs.pact.io/ — Consumer-driven contract testing
- **Testcontainers**: https://testcontainers.com/ — Real dependencies in tests
