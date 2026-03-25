---
name: ui-patterns
description: "Advanced UI patterns: modal dialogs, dropdowns, tabs, toast notifications, loading states, accordion, tooltips, breadcrumbs, and focus management with ARIA patterns."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
type: reference
tags: [ui-ux, modal, dropdown, tabs, toast, accordion, tooltip, loading, aria, focus-management]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:ui-ux-design
  - rd3:frontend-design
  - rd3:ui-ux-design/references/accessibility
  - rd3:ui-ux-design/references/component-patterns
---

# UI Patterns Reference

Implementation patterns for common UI components with accessibility requirements.

## Modal/Dialog

### Structure

```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <header class="modal-header">
    <h2 id="modal-title">Modal Title</h2>
    <button
      type="button"
      aria-label="Close dialog"
      class="modal-close"
    >
      <svg><!-- close icon --></svg>
    </button>
  </header>
  <div id="modal-description" class="modal-body">
    <!-- Content -->
  </div>
  <footer class="modal-footer">
    <button type="button" class="btn-secondary">Cancel</button>
    <button type="button" class="btn-primary">Confirm</button>
  </footer>
</div>
<div class="modal-backdrop" aria-hidden="true"></div>
```

### Accessibility Requirements

- `role="dialog"` and `aria-modal="true"`
- Label via `aria-labelledby` pointing to title
- Optional description via `aria-describedby`
- Focus trapped inside modal
- First focusable element receives focus on open
- Escape key closes modal
- Focus returns to trigger element on close

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move to next focusable element |
| Shift+Tab | Move to previous focusable element |
| Escape | Close modal |

## Dropdown/Select

### Structure

```html
<div class="dropdown">
  <button
    type="button"
    role="combobox"
    aria-expanded="false"
    aria-haspopup="listbox"
    aria-controls="dropdown-list"
    aria-label="Select option"
  >
    <span class="dropdown-value">Select...</span>
    <svg class="dropdown-icon"><!-- chevron --></svg>
  </button>
  <ul
    id="dropdown-list"
    role="listbox"
    aria-label="Options"
    hidden
  >
    <li role="option" aria-selected="false">Option 1</li>
    <li role="option" aria-selected="true">Option 2</li>
    <li role="option" aria-selected="false">Option 3</li>
  </ul>
</div>
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Enter/Space | Open dropdown, select highlighted |
| Arrow Down | Move highlight down |
| Arrow Up | Move highlight up |
| Home | Move to first option |
| End | Move to last option |
| Escape | Close dropdown |

## Tabs

### Structure

```html
<div class="tabs">
  <div role="tablist" aria-label="Content tabs">
    <button
      role="tab"
      aria-selected="true"
      aria-controls="panel-1"
      id="tab-1"
    >
      Tab 1
    </button>
    <button
      role="tab"
      aria-selected="false"
      aria-controls="panel-2"
      id="tab-2"
      tabindex="-1"
    >
      Tab 2
    </button>
  </div>
  <div
    role="tabpanel"
    id="panel-1"
    aria-labelledby="tab-1"
  >
    Panel 1 content
  </div>
  <div
    role="tabpanel"
    id="panel-2"
    aria-labelledby="tab-2"
    hidden
  >
    Panel 2 content
  </div>
</div>
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Left/Right | Move focus between tabs |
| Home | Move to first tab |
| End | Move to last tab |
| Enter/Space | Activate focused tab |

## Toast/Notification

### Structure

```html
<div
  role="status"
  aria-live="polite"
  class="toast toast-success"
>
  <svg class="toast-icon"><!-- icon --></svg>
  <div class="toast-content">
    <p class="toast-title">Success</p>
    <p class="toast-message">Your changes have been saved.</p>
  </div>
  <button
    type="button"
    aria-label="Dismiss notification"
    class="toast-close"
  >
    <svg><!-- x icon --></svg>
  </button>
</div>
```

### Types

| Type | Use Case | Icon | Color |
|------|----------|------|-------|
| Success | Action completed | Checkmark | Green |
| Error | Action failed | X or ! | Red |
| Warning | Needs attention | Triangle ! | Yellow |
| Info | Informational | i | Blue |

### Accessibility

- `role="status"` for non-critical notifications
- `role="alert"` for critical/error notifications
- `aria-live="polite"` (waits for user pause) or `aria-live="assertive"` (interrupts)
- Close button must be accessible
- Auto-dismiss should be pauseable on hover

## Loading States

### Skeleton Screen

```html
<div class="skeleton-card" aria-busy="true" aria-label="Loading content">
  <div class="skeleton skeleton-image"></div>
  <div class="skeleton skeleton-title"></div>
  <div class="skeleton skeleton-text"></div>
  <div class="skeleton skeleton-text skeleton-text-short"></div>
</div>
```

```css
.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Loading Spinner

```html
<button type="button" disabled aria-busy="true">
  <svg class="spinner" aria-hidden="true"><!-- spinner --></svg>
  <span>Saving...</span>
</button>
```

### Progress Indicator

```html
<div
  role="progressbar"
  aria-valuenow="60"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Upload progress"
>
  <div class="progress-bar" style="width: 60%"></div>
</div>
```

## Accordion

### Structure

```html
<div class="accordion">
  <div class="accordion-item">
    <h3>
      <button
        type="button"
        aria-expanded="true"
        aria-controls="panel-1"
        class="accordion-trigger"
      >
        Section 1
        <svg class="accordion-icon"><!-- chevron --></svg>
      </button>
    </h3>
    <div id="panel-1" class="accordion-panel">
      Panel 1 content
    </div>
  </div>
  <div class="accordion-item">
    <h3>
      <button
        type="button"
        aria-expanded="false"
        aria-controls="panel-2"
        class="accordion-trigger"
      >
        Section 2
        <svg class="accordion-icon"><!-- chevron --></svg>
      </button>
    </h3>
    <div id="panel-2" class="accordion-panel" hidden>
      Panel 2 content
    </div>
  </div>
</div>
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Enter/Space | Toggle panel |
| Arrow Down | Move to next header |
| Arrow Up | Move to previous header |
| Home | Move to first header |
| End | Move to last header |

## Tooltip

### Structure

```html
<button
  type="button"
  aria-describedby="tooltip-1"
  data-tooltip
>
  <svg aria-hidden="true"><!-- info icon --></svg>
</button>
<div id="tooltip-1" role="tooltip" class="tooltip" hidden>
  Helpful description text
</div>
```

### Accessibility

- Use `role="tooltip"` on the tooltip content
- Connect trigger with `aria-describedby`
- Tooltip must be focusable or triggered by focusable element
- Should not contain interactive content

## Breadcrumb

### Structure

```html
<nav aria-label="Breadcrumb">
  <ol class="breadcrumb">
    <li>
      <a href="/">Home</a>
    </li>
    <li>
      <a href="/products">Products</a>
    </li>
    <li>
      <a href="/products/electronics">Electronics</a>
    </li>
    <li aria-current="page">
      <span>Smartphones</span>
    </li>
  </ol>
</nav>
```

### Guidelines

- Use `nav` with `aria-label="Breadcrumb"`
- Use ordered list (`ol`) for structure
- Current page marked with `aria-current="page"`
- Current page is not a link
- Separator added via CSS, not content

## Focus Management

### Modal Focus Trap

```typescript
// On modal open
const previousFocus = document.activeElement;
modal.querySelector('[autofocus]')?.focus();

// Trap focus
modal.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

// On modal close
previousFocus.focus();
```

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
