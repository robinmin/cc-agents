# Common UI Patterns Reference

Detailed implementation patterns for common UI components with accessibility requirements.

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
      <svg>...</svg>
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

### Behavior

| Feature | Implementation |
|---------|---------------|
| Overlay backdrop | Semi-transparent, darkens content |
| Close button | Top-right, visible, accessible |
| Escape key | Closes modal |
| Click outside | Closes modal (optional) |
| Focus trap | Tab cycles within modal |
| Return focus | Focus returns to trigger on close |

### Accessibility Requirements

- `role="dialog"` and `aria-modal="true"`
- Label via `aria-labelledby` pointing to title
- Optional description via `aria-describedby`
- Focus trapped inside modal
- First focusable element receives focus on open
- Escape key closes modal
- Focus returns to trigger element on close

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
    <svg class="dropdown-icon">...</svg>
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

### Behavior

| Feature | Implementation |
|---------|---------------|
| Trigger | Button shows selected value |
| List position | Below trigger, aligned |
| Keyboard nav | Arrow keys move highlight |
| Selection | Enter/Space selects |
| Dismiss | Click outside or Escape |
| Scrollable | If list exceeds max-height |

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Enter/Space | Open dropdown, select highlighted |
| Arrow Down | Move highlight down |
| Arrow Up | Move highlight up |
| Home | Move to first option |
| End | Move to last option |
| Escape | Close dropdown |
| Type character | Jump to matching option |

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
    <button
      role="tab"
      aria-selected="false"
      aria-controls="panel-3"
      id="tab-3"
      tabindex="-1"
    >
      Tab 3
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
  <div
    role="tabpanel"
    id="panel-3"
    aria-labelledby="tab-3"
    hidden
  >
    Panel 3 content
  </div>
</div>
```

### Behavior

| Feature | Implementation |
|---------|---------------|
| Active indicator | Visual distinction (underline, background) |
| Keyboard nav | Arrow keys move between tabs |
| Activation | Enter/Space activates tab |
| Panel display | Shows associated panel |

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
  <svg class="toast-icon">...</svg>
  <div class="toast-content">
    <p class="toast-title">Success</p>
    <p class="toast-message">Your changes have been saved.</p>
  </div>
  <button
    type="button"
    aria-label="Dismiss notification"
    class="toast-close"
  >
    <svg>...</svg>
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

### Behavior

| Feature | Implementation |
|---------|---------------|
| Position | Top-right or bottom-right |
| Auto-dismiss | 4-6 seconds (configurable) |
| Close button | Always available |
| Escape key | Dismisses focused toast |
| Stacking | New toasts stack (limit to 3-5) |

### Accessibility Requirements

- `role="status"` for non-critical notifications
- `role="alert"` for critical/error notifications
- `aria-live="polite"` (waits for user pause) or `aria-live="assertive"` (interrupts)
- Close button must be accessible
- Auto-dismiss should be pauseable on hover

## Loading States

### Skeleton Screen

Preferred over spinners for content-heavy pages:

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

For actions and small areas:

```html
<button type="button" disabled aria-busy="true">
  <svg class="spinner" aria-hidden="true">...</svg>
  <span>Saving...</span>
</button>
```

### Progress Indicator

For multi-step processes:

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

### Loading State Guidelines

| Pattern | Use Case |
|---------|----------|
| Skeleton screen | Content-heavy pages, lists, grids |
| Spinner | Button actions, small components |
| Progress bar | File uploads, multi-step processes |
| Optimistic UI | Immediate feedback, confirm later |

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
        <svg class="accordion-icon">...</svg>
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
        <svg class="accordion-icon">...</svg>
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
  <svg aria-hidden="true">...</svg>
</button>
<div id="tooltip-1" role="tooltip" class="tooltip" hidden>
  Helpful description text
</div>
```

### Behavior

| Feature | Implementation |
|---------|---------------|
| Trigger | Hover or focus |
| Delay | 300-500ms before showing |
| Position | Above element (preferred) |
| Dismiss | On mouse leave or blur |

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
