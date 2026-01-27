/**
 * Event Handling Examples
 *
 * This file demonstrates various event handling patterns for JavaScript development.
 */

// ============================================================================
// BASIC EVENT LISTENERS
// ============================================================================

/**
 * Basic click handler
 */
function setupClickHandler() {
  const button = document.querySelector('.button');

  button.addEventListener('click', (e) => {
    console.log('Button clicked!');
    console.log('Event target:', e.target);
    console.log('Coordinates:', e.clientX, e.clientY);
  });
}

/**
 * Handler with options
 */
function setupAdvancedHandler() {
  const button = document.querySelector('.button');

  button.addEventListener('click', handleClick, {
    capture: false,    // Use bubble phase
    once: true,        // Remove after first trigger
    passive: true      // Improve scroll performance
  });
}

function handleClick(e) {
  console.log('Clicked once');
}

// ============================================================================
// EVENT DELEGATION
// ============================================================================

/**
 * Event delegation for dynamic elements
 */
function setupEventDelegation() {
  const list = document.querySelector('.list');

  list.addEventListener('click', (e) => {
    const item = e.target.closest('.list-item');

    if (item && list.contains(item)) {
      const id = item.dataset.id;
      console.log('Clicked item:', id);
      handleItemClick(item);
    }
  });
}

function handleItemClick(item) {
  console.log('Handling item click:', item.dataset.id);
}

/**
 * Delegated handler for multiple button types
 */
function setupMultiButtonHandler() {
  const container = document.querySelector('.container');

  container.addEventListener('click', (e) => {
    const button = e.target.closest('button');

    if (!button || !container.contains(button)) {
      return;
    }

    switch (button.dataset.action) {
      case 'save':
        handleSave(button);
        break;
      case 'delete':
        handleDelete(button);
        break;
      case 'edit':
        handleEdit(button);
        break;
    }
  });
}

function handleSave(button) {
  console.log('Save clicked for:', button.dataset.id);
}

function handleDelete(button) {
  console.log('Delete clicked for:', button.dataset.id);
}

function handleEdit(button) {
  console.log('Edit clicked for:', button.dataset.id);
}

// ============================================================================
// PASSIVE EVENT LISTENERS
// ============================================================================

/**
 * Passive listener for scroll events (improves performance)
 */
function setupScrollListener() {
  window.addEventListener('scroll', handleScroll, {
    passive: true
  });
}

function handleScroll(e) {
  console.log('Scroll position:', window.scrollY);
}

/**
 * Passive listener for touch events
 */
function setupTouchListener() {
  const element = document.querySelector('.touch-element');

  element.addEventListener('touchstart', handleTouchStart, {
    passive: true
  });

  element.addEventListener('touchmove', handleTouchMove, {
    passive: true
  });
}

function handleTouchStart(e) {
  console.log('Touch started');
}

function handleTouchMove(e) {
  console.log('Touch moved');
}

// ============================================================================
// CUSTOM EVENTS
// ============================================================================

/**
 * Dispatch custom event
 */
function dispatchCustomEvent(data) {
  const event = new CustomEvent('data-loaded', {
    detail: { data },
    bubbles: true,
    cancelable: true
  });

  document.dispatchEvent(event);
}

/**
 * Listen for custom event
 */
function setupCustomEventListener() {
  document.addEventListener('data-loaded', (e) => {
    console.log('Data loaded:', e.detail.data);
  });
}

/**
 * Custom event with callbacks
 */
function loadDataWithEvents(url) {
  // Dispatch loading event
  document.dispatchEvent(new CustomEvent('data-loading'));

  fetch(url)
    .then(response => response.json())
    .then(data => {
      // Dispatch success event
      document.dispatchEvent(new CustomEvent('data-loaded', {
        detail: { data }
      }));
    })
    .catch(error => {
      // Dispatch error event
      document.dispatchEvent(new CustomEvent('data-error', {
        detail: { error }
      }));
    });
}

// ============================================================================
// EVENT CLEANUP
// ============================================================================

/**
 * Remove event listener with named function
 */
function setupRemovableHandler() {
  const button = document.querySelector('.button');

  const handler = () => {
    console.log('Button clicked');
    button.removeEventListener('click', handler);
  };

  button.addEventListener('click', handler);
}

/**
 * Remove event listener with AbortController
 */
function setupAbortableHandler() {
  const button = document.querySelector('.button');
  const controller = new AbortController();

  button.addEventListener('click', () => {
    console.log('Button clicked');
  }, {
    signal: controller.signal
  });

  // Later, to remove the listener:
  controller.abort();
}

/**
 * Cleanup class for managing event listeners
 */
class EventCleanup {
  constructor() {
    this.listeners = [];
  }

  add(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    this.listeners.push({ element, event, handler, options });
  }

