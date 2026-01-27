# ES6+ Features Reference

Complete guide to modern JavaScript (ES6+) features and syntax.

## Table of Contents

- [Variables and Scoping](#variables-and-scoping)
- [Arrow Functions](#arrow-functions)
- [Template Literals](#template-literals)
- [Destructuring](#destructuring)
- [Spread and Rest Operators](#spread-and-rest-operators)
- [Default Parameters](#default-parameters)
- [Enhanced Object Literals](#enhanced-object-literals)
- [Classes](#classes)
- [Modules](#modules)
- [Iterators and Generators](#iterators-and-generators)
- [Promises](#promises)
- [Async/Await](#asyncawait)
- [Optional Chaining](#optional-chaining)
- [Nullish Coalescing](#nullish-coalescing)
- [Private Class Fields](#private-class-fields)

---

## Variables and Scoping

### let and const

**`let`**: Block-scoped variable, can be reassigned
**`const`**: Block-scoped constant, cannot be reassigned

```javascript
// Block scope
{
  let x = 10;
  const y = 20;
  x = 15;  // OK
  // y = 25;  // Error: Assignment to constant variable
}

// console.log(x);  // Error: x is not defined
```

### Temporal Dead Zone (TDZ)

Variables declared with let/const are not accessible until declaration:

```javascript
// console.log(x);  // ReferenceError: Cannot access 'x' before initialization
let x = 10;
```

---

## Arrow Functions

### Syntax

```javascript
// No parameters
const greet = () => 'Hello';

// Single parameter (parentheses optional)
const square = x => x * x;

// Multiple parameters
const add = (a, b) => a + b;

// Block body (explicit return)
const multiply = (a, b) => {
  return a * b;
};
```

### Key Characteristics

1. **Lexical `this` binding**: Inherits `this` from enclosing scope
2. **Cannot be used as constructors**: No `new` keyword
3. **No `arguments` object**: Use rest parameters instead
4. **Cannot duplicate parameter names**

```javascript
// Lexical this
class Counter {
  count = 0;
  increment = () => {
    this.count++;  // 'this' is bound to Counter instance
  };
}

// Cannot use as constructor
const Foo = () => {};
// new Foo();  // TypeError: Foo is not a constructor
```

---

## Template Literals

### Basic Usage

```javascript
const name = 'World';
const greeting = `Hello, ${name}!`;
```

### Multiline Strings

```javascript
const html = `
  <div>
    <h1>Title</h1>
  </div>
`;
```

### Tagged Templates

```javascript
function highlight(strings, ...values) {
  return strings.reduce((acc, str, i) => {
    const value = values[i] ? `<strong>${values[i]}</strong>` : '';
    return acc + str + value;
  }, '');
}

const name = 'Alice';
const result = highlight`Hello, ${name}!`;
// Result: "Hello, <strong>Alice</strong>!"
```

---

## Destructuring

### Array Destructuring

```javascript
const [a, b, c] = [1, 2, 3];

// Skipping values
const [first, , third] = [1, 2, 3];

// Rest operator
const [head, ...tail] = [1, 2, 3, 4];

// Default values
const [x = 0, y = 0] = [1];

// Swapping variables
let a = 1, b = 2;
[a, b] = [b, a];
```

### Object Destructuring

```javascript
const { name, age } = user;

// Renaming
const { name: fullName, age: years } = user;

// Default values
const { name = 'Anonymous' } = {};

// Nested destructuring
const { address: { city } } = user;

// Rest operator
const { name, ...rest } = user;
```

### Function Parameter Destructuring

```javascript
// Array destructuring
function sum([a, b]) {
  return a + b;
}
sum([1, 2]);  // 3

// Object destructuring
function greet({ name, greeting = 'Hello' }) {
  return `${greeting}, ${name}!`;
}
greet({ name: 'Alice' });  // "Hello, Alice!"
```

---

## Spread and Rest Operators

### Spread Operator

```javascript
// Arrays
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5];  // [1, 2, 3, 4, 5]

// Objects (ES2018)
const obj1 = { a: 1, b: 2 };
const obj2 = { ...obj1, c: 3 };  // { a: 1, b: 2, c: 3 }

// Function calls
const numbers = [1, 2, 3];
Math.max(...numbers);  // 3
```

### Rest Operator

```javascript
// Function parameters
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3, 4);  // 10

// Array destructuring
const [first, ...rest] = [1, 2, 3, 4];

// Object destructuring (ES2018)
const { a, ...rest } = { a: 1, b: 2, c: 3 };
```

---

## Default Parameters

```javascript
function greet(name = 'World', greeting = 'Hello') {
  return `${greeting}, ${name}!`;
}

greet();              // "Hello, World!"
greet('Alice');       // "Hello, Alice!"
greet('Bob', 'Hi');   // "Hi, Bob!"

// Expressions evaluated at call time
function now(date = new Date()) {
  return date;
}

// Undefined triggers default, null does not
function test(value = 'default') {
  return value;
}
test(undefined);  // "default"
test(null);       // null
```

---

## Enhanced Object Literals

### Shorthand Properties

```javascript
const name = 'Alice';
const age = 30;

const user = { name, age };
// Equivalent to: { name: name, age: age }
```

### Computed Property Names

```javascript
const key = 'dynamic';
const obj = {
  [key]: 'value',
  [`prefix_${key}`]: 'computed'
};
// { dynamic: 'value', prefix_dynamic: 'computed' }
```

### Method Shorthand

```javascript
const obj = {
  greet() {
    return 'Hello';
  },

  // Arrow functions don't create 'this' binding
  arrow: () => this
};
```

---

## Classes

### Class Declaration

```javascript
class User {
  #id;  // Private field (ES2022)

  constructor(name, email) {
    this.name = name;
    this.email = email;
    this.#id = Math.random();
  }

  get displayName() {
    return this.name;
  }

  set displayName(value) {
    this.name = value;
  }

  async save() {
    await database.store(this);
  }

  static async findById(id) {
    return await database.get(id);
  }
}
```

### Inheritance

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    return `${this.name} makes a sound`;
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);  // Call parent constructor
    this.breed = breed;
  }

  speak() {
    return `${this.name} barks`;
  }
}
```

---

## Modules

### Named Exports

```javascript
// utils.js
export const PI = 3.14159;
export function add(a, b) {
  return a + b;
}
export class Calculator {}
```

### Default Exports

```javascript
// calculator.js
export default class Calculator {
  add(a, b) {
    return a + b;
  }
}
```

### Imports

```javascript
// Named imports
import { add, PI } from './utils.js';

// Default import
import Calculator from './calculator.js';

// Namespace import
import * as utils from './utils.js';

// Mixed imports
import Calculator, { add } from './calculator.js';
```

### Dynamic Imports

```javascript
// Lazy loading
const module = await import('./utils.js');

// Conditional loading
if (condition) {
  const { heavyFunction } = await import('./heavy.js');
}
```

---

## Iterators and Generators

### Iterators

```javascript
const iterable = {
  data: [1, 2, 3],
  [Symbol.iterator]() {
    let index = 0;
    const data = this.data;
    return {
      next() {
        if (index < data.length) {
          return { value: data[index++], done: false };
        }
        return { value: undefined, done: true };
      }
    };
  }
};

for (const item of iterable) {
  console.log(item);  // 1, 2, 3
}
```

### Generators

```javascript
function* generateId() {
  let id = 0;
  while (true) {
    yield id++;
  }
}

const gen = generateId();
console.log(gen.next().value);  // 0
console.log(gen.next().value);  // 1
console.log(gen.next().value);  // 2

// Generator with return value
function* range(start, end) {
  for (let i = start; i <= end; i++) {
    yield i;
  }
  return 'Done';
}
```

---

## Optional Chaining (ES2020)

### Syntax

```javascript
const city = user?.address?.city;
const name = user?.name ?? 'Anonymous';
```

### Usage Patterns

```javascript
// Optional method call
const result = obj.method?.();

// Optional array access
const item = array?.[index];

// Optional delete
delete obj?.property;

// Chaining with expressions
const value = obj?.[dynamicKey]?.method?.();
```

---

## Nullish Coalescing (ES2020)

### Difference from OR Operator

```javascript
// OR operator (||) - falsy values trigger default
const value = '' || 'default';  // 'default'

// Nullish coalescing (??) - only null/undefined trigger default
const value = '' ?? 'default';  // ''
```

### Usage

```javascript
const timeout = config.timeout ?? 3000;
const count = items?.length ?? 0;
const user = data.user ?? null;
```

---

## Private Class Fields (ES2022)

### Syntax

```javascript
class BankAccount {
  #balance = 0;

  deposit(amount) {
    this.#balance += amount;
    return this.#balance;
  }

  #validateAmount(amount) {
    return amount > 0;
  }

  static #createId() {
    return Math.random();
  }
}
```

### Key Points

- Private fields are prefixed with `#`
- Cannot be accessed outside class
- Not inherited by subclasses
- Static private fields supported
