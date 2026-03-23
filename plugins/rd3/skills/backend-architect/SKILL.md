---
name: backend-architect
description: "Backend architecture patterns and systems design: API design (REST/GraphQL/gRPC), database architecture (PostgreSQL/MongoDB/Redis), microservices, event-driven architecture, CQRS, saga patterns, caching strategies, scalability, security, and observability. Trigger when: designing APIs, database schemas, microservices, event-driven systems, or planning backend scalability."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
type: technique
tags: [backend, architecture, api-design, database, microservices, event-driven, scalability, security, architecture-design]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:sys-developing
  - rd3:pl-typescript
  - rd3:sys-debugging
---

# rd3:backend-architect — Backend Architecture Patterns

Backend architecture patterns and systems design guidance for building scalable, resilient distributed systems.

## Overview

This skill provides architectural guidance for backend development, covering API design, database architecture, distributed systems, scalability patterns, security, observability, and cloud-native practices.

## Quick Start

Use this skill to frame the architecture decision first, then dive into the matching reference file:

- "Design a versioned REST API for multi-tenant billing with rate limits, idempotency, and webhook delivery."
- "Choose between PostgreSQL, MongoDB, and Redis for an order-processing system with high write volume and strict consistency requirements."
- "Plan the service boundaries, event flow, and saga strategy for e-commerce checkout."

## When to Use

Use this skill when:

- Designing API endpoints (REST, GraphQL, gRPC)
- Designing database schemas and relationships
- Planning microservices architecture
- Designing event-driven systems
- Planning scalability and performance
- Designing distributed transactions
- Planning caching strategies
- Designing observability and monitoring
- Planning cloud-native deployment

This skill is not the right fit when:

- Debugging existing backend code (use `rd3:sys-debugging` instead)
- Writing backend implementation code (use `rd3:sys-developing` instead)
- Frontend architecture decisions (use `rd3:frontend-architect` instead)
- Infrastructure planning requiring cloud-specific guidance

## Workflow

1. Identify the architectural decision that is actually open: API contract, data model, service boundaries, consistency model, scaling pattern, or observability target.
2. Start with the relevant section in this file to set direction, then open the matching reference for depth:
   - `references/api-design.md`
   - `references/database-patterns.md`
   - `references/microservices-patterns.md`
   - `references/caching-patterns.md`
3. Compare at least two viable options and document the tradeoff in terms of correctness, operability, latency, cost, and team complexity.
4. Verify any framework-, vendor-, or version-specific claim before recommending it.
5. End with an explicit recommendation, key risks, and an ADR-style rationale when the decision is material.

## Core Principles

### Verification Before Design

- **Search first**: Always verify current framework capabilities
- **Cite sources**: Every decision should reference documentation
- **Version awareness**: Framework/database behavior changes between versions
- **Benchmark claims**: Performance assertions require data

### Contract-First API Design

- Define API contracts before implementation
- Use OpenAPI/Swagger for REST specification
- Design service boundaries using Domain-Driven Design (DDD)
- Document versioning strategy from day one
- Generate client SDKs from specifications

### Boring Technology Wins

- Proven > novel (PostgreSQL over NewHotDB)
- Simplicity > cleverness
- Operations cost matters
- Team expertise matters

### Design for Failure

- Every distributed call will fail
- Timeouts, retries, circuit breakers mandatory
- Graceful degradation
- Failure modes documented

### Data-Driven Decisions

- Benchmarks > intuition
- SLOs define architecture
- Cost-per-request guides scaling
- Load test before launch

### Security by Design

- Auth at every boundary (API Gateway + service-level)
- Zero-trust network architecture
- Defense in depth
- Secrets management (Vault, KMS)
- Token-based authentication (JWT + refresh tokens)
- Encryption in transit (TLS/mTLS) and at rest

## API Design

### API Gateway Architecture

**API Gateway Responsibilities:**
- **Authentication/Authorization**: Centralized OAuth2/JWT validation
- **Rate Limiting**: Token bucket per user/API key
- **Request Routing**: Path-based, header-based, or weighted routing
- **Request/Response Transformation**: Protocol translation (REST → gRPC)
- **Service Composition**: Aggregating multiple service responses
- **Caching**: Edge caching for GET requests

