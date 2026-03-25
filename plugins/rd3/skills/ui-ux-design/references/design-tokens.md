---
name: design-tokens
description: "Complete guide to design token implementation: three-tier hierarchy (primitive, semantic, component), CSS variable output, theming, and build tools like Style Dictionary."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
type: reference
tags: [ui-ux, design-tokens, css-variables, theming, style-dictionary]
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
  - rd3:ui-ux-design/references/component-patterns
---

# Design Token Implementation Reference

Comprehensive guide to implementing design tokens as a single source of truth for design and engineering.

## Token Hierarchy

Design tokens follow a three-tier hierarchy:

```
Primitive Tokens     (base values, raw colors/sizes)
        │
        ▼
Semantic Tokens      (purpose-driven aliases)
        │
        ▼
Component Tokens     (component-specific overrides)
        │
        ▼
Final Output
```

### Primitive Tokens

Raw, context-free values. Named by appearance, not purpose.

```json
{
  "color": {
    "blue": {
      "50": "#eff6ff",
      "100": "#dbeafe",
      "500": "#3b82f6",
      "600": "#2563eb",
      "700": "#1d4ed8"
    },
    "gray": {
      "50": "#f9fafb",
      "100": "#f3f4f6",
      "600": "#4b5563",
      "900": "#111827"
    }
  },
  "spacing": {
    "1": "4px",
    "2": "8px",
    "4": "16px",
    "6": "24px",
    "8": "32px"
  },
  "borderRadius": {
    "none": "0",
    "sm": "2px",
    "md": "4px",
    "lg": "8px",
    "full": "9999px"
  }
}
```

### Semantic Tokens

Purpose-driven tokens that reference primitives. Named by function.

```json
{
  "color": {
    "background": { "default": "{color.white}", "subtle": "{color.gray.50}" },
    "text": { "default": "{color.gray.900}", "muted": "{color.gray.600}" },
    "primary": { "default": "{color.blue.500}", "hover": "{color.blue.600}" },
    "border": { "default": "{color.gray.200}" },
    "status": {
      "success": "#22c55e",
      "warning": "#f59e0b",
      "error": "#ef4444",
      "info": "#3b82f6"
    }
  },
  "spacing": {
    "component": { "xs": "{spacing.1}", "sm": "{spacing.2}", "md": "{spacing.4}" }
  }
}
```

### Component Tokens

Component-specific overrides that reference semantic tokens.

```json
{
  "button": {
    "primary": {
      "background": "{color.primary.default}",
      "backgroundHover": "{color.primary.hover}",
      "text": "{color.text.inverted}",
      "borderRadius": "{borderRadius.lg}",
      "paddingX": "{spacing.component.lg}",
      "paddingY": "{spacing.component.md}"
    }
  },
  "input": {
    "background": "{color.background.default}",
    "border": "{color.border.default}",
    "borderFocus": "{color.primary.default}",
    "borderRadius": "{borderRadius.md}",
    "padding": "{spacing.component.md}"
  }
}
```

## File Structure

```
design-tokens/
├── tokens/
│   ├── base/colors.json, spacing.json, typography.json, effects.json
│   ├── semantic/colors.json, spacing.json, typography.json
│   └── component/button.json, input.json, card.json
├── themes/light.json, dark.json
└── platforms/css/variables.css, scss/_variables.scss, ios/, android/
```

## CSS Variable Output

```css
:root {
  /* Primitive tokens */
  --color-blue-500: #3b82f6;
  --color-gray-900: #111827;
  --color-gray-600: #4b5563;

  /* Semantic tokens */
  --color-primary: var(--color-blue-500);
  --color-text-default: var(--color-gray-900);
  --color-text-muted: var(--color-gray-600);
  --color-background: #ffffff;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;

  /* Effects */
  --radius-sm: 4px;
  --radius-md: 8px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
}

[data-theme="dark"] {
  --color-background: var(--color-gray-900);
  --color-text-default: #ffffff;
}
```

## Naming Convention

```
{category}-{property}-{variant}-{state}
```

| Token | Meaning |
|-------|---------|
| `color-primary-default` | Primary brand color |
| `color-primary-hover` | Primary color on hover |
| `color-text-muted` | Muted text color |
| `spacing-component-md` | Medium component spacing |
| `button-primary-background` | Primary button background |

## Theming

### Light/Dark Theme Structure

```json
{
  "themes": {
    "light": {
      "color": { "background": "{color.white}", "text": "{color.gray.900}", "primary": "{color.blue.500}" }
    },
    "dark": {
      "color": { "background": "{color.gray.900}", "text": "{color.white}", "primary": "{color.blue.400}" }
    }
  }
}
```

### Theme Switching CSS

```css
/* Light theme (default) */
:root {
  --color-bg: #ffffff;
  --color-text: #111827;
}

/* Dark theme */
[data-theme="dark"] {
  --color-bg: #111827;
  --color-text: #ffffff;
}

/* System preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --color-bg: #111827;
    --color-text: #ffffff;
  }
}
```

## Build Tools

### Style Dictionary

```javascript
// config.js
module.exports = {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'build/css/',
      files: [{ destination: 'variables.css', format: 'css/variables' }]
    },
    scss: {
      transformGroup: 'scss',
      buildPath: 'build/scss/',
      files: [{ destination: '_variables.scss', format: 'scss/variables' }]
    }
  }
};
```

## Quick Reference

### Color System

```css
/* Primitives */
--color-{hue}-{shade}  /* e.g., color-blue-500 */

/* Semantic */
--color-primary        /* Brand color */
--color-text-default   /* Main text */
--color-text-muted    /* Secondary text */
--color-background    /* Page background */
--color-surface       /* Card/panel background */
--color-border        /* Default borders */
--color-error         /* Error states */
--color-success       /* Success states */
```

### Spacing

```css
--spacing-{scale}        /* xs, sm, md, lg, xl, 2xl */
--spacing-component-*     /* For component internals */
--spacing-layout-*       /* For page-level spacing */
```

### Effects

```css
--radius-{size}        /* sm, md, lg, full */
--shadow-{size}        /* sm, md, lg */
```
