# Template System Reference

The image generation framework includes a **declarative template system** for reusable image generation configurations.

## Template Basics

Templates are markdown files with YAML frontmatter that define:
- Image specifications (resolution, style, backend, steps)
- Variable placeholders for dynamic content
- Default values for variables
- Output filename patterns

## Template File Format

```yaml
---
name: cover
description: Article cover image template
width: 1920
height: 817
style: vibrant
backend: huggingface
steps: 50
output_filename: "{{title | cover}}.png"
variables:
  title:
    description: Article title
    default: "Article"
  subtitle:
    description: Article subtitle
    default: ""
  topics:
    description: Main topics
    default: "technology"
keywords: ["8K", "high-quality"]
---

Professional cover image for "{{title}}"{{subtitle | - {{subtitle}}}}.
{{topics | Modern, clean, tech-focused}} design showcasing the main theme.
```

## Template Fields

### Frontmatter Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Template identifier (used in --template) |
| `description` | Yes | string | Human-readable template description |
| `width` | Yes | integer | Image width in pixels |
| `height` | Yes | integer | Image height in pixels |
| `style` | Yes | string | Pre-defined style to apply |
| `backend` | No | string | Backend to use (default: huggingface) |
| `steps` | No | integer | Inference steps (default: 50) |
| `output_filename` | No | string | Output filename pattern with variables |
| `variables` | No | object | Variable definitions with defaults |
| `keywords` | No | array | Additional keywords to append to prompt |

### Variable Syntax

Templates support variable substitution with defaults:

| Syntax | Description | Example |
|--------|-------------|---------|
| `{{variable}}` | Required variable (leaves as-is if missing) | `{{title}}` |
| `{{var \| default}}` | Variable with default value | `{{title \| Cover}}` |

### Content Variable

Special `content` variable can be populated via `--content` flag for additional context from files.

## Using Templates

```bash
# List available templates
python scripts/image_generator.py --list-templates

# Use a template with variables
python scripts/image_generator.py --template cover \
  --var title="My Article" \
  --var topics="AI and Machine Learning"

# Use template with custom output path
python scripts/image_generator.py --template illustrator \
  --var concept="Microservices Architecture" \
  --output docs/images/diagram.png

# Template with default output filename
python scripts/image_generator.py --template cover \
  --var title="Introduction to Rust"
# Output: Introduction to Rust.png
```

## Pre-defined Templates

Three default templates are included in `assets/templates/`:

### 1. `default.tpl.md`

General-purpose image generation with sensible defaults.
- **Resolution**: 1024x1024 (1:1)
- **Style**: vibrant
- **Variables**: `subject`, `mood`, `detail_level`, `content`

### 2. `cover.tpl.md`

Article cover images with cinematic aspect ratio.
- **Resolution**: 1920x817 (2.35:1)
- **Style**: vibrant
- **Variables**: `title`, `subtitle`, `topics`, `mood`, `content`

### 3. `illustrator.tpl.md`

Article illustrations for inline content.
- **Resolution**: 800x600 (4:3)
- **Style**: technical-diagram
- **Variables**: `title`, `concept`, `style_detail`, `complexity`, `content`

## Creating Custom Templates

### Project-level Templates

Store in `.image-templates/` directory at project root for project-specific overrides.

### Skill-level Templates

Store in `plugins/wt/skills/image-generate/assets/templates/` for global defaults.

### Template Resolution Order

1. `.image-templates/` (project overrides)
2. `assets/templates/` (skill defaults)

### Custom Template Example

```markdown
---
name: social-post
description: Social media post image
width: 1080
height: 1080
style: vibrant
keywords: ["engaging", "eye-catching"]
output_filename: "{{campaign | post}}.png"
variables:
  product:
    description: Product name
    default: "product"
  brand:
    description: Brand name
    default: "brand"
---

Professional {{product}} showcase for {{brand}}.
Engaging social media visual with vibrant colors and modern aesthetic.
```

## Template Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| Template not found | Template file doesn't exist | Check `--list-templates` output |
| Invalid YAML | Malformed frontmatter | Validate YAML syntax |
| Missing required fields | Frontmatter incomplete | Add required fields (name, description, width, height, style) |
| Invalid resolution | Width/height not positive integers | Use positive integer values |