**API Gateway Options:**
- **Kong**: Open-source, plugin-rich
- **AWS API Gateway**: AWS-integrated, serverless-friendly
- **Envoy**: Cloud-native, high-performance
- **NGINX**: Lightweight, battle-tested

### REST API Best Practices

**Resource Naming**:
```
GET    /api/v1/users          # List users
GET    /api/v1/users/{id}     # Get specific user
POST   /api/v1/users           # Create user
PUT    /api/v1/users/{id}      # Replace user
PATCH  /api/v1/users/{id}      # Update user
DELETE /api/v1/users/{id}      # Delete user
```

**HTTP Status Codes**:
- 2xx: Success (200 OK, 201 Created, 204 No Content)
- 3xx: Redirection (301 Moved Permanently, 304 Not Modified)
- 4xx: Client Error (400 Bad Request, 401 Unauthorized, 404 Not Found, 429 Too Many Requests)
- 5xx: Server Error (500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable)

**API Versioning**:
```
# URL versioning (recommended for public APIs)
/api/v1/users
/api/v2/users

# Header versioning (recommended for private APIs)
Accept: application/vnd.api+json; version=1

# Deprecation header (RFC 8594)
Sunset: Fri, 01 Jan 2027 00:00:00 GMT
Deprecation: true
```

### GraphQL Best Practices

**Schema Design**:
```graphql
type User {
  id: ID!
  email: String!
  profile: Profile
  posts(first: Int, after: String): PostConnection!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PostEdge {
  node: Post!
  cursor: String!
}
```

**N+1 Prevention**:
- Use DataLoader for batch loading
- Use `@include` and `@skip` directives selectively
- Enable query complexity analysis
- Set maximum query depth

### gRPC Best Practices

**Service Definition**:
```protobuf
service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc CreateUser(CreateUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (stream User);
}

message GetUserRequest {
  string user_id = 1;
  google.protobuf.FieldMask field_mask = 2;  # Partial response
}
```

## Database Architecture

### PostgreSQL Best Practices

**Indexing Strategy**:
```sql
-- B-tree index (default, most common)
CREATE INDEX idx_users_email ON users(email);

-- Composite index for multi-column queries
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);

-- Partial index for specific conditions
CREATE INDEX idx_active_users ON users(email) WHERE active = true;

-- GIN index for JSONB
CREATE INDEX idx_users_metadata ON users USING GIN (metadata jsonb_path_ops);

-- Expression index for computed values
CREATE INDEX idx_users_lower_email ON users(LOWER(email));
```

**Partitioning**:
```sql
-- Range partitioning by date
CREATE TABLE events (
    id SERIAL,
    created_at TIMESTAMPTZ NOT NULL,
    data JSONB
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE events_2024_q1 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
```

**Connection Pooling (PgBouncer)**:
```yaml
pool_mode: transaction
max_client_conn: 10000
default_pool_size: 25
min_pool_size: 5
reserve_pool_size: 5
reserve_pool_timeout: 3s
```

### Technology Selection

```
Choose PostgreSQL when:
- ACID transactions required
- Complex relationships (foreign keys)
- JSONB flexibility needed
- Full-text search required
- Geospatial queries (PostGIS)

Choose MongoDB when:
- Flexible schema evolution
- Document-heavy workloads
- Horizontal scaling built-in
- Unstructured/semi-structured data

Choose Redis when:
- Sub-millisecond latency required
- In-memory data structures
- Pub/Sub messaging
- Session storage
```

### Caching Strategies

**Cache-Aside (Lazy Loading)**:
```
1. Application checks cache
2. If cache miss: fetch from database
3. Write to cache with TTL
4. Return data
```

**Write-Through**:
```
1. Application writes to cache
2. Cache synchronously writes to database
3. Return success
```

**TTL Strategy**:
```
Hot data (frequently accessed): 5-15 minutes
Warm data (moderately accessed): 1-5 minutes
Cold data (rarely accessed): 30-60 seconds
Never cache: User sessions, financial data, security tokens
```

