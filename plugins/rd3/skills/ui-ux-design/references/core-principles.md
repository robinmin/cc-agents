---
name: core-principles
description: "Core UI/UX principles: WCAG 2.2 AA accessibility, mobile-first responsive design, container queries, design tokens hierarchy, and visual hierarchy."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
type: reference
tags: [ui-ux, accessibility, wcag, wcag-2.2, mobile-first, design-tokens, visual-hierarchy, container-queries]
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

# Core Principles Reference

Fundamental UI/UX design principles based on 2025 best practices.

## Accessibility First [MANDATORY]

**WCAG 2.2 AA is the 2025 standard** — WCAG 2.1 AA is the floor, 2.2 adds focus visibility, target size, and dragging alternatives.

### Requirements

- WCAG 2.2 AA compliance (includes 2.1 AA criteria)
- Color contrast: 4.5:1 for normal text, 3:1 for large text
- Focus indicators with 3:1 contrast ratio (2.4.11, WCAG 2.2)
- Focused elements never completely hidden by overlays (2.4.12, WCAG 2.2)
- Touch targets 44x44px minimum (2.5.5, WCAG 2.1 AA)
- Single-pointer alternative to dragging (2.5.7, WCAG 2.2)
- Keyboard navigation support for all interactive elements
- Screen reader compatibility with semantic HTML and ARIA labels
- **Proper ARIA role implementation** (common failure point in modern apps)

### Implementation Guidelines

1. **Semantic HTML First** — Use proper elements (`button`, `nav`, `main`, `article`)
2. **ARIA as Enhancement** — Only add ARIA when semantic HTML insufficient
3. **Test with Assistive Tech** — Screen readers, keyboard navigation
4. **Automated + Manual Testing** — Use axe-core AND manual verification

## User-Centered Design

### Principles

- Start with user research and testing
- Design for usability and delight
- Progressive disclosure for complex information
- Micro-interactions for enhanced engagement
- Personalization capabilities

### Progressive Disclosure

- Present complex information incrementally
- Show only essential information by default
- Reveal details on user request
- Reduce cognitive load
- Improve perceived simplicity

**Implementation patterns:**

```
Primary View: Essential info only
├── Click/tap → Expanded details
├── Hover → Tooltip with preview
├── "Show more" → Additional content
└── Modal/drawer → Full details
```

## Mobile-First Responsive Design

### Breakpoint Strategy

```css
/* Mobile First Base */
.component { /* base styles for 320px+ */ }

/* Tablet Enhancement */
@media (min-width: 768px) {
  .component { /* tablet overrides */ }
}

/* Desktop Enhancement */
@media (min-width: 1024px) {
  .component { /* desktop overrides */ }
}

/* Large Desktop */
@media (min-width: 1280px) {
  .component { /* large screen overrides */ }
}
```

### Standard Breakpoints

| Name | Min Width | Use Case |
|------|-----------|----------|
| Mobile | 320px | Base styles |
| Mobile L | 425px | Larger phones |
| Tablet | 768px | Tablets, small laptops |
| Desktop | 1024px | Standard desktop |
| Desktop L | 1280px | Large monitors |
| 4K | 1536px | Ultra-wide displays |

## Container Queries (Component-Driven Responsive)

Container queries (CSS Containment Level 3, 2023) enable components to respond to their **container size** rather than the viewport. This enables true component reuse across layout contexts.

```css
/* Define a containment context */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Component responds to its container */
@container card (min-width: 400px) {
  .card {
    grid-template-columns: 200px 1fr;
  }
}
```

**When to use container queries:**
- Reusable design system components (cards, media objects, lists)
- Components that appear in multiple layout contexts (sidebar, main content, modal)
- Widget-style components embedded in variable-width containers

**When to use media queries:**
- Page-level document structure
- Overall responsive layout grid
- Responsive images at document level

### Touch Targets

- WCAG 2.5.5 AA: Minimum 44x44px for pointer input targets
- WCAG 2.5.8 AAA: Minimum 24x24 CSS pixels
- Increased spacing between touch targets
- Consider thumb zone for mobile navigation

### Cascade Layers (CSS Cascade Level 5)

