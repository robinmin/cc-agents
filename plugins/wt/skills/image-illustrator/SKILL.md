---
name: image-illustrator
description: This skill should be used when the user asks to "add illustrations to an article", "generate images for content", "create article visuals", "illustrate technical content", or "auto-generate article illustrations". Analyzes article content to identify positions needing images, generates them, and inserts them into the article.
version: 1.0.0
---

# Image Illustrator

Specialized skill for analyzing article content to identify positions needing images, generating appropriate visuals, and inserting them into the article. Composes the core `wt:image-generate` skill with intelligent position detection.

## Overview

Transform plain articles into visually engaging content by automatically identifying where images would enhance understanding and generating context-aware illustrations. This skill analyzes your article's content structure, themes, and information density to determine optimal image placement.

### Key Features

- **Content-Aware Detection** - Analyzes article for positions needing images
- **Three Position Types** - Abstract concepts, information-dense sections, emotional transitions
- **Context-Aware Generation** - Generates images matching content and position type
- **Automatic Insertion** - Inserts markdown image references at appropriate locations
- **Captions Tracking** - Maintains `captions.json` with image metadata

## When to Use

Activate this skill when:

- Adding illustrations to technical articles or documentation
- Generating visuals for information-dense content
- Creating images for abstract concepts that need visual explanation
- Adding visual breaks for narrative flow
- Enhancing article engagement with contextual images

**Not for:**

- Cover image generation (use `wt:image-cover` instead)
- Basic image generation without content analysis (use `wt:image-generate` instead)

## Quick Start

```bash
# Basic illustration (auto-detect positions)
wt:image-illustrator --article article.md --image-dir images/

# Specify custom resolution
wt:image-illustrator --article article.md --image-dir images/ --resolution 1024x768

# Update article in place
wt:image-illustrator --article article.md --image-dir images/ --output article.md

# Save to new file
wt:image-illustrator --article article.md --image-dir images/ --output article-illustrated.md

# Control number of images
wt:image-illustrator --article article.md --image-dir images/ --min-positions 3 --max-positions 10
```

## Position Detection

### Three Position Types

The skill detects three types of positions where images enhance content:

#### 1. Abstract Concepts

Complex ideas that need visual explanation:

- Technical jargon not commonly understood
- Complex processes or flows
- Theoretical concepts without visual representation
- Architectural patterns requiring visualization

**Examples**: "Microservices architecture pattern", "Event-driven messaging system", "CAP theorem implications"

#### 2. Information-Dense Sections

Charts, diagrams for data-heavy content:

- Tables with 3+ columns or 5+ rows
- Lists with 5+ items
- Statistics or data presentations
- Code blocks needing explanation

**Examples**: Performance comparison tables, configuration options lists, API endpoint specifications

#### 3. Emotional Transitions

Visual breaks for narrative flow:

