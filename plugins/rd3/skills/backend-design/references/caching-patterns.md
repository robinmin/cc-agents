---
name: caching-patterns
description: "Caching strategies: Cache-Aside, Write-Through, Write-Behind, TTL management, distributed caching, and cache invalidation patterns."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [backend, caching, redis, cache-invalidation, distributed-systems, architecture-design]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:backend-architect
  - rd3:backend-architect/references/database-patterns
---

# Caching Strategies

Comprehensive guide to caching patterns, TTL strategies, distributed caching, and cache invalidation.

## Cache Strategies Overview

| Strategy | Read Path | Write Path | Consistency | Complexity |
|----------|-----------|------------|-------------|-----------|
| **Cache-Aside** | Cache → DB (miss) | DB only | Eventual | Low |
| **Write-Through** | Cache → DB (miss) | Cache → DB (sync) | Strong | Medium |
| **Write-Behind** | Cache → DB (miss) | Cache → DB (async) | Eventual | Medium |
| **Refresh-Ahead** | Cache → background refresh | N/A | Stale reads possible | High |

## Cache-Aside (Lazy Loading)

```typescript
// Cache-Aside: Read
async function getUser(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;

  // Step 1: Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Step 2: Cache miss - fetch from database
  const user = await db.users.findById(userId);
  if (!user) {
    throw new NotFoundError('User');
  }

  // Step 3: Write to cache with TTL
  await redis.setEx(cacheKey, 300, JSON.stringify(user));

  return user;
}

// Cache-Aside: Write
async function updateUser(userId: string, data: UpdateUserDto): Promise<User> {
  // Step 1: Update database
  const user = await db.users.update(userId, data);

  // Step 2: Invalidate cache (preferred over update)
  await redis.del(`user:${userId}`);

  // Alternative: Update cache directly
  // await redis.setEx(`user:${userId}`, 300, JSON.stringify(user));

  return user;
}

// Cache-Aside: Delete
async function deleteUser(userId: string): Promise<void> {
  // Step 1: Delete from database
  await db.users.delete(userId);

  // Step 2: Invalidate cache
  await redis.del(`user:${userId}`);
}
```

## Write-Through

```typescript
// Write-Through: Synchronous cache update on writes
class WriteThroughCache<T> {
  constructor(
    private cache: Redis,
    private db: Database,
    private ttl: number
  ) {}

  async get(key: string): Promise<T | null> {
    const cached = await this.cache.get(key);
    if (cached) return JSON.parse(cached);

    const value = await this.db.get(key);
    if (value) {
      await this.cache.setEx(key, this.ttl, JSON.stringify(value));
    }
    return value;
  }

  async set(key: string, value: T): Promise<void> {
    // Synchronous write to both cache and database
    await this.db.set(key, value);
    await this.cache.setEx(key, this.ttl, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.db.delete(key);
    await this.cache.del(key);
  }
}

// Usage
const userCache = new WriteThroughCache<User>(
  redis,
  db,
  300  // 5 minutes TTL
);

await userCache.set(`user:${userId}`, updatedUser);
```

## Write-Behind (Async)

```typescript
// Write-Behind: Async cache update using message queue
class WriteBehindCache {
  constructor(
    private cache: Redis,
    private db: Database,
    private queue: Kafka
  ) {}

  async set(key: string, value: unknown): Promise<void> {
    // Step 1: Update cache immediately
    await this.cache.setEx(key, 300, JSON.stringify(value));

    // Step 2: Publish to queue for async database persistence
    await this.queue.send({
      topic: 'cache-updates',
      messages: [{
        key,
        value: JSON.stringify({
          operation: 'set',
          key,
          value,
          timestamp: Date.now()
        })
      }]
    });
  }

  async delete(key: string): Promise<void> {
    await this.cache.del(key);

    await this.queue.send({
      topic: 'cache-updates',
      messages: [{
        key,
        value: JSON.stringify({
          operation: 'delete',
          key,
          timestamp: Date.now()
        })
      }]
    });
  }
}

// Queue consumer (runs asynchronously)
class CacheUpdateConsumer {
  async process(message: CacheUpdateMessage): Promise<void> {
    const { operation, key, value, timestamp } = message;

    // Idempotency check (skip if older than last update)
    const lastProcessed = await this.getLastProcessedTimestamp(key);
    if (timestamp <= lastProcessed) {
      return; // Already processed newer value
    }

    if (operation === 'set') {
      await this.db.set(key, value);
    } else if (operation === 'delete') {
      await this.db.delete(key);
    }

    await this.setLastProcessedTimestamp(key, timestamp);
  }
}
```

