---
name: api-and-patterns
description: "API design patterns (REST/GraphQL), repository pattern, caching strategies (Redis), error handling, authentication (JWT/RBAC), rate limiting, background jobs, and structured logging for Node.js backends."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-26
updated_at: 2026-03-26
type: pattern
tags: [backend, api, rest, graphql, caching, redis, auth, jwt, rate-limiting, queues, logging]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: implementation-pattern
  interactions:
    - knowledge-only
see_also:
  - rd3:backend-design
  - rd3:database-patterns
  - rd3:sentry-and-monitoring
---

# API & Backend Patterns

Detailed patterns for API design, data access, caching, authentication, queues, and logging.

## When to Activate

- Designing REST or GraphQL API endpoints
- Implementing repository, service, or controller layers
- Optimizing database queries (N+1, indexing, connection pooling)
- Adding caching (Redis, in-memory, HTTP cache headers)
- Setting up background jobs or async processing
- Structuring error handling and validation for APIs
- Building middleware (auth, logging, rate limiting)

---

## API Design Patterns

### RESTful API Structure

```typescript
// ✅ Resource-based URLs
GET    /api/markets                 // List resources
GET    /api/markets/:id             // Get single resource
POST   /api/markets                 // Create resource
PUT    /api/markets/:id             // Replace resource
PATCH  /api/markets/:id             // Update resource
DELETE /api/markets/:id             // Delete resource

// ✅ Query parameters for filtering, sorting, pagination
GET /api/markets?status=active&sort=volume&limit=20&offset=0
```

### Repository Pattern

```typescript
interface MarketRepository {
    findAll(filters?: MarketFilters): Promise<Market[]>
    findById(id: string): Promise<Market | null>
    create(data: CreateMarketDto): Promise<Market>
    update(id: string, data: UpdateMarketDto): Promise<Market>
    delete(id: string): Promise<void>
}

class SupabaseMarketRepository implements MarketRepository {
    async findAll(filters?: MarketFilters): Promise<Market[]> {
        let query = supabase.from('markets').select('*')
        if (filters?.status) query = query.eq('status', filters.status)
        if (filters?.limit) query = query.limit(filters.limit)
        const { data, error } = await query
        if (error) throw new Error(error.message)
        return data
    }
}
```

### Service Layer Pattern

```typescript
class MarketService {
    constructor(private marketRepo: MarketRepository) {}

    async searchMarkets(query: string, limit = 10): Promise<Market[]> {
        const embedding = await generateEmbedding(query)
        const results = await this.vectorSearch(embedding, limit)
        const markets = await this.marketRepo.findByIds(results.map(r => r.id))
        return markets.sort((a, b) => {
            const scoreA = results.find(r => r.id === a.id)?.score || 0
            const scoreB = results.find(r => r.id === b.id)?.score || 0
            return scoreA - scoreB
        })
    }
}
```

### Middleware Pattern

```typescript
export function withAuth(handler: NextApiHandler): NextApiHandler {
    return async (req, res) => {
        const token = req.headers.authorization?.replace('Bearer ', '')
        if (!token) return res.status(401).json({ error: 'Unauthorized' })
        try {
            const user = await verifyToken(token)
            req.user = user
            return handler(req, res)
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' })
        }
    }
}
```

---

## Database Patterns

### Query Optimization

```typescript
// ✅ GOOD: Select only needed columns
const { data } = await supabase
    .from('markets')
    .select('id, name, status, volume')
    .eq('status', 'active')
    .order('volume', { ascending: false })
    .limit(10)

// ❌ BAD: Select everything
const { data } = await supabase.from('markets').select('*')
```

### N+1 Query Prevention

```typescript
// ❌ BAD: N+1 query problem
const markets = await getMarkets()
for (const market of markets) {
    market.creator = await getUser(market.creator_id)  // N queries
}

// ✅ GOOD: Batch fetch
const markets = await getMarkets()
const creatorIds = markets.map(m => m.creator_id)
const creators = await getUsers(creatorIds)  // 1 query
const creatorMap = new Map(creators.map(c => [c.id, c]))
markets.forEach(market => { market.creator = creatorMap.get(market.creator_id) })
```

### Transaction Pattern

```typescript
async function createMarketWithPosition(
    marketData: CreateMarketDto,
    positionData: CreatePositionDto
) {
    const { data, error } = await supabase.rpc('create_market_with_position', {
        market_data: marketData,
        position_data: positionData
    })
    if (error) throw new Error('Transaction failed')
    return data
}
```

---

## Caching Strategies

### Redis Caching Layer

```typescript
class CachedMarketRepository implements MarketRepository {
    constructor(
        private baseRepo: MarketRepository,
        private redis: RedisClient
    ) {}

    async findById(id: string): Promise<Market | null> {
        const cached = await this.redis.get(`market:${id}`)
        if (cached) return JSON.parse(cached)

        const market = await this.baseRepo.findById(id)
        if (market) {
            await this.redis.setex(`market:${id}`, 300, JSON.stringify(market))
        }
        return market
    }

    async invalidateCache(id: string): Promise<void> {
        await this.redis.del(`market:${id}`)
    }
}
```

