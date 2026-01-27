# DOM APIs Reference

Complete guide to DOM manipulation and browser APIs.

## Table of Contents

- [Querying Elements](#querying-elements)
- [Creating and Modifying Elements](#creating-and-modifying-elements)
- [Event Handling](#event-handling)
- [Event Delegation](#event-delegation)
- [Form Handling](#form-handling)
- [Mutation Observer](#mutation-observer)
- [Intersection Observer](#intersection-observer)
- [Resize Observer](#resize-observer)
- [Performance Considerations](#performance-considerations)

---

## Querying Elements

### Selectors

```javascript
// Single element
const element = document.querySelector('.my-class');
const byId = document.getElementById('my-id');
const byTag = document.getElementsByTagName('div');
const byClass = document.getElementsByClassName('my-class');

// Multiple elements
const elements = document.querySelectorAll('.items');
const collection = document.getElementsByClassName('items');

// Context-based queries
const container = document.querySelector('.container');
const button = container.querySelector('button');
const links = container.querySelectorAll('a');
```

### Traversal

```javascript
// Parent and children
const parent = element.parentElement;
const children = element.children;  // HTMLCollection
const firstChild = element.firstElementChild;
const lastChild = element.lastElementChild;

// Siblings
const next = element.nextElementSibling;
const previous = element.previousElementSibling;

// Finding elements
const closest = element.closest('.container');
const matches = element.matches('.button');
```

---

## Creating and Modifying Elements

### Creating Elements

```javascript
// Create element
const div = document.createElement('div');
const text = document.createTextNode('Hello');

// Create fragment
const fragment = document.createDocumentFragment();
fragment.appendChild(div);

// Create with template
const template = document.createElement('template');
template.innerHTML = '<div>Hello</div>';
const clone = template.content.cloneNode(true);
```

### Modifying Content

```javascript
// Text content
element.textContent = 'Hello';
element.innerText = 'Hello';  // Reflow-triggering, avoid

// HTML content
element.innerHTML = '<span>Hello</span>';

// Attributes
element.setAttribute('class', 'active');
element.getAttribute('class');
element.hasAttribute('class');
element.removeAttribute('class');

// Properties (preferred)
element.id = 'my-id';
element.className = 'my-class';
element.href = 'https://example.com';
```

### Classes

```javascript
// Add, remove, toggle
element.classList.add('active');
element.classList.remove('inactive');
element.classList.toggle('active');

// Check presence
element.classList.contains('active');

// Multiple classes
element.classList.add('active', 'visible', 'enabled');
element.classList.remove('active', 'visible');

// Replace
element.classList.replace('old', 'new');
```

### Styles

```javascript
// Inline styles
element.style.color = 'red';
element.style.fontSize = '16px';
element.style.backgroundColor = '#fff';

// CSS custom properties
element.style.setProperty('--color', 'red');
element.style.getPropertyValue('--color');

// Computed styles
const styles = window.getComputedStyle(element);
const color = styles.color;
```

### Insertion

```javascript
// Append/Prepend
parent.appendChild(child);
parent.prepend(child);

// Before/After
parent.insertBefore(newChild, referenceChild);
element.insertAdjacentElement('beforebegin', newElement);
element.insertAdjacentElement('afterbegin', newElement);
element.insertAdjacentElement('beforeend', newElement);
element.insertAdjacentElement('afterend', newElement);

// Insert HTML
element.insertAdjacentHTML('beforeend', '<span>Hello</span>');

// Insert text
element.insertAdjacentText('beforeend', 'Hello');
```

### Removal and Replacement

```javascript
// Remove element
element.remove();

// Remove child
parent.removeChild(child);

// Replace
parent.replaceChild(newChild, oldChild);
element.replaceWith(newElement);
```

---

## Event Handling

### Adding Event Listeners

```javascript
// Basic listener
element.addEventListener('click', handleClick);

// With options
element.addEventListener('click', handleClick, {
  capture: false,    // Use capture phase
  once: true,        // Remove after first trigger
  passive: true      // Don't prevent default
});

// With useCapture (legacy)
element.addEventListener('click', handleClick, false);
```

### Removing Event Listeners

```javascript
// Named function (removable)
function handler() {
  console.log('clicked');
}
element.addEventListener('click', handler);
element.removeEventListener('click', handler);

// AbortController (modern)
const controller = new AbortController();
element.addEventListener('click', handler, {
  signal: controller.signal
});
controller.abort();  // Remove all listeners with this signal
```

### Event Object

```javascript
function handleClick(event) {
  // Event type
  console.log(event.type);  // 'click'

  // Target element
  console.log(event.target);

  // Current target (listener element)
  console.log(event.currentTarget);

  // Coordinates
  console.log(event.clientX, event.clientY);

  // Prevent default behavior
  event.preventDefault();

  // Stop propagation
  event.stopPropagation();
  event.stopImmediatePropagation();
}
```

### Event Phases

```javascript
// Capture phase (outer to inner)
element.addEventListener('click', handler, {
  capture: true
});

// Bubble phase (inner to outer, default)
element.addEventListener('click', handler, {
  capture: false
});
```

### Common Events

```javascript
// Mouse events
click, dblclick, mousedown, mouseup, mousemove, mouseover, mouseout, mouseenter, mouseleave

// Keyboard events
keydown, keyup, keypress

// Form events
submit, change, input, focus, blur

// Document events
DOMContentLoaded, load, unload, beforeunload, resize, scroll

// Touch events
touchstart, touchmove, touchend, touchcancel
```

---

## Event Delegation

### Pattern

```javascript
// Single listener for multiple elements
document.addEventListener('click', (e) => {
  const button = e.target.closest('button');

  if (button && button.matches('.action-button')) {
    handleAction(button);
  }
});
```

### Benefits

- Works for dynamically added elements
- Single listener for many elements
- Better performance
- Automatic cleanup

### Example

```javascript
// List with dynamic items
const list = document.querySelector('.list');

list.addEventListener('click', (e) => {
  const item = e.target.closest('.list-item');

  if (item && list.contains(item)) {
    const id = item.dataset.id;
    handleItemClick(id);
  }
});

// Add new items (no need to reattach listeners)
function addItem(id) {
  const item = document.createElement('div');
  item.className = 'list-item';
  item.dataset.id = id;
  item.textContent = `Item ${id}`;
  list.appendChild(item);
}
```

---

## Form Handling

### Form Elements

```javascript
// Get form
const form = document.querySelector('form');

// Get form data
const formData = new FormData(form);
const data = Object.fromEntries(formData);

// Get specific elements
const inputs = form.querySelectorAll('input, select, textarea');
const nameInput = form.querySelector('[name="name"]');

// Get values
const value = input.value;
const checked = checkbox.checked;
const selected = select.value;
```

### Validation

```javascript
// Native validation
input.required = true;
input.pattern = '[A-Za-z]{3}';
input.minlength = 3;
input.maxlength = 10;

// Check validity
if (input.checkValidity()) {
  console.log('Valid');
} else {
  console.log(input.validationMessage);
}

// Custom validation
input.setCustomValidity('Custom error message');
input.reportValidity();

// Form validation
if (form.checkValidity()) {
  form.submit();
}
```

### Form Events

```javascript
// Submit event
form.addEventListener('submit', (e) => {
  e.preventDefault();
  // Handle form submission
});

// Input event (real-time)
input.addEventListener('input', (e) => {
  console.log(e.target.value);
});

// Change event (on blur)
select.addEventListener('change', (e) => {
  console.log(e.target.value);
});
```

---

## Mutation Observer

### Basic Usage

```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    console.log('Mutation:', mutation.type);
  });
});

observer.observe(element, {
  childList: true,      // Child nodes
  subtree: true,        // Descendants
  attributes: true,     // Attributes
  characterData: true,  // Text content
  attributeOldValue: true,
  characterDataOldValue: true,
  attributeFilter: ['class', 'id']
});

// Disconnect
observer.disconnect();
```

### Mutation Types

```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    switch (mutation.type) {
      case 'childList':
        mutation.addedNodes.forEach(node => {
          console.log('Added:', node);
        });
        mutation.removedNodes.forEach(node => {
          console.log('Removed:', node);
        });
        break;

      case 'attributes':
        console.log(`Attribute ${mutation.attributeName} changed`);
        console.log('Old value:', mutation.oldValue);
        break;

      case 'characterData':
        console.log('Text changed:', mutation.target.data);
        break;
    }
  });
});
```

---

## Intersection Observer

### Lazy Loading Images

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.classList.remove('lazy');
      observer.unobserve(img);
    }
  });
}, {
  root: null,          // viewport
  rootMargin: '0px',   // margin around root
  threshold: 0.1       // 10% visible
});

document.querySelectorAll('img.lazy').forEach(img => {
  observer.observe(img);
});
```

### Infinite Scroll

```javascript
const sentinel = document.querySelector('#sentinel');

const observer = new IntersectionObserver(async (entries) => {
  const entry = entries[0];
  if (entry.isIntersecting) {
    await loadMoreContent();
  }
});

observer.observe(sentinel);
```

### Detecting Visibility

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    } else {
      entry.target.classList.remove('visible');
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.animate').forEach(el => {
  observer.observe(el);
});
```

---

## Resize Observer

### Responsive Elements

```javascript
const observer = new ResizeObserver(entries => {
  entries.forEach(entry => {
    const { width, height } = entry.contentRect;
    console.log(`Size: ${width}x${height}`);

    // Adjust layout based on size
    if (width < 500) {
      entry.target.classList.add('compact');
    } else {
      entry.target.classList.remove('compact');
    }
  });
});

observer.observe(element);
```

### Aspect Ratio

```javascript
const observer = new ResizeObserver(entries => {
  entries.forEach(entry => {
    const { width, height } = entry.contentRect;
    const ratio = width / height;

    if (ratio > 1) {
      entry.target.classList.add('landscape');
    } else {
      entry.target.classList.add('portrait');
    }
  });
});
```

---

## Performance Considerations

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
  el.style.height = el.offsetHeight + 10 + 'px';  // Read then write
});

// DO: Batch reads then writes
const heights = Array.from(elements, el => el.offsetHeight);  // All reads
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px';  // All writes
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

### Passive Event Listeners

```javascript
// For scroll/touch events (improve performance)
element.addEventListener('touchstart', handleTouch, {
  passive: true
});
```

### requestAnimationFrame

```javascript
// For animations
function animate() {
  updatePosition();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

### Virtual Scrolling

For large lists, render only visible items:

```javascript
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

## Browser APIs

### Local Storage

```javascript
// Storing data
localStorage.setItem('key', 'value');
localStorage.setItem('user', JSON.stringify(user));

// Retrieving data
const value = localStorage.getItem('key');
const user = JSON.parse(localStorage.getItem('user'));

// Removing data
localStorage.removeItem('key');
localStorage.clear();

// Check availability
if (typeof Storage !== 'undefined') {
  // Storage is available
}
```

### Session Storage

```javascript
// Same API as localStorage
sessionStorage.setItem('key', 'value');
const value = sessionStorage.getItem('key');
```

### Fetch API

```javascript
// GET request
async function get(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

// POST request
async function post(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return await response.json();
}

// POST with FormData
async function upload(url, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  return await response.json();
}
```

### History API

```javascript
// Push state
history.pushState({ page: 1 }, '', '/page/1');

// Replace state
history.replaceState({ page: 2 }, '', '/page/2');

// Navigate
history.back();
history.forward();
history.go(-2);

// Listen for changes
window.addEventListener('popstate', (e) => {
  console.log('State:', e.state);
});
```

### Geolocation API

```javascript
navigator.geolocation.getCurrentPosition(
  (position) => {
    console.log('Lat:', position.coords.latitude);
    console.log('Lon:', position.coords.longitude);
  },
  (error) => {
    console.error('Error:', error);
  }
);
```

### Clipboard API

```javascript
// Copy text
await navigator.clipboard.writeText('Hello, world!');

// Read text
const text = await navigator.clipboard.readText();
```

---

## Best Practices

### Accessibility

```javascript
// Use ARIA attributes
button.setAttribute('aria-label', 'Close');
button.setAttribute('aria-expanded', 'false');

// Announce changes to screen readers
const announcement = document.createElement('div');
announcement.setAttribute('role', 'status');
announcement.setAttribute('aria-live', 'polite');
announcement.textContent = 'Content loaded';
```

### Cleanup

```javascript
// Remove listeners when done
const handler = () => console.log('clicked');
element.addEventListener('click', handler);
// Later:
element.removeEventListener('click', handler);

// Disconnect observers
observer.disconnect();

// Clear intervals
clearInterval(intervalId);
```

### Security

```javascript
// Sanitize HTML before inserting
function sanitize(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}

// Use textContent for user input
element.textContent = userInput;  // Safe
element.innerHTML = userInput;    // Unsafe (XSS risk)
```
