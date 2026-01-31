# Accessibility Checklist Reference

WCAG 2.1 AA compliance checklist for UI/UX design. Use this as a verification tool before releasing any interface.

## Color

- [ ] Contrast ratio 4.5:1 minimum (normal text)
- [ ] Contrast ratio 3:1 minimum (large text 18px+ or 14px+ bold)
- [ ] Contrast ratio 3:1 minimum (UI components and graphical objects)
- [ ] Information not conveyed by color alone (use icons, labels, patterns)
- [ ] Test with color blindness simulators (protanopia, deuteranopia, tritanopia)

### Color Contrast Tools

| Tool | Use Case | Link |
|------|----------|------|
| WebAIM Contrast Checker | Quick ratio check | webaim.org/resources/contrastchecker |
| Stark | Design tool plugin | getstark.co |
| axe DevTools | Browser extension | deque.com/axe |

### Color-Safe Palette Example

```css
/* WCAG AA compliant on white (#fff) */
--text-primary: #1e293b;    /* 14.9:1 ratio */
--text-secondary: #475569;  /* 7.1:1 ratio */
--text-muted: #64748b;      /* 4.5:1 ratio - minimum */
--link-color: #2563eb;      /* 4.6:1 ratio */
--error-color: #dc2626;     /* 5.9:1 ratio */
```

## Keyboard Navigation

- [ ] All interactive elements reachable by Tab
- [ ] Visible focus indicators (never remove outline without replacement)
- [ ] Logical tab order (follows visual flow)
- [ ] Enter/Space to activate buttons and links
- [ ] Escape to close modals, dropdowns, popovers
- [ ] Arrow keys for navigation within components (tabs, menus, selects)
- [ ] Skip links for keyboard users (skip to main content)
- [ ] No keyboard traps (user can always navigate away)

### Focus Indicator CSS

```css
/* Custom focus indicator - ALWAYS visible */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Remove default only when custom is provided */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Keyboard Patterns by Component

| Component | Keys | Behavior |
|-----------|------|----------|
| Button | Enter, Space | Activate |
| Link | Enter | Navigate |
| Checkbox | Space | Toggle |
| Radio | Arrow keys | Move selection |
| Dropdown | Arrow keys, Enter, Escape | Navigate, select, close |
| Tabs | Arrow keys | Switch tabs |
| Modal | Tab (trapped), Escape | Navigate within, close |

## Screen Reader Support

- [ ] Semantic HTML used (`button`, `nav`, `main`, `article`, `header`, `footer`)
- [ ] ARIA labels for icons without visible text
- [ ] ARIA descriptions for complex widgets
- [ ] Alt text for meaningful images (empty alt for decorative)
- [ ] Proper heading structure (h1-h6, single h1 per page)
- [ ] Landmark regions defined (`main`, `nav`, `aside`, `footer`)
- [ ] Live regions for dynamic content (`aria-live`)
- [ ] Form labels associated with inputs (`for`/`id` or nesting)

### ARIA Usage Guidelines

**Rule 1:** Use semantic HTML first, ARIA second

```html
<!-- Prefer this -->
<button>Submit</button>

<!-- Not this -->
<div role="button" tabindex="0">Submit</div>
```

**Rule 2:** Meaningful ARIA labels

```html
<!-- Good -->
<button aria-label="Close dialog">
  <svg>...</svg>
</button>

<!-- Bad -->
<button aria-label="X">
  <svg>...</svg>
</button>
```

**Rule 3:** Describe relationships

```html
<input
  id="email"
  aria-describedby="email-hint email-error"
  aria-invalid="true"
>
<span id="email-hint">Enter your work email</span>
<span id="email-error" role="alert">Email is required</span>
```

## Forms

- [ ] Labels for all inputs (linked via `for`/`id` or nesting)
- [ ] Required field indicators (visual + `aria-required`)
- [ ] Clear error messages with recovery guidance
- [ ] Error messages linked to inputs (`aria-describedby`)
- [ ] Instructions for complex inputs (date formats, password requirements)
- [ ] Error summaries for forms with multiple errors
- [ ] Success confirmation after submission
- [ ] No placeholder-only labels

### Accessible Form Pattern

```html
<form aria-labelledby="form-title">
  <h2 id="form-title">Contact Us</h2>

  <div class="form-group">
    <label for="name">
      Name
      <span class="required" aria-hidden="true">*</span>
    </label>
    <input
      type="text"
      id="name"
      name="name"
      required
      aria-required="true"
    >
  </div>

  <div class="form-group" aria-invalid="true">
    <label for="email">
      Email
      <span class="required" aria-hidden="true">*</span>
    </label>
    <input
      type="email"
      id="email"
      name="email"
      required
      aria-required="true"
      aria-describedby="email-error"
      aria-invalid="true"
    >
    <span id="email-error" class="error" role="alert">
      Please enter a valid email address
    </span>
  </div>

  <button type="submit">Send Message</button>
</form>
```

## Focus Management

- [ ] Focus trap in modals/dialogs (Tab cycles within modal)
- [ ] Return focus to trigger element on modal close
- [ ] Focus not lost during dynamic updates
- [ ] Manage focus for single-page application route changes
- [ ] Focus on first error when form validation fails
- [ ] Skip to main content link for long pages

### Modal Focus Management

```javascript
// On modal open
const previousFocus = document.activeElement;
modal.querySelector('[autofocus]').focus();

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

## Motion and Animation

- [ ] Respect `prefers-reduced-motion` system setting
- [ ] No auto-playing animations that cannot be paused
- [ ] No flashing content (3 flashes per second max)
- [ ] Animation not required to understand content
- [ ] Provide pause/stop controls for animations

### Reduced Motion CSS

```css
/* Respect user preference */
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

## Testing Tools

| Tool | Type | Purpose |
|------|------|---------|
| axe DevTools | Browser extension | Automated WCAG testing |
| WAVE | Browser extension | Visual accessibility feedback |
| Lighthouse | Built into Chrome | Accessibility audit |
| NVDA | Screen reader (Windows) | Manual testing |
| VoiceOver | Screen reader (macOS/iOS) | Manual testing |
| Keyboard only | Manual test | Tab through page |

### Testing Checklist

1. [ ] Run automated scan (axe, WAVE, Lighthouse)
2. [ ] Test with keyboard only (no mouse)
3. [ ] Test with screen reader
4. [ ] Test with zoom (200%, 400%)
5. [ ] Test color contrast
6. [ ] Test reduced motion preference
7. [ ] Test on mobile devices

## Quick Reference

### Minimum Contrast Ratios

| Content Type | Ratio | Example |
|-------------|-------|---------|
| Normal text | 4.5:1 | Body copy |
| Large text (18px+) | 3:1 | Headings |
| UI components | 3:1 | Buttons, inputs |
| Graphical objects | 3:1 | Icons, charts |

### Touch Target Sizes

| Standard | Size |
|----------|------|
| WCAG 2.1 AA | 44x44px minimum |
| iOS HIG | 44x44pt |
| Material Design | 48x48dp |

### Heading Structure

```html
<h1>Page Title (one per page)</h1>
  <h2>Major Section</h2>
    <h3>Subsection</h3>
    <h3>Subsection</h3>
  <h2>Major Section</h2>
    <h3>Subsection</h3>
      <h4>Sub-subsection</h4>
```
