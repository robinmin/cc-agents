# TypeScript Built-in Utility Types Reference

Complete reference for TypeScript's built-in utility types with examples and use cases.

## Table of Contents

1. [Transformation Types](#transformation-types)
2. [Structure Types](#structure-types)
3. [String Manipulation Types](#string-manipulation-types)
4. [Collection Types](#collection-types)
5. [Function Types](#function-types)
6. [Conditional Types](#conditional-types)

---

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

// For update payloads - all fields optional
type UserUpdate = Partial<User>;

function updateUser(id: string, updates: UserUpdate): void {
  // Only update provided fields
}
```

**Use cases:** API update payloads, form partial data, optional configuration

---

### Required<T>

Makes all properties in `T` required.

```typescript
interface Props {
  id?: string;
  title?: string;
  description?: string;
}

type RequiredProps = Required<Props>;
// All properties are now required
```

**Use cases:** Configuration validation, ensure all fields are present

---

### Readonly<T>

Makes all properties in `T` readonly.

```typescript
interface User {
  id: string;
  name: string;
}

type ReadonlyUser = Readonly<User>;

const user: ReadonlyUser = { id: '1', name: 'John' };
user.name = 'Jane'; // Error: Cannot assign to 'name' because it is read-only
```

**Use cases:** Immutable state, shared configuration, prevent mutations

---

### ReadonlyArray<T>

Makes array readonly.

```typescript
const numbers: ReadonlyArray<number> = [1, 2, 3];
numbers.push(4); // Error: Property 'push' does not exist

// Alternative syntax
const moreNumbers: readonly number[] = [1, 2, 3];
```

---

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

// Public user profile - exclude sensitive data
type PublicUser = Pick<User, 'id' | 'name' | 'email'>;

function toPublicUser(user: User): PublicUser {
  const { password, ...publicUser } = user;
  return publicUser;
}
```

**Use cases:** API responses, exclude sensitive fields, subset of properties

---

### Omit<T, K>

Constructs a type by picking all properties from `T` and then removing `K`.

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// For creating users - exclude auto-generated fields
type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

// For updates - exclude id and timestamps
type UpdateUserDto = Omit<CreateUserDto, 'password'>;

function createUser(data: CreateUserDto): User {
  return {
    ...data,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
```

**Use cases:** Remove sensitive fields, exclude computed properties, input DTOs

---

### Record<K, T>

Constructs an object type whose property keys are `K` and values are `T`.

```typescript
// Dictionary type
type UserMap = Record<string, User>;

const usersById: UserMap = {
  'user1': { id: 'user1', name: 'John' },
  'user2': { id: 'user2', name: 'Jane' }
};

// Enum-style object
type HttpStatus = Record<string, number>;

const status: HttpStatus = {
  ok: 200,
  created: 201,
  badRequest: 400,
  notFound: 404
};

// Generic lookup table
type LookupTable<T> = Record<string, T>;
```

**Use cases:** Dictionaries, lookup tables, keyed collections

---

### Exclude<T, U>

Constructs a type by excluding from `T` all properties that are assignable to `U`.

```typescript
type Primitive = string | number | boolean;
type NonPrimitive = Exclude<Primitive, string | number>;
// Result: boolean

type Event = 'click' | 'focus' | 'blur';
type MouseEvent = Exclude<Event, 'focus' | 'blur'>;
// Result: 'click'
```

**Use cases:** Filter union types, remove specific members

---

### Extract<T, U>

Constructs a type by extracting from `T` all properties that are assignable to `U`.

```typescript
type Primitive = string | number | boolean;
type StringOrNumber = Extract<Primitive, string | number>;
// Result: string | number

type Event = 'click' | 'focus' | 'blur' | 'keydown';
type FocusEvent = Extract<Event, 'focus' | 'blur'>;
// Result: 'focus' | 'blur'
```

**Use cases:** Filter union types, keep specific members

---

### NonNullable<T>

Constructs a type by excluding `null` and `undefined` from `T`.

```typescript
type Value = string | null | undefined;
type NonNullableValue = NonNullable<Value>;
// Result: string

function process(value: NonNullable<string>) {
  // Guaranteed to be string, not null/undefined
  console.log(value.toUpperCase());
}
```

**Use cases:** Remove optional types, ensure non-null values

---

## String Manipulation Types

### Uppercase<S>

Converts string literal type to uppercase.

```typescript
type Event = 'click';
type UpperEvent = Uppercase<Event>;
// Result: 'CLICK'
```

---

### Lowercase<S>

Converts string literal type to lowercase.

```typescript
type Event = 'CLICK';
type LowerEvent = Lowercase<Event>;
// Result: 'click'
```

---

### Capitalize<S>

Capitalizes the first character.

```typescript
type Event = 'click';
type CapitalizedEvent = Capitalize<Event>;
// Result: 'Click'
```

---

### Uncapitalize<S>

Uncapitalizes the first character.

```typescript
type Event = 'Click';
type UncapitalizedEvent = Uncapitalize<Event>;
// Result: 'click'
```

---

## Collection Types

### Awaited<T>

Recursively unwraps Promises.

```typescript
type Value = Awaited<Promise<string>>;
// Result: string

type Nested = Awaited<Promise<Promise<number>>>;
// Result: number
```

---

## Function Types

### Parameters<T>

Extracts parameter types from a function type.

```typescript
type Fn = (a: string, b: number) => void;
type Params = Parameters<Fn>;
// Result: [a: string, b: number]

// Use case
function callWithArgs<T extends (...args: any[]) => any>(
  fn: T,
  ...args: Parameters<T>
): ReturnType<T> {
  return fn(...args);
}
```

---

### ReturnType<T>

Extracts the return type of a function type.

```typescript
type Fn = () => { id: string; name: string };
type Return = ReturnType<Fn>;
// Result: { id: string; name: string }

// Use case
function fetchData(): Promise<User> {
  return Promise.resolve({ id: '1', name: 'John' });
}

type DataType = ReturnType<typeof fetchData>;
// Result: Promise<User>

type UserData = Awaited<DataType>;
// Result: User
```

---

### ThisParameterType<T>

Extracts the type of the `this` parameter of a function type.

```typescript
function toHex(this: Number) {
  return this.toString(16);
}

type ThisType = ThisParameterType<typeof toHex>;
// Result: Number
```

---

### OmitThisParameter<T, O>

Removes the `this` parameter from `T`.

```typescript
function toHex(this: Number) {
  return this.toString(16);
}

type WithoutThis = OmitThisParameter<typeof toHex>;
// Result: () => string

const fn: WithoutThis = toHex.bind(15);
```

---

### ThisType<T>

Markers to contextualize `this` within an object.

```typescript
interface State {
  count: number;
}

interface Methods {
  increment: () => void;
  decrement: () => void;
}

const state: State & ThisType<State & Methods> = {
  count: 0,
  increment() {
    this.count++; // this is typed as State & Methods
  },
  decrement() {
    this.count--; // this is typed as State & Methods
  }
};
```

---

## Conditional Types

### NoInfer<T>

Blocks inference in a type.

```typescript
function foo<T extends string>(x: NoInfer<T>) {
  return x;
}

// T is inferred as 'hello' not string
const result = foo<'hello'>('hello');
```

---

## Common Patterns

### Deep Partial

Make all nested properties optional.

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
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

type PartialConfig = DeepPartial<Config>;
```

---

### Deep Required

Make all nested properties required.

```typescript
type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object
    ? DeepRequired<T[P]>
    : T[P];
};
```

---

### Deep Readonly

Make all nested properties readonly.

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};
```

---

### Nullable

Make properties nullable.

```typescript
type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

interface User {
  id: string;
  name: string;
}

type NullableUser = Nullable<User>;
// { id: string | null; name: string | null }
```

---

### Smart Pick

Pick properties that match a specific type.

```typescript
type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P]
};

interface User {
  id: string;
  name: string;
  age: number;
  email: string;
  active: boolean;
}

type StringProps = PickByType<User, string>;
// { id: string; name: string; email: string }
```

---

### Smart Omit

Omit properties that match a specific type.

```typescript
type OmitByType<T, U> = {
  [P in keyof T as T[P] extends U ? never : P]: T[P]
};

type NonStringProps = OmitByType<User, string>;
// { age: number; active: boolean }
```

---

## Utility Type Best Practices

1. **Prefer Omit over Pick** when excluding properties — More readable
2. **Use Partial for updates** — All fields optional
3. **Use Readonly for immutable state** — Prevent mutations
4. **Use Pick for API responses** — Exclude sensitive data
5. **Use Record for dictionaries** — Type-safe key-value pairs
6. **Use Parameters/ReturnType** — For function type manipulation
7. **Use Awaited** — For unwrapping Promise types
8. **Use Extract/Exclude** — For union type manipulation
9. **Use DeepPartial** — For nested optional properties
10. **Use DeepReadonly** — For nested immutable properties
