---
name: ui-ux-design
description: UI/UX design patterns and principles for user-centered interfaces with accessibility-first approach. Use when designing UI components, user flows, layouts, responsive designs, design systems, or when accessibility (WCAG 2.1 AA), visual design guidance, or design tokens are needed.

**Sources:**
- [UI/UX Design Principles, Trends, and Best Practices (ResearchGate, 2025)](https://www.researchgate.net/publication/389701340_UIUX_Design_Principles_Trends_and_Best_Practices)
- [Best Practices for Creating and Maintaining Design Systems (Medium, 2024)](https://medium.com/@melvinsanthosh_/best-practices-for-creating-and-maintaining-design-systems-d795122f59db)
- [WCAG 2.1 Guidelines (W3C)](https://www.w3.org/TR/WCAG21/)
- [Design Token-Based UI Architecture (Martin Fowler, 2024)](https://martinfowler.com/articles/design-token-based-ui-architecture.html)
---

# UI/UX Design

UI/UX design patterns and principles for user-centered interfaces with accessibility-first approach.

## Overview

This skill provides quick reference patterns and principles for UI/UX design, grounded in current 2024-2025 best practices. It covers component design, accessibility (WCAG 2.1 AA), responsive layouts, design tokens, and common UI patterns.

**For comprehensive design work** with user research, detailed documentation, and implementation specifications, use the `rd2:super-designer` agent.

## Quick Start

```bash
# Design a component
"Design a user profile card with avatar, name, bio, and action buttons"

# Create a user flow
"Design the checkout flow for an e-commerce application"

# Responsive layout
"Design a responsive dashboard layout that works on mobile and desktop"

# Accessibility review
"Review this login form for accessibility issues"

# Design system
"Create design tokens for colors, spacing, and typography"
```

## When to Use

**Use this skill when:**

- Designing UI components (buttons, forms, cards, navigation)
- Creating user flows and interaction patterns
- Planning responsive layouts and breakpoints
- Ensuring accessibility (WCAG 2.1 AA compliance)
- Establishing design systems and tokens
- Reviewing existing interfaces for UX improvements
- Need visual design guidance (color, typography, spacing)
- Implementing design tokens as single source of truth

**For comprehensive design work**, use `/rd2:super-designer` agent which provides:
- Detailed analysis process with user research
- Complete design documentation
- Implementation specifications
- Component documentation

## Core Principles (2024-2025)

### Accessibility First [MANDATORY]

**WCAG 2.1 AA is non-negotiable in 2025** - Recognized as essential, not optional [Key Factors that Shape UX/UI Design Trends in 2025](https://uidesignz.com/blogs/key-factors-that-shape-uxui-design-trends)

- WCAG 2.1 AA compliance minimum
- Color contrast: 4.5:1 for normal text, 3:1 for large text
- Keyboard navigation support for all interactive elements
- Screen reader compatibility with semantic HTML and ARIA labels
- **Proper ARIA role implementation** (common failure point in modern apps) [WCAG in 2025: Trends, Pitfalls & Practical Implementation](https://medium.com/@alendennis77/wcag-in-2025-trends-pitfalls-practical-implementation-8cdc2d6e38ad)

### User-Centered Design

- Start with user research and testing
- Design for usability and delight
- Progressive disclosure for complex information [7 SaaS UX Design Best Practices for 2025](https://mouseflow.com/blog/saas-ux-design-best-practices/)
- Micro-interactions for enhanced engagement
- Personalization capabilities

### Mobile-First Responsive Design

```
Breakpoints:
- Mobile: 320px - 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+
```

### Design Tokens as Single Source of Truth

Design tokens are "design decisions as data" - a single source of truth for design and engineering [Design Token-Based UI Architecture](https://martinfowler.com/articles/design-token-based-ui-architecture.html)

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

### Visual Hierarchy

| Element | Impact | Application |
|---------|--------|-------------|
| Size | High | Larger = more important |
| Color | High | Bright/bold = attention |
| Position | Medium | Top-left = primary (LTR) |
| Contrast | High | High contrast = emphasis |
| Whitespace | Medium | Creates grouping and separation |

### Design System Basics

**Spacing Scale** (4px base unit):
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
```

**Typography**:
- Body text: 16px minimum
- Line height: 1.4-1.6 for readability
- Character width: 60-75 characters per line
- Heading scale: h1 (32px), h2 (24px), h3 (20px), h4 (16px)

## Component Design Patterns

### Button States

Always design for:
- Default
- Hover (mouse)
- Focus (keyboard) - **Visible focus indicator mandatory**
- Active (pressed)
- Disabled
- Loading

### Form Design

**Input states**:
- Empty
- Filled
- Focus - **Clear visual indicator required**
- Error - **Clear, actionable message**
- Disabled - **Visually distinct but readable**

**Form validation**:
- Clear error messages with actionable guidance
- Inline validation when possible
- Success confirmation
- Prevent submission on critical errors
- **Labels for all inputs** (never use placeholder as label)

### Card Component

**Elements**:
- Header (title, actions)
- Body (content)
- Footer (metadata, actions)

**Spacing**:
- Internal padding: 16px-24px
- Card gap: 16px-24px

### Navigation Patterns

**Desktop**:
- Horizontal nav bar
- Dropdown menus
- Breadcrumb trails

**Mobile**:
- Hamburger menu
- Bottom tab bar
- Back navigation

## Layout Patterns

### Container Widths

```
xs: 100% (mobile)
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Grid Systems

**12-column grid** (most common):
```css
display: grid;
grid-template-columns: repeat(12, 1fr);
gap: 16px;
```

**Common spans**:
- Full: 12 columns
- Half: 6 columns
- Third: 4 columns
- Quarter: 3 columns

## Accessibility Checklist

**Color**:
- [ ] Contrast ratio 4.5:1 minimum (normal text)
- [ ] Contrast ratio 3:1 minimum (large text 18px+)
- [ ] Don't rely on color alone (use icons, labels)
- [ ] Test with color blindness simulators

**Keyboard**:
- [ ] All interactive elements reachable by Tab
- [ ] Visible focus indicators (never remove outline without replacement)
- [ ] Logical tab order
- [ ] Enter/Space to activate
- [ ] Escape to close modals
- [ ] Skip links for keyboard users

**Screen Readers**:
- [ ] Semantic HTML (button, nav, main, article)
- [ ] ARIA labels for icons without text
- [ ] ARIA descriptions for complex widgets
- [ ] alt text for meaningful images
- [ ] Proper heading structure (h1-h6, single h1 per page)

**Forms**:
- [ ] Labels for all inputs (linked via for/id)
- [ ] Required field indicators
- [ ] Clear error messages with recovery guidance
- [ ] Instructions for complex inputs
- [ ] Error summaries for multiple errors

**Focus Management**:
- [ ] Focus trap in modals/dialogs
- [ ] Return focus to trigger on close
- [ ] Focus not lost during dynamic updates
- [ ] Manage focus for single-page applications

## Responsive Design Strategy

### Mobile-First Approach

1. Design for mobile (320px) first
2. Enhance for tablet (768px+)
3. Optimize for desktop (1024px+)

### Breakpoint Strategy

```css
/* Mobile First */
.component { /* base styles */ }

/* Tablet */
@media (min-width: 768px) {
  .component { /* tablet overrides */ }
}

/* Desktop */
@media (min-width: 1024px) {
  .component { /* desktop overrides */ }
}
```

### Touch Targets

- Minimum 44x44px for all interactive elements
- Increased spacing between touch targets
- Consider thumb zone for mobile navigation

## Design Tokens

### Color System (2024 Best Practice)

```json
{
  "colors": {
    "primitive": {
      "blue": { "50": "#f0f9ff", "500": "#0ea5e9", "900": "#0c4a6e" },
      "gray": { "50": "#f9fafb", "500": "#6b7280", "900": "#111827" }
    },
    "semantic": {
      "primary": { "value": "{primitive.blue.500}", "type": "color" },
      "text-default": { "value": "{primitive.gray.900}", "type": "color" },
      "success": "#10b981",
      "warning": "#f59e0b",
      "error": "#ef4444",
      "info": "#3b82f6"
    }
  }
}
```

**Design Token Types**:
- **Primitive tokens**: Base values (colors, spacing)
- **Semantic tokens**: Purpose-driven aliases (primary, text-default)
- **Component tokens**: Component-specific overrides

### Typography Scale

```json
{
  "fontSize": {
    "xs": "12px",
    "sm": "14px",
    "base": "16px",
    "lg": "18px",
    "xl": "20px",
    "2xl": "24px",
    "3xl": "30px",
    "4xl": "36px"
  },
  "fontWeight": {
    "normal": "400",
    "medium": "500",
    "semibold": "600",
    "bold": "700"
  },
  "lineHeight": {
    "tight": "1.25",
    "normal": "1.5",
    "relaxed": "1.75"
  }
}
```

### Spacing Scale

```json
{
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px",
    "2xl": "48px",
    "3xl": "64px"
  }
}
```

## Common UI Patterns

### Modal/Dialog

- Overlay backdrop (darkens content)
- Close button (top-right)
- Escape key to close
- Click outside to close
- **Focus trap inside modal**
- **Return focus to trigger on close**
- ARIA attributes: role="dialog", aria-modal="true"

### Dropdown/Select

- Trigger button shows selected value
- List appears below trigger
- Keyboard navigation (arrow keys)
- Select with Enter/Space
- Click outside to close
- Scrollable if long list
- ARIA attributes: role="combobox", aria-expanded

### Tabs

- Active tab visually distinct
- Keyboard navigation (arrow keys)
- Activate with Enter/Space
- Panel content shows below
- ARIA attributes: role="tablist", role="tab", role="tabpanel"

### Toast/Notification

- Position: top-right or bottom-right
- Auto-dismiss after 4-6 seconds
- Close button available
- Dismissible with keyboard (Escape)
- Stacked if multiple
- ARIA: role="status" or role="alert"

### Loading States

- Skeleton screens (preferred over spinners)
- Progress indicators for multi-step processes
- Optimistic UI for fast feedback
- Clear error states with retry options

## Component Library Recommendations

| Library | Best For | Notes |
|---------|----------|-------|
| shadcn/ui | React, Tailwind | Copy-paste components, full customization |
| Radix UI | React, primitives | Unstyled, accessible, headless |
| Headless UI | React, Vue | Unstyled, accessible |
| Chakra UI | React | Styled, accessible, theming built-in |
| Material-UI | React | Complete system, opinionated |
| Mantine | React | Feature-rich, accessible |

## Design System Best Practices (2024-2025)

Based on [Best Practices for Creating and Maintaining Design Systems](https://medium.com/@melvinsanthosh_/best-practices-for-creating-and-maintaining-design-systems-d795122f59db):

1. **Start with User Research** - Understanding users before building
2. **Define Core Principles** - Establish foundational guidelines
3. **Learn from Leaders** - Study Google, Apple, IBM, Shopify design systems [13 Best Design System Examples in 2025](https://www.uxpin.com/studio/blog/best-design-system-examples/)
4. **Component-Based Architecture** - Reusable, composable components
5. **Design Tokens** - Single source of truth for design decisions
6. **Documentation** - Clear guidelines for usage
7. **Governance** - Process for contributions and updates

## Micro-Interactions (2025 Trend)

Based on [7 SaaS UX Design Best Practices for 2025](https://mouseflow.com/blog/saas-ux-design-best-practices/):

- Enhance user engagement through subtle animations
- Provide immediate feedback for user actions
- Guide user attention to important elements
- Keep animations under 300ms for responsiveness
- Respect `prefers-reduced-motion` for accessibility

## Progressive Disclosure

Based on [10 UX/UI Best Practices for Modern Digital Products in 2025](https://devpulse.com/insights/ux-ui-design-best-practices-2025-enterprise-applications/):

- Present complex information incrementally
- Show only essential information by default
- Reveal details on user request
- Reduce cognitive load
- Improve perceived simplicity

## Design Handoff Checklist

**For each component**:
- [ ] Dimensions (width, height, padding)
- [ ] Colors (background, text, border)
- [ ] Typography (font, size, weight, line-height)
- [ ] States (default, hover, active, disabled, error)
- [ ] Spacing (margins, padding, gaps)
- [ ] Responsive behavior
- [ ] Accessibility attributes (ARIA)

**For layouts**:
- [ ] Grid system
- [ ] Container widths
- [ ] Breakpoints
- [ ] Responsive stacking order

## Design Token Implementation

Based on [Design Token-Based UI Architecture (Martin Fowler, 2024)](https://martinfowler.com/articles/design-token-based-ui-architecture.html) and [Design Tokens Explained (Contentful, 2024)](https://www.contentful.com/blog/design-token-system/):

### Token Structure

```
design-tokens/
├── tokens/
│   ├── base/        # Primitive tokens (colors, spacing)
│   ├── semantic/    # Semantic tokens (primary, text-default)
│   └── component/   # Component-specific tokens
├── platforms/
│   ├── css/         # CSS variables
│   ├── ios/         # iOS constants
│   └── android/     # Android resources
```

### Token Naming Convention

```json
{
  "color": {
    "primitive": {
      "blue": { "50": "...", "500": "...", "900": "..." }
    },
    "semantic": {
      "primary": "blue.500",
      "text-default": "gray.900",
      "border-default": "gray.200"
    }
  }
}
```

## Progressive Disclosure

This SKILL.md provides quick reference patterns grounded in 2024-2025 best practices.

**For detailed workflows**:
- Use `/rd2:super-designer` agent for comprehensive design analysis
- See `references/` for detailed documentation on specific topics

**For implementation**:
- Use `/rd2:code-generate` to implement designs
- Use `/rd2:code-review` to verify accessibility implementation

## Quick Reference

### Common Spacing

| Use Case | Value |
|----------|-------|
| Tight spacing | 4px-8px |
| Normal spacing | 16px |
| Loose spacing | 24px-32px |
| Section spacing | 48px-64px |

### Common Border Radius

| Use Case | Value |
|----------|-------|
| Subtle | 2px-4px |
| Rounded | 8px |
| Pill | 9999px |

### Common Shadows

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
--shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1);
```

### Z-Index Scale

```
0: Base
10: Sticky headers
20: Dropdowns
30: Fixed headers
40: Modals/Drawers
50: Toasts/Notifications
```

## Sources

- [UI/UX Design: Principles, Trends, and Best Practices (ResearchGate, 2025)](https://www.researchgate.net/publication/389701340_UIUX_Design_Principles_Trends_and_Best_Practices)
- [Best Practices for Creating and Maintaining Design Systems (Medium, 2024)](https://medium.com/@melvinsanthosh_/best-practices-for-creating-and-maintaining-design-systems-d795122f59db)
- [13 Best Design System Examples in 2025 (UXPin)](https://www.uxpin.com/studio/blog/best-design-system-examples/)
- [10 UX/UI Best Practices for Modern Digital Products in 2025 (DevPulse)](https://devpulse.com/insights/ux-ui-design-best-practices-2025-enterprise-applications/)
- [7 SaaS UX Design Best Practices for 2025 (Mouseflow)](https://mouseflow.com/blog/saas-ux-design-best-practices/)
- [Key Factors that Shape UX/UI Design Trends in 2025 (UIDesignz)](https://uidesignz.com/blogs/key-factors-that-shape-uxui-design-trends)
- [WCAG 2.1 Guidelines (W3C)](https://www.w3.org/TR/WCAG21/)
- [WCAG in 2025: Trends, Pitfalls & Practical Implementation (Medium)](https://medium.com/@alendennis77/wcag-in-2025-trends-pitfalls-practical-implementation-8cdc2d6e38ad)
- [Design Token-Based UI Architecture (Martin Fowler, 2024)](https://martinfowler.com/articles/design-token-based-ui-architecture.html)
- [Design Tokens Explained - Building a Token System (Contentful, 2024)](https://www.contentful.com/blog/design-token-system/)
- [State of Design Tokens 2024 Report (Supernova)](https://www.supernova.io/state-of-design-tokens)
