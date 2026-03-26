---
name: api-design
description: "API design patterns: REST, GraphQL, gRPC, versioning, OpenAPI, security, and best practices for API Gateway architecture."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [backend, api-design, rest, graphql, grpc, openapi, versioning, architecture-design]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:backend-architect
  - rd3:pl-typescript/references/api-design
---

# API Design Patterns

Comprehensive guide to API design covering REST, GraphQL, gRPC, versioning strategies, and API Gateway architecture.

## REST API Best Practices

### Resource Naming

```
GET    /api/v1/users          # List users
GET    /api/v1/users/{id}     # Get specific user
POST   /api/v1/users          # Create user
PUT    /api/v1/users/{id}      # Replace user (full update)
PATCH  /api/v1/users/{id}      # Partial update
DELETE /api/v1/users/{id}      # Delete user

# Nested resources
GET    /api/v1/users/{id}/orders        # User's orders
GET    /api/v1/users/{id}/orders/{id}   # Specific order

# Actions as resources (when RPC-style is needed)
POST   /api/v1/users/{id}/activate
POST   /api/v1/users/{id}/deactivate
```

### HTTP Status Codes

| Category | Code | Use Case |
|----------|------|----------|
| **Success** | 200 OK | Successful GET, PUT, PATCH |
| | 201 Created | Successful POST (resource created) |
| | 204 No Content | Successful DELETE |
| **Redirection** | 301 Moved Permanently | Permanent redirect |
| | 304 Not Modified | Cached response (use If-None-Match) |
| **Client Error** | 400 Bad Request | Invalid request body/params |
| | 401 Unauthorized | Missing or invalid authentication |
| | 403 Forbidden | Authenticated but not authorized |
| | 404 Not Found | Resource doesn't exist |
| | 409 Conflict | Resource conflict (duplicate, state mismatch) |
| | 422 Unprocessable Entity | Validation errors |
| | 429 Too Many Requests | Rate limit exceeded |
| **Server Error** | 500 Internal Server Error | Unexpected server error |
| | 502 Bad Gateway | Upstream service error |
| | 503 Service Unavailable | Service down for maintenance |

### Request/Response Patterns

```typescript
// Request with filtering, sorting, pagination
GET /api/v1/users?status=active&sort=created_at:desc&page=1&page_size=20

// Response envelope pattern
interface ApiResponse<T> {
  data: T;
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  links: {
    self: string;
    next: string | null;
    prev: string | null;
  };
}

// Error response pattern
interface ApiError {
  code: string;        // Machine-readable error code
  message: string;     // Human-readable message
  details?: Array<{
    field: string;
    issue: string;
  }>;
  traceId: string;     // For debugging/logging
}
```

### API Versioning

```typescript
// URL versioning (recommended for public APIs)
GET /api/v1/users
GET /api/v2/users

// Header versioning (recommended for private APIs)
GET /api/users
Accept: application/vnd.api+json; version=1

// Deprecation header (RFC 8594)
Sunset: Sat, 01 Jan 2027 00:00:00 GMT
Deprecation: true
Link: <https://api.example.com/v2/users>; rel="successor-version"
```

## GraphQL Best Practices

### Schema Design

```graphql
type User {
  id: ID!
  email: String!
  name: String!
  profile: Profile
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Profile {
  bio: String
  avatarUrl: String
  preferences: Preferences
}

type Preferences {
  theme: Theme!
  notifications: NotificationSettings!
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

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

# Query with pagination
type Query {
  user(id: ID!): User
  users(
    first: Int!
    after: String
    filter: UserFilter
    sort: [UserSort!]
  ): UserConnection!
}

# Mutations with input types
type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!
}

input CreateUserInput {
  name: String!
  email: String!
  password: String!
}

input UserFilter {
  status: UserStatus
  createdAfter: DateTime
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}
```

### N+1 Prevention

```typescript
// DataLoader pattern for batch loading
import DataLoader from 'dataloader';

// Batch function for user loading
const batchUsers = async (ids: string[]): Promise<User[]> => {
  const users = await db.users.findMany({
    where: { id: { in: ids } }
  });
  return ids.map(id => users.find(u => u.id === id));
};

// Create loader
const userLoader = new DataLoader(batchUsers);

// Use in resolver
const resolvers = {
  Post: {
    author: (post, _, { userLoader }) => userLoader.load(post.authorId)
  }
};
```

### Query Complexity Analysis

```typescript
// Limit query depth
const queryComplexity = {
  maximumDepth: 10,
  maximumComplexity: 1000,
  ignoreIntrospection: false
};

// Complexity calculation example
const query = `
  query {
    users(first: 10) {        # Complexity: 10
      posts(first: 10) {     # Complexity: 10 * 10 = 100
        comments(first: 10) { # Complexity: 10 * 10 * 10 = 1000
          author {             # Complexity: 1000 * 1 = 1000
            name
          }
        }
      }
    }
  }
`;
// Total complexity = 1111 (exceeds limit)
```

## gRPC Best Practices

### Service Definition

```protobuf
syntax = "proto3";
package user.v1;

option go_package = "github.com/example/gen/go/user/v1;userpb";

service UserService {
  // Unary - simple request/response
  rpc GetUser(GetUserRequest) returns (User);

  // Server streaming - useful for lists or real-time updates
  rpc ListUsers(ListUsersRequest) returns (stream User);

  // Client streaming - useful for batch operations
  rpc CreateUsers(stream CreateUserRequest) returns (CreateUsersResponse);

  // Bidirectional streaming - real-time communication
  rpc StreamUserUpdates(StreamUserRequest) returns (stream User);
}

message GetUserRequest {
  string user_id = 1;
  // Field mask for partial responses
  google.protobuf.FieldMask field_mask = 2;
}

message User {
  string id = 1;
  string email = 2;
  string name = 3;
  map<string, string> metadata = 4;
  google.protobuf.Timestamp created_at = 5;
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
  UserFilter filter = 3;
}

message UserFilter {
  repeated string user_ids = 1;
  UserStatus status = 2;
}
```

