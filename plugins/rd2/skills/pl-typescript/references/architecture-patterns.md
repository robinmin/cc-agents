# Architecture Patterns for TypeScript

## Overview

TypeScript works well with various architecture patterns. This reference covers layered, hexagonal, clean architecture, and event-driven patterns with TypeScript-specific implementations.

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

type UserRole = 'admin' | 'user' | 'guest';

interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

// Application Layer
class UserService {
  constructor(private repository: UserRepository) {}

  async createUser(data: CreateUserDto): Promise<User> {
    // Business logic
    const user: User = {
      id: generateId(),
      ...data
    };
    return this.repository.save(user);
  }
}

// Infrastructure Layer
class PostgresUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    // Database query
  }

  async save(user: User): Promise<User> {
    // Database insert
  }
}

// Presentation Layer (Express controller)
class UserController {
  constructor(private service: UserService) {}

  async create(req: Request, res: Response): Promise<void> {
    const user = await this.service.createUser(req.body);
    res.json(user);
  }
}
```

## Hexagonal Architecture (Ports and Adapters)

### Structure

```
src/
├── domain/
│   ├── ports/        # Interfaces (ports)
│   └── services/     # Business logic
├── infrastructure/
│   ├── primary/      # Driving adapters (HTTP, CLI)
│   └── secondary/    # Driven adapters (DB, APIs)
```

### TypeScript Implementation

```typescript
// Domain Port (Interface)
interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

// Domain Service
type CreateUserResult =
  | { success: true; user: User }
  | { success: false; error: string };

class UserDomainService {
  constructor(
    private userRepo: UserRepositoryPort
  ) {}

  async createUser(data: {
    name: string;
    email: string;
  }): Promise<CreateUserResult> {
    // Business validation
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      return { success: false, error: 'Email already exists' };
    }

    const user: User = {
      id: generateId(),
      ...data
    };

    const saved = await this.userRepo.save(user);
    return { success: true, user: saved };
  }
}

// Infrastructure Adapter (Secondary)
class PostgresUserAdapter implements UserRepositoryPort {
  async findById(id: string): Promise<User | null> {
    // DB implementation
  }

  async save(user: User): Promise<User> {
    // DB implementation
  }
}

// Infrastructure Adapter (Primary)
class HttpUserController {
  constructor(private user service: UserDomainService) {}

  async create(req: Request, res: Response): Promise<void> {
    const result = await this.userService.createUser(req.body);

    if (result.success) {
      res.status(201).json(result.user);
    } else {
      res.status(400).json({ error: result.error });
    }
  }
}
```

## Clean Architecture

### Structure

```
src/
├── entities/        # Core business rules
├── use-cases/      # Application-specific rules
├── interfaces/     # Framework interfaces
└── infrastructure/ # Framework implementations
```

### TypeScript Implementation

```typescript
// Entities (Core)
type Money = {
  amount: number;
  currency: string;
};

interface AccountEntity {
  id: string;
  balance: Money;
  withdraw(amount: Money): AccountEntity;
  deposit(amount: Money): AccountEntity;
}

// Use Cases (Application)
interface AccountRepository {
  findById(id: string): Promise<AccountEntity | null>;
  save(account: AccountEntity): Promise<void>;
}

interface TransferResult {
  success: boolean;
  fromAccount?: AccountEntity;
  toAccount?: AccountEntity;
  error?: string;
}

class TransferUseCase {
  constructor(private repo: AccountRepository) {}

  async execute(
    fromId: string,
    toId: string,
    amount: Money
  ): Promise<TransferResult> {
    const fromAccount = await this.repo.findById(fromId);
    const toAccount = await this.repo.findById(toId);

    if (!fromAccount || !toAccount) {
      return { success: false, error: 'Account not found' };
    }

    // Business logic
    const updatedFrom = fromAccount.withdraw(amount);
    const updatedTo = toAccount.deposit(amount);

    await this.repo.save(updatedFrom);
    await this.repo.save(updatedTo);

    return {
      success: true,
      fromAccount: updatedFrom,
      toAccount: updatedTo
    };
  }
}

// Infrastructure (Framework)
class PostgresAccountRepository implements AccountRepository {
  async findById(id: string): Promise<AccountEntity | null> {
    // DB implementation
  }

  async save(account: AccountEntity): Promise<void> {
    // DB implementation
  }
}
```

## Event-Driven Architecture

### Type-Safe Events

```typescript
// Event Types
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

// Event Bus
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

// Usage
const eventBus = new EventBus<UserEvent>();

eventBus.on('user.created', (event) => {
  // event is typed as UserEvent with eventType: 'created'
  console.log('User created:', event.data.name);
});
```

### CQRS (Command Query Responsibility Segregation)

```typescript
// Commands (Write)
type Command<TResult = void> = {
  execute(): Promise<TResult>;
}

type CreateUserCommand = Command<{
  userId: string;
}> & {
  data: { name: string; email: string };
};

class CreateUserCommandImpl implements CreateUserCommand {
  constructor(
    private data: { name: string; email: string },
    private repository: UserRepository
  ) {}

  async execute(): Promise<{ userId: string }> {
    const user = await this.repository.save({
      id: generateId(),
      ...this.data
    });
    return { userId: user.id };
  }
}

// Queries (Read)
type Query<TResult> = {
  execute(): Promise<TResult>;
}

class GetUserQuery implements Query<User | null> {
  constructor(
    private userId: string,
    private repository: UserRepository
  ) {}

  async execute(): Promise<User | null> {
    return this.repository.findById(this.userId);
  }
}

// Command/Query Handlers
class CommandBus {
  async execute<T>(command: Command<T>): Promise<T> {
    return command.execute();
  }
}

class QueryBus {
  async execute<T>(query: Query<T>): Promise<T> {
    return query.execute();
  }
}
```

## Microservices Patterns

### Service Communication

```typescript
// Service Interface
interface UserServiceClient {
  getUser(id: string): Promise<User>;
  createUser(data: CreateUserDto): Promise<User>;
}

// gRPC/HTTP Implementation
class HttpUserServiceClient implements UserServiceClient {
  constructor(private baseUrl: string) {}

  async getUser(id: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users/${id}`);
    return response.json();
  }

  async createUser(data: CreateUserDto): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  }
}
```

### API Gateway Pattern

```typescript
type RouteHandler = (req: Request) => Promise<Response>;

class ApiGateway {
  private routes: Map<string, RouteHandler> = new Map();

  register(path: string, handler: RouteHandler): void {
    this.routes.set(path, handler);
  }

  async handle(req: Request): Promise<Response> {
    const path = new URL(req.url).pathname;

    for (const [route, handler] of this.routes) {
      if (path.startsWith(route)) {
        return handler(req);
      }
    }

    return new Response('Not found', { status: 404 });
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
    if (!factory) {
      throw new Error(`Service not found: ${token}`);
    }
    return factory();
  }
}

// Usage
const container = new SimpleContainer();

container.register('UserRepository', () => {
  return new PostgresUserRepository();
});

container.register('UserService', () => {
  return new UserService(container.get<UserRepository>('UserRepository'));
});
```

## Best Practices

1. **Use interfaces for ports** - Define contracts in domain layer
2. **Keep domain layer pure** - No framework dependencies
3. **Type events exhaustively** - Use discriminated unions
4. **Inject dependencies** - Enable testing and flexibility
5. **Separate read/write models** - Consider CQRS for complex domains
6. **Use generics for reuse** - Generic repository/service patterns

## Related References

- `type-system.md` - Generics for repositories and services
- `api-design.md` - API contracts and types
- `patterns.md` - Common TypeScript patterns
