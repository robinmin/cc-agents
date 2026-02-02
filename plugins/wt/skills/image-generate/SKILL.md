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

## When to Use

Activate this skill when:

- Generating images from text descriptions
- Creating visuals for articles, blog posts, or documentation
- Generating cover images with specific aspect ratios
- Creating illustrations for technical content
- Needing consistent visual style across multiple images

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

The wt plugin supports centralized configuration via `~/.claude/wt/config.jsonc`.

### Setting Up Configuration

1. **Copy the example config:**
```bash
mkdir -p ~/.claude/wt
cp plugins/wt/skills/technical-content-creation/assets/config.example.jsonc ~/.claude/wt/config.jsonc
```

2. **Edit your config:**
```bash
# Edit with your preferred editor
nano ~/.claude/wt/config.jsonc
```

3. **Add your API keys:**
```jsonc
{
  "env": {
    "HUGGINGFACE_API_TOKEN": "hf_xxxx...",
    "GEMINI_API_KEY": "AIzaSy..."
  },
  "image_generation": {
    "backend": "nano_banana",
    "default_resolution": "1024x1024",
    "default_steps": 8
  }
}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `env.HUGGINGFACE_API_TOKEN` | HuggingFace API token | (required for huggingface backend) |
| `env.GEMINI_API_KEY` | Google Gemini API key | (required for gemini backend) |
| `image_generation.backend` | Preferred backend | `nano_banana` |
| `image_generation.default_resolution` | Default resolution | `1024x1024` |
| `image_generation.default_steps` | Default inference steps | `8` (Z-Image Turbo) |

### Available Backends

| Backend | Description | Quality | Speed |
|---------|-------------|---------|-------|
| `nano_banana` | Z-Image Turbo via MCP | ⭐⭐⭐⭐⭐ | Fast (4-8 steps) |
| `huggingface` | Stable Diffusion XL | ⭐⭐⭐⭐ | Medium (20-50 steps) |
| `gemini` | Google Imagen | ⭐⭐⭐⭐ | Medium |

**More workflows**: See `references/workflows.md` for bulk generation, custom styles, and advanced patterns.

## Pre-defined Styles

| Style | Description | Use Case |
|-------|-------------|----------|
| `technical-diagram` | Clean, technical illustrations | Architecture diagrams, flowcharts |
| `minimalist` | Simple, clean aesthetic | Modern UI, minimal designs |
| `vibrant` | Bold colors, high contrast | Social media, eye-catching visuals |
| `sketch` | Hand-drawn, artistic feel | Concept art, informal diagrams |
| `photorealistic` | Realistic images | Product mockups, realistic scenes |
| `custom` | User provides style description | Custom requirements |

## Template System

The image generation framework includes a **declarative template system** for reusable image generation configurations.

### Quick Template Usage

```bash
# List available templates
python scripts/image_generator.py --list-templates

# Use a template with variables
python scripts/image_generator.py --template cover \
  --var title="My Article" \
  --var topics="AI and Machine Learning"

# Template with custom output path
python scripts/image_generator.py --template illustrator \
  --var concept="Microservices Architecture" \
  --output docs/images/diagram.png
```

### Template Basics

Templates are markdown files with YAML frontmatter that define:
- Image specifications (resolution, style, backend, steps)
- Variable placeholders for dynamic content
- Default values for variables
- Output filename patterns

**Variable Syntax:**
- `{{variable}}` - Required variable (leaves as-is if missing)
- `{{var | default}}` - Variable with default value

**Template Resolution Order:**
1. `.image-templates/` (project overrides)
2. `assets/templates/` (skill defaults)

**Pre-defined Templates:**
- `default.tpl.md` - General-purpose (1024x1024, vibrant)
- `cover.tpl.md` - Article covers (1344x576, 21:9)
- `illustrator.tpl.md` - Inline illustrations (1152x864, 4:3)

**Detailed template guide**: See `references/template-system.md` for creating custom templates, error handling, and advanced patterns.

## Resolution Options

**Note:** When using the nano_banana backend (Z-Image Turbo via MCP), only specific resolutions are supported:

| Resolution | Aspect Ratio | Use Case |
|------------|--------------|----------|
| 1024x1024 | 1:1 | Social media, square images |
| 1344x576 | 21:9 | Cinematic covers, ultrawide headers |
| 1280x720 | 16:9 | Blog headers, YouTube thumbnails |
| 1248x832 | 3:2 | Photo ratio images |
| 1152x864 | 4:3 | Inline illustrations, standard displays |
| 576x1344 | 9:21 | Portrait ultrawide |
| 720x1280 | 9:16 | Portrait thumbnails |
| 832x1248 | 2:3 | Portrait photo ratio |
| 864x1152 | 3:4 | Portrait standard |

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

## Materials Storage

```
skills/image-generate/materials/
├── prompts/           # Enhanced prompts used
│   ├── prompt-001.md  # Timestamped prompt logs
│   └── styles/        # Style-specific templates
├── tasks/             # Task files for rd2:super-coder
│   ├── task-template.md
│   └── generated/     # Generated task files
├── styles/            # Style definitions and templates
│   ├── technical-diagram.md
│   ├── minimalist.md
│   ├── vibrant.md
│   ├── sketch.md
│   └── photorealistic.md
└── cache/             # Temporary image cache (optional)

