# Design Context Schema Reference

Complete schema documentation for design-context.json files used to maintain visual consistency across Stitch-generated screens.

## Schema Overview

The design context captures the "design DNA" of your application - the colors, typography, spacing, and component styles that define your visual identity.

## Complete Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Design Context",
  "description": "Design DNA for visual consistency across UI screens",
  "type": "object",
  "required": ["version", "colors", "typography", "spacing", "components"],
  "properties": {
    "version": {
      "type": "string",
      "description": "Schema version",
      "const": "1.0"
    },
    "projectId": {
      "type": "string",
      "description": "Stitch project ID for reference"
    },
    "extractedFrom": {
      "type": "string",
      "description": "Screen ID or 'manual' if hand-crafted"
    },
    "extractedAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO timestamp of extraction"
    },
    "colors": {
      "$ref": "#/$defs/colors"
    },
    "typography": {
      "$ref": "#/$defs/typography"
    },
    "spacing": {
      "$ref": "#/$defs/spacing"
    },
    "components": {
      "$ref": "#/$defs/components"
    }
  },
  "$defs": {
    "colors": {
      "type": "object",
      "description": "Color palette",
      "required": ["primary", "background", "text"],
      "properties": {
        "primary": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "secondary": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "accent": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "background": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "surface": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "text": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "textMuted": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "border": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "error": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "success": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "warning": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "info": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" }
      }
    },
    "typography": {
      "type": "object",
      "description": "Typography settings",
      "required": ["fontFamily"],
      "properties": {
        "fontFamily": { "type": "string" },
        "headingWeight": { "type": "string" },
        "bodyWeight": { "type": "string" },
        "scale": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        }
      }
    },
    "spacing": {
      "type": "object",
      "description": "Spacing system",
      "required": ["unit"],
      "properties": {
        "unit": { "type": "string" },
        "scale": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "components": {
      "type": "object",
      "description": "Component styling",
      "properties": {
        "borderRadius": { "type": "string" },
        "buttonStyle": { "type": "string" },
        "cardStyle": { "type": "string" },
        "inputStyle": { "type": "string" },
        "shadowStyle": { "type": "string" }
      }
    }
  }
}
```

## Example Instances

### Light Theme (SaaS Application)

```json
{
  "version": "1.0",
  "projectId": "proj_abc123",
  "extractedFrom": "screen_dashboard_main",
  "extractedAt": "2026-01-30T12:00:00Z",
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#6366f1",
    "accent": "#8b5cf6",
    "background": "#ffffff",
    "surface": "#f8fafc",
    "text": "#1e293b",
    "textMuted": "#64748b",
    "border": "#e2e8f0",
    "error": "#ef4444",
    "success": "#22c55e",
    "warning": "#f59e0b",
    "info": "#0ea5e9"
  },
  "typography": {
    "fontFamily": "Inter, system-ui, sans-serif",
    "headingWeight": "600",
    "bodyWeight": "400",
    "scale": {
      "xs": "12px",
      "sm": "14px",
      "base": "16px",
      "lg": "18px",
      "xl": "20px",
      "2xl": "24px",
      "3xl": "30px",
      "4xl": "36px"
    }
  },
  "spacing": {
    "unit": "4px",
    "scale": ["4px", "8px", "12px", "16px", "24px", "32px", "48px", "64px"]
  },
  "components": {
    "borderRadius": "8px",
    "buttonStyle": "rounded with subtle shadow, solid fill for primary",
    "cardStyle": "rounded corners (8px), light border, subtle shadow on hover",
    "inputStyle": "bordered (1px), rounded (6px), focus ring on focus",
    "shadowStyle": "subtle, layered shadows for depth"
  }
}
```

### Dark Theme (Developer Tool)

```json
{
  "version": "1.0",
  "projectId": "proj_dev_tool",
  "extractedFrom": "screen_code_editor",
  "extractedAt": "2026-01-30T12:00:00Z",
  "colors": {
    "primary": "#22d3ee",
    "secondary": "#a78bfa",
    "accent": "#f472b6",
    "background": "#0f172a",
    "surface": "#1e293b",
    "text": "#f1f5f9",
    "textMuted": "#94a3b8",
    "border": "#334155",
    "error": "#f87171",
    "success": "#4ade80",
    "warning": "#fbbf24",
    "info": "#38bdf8"
  },
  "typography": {
    "fontFamily": "JetBrains Mono, monospace",
    "headingWeight": "700",
    "bodyWeight": "400",
    "scale": {
      "xs": "11px",
      "sm": "13px",
      "base": "14px",
      "lg": "16px",
      "xl": "18px",
      "2xl": "22px"
    }
  },
  "spacing": {
    "unit": "4px",
    "scale": ["4px", "8px", "12px", "16px", "20px", "24px", "32px"]
  },
  "components": {
    "borderRadius": "4px",
    "buttonStyle": "sharp corners, outlined for secondary, solid for primary",
    "cardStyle": "subtle border, no shadow, solid background",
    "inputStyle": "dark background, subtle border, cyan focus ring",
    "shadowStyle": "minimal, used sparingly"
  }
}
```

### E-commerce (Consumer App)

```json
{
  "version": "1.0",
  "projectId": "proj_ecommerce",
  "extractedFrom": "screen_product_listing",
  "extractedAt": "2026-01-30T12:00:00Z",
  "colors": {
    "primary": "#ea580c",
    "secondary": "#0d9488",
    "accent": "#d946ef",
    "background": "#fffbeb",
    "surface": "#ffffff",
    "text": "#292524",
    "textMuted": "#78716c",
    "border": "#e7e5e4",
    "error": "#dc2626",
    "success": "#16a34a",
    "warning": "#ca8a04",
    "info": "#2563eb"
  },
  "typography": {
    "fontFamily": "Poppins, system-ui, sans-serif",
    "headingWeight": "700",
    "bodyWeight": "400",
    "scale": {
      "xs": "12px",
      "sm": "14px",
      "base": "16px",
      "lg": "18px",
      "xl": "22px",
      "2xl": "28px",
      "3xl": "36px"
    }
  },
  "spacing": {
    "unit": "4px",
    "scale": ["4px", "8px", "16px", "24px", "32px", "48px", "64px"]
  },
  "components": {
    "borderRadius": "12px",
    "buttonStyle": "fully rounded (pill), bold text, shadow on hover",
    "cardStyle": "rounded (12px), white background, shadow, hover lift",
    "inputStyle": "rounded (8px), thick border on focus, placeholder styling",
    "shadowStyle": "warm, soft shadows with color tint"
  }
}
```

## Field Reference

### colors

| Field | Required | Description | WCAG Note |
|-------|----------|-------------|-----------|
| primary | Yes | Main brand/action color | Should have 4.5:1 contrast on background |
| secondary | No | Secondary actions/accents | Should have 3:1 contrast minimum |
| accent | No | Highlights, decorative | Use sparingly |
| background | Yes | Page background | - |
| surface | No | Card/panel backgrounds | Should differ from background |
| text | Yes | Primary text color | 4.5:1 contrast on background required |
| textMuted | No | Secondary/helper text | 4.5:1 contrast recommended |
| border | No | Default border color | 3:1 contrast for UI components |
| error | No | Error states | Should be clearly distinguishable |
| success | No | Success states | Should be clearly distinguishable |
| warning | No | Warning states | Should be clearly distinguishable |
| info | No | Informational states | Should be clearly distinguishable |

### typography

| Field | Required | Description | Best Practice |
|-------|----------|-------------|---------------|
| fontFamily | Yes | Primary font stack | Include fallbacks |
| headingWeight | No | Weight for headings | Usually 600-700 |
| bodyWeight | No | Weight for body text | Usually 400 |
| scale | No | Size scale map | Use consistent ratio |

### spacing

| Field | Required | Description | Best Practice |
|-------|----------|-------------|---------------|
| unit | Yes | Base spacing unit | 4px or 8px common |
| scale | No | Array of spacing values | Use multiples of unit |

### components

| Field | Required | Description | Best Practice |
|-------|----------|-------------|---------------|
| borderRadius | No | Default corner radius | 4-12px for modern look |
| buttonStyle | No | Button appearance description | Include all states |
| cardStyle | No | Card appearance description | Include hover state |
| inputStyle | No | Form input appearance | Include focus state |
| shadowStyle | No | Shadow treatment description | Subtle is usually better |

## Operations

### Extraction

Extract design context from a Stitch screen:

```python
def extract_design_context(project_id: str, screen_id: str) -> dict:
    """Extract design DNA from a Stitch screen."""
    screen = mcp__stitch__get_screen(project_id, screen_id)

    # Parse the code to extract design tokens
    context = {
        "version": "1.0",
        "projectId": project_id,
        "extractedFrom": screen_id,
        "extractedAt": datetime.utcnow().isoformat() + "Z",
        "colors": extract_colors(screen.code),
        "typography": extract_typography(screen.code),
        "spacing": extract_spacing(screen.code),
        "components": extract_component_styles(screen.code)
    }

    return context
