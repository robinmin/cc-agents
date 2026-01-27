# TypeScript 5.x Features Guide

Complete guide to TypeScript 5.x features including decorators, const type parameters, satisfies operator, using declarations, and more.

## Table of Contents

1. [TypeScript 5.0 Features](#typescript-50-features)
2. [TypeScript 5.1 Features](#typescript-51-features)
3. [TypeScript 5.2 Features](#typescript-52-features)
4. [TypeScript 5.3 Features](#typescript-53-features)
5. [TypeScript 5.4 Features](#typescript-54-features)
5. [TypeScript 5.5 Features](#typescript-55-features)
6. [Migration Guide](#migration-guide)

---

## TypeScript 5.0 Features

### Decorators (Standard)

TypeScript 5.0 implements the upcoming ECMAScript standard for decorators.

**Note:** Must enable `experimentalDecorators: false` and set `target: ES2022` or higher.

---

#### Class Decorators

```typescript
function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

@sealed
class MyClass {
  // ...
}
```

---

#### Method Decorators

```typescript
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
```

---

#### Accessor Decorators

```typescript
function validate(prototype: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.get;
  descriptor.get = function () {
    const value = original?.call(this);
    if (typeof value !== 'string') {
      throw new Error('Invalid value');
    }
    return value;
  };
}

class User {
  private _name: string = '';

  @validate
  get name(): string {
    return this._name;
  }
  set name(value: string) {
    this._name = value;
  }
}
```

---

#### Field Decorators

```typescript
function lazy(target: any, key: string) {
  let value: any;
  const getter = () => {
    if (value === undefined) {
      value = computeExpensiveValue();
    }
    return value;
  };
  Object.defineProperty(target, key, { get: getter, enumerable: true });
}

class MyClass {
  @lazy
  expensive: string;
}
```

---

#### Decorator Factories

```typescript
function debounce(ms: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;
    let timeout: NodeJS.Timeout;
    descriptor.value = function (...args: any[]) {
      clearTimeout(timeout);
      timeout = setTimeout(() => original.apply(this, args), ms);
    };
    return descriptor;
  };
}

class SearchBox {
  @debounce(300)
  search(query: string) {
    // Expensive search operation
  }
}
```

---

### Const Type Parameters

Const type parameters provide more precise type inference for literal types.

```typescript
// Before TypeScript 5.0
function createTuple<T>(...ts: T[]): T[] {
  return ts;
}

const tuple = createTuple('a', 'b', 'c');
// Type is string[]

// With const type parameters (TypeScript 5.0+)
function createTuple<const T extends readonly unknown[]>(...ts: T): T {
  return ts;
}

const tuple = createTuple('a', 'b', 'c');
// Type is readonly ["a", "b", "c"]

// Works with objects
function createConfig<T extends Record<string, unknown>>(config: T): T {
  return config;
}

const config = createConfig({
  port: 3000,
  host: 'localhost'
});
// Type is { port: number; host: string; }

// With const modifier
function createConfig<const T extends Record<string, unknown>>(config: T): T {
  return config;
}

const config = createConfig({
  port: 3000,
  host: 'localhost'
});
// Type is { port: 3000; host: "localhost"; }
```

---

### extends Array for Enums

Enums can now extend from `Array`.

```typescript
enum Enum extends Array<string> {
  A = 'a',
  B = 'b'
}
```

---

### All Enums Are Union Enums

All enums are now treated as union enums, enabling better type narrowing.

```typescript
enum Color {
  Red,
  Green,
  Blue
}

function getColor(c: Color): string {
  switch (c) {
    case Color.Red:
      return 'red';
    case Color.Green:
      return 'green';
    case Color.Blue:
      return 'blue';
  }
}
```

---

### --moduleResolution bundler

New module resolution strategy for bundlers.

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

**Benefits:**
- Supports package.json `exports`
- Supports `imports` field
- Better support for bundlers like Vite, webpack

---

### Resolution Customization Flags

New flags for fine-grained control over module resolution:

```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "resolvePackageJsonExports": true,
    "resolvePackageJsonImports": true,
    "allowArbitraryExtensions": true,
    "customConditions": ["worker"]
  }
}
```

---

### --verbatimModuleSyntax

Simpler way to control module output.

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true
  }
}
```

**Effect:** Preserves import/export syntax, no transformation.

---

## TypeScript 5.1 Features

### Improved Type Narrowing for Functions

Better type narrowing when functions are called.

```typescript
function foo(value: unknown) {
  if (typeof value === 'string') {
    value.toUpperCase(); // string
  } else if (typeof value === 'number') {
    value.toFixed(2); // number
  }
}
```

---

### Accessor Decorators

Support for `accessor` keyword with decorators.

```typescript
class MyClass {
  @logged
  accessor name: string = 'default';
}

function logged(
  target: any,
  key: string,
  descriptor: PropertyDescriptor
) {
  // Decorator logic
}
```

---

### Type Syntax in JSX

Support for type syntax in JSX children.

```tsx
function Component() {
  return (
    <div>
      {items.map((item: Item) => (
        <span key={item.id}>{item.name}</span>
      ))}
    </div>
  );
}
```

---

### JSDoc @satisfies

Support for `@satisfies` in JSDoc.

```js
/**
 * @satisfies {ServerConfig}
 */
const config = {
  port: 3000,
  host: 'localhost'
};
```

---

### @overload Support in JSDoc

Support for function overloads in JSDoc.

```js
/**
 * @param {string} name
 * @returns {string}
 * @overload
 * @param {number} id
 * @returns {User}
 */
function get(name: string): string;
function get(id: number): User;
```

---

## TypeScript 5.2 Features

### Using Declarations

Resource management using `using` and `await using`.

**Note:** Requires `target: ES2022` or higher and `lib: ["ES2022"]` or includes "disposable".

```typescript
// Dispose pattern
class DisposableResource implements Disposable {
  [Symbol.dispose]() {
    console.log('Disposing resource');
  }
}

{
  using resource = new DisposableResource();
  // Use resource
} // Automatically disposed here

// Async dispose pattern
class AsyncResource implements AsyncDisposable {
  async [Symbol.asyncDispose]() {
    await cleanup();
  }
}

{
  await using resource = new AsyncResource();
  // Use resource
} // Automatically disposed here (async)
```

**Use cases:** File handles, database connections, HTTP streams

---

### Decorator Metadata

Support for decorator metadata.

```typescript
function logged(target: any, key: string) {
  const metadata = Reflect.getMetadata('design:paramtypes', target, key);
  console.log(metadata); // Parameter types
}
```

---

## TypeScript 5.3 Features

### Import Attributes

Support for module import attributes.

```typescript
import data from './data.json' with { type: 'json' };

import worker from './worker.js' with { type: 'worker' };
```

---

### Resolution Flags for Attributes

```json
{
  "compilerOptions": {
    "resolveJsonModule": true,
    "resolvePackageJsonExports": true,
    "resolvePackageJsonImports": true,
    "allowImportingTsExtensions": true
  }
}
```

---

### switch (true) Narrowing

Better type narrowing in `switch (true)` statements.

```typescript
function getValue(value: string | number | boolean) {
  switch (true) {
    case typeof value === 'string':
      value.toUpperCase(); // string
      break;
    case typeof value === 'number':
      value.toFixed(2); // number
      break;
    default:
      value.toString(); // boolean
  }
}
```

---

## TypeScript 5.4 Features

### NoInfer<T>

Prevent inference in specific type positions.

```typescript
function createPair<T extends string>(first: T, second: NoInfer<T>): [T, T] {
  return [first, second];
}

// T is inferred as 'hello' from first parameter
const pair = createPair('hello', 'hello'); // OK
const pair2 = createPair<string>('hello', 'world'); // OK
```

---

### Preserve Narrowing in Closures

Better type narrowing in closures.

```typescript
function foo(value: unknown) {
  if (typeof value === 'string') {
    const process = () => {
      value.toUpperCase(); // string - narrowing preserved
    };
    process();
  }
}
```

---

## TypeScript 5.5 Features (Upcoming)

### Regular Expression Syntax Checking

TypeScript 5.5 will check regular expression syntax.

```typescript
const regex = /[a-z/; // Error: Unterminated character class
```

---

### Predicated Type Functions

Better support for type predicates in functions.

```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}
```

---

## Migration Guide

### Migrating to TypeScript 5.0

**1. Update dependencies:**

```bash
npm install typescript@5.0
```

**2. Update tsconfig.json:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "experimentalDecorators": false
  }
}
```

**3. Update decorators:**

Before (legacy decorators):
```typescript
function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

@sealed
class MyClass {}
```

After (standard decorators - 5.0):
```typescript
function sealed(
  target: any,
  context: ClassDecoratorContext
) {
  // Standard decorator implementation
}

@sealed
class MyClass {}
```

**4. Update const type parameters:**

Before:
```typescript
function createTuple<T extends readonly unknown[]>(...ts: T): T {
  return ts;
}
```

After (infer literal types):
```typescript
function createTuple<const T extends readonly unknown[]>(...ts: T): T {
  return ts;
}
```

---

### Breaking Changes

**1. Decorator changes:**
- Legacy decorators: `experimentalDecorators: true`
- Standard decorators: `experimentalDecorators: false`, `target: ES2022+`

**2. Enum changes:**
- All enums are now union enums
- May cause issues with numeric enum comparisons

**3. Module resolution:**
- `node` resolution replaced by `node10` and `nodenext`
- Use `bundler` for bundler-based projects

**4. lib changes:**
- `lib` options now more specific
- May need to add `DOM.Iterable` explicitly

---

## Best Practices

### Using Decorators

1. **Use standard decorators** (TypeScript 5.0+)
2. **Set target to ES2022 or higher**
3. **Disable experimentalDecorators**
4. **Use decorator factories for parameters**

```typescript
function debounce(ms: number) {
  return function (
    target: any,
    key: string,
    descriptor: PropertyDescriptor
  ) {
    // Implementation
  };
}
```

### Using Const Type Parameters

1. **Use for literal inference**
2. **Add `const` modifier to type parameters**
3. **Use `readonly unknown[]` for tuples**

```typescript
function create<const T extends readonly unknown[]>(...ts: T): T {
  return ts;
}
```

### Using Module Resolution

1. **Frontend/bundler:** `moduleResolution: "bundler"`
2. **Node.js ESM:** `moduleResolution: "nodenext"`
3. **Node.js CJS:** `moduleResolution: "node10"` or just `"node"`

### Using Declarations

1. **Use `using` for sync resources**
2. **Use `await using` for async resources**
3. **Implement `Disposable` or `AsyncDisposable`**

```typescript
class Database implements Disposable {
  [Symbol.dispose]() {
    this.connection.close();
  }
}
```

---

## TypeScript 5.x Quick Reference

| Feature | Version | Key Benefit |
|---------|---------|-------------|
| Standard decorators | 5.0 | ECMAScript spec compliance |
| Const type parameters | 5.0 | Better literal type inference |
| `moduleResolution: bundler` | 5.0 | Better bundler support |
| `verbatimModuleSyntax` | 5.0 | Simpler module output |
| Using declarations | 5.2 | Resource management |
| Import attributes | 5.3 | Type-safe imports |
| `NoInfer<T>` | 5.4 | Control type inference |
| RegExp syntax checking | 5.5 | Catch regex errors |
