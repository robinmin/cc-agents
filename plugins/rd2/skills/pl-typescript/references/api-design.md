# Type-Safe API Design Guide

Complete guide to designing type-safe APIs with TypeScript, including request/response patterns, error handling, and client generation.

## Table of Contents

1. [API Type Design](#api-type-design)
2. [Request/Response Patterns](#requestresponse-patterns)
3. [Error Handling](#error-handling)
4. [API Client Patterns](#api-client-patterns)
5. [Type-Safe Endpoints](#type-safe-endpoints)
6. [OpenAPI Integration](#openapi-integration)

---

## API Type Design

### DTO Pattern (Data Transfer Objects)

Separate internal types from API types.

```typescript
// Domain models
class User {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    private passwordHash: string
  ) {}
}

// DTOs for API
interface UserDto {
  id: string;
  name: string;
  email: string;
}

interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

interface UpdateUserDto {
  name?: string;
  email?: string;
}

// Mappers
function toDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

function fromCreateDto(dto: CreateUserDto): Omit<User, 'id'> {
  return {
    name: dto.name,
    email: dto.email,
    passwordHash: hashPassword(dto.password)
  };
}
```

---

### Pagination Types

```typescript
interface PaginationParams {
  page: number;
  pageSize: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type PaginatedResult<T> = Result<PaginatedResponse<T>, ApiError>;
```

---

### Filter Types

```typescript
interface FilterOperators<T> {
  eq?: T;
  ne?: T;
  gt?: T;
  gte?: T;
  lt?: T;
  lte?: T;
  in?: T[];
  contains?: T extends string ? string : never;
}

interface UserFilters {
  name?: FilterOperators<string>;
  email?: FilterOperators<string>;
  age?: FilterOperators<number>;
  active?: FilterOperators<boolean>;
}

interface FilterQuery<T> {
  filters?: T;
  pagination?: PaginationParams;
}
```

---

## Request/Response Patterns

### Standard API Response

```typescript
type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

// Helper functions
function success<T>(data: T): ApiResult<T> {
  return { success: true, data };
}

function failure(
  code: string,
  message: string,
  statusCode = 400
): ApiResult<never> {
  return {
    success: false,
    error: { code, message, statusCode }
  };
}
```

---

### HTTP Status Type Mapping

```typescript
type HttpResponse<T, S extends number = 200> = {
  status: S;
  data: S extends 200 | 201 ? T : ApiError;
};

// Usage
type UserResponse = HttpResponse<UserDto, 200>;
type ErrorResponse = HttpResponse<never, 400 | 404 | 500>;
```

---

### Endpoint Definition Pattern

```typescript
interface Endpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  request?: unknown;
  response: unknown;
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
}

type Endpoints = {
  '/users': {
    get: {
      response: UserDto[];
      query: { active?: boolean };
    };
    post: {
      request: CreateUserDto;
      response: UserDto;
    };
  };
  '/users/:id': {
    get: {
      response: UserDto;
      params: { id: string };
    };
    put: {
      request: UpdateUserDto;
      response: UserDto;
      params: { id: string };
    };
    delete: {
      response: void;
      params: { id: string };
    };
  };
};
```

---

## Error Handling

### Typed Error Responses

```typescript
type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR';

interface TypedError {
  code: ErrorCode;
  message: string;
  field?: string;
}

type ValidationError = TypedError & {
  code: 'VALIDATION_ERROR';
  field: string;
};

type NotFoundError = TypedError & {
  code: 'NOT_FOUND';
  resource: string;
};

type ApiResult<T, E extends TypedError = TypedError> =
  | { success: true; data: T }
  | { success: false; error: E };
```

---

### Error Handler Pattern

```typescript
class ErrorHandler {
  static handle(error: unknown): ApiError {
    if (error instanceof ValidationError) {
      return {
        code: 'VALIDATION_ERROR',
        message: error.message,
        statusCode: 400
      };
    }
    if (error instanceof NotFoundError) {
      return {
        code: 'NOT_FOUND',
        message: error.message,
        statusCode: 404
      };
    }
    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500
    };
  }
}
```

---

## API Client Patterns

### Type-Safe Fetch Client

```typescript
class ApiClient {
  constructor(private baseUrl: string, private token?: string) {}

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResult<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
          ...options.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return failure(
          data.code || 'API_ERROR',
          data.message || 'Request failed',
          response.status
        );
      }

      return success(data);
    } catch (error) {
      return failure(
        'NETWORK_ERROR',
        error instanceof Error ? error.message : 'Network error'
      );
    }
  }

  async get<T>(path: string): Promise<ApiResult<T>> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T, U>(path: string, data: U): Promise<ApiResult<T>> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put<T, U>(path: string, data: U): Promise<ApiResult<T>> {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete<T>(path: string): Promise<ApiResult<T>> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}
```

---

### Typed API Client

```typescript
interface TypedApiClient {
  getUsers(query?: { active?: boolean }): Promise<ApiResult<UserDto[]>>;
  getUser(id: string): Promise<ApiResult<UserDto>>;
  createUser(data: CreateUserDto): Promise<ApiResult<UserDto>>;
  updateUser(id: string, data: UpdateUserDto): Promise<ApiResult<UserDto>>;
  deleteUser(id: string): Promise<ApiResult<void>>;
}

class UserApiClient implements TypedApiClient {
  constructor(private client: ApiClient) {}

  async getUsers(query?: { active?: boolean }): Promise<ApiResult<UserDto[]>> {
    const qs = query ? `?${new URLSearchParams(query as any)}` : '';
    return this.client.get<UserDto[]>(`/users${qs}`);
  }

  async getUser(id: string): Promise<ApiResult<UserDto>> {
    return this.client.get<UserDto>(`/users/${id}`);
  }

  async createUser(data: CreateUserDto): Promise<ApiResult<UserDto>> {
    return this.client.post<UserDto, CreateUserDto>('/users', data);
  }

  async updateUser(
    id: string,
    data: UpdateUserDto
  ): Promise<ApiResult<UserDto>> {
    return this.client.put<UserDto, UpdateUserDto>(`/users/${id}`, data);
  }

  async deleteUser(id: string): Promise<ApiResult<void>> {
    return this.client.delete<void>(`/users/${id}`);
  }
}
```

---

## Type-Safe Endpoints

### Endpoint Builder

```typescript
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

type EndpointDef<
  M extends Method,
  P = void,
  Q = void,
  B = void,
  R = void
> = {
  method: M;
  path: string;
  params?: P;
  query?: Q;
  body?: B;
  response: R;
};

type ApiCall<E> = E extends EndpointDef<
  infer M,
  infer P,
  infer Q,
  infer B,
  infer R
>
  ? (P extends void
      ? {}
      : { params: P }) &
      (Q extends void ? {} : { query: Q }) &
      (B extends void ? {} : { body: B }) extends infer Args
    ? Args extends Record<string, unknown>
      ? (args: Args) => Promise<ApiResult<R>>
      : never
    : never
  : never;

// Usage
const getUserEndpoint: EndpointDef<'get', { id: string }, void, void, UserDto> =
  {
    method: 'get',
    path: '/users/:id',
    response: {} as UserDto
  };

const updateUserEndpoint: EndpointDef<
  'put',
  { id: string },
  void,
  UpdateUserDto,
  UserDto
> = {
  method: 'put',
  path: '/users/:id',
  response: {} as UserDto
};
```

---

### Typed Router

```typescript
interface Route<
  P extends Record<string, string> = Record<string, string>,
  Q extends Record<string, unknown> = Record<string, unknown>,
  B = unknown,
  R = unknown
> {
  handler: (params: P, query: Q, body: B) => Promise<ApiResult<R>>;
  validateParams?: (params: unknown) => P;
  validateQuery?: (query: unknown) => Q;
  validateBody?: (body: unknown) => B;
}

class Router {
  private routes = new Map<string, Route>();

  get<P, Q, B, R>(
    path: string,
    handler: (params: P, query: Q, body: B) => Promise<ApiResult<R>>
  ): Route<P, Q, B, R> {
    const route: Route<P, Q, B, R> = { handler };
    this.routes.set(path, route);
    return route;
  }

  post<P, Q, B, R>(
    path: string,
    handler: (params: P, query: Q, body: B) => Promise<ApiResult<R>>
  ): Route<P, Q, B, R> {
    const route: Route<P, Q, B, R> = { handler };
    this.routes.set(path, route);
    return route;
  }
}
```

---

## OpenAPI Integration

### OpenAPI Type Generation

Generate TypeScript types from OpenAPI specifications.

```typescript
// Using openapi-typescript
// npm install openapi-typescript

// Generate types
// npx openapi-typescript https://api.example.com/swagger.json -o api.schema.ts

// Use generated types
import { paths, components } from './api.schema';

type UserListResponse = paths['/users']['get']['responses']['200']['content']['application/json'];
type CreateUserRequest = paths['/users']['post']['requestBody']['content']['application/json'];
type UserDto = components['schemas']['User'];
```

---

### Type-Safe OpenAPI Client

```typescript
import createClient from 'openapi-fetch';
import { paths } from './api.schema';

const client = createClient<paths>({ baseUrl: 'https://api.example.com' });

// Fully typed
async function getUsers() {
  const { data, error } = await client.GET('/users', {
    params: {
      query: { active: true }
    }
  });

  if (error) throw error;
  return data;
}

async function createUser(user: CreateUserRequest) {
  const { data, error } = await client.POST('/users', {
    body: user
  });

  if (error) throw error;
  return data;
}
```

---

## API Design Best Practices

1. **Separate DTOs from domain models** — Don't expose internal types
2. **Use discriminated unions** for responses — Success vs error
3. **Type all endpoints** — Ensure request/response safety
4. **Use generic patterns** — Reusable API client code
5. **Validate inputs** — Type-safe request validation
6. **Handle errors consistently** — Typed error responses
7. **Generate types from OpenAPI** — Single source of truth
8. **Use pagination types** — Consistent pagination
9. **Document with JSDoc** — For generated docs
10. **Version your APIs** — Type-safe versioning

---

## Common Patterns

### Repository Pattern

```typescript
interface ApiRepository<T, ID, C, U> {
  findAll(filters?: Record<string, unknown>): Promise<ApiResult<T[]>>;
  findById(id: ID): Promise<ApiResult<T>>;
  create(data: C): Promise<ApiResult<T>>;
  update(id: ID, data: U): Promise<ApiResult<T>>;
  delete(id: ID): Promise<ApiResult<void>>;
}

class UserRepository implements ApiRepository<UserDto, string, CreateUserDto, UpdateUserDto> {
  constructor(private client: ApiClient) {}

  async findAll(filters?: { active?: boolean }): Promise<ApiResult<UserDto[]>> {
    return this.client.get<UserDto[]>(`/users${filters ? '?active=' + filters.active : ''}`);
  }

  async findById(id: string): Promise<ApiResult<UserDto>> {
    return this.client.get<UserDto>(`/users/${id}`);
  }

  async create(data: CreateUserDto): Promise<ApiResult<UserDto>> {
    return this.client.post<UserDto, CreateUserDto>('/users', data);
  }

  async update(id: string, data: UpdateUserDto): Promise<ApiResult<UserDto>> {
    return this.client.put<UserDto, UpdateUserDto>(`/users/${id}`, data);
  }

  async delete(id: string): Promise<ApiResult<void>> {
    return this.client.delete<void>(`/users/${id}`);
  }
}
```

---

### Query Builder Pattern

```typescript
type QueryOperation<T> = {
  field: keyof T;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains';
  value: unknown;
};

class QueryBuilder<T> {
  private filters: QueryOperation<T>[] = [];

  where(field: keyof T, operator: 'eq', value: unknown): this;
  where(field: keyof T, operator: 'ne', value: unknown): this;
  where(field: keyof T, operator: 'gt' | 'lt', value: number | Date): this;
  where(field: keyof T, operator: 'in', value: unknown[]): this;
  where(field: keyof T, operator: 'contains', value: string): this;
  where(field: keyof T, operator: string, value: unknown): this {
    this.filters.push({ field, operator: operator as any, value });
    return this;
  }

  build(): string {
    return this.filters
      .map(f => `${String(f.field)}[${f.operator}]=${encodeURIComponent(String(f.value))}`)
      .join('&');
  }
}

// Usage
const query = new QueryBuilder<UserDto>()
  .where('name', 'eq', 'John')
  .where('age', 'gt', 18)
  .build();
// name[eq]=John&age[gt]=18
```
