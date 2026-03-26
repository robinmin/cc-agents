---
name: performance
description: "JavaScript performance optimization: rendering, memory management, network, and bundle size optimization techniques."
see_also:
  - rd3:pl-javascript
---

# Performance Optimization Reference

Guide to JavaScript performance optimization techniques.

## Table of Contents

- [Rendering Performance](#rendering-performance)
- [Memory Management](#memory-management)
- [Network Performance](#network-performance)
- [Bundle Size](#bundle-size)
- [Runtime Performance](#runtime-performance)

---

## Rendering Performance

### Avoid Layout Thrashing

```javascript
// BAD: Read after write causes reflow
elements.forEach(el => {
  const height = el.offsetHeight;  // Read (triggers layout)
  el.style.height = height + 10 + 'px';  // Write (triggers layout)
});

// GOOD: Batch reads, then writes
const heights = Array.from(elements, el => el.offsetHeight);  // Read all
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px';  // Write all
});
```

### Use CSS Containment

```javascript
// Isolate paint areas
element.style.contains = 'layout paint';
// Options: none, strict, content, layout, paint, size

// Use for off-screen content
.offscreen {
  contain: layout;
}
```

### Virtualize Long Lists

```javascript
class VirtualScroller {
  #container;
  #itemHeight;
  #totalItems;
  #renderedItems = new Map();

  constructor(container, itemHeight, totalItems) {
    this.#container = container;
    this.#itemHeight = itemHeight;
    this.#totalItems = totalItems;

    container.addEventListener('scroll', () => this.render());
    this.render();
  }

  getVisibleRange() {
    const scrollTop = this.#container.scrollTop;
    const viewportHeight = this.#container.clientHeight;
    const start = Math.floor(scrollTop / this.#itemHeight);
    const end = Math.ceil((scrollTop + viewportHeight) / this.#itemHeight);
    return { start, end };
  }

  render() {
    const { start, end } = this.getVisibleRange();
    const fragment = document.createDocumentFragment();

    for (let i = start; i <= end; i++) {
      if (!this.#renderedItems.has(i)) {
        this.#renderedItems.set(i, this.createItem(i));
      }
      fragment.appendChild(this.#renderedItems.get(i));
    }

    this.#container.innerHTML = '';
    this.#container.appendChild(fragment);
  }
}
```

### Debounce/Throttle Scroll Events

```javascript
// Throttle for scroll-based animations
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

// Debounce for search inputs
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Usage
window.addEventListener('scroll', throttle(handleScroll, 16));  // ~60fps
searchInput.addEventListener('input', debounce(handleSearch, 300));
```

### Use requestAnimationFrame

```javascript
// For smooth animations
function animate() {
  updatePosition();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// Cancel when tab is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(animationId);
  } else {
    requestAnimationFrame(animate);
  }
});
```

### Passive Event Listeners

```javascript
// Improve scroll performance
window.addEventListener('scroll', handler, {
  passive: true
});

// For touch events
element.addEventListener('touchmove', handler, {
  passive: false  // If preventDefault is needed
});
```

---

## Memory Management

### Avoid Memory Leaks

```javascript
// BAD: Forgotten event listeners
element.addEventListener('click', handler);
// ... element removed but listener not removed

// GOOD: Clean up listeners
const controller = new AbortController();
element.addEventListener('click', handler, { signal: controller.signal });

// When done
controller.abort();

// BAD: Closures holding references
function createHandler() {
  return function() {
    console.log(largeData);  // largeData retained in memory
  };
}

// GOOD: Only capture what's needed
function createHandler() {
  const id = largeData.id;
  return function() {
    console.log(id);  // Only id retained
  };
}
```

### Use WeakMap/WeakSet

```javascript
// For object-to-value mappings that shouldn't prevent GC
const cache = new WeakMap();

function process(obj) {
  if (cache.has(obj)) {
    return cache.get(obj);
  }
  const result = expensiveComputation(obj);
  cache.set(obj, result);
  return result;
}

// WeakSet for tracking objects without preventing GC
const visited = new WeakSet();
if (!visited.has(obj)) {
  visited.add(obj);
  // Process obj
}
```

### Properly Clean Up Intervals

```javascript
// BAD
const intervalId = setInterval(doSomething, 1000);

// GOOD: Store reference and clear
const intervalId = setInterval(doSomething, 1000);
// When done:
clearInterval(intervalId);

// Or use AbortController pattern
const timerController = new AbortController();
setTimeout(doSomething, 1000, { signal: timerController.signal });
// When done:
timerController.abort();
```

### Avoid Creating Unnecessary Objects

```javascript
// BAD: Creating new objects in loops
for (let i = 0; i < 1000; i++) {
  const point = { x: i, y: i };  // New object each iteration
}

// GOOD: Reuse objects or use arrays
const point = { x: 0, y: 0 };
for (let i = 0; i < 1000; i++) {
  point.x = i;
  point.y = i;
  // Use point
}
```

---

## Network Performance

### Resource Hints

```html
<!-- Preconnect to critical origins -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Prefetch for next navigation -->
<link rel="prefetch" href="/next-page.html">

<!-- Preload critical resources -->
<link rel="preload" href="/critical.css" as="style">
<link rel="preload" href="/main.js" as="script">
```

### Lazy Load Non-Critical Resources

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

// Lazy load modules
button.addEventListener('click', async () => {
  const { heavyFeature } = await import('./heavy.js');
  heavyFeature.init();
});
```

### Cache Strategy

```javascript
// Stale-while-revalidate
async function fetchWithCache(url, cacheTime = 60000) {
  const cached = cache.get(url);

  if (cached && Date.now() - cached.timestamp < cacheTime) {
    return cached.data;
  }

  const response = await fetch(url);
  const data = await response.json();

  cache.set(url, { data, timestamp: Date.now() });

  return data;
}
```

### Optimize Request Batching

```javascript
// BAD: Multiple individual requests
for (const id of ids) {
  const item = await fetch(`/api/items/${id}`);
}

// GOOD: Batch request
const response = await fetch('/api/items', {
  method: 'POST',
  body: JSON.stringify({ ids }),
});
const items = await response.json();
```

---

## Bundle Size

### Code Splitting

```javascript
// Dynamic imports for route-based splitting
const routes = {
  home: () => import('./routes/Home.js'),
  about: () => import('./routes/About.js'),
};

// Component-level splitting
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
```

### Tree Shaking

```javascript
// Import only what you need
import { debounce, throttle } from 'lodash-es';

// Avoid side-effect imports
import 'lodash';  // Imports entire library

// Use named exports
import debounce from 'lodash/debounce';  // Only imports debounce
```

### Minification and Compression

```javascript
// Modern build tools (Vite, esbuild) handle this automatically
// Ensure production builds use:
// - Terser for JS minification
// - CSS minification
// - Gzip/Brotli compression
```

### Remove Dead Code

```javascript
// Use const for conditional branches
const isFeatureEnabled = process.env.ENABLE_FEATURE;

if (isFeatureEnabled) {
  // This code stays if feature enabled
}

// Tree shaking removes unused branches
// if (false) { deadCode(); }  // Completely removed
```

---

## Runtime Performance

### Optimize Loops

```javascript
// Prefer for...of for simple iteration
for (const item of array) {
  // ...
}

// Cache array length
for (let i = 0, len = arr.length; i < len; i++) {
  // ...
}

// For heavy operations, consider typed arrays
const ints = new Int32Array(largeArray);
```

### Use Maps for Frequent Lookups

```javascript
// BAD: Object lookups
const lookup = {};
if (lookup[key]) {  // Has to check prototype chain
  // ...
}

// GOOD: Map for frequent lookups
const lookup = new Map();
if (lookup.has(key)) {  // Direct hash lookup
  // ...
}
```

### Avoid Heavy Computations in Render

```javascript
// BAD: Heavy computation in render
function Component({ items }) {
  const sorted = items.sort((a, b) => expensiveSort(a, b));  // Runs every render
  return sorted.map(item => <div key={item.id}>{item.name}</div>);
}

// GOOD: Memoize expensive computations
function Component({ items }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => expensiveSort(a, b)),
    [items]
  );
  return sorted.map(item => <div key={item.id}>{item.name}</div>);
}
```

### Use Web Workers for Heavy Tasks

```javascript
// Main thread
const worker = new Worker('compute.js');

worker.postMessage({ data: largeDataset });

worker.onmessage = (e) => {
  const result = e.data;
  // Use result
};

// worker.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};
```

---

## Measurement Tools

### Performance API

```javascript
// Mark
performance.mark('process-start');

// Measure
performance.measure('process', 'process-start', 'process-end');

// Get measures
const measures = performance.getEntriesByType('measure');

// Navigation timing
const navTiming = performance.getEntriesByType('navigation')[0];
console.log('TTFB:', navTiming.responseStart);
console.log('DOM Interactive:', navTiming.domInteractive);
```

### User Timing API

```javascript
// For profiling specific operations
console.time('operation');
await heavyOperation();
console.timeEnd('operation');

// Or use Performance API
performance.mark('operation-start');
await heavyOperation();
performance.mark('operation-end');
performance.measure('operation', 'operation-start', 'operation-end');
```
