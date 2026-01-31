---
name: ui-ux-design
description: This skill should be used when the user asks to "design a UI component", "create a login screen", "review accessibility", "generate a dashboard layout", "set up design tokens", "design a form", "create a navigation pattern", or mentions UI/UX patterns, WCAG compliance, responsive design, Google Stitch AI, or design system principles.
version: 1.1.0
---

# UI/UX Design

UI/UX design patterns and principles for user-centered interfaces with accessibility-first approach.

## Overview

This skill provides quick reference patterns and principles for UI/UX design, grounded in current 2024-2025 best practices. It covers component design, accessibility (WCAG 2.1 AA), responsive layouts, design tokens, and common UI patterns.

**Google Stitch Integration:** This skill includes AI-powered UI generation via Google Stitch MCP, enabling:
- Generate complete UI screens from natural language prompts
- Extract design DNA for visual consistency across screens
- Export production-ready frontend code (HTML, React, Vue)
- Maintain design system consistency through context management

**Layered Architecture:**
- **Layer 3 (Stitch):** AI-powered generation, context extraction, code export
- **Layer 2 (Workflow):** Prompt-first, context-first, iterative refinement workflows
- **Layer 1 (Patterns):** Battle-tested design patterns (fallback when Stitch unavailable)

**For comprehensive design work** with user research, detailed documentation, and implementation specifications, use `/rd2:tasks-plan --design` which invokes the `rd2:super-designer` agent.

## Quick Start

### Traditional Design Patterns

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

### Stitch AI Workflows

```bash
# Prompt-First: Generate UI from description
"Generate a mobile login screen with email, password, social login options"

# Context-First: Extract design DNA, then generate matching screens
"Extract design context from my dashboard, then generate a settings page"

# Iterative: Generate, review, refine
"Generate a pricing table, then refine with rounded corners and gradient header"

# Code Export: Generate and export to project
"Generate a user profile card and export as React component to src/components/"
```

## When to Use

**Use this skill when:**

- Designing UI components (buttons, forms, cards, navigation)
- Creating user flows and interaction patterns
- Planning responsive layouts and breakpoints
- Ensuring accessibility (WCAG 2.1 AA compliance)
- Establishing design systems and tokens
- Reviewing existing interfaces for UX improvements
- Implementing design tokens as single source of truth

**For comprehensive design work**, use `/rd2:tasks-plan --design` command which invokes the super-designer agent.

## Stitch Integration

Google Stitch is an AI-powered UI design tool available via MCP (Model Context Protocol). It enables natural language UI generation with design system consistency.

### Prerequisites

**MCP Configuration Required:**
```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["-y", "stitch-mcp"]
    }
  }
}
```

**Verification:** Test with `mcp__stitch__list_projects` - should return empty array or project list.

### Available MCP Tools

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `mcp__stitch__create_project` | Create new Stitch project | `name`, `description` |
| `mcp__stitch__get_project` | Get project details | `projectId` |
| `mcp__stitch__list_projects` | List all projects | none |
| `mcp__stitch__list_screens` | List screens in project | `projectId` |
| `mcp__stitch__get_screen` | Get screen details + code | `projectId`, `screenId` |
| `mcp__stitch__generate_screen_from_text` | Generate UI from prompt | `projectId`, `prompt`, `deviceType`, `modelId` |

### Generation Parameters

**Device Types:**
- `MOBILE` - Mobile-first responsive design (375px viewport)
- `DESKTOP` - Desktop-optimized layout (1440px viewport)
- `TABLET` - Tablet layout (768px viewport)

**Model Options:**
- `GEMINI_3_FLASH` - Fast generation, good for iteration (default)
- `GEMINI_3_PRO` - Higher quality, better for final designs

### Basic Usage Pattern

```python
# 1. Create or select project
project = mcp__stitch__create_project(name="MyApp", description="E-commerce app")

# 2. Generate screen from prompt
screen = mcp__stitch__generate_screen_from_text(
    projectId=project.id,
    prompt="A product detail page with image carousel, price, add to cart button",
    deviceType="MOBILE",
    modelId="GEMINI_3_FLASH"
)

# 3. Get screen with generated code
details = mcp__stitch__get_screen(projectId=project.id, screenId=screen.id)
# details.code contains HTML/CSS/JS
```

## Workflow Modes

Three workflow modes for different design scenarios. See `references/stitch-workflows.md` for detailed examples.

### Prompt-First Workflow

**Best for:** New screens, quick prototypes, exploring ideas.

```
1. DESCRIBE - Write natural language UI description
2. GENERATE - Call generate_screen_from_text with prompt
3. REVIEW - Inspect generated design in Stitch
4. EXTRACT - Get code via get_screen
5. EXPORT - Save to project files
```

### Context-First Workflow

**Best for:** Maintaining visual consistency, adding screens to existing app.

```
1. EXTRACT - Get design context from existing screen
2. SAVE - Store as design-context.json
3. LOAD - Include context in new generation prompts
4. GENERATE - Create new screens matching the design DNA
5. VALIDATE - Verify consistency with existing screens
```

### Iterative Refinement Workflow

**Best for:** Polishing designs, client feedback incorporation.

```
1. GENERATE - Create initial design
2. REVIEW - Identify improvements needed
3. REFINE - Generate with specific modifications
4. COMPARE - Evaluate against previous version
5. ITERATE - Repeat until satisfied
```

