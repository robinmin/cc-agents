---
name: type-system
description: "Complete type system guide: generics, conditional types, type guards, mapped types, template literals, and advanced TypeScript type manipulation patterns."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [typescript, type-system, generics, patterns, architecture-design]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:pl-typescript
  - rd3:pl-typescript/references/utility-types
  - rd3:pl-typescript/references/patterns
---

# TypeScript Type System Reference

Complete guide to TypeScript's type system including generics, conditional types, type manipulation, and advanced patterns.

## Generics

### Basic Generic Functions

```typescript
// Single type parameter
function identity<T>(arg: T): T {
  return arg;
}

// Multiple type parameters
function pair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}

// Generic with default
function wrap<T = string>(value: T): Array<T> {
  return [value];
}
```

### Generic Constraints

```typescript
// Extends constraint
interface WithLength {
  length: number;
}

function logLength<T extends WithLength>(arg: T): number {
  return arg.length;
}

// Keyof constraint
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Constructor constraint
interface Constructor {
  new (...args: any[]): any;
}

function createInstance<T extends Constructor>(
  Constructor: T,
  ...args: any[]
): InstanceType<T> {
  return new Constructor(...args);
}
```

### Generic Classes

```typescript
class Repository<T> {
  private items: T[] = [];

  add(item: T): void {
    this.items.push(item);
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return this.items.find(predicate);
  }
}
```

## Conditional Types

### Basic Conditional Types

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>; // false
```

### Infer with Conditional Types

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type A = ReturnType<() => string>; // string
type B = ReturnType<() => void>;  // void
```

### Distributive Conditional Types

```typescript
type ToArray<T> = T extends any ? T[] : never;

type A = ToArray<string | number>; // string[] | number[]
```

## Type Guards and Narrowing

### typeof Guards

```typescript
function process(value: string | number) {
  if (typeof value === 'string') {
    value.toUpperCase(); // string
  } else {
    value.toFixed(2); // number
  }
}
```

### Custom Type Guards

```typescript
interface Cat {
  meow(): void;
}

interface Dog {
  bark(): void;
}

function isCat(animal: Cat | Dog): animal is Cat {
  return (animal as Cat).meow !== undefined;
}
```

### Discriminated Unions

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
  }
}
```

## Mapped Types

### Basic Mapped Types

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Optional<T> = {
  [P in keyof T]?: T[P];
};

type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};
```

### Key Remapping

```typescript
type Getters<T> = {
  [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

type Props = { name: string; age: number };
type GraftedProps = Getters<Props>;
// { getName: () => string; getAge: () => number; }
```

## Template Literal Types

### Basic Template Literals

```typescript
type EventName = `on${Capitalize<string>}`;
type CSSUnit = `${number}${'px' | 'em' | 'rem'}`;
```

### String Manipulation

```typescript
type Greet<T extends string> = `Hello, ${T}!`;

type Path = `${'home' | 'user' | 'app'}/${string}`;
```

## Advanced Patterns

### Branded Types

```typescript
type Brand<T, B> = T & { __brand: B };

type UserId = Brand<string, 'UserId'>;
type Email = Brand<string, 'Email'>;

function createUserId(id: string): UserId {
  return id as UserId;
}
```

### Recursive Types

```typescript
interface TreeNode {
  value: number;
  left?: TreeNode;
  right?: TreeNode;
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

### Variadic Tuple Types

```typescript
type Concat<T extends any[], U extends any[]> = [...T, ...U];

type A = Concat<[1, 2], [3, 4]>; // [1, 2, 3, 4]

type Push<T extends any[], V> = [...T, V];
```