### Error Handling

```typescript
// gRPC status codes mapping
enum GrpcStatus {
  OK = 0,
  CANCELLED = 1,
  UNKNOWN = 2,
  INVALID_ARGUMENT = 3,
  NOT_FOUND = 4,
  ALREADY_EXISTS = 5,
  PERMISSION_DENIED = 7,
  RESOURCE_EXHAUSTED = 8,
  FAILED_PRECONDITION = 9,
  ABORTED = 10,
  OUT_OF_RANGE = 11,
  UNIMPLEMENTED = 12,
  INTERNAL = 13,
  UNAVAILABLE = 14,
  DATA_LOSS = 15,
}

// Error propagation
async function getUser(req: GetUserRequest): Promise<User> {
  try {
    const user = await userRepository.findById(req.userId);
    if (!user) {
      throw {
        code: GrpcStatus.NOT_FOUND,
        message: `User ${req.userId} not found`
      };
    }
    return user;
  } catch (error) {
    // Log and re-throw with context
    logger.error('getUser failed', { userId: req.userId, error });
    throw error;
  }
}
```

## API Gateway Architecture

### Gateway Responsibilities

| Responsibility | Implementation |
|---------------|----------------|
| **Authentication** | JWT validation, OAuth2 token exchange |
| **Authorization** | RBAC/ABAC policy enforcement |
| **Rate Limiting** | Token bucket, sliding window |
| **Request Routing** | Path-based, header-based, weighted |
| **Protocol Translation** | REST → gRPC, HTTP → WebSocket |
| **Service Composition** | GraphQL federation, API aggregation |
| **Caching** | Edge caching, response caching |
| **Observability** | Request logging, distributed tracing |

### Gateway Configuration

```yaml
# Kong gateway configuration example
services:
  - name: user-service
    url: http://user-service:8080
    routes:
      - name: users-route
        paths:
          - /api/v1/users
        methods:
          - GET
          - POST
        plugins:
          - name: jwt
          - name: rate-limiting
            config:
              minute: 100
              policy: redis
          - name: cors
            config:
              origins:
                - https://app.example.com
              methods:
                - GET
                - POST
                - PUT
                - DELETE
              headers:
                - Authorization
                - Content-Type

plugins:
  - name: jwt
    config:
      key_claim_name: kid
      claims_to_verify:
        - exp
        - iat
```

### Circuit Breaker Integration

```typescript
// Circuit breaker states
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// Circuit breaker configuration
const circuitBreakerConfig = {
  failureThreshold: 5,        // Open after 5 failures
  successThreshold: 3,        // Close after 3 successes (in HALF_OPEN)
  timeout: 30,               // Seconds before attempting recovery
  halfOpenRequests: 3        // Test requests in HALF_OPEN state
};

// Usage in API gateway
class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private nextAttempt: Date;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (new Date() >= this.nextAttempt) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## OpenAPI Integration

### TypeScript Type Generation

```typescript
// Using openapi-typescript
// npx openapi-typescript https://api.example.com/openapi.json -o ./src/api/schema.ts

import { paths, components } from './api/schema';

// Type-safe client
import createClient from 'openapi-fetch';

const client = createClient<paths>({
  baseUrl: 'https://api.example.com',
});

async function getUser(userId: string) {
  const { data, error } = await client.GET('/users/{user_id}', {
    params: {
      path: { user_id: userId },
      query: { include: 'profile,preferences' }
    }
  });

  if (error) {
    // Fully typed error
    console.error(error.code, error.message);
    return;
  }

  // Fully typed response
  return data; // UserDto
}
```

## API Security

### Authentication Patterns

```typescript
// JWT token validation
interface JWTPayload {
  sub: string;        // User ID
  email: string;
  roles: string[];
  exp: number;
  iat: number;
  jti: string;        // Token ID for revocation
}

// Middleware validation
async function validateToken(req: Request): Promise<JWTPayload> {
  const token = req.headers.get('Authorization')?.split(' ')[1];

  if (!token) {
    throw new HttpError(401, 'Missing authorization token');
  }

  try {
    const payload = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://auth.example.com',
      audience: 'https://api.example.com'
    });
    return payload as JWTPayload;
  } catch (error) {
    throw new HttpError(401, 'Invalid token');
  }
}
```

### Rate Limiting

```typescript
// Token bucket rate limiter
interface RateLimiter {
  check(identifier: string, cost: number): Promise<RateLimitResult>;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;  // Seconds until next allowed request
}

// Implementation
class TokenBucketRateLimiter implements RateLimiter {
  async check(identifier: string, cost: number): Promise<RateLimitResult> {
    const bucket = await this.getBucket(identifier);

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      await this.saveBucket(bucket);
      return {
        allowed: true,
        remaining: bucket.tokens,
        resetAt: bucket.resetAt
      };
    }

    return {
      allowed: false,
      remaining: bucket.tokens,
      resetAt: bucket.resetAt,
      retryAfter: Math.ceil((cost - bucket.tokens) / bucket.refillRate)
    };
  }
}
```