## Design Context

Design context captures the "design DNA" for visual consistency across screens. See `references/design-context-schema.md` for complete schema documentation.

### Schema Summary (design-context.json)

```json
{
  "version": "1.0",
  "projectId": "stitch-project-id",
  "colors": {
    "primary": "#3b82f6",
    "background": "#ffffff",
    "text": "#1e293b"
  },
  "typography": {
    "fontFamily": "Inter, system-ui, sans-serif",
    "scale": { "base": "16px", "lg": "18px" }
  },
  "spacing": { "unit": "4px" },
  "components": { "borderRadius": "8px" }
}
```

## Code Output

Stitch generates production-ready frontend code. Export to project files with proper organization.

### Path Conventions

```
src/
├── components/
│   ├── ui/           # Generated UI components
│   └── screens/      # Generated screen components
├── styles/
│   └── tokens.css    # Extracted design tokens
└── design/
    └── design-context.json
```

### Post-Processing

After code generation, apply these steps:

1. **Format** - Run prettier/eslint on generated code
2. **Validate** - Check for syntax errors, missing imports
3. **Accessibility** - Run axe-core or similar a11y checker
4. **Integration** - Verify component fits project structure

## Fallback Mode

When Stitch is unavailable, gracefully degrade to Layer 1 patterns. See `references/fallback-patterns.md` for detailed guidance.

### Detection

**Stitch unavailable when:**
- MCP tool calls fail with connection error
- Authentication/API key errors
- Rate limiting (429 responses)
- Service unavailable (503 responses)

### Graceful Degradation

```
IF Stitch unavailable:
├── NOTIFY user with clear message
├── FALLBACK to Layer 1 patterns below
├── PROVIDE manual design guidance
└── OFFER recovery check
```

## Core Principles Summary

For detailed implementation guidance, see `references/core-principles.md`.

| Principle | Key Point |
|-----------|-----------|
| **Accessibility First** | WCAG 2.1 AA minimum, color contrast 4.5:1, keyboard nav |
| **Mobile-First** | Design for 320px, enhance for tablet/desktop |
| **Design Tokens** | Single source of truth for design decisions |
| **Visual Hierarchy** | Size, color, position, contrast, whitespace |
| **Progressive Disclosure** | Show essential info first, reveal details on demand |

### Quick Accessibility Checklist

Essential checks (see `references/accessibility-checklist.md` for complete list):

- [ ] Color contrast 4.5:1 minimum
- [ ] Visible focus indicators
- [ ] Labels for all form inputs
- [ ] Semantic HTML structure
- [ ] Keyboard navigation works

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

### Breakpoints

| Name | Width | Use |
|------|-------|-----|
| Mobile | 320px-768px | Base styles |
| Tablet | 768px-1024px | Enhanced layout |
| Desktop | 1024px+ | Full layout |

## Additional References

### Design Patterns
- **`references/core-principles.md`** - Accessibility, mobile-first, design tokens, visual hierarchy
- **`references/component-patterns.md`** - Buttons, forms, cards, navigation, layouts
- **`references/ui-patterns.md`** - Modal, dropdown, tabs, toast, accordion, tooltip
- **`references/accessibility-checklist.md`** - Complete WCAG 2.1 AA checklist
- **`references/design-tokens.md`** - Token hierarchy, naming, theming, build tools

### Stitch Workflows
- **`references/stitch-workflows.md`** - Detailed workflow documentation
- **`references/design-context-schema.md`** - Complete design context schema
- **`references/fallback-patterns.md`** - Graceful degradation patterns

## Sources

### Design Patterns & Best Practices
- [UI/UX Design: Principles, Trends, and Best Practices (ResearchGate, 2025)](https://www.researchgate.net/publication/389701340_UIUX_Design_Principles_Trends_and_Best_Practices)
- [Best Practices for Creating and Maintaining Design Systems (Medium, 2024)](https://medium.com/@melvinsanthosh_/best-practices-for-creating-and-maintaining-design-systems-d795122f59db)
- [13 Best Design System Examples in 2025 (UXPin)](https://www.uxpin.com/studio/blog/best-design-system-examples/)
- [10 UX/UI Best Practices for Modern Digital Products in 2025 (DevPulse)](https://devpulse.com/insights/ux-ui-design-best-practices-2025-enterprise-applications/)

### Accessibility
- [WCAG 2.1 Guidelines (W3C)](https://www.w3.org/TR/WCAG21/)
- [WCAG in 2025: Trends, Pitfalls & Practical Implementation (Medium)](https://medium.com/@alendennis77/wcag-in-2025-trends-pitfalls-practical-implementation-8cdc2d6e38ad)

### Design Tokens
- [Design Token-Based UI Architecture (Martin Fowler, 2024)](https://martinfowler.com/articles/design-token-based-ui-architecture.html)
- [Design Tokens Explained (Contentful, 2024)](https://www.contentful.com/blog/design-token-system/)

### Google Stitch AI
- [From idea to app: Introducing Stitch (Google Developers Blog, 2025)](https://developers.googleblog.com/stitch-a-new-way-to-design-uis/)
- [stitch-mcp on GitHub](https://github.com/Kargatharaakash/stitch-mcp)