```

### Loading

Load design context into a generation prompt:

```python
def format_context_for_prompt(context: dict) -> str:
    """Format design context for inclusion in Stitch prompt."""
    parts = []

    # Colors
    colors = context.get("colors", {})
    color_str = ", ".join(f"{k}={v}" for k, v in colors.items() if v)
    parts.append(f"Colors: {color_str}")

    # Typography
    typo = context.get("typography", {})
    parts.append(f"Typography: {typo.get('fontFamily', 'system-ui')}, "
                 f"{typo.get('scale', {}).get('base', '16px')} base")

    # Components
    comp = context.get("components", {})
    parts.append(f"Components: {comp.get('borderRadius', '8px')} radius, "
                 f"{comp.get('buttonStyle', 'rounded')}")

    return "\n".join(parts)
```

### Validation

Validate generated output against design context:

```python
def validate_against_context(generated_code: str, context: dict) -> list:
    """Check generated code for design context violations."""
    warnings = []

    # Extract colors from generated code
    generated_colors = extract_colors(generated_code)
    context_colors = context.get("colors", {})

    # Check for color deviations
    for key, expected in context_colors.items():
        if key in generated_colors:
            actual = generated_colors[key]
            if color_distance(expected, actual) > 0.1:  # 10% tolerance
                warnings.append(f"Color mismatch: {key} expected {expected}, got {actual}")

    return warnings
```

### Updating

Update design context with new values:

```python
def update_design_context(context: dict, updates: dict) -> dict:
    """Update specific fields in design context."""
    import copy

    new_context = copy.deepcopy(context)
    new_context["extractedAt"] = datetime.utcnow().isoformat() + "Z"

    for key, value in updates.items():
        if key in new_context and isinstance(new_context[key], dict):
            new_context[key].update(value)
        else:
            new_context[key] = value

    return new_context
```

## File Location

Store design context files in your project:

```
project/
├── src/
│   └── ...
└── design/
    ├── design-context.json      # Primary context
    ├── design-context.dark.json # Dark theme variant
    └── design-context.mobile.json # Mobile-specific overrides
```

## Migration

When updating from one design context to another:

1. Create new context file (don't overwrite)
2. Compare differences between versions
3. Generate transition plan for existing screens
4. Update screens incrementally
5. Archive old context for reference

## Best Practices

1. **Single source of truth** - One primary design-context.json per project
2. **Version control** - Track changes in git
3. **Extract early** - Create context from first screen
4. **Validate often** - Check generated output against context
5. **Update deliberately** - Changes affect all future generations
6. **Document decisions** - Add comments for non-obvious choices
