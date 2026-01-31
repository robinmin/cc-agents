# Design Token Implementation Reference

Comprehensive guide to implementing design tokens as a single source of truth for design and engineering.

Sources:
- [Design Token-Based UI Architecture (Martin Fowler, 2024)](https://martinfowler.com/articles/design-token-based-ui-architecture.html)
- [Design Tokens Explained (Contentful, 2024)](https://www.contentful.com/blog/design-token-system/)
- [State of Design Tokens 2024 Report (Supernova)](https://www.supernova.io/state-of-design-tokens)

## Token Hierarchy

Design tokens follow a three-tier hierarchy:

```
Primitive Tokens
    │ (base values, raw colors/sizes)
    ▼
Semantic Tokens
    │ (purpose-driven aliases)
    ▼
Component Tokens
    │ (component-specific overrides)
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
      "200": "#bfdbfe",
      "300": "#93c5fd",
      "400": "#60a5fa",
      "500": "#3b82f6",
      "600": "#2563eb",
      "700": "#1d4ed8",
      "800": "#1e40af",
      "900": "#1e3a8a"
    },
    "gray": {
      "50": "#f9fafb",
      "100": "#f3f4f6",
      "200": "#e5e7eb",
      "300": "#d1d5db",
      "400": "#9ca3af",
      "500": "#6b7280",
      "600": "#4b5563",
      "700": "#374151",
      "800": "#1f2937",
      "900": "#111827"
    }
  },
  "spacing": {
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px"
  },
  "borderRadius": {
    "none": "0",
    "sm": "2px",
    "md": "4px",
    "lg": "8px",
    "xl": "12px",
    "full": "9999px"
  }
}
```

### Semantic Tokens

Purpose-driven tokens that reference primitives. Named by function.

```json
{
  "color": {
    "background": {
      "default": "{color.white}",
      "subtle": "{color.gray.50}",
      "emphasis": "{color.gray.100}"
    },
    "text": {
      "default": "{color.gray.900}",
      "muted": "{color.gray.600}",
      "inverted": "{color.white}"
    },
    "primary": {
      "default": "{color.blue.500}",
      "hover": "{color.blue.600}",
      "active": "{color.blue.700}"
    },
    "border": {
      "default": "{color.gray.200}",
      "emphasis": "{color.gray.300}"
    },
    "status": {
      "success": "#22c55e",
      "warning": "#f59e0b",
      "error": "#ef4444",
      "info": "#3b82f6"
    }
  },
  "spacing": {
    "component": {
      "xs": "{spacing.1}",
      "sm": "{spacing.2}",
      "md": "{spacing.4}",
      "lg": "{spacing.6}",
      "xl": "{spacing.8}"
    },
    "layout": {
      "section": "{spacing.16}",
      "page": "{spacing.12}"
    }
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
    },
    "secondary": {
      "background": "transparent",
      "border": "{color.border.default}",
      "text": "{color.text.default}",
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
│   ├── base/
│   │   ├── colors.json
│   │   ├── spacing.json
│   │   ├── typography.json
│   │   └── effects.json
│   ├── semantic/
│   │   ├── colors.json
│   │   ├── spacing.json
│   │   └── typography.json
│   └── component/
│       ├── button.json
│       ├── input.json
│       └── card.json
├── themes/
│   ├── light.json
│   └── dark.json
└── platforms/
    ├── css/
    │   └── variables.css
    ├── scss/
    │   └── _variables.scss
    ├── ios/
    │   └── StyleDictionary.swift
    └── android/
        └── colors.xml
```

## CSS Variable Output

```css
:root {
  /* Primitive tokens */
  --color-blue-500: #3b82f6;
  --color-gray-900: #111827;
  --color-gray-600: #4b5563;
  --color-white: #ffffff;

  /* Semantic tokens */
  --color-primary: var(--color-blue-500);
  --color-text-default: var(--color-gray-900);
  --color-text-muted: var(--color-gray-600);
  --color-background: var(--color-white);

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Typography */
  --font-family: Inter, system-ui, sans-serif;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;

  /* Effects */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
}

/* Dark theme override */
[data-theme="dark"] {
  --color-background: var(--color-gray-900);
  --color-text-default: var(--color-white);
  --color-text-muted: var(--color-gray-400);
}
```

## Naming Convention

### Format

```
{category}-{property}-{variant}-{state}
```

### Examples

| Token | Meaning |
|-------|---------|
| `color-primary-default` | Primary brand color |
| `color-primary-hover` | Primary color on hover |
| `color-text-muted` | Muted text color |
| `spacing-component-md` | Medium component spacing |
| `button-primary-background` | Primary button background |

### Rules

1. Use lowercase and hyphens
2. Move from general to specific
3. Include state when applicable
4. Reference primitives in semantics
5. Reference semantics in components

## Theming

### Light/Dark Theme Structure

```json
{
  "themes": {
    "light": {
      "color": {
        "background": "{color.white}",
        "text": "{color.gray.900}",
        "primary": "{color.blue.500}"
      }
    },
    "dark": {
      "color": {
        "background": "{color.gray.900}",
        "text": "{color.white}",
        "primary": "{color.blue.400}"
      }
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

Popular token transformation tool:

```javascript
// config.js
module.exports = {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'build/css/',
      files: [{
        destination: 'variables.css',
        format: 'css/variables'
      }]
    },
    scss: {
      transformGroup: 'scss',
      buildPath: 'build/scss/',
      files: [{
        destination: '_variables.scss',
        format: 'scss/variables'
      }]
    }
  }
};
```

### Token Studio

Figma plugin for design-to-token sync:

1. Define tokens in Figma
2. Export to JSON
3. Transform with Style Dictionary
4. Generate platform-specific code

## Best Practices

### DO

- [ ] Use semantic tokens in components (not primitives)
- [ ] Keep primitives technology-agnostic
- [ ] Version control token files
- [ ] Generate platform-specific output automatically
- [ ] Document token purpose and usage
- [ ] Test token changes across all platforms
- [ ] Use references instead of hard-coded values

### DON'T

- [ ] Hard-code color values in components
- [ ] Use primitive tokens directly in UI code
- [ ] Create one-off tokens for single uses
- [ ] Mix naming conventions
- [ ] Forget dark mode considerations
- [ ] Skip the semantic layer

## Quick Reference

### Color System

```css
/* Primitives */
--color-{hue}-{shade}  /* e.g., color-blue-500 */

/* Semantic */
--color-primary        /* Brand color */
--color-text-default   /* Main text */
--color-text-muted     /* Secondary text */
--color-background     /* Page background */
--color-surface        /* Card/panel background */
--color-border         /* Default borders */
--color-error          /* Error states */
--color-success        /* Success states */
```

### Typography

```css
--font-family          /* Primary font stack */
--font-size-{scale}    /* xs, sm, base, lg, xl, 2xl */
--font-weight-{name}   /* normal, medium, semibold, bold */
--line-height-{name}   /* tight, normal, relaxed */
```

### Spacing

```css
--spacing-{scale}      /* xs, sm, md, lg, xl, 2xl */
--spacing-component-*  /* For component internals */
--spacing-layout-*     /* For page-level spacing */
```

### Effects

```css
--radius-{size}        /* sm, md, lg, full */
--shadow-{size}        /* sm, md, lg, xl */
```