## Refresh-Ahead

```typescript
// Refresh-Ahead: Background refresh of frequently accessed items
class RefreshAheadCache<T> {
  private refreshInProgress: Set<string> = new Set();

  constructor(
    private cache: Redis,
    private loader: (key: string) => Promise<T>,
    private defaultTtl: number,
    private refreshThreshold: number = 0.8  // Refresh at 80% of TTL
  ) {}

  async get(key: string): Promise<T> {
    const cached = await this.cache.get(key);

    if (cached) {
      const item = JSON.parse(cached) as CachedItem<T>;

      // Check if needs background refresh
      const ttl = await this.cache.ttl(key);
      if (ttl < this.defaultTtl * (1 - this.refreshThreshold)) {
        // Trigger background refresh
        this.refresh(key);
      }

      return item.value;
    }

    // Cache miss - load synchronously
    const value = await this.loader(key);
    await this.cache.setEx(key, this.defaultTtl, JSON.stringify({ value }));
    return value;
  }

  private async refresh(key: string): Promise<void> {
    // Prevent multiple simultaneous refreshes
    if (this.refreshInProgress.has(key)) {
      return;
    }

    this.refreshInProgress.add(key);

    try {
      // Fire and forget - don't block the read
      const value = await this.loader(key);
      await this.cache.setEx(key, this.defaultTtl, JSON.stringify({ value }));
    } catch (error) {
      logger.error('Background refresh failed', { key, error });
    } finally {
      this.refreshInProgress.delete(key);
    }
  }
}

// Usage
const userCache = new RefreshAheadCache<User>(
  redis,
  (userId) => db.users.findById(userId),
  300  // 5 minutes TTL
);

// Reads will trigger background refresh when 20% TTL remains
const user = await userCache.get('user:123');
```

## TTL Strategy

```typescript
interface TTLConfig {
  hotData: number;      // Frequently accessed: 5-15 minutes
  warmData: number;      // Moderately accessed: 1-5 minutes
  coldData: number;      // Rarely accessed: 30-60 seconds
  userSessions: number;  // Never cache
  financialData: number; // Never cache
}

const ttlConfig: TTLConfig = {
  hotData: 5 * 60,        // 5 minutes
  warmData: 60,            // 1 minute
  coldData: 30,            // 30 seconds
  userSessions: -1,        // Don't cache
  financialData: -1        // Don't cache
};

// TTL selection logic
function getTTLForData(dataType: DataType, accessPattern: AccessPattern): number {
  // User sessions - never cache
  if (dataType === 'session') return -1;

  // Financial transactions - never cache
  if (dataType === 'transaction') return -1;

  // Real-time data - short TTL
  if (accessPattern === 'real-time') return 30;

  // Dashboard metrics - medium TTL
  if (accessPattern === 'dashboard') return 60;

  // Static content - long TTL
  if (accessPattern === 'static') return 3600;

  return 300; // Default 5 minutes
}

// Dynamic TTL based on content freshness
async function getUserWithDynamicTTL(userId: string): Promise<User> {
  const cacheKey = `user:${userId}`;

  const [cached, lastDbUpdate] = await Promise.all([
    redis.get(cacheKey),
    db.users.getLastUpdateTime(userId)
  ]);

  const age = Date.now() - lastDbUpdate.getTime();
  const maxAge = age < 60000 ? 300 : 60;  // Shorter TTL if recently updated

  if (cached) {
    return JSON.parse(cached);
  }

  const user = await db.users.findById(userId);
  await redis.setEx(cacheKey, maxAge, JSON.stringify(user));
  return user;
}
```

