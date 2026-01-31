# Component Design Patterns Reference

Detailed patterns for common UI components with accessibility requirements.

## Button States

Always design for all interaction states:

| State | Visual Treatment | Trigger |
|-------|-----------------|---------|
| Default | Base appearance | Initial render |
| Hover | Subtle highlight, cursor change | Mouse over |
| Focus | **Visible focus ring** (mandatory) | Keyboard focus |
| Active | Pressed appearance | Click/tap |
| Disabled | Muted, no interaction | Disabled prop |
| Loading | Spinner, disabled | Async action |

### Button Accessibility

- Focus indicator must be visible (never `outline: none` without replacement)
- Minimum 44x44px touch target
- Color contrast 4.5:1 for text
- 3:1 contrast for the button boundary against background
- Loading state must announce to screen readers

### Button CSS Example

```css
.button {
  /* Base */
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 150ms ease;

  /* Focus - ALWAYS visible */
  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* Hover */
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  /* Active */
  &:active:not(:disabled) {
    transform: translateY(0);
  }

  /* Disabled */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

## Form Design

### Input States

| State | Visual Treatment | Requirements |
|-------|-----------------|--------------|
| Empty | Placeholder text (optional) | Label always visible |
| Filled | User content displayed | Clear value indicator |
| Focus | **Clear visual indicator** | Ring or border change |
| Error | **Red border + error message** | Actionable guidance |
| Disabled | Muted, read-only appearance | Visually distinct |
| Valid | Optional success indicator | Green check (optional) |

### Form Validation

- Clear error messages with actionable guidance
- Inline validation when possible
- Success confirmation for submissions
- Prevent submission on critical errors
- **Labels for all inputs** (never use placeholder as label)

### Form Group HTML Pattern

```html
<div class="form-group">
  <label for="email" class="form-label">
    Email address
    <span class="required" aria-hidden="true">*</span>
  </label>
  <input
    type="email"
    id="email"
    name="email"
    required
    aria-required="true"
    aria-describedby="email-help email-error"
  >
  <span id="email-help" class="helper-text">
    We'll never share your email
  </span>
  <span id="email-error" class="error-text" role="alert" hidden>
    Please enter a valid email address
  </span>
</div>
```

### Form Spacing

| Element | Spacing |
|---------|---------|
| Between form groups | 24px |
| Label to input | 8px |
| Input to helper text | 4px |
| Error message to next field | 8px |

## Card Component

### Card Structure

```html
<article class="card">
  <header class="card-header">
    <h3 class="card-title">Card Title</h3>
    <button class="card-action" aria-label="More options">
      <svg>...</svg>
    </button>
  </header>
  <div class="card-body">
    <!-- Content -->
  </div>
  <footer class="card-footer">
    <span class="card-meta">Updated 2 hours ago</span>
    <div class="card-actions">
      <button class="btn-secondary">Cancel</button>
      <button class="btn-primary">Save</button>
    </div>
  </footer>
</article>
```

### Card Elements

| Section | Purpose | Content |
|---------|---------|---------|
| Header | Title and actions | Title, menu, badges |
| Body | Main content | Text, images, data |
| Footer | Metadata and CTAs | Timestamps, buttons |

### Card Spacing

- Internal padding: 16px-24px
- Card gap in grids: 16px-24px
- Image aspect ratio: 16:9 or 4:3 for consistency

### Card CSS

```css
.card {
  background: var(--card-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: box-shadow 200ms ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.card-body {
  padding: 16px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--surface-color);
}
```

## Navigation Patterns

### Desktop Navigation

| Pattern | Use Case | Structure |
|---------|----------|-----------|
| Horizontal nav | Primary navigation | Top bar with links |
| Dropdown menus | Sub-navigation | Hover/click reveals menu |
| Breadcrumbs | Deep hierarchy | Path trail with links |
| Tabs | Content sections | Horizontal tab strip |

### Mobile Navigation

| Pattern | Use Case | Structure |
|---------|----------|-----------|
| Hamburger menu | Full navigation | Icon reveals drawer |
| Bottom tab bar | Primary nav (5 or fewer) | Fixed bottom icons |
| Back navigation | Hierarchy traversal | Top-left arrow |

### Navigation Accessibility

```html
<nav aria-label="Main navigation">
  <ul role="list">
    <li><a href="/" aria-current="page">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li>
      <button aria-expanded="false" aria-controls="submenu">
        Services
      </button>
      <ul id="submenu" hidden>
        <li><a href="/services/design">Design</a></li>
        <li><a href="/services/develop">Development</a></li>
      </ul>
    </li>
  </ul>
</nav>
```

## Layout Patterns

### Container Widths

```css
.container-xs { max-width: 100%; }    /* Mobile full */
.container-sm { max-width: 640px; }   /* Small */
.container-md { max-width: 768px; }   /* Medium */
.container-lg { max-width: 1024px; }  /* Large */
.container-xl { max-width: 1280px; }  /* Extra large */
.container-2xl { max-width: 1536px; } /* 2XL */
```

### Grid Systems

**12-column grid** (most common):

```css
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}

/* Responsive spans */
.col-full { grid-column: span 12; }
.col-half { grid-column: span 6; }
.col-third { grid-column: span 4; }
.col-quarter { grid-column: span 3; }

@media (max-width: 768px) {
  .col-half,
  .col-third,
  .col-quarter {
    grid-column: span 12;
  }
}
```

### Common Layout Patterns

**Holy Grail Layout:**

```css
.layout {
  display: grid;
  grid-template:
    "header header header" auto
    "sidebar main aside" 1fr
    "footer footer footer" auto
    / 240px 1fr 240px;
  min-height: 100vh;
}
```

**Dashboard Layout:**

```css
.dashboard {
  display: grid;
  grid-template:
    "sidebar header" auto
    "sidebar main" 1fr
    / 240px 1fr;
  min-height: 100vh;
}
```

## Component Library Recommendations

| Library | Best For | Notes |
|---------|----------|-------|
| shadcn/ui | React, Tailwind | Copy-paste components, full customization |
| Radix UI | React, primitives | Unstyled, accessible, headless |
| Headless UI | React, Vue | Unstyled, accessible |
| Chakra UI | React | Styled, accessible, theming built-in |
| Material-UI | React | Complete system, opinionated |
| Mantine | React | Feature-rich, accessible |

## Design Handoff Checklist

**For each component:**
- [ ] Dimensions (width, height, padding)
- [ ] Colors (background, text, border)
- [ ] Typography (font, size, weight, line-height)
- [ ] States (default, hover, active, disabled, error)
- [ ] Spacing (margins, padding, gaps)
- [ ] Responsive behavior
- [ ] Accessibility attributes (ARIA)

**For layouts:**
- [ ] Grid system
- [ ] Container widths
- [ ] Breakpoints
- [ ] Responsive stacking order
