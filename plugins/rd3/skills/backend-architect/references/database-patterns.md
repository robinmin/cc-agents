---
name: database-patterns
description: "Database architecture patterns: PostgreSQL indexing and partitioning, MongoDB schema design, Redis caching, connection pooling, and technology selection."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [backend, database, postgresql, mongodb, redis, sql, nosql, architecture-design]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:backend-architect
---

# Database Architecture Patterns

Comprehensive guide to database architecture covering PostgreSQL, MongoDB, Redis, and technology selection.

## PostgreSQL Best Practices

### Indexing Strategy

```sql
-- B-tree index (default, most common)
CREATE INDEX idx_users_email ON users(email);

-- Composite index for multi-column queries
-- Order matters: put equality conditions first, range last
CREATE INDEX idx_orders_user_status_created
ON orders(user_id, status, created_at DESC);

-- Partial index for specific conditions (smaller, faster)
CREATE INDEX idx_active_users_email ON users(email)
WHERE active = true;

-- GIN index for JSONB (full-text search, contains)
CREATE INDEX idx_users_metadata ON users
USING GIN (metadata jsonb_path_ops);

-- Expression index for computed values
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- Covering index (includes all columns needed, avoids table lookup)
CREATE INDEX idx_orders_covering
ON orders(user_id, created_at DESC)
INCLUDE (total_amount, status);
```

### Partitioning Strategy

```sql
-- Range partitioning by date (for time-series data)
CREATE TABLE events (
    id SERIAL,
    created_at TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(50),
    data JSONB
) PARTITION BY RANGE (created_at);

-- Create partitions for specific time ranges
CREATE TABLE events_2024_q1 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE events_2024_q2 PARTITION OF events
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- List partitioning (for categorical data)
CREATE TABLE sales (
    id SERIAL,
    region VARCHAR(20),
    amount DECIMAL(10,2),
    sold_at TIMESTAMPTZ
) PARTITION BY LIST (region);

CREATE TABLE sales_north PARTITION OF sales
    FOR VALUES IN ('NORTH', 'NORTHEAST', 'NORTHWEST');

CREATE TABLE sales_south PARTITION OF sales
    FOR VALUES IN ('SOUTH', 'SOUTHEAST', 'SOUTHWEST');

-- Hash partitioning (for even distribution)
CREATE TABLE users (
    id SERIAL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ
) PARTITION BY HASH (id);

-- Create 8 hash partitions
CREATE TABLE users_0 PARTITION OF users
    FOR VALUES WITH (MODULUS 8, REMAINDER 0);
-- ... (partitions 1-7)
```

### Connection Pooling (PgBouncer)

```ini
; pgbouncer.ini
[databases]
; Database to connect to
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
; Pool mode: session, transaction, statement
pool_mode = transaction

; Maximum client connections
max_client_conn = 10000

; Connection pool size per database
default_pool_size = 25

; Minimum connections to keep
min_pool_size = 5

; Reserve extra connections for peak demand
reserve_pool_size = 5
reserve_pool_timeout = 3s

; How long to wait before closing idle connection
idle_timeout = 600s

; Server lifetime (prevent stale connections)
server_lifetime = 3600s
```

### Query Optimization

```sql
-- EXPLAIN ANALYZE for query profiling
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT u.*, o.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > NOW() - INTERVAL '30 days'
AND o.status = 'pending';

-- Common table expression (CTE) for complex queries
WITH recent_orders AS (
    SELECT user_id, COUNT(*) as order_count, SUM(total) as total_spent
    FROM orders
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY user_id
)
SELECT u.*, ro.order_count, ro.total_spent
FROM users u
LEFT JOIN recent_orders ro ON u.id = ro.user_id
WHERE u.status = 'active';

-- Window functions for analytics
SELECT
    date_trunc('month', created_at) as month,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE status = 'premium') as premium_users,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'premium')::NUMERIC /
        COUNT(*)::NUMERIC * 100, 2
    ) as premium_percentage
FROM users
GROUP BY month
ORDER BY month;
```

## MongoDB Best Practices

### Schema Design