## Cache Invalidation

```typescript
// Invalidation strategies

// 1. Direct invalidation (simple)
async function updateUser(userId: string, data: UpdateUserDto): Promise<void> {
  await db.users.update(userId, data);
  await redis.del(`user:${userId}`);  // Direct delete
}

// 2. Invalidation by pattern (use with caution)
async function invalidateUserPatterns(userId: string): Promise<void> {
  const patterns = [
    `user:${userId}`,
    `user:${userId}:profile`,
    `user:${userId}:settings`,
    `user:${userId}:preferences`
  ];

  for (const pattern of patterns) {
    await redis.del(pattern);
  }
}

// 3. Tag-based invalidation
class TaggedCache {
  async set(key: string, value: unknown, tags: string[]): Promise<void> {
    await this.cache.setEx(key, 300, JSON.stringify(value));

    // Add key to tag sets
    for (const tag of tags) {
      await this.cache.sAdd(`tag:${tag}`, key);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    // Get all keys with this tag
    const keys = await this.cache.sMembers(`tag:${tag}`);

    // Delete all keys
    if (keys.length > 0) {
      await this.cache.del(...keys);
    }

    // Delete the tag set itself
    await this.cache.del(`tag:${tag}`);
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    await Promise.all(tags.map(tag => this.invalidateByTag(tag)));
  }
}

// Usage
const cache = new TaggedCache(redis);

await cache.set(
  `user:${userId}`,
  userData,
  ['user', `user:${userId}`, 'active-users']
);

// When user updates their profile
await cache.invalidateByTags([`user:${userId}`, 'active-users']);

// When admin invalidates all users
await cache.invalidateByTag('user');
```

## Distributed Caching

```typescript
// Distributed cache cluster
class DistributedCache {
  private nodes: Redis[];
  private hashRing: ConsistentHash;

  constructor(nodeUrls: string[]) {
    this.nodes = nodeUrls.map(url => new Redis(url));
    this.hashRing = new ConsistentHash(nodeUrls);
  }

  private getNode(key: string): Redis {
    const nodeUrl = this.hashRing.getNode(key);
    return this.nodes.find(n => n.url === nodeUrl)!;
  }

  async get(key: string): Promise<string | null> {
    return this.getNode(key).get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const node = this.getNode(key);
    if (ttl) {
      await node.setEx(key, ttl, value);
    } else {
      await node.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    await this.getNode(key).del(key);
  }

  // Multi-key operations spread across nodes
  async mGet(keys: string[]): Promise<(string | null)[]> {
    const grouped = this.groupKeysByNode(keys);
    const results = await Promise.all(
      Object.entries(grouped).map(([nodeUrl, nodeKeys]) =>
        this.nodes.find(n => n.url === nodeUrl)!.mGet(nodeKeys)
      )
    );

    // Restore original order
    return this.restoreOriginalOrder(keys, results);
  }
}

// Consistent hashing for distribution
class ConsistentHash {
  private ring: Map<number, string> = new Map();
  private sortedKeys: number[] = [];

  constructor(nodes: string[], private replicas = 150) {
    for (const node of nodes) {
      this.addNode(node);
    }
  }

  addNode(node: string): void {
    for (let i = 0; i < this.replicas; i++) {
      const hash = this.hash(`${node}:${i}`);
      this.ring.set(hash, node);
    }
    this.sortedKeys = Array.from(this.ring.keys()).sort();
  }

  getNode(key: string): string {
    if (this.ring.size === 0) throw new Error('No nodes');

    const hash = this.hash(key);
    for (const ringKey of this.sortedKeys) {
      if (hash <= ringKey) {
        return this.ring.get(ringKey)!;
      }
    }
    return this.ring.get(this.sortedKeys[0])!;
  }

  private hash(key: string): number {
    // FNV-1a hash for distribution
    let hash = 2166136261;
    for (const char of key) {
      hash ^= char.charCodeAt(0);
      hash *= 16777619;
    }
    return hash >>> 0;
  }
}
```

## Cache Warming

