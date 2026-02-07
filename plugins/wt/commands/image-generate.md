---
description: Generate AI images with styles and templates
argument-hint: [prompt] [--template name] [--style style] [--output path]
---

# Image Generate

Generate AI images using the `wt:image-generate` skill.

## Quick Start

```bash
# Simplest usage
/wt:image-generate "A mountain landscape at sunset"

# With style
/wt:image-generate "A server architecture diagram" --style technical-diagram --output images/arch.png

# Blog cover (21:9 ultrawide)
/wt:image-generate --template cover --var title="Microservices Guide" --output cover.png

# XHS cover (3:4 portrait)
/wt:image-generate --template cover-xhs --var title="Spring Recipes" --style cute --output xhs-cover.png

# With article context
/wt:image-generate --template cover --content article.md --output cover.png

# List available templates
/wt:image-generate --list-templates
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `[prompt]` | No | Text description (not required with --template) |
| `--template <name>` | No | Template: `default`, `cover`, `illustrator`, `cover-xhs` |
| `--style <style>` | No | Style preset (10 available, see skill for full list) |
| `--output <path>` | No | Output file path (recommended) |
| `--var <KEY=VALUE>` | No | Template variable (repeatable) |
| `--content <file>` | No | Article file for content-aware generation |
| `--resolution <WxH>` | No | Custom resolution (default: per template) |
| `--backend <name>` | No | Backend: `huggingface`, `gemini`, `nano_banana` |
| `--list-templates` | No | List available templates |

For available styles, templates, and platform guidance, see the `wt:image-generate` skill.

## Validation

Before delegating:
- If no `prompt` and no `--template` provided, ask user for at least one
- If `--output` directory does not exist, create it or ask user
- If `--style` value is not recognized, show available styles from the skill

## Implementation

This command delegates to the `wt:image-generate` skill:

```
Skill(skill="wt:image-generate", args="$ARGUMENTS")
```

## See Also

- Skill `wt:image-generate` - Core skill (source of truth)
- Skill `wt:image-cover` - Content-aware cover generation
- Skill `wt:image-illustrator` - Automatic article illustration
