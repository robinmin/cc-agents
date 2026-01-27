/**
 * TypeScript Generics Examples
 *
 * Examples demonstrating generic types, constraints, and patterns.
 */

// ============================================================================
// Basic Generics
// ============================================================================

function identity<T>(arg: T): T {
  return arg;
}

// Demonstrate basic identity function
const num: number = identity(42); // Type: number
const str: string = identity('hello'); // Type: string

// Multiple type parameters
function pair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}

const p: [number, string] = pair(1, 'hello'); // Type: [number, string]

// Default type parameters
function wrap<T = string>(value: T): Array<T> {
  return [value];
}

// Example usage with default type parameter
const wrappedValue1 = wrap(42); // Type: number[]
const wrappedValue2 = wrap('hello'); // Type: string[]
// For default type, provide a value:
const wrappedValue3 = wrap<string>(''); // Type: string[]

// Demonstrate usage
console.log('wrappedValue1:', wrappedValue1); // [42]
console.log('wrappedValue2:', wrappedValue2); // ['hello']
console.log('wrappedValue3:', wrappedValue3); // ['']

// ============================================================================
// Generic Constraints
// ============================================================================

interface WithLength {
  length: number;
}

function logLength<T extends WithLength>(arg: T): number {
  return arg.length;
}

logLength('hello'); // OK: string has length
logLength([1, 2, 3]); // OK: array has length
logLength({ length: 10 }); // OK
// logLength(42); // Error: number has no length property

// Using keyof for property access
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: 'John', age: 30 };
// Access user property with type safety
const nameValue: string = getProperty(user, 'name'); // Type: string
console.log('User name:', nameValue); // 'John'
// const invalid = getProperty(user, 'invalid'); // Error: 'invalid' is not a key of user

// ============================================================================
// Generic Classes
// ============================================================================

class Repository<T> {
  private items: T[] = [];

  add(item: T): void {
    this.items.push(item);
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return this.items.find(predicate);
  }

  findAll(): ReadonlyArray<T> {
    return this.items;
  }

  remove(predicate: (item: T) => boolean): void {
    this.items = this.items.filter(item => !predicate(item));
  }
}

interface User {
  id: string;
  name: string;
  email: string;
}

const userRepo = new Repository<User>();
userRepo.add({ id: '1', name: 'John', email: 'john@example.com' });
userRepo.add({ id: '2', name: 'Jane', email: 'jane@example.com' });

// Find and use a user
const foundUser: User | undefined = userRepo.find(u => u.name === 'John'); // Type: User | undefined
if (foundUser) {
  console.log(`Found user: ${foundUser.name}`);
}
const allUsers = userRepo.findAll(); // Type: ReadonlyArray<User>
console.log('Total users:', allUsers.length); // 2

// ============================================================================
// Generic Utilities
// ============================================================================

// Deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

interface Config {
  database: {
    host: string;
    port: number;
  };
  server: {
    port: number;
  };
}

const readonlyConfig: DeepReadonly<Config> = {
  database: { host: 'localhost', port: 5432 },
  server: { port: 3000 }
};
// readonlyConfig.database.host = 'example.com'; // Error: Cannot assign to 'host'

// Deep partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

function updateConfig(config: Config, updates: DeepPartial<Config>): Config {
  return {
    database: { ...config.database, ...updates.database },
    server: { ...config.server, ...updates.server }
  };
}

const updatedConfig = updateConfig(readonlyConfig, {
  database: { port: 3306 }
});
console.log('Updated port:', updatedConfig.database.port); // 3306

// ============================================================================
// Conditional Types
// ============================================================================

// Unwrap promise
type Unpromise<T> = T extends Promise<infer U> ? U : T;

async function fetchData(): Promise<number> {
  return 42;
}

// Unpromise extracts the resolved type
type DataType = Unpromise<ReturnType<typeof fetchData>>; // Type: number
const dataValue: DataType = 42; // Example usage
console.log('Data type value:', dataValue); // 42

// Extract function return type
type Return<T> = T extends (...args: any[]) => infer R ? R : never;

function getString(): string {
  return 'hello';
}

// Return extracts function return type
type StringReturn = Return<typeof getString>; // Type: string
const stringValue: StringReturn = 'hello'; // Example usage
console.log('String return value:', stringValue); // 'hello'

// ============================================================================
// Generic Factory Pattern
// ============================================================================

interface Factory<T> {
  create(config: Partial<T>): T;
}

function createFactory<T>(defaults: T): Factory<T> {
  return {
    create: (config) => ({ ...defaults, ...config })
  };
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

const productFactory = createFactory<Product>({
  id: '',
  name: '',
  price: 0,
  category: 'general'
});

const laptop = productFactory.create({
  id: '1',
  name: 'Laptop',
  price: 999.99,
  category: 'electronics'
});
console.log('Product:', laptop.name, '-', laptop.price); // 'Laptop - 999.99'

// ============================================================================
// Generic Event Emitter
// ============================================================================

type EventHandler<T> = (data: T) => void;

class EventEmitter<T extends Record<string, any>> {
  private listeners = new Map<keyof T, Set<EventHandler<any>>>();

  on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off<K extends keyof T>(event: K, handler: EventHandler<T[K]>): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.listeners.get(event)?.forEach(handler => handler(data));
  }
}

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

// ============================================================================
// Generic Result Type
// ============================================================================

type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

function success<T>(data: T): Result<T> {
  return { success: true, data };
}

function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) {
    return failure(new Error('Division by zero'));
  }
  return success(a / b);
}

const result1 = divide(10, 2);
if (result1.success) {
  console.log(result1.data); // Type: number
}

const result2 = divide(10, 0);
if (!result2.success) {
  const error = result2 as Extract<Result<number, Error>, { success: false }>;
  console.error(error.error); // Type: Error
}

// ============================================================================
// Generic Builder Pattern
// ============================================================================

class FormBuilder<T> {
  private config: Partial<T> = {};

  set<K extends keyof T>(key: K, value: T[K]): this {
    this.config[key] = value;
    return this;
  }

  build(): T {
    return this.config as T;
  }
}

interface FormConfig {
  method: 'GET' | 'POST' | 'PUT';
  action: string;
  enctype: string;
  autocomplete: boolean;
}

const form = new FormBuilder<FormConfig>()
  .set('method', 'POST')
  .set('action', '/submit')
  .set('enctype', 'multipart/form-data')
  .set('autocomplete', true)
  .build();

console.log('Form config:', form.method, form.action); // 'POST /submit'

export {
  identity,
  pair,
  wrap,
  logLength,
  getProperty,
  Repository,
  DeepReadonly,
  DeepPartial,
  updateConfig,
  Unpromise,
  Return,
  createFactory,
  EventEmitter,
  Result,
  success,
  failure,
  divide,
  FormBuilder
};