```typescript
// Cache warming strategies

// 1. Startup warming - load essential data
async function warmCacheOnStartup(): Promise<void> {
  logger.info('Starting cache warm-up');

  // Load most accessed users
  const topUsers = await db.users.findMostAccessed(1000);
  await Promise.all(
    topUsers.map(user =>
      redis.setEx(`user:${user.id}`, 3600, JSON.stringify(user))
    )
  );

  // Load active sessions
  const activeSessions = await db.sessions.findActive();
  await Promise.all(
    activeSessions.map(session =>
      redis.setEx(`session:${session.id}`, session.ttl, JSON.stringify(session))
    )
  );

  logger.info('Cache warm-up complete', { users: topUsers.length });
}

// 2. Predictive warming - based on patterns
async function predictAndWarm(userId: string): Promise<void> {
  // User viewed product A, likely to view related products
  const viewedProduct = await getLastViewedProduct(userId);
  const relatedProducts = await findRelatedProducts(viewedProduct.id);

  await Promise.all(
    relatedProducts.slice(0, 10).map(product =>
      redis.setEx(`product:${product.id}`, 300, JSON.stringify(product))
    )
  );

  // User is from US, warm US-specific content
  const userRegion = await getUserRegion(userId);
  const regionContent = await getRegionContent(userRegion);

  await redis.setEx(`content:region:${userRegion}`, 600, JSON.stringify(regionContent));
}

// 3. On-demand warming after cache miss
async function getWithWarmOnMiss<T>(
  key: string,
  loader: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = await redis.get(key);

  if (cached) {
    return JSON.parse(cached);
  }

  // Load and warm cache
  const value = await loader();
  await redis.setEx(key, ttl, JSON.stringify(value));

  // Also warm related keys
  await warmRelatedKeys(key, value);

  return value;
}
```

## Multi-Layer Caching

```typescript
// L1: Local in-memory cache
// L2: Redis distributed cache
// L3: Database

class MultiLayerCache {
  private l1: Map<string, { value: string; expiresAt: number }> = new Map();
  private l1MaxSize = 1000;
  private l1Ttl = 1000; // 1 second local cache

  constructor(private redis: Redis, private db: Database) {}

  async get(key: string): Promise<string | null> {
    // L1 check (local memory)
    const l1Entry = this.l1.get(key);
    if (l1Entry && l1Entry.expiresAt > Date.now()) {
      return l1Entry.value;
    }

    // L2 check (Redis)
    const l2Value = await this.redis.get(key);
    if (l2Value) {
      this.setL1(key, l2Value);
      return l2Value;
    }

    // L3 fetch (database)
    const l3Value = await this.db.get(key);
    if (l3Value) {
      await this.redis.setEx(key, 300, l3Value);
      this.setL1(key, l3Value);
    }

    return l3Value;
  }

  private setL1(key: string, value: string): void {
    if (this.l1.size >= this.l1MaxSize) {
      // Evict oldest entry
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.l1) {
        if (v.expiresAt < oldestTime) {
          oldestTime = v.expiresAt;
          oldestKey = k;
        }
      }
      if (oldestKey) this.l1.delete(oldestKey);
    }
    this.l1.set(key, { value, expiresAt: Date.now() + this.l1Ttl });
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    await this.redis.setEx(key, ttl, value);
    this.setL1(key, value);
  }

  async invalidate(key: string): Promise<void> {
    await this.redis.del(key);
    this.l1.delete(key);
  }
}
```

## Common Pitfalls

| Pitfall | Problem | Solution |
|---------|---------|----------|
| **Cache stampede** | Many requests hit DB when cache expires | Use lock/mutex for refresh, randomize TTL |
| **Stale data** | Read after write inconsistency | Write-through, explicit invalidation |
| **Large values** | Serialization overhead, memory issues | Compress, store only needed fields |
| **Hot keys** | Single key receiving all traffic | Key splitting, local cache, replica |
| **Cold start** | First request always misses | Proactive warming, lazy loading |
| **Invalidation storms** | Many keys invalidated at once | Tag-based, batch invalidation |
