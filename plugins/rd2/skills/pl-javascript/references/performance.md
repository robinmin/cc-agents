# JavaScript Performance Optimization

Complete guide to optimizing JavaScript code for better performance.

## Table of Contents

- [Performance Measurement](#performance-measurement)
- [DOM Performance](#dom-performance)
- [Memory Management](#memory-management)
- [Code Optimization](#code-optimization)
- [Network Performance](#network-performance)
- [Rendering Performance](#rendering-performance)

---

## Performance Measurement

### Measuring Execution Time

```javascript
// Performance API
const start = performance.now();
// ... code ...
const end = performance.now();
console.log(`Time: ${end - start}ms`);

// performance.mark API
performance.mark('start');
// ... code ...
performance.mark('end');
performance.measure('operation', 'start', 'end');
const measure = performance.getEntriesByName('operation')[0];
console.log(`Duration: ${measure.duration}ms`);
```

### Profiling

```javascript
// Console methods
console.time('operation');
// ... code ...
console.timeEnd('operation');

// Count operations
console.count('loop');
loop();
console.count('loop');
```

---

## DOM Performance

### Batch DOM Updates

```javascript
// DON'T: Multiple reflows
element.style.width = '100px';
element.style.height = '100px';
element.style.margin = '10px';

// DO: Batch updates
element.style.cssText = 'width: 100px; height: 100px; margin: 10px;';

// Or use class
element.className = 'modified';
```

### DocumentFragment

```javascript
// DON'T: Multiple insertions
items.forEach(item => {
  list.appendChild(createItem(item));  // Multiple reflows
});

// DO: Use fragment
const fragment = document.createDocumentFragment();
items.forEach(item => {
  fragment.appendChild(createItem(item));
});
list.appendChild(fragment);  // Single reflow
```

### Layout Thrashing

```javascript
// DON'T: Read after write (causes reflow)
elements.forEach(el => {
  el.style.height = el.offsetHeight + 10 + 'px';
});

// DO: Batch reads then writes
const heights = Array.from(elements, el => el.offsetHeight);
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px';
});
```

### Event Delegation

```javascript
// DON'T: Many listeners
buttons.forEach(button => {
  button.addEventListener('click', handleClick);
});

// DO: Single delegated listener
container.addEventListener('click', (e) => {
  if (e.target.matches('button')) {
    handleClick(e);
  }
});
```

---

## Memory Management

### Avoid Memory Leaks

```javascript
// DON'T: Forgotten listeners
element.addEventListener('click', handler);
// Never removed!

// DO: Always remove listeners
const handler = () => console.log('clicked');
element.addEventListener('click', handler);
// Later:
element.removeEventListener('click', handler);

// Or use AbortController
const controller = new AbortController();
element.addEventListener('click', handler, {
  signal: controller.signal
});
// Later:
controller.abort();
```

### WeakMap and WeakSet

```javascript
// Use WeakMap for object-associated data
const privateData = new WeakMap();

function setPrivate(obj, data) {
  privateData.set(obj, data);
}

function getPrivate(obj) {
  return privateData.get(obj);
}

// WeakMap doesn't prevent garbage collection
```

### Object Pooling

```javascript
class ObjectPool {
  constructor(factory, reset, initialSize = 10) {
    this.factory = factory;
    this.reset = reset;
    this.pool = [];
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire() {
    return this.pool.length > 0
      ? this.pool.pop()
      : this.factory();
  }

  release(obj) {
    this.reset(obj);
    this.pool.push(obj);
  }
}
```

---

## Code Optimization

### Avoid Premature Optimization

```javascript
// Profile first, optimize hot paths only
// Readability is more important than micro-optimizations
```

### Loop Optimization

```javascript
// DON'T: Creating functions in loops
items.forEach(function(item) {
  // Function created for each item
});

// DO: Reuse function
function processItem(item) {
  // ...
}
items.forEach(processItem);

// For large arrays, use traditional loops
for (let i = 0; i < items.length; i++) {
  processItem(items[i]);
}
```

### String Concatenation

```javascript
// DON'T: Concatenation in loop
let result = '';
for (let i = 0; i < 1000; i++) {
  result += i;
}

// DO: Use array join
const parts = [];
for (let i = 0; i < 1000; i++) {
  parts.push(i);
}
const result = parts.join('');

// Or template literals (modern)
const parts = [];
for (let i = 0; i < 1000; i++) {
  parts.push(i);
}
const result = `${parts.join('')}`;
```

### Avoid Boxing/Unboxing

```javascript
// DON'T: Unnecessary type conversions
const num = new Number(42);  // Creates object
const str = new String('hello');

// DO: Use primitives
const num = 42;
const str = 'hello';
```

### Use Appropriate Data Structures

```javascript
// Fast lookups: Use Set or Map
const set = new Set([1, 2, 3]);
const has = set.has(2);  // O(1)

// Fast ordered iteration: Use Array
const arr = [1, 2, 3];
arr.forEach(x => console.log(x));

// Key-value pairs: Use Object or Map
const map = new Map([['key', 'value']]);
```

---

## Network Performance

### Debounce and Throttle

```javascript
// Debounce: Wait until activity stops
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Throttle: Limit rate of execution
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
```

### Lazy Loading

```javascript
// Lazy load images
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});

document.querySelectorAll('img[data-src]').forEach(img => {
  observer.observe(img);
});
```

### Code Splitting

```javascript
// Dynamic import for code splitting
async function loadModule() {
  const module = await import('./heavy-module.js');
  module.doSomething();
}
```

---

## Rendering Performance

### requestAnimationFrame

```javascript
// For animations
function animate() {
  updatePosition();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// For visual updates
function updateVisuals() {
  element.style.transform = `translateX(${x}px)`;
  requestAnimationFrame(updateVisuals);
}
```

### CSS Transforms

```javascript
// Use transforms instead of changing layout properties
element.style.transform = 'translateX(100px)';  // GPU-accelerated
// NOT: element.style.left = '100px';  // Causes reflow

// Use will-change sparingly
element.style.willChange = 'transform';  // Hint to browser
```

### Virtual Scrolling

```javascript
// For large lists, render only visible items
class VirtualList {
  constructor(container, itemHeight, totalItems) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.totalItems = totalItems;
    this.visibleItems = Math.ceil(container.clientHeight / itemHeight);

    container.addEventListener('scroll', () => this.render());
    this.render();
  }

  render() {
    const scrollTop = this.container.scrollTop;
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = startIndex + this.visibleItems;

    // Render items from startIndex to endIndex
  }
}
```

---

## Web Workers

### Offload CPU-Intensive Tasks

```javascript
// Main thread
const worker = new Worker('compute.js');

worker.onmessage = (e) => {
  console.log('Result:', e.data);
};

worker.postMessage({ data: largeDataSet });

// Worker thread (compute.js)
self.onmessage = (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};
```

---

## Best Practices

### DO

- Measure performance before optimizing
- Optimize hot paths only
- Use native methods (they're faster)
- Use appropriate data structures
- Implement lazy loading
- Use event delegation
- Batch DOM updates
- Clean up resources

### DON'T

- Prematurely optimize
- Create functions in loops
- Use unnecessary type conversions
- Cause layout thrashing
- Forget to remove event listeners
- Use blocking operations on main thread
