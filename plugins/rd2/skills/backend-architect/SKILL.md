---
name: backend-architect
description: Backend architecture patterns and systems design guidance for 2024-2025. Use when designing APIs, database schemas, microservices, scalability patterns, distributed systems, event-driven architecture, observability, or cloud-native architecture. Use when backend architecture decisions are needed.
---

# Backend Architect

Backend architecture patterns and systems design guidance for building scalable, resilient distributed systems using 2024-2025 best practices.

## Overview

This skill provides architectural guidance for backend development, covering API design, database architecture, distributed systems, scalability patterns, security, observability, and cloud-native practices. It complements `super-architect` agent for comprehensive architecture decisions.

## Quick Start

```bash
# API design
"Design a REST API for user management with proper versioning and rate limiting"

# Database schema
"Design a PostgreSQL schema for multi-tenant SaaS with proper indexing"

# Microservices
"Design microservices architecture for an e-commerce platform"

# Event-driven
"Design event-driven architecture for order processing with Kafka"

# Scalability
"Design a system to handle 100k requests/sec with auto-scaling"

# Cache strategy
"Design a caching strategy using Redis for a high-traffic API"
```

## When to Use

**Use this skill when:**

- Designing API endpoints (REST, GraphQL, gRPC)
- Designing database schemas and relationships
- Planning microservices architecture
- Designing event-driven systems
- Planning scalability and performance
- Designing distributed transactions
- Planning caching strategies
- Designing observability and monitoring
- Planning cloud-native deployment

**For comprehensive architecture analysis**, use `/rd2:tasks-plan --architect` command which invokes the super-architect agent to provide:
- Detailed system design with ADRs
- Complete verification with benchmarks
- Migration strategies
- Trade-off analysis

## Core Principles (2024-2025)

### Verification Before Design

- **Search first**: Always verify current framework capabilities
- **Cite sources**: Every decision should reference documentation
- **Version awareness**: Framework/database behavior changes between versions
- **Benchmark claims**: Performance assertions require data

### Contract-First API Design

