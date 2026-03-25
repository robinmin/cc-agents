---
name: utility-types
description: "Built-in TypeScript utility types: Partial, Required, Readonly, Pick, Omit, Record, conditional types, and custom patterns like DeepPartial."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [typescript, utility-types, type-system, patterns, architecture-design]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
---

# TypeScript Built-in Utility Types Reference

Complete reference for TypeScript's built-in utility types with examples and use cases.

## Transformation Types

### Partial<T>

Makes all properties in `T` optional.

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

type UserUpdate = Partial<User>;

function updateUser(id: string, updates: UserUpdate): void {
  // Only update provided fields
}
```

### Required<T>

Makes all properties in `T` required.

```typescript
interface Props {
  id?: string;
  title?: string;
}

type RequiredProps = Required<Props>;
```

### Readonly<T>

Makes all properties in `T` readonly.

```typescript
interface User {
  id: string;
  name: string;
}

type ReadonlyUser = Readonly<User>;

const user: ReadonlyUser = { id: '1', name: 'John' };
user.name = 'Jane'; // Error: Cannot assign to 'name'
```

## Structure Types

### Pick<T, K>

Constructs a type by picking the set of properties `K` from `T`.

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

type PublicUser = Pick<User, 'id' | 'name' | 'email'>;
```

### Omit<T, K>

Constructs a type by picking all properties from `T` and then removing `K`.

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

type CreateUserDto = Omit<User, 'id'>;
```

### Record<K, T>

Constructs an object type whose property keys are `K` and values are `T`.

```typescript
type UserMap = Record<string, User>;

const usersById: UserMap = {
  'user1': { id: 'user1', name: 'John' }
};
```

### Exclude<T, U>

Excludes from `T` all properties that are assignable to `U`.

```typescript
type Event = 'click' | 'focus' | 'blur';
type MouseEvent = Exclude<Event, 'focus' | 'blur'>;
// Result: 'click'
```

### Extract<T, U>

Extracts from `T` all properties that are assignable to `U`.

```typescript
type Event = 'click' | 'focus' | 'blur' | 'keydown';
type FocusEvent = Extract<Event, 'focus' | 'blur'>;
// Result: 'focus' | 'blur'
```

### NonNullable<T>

Excludes `null` and `undefined` from `T`.

```typescript
type Value = string | null | undefined;
type NonNullableValue = NonNullable<Value>;
// Result: string
```

## Collection Types

### Awaited<T>

Recursively unwraps Promises.

```typescript
type Value = Awaited<Promise<string>>;
// Result: string

type Nested = Awaited<Promise<Promise<number>>>;
// Result: number
```

## Function Types

### Parameters<T>

Extracts parameter types from a function type.

```typescript
type Fn = (a: string, b: number) => void;
type Params = Parameters<Fn>;
// Result: [a: string, b: number]
```

### ReturnType<T>

Extracts the return type of a function type.

```typescript
type Fn = () => { id: string; name: string };
type Return = ReturnType<Fn>;
// Result: { id: string; name: string }
```

## Common Custom Patterns

### Deep Partial

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};
```

### Deep Readonly

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};
```

### PickByType

```typescript
type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P]
};
```