  removeAll() {
    this.listeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    this.listeners = [];
  }
}

// Usage:
const cleanup = new EventCleanup();
const button = document.querySelector('.button');
cleanup.add(button, 'click', handleClick);

// Later:
cleanup.removeAll();

// ============================================================================
// MOUSE EVENTS
// ============================================================================

/**
 * Track mouse movement
 */
function setupMouseTracker() {
  const element = document.querySelector('.tracker');

  element.addEventListener('mousemove', (e) => {
    const { offsetX, offsetY } = e;
    console.log(`Mouse position: ${offsetX}, ${offsetY}`);
  });
}

/**
 * Drag and drop with mouse events
 */
function setupDragAndDrop() {
  const draggable = document.querySelector('.draggable');
  let isDragging = false;
  let startX, startY, initialX, initialY;

  draggable.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialX = draggable.offsetLeft;
    initialY = draggable.offsetTop;
    draggable.classList.add('dragging');
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    draggable.style.left = `${initialX + dx}px`;
    draggable.style.top = `${initialY + dy}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    draggable.classList.remove('dragging');
  });
}

// ============================================================================
// KEYBOARD EVENTS
// ============================================================================

/**
 * Keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }

    // Escape to cancel
    if (e.key === 'Escape') {
      handleCancel();
    }

    // Enter to submit
    if (e.key === 'Enter') {
      handleSubmit();
    }
  });
}

function handleSave() {
  console.log('Saving...');
}

function handleCancel() {
  console.log('Cancelled');
}

function handleSubmit() {
  console.log('Submitted');
}

/**
 * Keyboard navigation
 */
function setupKeyboardNavigation() {
  const items = document.querySelectorAll('.nav-item');

  document.addEventListener('keydown', (e) => {
    const currentIndex = Array.from(items).findIndex(item =>
      item === document.activeElement
    );

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex].focus();
        break;

      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        items[prevIndex].focus();
        break;
    }
  });
}

// ============================================================================
// FORM EVENTS
// ============================================================================

/**
 * Form submission handling
 */
function setupFormHandler() {
  const form = document.querySelector('form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
      await submitForm(data);
      console.log('Form submitted successfully');
    } catch (error) {
      console.error('Form submission failed:', error);
    }
  });
}

async function submitForm(data) {
  const response = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await response.json();
}

/**
 * Real-time validation
 */
function setupRealTimeValidation() {
  const input = document.querySelector('input[name="email"]');

  input.addEventListener('input', debounce((e) => {
    const email = e.target.value;
    const isValid = validateEmail(email);

    if (isValid) {
      input.classList.remove('invalid');
      input.classList.add('valid');
    } else {
      input.classList.remove('valid');
      input.classList.add('invalid');
    }
  }, 300));
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================================
// DEBOUNCE AND THROTTLE
// ============================================================================

/**
 * Debounce utility
 */
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle utility
 */
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

// ============================================================================
// RESIZE OBSERVER
// ============================================================================

/**
 * Responsive behavior with ResizeObserver
 */
function setupResizeObserver() {
  const element = document.querySelector('.responsive');

  const observer = new ResizeObserver(entries => {
    entries.forEach(entry => {
      const { width, height } = entry.contentRect;

      if (width < 500) {
        element.classList.add('compact');
      } else {
        element.classList.remove('compact');
      }
    });
  });

  observer.observe(element);

  // Return cleanup function
  return () => observer.disconnect();
}

// ============================================================================
// INTERSECTION OBSERVER
// ============================================================================

/**
 * Lazy loading images
 */
function setupLazyLoading() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        observer.unobserve(img);
      }
    });
  });

  document.querySelectorAll('img.lazy').forEach(img => {
    observer.observe(img);
  });
}

/**
 * Infinite scroll
 */
function setupInfiniteScroll() {
  const sentinel = document.querySelector('#sentinel');

  const observer = new IntersectionObserver(async (entries) => {
    if (entries[0].isIntersecting) {
      await loadMoreContent();
    }
  });

  observer.observe(sentinel);
}

async function loadMoreContent() {
  const content = await fetch('/api/more').then(r => r.json());
  // Append content to page
}

export {
  setupClickHandler,
  setupAdvancedHandler,
  setupEventDelegation,
  setupMultiButtonHandler,
  setupScrollListener,
  setupTouchListener,
  setupCustomEventListener,
  dispatchCustomEvent,
  loadDataWithEvents,
  setupRemovableHandler,
  setupAbortableHandler,
  EventCleanup,
  setupMouseTracker,
  setupDragAndDrop,
  setupKeyboardShortcuts,
  setupKeyboardNavigation,
  setupFormHandler,
  setupRealTimeValidation,
  debounce,
  throttle,
  setupResizeObserver,
  setupLazyLoading,
  setupInfiniteScroll
};
