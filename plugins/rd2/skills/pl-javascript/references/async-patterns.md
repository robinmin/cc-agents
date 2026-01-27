# Async Patterns Reference

Comprehensive guide to JavaScript asynchronous programming patterns.

## Table of Contents

- [Understanding Asynchronous JavaScript](#understanding-asynchronous-javascript)
- [Promises](#promises)
- [Async/Await](#asyncawait)
- [Error Handling](#error-handling)
- [Parallel vs Sequential Execution](#parallel-vs-sequential-execution)
- [Common Patterns](#common-patterns)
- [Common Pitfalls](#common-pitfalls)

---

## Understanding Asynchronous JavaScript

### The Event Loop

JavaScript is single-threaded with an event loop that manages execution:

```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);

console.log('3');

// Output: 1, 3, 2
```

### Microtasks vs Macrotasks

- **Microtasks**: Promise callbacks, queueMicrotask
- **Macrotasks**: setTimeout, setInterval, I/O

```javascript
console.log('Start');

setTimeout(() => console.log('Timeout'), 0);

Promise.resolve().then(() => console.log('Promise'));

console.log('End');

// Output: Start, End, Promise, Timeout
```

---

## Promises

### Creating Promises

```javascript
const promise = new Promise((resolve, reject) => {
  // Async operation
  if (success) {
    resolve(result);
  } else {
    reject(error);
  }
});
```

### Promise Methods

```javascript
// then/catch/finally
promise
  .then(result => console.log(result))
  .catch(error => console.error(error))
  .finally(() => console.log('Cleanup'));

// Chaining
promise
  .then(result => process(result))
  .then(processed => save(processed))
  .catch(error => handleError(error));
```

### Static Methods

```javascript
// Resolved promise
Promise.resolve(value);

// Rejected promise
Promise.reject(error);

// Wait for all (fail fast)
Promise.all([promise1, promise2, promise3]);

// Wait for all (wait for all to settle)
Promise.allSettled([promise1, promise2, promise3]);

// Race (first to settle)
Promise.race([promise1, promise2]);

// Any (first resolved)
Promise.any([promise1, promise2]);
```

---

## Async/Await

### Basic Syntax

```javascript
async function fetchData() {
  const response = await fetch('/api/data');
  const data = await response.json();
  return data;
}
```

### Error Handling

```javascript
async function safeFetch() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch failed:', error);
    return null;
  }
}
```

### Top-Level Await (ES2022)

```javascript
// In modules only
const data = await fetch('/api/data').then(r => r.json());
```

---

## Error Handling

### Promise Error Handling

```javascript
// Catch all errors in chain
promise
  .then(result => process(result))
  .catch(error => {
    console.error('Error:', error);
    return fallbackValue;
  });

// Multiple catch blocks
promise
  .then(result => {
    if (!result.valid) {
      throw new ValidationError('Invalid result');
    }
    return result;
  })
  .catch(error => {
    if (error instanceof ValidationError) {
      return handleValidationError(error);
    }
    throw error;  // Re-throw for outer handler
  })
  .catch(error => {
    console.error('Unexpected error:', error);
  });
```

### Async/Await Error Handling

```javascript
// Try-catch for single operation
async function fetchUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch user ${id}:`, error);
    return null;
  }
}

// Try-catch for multiple operations
async function fetchUserData(id) {
  try {
    const user = await fetch(`/api/users/${id}`).then(r => r.json());
    const posts = await fetch(`/api/users/${id}/posts`).then(r => r.json());
    const comments = await fetch(`/api/users/${id}/comments`).then(r => r.json());

    return { user, posts, comments };
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw error;
  }
}

// Global error handlers
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
  e.preventDefault();
});
```

---

## Parallel vs Sequential Execution

### Sequential Execution

```javascript
// Run one after another
async function sequential() {
  const result1 = await operation1();
  const result2 = await operation2();
  const result3 = await operation3();
  return [result1, result2, result3];
}
```

### Parallel Execution

```javascript
// Run all at once
async function parallel() {
  const [result1, result2, result3] = await Promise.all([
    operation1(),
    operation2(),
    operation3()
  ]);
  return [result1, result2, result3];
}
```

### Controlled Concurrency

```javascript
// Limit concurrent operations
async function concurrentLimit(tasks, limit) {
  const results = [];
  const executing = new Set();

  for (const task of tasks) {
    const promise = task().then(result => {
      executing.delete(promise);
      return result;
    });

    executing.add(promise);
    results.push(promise);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}
```

---

## Common Patterns

### Retry Pattern

```javascript
async function fetchWithRetry(url, retries = 3) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    console.log(`Retrying... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return fetchWithRetry(url, retries - 1);
  }
}
```

### Timeout Pattern

```javascript
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### Caching Pattern

```javascript
const cache = new Map();

async function cachedFetch(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const response = await fetch(url);
  const data = await response.json();
  cache.set(url, data);
  return data;
}
```

### Debounce Pattern

```javascript
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Usage
const debouncedSearch = debounce(search, 300);
input.addEventListener('input', debouncedSearch);
```

### Throttle Pattern

```javascript
function throttle(fn, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Usage
const throttledScroll = throttle(handleScroll, 100);
window.addEventListener('scroll', throttledScroll);
```

### Race Condition Protection

```javascript
class RequestCache {
  constructor() {
    this.pending = new Map();
  }

  async fetch(key, fn) {
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

// Usage
const cache = new RequestCache();
const user = await cache.fetch('user:1', () => fetchUser(1));
```

### Sequential Processing

```javascript
// Process array items sequentially
async function processSequentially(items, processor) {
  const results = [];
  for (const item of items) {
    const result = await processor(item);
    results.push(result);
  }
  return results;
}

// Usage
const processed = await processSequentially(items, async (item) => {
  return await heavyProcessing(item);
});
```

### Batch Processing

```javascript
async function processBatch(items, batchSize, processor) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    );
    results.push(...batchResults);
  }

  return results;
}

// Usage
const processed = await processBatch(items, 10, processItem);
```

---

## Common Pitfalls

### Forgetting await

```javascript
// DON'T: Forgetting await
const data = fetch('/api/data');  // Returns Promise, not data

// DO: Always await async operations
const data = await fetch('/api/data');
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

### Unhandled Promise Rejections

```javascript
// DON'T: Ignoring rejections
promise.then(result => console.log(result));

// DO: Always handle rejections
promise
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

### Async Functions Always Return Promises

```javascript
async function getValue() {
  return 42;
}

const result = getValue();  // Returns Promise, not 42
const value = await getValue();  // 42
```

### Loops and Async/Await

```javascript
// DON'T: forEach with async (doesn't wait)
items.forEach(async item => {
  await process(item);  // Won't wait before next iteration
});

// DO: Use for...of
for (const item of items) {
  await process(item);
}

// Or use Promise.all
await Promise.all(items.map(item => process(item)));
```

### This Context in Async Functions

```javascript
class Counter {
  count = 0;

  async increment() {
    this.count++;  // 'this' is preserved in async functions
  }
}
```

### Memory Leaks with References

```javascript
// DON'T: Holding references in long-lived promises
const cache = {};
async function getData(id) {
  if (!cache[id]) {
    cache[id] = fetch(`/api/${id}`).then(r => r.json());
  }
  return cache[id];
}

// DO: Use weak references or cleanup
const cache = new Map();
async function getData(id) {
  if (cache.has(id)) {
    return cache.get(id);
  }
  const promise = fetch(`/api/${id}`).then(r => r.json());
  cache.set(id, promise);
  promise.finally(() => cache.delete(id));
  return promise;
}
```

### Avoid Callback Hell

```javascript
// DON'T: Nested callbacks
fs.readFile('file1.txt', (err, data1) => {
  fs.readFile('file2.txt', (err, data2) => {
    fs.readFile('file3.txt', (err, data3) => {
      // ...
    });
  });
});

// DO: Use async/await with promises
const data1 = await fs.promises.readFile('file1.txt');
const data2 = await fs.promises.readFile('file2.txt');
const data3 = await fs.promises.readFile('file3.txt');
```

### Error Propagation

```javascript
// DON'T: Catching and swallowing errors
async function fetchData() {
  try {
    return await fetch('/api/data');
  } catch (error) {
    console.error(error);
  }  // Returns undefined on error
}

// DO: Re-throw or return error indicator
async function fetchData() {
  try {
    return await fetch('/api/data');
  } catch (error) {
    console.error(error);
    return null;  // Explicit return
  }
}

// Or re-throw for caller to handle
async function fetchData() {
  try {
    return await fetch('/api/data');
  } catch (error) {
    console.error(error);
    throw error;  // Re-throw
  }
}
```