## Distributed Systems

### Microservices Architecture

**Core Principles:**
```
1. Single Responsibility: One service per business capability
2. Bounded Context: Align with DDD domains
3. Decentralized Data: Each service owns its database
4. Fault Isolation: Failure in one service doesn't cascade
5. Independent Deployment: Deploy without affecting other services
```

**When to Use Microservices:**
```
Use when:
- Multiple teams developing independently
- Different scaling requirements per service
- Different technology stacks needed
- Complex business domains (DDD bounded contexts)
- Need for independent deployment

Avoid when:
- Small team (<5 developers)
- Simple application
- Startup/MVP phase
- Low traffic (<10K requests/sec)
```

### Event Sourcing

```
Event {
  event_id: UUID
  aggregate_id: UUID
  event_type: String
  event_data: JSON
  version: Int
  timestamp: Timestamp
}

# Benefits
- Complete audit trail
- Temporal queries (state at any point in time)
- Event replay for bug fixing
- Scalable event processing

# Considerations
- Event schema evolution
- Duplicate event handling
- Snapshot aggregation (for performance)
```

### CQRS (Command Query Responsibility Segregation)

```
# Write Model (Command)
- Optimized for writes
- Eventual consistency
- Validation and business logic
- Emits events

# Read Model (Query)
- Optimized for reads
- Denormalized data
- Materialized views
- Updated via events
```

### Saga Pattern

**Orchestrator Saga** (centralized coordination):
```typescript
async function orderSaga(orderId: string) {
  // Step 1: Create order
  const order = await createOrder(orderId);

  // Step 2: Reserve inventory
  const inventory = await reserveInventory(order.items);

  // Step 3: Process payment
  const payment = await processPayment(order.total);

  // Step 4: Confirm order
  await confirmOrder(orderId);

  // Compensating transactions on failure
  saga.execute(compensation);
}
```

### Circuit Breaker

```
States:
- CLOSED: Normal operation, requests pass through
- OPEN: Circuit tripped, requests fail immediately
- HALF-OPEN: Test if service recovered

Configuration:
- Failure threshold: 5 failures
- Timeout: 30 seconds
- Half-open attempts: 3 test requests
- Reset timeout: 60 seconds
```

## Scalability Patterns

### Horizontal Scaling

```
Stateless services:
- Remove session state from application
- Use external session store (Redis, database)
- Load balance across instances
- Auto-scaling based on metrics

Health checks:
GET /health          # Returns 200 OK
GET /health/ready    # Check dependencies
GET /health/live    # Check if service should restart
```

### Load Balancing Algorithms

```
Round Robin: Simple, works for similar capacity
Least Connections: Accounts for current load
IP Hash: Session affinity
Consistent Hashing: Minimizes reconfiguration
Weighted: Different server capacities
```

## Security Architecture

### OAuth2 Flows

**Authorization Code Flow** (for web apps):
```
1. Redirect user to: /authorize?response_type=code&client_id=...&redirect_uri=...&scope=...
2. User approves, receives code
3. Exchange code for token: POST /oauth/token (server-to-server)
4. Use access token to access API
```

**JWT Best Practices**:
```
# Structure
{
  "sub": "user_id",           # Subject
  "iss": "issuer",            # Issuer
  "aud": "audience",          # Audience
  "exp": 1234567890,          # Expiration
  "iat": 1234567890,          # Issued at
  "jti": "token_id",          # JWT ID
  "scope": "read write"       # Permissions
}

# Best practices
- Short-lived access tokens (5-15 minutes)
- Long-lived refresh tokens (30 days)
- Signed with RS256 (asymmetric keys)
- Validate all claims
- Include jti for revocation
- Store in httpOnly cookies (not localStorage)
```

## Observability

### Three Pillars

**Metrics** (RED method):
- Rate: Requests per second
- Errors: Error rate (4xx, 5xx)
- Duration: Response time (p50, p95, p99)

