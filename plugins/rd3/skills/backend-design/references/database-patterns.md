# Database Patterns

Complete guide to database access patterns using Prisma in backend services, plus cross-database architecture patterns for PostgreSQL, MongoDB, and Redis.

## Table of Contents

- [Prisma Repository Pattern](#prisma-repository-pattern)
- [Transaction Patterns](#transaction-patterns)
- [Query Optimization](#query-optimization)
- [N+1 Query Prevention](#n1-query-prevention)
- [Error Handling](#error-handling)
- [PostgreSQL Indexing](#postgresql-indexing)
- [PostgreSQL Partitioning](#postgresql-partitioning)
- [MongoDB Schema & Indexing](#mongodb-schema--indexing)
- [Redis Caching Patterns](#redis-caching-patterns)
- [Technology Selection](#technology-selection)

---

## Prisma Repository Pattern

### When to Use Repositories

| Use Repositories | Skip Repositories |
|------------------|-------------------|
| Complex queries with joins/includes | Simple one-off CRUD |
| Query used in multiple places | Prototyping (refactor later) |
| Need caching layer | Single-use service methods |
| Want to mock for unit testing | Batch operations via Prisma macro |

### Repository Template

```typescript
export class UserRepository {
    async findById(id: string): Promise<User | null> {
        return PrismaService.main.user.findUnique({
            where: { id },
            include: { profile: true },
        });
    }

    async findActive(): Promise<User[]> {
        return PrismaService.main.user.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async create(data: Prisma.UserCreateInput): Promise<User> {
        return PrismaService.main.user.create({ data });
    }
}
```

### PrismaService Usage

```typescript
import { PrismaService } from '@/config/database';

// Always use PrismaService.main
const users = await PrismaService.main.user.findMany();

// Check availability for long-running operations
if (!PrismaService.isAvailable) {
    throw new Error('Prisma client not initialized');
}
```

---

## Transaction Patterns

### Simple Transaction

```typescript
const result = await PrismaService.main.$transaction(async (tx) => {
    const user = await tx.user.create({ data: userData });
    const profile = await tx.userProfile.create({ data: { userId: user.id } });
    return { user, profile };
});
```

### Interactive Transaction (with timeout)

```typescript
const result = await PrismaService.main.$transaction(
    async (tx) => {
        const user = await tx.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundError('User');
        return tx.user.update({
            where: { id },
            data: { lastLogin: new Date() },
        });
    },
    { maxWait: 5000, timeout: 10000 }
);
```

---

## Query Optimization

### Use select to Limit Fields

```typescript
// ❌ Fetches all fields
const users = await PrismaService.main.user.findMany();

// ✅ Only fetch needed fields
const users = await PrismaService.main.user.findMany({
    select: {
        id: true,
        email: true,
        profile: { select: { firstName: true, lastName: true } },
    },
});
```

### Use include Carefully

```typescript
// ❌ Excessive includes — N+1 potential
const user = await PrismaService.main.user.findUnique({
    where: { id },
    include: {
        profile: true,
        posts: { include: { comments: true } },
        workflows: { include: { steps: { include: { actions: true } } } },
    },
});

// ✅ Only include what you need
const user = await PrismaService.main.user.findUnique({
    where: { id },
    include: { profile: true },
});
```

---

## N+1 Query Prevention

### Problem: N+1 Queries

```typescript
// ❌ N+1 Query Problem
const users = await PrismaService.main.user.findMany(); // 1 query

for (const user of users) {
    const profile = await PrismaService.main.userProfile.findUnique({  // N queries
        where: { userId: user.id },
    });
}
```

### Solution: Use include or Batch

```typescript
// ✅ Single query with include
const users = await PrismaService.main.user.findMany({
    include: { profile: true },
});

// ✅ Or batch query
const userIds = users.map((u) => u.id);
const profiles = await PrismaService.main.userProfile.findMany({
    where: { userId: { in: userIds } },
});
```

---

## Error Handling

### Prisma Error Types

```typescript
import { Prisma } from '@prisma/client';

try {
    await PrismaService.main.user.create({ data });
} catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            throw new ConflictError('Email already exists');
        }
        if (error.code === 'P2003') {
            throw new ValidationError('Invalid reference');
        }
        if (error.code === 'P2025') {
            throw new NotFoundError('Record not found');
        }
    }
    Sentry.captureException(error);
    throw error;
}
```

---

## PostgreSQL Indexing

```sql
-- B-tree index (default, most common)
CREATE INDEX idx_users_email ON users(email);

-- Composite index (equality first, range last)
CREATE INDEX idx_orders_user_status_created
ON orders(user_id, status, created_at DESC);

-- Partial index (smaller, faster)
CREATE INDEX idx_active_users_email ON users(email)
WHERE active = true;

-- GIN index for JSONB (full-text search)
CREATE INDEX idx_users_metadata ON users
USING GIN (metadata jsonb_path_ops);

-- Expression index for computed values
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- Covering index (avoids table lookup)
CREATE INDEX idx_orders_covering
ON orders(user_id, created_at DESC)
INCLUDE (total_amount, status);
```

---

## PostgreSQL Partitioning

```sql
-- Range partitioning by date (time-series)
CREATE TABLE events (
    id SERIAL,
    created_at TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(50),
    data JSONB
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2024_q1 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

-- List partitioning (categorical)
CREATE TABLE sales (
    id SERIAL, region VARCHAR(20),
    amount DECIMAL(10,2)
) PARTITION BY LIST (region);

CREATE TABLE sales_north PARTITION OF sales
    FOR VALUES IN ('NORTH', 'NORTHEAST', 'NORTHWEST');
```

### Connection Pooling (PgBouncer)

```ini
; pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
pool_mode = transaction
max_client_conn = 10000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3s
idle_timeout = 600s
server_lifetime = 3600s
```

---

## MongoDB Schema & Indexing

### Embedding vs Referencing

```javascript
// Embed when: small, accessed together, not queried independently
// Reference when: large, queried independently, changes frequently

// Embedding: One-to-few
{
  _id: ObjectId("..."),
  title: "Blog Post",
  author: { name: "John", email: "john@example.com" },  // embedded
  tags: ["javascript", "mongodb"]                        // small array
}

// Referencing: One-to-many (unbounded)
{
  _id: ObjectId("..."),
  customer_id: ObjectId("..."),
  items: [{ product_id: ObjectId("..."), quantity: 2 }]
}
```

### Indexing

```javascript
// Compound index (equality first, sort second, range last)
db.orders.createIndex({ customer_id: 1, status: 1, created_at: -1 });

// Text index for search
db.articles.createIndex({ title: "text", content: "text" });

// Partial index
db.users.createIndex(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $exists: true } } }
);
```

### Aggregation Pipeline

```javascript
db.orders.aggregate([
  { $match: { created_at: { $gte: ISODate("2024-01-01") } } },
  { $unwind: "$items" },
  {
    $lookup: {
      from: "products",
      localField: "items.product_id",
      foreignField: "_id",
      as: "product_info"
    }
  },
  { $unwind: "$product_info" },
  { $group: {
      _id: "$product_info.category",
      total_sales: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
  }},
  { $sort: { total_sales: -1 } },
  { $limit: 10 }
]);
```

---

## Redis Caching Patterns

### Cache-Aside (Lazy Loading)

```typescript
async function getUser(userId: string): Promise<User> {
    const cacheKey = `user:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const user = await db.users.findById(userId);
    if (!user) throw new NotFoundError('User');

    await redis.setEx(cacheKey, 300, JSON.stringify(user)); // 5 min TTL
    return user;
}
```

### Write-Through (Synchronous)

```typescript
async function updateUser(userId: string, data: UpdateUserDto): Promise<User> {
    const user = await db.users.update(userId, data);
    await redis.setEx(`user:${userId}`, 300, JSON.stringify(user));
    return user;
}
```

### Write-Behind (Async)

```typescript
async function createOrder(orderData: OrderDto): Promise<Order> {
    const order = await db.orders.create(orderData);
    const cacheKey = `user:${orderData.userId}:recent_orders`;
    redis.lPush(cacheKey, JSON.stringify(order));
    redis.lTrim(cacheKey, 0, 9); // Keep 10 most recent
    redis.expire(cacheKey, 3600);
    return order;
}
```

### Session Management

```typescript
interface Session {
    id: string;
    userId: string;
    data: Record<string, unknown>;
    expiresAt: Date;
}

async function createSession(userId: string): Promise<string> {
    const sessionId = crypto.randomUUID();
    const session: Session = {
        id: sessionId,
        userId,
        data: {},
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    await redis.setEx(`session:${sessionId}`, 7 * 24 * 60 * 60, JSON.stringify(session));
    return sessionId;
}
```

---

## Technology Selection

| Database | Best For | Consistency | Scalability | Query Flexibility |
|----------|----------|-------------|-------------|------------------|
| **PostgreSQL** | Transactions, relational data, ACID | Strong | Vertical + sharding | Excellent (SQL) |
| **MongoDB** | Flexible schema, document storage, JSON | Eventual | Horizontal sharding | Good (MQL) |
| **Redis** | Caching, sessions, real-time, pub/sub | N/A | Horizontal clustering | Good (key-value, data structures) |
| **TimescaleDB** | Time-series, metrics, IoT | Strong | Horizontal partitioning | Excellent (SQL + time) |
| **Cassandra** | High write throughput, wide columns | Eventual | Linear horizontal | Good (CQL) |
| **Neo4j** | Graph relationships, social networks | Strong | Horizontal (multi-region) | Excellent (Cypher) |

---

**Related:**
- [SKILL.md](../SKILL.md)
- [services-and-repositories.md](services-and-repositories.md)
- [async-and-errors.md](async-and-errors.md)