- Major section breaks (## headers)
- Tone shifts (technical → conversational)
- Summary/conclusion sections
- Long text without breaks

**Examples**: Before major sections, after technical deep-dives, introduction to new topics

**Detailed detection algorithms**: See `references/position-detection.md` for complete detection patterns and scoring.

## Workflow

### Generation Process

1. **Read article** from specified path
2. **Analyze content**:
   - Parse markdown structure
   - Identify positions needing images
   - Categorize by position type (concept/dense/transition)
   - Generate image descriptions for each position
3. **Generate images**:
   - Call `wt:image-generate` for each position
   - Use appropriate style for content type
   - Save to specified image directory
4. **Insert images**:
   - Insert markdown image references at identified positions
   - Generate alt text for accessibility
   - Update `captions.json` with metadata
5. **Store materials** in `materials/` for iteration
6. **Return updated article path** to caller

### Position Detection Algorithm (Summary)

```python
# Simplified detection logic
for section in article.sections:
    # Abstract concepts
    if has_technical_jargon(section) and not has_visual(section):
        add_position("abstract_concept", extract_key_terms(section))

    # Information-dense
    if has_large_table(section) or has_long_list(section):
        add_position("information_dense", summarize_content(section))

    # Emotional transitions
    if is_major_section_break(section) or has_tone_shift(section):
        add_position("emotional_transition", section.theme)
```

**Complete detection guide**: `references/position-detection.md` contains detailed algorithms, scoring systems, and configuration options.

## Input Parameters

```yaml
# Required parameters
article: "/path/to/article.md"
image_dir: "/path/to/images/" # Where to save generated images

# Optional parameters
output: "/path/to/article.md" # Update in place or save to new file
resolution: "800x600" # Default inline illustration size
style: "technical-diagram" # Use content-aware default
cache: "/path/to/temp/" # Optional temp cache
min_positions: 3 # Minimum images to generate (default: 3)
max_positions: 10 # Maximum images to generate (default: 10)
```

## Materials Storage

```
skills/image-illustrator/materials/
├── prompts/           # Generated prompts for each image
│   ├── prompt-001.md  # Timestamped prompt logs
│   └── positions/     # Position detection logs
├── tasks/             # Task files for rd2:super-coder
├── positions/         # Identified positions with rationale
│   ├── positions-001.md
│   └── ...
└── cache/             # Temp cache (optional)
```

## Captions Tracking

### captions.json Format

The skill generates a `captions.json` file with complete metadata for all generated images:

```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-29T12:00:00Z",
  "article": "/path/to/article.md",
  "images": [
    {
      "id": "img-001",
      "position": "line 45",
      "position_type": "abstract_concept",
      "prompt": "Microservices architecture diagram...",
      "file": "images/microservices-architecture.png",
      "alt_text": "Diagram showing microservices architecture...",
      "reason": "abstract_concept",
      "style": "technical-diagram",
      "resolution": "800x600",
      "created_at": "2026-01-29T12:00:00Z"
    }
  ]
}
```

**Complete example**: See `assets/captions-example.json` for a full `captions.json` with all fields including generation statistics.

### Alt Text Generation

For each image, generate descriptive alt text:

```python
alt_text = f"{image_description} showing {key_elements} for {context}"
```

Examples:

- "Diagram showing microservices architecture with API gateway, services, and database"
- "Flowchart illustrating the authentication process with OAuth2 tokens"
- "Bar chart comparing performance metrics across different configurations"

## Style Selection by Position Type

| Position Type        | Recommended Style               | Rationale                           |
| -------------------- | ------------------------------- | ----------------------------------- |
| Abstract Concept     | `technical-diagram`             | Clear explanation of complex ideas  |
| Information-Dense    | `technical-diagram` or `sketch` | Visual organization of data         |
| Emotional Transition | `minimalist` or `vibrant`       | Visual interest without distraction |

## Error Handling

| Error Type              | Handling                                     |
| ----------------------- | -------------------------------------------- |
| No positions found      | Inform user, gracefully exit with suggestion |
| Generation failure      | Log failed position, continue with others    |
| Missing image directory | Create if doesn't exist, or fail gracefully  |
| Article update fails    | Preserve original article, report error      |

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
article_output: "/path/to/article-illustrated.md"
images_generated: 5
image_directory: "/path/to/images/"
positions_detected: 7
positions_selected: 5
captions_file: "/path/to/captions.json"

# Error
status: "error"
error: "error message"
article_path: "/path/to/article.md"
images_generated_before_error: 2
```

## Related Skills

- `wt:image-generate` - Core image generation (composed by this skill)
- `wt:image-cover` - Cover image generation

## References

### External Documentation

- Web accessibility: Alt text for images (WCAG guidelines)
- Markdown image syntax: `![Alt text](path/to/image.png)`
- Image placement: Content flow and readability best practices

### Skill Reference Files

- **`references/position-detection.md`** - Complete position detection algorithms, scoring systems, and configuration options
- **`references/workflows.md`** - Step-by-step workflow examples for common illustration tasks (illustrate from start, fill gaps, specific sections, iterate)
- **`references/troubleshooting.md`** - Common issues and solutions for position detection, style selection, caption generation, and article updates

### Asset Files

- **`assets/captions-example.json`** - Complete `captions.json` format specification with all fields and example entries

### Example Files

- **`examples/article-before.md`** - Sample article before illustration (no images)
- **`examples/article-after.md`** - Sample article after illustration (with images inserted)
- **`examples/positions-detected.md`** - Sample position detection results with rationale
- **`examples/captions.json`** - Sample `captions.json` with complete metadata
- **`examples/README.md`** - Complete walkthrough of the example workflow

### Example Prompt

- **`materials/prompts/prompt-example.md`** - Full example of generated prompt with position analysis, context extraction, and enhancement process

---

**Note**: This is a COMPOSITE skill - orchestrates `wt:image-generate` with content analysis and position detection for article illustration.
