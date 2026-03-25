---
name: api-patterns
description: "Production-ready REST, GraphQL, and async API patterns: URL structure, HTTP methods/status codes, error format, pagination, authentication, versioning, OpenAPI 3.x, webhooks, SSE, and gRPC."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-24
tags: [api, rest, graphql, http, openapi, webhooks, streaming, patterns, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw,pi"
  category: engineering-core
  interactions:
    - knowledge-only
see_also:
  - rd3:sys-developing
  - rd3:sys-testing
---

# API Design Patterns

## REST API Conventions

### URL Structure

```
/api/v1/{resource}           # Collection
/api/v1/{resource}/{id}      # Specific item
/api/v1/{resource}/{id}/{sub-resource}  # Sub-resource
```

**Good Examples:**
- `GET /api/v1/users` — List users
- `GET /api/v1/users/123` — Get user 123
- `POST /api/v1/users` — Create user
- `PUT /api/v1/users/123` — Replace user 123
- `PATCH /api/v1/users/123` — Update user 123
- `DELETE /api/v1/users/123` — Delete user 123

**Anti-Patterns:**
- `/api/getUsers` — Verb in URL
- `/api/user/list` — Action in URL
- `/api/users/delete/123` — HTTP verb in path

### HTTP Methods

| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| GET | Read resource | Yes | Yes |
| POST | Create resource | No | No |
| PUT | Replace resource | Yes | No |
| PATCH | Update resource | No | No |
| DELETE | Remove resource | Yes | No |

### HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Auth OK, no permission |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate, version mismatch |
| 422 | Unprocessable | Semantic error |
| 500 | Server Error | Unexpected server error |

## Error Handling

### Standard Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Email format is invalid"
      }
    ],
    "requestId": "req_abc123"
  }
}
```

### Error Code Categories

| Prefix | Category |
|--------|----------|
| `AUTH_*` | Authentication errors |
| `PERM_*` | Permission errors |
| `VAL_*` | Validation errors |
| `NOT_FOUND_*` | Resource not found |
| `CONFLICT_*` | Conflict errors |
| `RATE_*` | Rate limiting |
| `SRV_*` | Server errors |

## Pagination

### Cursor-Based (Recommended)

```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6MTIzfQ==",
    "hasMore": true,
    "limit": 20
  }
}
```

**Request:**
```
GET /api/v1/users?cursor=eyJpZCI6MTIzfQ==&limit=20
```

**Benefits:**
- Stable across insertions/deletions
- Works with real-time data
- Efficient for large datasets

### Offset-Based (Simple cases)

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "pageSize": 20,
    "total": 157
  }
}
```

**Request:**
```
GET /api/v1/users?page=2&pageSize=20
```

## Authentication Patterns

### Bearer Token (JWT)

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### API Key

```
X-API-Key: sk_live_abc123
```

### OAuth 2.0 Flows

| Flow | Use Case |
|------|----------|
| Authorization Code | Web apps with backend |
| PKCE | Mobile/SPA apps |
| Client Credentials | Service-to-service |
| Device Code | IoT, CLI tools |

## Versioning

### URL Versioning (Recommended)

```
/api/v1/users
/api/v2/users
```

### Header Versioning

```
Accept: application/vnd.myapi.v1+json
```

## Rate Limiting Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

## GraphQL Patterns

### Query Structure

```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    posts(first: 10) {
      edges {
        node {
          id
          title
        }
      }
    }
  }
}
```

### Mutation Structure

```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    user {
      id
      name
    }
    errors {
      field
      message
    }
  }
}
```

### Error Handling

```json
{
  "data": null,
  "errors": [
    {
      "message": "User not found",
      "path": ["user"],
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ]
}
```

## OpenAPI 3.x Specification

### Document Structure

```yaml
# openapi.yaml
openapi: 3.1.0
info:
  title: User API
  version: 1.0.0
  contact:
    email: api@example.com

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging.api.example.com/v1
    description: Staging

paths:
  /users:
    get:
      operationId: listUsers
      summary: List users
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: cursor
          in: query
          schema:
            type: string
      responses:
        '200':
          description: A paginated list of users
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'

components:
  schemas:
    UserList:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        pagination:
          $ref: '#/components/schemas/Pagination'

    User:
      type: object
      required: [id, email]
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string

    Pagination:
      type: object
      properties:
        cursor:
          type: string
        hasMore:
          type: boolean
        limit:
          type: integer

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []
```

### OpenAPI Guidelines

| Practice | Benefit |
|----------|---------|
| Use `openapi: 3.1.0` with JSON Schema | Native coercion, `type: "string"` + `format:` |
| Reference `$ref` for reusability | Single source of truth for schemas |
| Name operations with `operationId` | Client SDK generation, debugging |
| Document error responses | API consumer clarity |
| Use `security` at top level | Applied to all operations unless overridden |

