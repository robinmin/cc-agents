---
name: image-cover
description: This skill should be used when the user asks to "create a cover image", "generate an article cover", "make a header image", or "create a cinematic cover". Analyzes article content to generate context-aware cover images.
version: 1.0.0
---

# Image Cover

Specialized skill for generating 21:9 ultrawide cinematic cover images based on article content. Composes the core `wt:image-generate` skill with content analysis for intelligent, context-aware cover generation.

## Overview

Generate professional cover images that match article content, tone, and style. Analyze article content to extract key themes, titles, and visual concepts, then generate an appropriately styled cover image.

### Key Features

- **21:9 Aspect Ratio** - Ultrawide cinematic format (1344x576 default)
- **Content-Aware** - Analyzes article for title, themes, and tone
- **Style-Aware** - Matches content type (technical, blog, tutorial, news)
- **Text Overlay** - Includes article title on cover (configurable)
- **Explicit Destination** - Caller specifies output path

## When to Use

Activate this skill when:

- Creating cover images for articles or blog posts
- Generating header images with 21:9 ultrawide aspect ratio
- Need content-aware cover generation based on article analysis
- Creating covers with title text overlay

**Not for:**

- Basic image generation without content analysis (use `wt:image-generate` instead)
- Generating article illustrations (use `wt:image-illustrator` instead)

## Quick Start

```bash
# Basic cover generation (auto-detect style)
wt:image-cover --article article.md --output cover.png

# Specify style explicitly
wt:image-cover --article article.md --style technical --output cover.png

# With custom resolution
wt:image-cover --article article.md --resolution 2560x1089 --output cover.png

# Exclude text overlay
wt:image-cover --article article.md --no-text --output cover.png

# With debug mode
wt:image-cover --article article.md --output cover.png --debug
```

## Style Selection

### Auto-Detection

Auto-detect the appropriate style by default:

| Content Type                      | Detected Style      | Description                    |
| --------------------------------- | ------------------- | ------------------------------ |
| Technical articles, documentation | `technical-diagram` | Clean, technical illustrations |
| Blog posts, personal stories      | `blog`              | Engaging, readable text        |
| How-to guides, tutorials          | `tutorial`          | Step-by-step visual cues       |
| News, announcements               | `news`              | Professional, headline-focused |
| Other                             | `minimalist`        | Clean, simple aesthetic        |

### Manual Override

Override auto-detection with `--style`:

```bash
--style technical     # Technical diagram style
--style blog          # Blog post style
--style tutorial      # Tutorial style
--style news          # News style
--style custom        # Custom style description (use --custom-style)
```

**Complete style guide**: See `references/style-templates.md` for detailed style descriptions, color palettes, and typography guidelines.

## Workflow

### Generation Process

1. **Read article** from specified path
2. **Analyze content**:
   - Extract title from frontmatter or first heading
   - Identify key themes and keywords
   - Detect content type (technical, blog, tutorial, news)
   - Select appropriate visual style
3. **Generate cover**:
   - Call `wt:image-generate` with enhanced prompt
   - Specify 21:9 resolution (1344x576 default)
   - Include title text overlay (unless `--no-text`)
4. **Store materials** in `materials/` for iteration
5. **Return output path** to caller

**Detailed workflows**: See `references/workflows.md` for step-by-step examples including batch generation, custom resolution, and troubleshooting.

## Input Parameters

```yaml
# Required parameters
article: "/path/to/article.md" # Source article for analysis
output: "/path/to/cover.png" # Where to save the cover image

# Optional parameters
style: "technical|blog|tutorial|news|custom" # Override auto-detection
resolution: "1344x576" # Default 21:9
custom_style: "style description" # Required if style=custom
no_text: false # Exclude title overlay
cache: "/path/to/temp/" # Optional: temp cache location
debug: false # Enable verbose output
```

## Materials Storage

