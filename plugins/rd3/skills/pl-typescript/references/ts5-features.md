---
name: ts5-features
description: "TypeScript 5.x features: standard decorators, const type parameters, satisfies operator, using declarations, import attributes, and migration guide."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [typescript, typescript-5, decorators, features, architecture-design]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
---

# TypeScript 5.x Features Guide

Complete guide to TypeScript 5.x features including decorators, const type parameters, satisfies operator, using declarations, and more.

## TypeScript 5.0 Features

### Standard Decorators

TypeScript 5.0 implements the ECMAScript standard for decorators.

**Note:** Standard decorators do not require `experimentalDecorators`. Keep that flag only for legacy decorators. Use a modern target such as `ES2022` when you need current runtime features.

```typescript
function logMethod<This, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
) {
  const methodName = String(context.name);

  return function replacement(this: This, ...args: Args): Return {
    console.log(`Calling ${methodName} with`, args);
    const result = target.call(this, ...args);
    return result;
  };
}

class Calculator {
  @logMethod
  add(a: number, b: number): number {
    return a + b;
  }
}
```

### Const Type Parameters

Const type parameters provide more precise type inference for literal types.

```typescript
// With const type parameters
function createTuple<const T extends readonly unknown[]>(...ts: T): T {
  return ts;
}

const tuple = createTuple('a', 'b', 'c');
// Type is readonly ["a", "b", "c"]
```

### All Enums Are Union Enums

TypeScript 5.0 gives every enum member its own distinct type, which improves narrowing and exhaustiveness checks.

```typescript
enum Status {
  Pending = "pending",
  Complete = "complete",
}

function handleStatus(status: Status) {
  if (status === Status.Pending) {
    return "still running";
  }

  return "finished";
}
```

## TypeScript 5.1 Features

### Easier Implicit Returns for `undefined`

TypeScript 5.1 allows `undefined`-returning functions to omit explicit return statements.

```typescript
declare function takesUndefinedHandler(handler: () => undefined): void;

function noValue(): undefined {
  // No explicit return needed in 5.1+
}

takesUndefinedHandler((): undefined => {
  // Also valid in callback position
});
```

## TypeScript 5.2 Features

### Using Declarations

Resource management using `using` and `await using`.

```typescript
class DisposableResource implements Disposable {
  [Symbol.dispose]() {
    console.log('Disposing resource');
  }
}

{
  using resource = new DisposableResource();
  // Use resource
} // Automatically disposed here

// Async version
class AsyncResource implements AsyncDisposable {
  async [Symbol.asyncDispose]() {
    await Promise.resolve();
  }
}
```

## TypeScript 5.3 Features

### Import Attributes

Support for module import attributes.

```typescript
import data from './data.json' with { type: 'json' };

const moreData = await import('./more-data.json', {
  with: { type: 'json' },
});
```

### switch (true) Narrowing

Better type narrowing in `switch (true)` statements.

```typescript
function getValue(value: string | number | boolean) {
  switch (true) {
    case typeof value === 'string':
      value.toUpperCase(); // string
      break;
  }
}
```

## TypeScript 5.4 Features

### NoInfer<T>

Prevent inference in specific type positions.

```typescript
function createPair<T extends string>(first: T, second: NoInfer<T>): [T, T] {
  return [first, second];
}
```

### Preserve Narrowing in Closures

Better type narrowing preserved in closures.

```typescript
function foo(value: unknown) {
  if (typeof value === 'string') {
    const process = () => {
      value.toUpperCase(); // string - narrowing preserved
    };
  }
}
```

## Migration Guide

### Migrating to TypeScript 5.0

**1. Update tsconfig.json:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

**2. Migrate decorators deliberately:**

Before (legacy):
```typescript
function sealed(constructor: Function) {
  Object.seal(constructor);
}
```

After (standard):
```typescript
function sealed(
  target: Function,
  _context: ClassDecoratorContext,
) {
  Object.seal(target);
}
```

## TypeScript 5.x Quick Reference

| Feature | Version | Key Benefit |
|---------|---------|-------------|
| Standard decorators | 5.0 | ECMAScript spec compliance |
| Const type parameters | 5.0 | Better literal type inference |
| `moduleResolution: bundler` | 5.0 | Better bundler support |
| Using declarations | 5.2 | Resource management |
| Import attributes | 5.3 | Type-safe imports |
| `NoInfer<T>` | 5.4 | Control type inference |