## Async Patterns

### Server-Sent Events (SSE)

Use for server-to-client push over HTTP. Good for live dashboards, notifications, progress updates.

**Server:**

```typescript
// Bun/TypeScript SSE endpoint
export function handleSSE(req: Request): Response {
  const { readable, writable } = new TextEncoderStream().through();

  const interval = setInterval(() => {
    writable.write(`data: ${JSON.stringify({ time: Date.now() })}\n\n`);
  }, 1000);

  req.signal.addEventListener('abort', () => clearInterval(interval));

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**Client:**

```typescript
const eventSource = new EventSource('/api/events');

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
});

eventSource.onerror = () => {
  console.error('SSE connection lost');
  eventSource.close();
};
```

### WebSockets

Use for bidirectional, low-latency communication. Good for chat, collaborative editing, gaming.

**Server (Bun):**

```typescript
const server = Bun.serve<{ id: string }>({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      const success = server.upgrade(req, {
        data: { id: crypto.randomUUID() },
      });
      if (success) return;
    }
    return new Response('Upgrade required', { status: 426 });
  },
  websocket: {
    open(ws) {
      console.log('Client connected:', ws.data.id);
    },
    message(ws, msg) {
      ws.send(`Echo: ${msg}`);
    },
    close(ws) {
      console.log('Client disconnected:', ws.data.id);
    },
  },
});
```

### When to Use SSE vs WebSocket vs GraphQL Subscriptions

| Pattern | Direction | Complexity | Use Case |
|---------|-----------|------------|----------|
| SSE | Server → Client | Low | Live updates, notifications |
| WebSocket | Bidirectional | Medium | Chat, collaborative, gaming |
| GraphQL Subscriptions | Bidirectional | High | Unified API with real-time |

## Webhook Design

### Outbound Webhook Pattern

```typescript
interface WebhookPayload<T> {
  event: string;
  timestamp: string;       // ISO 8601
  id: string;              // Unique event ID
  data: T;
  signature?: string;      // HMAC-SHA256
}

// Sign webhook payload
function signWebhook(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Send webhook with retry
async function sendWebhook(
  url: string,
  payload: WebhookPayload<unknown>,
  secret: string
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = signWebhook(body, secret);

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': `sha256=${signature}`,
      'X-Webhook-Event': payload.event,
      'X-Webhook-Delivery': payload.id,
    },
    body,
  });
}
```

### Webhook Signature Verification

```typescript
// Verify inbound webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Webhook Design Guidelines

| Do | Don't |
|----|-------|
| Use HMAC-SHA256 signatures | Trust unsigned payloads |
| Include unique delivery ID | Assume first delivery succeeds |
| Implement idempotency keys | Process duplicate deliveries |
| Return 2xx quickly, process async | Block on heavy work in handler |
| Retry with exponential backoff | Retry on 4xx (client error) |

## gRPC Patterns

### Protocol Buffers Definition

```protobuf
syntax = "proto3";

package user.v1;

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
  rpc CreateUser(CreateUserRequest) returns (User);
  rpc DeleteUser(DeleteUserRequest) returns (google.protobuf.Empty);
}

message User {
  string id = 1;
  string email = 2;
  string name = 3;
}

message GetUserRequest {
  string id = 1;
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message ListUsersResponse {
  repeated User users = 1;
  string next_page_token = 2;
}
```

### gRPC vs REST

| Scenario | Choice | Reason |
|----------|--------|--------|
| Public API | REST + OpenAPI | Universal browser support, tooling |
| Internal microservice | gRPC | Binary protocol, strict schemas, streaming |
| Mobile app | REST | Caching, simplicity |
| Real-time streaming | gRPC Streaming | Native bidirectional streaming |

## Advanced Rate Limiting

### Token Bucket Algorithm

```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  consume(tokens = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;
  }
}
```

### Sliding Window Counter

```typescript
// Redis-backed sliding window for distributed rate limiting
async function slidingWindowRateLimit(
  redis: Redis,
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart); // Remove old entries
  pipeline.zadd(key, now, `${now}-${Math.random()}`); // Add current request
  pipeline.zcard(key); // Count requests in window
  pipeline.pexpireat(key, now + windowMs); // Set expiry

  const results = await pipeline.exec();
  const count = results[2][1] as number;
  const allowed = count <= limit;
  const remaining = Math.max(0, limit - count);
  const resetAt = now + windowMs;

  return { allowed, remaining, resetAt };
}
```

### Rate Limit Response Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Policy: 1000;w=60
Retry-After: 60
```
