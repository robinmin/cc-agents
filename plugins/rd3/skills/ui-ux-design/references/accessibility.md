---
name: accessibility
description: "Complete WCAG 2.2 AA accessibility checklist: color contrast, keyboard navigation, focus management, drag-and-drop alternatives, target sizes, and testing tools."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
type: reference
tags: [ui-ux, accessibility, wcag, wcag-2.2, aria, keyboard-nav, screen-reader, focus-management]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:ui-ux-design
  - rd3:frontend-design
  - rd3:ui-ux-design/references/core-principles
  - rd3:ui-ux-design/references/ui-patterns
---

# Accessibility Checklist Reference

WCAG 2.2 AA compliance checklist for UI/UX design. Use as verification before releasing any interface. WCAG 2.2 (2023) adds new criteria beyond 2.1 — both must be satisfied.

## WCAG 2.2 New Requirements (beyond 2.1 AA)

WCAG 2.2 introduced these new success criteria in 2023:

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 2.4.11 Focus Appearance | AA | Focus indicator is at least 3:1 contrast ratio against background |
| 2.4.12 Focus Not Obscured | AAA | Focused component is never completely hidden by sticky headers/overlays |
| 2.5.7 Dragging Movements | AA | All drag operations have single-pointer alternative |
| 2.5.8 Target Size (Minimum) | AAA | Interactive targets are at least 24x24 CSS pixels |
| 3.2.6 Consistent Help | A | Help mechanisms appear in same location across pages |

## Color

- [ ] Contrast ratio 4.5:1 minimum (normal text)
- [ ] Contrast ratio 3:1 minimum (large text 18px+ or 14px+ bold)
- [ ] Contrast ratio 3:1 minimum (UI components and graphical objects)
- [ ] Information not conveyed by color alone (use icons, labels, patterns)
- [ ] Test with color blindness simulators (protanopia, deuteranopia, tritanopia)

### Minimum Contrast Ratios

| Content Type | Ratio | Example |
|-------------|-------|---------|
| Normal text | 4.5:1 | Body copy |
| Large text (18px+) | 3:1 | Headings |
| UI components | 3:1 | Buttons, inputs |
| Graphical objects | 3:1 | Icons, charts |

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
- [ ] Focus indicator has at least 3:1 contrast ratio (WCAG 2.2 AA)
- [ ] Focus indicator never completely hidden by author-created content (WCAG 2.2)
- [ ] Logical tab order (follows visual flow)
- [ ] Enter/Space to activate buttons and links
- [ ] Escape to close modals, dropdowns, popovers
- [ ] Arrow keys for navigation within components (tabs, menus, selects)
- [ ] Skip links for keyboard users (skip to main content)
- [ ] No keyboard traps (user can always navigate away)
- [ ] Drag-and-drop has single-pointer alternative (WCAG 2.2 AA)

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
|-----------|------|---------|
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
  <svg><!-- x icon --></svg>
</button>

<!-- Bad -->
<button aria-label="X">
  <svg><!-- x icon --></svg>
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

## Focus Management

- [ ] Focus trap in modals/dialogs (Tab cycles within modal)
- [ ] Return focus to trigger element on modal close
- [ ] Focus not lost during dynamic updates
- [ ] Manage focus for single-page application route changes
- [ ] Focus on first error when form validation fails
- [ ] Skip to main content link for long pages
- [ ] Focused component never completely hidden by sticky headers/overlays (WCAG 2.2)

## Drag-and-Drop Accessibility (WCAG 2.2)

All functions that use a dragging movement must be achievable with a single pointer without dragging:

### Requirements

- [ ] Drag-and-drop has single-pointer alternative (button, menu, keyboard shortcut)
- [ ] Drag handles have visible affordance
- [ ] Keyboard alternative for all drag operations (e.g., Arrow keys to move items)
- [ ] Drop zones are clearly indicated

### Implementation Patterns

**Reorderable list with keyboard support:**

```html
<ul role="listbox" aria-label="Sortable list">
  <li role="option" tabindex="0" aria-grabbed="false">
    Item 1
    <button aria-label="Move up" disabled>↑</button>
    <button aria-label="Move down">↓</button>
  </li>
</ul>
```

**Pattern: "Grab and move" → "Select and command"**

Instead of drag-to-reorder, provide:
- Select item (checkbox or click)
- Action buttons: "Move Up" / "Move Down" / "Move to position"
- Keyboard: Arrow keys to move selected item

### Drag-and-Drop with Touch Alternative

```html
<div class="draggable-item" aria-describedby="drag-help">
  <button class="move-btn" aria-label="Move item up">↑</button>
  <button class="move-btn" aria-label="Move item down">↓</button>
  <!-- native draggable for pointer users -->
  <span draggable="true" aria-hidden="true" class="drag-handle">⋮⋮</span>
</div>
<span id="drag-help" class="sr-only">
  Use arrow buttons or keyboard to reorder. Press Space to grab, arrow keys to move.
</span>
```

## Motion and Animation

- [ ] Respect `prefers-reduced-motion` system setting
- [ ] No auto-playing animations that cannot be paused
- [ ] No flashing content (3 flashes per second max)
- [ ] Animation not required to understand content
- [ ] Provide pause/stop controls for animations

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

### Touch Target Sizes

| Standard | Size | WCAG Ref |
|---------|------|----------|
| WCAG 2.2 AA | 24x24 CSS px minimum | 2.5.8 |
| WCAG 2.1 AA | 44x44px minimum | 2.5.5 |
| iOS HIG | 44x44pt | — |
| Material Design | 48x48dp | — |

**WCAG 2.2 (2.5.8) Target Size Minimum (AAA):** At least 24x24 CSS pixels. Exceptions: inline text links, spacing between targets, etc.

**WCAG 2.5.5 (AA):** Target size for pointer input is at least 44x44px (or equivalent spacing). This is the recommended AA-level target.

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
