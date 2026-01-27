# TypeScript Design Patterns Reference

Common TypeScript design patterns for type-safe, maintainable code.

## Table of Contents

1. [Creational Patterns](#creational-patterns)
2. [Structural Patterns](#structural-patterns)
3. [Behavioral Patterns](#behavioral-patterns)
4. [API Design Patterns](#api-design-patterns)
5. [State Management Patterns](#state-management-patterns)
6. [Error Handling Patterns](#error-handling-patterns)

---

## Creational Patterns

### Factory Pattern with Generics

Create objects with type-safe factories.

```typescript
interface Factory<T> {
  create(config: Partial<T>): T;
}

// Generic factory implementation
function createFactory<T>(defaults: T): Factory<T> {
  return {
    create: (config) => ({ ...defaults, ...config })
  };
}

// Usage
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

const admin = userFactory.create({
  id: '1',
  name: 'Admin',
  email: 'admin@example.com',
  role: 'admin'
});
```

---

### Builder Pattern

Construct complex objects step by step.

```typescript
interface FormConfig {
  fields: FormField[];
  onSubmit?: SubmitHandler;
  validate?: boolean;
  autofocus?: boolean;
}

class FormBuilder {
  private config: FormConfig = {
    fields: []
  };

  addField(field: FormField): this {
    this.config.fields.push(field);
    return this;
  }

  onSubmit(handler: SubmitHandler): this {
    this.config.onSubmit = handler;
    return this;
  }

  enableValidation(): this {
    this.config.validate = true;
    return this;
  }

  setAutofocus(enabled: boolean): this {
    this.config.autofocus = enabled;
    return this;
  }

  build(): FormConfig {
    return { ...this.config };
  }
}

// Usage
const form = new FormBuilder()
  .addField({ name: 'email', type: 'email', required: true })
  .addField({ name: 'password', type: 'password', required: true })
  .enableValidation()
  .setAutofocus(true)
  .build();
```

---

### Singleton Pattern

Ensure only one instance exists.

```typescript
class Database {
  private static instance: Database;
  private connection: Connection | null = null;

  private constructor() {
    // Private constructor
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  connect(): void {
    if (!this.connection) {
      this.connection = createConnection();
    }
  }

  query<T>(sql: string): T {
    if (!this.connection) {
      throw new Error('Not connected');
    }
    return this.connection.query<T>(sql);
  }
}

// Usage
const db = Database.getInstance();
db.connect();
```

---

### Prototype Pattern

Clone existing objects.

```typescript
interface Prototype<T> {
  clone(): T;
}

class User implements Prototype<User> {
  constructor(
    public id: string,
    public name: string,
    public email: string
  ) {}

  clone(): User {
    return new User(this.id, this.name, this.email);
  }
}

// Usage
const original = new User('1', 'John', 'john@example.com');
const clone = original.clone();
```

---

## Structural Patterns

### Decorator Pattern (TypeScript 5.0+)

Add behavior to objects dynamically.

```typescript
// Method decorator
function log(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyKey} with`, args);
    const result = originalMethod.apply(this, args);
    console.log(`${propertyKey} returned`, result);
    return result;
  };

  return descriptor;
}

class Calculator {
  @log
  add(a: number, b: number): number {
    return a + b;
  }
}

// Class decorator
function sealed<T extends { new (...args: any[]): {} }>(
  constructor: T
) {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args);
      Object.seal(this);
    }
  };
}

@sealed
class UserService {
  constructor(private db: Database) {}
}
```

---

### Adapter Pattern

Convert interface of a class into another interface.

```typescript
// Existing interface
interface LegacyApi {
  getUserById(id: number): LegacyUser;
  getAllUsers(): LegacyUser[];
}

interface LegacyUser {
  user_id: number;
  user_name: string;
  user_email: string;
}

// New interface
interface User {
  id: string;
  name: string;
  email: string;
}

// Adapter
class ApiAdapter implements UserApi {
  constructor(private legacyApi: LegacyApi) {}

  getUser(id: string): User {
    const legacyUser = this.legacyApi.getUserById(parseInt(id));
    return this.toUser(legacyUser);
  }

  getUsers(): User[] {
    return this.legacyApi.getAllUsers().map(u => this.toUser(u));
  }

  private toUser(legacy: LegacyUser): User {
    return {
      id: legacy.user_id.toString(),
      name: legacy.user_name,
      email: legacy.user_email
    };
  }
}
```

---

### Proxy Pattern

Provide placeholder for another object.

```typescript
interface ApiClient {
  get<T>(url: string): Promise<T>;
  post<T, U>(url: string, data: U): Promise<T>;
}

class CachedApiClient implements ApiClient {
  private cache = new Map<string, any>();

  constructor(private client: ApiClient) {}