**Based on [Microservices Best Practices 2025](https://www.geeksforgeeks.org/blogs/best-practices-for-microservices-architecture/):**

- Define API contracts before implementation
- Use OpenAPI/Swagger for REST specification
- Design service boundaries using Domain-Driven Design (DDD)
- Document versioning strategy from day one
- Generate client SDKs from specifications

**Service Boundary Principles:**
```
- One service per bounded context (DDD)
- Single responsibility per service
- Independent deployment and scaling
- API-first design for all services
```

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

**Based on [Microservices Security 2025](https://www.gravitee.io/blog/best-practices-for-microservices-development-security-and-efficiency):**

- Auth at every boundary (API Gateway + service-level)
- Zero-trust network architecture
- Defense in depth
- Secrets management (Vault, KMS)
- Token-based authentication (JWT + refresh tokens)
- Encryption in transit (TLS/mTLS) and at rest

## API Design

### API Gateway Architecture (2025 Best Practice)

**Based on [10 Best Practices for Microservices Architecture in 2025](https://www.geeksforgeeks.org/blogs/best-practices-for-microservices-architecture/):**

```
                    ┌─────────────────┐
                    │   API Gateway   │
                    │                 │
                    │ - Authentication│
                    │ - Rate Limiting │
                    │ - Routing       │
                    │ - Composition   │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    ┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  Service A   │ │ Service B   │ │  Service C  │
    │              │ │             │ │             │
    └──────────────┘ └─────────────┘ └─────────────┘
```

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
POST   /api/v1/users          # Create user
PUT    /api/v1/users/{id}     # Replace user
PATCH  /api/v1/users/{id}     # Update user
DELETE /api/v1/users/{id}     # Delete user
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
Sunset: /api/v1/users; Fri, 01 Jan 2026 00:00:00 GMT
```

**Idempotency**:
```
# Use Idempotency-Key for POST/PUT operations
POST /api/v1/charges
Idempotency-Key: {unique_key}
```

**Rate Limiting**:
```
# Token bucket algorithm (recommended for APIs)
bucket_capacity = 100
refill_rate = 10 per second
key = user_id or api_key

# Response headers
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635724800
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
  FieldMask field_mask = 2;  # Partial response
}
```

**Deadlines**:
```go
ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
defer cancel()
```

### Emerging API Styles (2025)

**Based on [The Top API Architectural Styles of 2025](https://nordicapis.com/the-top-api-architectural-styles-of-2025/):**

| Style | Use Case | Pros | Cons |
|-------|----------|------|------|
| **REST** | General-purpose APIs | Simple, cacheable, stateless | Over-fetching, under-fetching |
| **GraphQL** | Complex data requirements | Single query, flexible | Complexity, caching challenges |
| **gRPC** | Internal microservices | High-performance, type-safe | Browser support, debugging |
| **Webhooks** | Event-driven notifications | Real-time, decoupled | Delivery reliability |
| **MCP** (Model Context Protocol) | AI/LLM integration | Structured AI outputs, context-aware | Emerging standard |

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

-- List partitioning by region
CREATE TABLE users (
    id SERIAL,
    region TEXT NOT NULL,
    email TEXT
) PARTITION BY LIST (region);

CREATE TABLE users_usa PARTITION OF users
    FOR VALUES IN ('usa', 'canada');
```

**Connection Pooling**:
```yaml
# PgBouncer configuration
pool_mode: transaction
max_client_conn: 10000
default_pool_size: 25
min_pool_size: 5
reserve_pool_size: 5
reserve_pool_timeout: 3s
server_lifetime: 3600s
server_idle_timeout: 600s
```

**Technology Stack Selection Rationale:**
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

### NoSQL Strategies

**MongoDB**:
```javascript
// Document modeling - embedding vs reference
// Use embedding for 1:many with "contains" relationship
{
  _id: ObjectId("..."),
  title: "Blog Post",
  comments: [  // Embedded (usually 1-100 comments)
    { user_id: ObjectId("..."), text: "..." }
  ]
}

// Use reference for 1:many with large scale
{
  _id: ObjectId("..."),
  title: "Blog Post",
  comment_ids: [ObjectId("..."), ObjectId("...")]  // References
}
```

**Redis Data Structures**:
```
# Strings: Caching, rate limiting, sessions
SET user:1000 "{json}" EX 3600

# Lists: Queues (FIFO), timelines
LPUSH queue:events "{event}"
RPOP queue:events

# Sets: Unique items, followers, tags
SADD user:1000:followers "user:2000"
SISMEMBER user:1000:followers "user:2000"

# Sorted Sets: Leaderboards, rankings, priority queues
ZADD leaderboard 1500 "player:1"
ZADD leaderboard 2000 "player:2"
ZREVRANGE leaderboard 0 9 WITHSCORES

# Hashes: Objects, session data
HSET user:1000 name "Alice" email "alice@example.com"
HGETALL user:1000

# Streams: Event sourcing, message queues
XADD events: * name "order_created" data "{...}"
XREAD GROUP $ consumers events: > COUNT 1
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

**Write-Behind (Write-Back)**:
```
1. Application writes to cache
2. Cache asynchronously writes to database
3. Faster writes, risk of data loss
```

**TTL Strategy**:
```
Hot data (frequently accessed): 5-15 minutes
Warm data (moderately accessed): 1-5 minutes
Cold data (rarely accessed): 30-60 seconds
Never cache: User sessions, financial data, security tokens
```

**Cache Invalidation Patterns:**
```
- Time-based expiration (TTL)
- Event-based invalidation (write-through)
- Cache stampede prevention (lock, early expiry)
- Distributed cache invalidation (pub/sub)
```

## Distributed Systems

### Microservices Architecture

**Based on [Microservices Architecture Best Practices 2025](https://prminfotech.com/blog/microservices-architecture-best-practices/):**

**Core Principles:**
```
1. Single Responsibility: One service per business capability
2. Bounded Context: Align with DDD domains
3. Decentralized Data: Each service owns its database
4. Fault Isolation: Failure in one service doesn't cascade
5. Independent Deployment: Deploy without affecting other services
```

**Service Communication Patterns:**
```
Synchronous (REST/gRPC):
- Simple request/response
- Tighter coupling
- Requires availability of both services

Asynchronous (Message Queue):
- Decoupled services
- Event-driven
- Fault tolerance with retries
- Eventual consistency
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

**Event Store Pattern**:
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

# When to use
- Complex domain with many reads
- High read/write ratio
- Different data models for read/write
- Event sourcing already in use
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

**Choreography Saga** (decentralized events):
```
1. OrderCreated event → InventoryService reserves
2. InventoryReserved event → PaymentService charges
3. PaymentCaptured event → OrderService confirms
4. Any failure → Compensating events emitted
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

Libraries:
- Java: Resilience4j, Hystrix
- Go: gobreaker, hystrix-go
- Python: circuitbreaker
- Node.js: opencircuit
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
GET /health  # Returns 200 OK
GET /health/ready  # Check dependencies
GET /health/live  # Check if service should restart
```

### Database Sharding

```
Horizontal partitioning:
- Shard by user_id (consistent hash)
- Shard by region (geo-distribution)
- Shard by time (logs, events)

Considerations:
- Cross-shard queries expensive
- Rebalancing complexity
- Connection routing

Tools:
- PostgreSQL: Citus, pg_shard
- MongoDB: Sharded clusters
- MySQL: Vitess
```

### Load Balancing

**Algorithms**:
```
Round Robin: Simple, works for similar capacity
Least Connections: Accounts for current load
IP Hash: Session affinity
Consistent Hashing: Minimizes reconfiguration
Weighted: Different server capacities
```

**Health Checks**:
```
Passive: Check TCP connection
Active: HTTP endpoint /health
Interval: 5-10 seconds
Timeout: 2-5 seconds
Unhealthy threshold: 2-3 failures
Healthy threshold: 2-3 successes
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

**PKCE Extension** (for native/mobile apps):
```
# Prevents authorization code interception
1. Generate code_verifier (random string)
2. Generate code_challenge = SHA256(code_verifier)
3. Include code_challenge in authorization request
4. Server verifies code_verifier in token request
```

**Client Credentials Flow** (for service-to-service):
```
POST /oauth/token
grant_type=client_credentials&
client_id=...&
client_secret=...&
scope=...

Returns access token directly (no user interaction)
```

### JWT Best Practices

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

# Best practices (2025)
- Short-lived access tokens (5-15 minutes)
- Long-lived refresh tokens (30 days)
- Signed with RS256 (asymmetric keys)
- Validate all claims
- Include jti for revocation
- Store in httpOnly cookies (not localStorage)
```

### Rate Limiting

**Token Bucket** (recommended for APIs):
```
Algorithm:
- Bucket has max_capacity tokens
- Refill_rate tokens added per second
- Each request consumes 1+ tokens
- Requests rejected when bucket empty

Use cases:
- API rate limiting (per user or per key)
- Preventing DDoS
- Controlling resource usage
```

## Observability

### Three Pillars

**Metrics** (RED method):
- Rate: Requests per second
- Errors: Error rate (4xx, 5xx)
- Duration: Response time (p50, p95, p99)

**Logs**:
```
Structured logging (JSON):
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

**Service Level Objectives**:
```
Example SLO:
- 99.9% of requests succeed in <300ms (monthly)
- 99.95% availability (monthly)

Service Level Indicators (SLIs):
- Request success rate
- Response time percentiles (p50, p95, p99)
- Error budget: 1 - 0.999 = 0.1% error budget
```

### Error Budget

```
Error Budget = 1 - SLO
- 99.9% SLO = 0.1% error budget
- 99.95% SLO = 0.05% error budget

When error budget exhausted:
- Stop feature releases
- Focus on reliability
- Reduce velocity
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

### Kubernetes Patterns

**Deployment Strategies**:
```
Rolling Update: Gradual replacement of pods
Recreate: Kill all pods, then start new ones
Blue/Green: Two identical environments, switch traffic
Canary: Test new version with small percentage of traffic

# Kubernetes configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

## Architecture Decision Records (ADRs)

**Based on [architecture-review command patterns](https://github.com/claude-code-subagents-collection):**

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

## Progressive Disclosure

This SKILL.md provides quick reference patterns for backend architecture.

**For comprehensive architecture analysis**:
- Use `/rd2:tasks-plan --architect` to invoke super-architect for detailed system design with ADRs

**For implementation**:
- Use `/rd2:code-generate` to implement backend code

**For frontend-specific patterns**:
- Use `/rd2:frontend-architect` for rendering strategies, CDN, deployment

**For cloud-specific patterns**:
- Use `/rd2:cloud-architect` for provider selection, infrastructure design

## Sources

### Vendor Reference Integration
- [Microservices Best Practices](https://www.geeksforgeeks.org/blogs/best-practices-for-microservices-architecture/)
- [RESTful API Design Best Practices Guide 2024](https://daily.dev/blog/restful-api-design-best-practices-guide-2024)
- [The Top API Architectural Styles of 2025](https://nordicapis.com/the-top-api-architectural-styles-of-2025/)
- [Best Practices for Microservices Development Security and Efficiency](https://www.gravitee.io/blog/best-practices-for-microservices-development-security-and-efficiency)
- [Google Cloud Architecture Center](https://cloud.google.com/architecture)
- [System Design Primer (GitHub, 2024)](https://github.com/donnemartin/system-design-primer)
- [Building Microservices (Microsoft Learn, 2024)](https://learn.microsoft.com/en-us/shows/codeversations/scaling-microservices)
- [Reliable Microservices Data Management (Uber Blog, 2024)](https://www.uber.com/en/blog/blog/reliable-microservices-data-management)

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