```javascript
// Embedding vs Referencing decision tree
// Embed when: data is accessed together, data size is small, no need to query independently
// Reference when: data is large, queried independently, data changes frequently

// Embedding: One-to-few (good)
{
  _id: ObjectId("..."),
  title: "Blog Post",
  content: "...",
  tags: ["javascript", "mongodb"],  // Small array, embedded
  author: {
    name: "John Doe",
    email: "john@example.com"       // Small object, embedded
  },
  metadata: {
    views: 0,
    likes: 0
  }
}

// Referencing: One-to-many (when many could grow unbounded)
{
  _id: ObjectId("..."),
  customer_id: ObjectId("..."),    // Reference to customers collection
  items: [
    { product_id: ObjectId("..."), quantity: 2, price: 29.99 },
    { product_id: ObjectId("..."), quantity: 1, price: 49.99 }
  ],
  total: 109.97,
  created_at: ISODate("...")
}

// products collection (referenced)
{
  _id: ObjectId("..."),
  name: "Product Name",
  price: 29.99,
  inventory: 100
}
```

### Indexing

```javascript
// Single field index
db.products.createIndex({ name: 1 });

// Compound index (equality first, sort second, range last)
db.orders.createIndex({ customer_id: 1, status: 1, created_at: -1 });

// Multikey index (for array fields)
db.products.createIndex({ tags: 1 });  // tags is array

// Text index for search
db.articles.createIndex({ title: "text", content: "text" });
db.articles.find(
  { $text: { $search: "mongodb optimization" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } });

// Partial index (like PostgreSQL)
db.users.createIndex(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $exists: true } } }
);

// Covered index query
db.orders.createIndex({ status: 1, created_at: -1 });
db.orders.find(
  { status: "pending" },
  { _id: 0, status: 1, created_at: 1 }
);  // Can be satisfied by index alone
```

### Aggregation Pipeline

```javascript
// Complex aggregation with $lookup (join)
db.orders.aggregate([
  // Match first to reduce documents
  { $match: { created_at: { $gte: ISODate("2024-01-01") } } },

  // Unwind items array
  { $unwind: "$items" },

  // Join with products
  {
    $lookup: {
      from: "products",
      localField: "items.product_id",
      foreignField: "_id",
      as: "product_info"
    }
  },

  // Unwind product info
  { $unwind: "$product_info" },

  // Group by category
  { $group: {
      _id: "$product_info.category",
      total_sales: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
      item_count: { $sum: "$items.quantity" }
  }},

  // Sort by total sales
  { $sort: { total_sales: -1 } },

  // Limit results
  { $limit: 10 }
]);
```

## Redis Best Practices

### Data Structures

```typescript
// String (simple key-value)
await redis.set('user:123:token', jwtToken, { EX: 3600 });  // 1 hour TTL
const token = await redis.get('user:123:token');

// Hash (object storage)
await redis.hSet('user:123', {
  name: 'John',
  email: 'john@example.com',
  status: 'active'
});
const user = await redis.hGetAll('user:123');

// List (queues, activity feeds)
await redis.lPush('queue:tasks', JSON.stringify({ taskId: 1, type: 'email' }));
const task = await redis.rPop('queue:tasks');

// Set (unique values, tags)
await redis.sAdd('user:123:interests', ['javascript', 'mongodb', 'redis']);
const interests = await redis.sMembers('user:123:interests');
const hasInterest = await redis.sIsMember('user:123:interests', 'javascript');

// Sorted Set (leaderboards, priority queues)
await redis.zAdd('leaderboard:scores', { score: 1000, value: 'user:123' });
await redis.zAdd('leaderboard:scores', { score: 2000, value: 'user:456' });
const topUsers = await redis.zRange('leaderboard:scores', 0, 9, { REV: true });

// Stream (event sourcing, activity logs)
await redis.xAdd('events:*', '*', { type: 'click', userId: '123', page: '/home' });
const events = await redis.xRead({ 'events:*': '0-0' }, { COUNT: 100 });
```

### Caching Patterns

