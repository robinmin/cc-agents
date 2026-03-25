---
name: ui-ux-design
description: "UI/UX design patterns with accessibility-first approach: WCAG 2.2 AA compliance, responsive layouts, design tokens, component patterns, and AI-assisted UI generation via Google Stitch. Trigger when designing UI components, reviewing accessibility, establishing design systems, or generating interfaces with Stitch."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
type: technique
tags: [ui-ux, accessibility, wcag, wcag-2.2, design-tokens, responsive, component-design, stitch, ai-ui]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - pipeline
  trigger_keywords:
    - design UI
    - design interface
    - UI component
    - accessibility check
    - WCAG
    - responsive layout
    - design system
    - design token
    - Google Stitch
    - generate UI
    - Stitch AI
    - UI pattern
    - component library
see_also:
  - rd3:frontend-design
  - rd3:frontend-architect
---

# rd3:ui-ux-design — UI/UX Design Patterns

UI/UX design patterns with accessibility-first approach, grounded in 2025 best practices including WCAG 2.2, container queries, and AI-assisted UI generation.

## Overview

This skill provides battle-tested design patterns for UI/UX work, covering component design, accessibility (WCAG 2.1 AA), responsive layouts, design tokens, and common UI patterns.

## When to Use

**Use this skill when:**
- Designing UI components (buttons, forms, cards, navigation)
- Creating user flows and interaction patterns
- Planning responsive layouts and breakpoints
- Ensuring accessibility (WCAG 2.2 AA compliance)
- Establishing design systems and design tokens
- Reviewing existing interfaces for UX improvements
- Generating UI screens with Google Stitch AI
- Building design system foundations (tokens, themes, component APIs)

**Not the right fit when:**
- High-level system architecture (use `rd3:frontend-architect` instead)
- Frontend implementation patterns (use `rd3:frontend-design` instead)
- Backend data modeling (use `rd3:backend-architect` instead)

## Quick Start

**1. Assess the design task**
- Identify UI components needed
- Check accessibility requirements (WCAG 2.2 AA)
- Determine if Google Stitch AI is available

**2. Follow the Design Workflow**
1. Apply accessibility-first principles
2. Establish design tokens if not exist
3. Select component patterns
4. Validate with accessibility checklist

**3. For Stitch AI Generation**
1. Check Stitch availability
2. Use context-first workflow for consistency
3. Fall back to patterns if Stitch unavailable

## Workflows

### Design Assessment Workflow

```typescript
interface DesignTask {
  type: "new" | "existing";
  components: string[];
  accessibilityRequired: boolean;
  useStitchAI: boolean;
}

function assessDesignTask(task: DesignTask): DesignWorkflow {
  if (task.accessibilityRequired) {
    return "accessibility-first";
  }
  if (task.useStitchAI) {
    return "stitch-generation";
  }
  return "pattern-based";
}
```

### Accessibility Validation Workflow

1. **Check contrast ratios** — 4.5:1 normal text, 3:1 large text
2. **Verify touch targets** — 44x44px minimum
3. **Test focus visibility** — 3:1 contrast ratio
4. **Check keyboard navigation** — Tab, Enter, Escape, Arrows
5. **Validate drag alternatives** — Single-pointer alternatives

### Stitch AI Generation Workflow

1. **Context-First** (recommended for consistency)
   - Extract design context from existing screens
   - Generate new screens with design DNA preserved

2. **Prompt-First** (for rapid prototyping)
   - Describe UI in natural language
   - Include device type, colors, layout

3. **Iterative Refinement**
   - Generate initial design
   - Refine based on feedback
   - Export and integrate

## Core Principles

### Accessibility First [MANDATORY]

**WCAG 2.2 AA is the 2025 standard** — WCAG 2.1 AA remains the floor, but 2.2 introduces new requirements.

| Requirement | Target | WCAG Reference |
|-------------|--------|-----------------|
| Color contrast (normal text) | 4.5:1 minimum | 1.4.3 AA |
| Color contrast (large text 18px+) | 3:1 minimum | 1.4.3 AA |
| Color contrast (UI components) | 3:1 minimum | 1.4.11 AA |
| Touch targets | 44x44px minimum (24x24 CSS px for WCAG 2.2) | 2.5.8 AAA / 2.5.5 AA |
| Focus indicators | Always visible, not obscured | 2.4.11 AA (2.2) |
| Focus not hidden | Focus never completely obscured | 2.4.12 AAA (2.2) |
| Dragging alternatives | Single-pointer alternative to dragging | 2.5.7 AA (2.2) |