```
skills/image-cover/materials/
├── prompts/           # Generated prompts for each cover
│   ├── prompt-001.md  # Timestamped prompt logs
│   └── analysis/      # Content analysis logs
├── tasks/             # Task files for rd2:super-coder
├── templates/         # Style templates for each cover type
│   ├── technical.md
│   ├── blog.md
│   ├── tutorial.md
│   └── news.md
└── cache/             # Temp cache (optional)
```

## Error Handling

| Error Type          | Handling                             |
| ------------------- | ------------------------------------ |
| Article not found   | Fail gracefully with error message   |
| No title detected   | Use filename or generic "Cover"      |
| Generation failure  | Retry with alternative style/prompt  |
| Output path invalid | Validate directory, create if needed |

**Troubleshooting guide**: See `references/troubleshooting.md` for common issues, solutions, and debugging steps.

## End-to-End Example

```bash
# 1. Create article with title in frontmatter
cat > my-article.md << 'EOF'
---
title: "Introduction to Microservices"
tags: [architecture, distributed-systems]
---

# Introduction to Microservices

Microservices architecture breaks down...
EOF

# 2. Generate cover with auto-detection
wt:image-cover --article my-article.md --output covers/microservices-cover.png

# Output:
# ✓ Cover generated: covers/microservices-cover.png
#   - Title: "Introduction to Microservices"
#   - Detected Type: technical
#   - Selected Style: technical-diagram
#   - Resolution: 1344x576 (21:9)

# 3. Review analysis results
cat skills/image-cover/materials/analysis/analysis-*.md
```

## Content Analysis Summary

Analyze articles through a four-stage pipeline:

1. **Title Extraction** - Frontmatter → First heading → Filename → "Cover"
2. **Theme Extraction** - Keywords, tags, headings, technical terms
3. **Content Type Detection** - Technical/tutorial/news/blog heuristics
4. **Style Selection** - Maps content type to visual style

**Detailed methodology**: See `references/content-analysis.md` for complete analysis pipeline, detection rules, and prompt enhancement.

## Cover Styles Quick Reference

| Style       | Description                    | Best For                          |
| ----------- | ------------------------------ | --------------------------------- |
| `technical` | Clean, technical illustrations | Documentation, technical articles |
| `blog`      | Engaging, readable content     | Personal blog posts, stories      |
| `tutorial`  | Step-by-step visual cues       | How-to guides, tutorials          |
| `news`      | Professional, headline-focused | News articles, announcements      |
| `custom`    | User-defined style             | Custom requirements               |

**Complete style reference**: See `references/style-templates.md` for style templates, color palettes, typography guidelines, and custom style creation.

## Integration Points

### Depends on

- `wt:image-generate` - Core image generation skill

### No Command References

This skill does NOT reference:

- `/wt:topic-illustrate` - No circular references
- Any wrapper commands - Skills are cores, commands are wrappers

### Plain Language Orchestration

Describe workflow in natural language without referencing commands.

## Output

```yaml
# Success
status: "success"
output_path: "/path/to/cover.png"
article_analyzed: "/path/to/article.md"
detected_style: "technical"
title_extracted: "Article Title"
text_overlay: true | false
resolution: "1344x576"

# Error
status: "error"
error: "error message"
article_path: "/path/to/article.md"
```

## Related Skills

- `wt:image-generate` - Core image generation (composed by this skill)
- `wt:image-illustrator` - Article illustration generation

## References

### Reference Files

- **`references/content-analysis.md`** - Complete content analysis methodology including title extraction, theme extraction, content type detection, and prompt enhancement
- **`references/style-templates.md`** - Detailed style reference with color palettes, typography guidelines, and custom style creation
- **`references/workflows.md`** - Step-by-step workflow examples for common tasks (auto-detect, manual style, batch generation, troubleshooting)
- **`references/troubleshooting.md`** - Common issues and solutions for article analysis, style detection, output path issues, and generation failures

### External References

- 21:9 aspect ratio: Ultrawide cinematic format for covers and headers
- Cover design best practices: Content-aware, title visibility, readability
- `wt:image-generate` skill documentation: Core generation capabilities and backend options

---

**Note**: This is a COMPOSITE skill - orchestrates `wt:image-generate` with content analysis for cover-specific use cases.
