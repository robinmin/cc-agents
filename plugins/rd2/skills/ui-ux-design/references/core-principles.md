# Core Principles Reference (2024-2025)

Detailed guidance on fundamental UI/UX design principles based on current best practices.

## Accessibility First [MANDATORY]

**WCAG 2.1 AA is non-negotiable in 2025** - Recognized as essential, not optional.

Source: [Key Factors that Shape UX/UI Design Trends in 2025](https://uidesignz.com/blogs/key-factors-that-shape-uxui-design-trends)

### Requirements

- WCAG 2.1 AA compliance minimum
- Color contrast: 4.5:1 for normal text, 3:1 for large text
- Keyboard navigation support for all interactive elements
- Screen reader compatibility with semantic HTML and ARIA labels
- **Proper ARIA role implementation** (common failure point in modern apps)

Source: [WCAG in 2025: Trends, Pitfalls & Practical Implementation](https://medium.com/@alendennis77/wcag-in-2025-trends-pitfalls-practical-implementation-8cdc2d6e38ad)

### Implementation Guidelines

1. **Semantic HTML First** - Use proper elements (`button`, `nav`, `main`, `article`)
2. **ARIA as Enhancement** - Only add ARIA when semantic HTML insufficient
3. **Test with Assistive Tech** - Screen readers, keyboard navigation
4. **Automated + Manual Testing** - Use axe-core AND manual verification

## User-Centered Design

### Principles

- Start with user research and testing
- Design for usability and delight
- Progressive disclosure for complex information
- Micro-interactions for enhanced engagement
- Personalization capabilities

Source: [7 SaaS UX Design Best Practices for 2025](https://mouseflow.com/blog/saas-ux-design-best-practices/)

### Research Methods

| Method | When to Use | Output |
|--------|-------------|--------|
| User interviews | Discovery phase | Qualitative insights |
| Surveys | Validation phase | Quantitative data |
| Usability testing | Design phase | Friction points |
| A/B testing | Optimization | Data-driven decisions |
| Analytics review | Ongoing | Usage patterns |

### Progressive Disclosure

Based on [10 UX/UI Best Practices for Modern Digital Products in 2025](https://devpulse.com/insights/ux-ui-design-best-practices-2025-enterprise-applications/):

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

### Touch Targets

- Minimum 44x44px for all interactive elements
- Increased spacing between touch targets
- Consider thumb zone for mobile navigation

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

Design tokens are "design decisions as data" - a single source of truth for design and engineering.

Source: [Design Token-Based UI Architecture](https://martinfowler.com/articles/design-token-based-ui-architecture.html)

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

1. **Consistency** - Same values everywhere
2. **Maintainability** - Change once, update everywhere
3. **Theming** - Easy dark mode, brand variants
4. **Collaboration** - Design-dev alignment
5. **Documentation** - Self-documenting system

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

## Design System Basics

### Spacing Scale (4px base unit)

```css
--space-xs: 4px;    /* Tight spacing */
--space-sm: 8px;    /* Compact elements */
--space-md: 16px;   /* Standard spacing */
--space-lg: 24px;   /* Section gaps */
--space-xl: 32px;   /* Major sections */
--space-2xl: 48px;  /* Page-level spacing */
```

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

**Best practices:**

- Body text: 16px minimum
- Line height: 1.4-1.6 for readability
- Character width: 60-75 characters per line
- Sufficient contrast between heading and body weights

## Design System Best Practices (2024-2025)

Based on [Best Practices for Creating and Maintaining Design Systems](https://medium.com/@melvinsanthosh_/best-practices-for-creating-and-maintaining-design-systems-d795122f59db):

1. **Start with User Research** - Understanding users before building
2. **Define Core Principles** - Establish foundational guidelines
3. **Learn from Leaders** - Study Google, Apple, IBM, Shopify design systems
4. **Component-Based Architecture** - Reusable, composable components
5. **Design Tokens** - Single source of truth for design decisions
6. **Documentation** - Clear guidelines for usage
7. **Governance** - Process for contributions and updates

Source: [13 Best Design System Examples in 2025](https://www.uxpin.com/studio/blog/best-design-system-examples/)

## Micro-Interactions (2025 Trend)

Based on [7 SaaS UX Design Best Practices for 2025](https://mouseflow.com/blog/saas-ux-design-best-practices/):

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