### Implementation Guidelines

1. **Semantic HTML First** — Use proper elements (`button`, `nav`, `main`, `article`)
2. **ARIA as Enhancement** — Only add ARIA when semantic HTML insufficient
3. **Test with Assistive Tech** — Screen readers, keyboard navigation
4. **Automated + Manual Testing** — Use axe-core AND manual verification

### Modern Layout: Container Queries

Container queries (2023+) enable truly component-driven responsive design — a component responds to its **container size**, not the viewport. Use for reusable UI components.

```css
/* Define a containment context */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Component responds to container, not viewport */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}
```

**When to use container queries:**
- Reusable components that appear in multiple layout contexts
- Design system components (cards, media objects, lists)
- Widgets embedded in sidebars, main content, or modals

**When to use media queries:**
- Page-level layout shifts
- Overall document structure
- Responsive images at the document level

### Mobile-First Responsive Design

Base styles target 320px, then enhance for larger screens:

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
```

### Standard Breakpoints

| Name | Min Width | Use Case |
|------|-----------|----------|
| Mobile | 320px | Base styles |
| Mobile L | 425px | Larger phones |
| Tablet | 768px | Tablets, small laptops |
| Desktop | 1024px | Standard desktop |
| Desktop L | 1280px | Large monitors |

## Design Tokens

Design tokens are "design decisions as data" — a single source of truth for design and engineering.

### Token Hierarchy

```
Primitive Tokens (base values)
    ↓
Semantic Tokens (purpose-driven)
    ↓
Component Tokens (component-specific)
```

### CSS Variable Structure

```css
:root {
  /* Primitive tokens */
  --color-blue-500: #3b82f6;
  --color-gray-900: #111827;

  /* Semantic tokens */
  --color-primary: var(--color-blue-500);
  --color-text-default: var(--color-gray-900);
  --color-background: #ffffff;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
}

/* Dark theme */
[data-theme="dark"] {
  --color-background: var(--color-gray-900);
  --color-text-default: var(--color-white);
}
```

### Cascade Layers

Use `@layer` to manage CSS specificity and avoid `!important` hacks:

```css
/* Define layer order (lowest priority first) */
@layer reset, tokens, components, utilities;

/* Reset — normalize defaults */
@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
}

/* Design tokens — global tokens and semantic aliases */
@layer tokens {
  :root {
    --color-primary: #3b82f6;
    --spacing-md: 16px;
  }
}

/* Components — scoped component styles */
@layer components {
  .button {
    background: var(--color-primary);
    padding: var(--spacing-md);
  }
}

