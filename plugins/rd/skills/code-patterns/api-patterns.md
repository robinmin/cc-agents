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
| 404 | Not Found | Resource doesn't exist |
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
