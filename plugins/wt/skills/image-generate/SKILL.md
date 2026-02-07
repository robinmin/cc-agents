---
name: image-generate
description: This skill should be used when the user asks to "generate an image", "create AI images", "make a cover image", "create illustrations", or "generate visuals for content". Provides core image generation capabilities using MCP huggingface (primary) with rd2:super-coder fallback.
version: 1.0.0
---

# Image Generate

Core image generation skill for creating AI images using text prompts. Provides a unified interface for image generation with multiple style options and resolution support.

**Architecture**: Primary (MCP huggingface) + Fallback (rd2:super-coder) for maximum reliability.

## Overview

Generate AI images from text prompts with configurable styles and resolutions. This skill serves as the foundation for specialized image tasks like cover generation and article illustrations.

### Key Principles

- **Explicit Destination**: Caller specifies output path (skill doesn't store images permanently)
- **Temp Cache**: Optional caching in `.claude/` or caller-specified location
- **Pre-defined Styles**: Common image style options for consistency
- **Hybrid Approach**: MCP huggingface (primary) + rd2:super-coder (fallback)

**When to use:** Generate standalone images from text prompts with style and resolution control. Use as the foundation when to use image generation in any workflow.

**Not for:**

- Content-aware cover generation (use `wt:image-cover` instead)
- Automatic article illustration (use `wt:image-illustrator` instead)
- Image editing or manipulation (use dedicated image tools)

## Quick Start

```bash
# Basic image generation
wt:image-generate "A server architecture diagram" --style technical-diagram --output images/architecture.png

# Cover image (21:9 ultrawide)
wt:image-generate "Microservices architecture cover" --style vibrant --resolution 1344x576 --output cover.png

# With temporary caching
wt:image-generate "Flowchart" --style sketch --output diagram.png --cache .claude/temp/

# Using templates
wt:image-generate --template cover --var title="My Article" --var topics="AI"
wt:image-generate --template illustrator --var concept="Microservices"
wt:image-generate --list-templates  # List all available templates
```

## Common Workflows

### Generate Cover Image from Article Title

```bash
# Using cover template (recommended)
wt:image-generate --template cover \
  --var title="Introduction to Microservices" \
  --var topics="distributed systems, scalability" \
  --output covers/microservices-cover.png

# Or specify parameters directly
wt:image-generate "Microservices architecture cover" \
  --style vibrant \
  --resolution 1344x576 \
  --output covers/microservices-cover.png
```

### Generate Inline Illustration

```bash
# Using illustrator template (recommended)
wt:image-generate --template illustrator \
  --var title="Microservices Architecture" \
  --var concept="API Gateway pattern" \
  --output illustrations/api-gateway.png

# Or with content context
wt:image-generate --template illustrator \
  --var concept="Database sharding strategy" \
  --content article.md \
  --output illustrations/sharding.png
```

## Configuration

Configure backends and API keys via `~/.claude/wt/config.jsonc`. Three backends available: `nano_banana` (fastest, best quality), `huggingface` (Stable Diffusion XL), and `gemini` (Google Imagen). See `references/configuration.md` for setup instructions, config options, and backend details.

**More workflows**: See `references/workflows.md` for bulk generation, custom styles, and advanced patterns.

## Prompt Engineering Principles

Beautiful images require structured prompts, not vague descriptions. Follow the **7-layer prompt anatomy**: Subject > Environment > Composition > Lighting > Color Palette > Style Anchors > Quality Keywords. Each layer adds specificity — the more precise your creative direction, the better the output.

**Key principles**: Always specify a color palette (not just "colorful"), define composition (focal point, negative space), choose lighting direction (not just "good lighting"), and anchor to a visual style. See `references/prompt-engineering.md` for the complete guide with examples and color psychology reference.

## Pre-defined Styles

| Style | Description | Emotional Tone | Best For |
|-------|-------------|----------------|----------|
| `technical-diagram` | Clean, precise illustrations | Authoritative, educational | Architecture diagrams, documentation |
| `minimalist` | Simple aesthetic, generous whitespace | Calm, sophisticated | UI mockups, clean visualizations |
| `vibrant` | Bold colors, high contrast | Exciting, energetic | Social media, marketing, thumbnails |
| `sketch` | Hand-drawn, organic lines | Authentic, personal | Concept art, wireframes, storyboards |
| `photorealistic` | Professional photography quality | Immersive, premium | Product mockups, hero images |
| `warm` | Cozy, golden-hour warmth | Comforting, inviting | Lifestyle, XHS, personal brand |
| `fresh` | Clean, natural, bright whites + greens | Refreshing, optimistic | Health, nature, product launches |
| `cute` | Pastel, rounded, kawaii-influenced | Playful, sweet | XHS lifestyle, tutorials, social media |
| `editorial` | Magazine-quality, high contrast | Authoritative, premium | Thought leadership, professional blogs |
| `custom` | User provides style description | Varies | Custom requirements |

Each style includes a detailed profile in `materials/styles/<style-name>.md` with color palette (hex codes), composition patterns, prompt transformation examples, and platform pairing recommendations.

## Platform Optimization

Choose template and style based on target platform for best results:

| Platform | Template | Resolution | Recommended Styles | Key Consideration |
|----------|----------|------------|--------------------|--------------------|
| Blog/Article cover | `cover` | 1344x576 (21:9) | vibrant, editorial | Text overlay space, cinematic feel |
| Technical docs | `illustrator` | 1152x864 (4:3) | technical-diagram, minimalist | Clarity, whitespace, readability |
| XHS/Xiaohongshu | `cover-xhs` | 864x1152 (3:4) | warm, cute, fresh | Mobile-first, save-worthy, warm tones |
| Social square | `default` | 1024x1024 (1:1) | vibrant, fresh | Centered composition, mobile-friendly |
| YouTube thumbnail | — | 1280x720 (16:9) | vibrant, editorial | High contrast, readable at small size |
| Instagram portrait | — | 832x1248 (2:3) | fresh, warm, cute | Eye-catching in feed scroll |

## Template System

Templates are `.tpl.md` files with YAML frontmatter defining image specs, variables with defaults, and prompt body. Variable syntax: `{{var}}` (required) or `{{var | default}}` (with fallback).

**Pre-defined Templates:**
- `default.tpl.md` - General-purpose (1024x1024, vibrant)
- `cover.tpl.md` - Article covers (1344x576, 21:9)
- `illustrator.tpl.md` - Inline illustrations (1152x864, 4:3)
- `cover-xhs.tpl.md` - XHS/Xiaohongshu covers (864x1152, 3:4 portrait)

**Resolution order:** `.image-templates/` (project overrides) > `assets/templates/` (skill defaults).

See `references/template-system.md` for creating custom templates, variable syntax, and error handling.

## Workflow

### Generation Process

1. **Accept input parameters**: prompt, style, resolution, output path, optional cache
2. **Enhance prompt** with style-specific modifiers
3. **Try MCP huggingface** (primary method):
   - Use Python wrapper script to call HuggingFace API
   - Handle authentication and error cases
4. **Fallback to rd2:super-coder** if MCP fails:
   - Generate dynamic prompt based on user input
   - Create task file in `materials/tasks/`
   - Delegate to rd2:super-coder with image generation tools
5. **Store materials** in `materials/` for iteration
6. **Return output path** to caller

### Error Handling

| Error Type | Retry Strategy | Fallback |
|------------|----------------|----------|
| MCP unavailable | 3 retries with exponential backoff | rd2:super-coder |
| API timeout | Increase timeout, retry | rd2:super-coder |
| Invalid prompt | Ask for clarification | - |
| Output path invalid | Validate directory, ask user | - |

## Integration Points

### Image Generation Backends

This skill uses `scripts/image_generator.py` with automatic backend selection (priority: `huggingface` -> `gemini` -> `nano_banana`). See `references/configuration.md` for backend details, API requirements, and MCP resolution format.

### Style Enhancement

Style modifiers are loaded from `materials/styles.yaml` (single source of truth) and appended to user prompts. Each style also has a detailed profile in `materials/styles/<style-name>.md` with color palettes, composition patterns, and prompt transformation examples.

## Input Parameters

```yaml
# Required parameters
prompt: "image description"          # Text description of desired image
output: "/path/to/save/image.png"    # Where to save the generated image

# Optional parameters
style: "technical-diagram|minimalist|vibrant|sketch|photorealistic|warm|fresh|cute|editorial|custom"
resolution: "1280x720"               # Default: 1024x1024 (16:9 example)
cache: "/path/to/temp/"              # Optional: temp cache location
custom_style: "style description"    # Required if style=custom
model: "model-name"                  # Optional: override default model
```

## Output

```yaml
# Success
status: "success"
output_path: "/path/to/saved/image.png"
method: "mcp_huggingface" | "rd2_super_coder"
resolution: "WIDTHxHEIGHT"
style: "style-name"
prompt_used: "enhanced prompt"

# Error
status: "error"
error: "error message"
fallback_attempted: true | false
```

## Related Skills

- `wt:image-cover` - Cover image generation (2.35:1, content-aware)
- `wt:image-illustrator` - Article illustration generation (position detection)

## References

### External Documentation
- HuggingFace API documentation: https://huggingface.co/docs/api-inference
- Stable Diffusion models: https://huggingface.co/models?pipeline_tag=text-to-image
- MCP Huggingface integration

### Skill Reference Files
- **`references/configuration.md`** - Backend setup, API keys, config options, MCP resolution format, and backend priority order
- **`references/prompt-engineering.md`** - 7-layer prompt anatomy, color psychology, composition rules, and weak-vs-strong prompt examples
- **`references/template-system.md`** - Complete template system guide including custom templates, variable syntax, and error handling
- **`references/workflows.md`** - Step-by-step workflow examples for common tasks (cover generation, illustrations, bulk generation)
- **`references/troubleshooting.md`** - Common issues and solutions for API keys, backend selection, resolution mapping, and template errors

---

**Note**: This is a CORE skill - other skills (image-cover, image-illustrator) compose this skill for specialized use cases.