```typescript
// Cache-Aside (lazy loading)
async function getUser(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Cache miss - fetch from database
  const user = await db.users.findById(userId);
  if (!user) throw new NotFoundError('User');

  // Write to cache with TTL
  await redis.setEx(cacheKey, 300, JSON.stringify(user));  // 5 min TTL

  return user;
}

// Write-Through (synchronous cache update)
async function updateUser(userId: string, data: UpdateUserDto): Promise<User> {
  const user = await db.users.update(userId, data);

  // Synchronously update cache
  const cacheKey = `user:${userId}`;
  await redis.setEx(cacheKey, 300, JSON.stringify(user));

  return user;
}

// Write-Behind (async cache update)
async function createOrder(orderData: OrderDto): Promise<Order> {
  const order = await db.orders.create(orderData);

  // Async cache update (fire and forget)
  const cacheKey = `user:${orderData.userId}:recent_orders`;
  redis.lPush(cacheKey, JSON.stringify(order));
  redis.lTrim(cacheKey, 0, 9);  // Keep only 10 most recent
  redis.expire(cacheKey, 3600);

  return order;
}

// Cache invalidation patterns
async function invalidateUserCache(userId: string): Promise<void> {
  const pattern = `user:${userId}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### Session Management

```typescript
interface Session {
  id: string;
  userId: string;
  data: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date;
}

// Store session in Redis
async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const session: Session = {
    id: sessionId,
    userId,
    data: {},
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // 7 days
  };

  await redis.setEx(
    `session:${sessionId}`,
    7 * 24 * 60 * 60,  // 7 days in seconds
    JSON.stringify(session)
  );

  return sessionId;
}

async function getSession(sessionId: string): Promise<Session | null> {
  const session = await redis.get(`session:${sessionId}`);
  if (!session) return null;

  const parsed: Session = JSON.parse(session);
  if (new Date(parsed.expiresAt) < new Date()) {
    await redis.del(`session:${sessionId}`);
    return null;
  }

  return parsed;
}
```

## Technology Selection Matrix

| Database | Best For | Consistency | Scalability | Query Flexibility |
|----------|----------|-------------|-------------|------------------|
| **PostgreSQL** | Complex transactions, relational data, ACID | Strong | Vertical + sharding | Excellent (SQL) |
| **MongoDB** | Flexible schema, document storage, JSON | Eventual | Horizontal sharding | Good (MQL) |
| **Redis** | Caching, sessions, real-time, pub/sub | N/A | Horizontal clustering | Good (key-value, data structures) |
| **TimescaleDB** | Time-series, metrics, IoT | Strong | Horizontal partitioning | Excellent (SQL + time) |
| **Cassandra** | High write throughput, wide columns | Eventual | Linear horizontal | Good (CQL) |
| **Neo4j** | Graph relationships, social networks | Strong | Horizontal (multi-region) | Excellent (Cypher) |
| **ClickHouse** | OLAP, analytics, data warehouse | Eventual | Horizontal | Good (SQL) |

## Connection Pool Patterns

```typescript
// Generic connection pool wrapper
interface PoolConfig {
  min: number;           // Minimum connections
  max: number;           // Maximum connections
  acquireTimeout: number; // Max wait for connection
  idleTimeout: number;   // Close idle after this
}

class ConnectionPool<T> {
  private config: PoolConfig;
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private waiting: Array<{
    resolve: (conn: T) => void;
    reject: (err: Error) => void;
  }> = [];

  async acquire(): Promise<T> {
    // Reuse available connection
    const conn = this.available.pop();
    if (conn) {
      this.inUse.add(conn);
      return conn;
    }

    // Create new if under limit
    if (this.inUse.size < this.config.max) {
      const newConn = await this.createConnection();
      this.inUse.add(newConn);
      return newConn;
    }

    // Wait for available connection
    return new Promise((resolve, reject) => {
      this.waiting.push({ resolve, reject });
    });
  }

  release(conn: T): void {
    this.inUse.delete(conn);

    // Handle waiting requesters
    const waiter = this.waiting.shift();
    if (waiter) {
      this.inUse.add(conn);
      waiter.resolve(conn);
    } else {
      this.available.push(conn);
    }
  }
}
```