**Logs**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "service": "api",
  "trace_id": "abc123",
  "span_id": "def456",
  "message": "User logged in",
  "user_id": "123",
  "duration_ms": 45
}
```

**Traces** (OpenTelemetry):
```
Span:
- Trace ID: Correlates all spans in a request
- Span ID: Identifies specific span
- Parent Span ID: Identifies parent span
- Start/End time: Duration
- Attributes: Key-value metadata
- Events: Timed events within span
```

### SLO/SLI

```
Example SLO:
- 99.9% of requests succeed in <300ms (monthly)
- 99.95% availability (monthly)

Error Budget = 1 - SLO
- 99.9% SLO = 0.1% error budget
```

## Cloud-Native Patterns

### 12-Factor App

```
1. Codebase: One repo per app
2. Dependencies: Declare and isolate
3. Config: Store in environment variables
4. Backing services: Treat as attached resources
5. Build, release, run: Separate stages
6. Processes: Stateless, share-nothing
7. Port binding: Export services via port binding
8. Concurrency: Scale out via process model
9. Disposability: Fast startup, graceful shutdown
10. Dev/prod parity: Keep environments similar
11. Logs: Treat as event streams
12. Admin processes: One-off admin tasks
```

## Architecture Decision Records (ADRs)

```markdown
# ADR-001: Use PostgreSQL for User Data

## Context
Need persistent storage for user accounts with ACID transactions and complex relationships.

## Decision
Use PostgreSQL as the primary database for user data.

## Consequences

### Positive
- ACID guarantees for data consistency
- Foreign keys for referential integrity
- Mature ecosystem and tooling
- Team expertise available

### Negative
- Vertical scaling limitations
- Connection pooling complexity
- Sharding challenges at extreme scale

### Alternatives Considered
- **MongoDB**: Rejected due to ACID requirements
- **DynamoDB**: Rejected due to cost and complexity

## Status
Accepted

## Date
2025-01-24
```

## Quick Reference

### Common API Patterns

| Pattern | Use Case | HTTP Method |
|---------|----------|-------------|
| CRUD | Standard resource operations | GET, POST, PUT, DELETE |
| RPC | Action-oriented | POST |
| Collection | Bulk operations | POST |
| Sub-resource | Nested resources | /parent/{id}/child |

### Database Selection

| Database | Best For | Consistency |
|----------|----------|-------------|
| PostgreSQL | Complex transactions, relational data | Strong |
| MongoDB | Flexible schema, document storage | Eventual |
| Redis | Caching, sessions, real-time | N/A |
| TimescaleDB | Time-series data, metrics | Strong |
| Cassandra | High write throughput, wide columns | Eventual |

### Message Queue Selection

| Queue | Throughput | Ordering | Use Case |
|-------|-----------|----------|----------|
| Kafka | 1M+ msgs/sec | Per partition | Event streaming, logs |
| RabbitMQ | 10K-100K/sec | Per queue | Task queues, RPC |
| Redis Streams | 10K-100K/sec | Per stream | Real-time, Pub/Sub |
| SQS | 10K+ msgs/sec | FIFO option | AWS integration, simple |

### Emerging API Styles

| Style | Use Case | Pros | Cons |
|-------|----------|------|------|
| **REST** | General-purpose APIs | Simple, cacheable, stateless | Over-fetching, under-fetching |
| **GraphQL** | Complex data requirements | Single query, flexible | Complexity, caching challenges |
| **gRPC** | Internal microservices | High-performance, type-safe | Browser support, debugging |
| **Webhooks** | Event-driven notifications | Real-time, decoupled | Delivery reliability |
| **MCP** (Model Context Protocol) | AI/LLM integration | Structured AI outputs, context-aware | Emerging standard |

## Additional Resources

- [API Design Reference](references/api-design.md) for REST, GraphQL, gRPC, versioning, and API security patterns.
- [Database Patterns Reference](references/database-patterns.md) for PostgreSQL, MongoDB, Redis, partitioning, indexing, and technology selection.
- [Microservices Patterns Reference](references/microservices-patterns.md) for service decomposition, event sourcing, CQRS, saga patterns, and service communication.
- [Caching Patterns Reference](references/caching-patterns.md) for cache-aside, write-through, write-behind, refresh-ahead, TTL, and invalidation strategies.
