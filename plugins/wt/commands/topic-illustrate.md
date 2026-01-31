---
description: Generate AI images for technical content (Stage 4 of Technical Content Workflow) - cover images, illustrations, diagrams
argument-hint: <prompt> | --template <name> [--output <path>] [--style <style>] [--resolution <WxH>] [--backend <name>]
---

# Topic Illustrate

Generate AI images for technical content using text prompts or templates. This is Stage 4 of the Technical Content Workflow, generating cover images, illustrations, and diagrams.

## Quick Start

```bash
# Basic image generation
/wt:topic-illustrate "A beautiful landscape" --output landscape.png

# With style
/wt:topic-illustrate "Architecture diagram" --style technical-diagram --output diagram.png

# With custom resolution
/wt:topic-illustrate "Abstract art" --resolution 1920x1080 --output art.png

# Using templates
/wt:topic-illustrate --template cover --var title="My Article" --output cover.png
/wt:topic-illustrate --template illustrator --content article.md --output diagram.png

# List available templates
/wt:topic-illustrate --list-templates

# Generate multiple images
/wt:topic-illustrate "Abstract art" --output art.png --number 3
```

## Usage

This command delegates directly to the `image_generator.py` Python script:

```python
import subprocess
import sys

script_path = "plugins/wt/skills/image-generate/scripts/image_generator.py"
sys.exit(subprocess.run([sys.executable, script_path] + args).returncode)
```

### Arguments

All arguments are passed directly to the Python script:

| Argument | Description |
|----------|-------------|
| `<prompt>` | Text prompt for image generation (not required with --template) |
| `--output <path>` | Output image path (optional if template specifies output_filename) |
| `--resolution <WxH>` | Image resolution (default: 1024x1024) |
| `--style <style>` | Style preset (technical-diagram, minimalist, vibrant, sketch, photorealistic) |
| `--backend <name>` | Backend to use (huggingface, gemini) |
| `--steps <n>` | Inference steps (default: 50) |
| `--timeout <n>` | Request timeout in seconds (default: 60) |
| `--template <name>` | Use a template (cover, illustrator, default) |
| `--var <KEY=VALUE>` | Template variable (can be used multiple times) |
| `--content <FILE_OR_TEXT>` | Article content (file path or text) |
| `--number <n>` | Number of images to generate (1-4) |
| `--list-templates` | List all available templates |

## Style Options

| Style | Description |
|-------|-------------|
| `technical-diagram` | Clean, technical illustrations |
| `minimalist` | Simple, clean aesthetic |
| `vibrant` | Bold colors, high contrast |
| `sketch` | Hand-drawn, artistic feel |
| `photorealistic` | Realistic images |

## Templates

| Template | Description | Resolution | Style |
|----------|-------------|------------|-------|
| `default` | General-purpose | 1024x1024 | vibrant |
| `cover` | Article cover | 1920x817 | cinematic |
| `illustrator` | Article illustration | 800x600 | technical-diagram |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HUGGINGFACE_API_TOKEN` | HuggingFace API token |
| `GEMINI_API_KEY` | Google Gemini API key |

## Related Commands

- `/wt:topic-create` - Full 7-stage workflow (includes illustration stage)
- `/wt:topic-draft` - Write draft (prerequisite for illustrations)

## See Also

- **Full Skill**: `plugins/wt/skills/image-generate/SKILL.md`
- **Python Script**: `plugins/wt/skills/image-generate/scripts/image_generator.py`
- **Templates**: `plugins/wt/skills/image-generate/assets/templates/`
