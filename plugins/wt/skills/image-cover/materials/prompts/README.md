# Prompts Storage

This folder stores generated prompts and content analysis logs for cover image generation.

## Structure

```
prompts/
├── prompt-001.md          # Timestamped prompt logs
├── prompt-002.md
└── analysis/              # Content analysis logs
    ├── analysis-001.md
    └── ...
```

## Prompt Format

Each prompt file contains:

```yaml
---
timestamp: ISO-8601
article_path: "/path/to/article.md"
detected_style: "technical|blog|tutorial|news|custom"
title_extracted: "Article Title"
themes: ["theme1", "theme2", ...]
resolution: "1920x817"
output_path: "/path/to/cover.png"
status: "success" | "failed"
text_overlay: true | false
---

# Prompt: {timestamp}

## Article Analysis

### Title Extracted
{title}

### Themes Detected
- Theme 1
- Theme 2
- Theme 3

### Content Type
{technical|blog|tutorial|news}

### Detected Style
{style}

### Confidence
{HIGH|MEDIUM|LOW}

## Enhanced Prompt

```
{enhanced prompt with style modifiers}
```

## Style Modifiers Applied

```
{style-specific modifiers}
```

## Text Overlay

- **Included**: {yes|no}
- **Text**: "{title text}"
- **Font**: {font style}
- **Position**: {position}

## Parameters

- **Article**: {article_path}
- **Style**: {style}
- **Resolution**: {resolution}
- **Text Overlay**: {yes|no}
- **Output**: {output_path}

## Result

- **Status**: {success|failed}
- **Output Path**: {actual output path}
- **Generation Time**: {duration}
- **Error**: {error message if failed}
```

## Usage

These logs help with:

1. **Traceability** - See what prompts generated what covers
2. **Iteration** - Learn content analysis patterns
3. **Debugging** - Understand generation failures
4. **Consistency** - Reproduce successful cover generations

## Analysis Logs

Content analysis logs in `analysis/` contain detailed breakdowns of:

- Title extraction process
- Theme detection methodology
- Content type classification
- Style selection reasoning
- Confidence scoring

## Example

See `prompt-example.md` for a complete example.
