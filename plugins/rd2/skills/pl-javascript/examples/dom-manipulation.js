/**
 * DOM Manipulation Examples
 *
 * This file demonstrates various DOM manipulation patterns for JavaScript development.
 */

// ============================================================================
// QUERYING ELEMENTS
// ============================================================================

/**
 * Various ways to query elements
 */
function demonstrateQuerying() {
  // By ID
  const byId = document.getElementById('my-id');

  // By CSS selector (single)
  const bySelector = document.querySelector('.my-class');
  const button = document.querySelector('button.primary');

  // By CSS selector (multiple)
  const allByClass = document.querySelectorAll('.item');
  const allButtons = document.querySelectorAll('button');

  // By tag name
  const allDivs = document.getElementsByTagName('div');

  // By class name
  const byClass = document.getElementsByClassName('my-class');

  // Context-based queries
  const container = document.querySelector('.container');
  const containerButton = container.querySelector('button');
  const containerLinks = container.querySelectorAll('a');
}

// ============================================================================
// CREATING ELEMENTS
// ============================================================================

/**
 * Create element with attributes and content
 */
function createElement(tag, options = {}) {
  const element = document.createElement(tag);

  // Set attributes
  if (options.id) element.id = options.id;
  if (options.className) element.className = options.className;
  if (options.textContent) element.textContent = options.textContent;
  if (options.innerHTML) element.innerHTML = options.innerHTML;

  // Set dataset
  if (options.dataset) {
    Object.entries(options.dataset).forEach(([key, value]) => {
      element.dataset[key] = value;
    });
  }

  // Set attributes object
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  return element;
}

// Usage:
const button = createElement('button', {
  className: 'btn btn-primary',
  textContent: 'Click me',
  dataset: { action: 'save', id: '123' }
});
console.log('Button created:', button);

/**
 * Create elements from template
 */
function createFromTemplate(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

// Usage:
const card = createFromTemplate(`
  <div class="card">
    <h2 class="card-title">Title</h2>
    <p class="card-body">Content</p>
  </div>
`);
console.log('Card created from template:', card);

// ============================================================================
// INSERTING ELEMENTS
// ============================================================================

/**
 * Various insertion methods
 */
function demonstrateInsertion() {
  const parent = document.querySelector('.container');
  const child = document.createElement('div');
  child.textContent = 'Child element';

  // Append (last child)
  parent.appendChild(child);

  // Prepend (first child)
  parent.prepend(child);

  // Insert before reference
  const reference = parent.querySelector('.reference');
  parent.insertBefore(child, reference);

  // Insert with insertAdjacentElement
  reference.insertAdjacentElement('beforebegin', child);
  reference.insertAdjacentElement('afterbegin', child);
  reference.insertAdjacentElement('beforeend', child);
  reference.insertAdjacentElement('afterend', child);
}

/**
 * Batch insert with DocumentFragment
 */
function batchInsert(items) {
  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    fragment.appendChild(li);
  });

  document.querySelector('ul').appendChild(fragment);
}

// ============================================================================
// MODIFYING ELEMENTS
// ============================================================================

/**
 * Modify element classes
 */
function modifyClasses(element) {
  // Add class
  element.classList.add('active');

  // Remove class
  element.classList.remove('inactive');

  // Toggle class
  element.classList.toggle('visible');

  // Check if has class
  const hasClass = element.classList.contains('active');
  console.log('Has active class:', hasClass);

  // Replace class
  element.classList.replace('old', 'new');

  // Add multiple classes
  element.classList.add('class1', 'class2', 'class3');

  // Force state parameter in toggle
  element.classList.toggle('active', true);  // Add
  element.classList.toggle('active', false); // Remove
}

/**
 * Modify element styles
 */
function modifyStyles(element) {
  // Set individual styles
  element.style.color = 'red';
  element.style.fontSize = '16px';
  element.style.backgroundColor = '#fff';

  // Set CSS custom property
  element.style.setProperty('--color', 'blue');

  // Get computed style
  const styles = window.getComputedStyle(element);
  const color = styles.color;
  console.log('Computed color:', color);

  // Set multiple styles with cssText
  element.style.cssText = 'color: red; font-size: 16px;';
}

/**
 * Modify attributes
 */
function modifyAttributes(element) {
  // Set attribute
  element.setAttribute('aria-label', 'Close button');

  // Get attribute
  const label = element.getAttribute('aria-label');
  console.log('ARIA label:', label);

  // Check if has attribute
  const hasLabel = element.hasAttribute('aria-label');
  console.log('Has ARIA label:', hasLabel);

  // Remove attribute
  element.removeAttribute('aria-label');

  // Data attributes
  element.dataset.userId = '123';
  const userId = element.dataset.userId;
  console.log('User ID:', userId);
}

// ============================================================================
// REMOVING ELEMENTS
// ============================================================================

/**
 * Remove element
 */
function removeElement(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.remove();
  }
}

/**
 * Remove all children
 */
