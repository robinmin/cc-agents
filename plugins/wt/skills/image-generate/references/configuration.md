# Image Generation Configuration

Setup and backend configuration for the image generation skill.

## Setting Up Configuration

The wt plugin supports centralized configuration via `~/.claude/wt/config.jsonc`.

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

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `env.HUGGINGFACE_API_TOKEN` | HuggingFace API token | (required for huggingface backend) |
| `env.GEMINI_API_KEY` | Google Gemini API key | (required for gemini backend) |
| `image_generation.backend` | Preferred backend | `nano_banana` |
| `image_generation.default_resolution` | Default resolution | `1024x1024` |
| `image_generation.default_steps` | Default inference steps | `8` (Z-Image Turbo) |

## Available Backends

| Backend | Description | Quality | Speed |
|---------|-------------|---------|-------|
| `nano_banana` | Z-Image Turbo via MCP | Best | Fast (4-8 steps) |
| `huggingface` | Stable Diffusion XL | High | Medium (20-50 steps) |
| `gemini` | Google Imagen | High | Medium |

## Image Generation Backends (Detail)

This skill uses the common image generation framework (`scripts/image_generator.py`) which supports multiple backends:

### Primary: HuggingFace API

- Uses `scripts/image_generator.py --backend huggingface`
- Requires: `HUGGINGFACE_API_TOKEN` environment variable
- Model: `stabilityai/stable-diffusion-xl-base-1.0` (default)
- Installation: `uv add requests Pillow`

### Fallback 1: Gemini Imagen API

- Uses `scripts/image_generator.py --backend gemini`
- Requires: `GEMINI_API_KEY` environment variable
- Model: `imagen-3.0-generate-001` (default)
- Installation: `uv add google-genai`
- Supports aspect ratios: 1:1, 4:3, 3:4, 16:9, 9:16
- Documentation: [Generate images using Imagen](https://ai.google.dev/gemini-api/docs/imagen)

### Fallback 2: nano banana (Z-Image Turbo via MCP)

- Uses `scripts/image_generator.py --backend nano_banana`
- Requires: MCP HuggingFace server configured
- Model: `Z-Image-Turbo` (via `mcp__huggingface__gr1_z_image_turbo_generate`)
- Supports **9 resolution options** with various aspect ratios (see Resolution Options below)
- Fast generation: 1-20 inference steps
- Resolution auto-mapping to closest supported size

### MCP Resolution Format (Critical)

When invoking the MCP tool directly, the resolution parameter requires exact formatting:
- Format: `"WIDTHxHEIGHT ( RATIO )"` with **TWO spaces** before `(` and after `)`
- Examples: `"1024x1024 ( 1:1 )"`, `"1280x720 ( 16:9 )"`, `"1344x576 ( 21:9 )"`
- Incorrect: `"1280x720 (16:9)"` (missing space before parenthesis)
- Use `NanoBananaBackend.get_mcp_params()` or the RESOLUTION_MAP to get correct format

### Backend Priority Order

The framework automatically selects the best available backend: `huggingface` -> `gemini` -> `nano_banana`

Force a specific backend:
```bash
python scripts/image_generator.py --backend gemini ...
```

### Task Delegation (rd2:super-coder fallback)

```
Create task file: materials/tasks/image-generation-{timestamp}.md
Delegate to: rd2:super-coder
Tool selection: agy (Agy) or gemini for image generation
```

## Resolution Options

When using the nano_banana backend (Z-Image Turbo via MCP), only specific resolutions are supported:

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
│   ├── photorealistic.md
│   ├── warm.md
│   ├── fresh.md
│   ├── cute.md
│   └── editorial.md
└── cache/             # Temporary image cache (optional)

skills/image-generate/assets/
└── templates/         # Template system (.tpl.md files)
    ├── default.tpl.md
    ├── cover.tpl.md
    ├── illustrator.tpl.md
    └── cover-xhs.tpl.md

# Project-level overrides (optional)
.image-templates/       # Custom templates for specific project
    └── custom.tpl.md
```