/* Utilities — high-specificity helpers (always wins within its layer) */
@layer utilities {
  .sr-only { position: absolute; width: 1px; height: 1px; }
}
```

**Benefits:**
- Eliminates selector specificity wars
- Third-party styles can be placed in their own layer, always overridable
- Clean fallback without `!important`

## Common Spacing

| Use Case | Value |
|----------|-------|
| Tight spacing | 4px-8px |
| Normal spacing | 16px |
| Loose spacing | 24px-32px |
| Section spacing | 48px-64px |

## Common Border Radius

| Use Case | Value |
|----------|-------|
| Subtle | 2px-4px |
| Rounded | 8px |
| Pill | 9999px |

## Z-Index Scale

| Level | Use |
|-------|-----|
| 0 | Base |
| 10 | Sticky headers |
| 20 | Dropdowns |
| 30 | Fixed headers |
| 40 | Modals/Drawers |
| 50 | Toasts/Notifications |

## Quick Accessibility Checklist

Essential checks for any interface:

- [ ] Color contrast 4.5:1 minimum (normal text), 3:1 (large text/UI components)
- [ ] Visible focus indicators — never `outline: none` without replacement
- [ ] Focus not obscured by other content (WCAG 2.2)
- [ ] Labels for all form inputs (never placeholder-only)
- [ ] Semantic HTML structure (`button`, `nav`, `main`, `article`)
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [ ] Touch targets minimum 44x44px
- [ ] Drag-and-drop has single-pointer alternative (WCAG 2.2)
- [ ] Respects `prefers-reduced-motion`
- [ ] No content flashes >3 times per second

## Component States Reference

### Button States

| State | Visual Treatment | Trigger |
|-------|-----------------|---------|
| Default | Base appearance | Initial render |
| Hover | Subtle highlight, cursor change | Mouse over |
| Focus | **Visible focus ring** (mandatory) | Keyboard focus |
| Active | Pressed appearance | Click/tap |
| Disabled | Muted, no interaction | Disabled prop |
| Loading | Spinner, disabled | Async action |

### Input States

| State | Visual Treatment | Requirements |
|-------|-----------------|--------------|
| Empty | Placeholder text (optional) | Label always visible |
| Filled | User content displayed | Clear value indicator |
| Focus | **Clear visual indicator** | Ring or border change |
| Error | **Red border + error message** | Actionable guidance |
| Disabled | Muted, read-only appearance | Visually distinct |
| Valid | Optional success indicator | Green check (optional) |

## Quick Reference Tables

### Visual Hierarchy

| Element | Impact | Application |
|---------|--------|-------------|
| Size | High | Larger = more important |
| Color | High | Bright/bold = attention |
| Position | Medium | Top-left = primary (LTR) |
| Contrast | High | High contrast = emphasis |
| Whitespace | Medium | Creates grouping and separation |

### Typography Scale

| Use | Size | Line Height | Weight |
|-----|------|-------------|--------|
| Body | 16px | 1.5 | 400 |
| Small | 14px | 1.4 | 400 |
| Caption | 12px | 1.4 | 400 |
| H4 | 16px | 1.3 | 600 |
| H3 | 20px | 1.3 | 600 |
| H2 | 24px | 1.25 | 600 |
| H1 | 32px | 1.2 | 700 |

### Touch Target Sizes

| Standard | Size |
|----------|------|
| WCAG 2.1 AA | 44x44px minimum |
| iOS HIG | 44x44pt |
| Material Design | 48x48dp |

## Additional References

- **`references/core-principles.md`** — Accessibility, mobile-first, design tokens, visual hierarchy, container queries, cascade layers
- **`references/component-patterns.md`** — Buttons, forms, cards, navigation, layouts
- **`references/ui-patterns.md`** — Modal, dropdown, tabs, toast, accordion, tooltip, focus management
- **`references/accessibility.md`** — Complete WCAG 2.2 AA checklist, ARIA patterns, keyboard navigation
- **`references/stitch-workflows.md`** — Google Stitch AI UI generation workflows
- **`references/fallback-patterns.md`** — Graceful degradation when Stitch unavailable
- **`references/design-tokens.md`** — Design token implementation guide
- **`references/design-context-schema.md`** — JSON schema for design context files

## Additional Resources

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/) — Filterable WCAG checklist
- [Accessibility Insights](https://accessibilityinsights.io/) — Browser extension for automated testing
- [Axe DevTools](https://www.dequte.com/) — Accessibility testing browser extension
- [Stitch MCP Server](https://github.com/Kargatharaakash/stitch-mcp) — Google Stitch AI integration
- [Style Dictionary](https://amzn.github.io/style-dictionary/) — Design token build tool
- [Modern CSS Solutions](https://moderncss.dev/) — CSS technique guides

## Sources

### Accessibility
- [WCAG 2.2 Guidelines (W3C, 2023)](https://www.w3.org/TR/WCAG22/) — new criteria for focus visibility, target size, and dragging alternatives
- [WCAG 2.1 Guidelines (W3C)](https://www.w3.org/TR/WCAG21/) — foundational compliance

### Design Systems & Tokens
- [Design Token-Based UI Architecture (Martin Fowler, 2024)](https://martinfowler.com/articles/design-token-based-ui-architecture.html)
- [13 Best Design System Examples in 2025 (UXPin)](https://www.uxpin.com/studio/blog/best-design-system-examples/)
- [Container Queries (CSS Working Group, 2023)](https://www.w3.org/TR/css-contain-3/) — component-driven responsive design

### Modern CSS
- [CSS Cascade Layers (CSS Working Group, 2022)](https://www.w3.org/TR/css-cascade-5/) — specificity management without `!important`
- [CSS Custom Media Queries (CSS Working Group, 2023)](https://www.w3.org/TR/css-custom-media-1/) — DRY responsive breakpoints
- [Motion Path Module Level 1 (CSS Working Group)](https://www.w3.org/TR/motion-1/) — advanced animation along paths

### Google Stitch AI
- [From idea to app: Introducing Stitch (Google Developers Blog, 2025)](https://developers.googleblog.com/stitch-a-new-way-to-design-uis/)
- [stitch-mcp on GitHub](https://github.com/Kargatharaakash/stitch-mcp)
