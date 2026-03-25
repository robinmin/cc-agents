---
name: patterns
description: "Common TypeScript design patterns: factory, builder, repository, adapter, and discriminated union patterns for type-safe, maintainable code."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [typescript, design-patterns, architecture, patterns, architecture-design]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
---

# TypeScript Design Patterns Reference

Common TypeScript design patterns for type-safe, maintainable code.

## Creational Patterns

### Factory Pattern with Generics

```typescript
interface Factory<T> {
  create(config: Partial<T>): T;
}

function createFactory<T>(defaults: T): Factory<T> {
  return {
    create: (config) => ({ ...defaults, ...config })
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

const userFactory = createFactory<User>({
  id: '',
  name: '',
  email: '',
  role: 'user'
});
```

### Builder Pattern

```typescript
interface FormConfig {
  fields: FormField[];
  onSubmit?: SubmitHandler;
  validate?: boolean;
}

class FormBuilder {
  private config: FormConfig = { fields: [] };

  addField(field: FormField): this {
    this.config.fields.push(field);
    return this;
  }

  withValidation(): this {
    this.config.validate = true;
    return this;
  }

  build(): FormConfig {
    return { ...this.config };
  }
}
```

## Structural Patterns

### Adapter Pattern

```typescript
interface Target {
  request(): string;
}

class Adaptee {
  specificRequest(): string {
    return 'Adaptee behavior';
  }
}

class Adapter implements Target {
  constructor(private adaptee: Adaptee) {}

  request(): string {
    return `Adapter: (TRANSLATED) ${this.adaptee.specificRequest()}`;
  }
}
```

### Repository Pattern

```typescript
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
}

interface User {
  id: string;
  name: string;
}

class UserRepository implements Repository<User, string> {
  async findById(id: string): Promise<User | null> {
    // Database implementation
  }
}
```

## Behavioral Patterns

### Strategy Pattern

```typescript
interface SortStrategy<T> {
  sort(items: T[]): T[];
}

class QuickSort<T> implements SortStrategy<T> {
  sort(items: T[]): T[] {
    // Quick sort implementation
    return items;
  }
}

class Context<T> {
  constructor(private strategy: SortStrategy<T>) {}

  setStrategy(strategy: SortStrategy<T>): void {
    this.strategy = strategy;
  }

  doSort(items: T[]): T[] {
    return this.strategy.sort(items);
  }
}
```

## API Design Patterns

### Discriminated Unions for State

```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function render<T>(state: AsyncState<T>) {
  switch (state.status) {
    case 'idle': return 'Idle';
    case 'loading': return 'Loading...';
    case 'success': return state.data;
    case 'error': return state.error.message;
  }
}
```

### Result Type for Error Handling

```typescript
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return { success: false, error: 'Division by zero' };
  }
  return { success: true, value: a / b };
}
```

## Type-Safe Builders

```typescript
type Required<T, K extends keyof T> = T & Required<Pick<T, K>>;
type Partial<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

interface Config {
  host: string;
  port: number;
  secure: boolean;
}

type OptionalConfig = Partial<Config, 'port' | 'secure'>;
type RequiredHostConfig = Required<Config, 'host'>;
```
