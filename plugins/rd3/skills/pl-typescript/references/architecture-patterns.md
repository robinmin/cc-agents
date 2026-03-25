---
name: architecture-patterns
description: "TypeScript architecture patterns: layered, hexagonal, clean architecture, event-driven, CQRS, microservices, and dependency injection."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [typescript, architecture, layered, hexagonal, clean-architecture, cqrs, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions:
    - knowledge-only
see_also:
---

# Architecture Patterns for TypeScript

TypeScript works well with various architecture patterns. This reference covers layered, hexagonal, clean architecture, and event-driven patterns.

## Layered Architecture

### Structure

```
src/
├── presentation/     # UI layer (components, controllers)
├── application/      # Application logic (use cases, services)
├── domain/          # Business logic (entities, value objects)
└── infrastructure/  # External concerns (database, APIs)
```

### TypeScript Implementation

```typescript
// Domain Layer
interface User {
  id: string;
  name: string;
  email: string;
}

interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

// Application Layer
class UserService {
  constructor(private repository: UserRepository) {}

  async createUser(data: CreateUserDto): Promise<User> {
    const user: User = { id: generateId(), ...data };
    return this.repository.save(user);
  }
}

// Infrastructure Layer
class PostgresUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> { /* DB query */ }
  async save(user: User): Promise<User> { /* DB insert */ }
}
```

## Hexagonal Architecture (Ports and Adapters)

### TypeScript Implementation

```typescript
// Domain Port (Interface)
interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

// Domain Service
class UserDomainService {
  constructor(private userRepo: UserRepositoryPort) {}

  async createUser(data: { name: string; email: string }): Promise<CreateUserResult> {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      return { success: false, error: 'Email already exists' };
    }
    const user: User = { id: generateId(), ...data };
    const saved = await this.userRepo.save(user);
    return { success: true, user: saved };
  }
}

// Infrastructure Adapter (Secondary)
class PostgresUserAdapter implements UserRepositoryPort {
  async findById(id: string): Promise<User | null> { /* DB impl */ }
  async save(user: User): Promise<User> { /* DB impl */ }
}
```

## Clean Architecture

### Structure

```
src/
├── entities/        # Core business rules
├── use-cases/       # Application-specific rules
├── interfaces/      # Framework interfaces
└── infrastructure/ # Framework implementations
```

## Event-Driven Architecture

### Type-Safe Events

```typescript
type BaseEvent = {
  id: string;
  timestamp: number;
  type: string;
};

type UserEvent = BaseEvent & {
  entityType: 'user';
  entityId: string;
} & (
  | { eventType: 'created'; data: { name: string; email: string } }
  | { eventType: 'updated'; data: { name?: string; email?: string } }
  | { eventType: 'deleted'; data: {} }
);

class EventBus<TEvent extends BaseEvent> {
  private handlers: Map<string, Set<(event: TEvent) => void>> = new Map();

  on(eventType: string, handler: (event: TEvent) => void): void {
    const existing = this.handlers.get(eventType) || new Set();
    existing.add(handler);
    this.handlers.set(eventType, existing);
  }

  emit(event: TEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }
}
```

## CQRS (Command Query Responsibility Segregation)

```typescript
// Commands (Write)
type Command<TResult = void> = {
  execute(): Promise<TResult>;
};

type CreateUserCommand = Command<{ userId: string }> & {
  data: { name: string; email: string };
};

// Queries (Read)
type Query<TResult> = {
  execute(): Promise<TResult>;
};

class GetUserQuery implements Query<User | null> {
  constructor(
    private userId: string,
    private repository: UserRepository
  ) {}

  async execute(): Promise<User | null> {
    return this.repository.findById(this.userId);
  }
}
```

## Dependency Injection Patterns

### Constructor Injection

```typescript
interface Container {
  get<T>(token: string): T;
  register<T>(token: string, factory: () => T): void;
}

class SimpleContainer implements Container {
  private services: Map<string, any> = new Map();

  register<T>(token: string, factory: () => T): void {
    this.services.set(token, factory);
  }

  get<T>(token: string): T {
    const factory = this.services.get(token);
    if (!factory) throw new Error(`Service not found: ${token}`);
    return factory();
  }
}
```

## Best Practices

1. Use interfaces for ports — Define contracts in domain layer
2. Keep domain layer pure — No framework dependencies
3. Type events exhaustively — Use discriminated unions
4. Inject dependencies — Enable testing and flexibility
5. Separate read/write models — Consider CQRS for complex domains
6. Use generics for reuse — Generic repository/service patterns