skills/image-generate/assets/
└── templates/         # Template system (.tpl.md files)
    ├── default.tpl.md
    ├── cover.tpl.md
    └── illustrator.tpl.md

# Project-level overrides (optional)
.image-templates/       # Custom templates for specific project
    └── custom.tpl.md
```

## Integration Points

### Image Generation Backends

This skill uses the common image generation framework (`scripts/image_generator.py`) which supports multiple backends:

**Primary: HuggingFace API**
- Uses `scripts/image_generator.py --backend huggingface`
- Requires: `HUGGINGFACE_API_TOKEN` environment variable
- Model: `stabilityai/stable-diffusion-xl-base-1.0` (default)
- Installation: `uv add requests Pillow`

**Fallback 1: Gemini Imagen API**
- Uses `scripts/image_generator.py --backend gemini`
- Requires: `GEMINI_API_KEY` environment variable
- Model: `imagen-3.0-generate-001` (default)
- Installation: `uv add google-genai`
- Supports aspect ratios: 1:1, 4:3, 3:4, 16:9, 9:16
- Documentation: [Generate images using Imagen](https://ai.google.dev/gemini-api/docs/imagen)

**Fallback 2: nano banana (Z-Image Turbo via MCP)**
- Uses `scripts/image_generator.py --backend nano_banana`
- Requires: MCP HuggingFace server configured
- Model: `Z-Image-Turbo` (via `mcp__huggingface__gr1_z_image_turbo_generate`)
- Supports **9 resolution options** with various aspect ratios (see Resolution Options above)
- Fast generation: 1-20 inference steps
- Resolution auto-mapping to closest supported size

**CRITICAL - MCP Resolution Format:**
When invoking the MCP tool directly, the resolution parameter requires exact formatting:
- Format: `"WIDTHxHEIGHT ( RATIO )"` with **TWO spaces** before `(` and after `)`
- Examples: `"1024x1024 ( 1:1 )"`, `"1280x720 ( 16:9 )"`, `"1344x576 ( 21:9 )"`
- Incorrect: `"1280x720 (16:9)"` (missing space before parenthesis)
- Use `NanoBananaBackend.get_mcp_params()` or the RESOLUTION_MAP to get correct format

The framework automatically selects the best available backend in priority order, or you can specify `--backend` to use a specific one.

Backend priority order: `huggingface` → `gemini` → `nano_banana`

```
Create task file: materials/tasks/image-generation-{timestamp}.md
Delegate to: rd2:super-coder
Tool selection: agy (Agy) or gemini for image generation
```

### Style Enhancement

Enhance user prompt with style-specific modifiers:

```python
def enhance_prompt(user_prompt: str, style: str) -> str:
    """Add style-specific modifiers to user prompt."""
    style_modifiers = {
        "technical-diagram": ", clean technical illustration, precise lines, professional diagram style, minimal colors",
        "minimalist": ", minimalist design, clean lines, simple aesthetic, plenty of whitespace",
        "vibrant": ", bold colors, high contrast, vibrant and energetic, eye-catching",
        "sketch": ", hand-drawn sketch style, artistic, pencil drawing feel, organic lines",
        "photorealistic": ", photorealistic, highly detailed, realistic lighting, professional photography"
    }
    return user_prompt + style_modifiers.get(style, "")
```

## Input Parameters

```yaml
# Required parameters
prompt: "image description"          # Text description of desired image
output: "/path/to/save/image.png"    # Where to save the generated image

# Optional parameters
style: "technical-diagram|minimalist|vibrant|sketch|photorealistic|custom"
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
- **`references/template-system.md`** - Complete template system guide including custom templates, variable syntax, and error handling
- **`references/workflows.md`** - Step-by-step workflow examples for common tasks (cover generation, illustrations, bulk generation)
- **`references/troubleshooting.md`** - Common issues and solutions for API keys, backend selection, resolution mapping, and template errors

---

**Note**: This is a CORE skill - other skills (image-cover, image-illustrator) compose this skill for specialized use cases.