function removeChildren(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

/**
 * Replace element
 */
function replaceElement(oldSelector, newElement) {
  const oldElement = document.querySelector(oldSelector);
  if (oldElement && oldElement.parentNode) {
    oldElement.parentNode.replaceChild(newElement, oldElement);
  }
}

// ============================================================================
// DOM MANIPULATION EXAMPLES
// ============================================================================

/**
 * Create todo list item
 */
function createTodoItem(text) {
  const li = document.createElement('li');
  li.className = 'todo-item';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-checkbox';

  const span = document.createElement('span');
  span.textContent = text;
  span.className = 'todo-text';

  const button = document.createElement('button');
  button.textContent = 'Delete';
  button.className = 'todo-delete';
  button.dataset.action = 'delete';

  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(button);

  return li;
}

/**
 * Create card component
 */
function createCard(title, content, footer = null) {
  const card = document.createElement('div');
  card.className = 'card';

  const header = document.createElement('div');
  header.className = 'card-header';
  const titleElement = document.createElement('h3');
  titleElement.textContent = title;
  header.appendChild(titleElement);

  const body = document.createElement('div');
  body.className = 'card-body';
  body.textContent = content;

  card.appendChild(header);
  card.appendChild(body);

  if (footer) {
    const footerElement = document.createElement('div');
    footerElement.className = 'card-footer';
    footerElement.textContent = footer;
    card.appendChild(footerElement);
  }

  return card;
}

/**
 * Build table from data
 */
function buildTable(headers, rows) {
  const table = document.createElement('table');
  table.className = 'data-table';

  // Create header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement('tbody');

  rows.forEach(row => {
    const tr = document.createElement('tr');

    row.forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  return table;
}

// Usage:
const table = buildTable(
  ['Name', 'Age', 'City'],
  [
    ['Alice', 30, 'New York'],
    ['Bob', 25, 'Los Angeles'],
    ['Charlie', 35, 'Chicago']
  ]
);
console.log('Table built with', table.rows.length, 'rows');

// ============================================================================
// FORM HANDLING
// ============================================================================

/**
 * Get form data as object
 */
function getFormData(form) {
  const formData = new FormData(form);
  return Object.fromEntries(formData);
}

/**
 * Populate form from object
 */
function populateForm(form, data) {
  Object.entries(data).forEach(([key, value]) => {
    const input = form.querySelector(`[name="${key}"]`);
    if (input) {
      if (input.type === 'checkbox') {
        input.checked = value;
      } else if (input.type === 'radio') {
        const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
        if (radio) radio.checked = true;
      } else {
        input.value = value;
      }
    }
  });
}

/**
 * Clear form
 */
function clearForm(form) {
  form.reset();

  // Also clear custom validation
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.setCustomValidity('');
  });
}

// ============================================================================
// EVENT DELEGATION
// ============================================================================

/**
 * Setup delegated event handler for list
 */
function setupListDelegation(listSelector) {
  const list = document.querySelector(listSelector);

  list.addEventListener('click', (e) => {
    const deleteButton = e.target.closest('.delete-button');
    if (deleteButton && list.contains(deleteButton)) {
      const item = deleteButton.closest('.list-item');
      item.remove();
    }

    const editButton = e.target.closest('.edit-button');
    if (editButton && list.contains(editButton)) {
      const item = editButton.closest('.list-item');
      editItem(item);
    }
  });
}

function editItem(item) {
  console.log('Editing item:', item.dataset.id);
}

// ============================================================================
// MUTATION OBSERVER
// ============================================================================

/**
 * Observe DOM changes
 */
function observeElementChanges(element, callback) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      callback(mutation);
    });
  });

  observer.observe(element, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });

  return observer;
}

// ============================================================================
// ANIMATION
// ============================================================================

/**
 * Animate element with Web Animations API
 */
function animateElement(element, keyframes, options = {}) {
  const defaultOptions = {
    duration: 300,
    easing: 'ease-in-out'
  };

  return element.animate(keyframes, { ...defaultOptions, ...options });
}

// Usage:
animateElement(element, [
  { opacity: 0, transform: 'translateY(-10px)' },
  { opacity: 1, transform: 'translateY(0)' }
]);

/**
 * Fade in element
 */
function fadeIn(element, duration = 300) {
  return element.animate([
    { opacity: 0 },
    { opacity: 1 }
  ], { duration }).finished;
}

/**
 * Fade out element
 */
function fadeOut(element, duration = 300) {
  return element.animate([
    { opacity: 1 },
    { opacity: 0 }
  ], { duration }).finished.then(() => {
    element.style.display = 'none';
  });
}

/**
 * Slide in element
 */
function slideIn(element, direction = 'down', duration = 300) {
  const transforms = {
    up: ['translateY(100%)', 'translateY(0)'],
    down: ['translateY(-100%)', 'translateY(0)'],
    left: ['translateX(100%)', 'translateX(0)'],
    right: ['translateX(-100%)', 'translateX(0)']
  };

  return element.animate([
    { transform: transforms[direction][0], opacity: 0 },
    { transform: transforms[direction][1], opacity: 1 }
  ], { duration }).finished;
}

export {
  demonstrateQuerying,
  createElement,
  createFromTemplate,
  demonstrateInsertion,
  batchInsert,
  demonstrateModification,
  modifyClasses,
  modifyStyles,
  modifyAttributes,
  removeElement,
  removeChildren,
  replaceElement,
  createTodoItem,
  createCard,
  buildTable,
  getFormData,
  populateForm,
  clearForm,
  setupListDelegation,
  observeElementChanges,
  animateElement,
  fadeIn,
  fadeOut,
  slideIn
};
