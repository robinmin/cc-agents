# Common JavaScript Pitfalls

Guide to common JavaScript mistakes and how to avoid them.

## Table of Contents

- [Variable Scope Issues](#variable-scope-issues)
- [Type Coercion Issues](#type-coercion-issues)
- [Async/Await Pitfalls](#asyncawait-pitfalls)
- [This Context Issues](#this-context-issues)
- [Array and Object Issues](#array-and-object-issues)
- [Comparison Issues](#comparison-issues)
- [Memory Leaks](#memory-leaks)
- [DOM Manipulation Issues](#dom-manipulation-issues)

---

## Variable Scope Issues

### Using var

```javascript
// DON'T: var is function-scoped and hoisted
function example() {
  if (true) {
    var x = 10;
  }
  console.log(x);  // 10 (accessible outside block)
}

// DO: Use let/const (block-scoped)
function example() {
  if (true) {
    let x = 10;
  }
  console.log(x);  // ReferenceError
}
```

### Loop Closures with var

```javascript
// DON'T: Closure captures final value
for (var i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100);
}
// Logs: 5, 5, 5, 5, 5

// DO: Use let
for (let i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100);
}
// Logs: 0, 1, 2, 3, 4

// Or use IIFE with var
for (var i = 0; i < 5; i++) {
  (function(i) {
    setTimeout(() => console.log(i), 100);
  })(i);
}
```

---

## Type Coercion Issues

### Loose Equality (==)

```javascript
// DON'T: Unexpected type coercion
0 == '';        // true
0 == '0';       // true
'' == '0';      // false
null == undefined;  // true
[] == false;    // true

// DO: Always use strict equality
0 === '';       // false
0 === '0';      // false
null === undefined;  // false
[] === false;   // false
```

### Addition vs Concatenation

```javascript
// DON'T: Mixing types
console.log(1 + '2');    // '12' (concatenation)
console.log(1 + 2 + '3'); // '33' (1+2=3, then '3')

// DO: Explicit conversion
console.log(1 + Number('2'));    // 3
console.log(String(1) + '2');    // '12'
console.log(`${1}${2}`);         // '12'
```

### Falsy Values

```javascript
// Common falsy values
false, 0, '', null, undefined, NaN

// BUT: These are truthy
[], {}, '0', 'false'

// Check specifically
if (value === null || value === undefined) { }
if (Array.isArray(value)) { }
if (typeof value === 'object' && value !== null) { }
```

---

## Async/Await Pitfalls

### Forgetting await

```javascript
// DON'T: Forgetting await
async function fetchData() {
  const data = fetch('/api/data');  // Returns Promise
  console.log(data);  // Promise {<pending>}
}

// DO: Always await
async function fetchData() {
  const data = await fetch('/api/data');
  console.log(data);  // Response
}
```

### Mixing Promises and Async/Await

```javascript
// DON'T: Unnecessary mixing
const result = await promise.then(x => x * 2);

// DO: Stick to one pattern
const result = (await promise) * 2;
// Or
const result = promise.then(x => x * 2);
```

### Unhandled Rejections

```javascript
// DON'T: Ignoring rejections
promise.then(result => console.log(result));

// DO: Always handle rejections
promise
  .then(result => console.log(result))
  .catch(error => console.error(error));

// With async/await
try {
  await promise;
} catch (error) {
  console.error(error);
}
```

### Loops with Async

```javascript
// DON'T: forEach doesn't await
items.forEach(async item => {
  await process(item);  // Runs in parallel
});

// DO: Use for...of for sequential
for (const item of items) {
  await process(item);
}

// Or Promise.all for parallel
await Promise.all(items.map(item => process(item)));
```

---

## This Context Issues

### Losing this Context

```javascript
// DON'T: this context lost in callbacks
class Counter {
  count = 0;

  increment() {
    setTimeout(function() {
      this.count++;  // Error: this is undefined
    }, 100);
  }
}

// DO: Use arrow function
class Counter {
  count = 0;

  increment() {
    setTimeout(() => {
      this.count++;  // OK
    }, 100);
  }
}
```

### Event Listeners

```javascript
// DON'T: this lost in addEventListener
button.addEventListener('click', function() {
  this.handleClick();  // this is button, not class instance
});

// DO: Use arrow function
button.addEventListener('click', () => {
  this.handleClick();  // this is class instance
});

// Or use bind
button.addEventListener('click', function() {
  this.handleClick();
}.bind(this));
```

---

## Array and Object Issues

### Mutating Arrays

```javascript
// DON'T: Unintended mutation
const original = [1, 2, 3];
const copy = original;
copy.push(4);  // Modifies original!
console.log(original);  // [1, 2, 3, 4]

// DO: Create copies
const copy = [...original];
copy.push(4);  // original unchanged

// For objects
const copy = { ...original };
```

### Array Methods

```javascript
// Mutating methods (change original)
push, pop, shift, unshift, splice, sort, reverse

// Non-mutating methods (return new)
map, filter, reduce, slice, concat

// Example
const arr = [3, 1, 2];
const sorted = arr.sort();  // Mutates arr!
// Better:
const sorted = [...arr].sort();  // arr unchanged
```

### Object Comparison

```javascript
// DON'T: Comparing objects by reference
const obj1 = { a: 1 };
const obj2 = { a: 1 };
console.log(obj1 === obj2);  // false

// DO: Deep comparison
function deepEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}
// Or use library (lodash, etc.)
```

---

## Comparison Issues

### NaN Comparison

```javascript
// DON'T: NaN comparison doesn't work
console.log(NaN === NaN);  // false

// DO: Use isNaN or Number.isNaN
console.log(isNaN(NaN));  // true
console.log(Number.isNaN(NaN));  // true (preferred)
```

### Array Comparison

```javascript
// DON'T: Arrays compared by reference
[1, 2] === [1, 2];  // false

// DO: Compare contents
function arraysEqual(arr1, arr2) {
  return arr1.length === arr2.length &&
         arr1.every((val, i) => val === arr2[i]);
}
```

---

## Memory Leaks

### Forgotten Event Listeners

```javascript
// DON'T: Never removing listeners
element.addEventListener('click', handler);

// DO: Always remove when done
element.addEventListener('click', handler);
// Later:
element.removeEventListener('click', handler);
```

### Closures with Large Data

```javascript
// DON'T: Closure holding large data
function createHandler(largeData) {
  return function() {
    console.log(largeData.length);
  };
}

// DO: Only capture what's needed
function createHandler(largeData) {
  const length = largeData.length;
  return function() {
    console.log(length);
  };
}
```

### Timers Not Cleared

```javascript
// DON'T: Forgetting to clear intervals
const intervalId = setInterval(callback, 1000);

// DO: Clear when done
const intervalId = setInterval(callback, 1000);
// Later:
clearInterval(intervalId);
```

---

## DOM Manipulation Issues

### innerHTML and XSS

```javascript
// DON'T: Directly setting user input (XSS risk)
element.innerHTML = userInput;

// DO: Sanitize or use textContent
element.textContent = userInput;  // Safe

// Or sanitize HTML
function sanitize(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}
```

### Synchronous Operations

```javascript
// DON'T: Blocking operations on main thread
function heavyComputation() {
  for (let i = 0; i < 1000000000; i++) {
    // Blocks UI!
  }
}

// DO: Use Web Workers
const worker = new Worker('compute.js');
worker.postMessage({ data });
```

### Missing Null Checks

```javascript
// DON'T: Assuming elements exist
const button = document.querySelector('.button');
button.addEventListener('click', handler);  // Error if null

// DO: Check for null
const button = document.querySelector('.button');
if (button) {
  button.addEventListener('click', handler);
}

// Or use optional chaining
document.querySelector('.button')?.addEventListener('click', handler);
```

---

## Best Practices Summary

### Always Do

- Use `let`/`const` instead of `var`
- Use strict equality (`===`)
- Handle promise rejections
- Check for null/undefined
- Clean up resources
- Sanitize user input
- Use optional chaining

### Never Do

- Use `var`
- Rely on type coercion
- Ignore promise rejections
- Forget to remove event listeners
- Set innerHTML with user input
- Block main thread with heavy computation
