# TypeScript Type System Reference

Complete guide to TypeScript's type system including generics, conditional types, type manipulation, and advanced patterns.

## Table of Contents

1. [Generics](#generics)
2. [Conditional Types](#conditional-types)
3. [Type Guards and Narrowing](#type-guards-and-narrowing)
4. [Mapped Types](#mapped-types)
5. [Template Literal Types](#template-literal-types)
6. [Type Manipulation](#type-manipulation)
7. [Advanced Patterns](#advanced-patterns)

---

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

  getAll(): ReadonlyArray<T> {
    return this.items;
  }
}
```

### Generic Utility Patterns

```typescript
// Deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

// Deep partial
type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

// Deep required
type DeepRequired<T> = {
  [P in keyof T]-?: DeepRequired<T[P]>;
};
```

---

## Conditional Types

### Basic Conditional Types

```typescript
// Basic syntax
type NonNullable<T> = T extends null | undefined ? never : T;

// Union distribution
type ToArray<T> = T extends any ? T[] : never;
// ToArray<string | number> = string[] | number[]

// Prevent distribution
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
// ToArrayNonDist<string | number> = (string | number)[]
```

### Infer Conditional Types

```typescript
// Unwrap promise
type Unpromise<T> = T extends Promise<infer U> ? U : T;

// Unwrap array
type Unarray<T> = T extends (infer U)[] ? U : T;

// Extract function return type
type Return<T> = T extends (...args: any[]) => infer R ? R : never;

// Extract function parameters
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

// Extract this parameter
type ThisParameterType<T> = T extends (this: infer U, ...args: any[]) => any ? U : unknown;
```

### Conditional Type Chains

```typescript
// Flatten nested types
type Flatten<T> = T extends Array<infer U>
  ? U extends Array<any>
    ? Flatten<U>
    : U
  : T;

// Smart extract
type ExtractPromise<T> = T extends Promise<infer U>
  ? U extends Promise<any>
    ? ExtractPromise<U>
    : U
  : T;
```

---

## Type Guards and Narrowing

### Built-in Type Guards

```typescript
// typeof
function process(value: string | number) {
  if (typeof value === 'string') {
    value.toUpperCase(); // string
  } else {
    value.toFixed(2); // number
  }
}

// instanceof
class Dog {
  bark() {}
}
class Cat {
  meow() {}
}

function pet(animal: Dog | Cat) {
  if (animal instanceof Dog) {
    animal.bark();
  } else {
    animal.meow();
  }
}

// in operator
interface A { a: number }
interface B { b: string }

function process(obj: A | B) {
  if ('a' in obj) {
    obj.a; // number
  } else {
    obj.b; // string
  }
}
```

### User-Defined Type Guards

```typescript
// Basic type guard
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Type guard with type predicate
interface Fish {
  swim: () => void;
}
interface Bird {
  fly: () => void;
}

function isFish(pet: Fish | Bird): pet is Fish {
  return 'swim' in pet;
}

// Type guard for discriminated unions
type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

function isSuccess<T>(result: Result<T, unknown>): result is { success: true; data: T } {
  return result.success;
}
```

### Assertion Functions

```typescript
// Asserts keyword
function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error('Value is not defined');
  }
}

function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Value is not a string');
  }
}

// Usage
function process(value: unknown) {
  assertIsString(value);
  value.toUpperCase(); // string
}
```

### Exhaustiveness Checking

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'triangle'; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.side ** 2;
    case 'triangle':
      return (shape.base * shape.height) / 2;
    default:
      const _exhaustive: never = shape;
      return _exhaustive;
  }
}
```

---

## Mapped Types

### Basic Mapped Types

```typescript
// Map all properties
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

// Add modifiers
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

type Required<T> = {
  [P in keyof T]-?: T[P];
};
```

### Key Remapping

```typescript
// Getters and setters
type Getters<T> = {
  [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

type Setters<T> = {
  [P in keyof T as `set${Capitalize<string & P>}`]: (value: T[P]) => void;
};

// Filter properties
type OnlyStrings<T> = {
  [P in keyof T as T[P] extends string ? P : never]: T[P];
};

// Pick by value type
type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P];
};
```

### Template Literal Mapped Types

```typescript
// Event handler names
type EventHandlers<T> = {
  [P in keyof T as `on${Capitalize<string & P>}`]: (event: T[P]) => void;
};

interface Events {
  click: MouseEvent;
  focus: FocusEvent;
  blur: FocusEvent;
}

type Handlers = EventHandlers<Events>;
// { onClick: (event: MouseEvent) => void; onFocus: ...; onBlur: ... }
```

---

## Template Literal Types

### Basic Template Literals

```typescript
type EventName<T extends string> = `on${Capitalize<T>}`;

type ClickEvent = EventName<'click'>; // 'onclick'
type FocusEvent = EventName<'focus'>; // 'onfocus'
```

### String Manipulation

```typescript
// Uppercase/Lowercase
type Upper<T extends string> = Uppercase<T>;
type Lower<T extends string> = Lowercase<T>;
type Capitalize<T extends string> = Capitalize<T>;
type Uncapitalize<T extends string> = Uncapitalize<T>;

// Examples
type ID = 'id';
type ID_UPPER = Upper<ID>; // 'ID'
type Name = 'name';
type Name_Cap = Capitalize<Name>; // 'Name'
```

### String Unions

```typescript
type Color = 'red' | 'blue' | 'green';
type Size = 'small' | 'medium' | 'large';

type CssClass = `${Color}-${Size}`;
// 'red-small' | 'red-medium' | ... | 'green-large'
```

### Advanced Template Literals

```typescript
// Parse CSS properties
type CssValue<T extends string> = T extends `${infer K}:${infer V}` ? { key: K; value: V } : never;

type Parse = CssValue<'color:red'>; // { key: 'color'; value: 'red' }

// Remove prefix
type RemovePrefix<T extends string, P extends string> = T extends `${P}${infer R}` ? R : T;

type Id = RemovePrefix<'user_id', 'user_'>; // 'id'
```

---

## Type Manipulation

### Utility Type Combinations

```typescript
// Deep readonly with selective mutability
type DeepReadonlySelective<T, K extends keyof T> = {
  readonly [P in keyof T]: P extends K
    ? T[P]
    : DeepReadonly<T[P]>;
};

// Partial with specific keys
type PartialKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Required with specific keys
type RequiredKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
```

### Type Inference Patterns

```typescript
// Infer tuple types
type First<T extends unknown[]> = T extends [infer F, ...unknown[]] ? F : never;
type Last<T extends unknown[]> = T extends [...unknown[], infer L] ? L : never;
type Tail<T extends unknown[]> = T extends [unknown, ...infer R] ? R : never;

// Infer function properties
type FunctionProperties<T> = {
  [K in keyof T]: T[K] extends Function ? K : never
}[keyof T];

// Async function return
type AsyncReturnType<T extends (...args: any[]) => Promise<any>> = T extends (...args: any[]) => Promise<infer R> ? R : never;
```

### Branding and Nominal Types

```typescript
// Branding pattern
type Brand<T, B> = T & { __brand: B };

type UserId = Brand<string, 'UserId'>;
type EmailAddress = Brand<string, 'EmailAddress'>;

function createUserId(id: string): UserId {
  return id as UserId;
}

// Cannot assign EmailAddress to UserId
const userId: UserId = createUserId('123');
const email: EmailAddress = 'test@example.com' as EmailAddress;
userId = email; // Error
```

---

## Advanced Patterns

### Recursive Types

```typescript
// JSON type
type JSON = string | number | boolean | null | JSON[] | { [key: string]: JSON };

// Deep flatten
type DeepFlatten<T> = T extends ReadonlyArray<infer U>
  ? U extends ReadonlyArray<any>
    ? DeepFlatten<U>
    : U
  : T;

// Deep omit
type DeepOmit<T, K extends string> = T extends object
  ? {
      [P in keyof T as P extends K ? never : P]: DeepOmit<T[P], K>
    }
  : T;
```

### Variadic Tuple Types

```typescript
// Concatenate tuples
type Concat<T extends unknown[], U extends unknown[]> = [...T, ...U];

// Push to tuple
type Push<T extends unknown[], V> = [...T, V];

// Unshift from tuple
type Unshift<T extends unknown[], V> = [V, ...T];

// Flatten tuple
type Flatten<T extends unknown[]> = T extends [infer First, ...infer Rest]
  ? First extends unknown[]
    ? [...Flatten<First>, ...Flatten<Rest>]
    : [First, ...Flatten<Rest>]
  : [];
```

### Polymorphic This Types

```typescript
class Calculator {
  add(value: number): this {
    // ...
    return this;
  }

  subtract(value: number): this {
    // ...
    return this;
  }

  multiply(value: number): this {
    // ...
    return this;
  }
}

class ScientificCalculator extends Calculator {
  pow(value: number): this {
    // ...
    return this;
  }
}

const calc = new ScientificCalculator();
calc.add(5).pow(2).multiply(3); // Type is ScientificCalculator
```

### Conditional Inference

```typescript
// Extract keys by value type
type KeysByType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T];

interface User {
  id: string;
  name: string;
  age: number;
  email: string;
  active: boolean;
}

type StringKeys = KeysByType<User, string>;
// 'id' | 'name' | 'email'
```

### Reverse Mapping

```typescript
enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT'
}

type DirectionMap = { [K in keyof typeof Direction]: Direction[K] };
// { Up: 'UP'; Down: 'DOWN'; Left: 'LEFT'; Right: 'RIGHT' }

type ReverseDirectionMap = { [V in Direction as V extends keyof typeof Direction ? V : never]: V extends keyof typeof Direction ? V : never };
```

## Type System Best Practices

1. **Favor composition over inheritance** — Use utility types to combine types
2. **Use discriminated unions** — For state management and error handling
3. **Prefer type guards over assertions** — For safer type narrowing
4. **Enable strict mode** — Catch more errors at compile time
5. **Avoid `any`** — Use `unknown` with proper type guards
6. **Document complex types** — Use JSDoc for non-obvious type relationships
7. **Leverage inference** — Let TypeScript infer when possible
8. **Use template literals** — For precise string-based types
9. **Consider performance** — Recursive types can impact compilation
10. **Test type boundaries** — Ensure types handle edge cases