  async get<T>(url: string): Promise<T> {
    if (this.cache.has(url)) {
      return this.cache.get(url) as T;
    }

    const data = await this.client.get<T>(url);
    this.cache.set(url, data);
    return data;
  }

  async post<T, U>(url: string, data: U): Promise<T> {
    const result = await this.client.post<T, U>(url, data);
    this.cache.delete(url); // Invalidate cache
    return result;
  }
}
```

---

### Composite Pattern

Compose objects into tree structures.

```typescript
interface FileSystemNode {
  name: string;
  getSize(): number;
  print(indent: number): void;
}

class File implements FileSystemNode {
  constructor(
    public name: string,
    private size: number
  ) {}

  getSize(): number {
    return this.size;
  }

  print(indent: number): void {
    console.log(`${' '.repeat(indent)}📄 ${this.name} (${this.size} bytes)`);
  }
}

class Directory implements FileSystemNode {
  private children: FileSystemNode[] = [];

  constructor(public name: string) {}

  add(child: FileSystemNode): void {
    this.children.push(child);
  }

  getSize(): number {
    return this.children.reduce((sum, child) => sum + child.getSize(), 0);
  }

  print(indent: number = 0): void {
    console.log(`${' '.repeat(indent)}📁 ${this.name}/`);
    this.children.forEach(child => child.print(indent + 2));
  }
}

// Usage
const root = new Directory('root');
root.add(new File('package.json', 500));
const src = new Directory('src');
src.add(new File('index.ts', 1000));
root.add(src);
root.print();
```

---

## Behavioral Patterns

### Observer Pattern

Define subscription mechanism.

```typescript
type EventHandler<T> = (data: T) => void;

class EventEmitter<T extends Record<string, any>> {
  private listeners = new Map<keyof T, Set<EventHandler<any>>>();

  on<K extends keyof T>(
    event: K,
    handler: EventHandler<T[K]>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off<K extends keyof T>(
    event: K,
    handler: EventHandler<T[K]>
  ): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.listeners.get(event)?.forEach(handler => handler(data));
  }
}

// Usage
interface AppEvents {
  userLoggedIn: { userId: string; timestamp: number };
  dataReceived: { data: string[] };
  errorOccurred: { error: Error };
}

const emitter = new EventEmitter<AppEvents>();

emitter.on('userLoggedIn', ({ userId, timestamp }) => {
  console.log(`User ${userId} logged in at ${timestamp}`);
});

emitter.emit('userLoggedIn', { userId: '123', timestamp: Date.now() });
```

---

### Strategy Pattern

Define family of algorithms.

```typescript
interface SortStrategy<T> {
  sort(data: T[]): T[];
}

class QuickSort implements SortStrategy<number> {
  sort(data: number[]): number[] {
    // Quick sort implementation
    return data; // Simplified
  }
}

class MergeSort implements SortStrategy<number> {
  sort(data: number[]): number[] {
    // Merge sort implementation
    return data; // Simplified
  }
}

class Sorter<T> {
  constructor(private strategy: SortStrategy<T>) {}

  setStrategy(strategy: SortStrategy<T>): void {
    this.strategy = strategy;
  }

  sort(data: T[]): T[] {
    return this.strategy.sort(data);
  }
}

// Usage
const sorter = new Sorter(new QuickSort());
sorter.sort([5, 2, 8, 1, 9]);
sorter.setStrategy(new MergeSort());
sorter.sort([5, 2, 8, 1, 9]);
```

---

### Command Pattern

Encapsulate requests as objects.

```typescript
interface Command {
  execute(): void;
  undo(): void;
}

class AddTextCommand implements Command {
  constructor(
    private editor: TextEditor,
    private text: string
  ) {}

  execute(): void {
    this.editor.addText(this.text);
  }

  undo(): void {
    this.editor.removeText(this.text.length);
  }
}

class TextEditor {
  private history: Command[] = [];
  private content = '';

  addText(text: string): void {
    this.content += text;
  }

  removeText(length: number): void {
    this.content = this.content.slice(0, -length);
  }

  executeCommand(command: Command): void {
    command.execute();
    this.history.push(command);
  }

  undo(): void {
    const command = this.history.pop();
    command?.undo();
  }
}

// Usage
const editor = new TextEditor();
editor.executeCommand(new AddTextCommand(editor, 'Hello'));
editor.executeCommand(new AddTextCommand(editor, ' World'));
editor.undo(); // Removes ' World'
```

---

## API Design Patterns

### Repository Pattern

Abstract data access.

```typescript
interface Repository<T, K> {
  findById(id: K): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: K, data: Partial<T>): Promise<T>;
  delete(id: K): Promise<void>;
}