Use `@layer` to manage CSS specificity and avoid `!important` cascades:

```css
/* Define explicit layer order (first = lowest priority) */
@layer reset, tokens, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
}

@layer tokens {
  :root {
    --color-primary: #3b82f6;
    --spacing-md: 16px;
  }
}

@layer components {
  .button { background: var(--color-primary); }
}

@layer utilities {
  .sr-only { position: absolute; width: 1px; height: 1px; }
}
```

**Benefits:**
- Third-party styles can be placed in their own layer, always overridable
- Eliminates specificity wars between teams or components
- No `!important` needed for override patterns

**Thumb Zone Map:**

```
┌────────────────────────┐
│   Hard to reach        │
│                        │
│ ┌──────────────────┐   │
│ │  Natural reach   │   │
│ │  (primary nav)   │   │
│ └──────────────────┘   │
│                        │
│   Easy reach           │
│   (primary actions)    │
└────────────────────────┘
```

## Design Tokens as Single Source of Truth

Design tokens are "design decisions as data" — a single source of truth for design and engineering.

### Token Hierarchy

```
Primitive Tokens (base values)
    ↓
Semantic Tokens (purpose-driven)
    ↓
Component Tokens (component-specific)
```

### Implementation Example

```css
/* Primitive tokens (base values) */
--color-blue-50: #eff6ff;
--color-blue-500: #3b82f6;
--color-blue-900: #1e3a8a;

/* Semantic tokens (purpose-driven) */
--color-primary: var(--color-blue-500);
--color-text-default: var(--color-gray-900);
--spacing-unit: 4px;
--radius-md: 8px;
```

### Benefits

1. **Consistency** — Same values everywhere
2. **Maintainability** — Change once, update everywhere
3. **Theming** — Easy dark mode, brand variants
4. **Collaboration** — Design-dev alignment
5. **Documentation** — Self-documenting system

## Visual Hierarchy

| Element | Impact | Application |
|---------|--------|-------------|
| Size | High | Larger = more important |
| Color | High | Bright/bold = attention |
| Position | Medium | Top-left = primary (LTR) |
| Contrast | High | High contrast = emphasis |
| Whitespace | Medium | Creates grouping and separation |

### Hierarchy Implementation

```
Level 1: Page title (largest, boldest)
    ↓
Level 2: Section headings
    ↓
Level 3: Card titles, labels
    ↓
Level 4: Body text
    ↓
Level 5: Captions, helper text (smallest, muted)
```

## Spacing Scale (4px base unit)

```css
--space-xs: 4px;    /* Tight spacing */
--space-sm: 8px;    /* Compact elements */
--space-md: 16px;   /* Standard spacing */
--space-lg: 24px;   /* Section gaps */
--space-xl: 32px;   /* Major sections */
--space-2xl: 48px;  /* Page-level spacing */
```

## Typography Scale

| Use | Size | Line Height | Weight |
|-----|------|-------------|--------|
| Body | 16px | 1.5 | 400 |
| Small | 14px | 1.4 | 400 |
| Caption | 12px | 1.4 | 400 |
| H4 | 16px | 1.3 | 600 |
| H3 | 20px | 1.3 | 600 |
| H2 | 24px | 1.25 | 600 |
| H1 | 32px | 1.2 | 700 |

**Best practices:**

- Body text: 16px minimum
- Line height: 1.4-1.6 for readability
- Character width: 60-75 characters per line
- Sufficient contrast between heading and body weights

## Micro-Interactions (2025 Trend)

### Principles

- Enhance user engagement through subtle animations
- Provide immediate feedback for user actions
- Guide user attention to important elements
- Keep animations under 300ms for responsiveness
- Respect `prefers-reduced-motion` for accessibility

### Common Micro-Interactions

| Trigger | Animation | Duration |
|---------|-----------|----------|
| Button hover | Scale up 2%, color shift | 150ms |
| Button click | Scale down 2%, ripple | 100ms |
| Form submit | Loading spinner, disable | Until complete |
| Success | Checkmark animation | 300ms |
| Error | Shake, red border | 300ms |
| Focus | Ring appear | 150ms |

### Implementation

```css
/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