### Cache-Aside Pattern

```typescript
async function getMarketWithCache(id: string): Promise<Market> {
    const cacheKey = `market:${id}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const market = await db.markets.findUnique({ where: { id } })
    if (!market) throw new Error('Market not found')

    await redis.setex(cacheKey, 300, JSON.stringify(market))
    return market
}
```

---

## Error Handling Patterns

### Centralized Error Handler

```typescript
class ApiError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public isOperational = true
    ) {
        super(message)
        Object.setPrototypeOf(this, ApiError.prototype)
    }
}

export function errorHandler(error: unknown, req: Request): Response {
    if (error instanceof ApiError) {
        return NextResponse.json({ success: false, error: error.message },
            { status: error.statusCode })
    }
    if (error instanceof z.ZodError) {
        return NextResponse.json({
            success: false, error: 'Validation failed', details: error.errors
        }, { status: 400 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' },
        { status: 500 })
}
```

### Retry with Exponential Backoff

```typescript
async function fetchWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3
): Promise<T> {
    let lastError: Error
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error as Error
            if (i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 1000
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
    }
    throw lastError!
}
```

---

## Authentication & Authorization

### JWT Token Validation

```typescript
interface JWTPayload {
    userId: string
    email: string
    role: 'admin' | 'user'
}

export function verifyToken(token: string): JWTPayload {
    try {
        return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
    } catch (error) {
        throw new ApiError(401, 'Invalid token')
    }
}

export async function requireAuth(request: Request) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) throw new ApiError(401, 'Missing authorization token')
    return verifyToken(token)
}
```

### Role-Based Access Control

```typescript
type Permission = 'read' | 'write' | 'delete' | 'admin'

const rolePermissions: Record<User['role'], Permission[]> = {
    admin: ['read', 'write', 'delete', 'admin'],
    moderator: ['read', 'write', 'delete'],
    user: ['read', 'write']
}

export function hasPermission(user: User, permission: Permission): boolean {
    return rolePermissions[user.role].includes(permission)
}

export function requirePermission(permission: Permission) {
    return (handler: (request: Request, user: User) => Promise<Response>) => {
        return async (request: Request) => {
            const user = await requireAuth(request)
            if (!hasPermission(user, permission)) {
                throw new ApiError(403, 'Insufficient permissions')
            }
            return handler(request, user)
        }
    }
}
```

---

## Rate Limiting

### In-Memory Rate Limiter

```typescript
class RateLimiter {
    private requests = new Map<string, number[]>()

    async checkLimit(
        identifier: string,
        maxRequests: number,
        windowMs: number
    ): Promise<boolean> {
        const now = Date.now()
        const requests = this.requests.get(identifier) || []
        const recentRequests = requests.filter(time => now - time < windowMs)

        if (recentRequests.length >= maxRequests) return false

        recentRequests.push(now)
        this.requests.set(identifier, recentRequests)
        return true
    }
}

const limiter = new RateLimiter()
// Usage: check `await limiter.checkLimit(ip, 100, 60000)` before processing
```

---

## Background Jobs & Queues

### Simple Queue Pattern

```typescript
class JobQueue<T> {
    private queue: T[] = []
    private processing = false

    async add(job: T): Promise<void> {
        this.queue.push(job)
        if (!this.processing) this.process()
    }

    private async process(): Promise<void> {
        this.processing = true
        while (this.queue.length > 0) {
            const job = this.queue.shift()!
            try {
                await this.execute(job)
            } catch (error) {
                console.error('Job failed:', error)
            }
        }
        this.processing = false
    }

    private async execute(job: T): Promise<void> {
        // Job execution logic
    }
}
```

---

## Structured Logging

```typescript
interface LogContext {
    userId?: string
    requestId?: string
    method?: string
    path?: string
    [key: string]: unknown
}

class Logger {
    log(level: 'info' | 'warn' | 'error', message: string, context?: LogContext) {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level, message, ...context
        }))
    }

    info(message: string, context?: LogContext) { this.log('info', message, context) }
    warn(message: string, context?: LogContext) { this.log('warn', message, context) }
    error(message: string, error: Error, context?: LogContext) {
        this.log('error', message, { ...context, error: error.message, stack: error.stack })
    }
}

const logger = new Logger()
// Usage: logger.info('Fetching markets', { requestId, method: 'GET', path: '/api/markets' })
```

---

**See also:**
- [database-patterns.md](database-patterns.md) — Prisma, PostgreSQL, MongoDB, Redis deep-dive
- [sentry-and-monitoring.md](sentry-and-monitoring.md) — Sentry and observability setup