class UserRepository implements Repository<User, string> {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    return this.db.queryOne<User>('SELECT * FROM users WHERE id = ?', [id]);
  }

  async findAll(): Promise<User[]> {
    return this.db.query<User>('SELECT * FROM users');
  }

  async create(data: Omit<User, 'id'>): Promise<User> {
    const id = await this.db.insert('INSERT INTO users SET ?', [data]);
    return { id, ...data };
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.db.update('UPDATE users SET ? WHERE id = ?', [data, id]);
    return this.findById(id)!;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete('DELETE FROM users WHERE id = ?', [id]);
  }
}
```

---

### Service Layer Pattern

Separate business logic from data access.

```typescript
class UserService {
  constructor(
    private userRepo: Repository<User, string>,
    private emailService: EmailService
  ) {}

  async registerUser(data: RegisterDto): Promise<User> {
    // Business logic
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await hash(data.password);
    const user = await this.userRepo.create({
      ...data,
      password: hashedPassword
    });

    await this.emailService.sendWelcomeEmail(user.email);
    return user;
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    return this.userRepo.update(id, data);
  }
}
```

---

## State Management Patterns

### State Machine with Discriminated Unions

```typescript
type State =
  | { status: 'idle' }
  | { status: 'loading'; startTime: number }
  | { status: 'success'; data: string }
  | { status: 'error'; error: Error };

function render(state: State): string {
  switch (state.status) {
    case 'idle':
      return 'Start loading...';
    case 'loading':
      return `Loading... (${Date.now() - state.startTime}ms)`;
    case 'success':
      return `Data: ${state.data}`;
    case 'error':
      return `Error: ${state.error.message}`;
    default:
      const _exhaustive: never = state;
      return _exhaustive;
  }
}
```

---

### Redux-like Store

```typescript
type Action<T, P = void> = P extends void
  ? { type: T }
  : { type: T; payload: P };

interface Store<S, A> {
  getState(): S;
  dispatch(action: A): void;
  subscribe(listener: () => void): () => void;
}

function createStore<S, A extends { type: string }>(
  reducer: (state: S, action: A) => S,
  initialState: S
): Store<S, A> {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    dispatch: (action) => {
      state = reducer(state, action);
      listeners.forEach(l => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

// Usage
type CounterAction =
  | Action<'INCREMENT'>
  | Action<'DECREMENT'>
  | Action<'SET', number>;

type CounterState = { count: number };

function counterReducer(
  state: CounterState,
  action: CounterAction
): CounterState {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 };
    case 'DECREMENT':
      return { count: state.count - 1 };
    case 'SET':
      return { count: action.payload };
    default:
      return state;
  }
}

const store = createStore(counterReducer, { count: 0 });
```

---

## Error Handling Patterns

### Result Type (Either Pattern)

```typescript
type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

// Helper functions
function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

// Usage
async function fetchUser(id: string): Promise<Result<User, Error>> {
  try {
    const user = await db.findById(id);
    if (!user) {
      return failure(new Error('User not found'));
    }
    return success(user);
  } catch (e) {
    return failure(e as Error);
  }
}

// Handling results
const result = await fetchUser('123');
if (result.success) {
  console.log(result.data.name);
} else {
  console.error(result.error.message);
}
```

---

### Async Result with Chaining

```typescript
class AsyncResult<T, E = Error> {
  private constructor(
    private promise: Promise<Result<T, E>>
  ) {}

  static async from<T, E>(
    promise: Promise<T>
  ): Promise<AsyncResult<T, E>> {
    try {
      const data = await promise;
      return new AsyncResult(Promise.resolve(success(data)));
    } catch (e) {
      return new AsyncResult(Promise.resolve(failure(e as E)));
    }
  }

  async map<U>(fn: (data: T) => U): Promise<AsyncResult<U, E>> {
    const result = await this.promise;
    if (result.success) {
      return new AsyncResult(Promise.resolve(success(fn(result.data))));
    }
    return new AsyncResult(this.promise as Promise<Result<never, E>>);
  }

  async flatMap<U>(fn: (data: T) => AsyncResult<U, E>): Promise<AsyncResult<U, E>> {
    const result = await this.promise;
    if (result.success) {
      return fn(result.data);
    }
    return new AsyncResult(this.promise as Promise<Result<never, E>>);
  }

  async get(): Promise<Result<T, E>> {
    return this.promise;
  }
}

// Usage
const result = await AsyncResult.from(fetchUser('123'))
  .map(user => user.email)
  .flatMap(email => AsyncResult.from(sendEmail(email)));
```

---

## Pattern Best Practices

1. **Use discriminated unions** for state machines and error handling
2. **Prefer composition over inheritance** — More flexible
3. **Use generics** for reusable patterns
4. **Type narrowing** — Use type guards for safer code
5. **Immutable state** — Use readonly for immutability
6. **Dependency injection** — Pass dependencies as parameters
7. **Single responsibility** — Each pattern has one purpose
8. **Factory methods** — For complex object creation
9. **Builder pattern** — For complex configuration
10. **Observer pattern** — For event-driven architecture
