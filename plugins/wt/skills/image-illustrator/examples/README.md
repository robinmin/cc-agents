# Image Illustrator Examples

This directory contains a complete worked example of the `wt:image-illustrator` skill in action.

## Overview

The example demonstrates how the skill analyzes a technical article about microservices architecture, detects positions needing images, generates appropriate visuals, and inserts them into the article.

## Example Workflow

### 1. Input: Original Article (`article-before.md`)

The original article is a technical guide on microservices architecture with:
- 1,850 words
- Multiple technical concepts
- Information-dense tables and lists
- Section transitions

**Key characteristics:**
- No images or illustrations
- Dense technical content
- Multiple abstract concepts that benefit from visualization

### 2. Position Detection (`positions-detected.md`)

The skill analyzes the article and detects 8 positions needing images:

| Position | Line | Type | Score | Selected |
|----------|------|------|-------|----------|
| 1 | 23 | abstract_concept | 12 | Yes |
| 2 | 45 | abstract_concept | 11 | Yes |
| 3 | 62 | information_dense | 10 | Yes |
| 4 | 79 | abstract_concept | 10 | No (too close) |
| 5 | 92 | information_dense | 11 | Yes |
| 6 | 112 | emotional_transition | 7 | Yes |
| 7 | 118 | abstract_concept | 6 | No |
| 8 | 128 | abstract_concept | 8 | No |

**Selection criteria:**
- Priority score (abstract concepts weighted highest)
- Minimum distance between positions (20 lines)
- Maximum positions limit (5)
- Distribution across position types

### 3. Image Generation

For each selected position, the skill generates:

1. **Enhanced prompt** based on position type and content context
2. **Appropriate style** (technical-diagram, sketch, or minimalist)
3. **Descriptive alt text** for accessibility
4. **Image file** at optimal resolution

**Generation results:**
- 6 images generated
- 4 technical diagrams (abstract concepts and dense content)
- 1 sketch (configuration options)
- 1 minimalist image (section transition)
- Average generation time: 12.73 seconds per image

### 4. Output: Illustrated Article (`article-after.md`)

The final article includes:
- Image references inserted at detected positions
- Descriptive alt text for accessibility
- Proper markdown image syntax
- Contextual text following images

### 5. Metadata Tracking (`captions.json`)

The `captions.json` file contains complete metadata:
- Article information (word count, paths)
- Detection summary (8 detected, 5 selected)
- Image details (position, type, prompt, file path, alt text)
- Generation statistics (time, styles used, resolutions)

## Position Type Examples

### Abstract Concept (Position 1)

**Detected at:** Line 23 - "## What Are Microservices?"

**Reasoning:**
- Technical jargon: "microservices architecture", "API gateway"
- Complex concept requiring visualization
- No images in section

**Generated:** Technical diagram showing microservices architecture with API gateway, services, and databases

**Style:** `technical-diagram`

**Resolution:** 800x600

### Information-Dense (Position 3)

**Detected at:** Line 62 - "## API Endpoints Reference"

**Reasoning:**
- 7-column API reference table
- Technical reference content
- Needs visual organization

**Generated:** Visual reference diagram showing API endpoints organized by HTTP method

**Style:** `technical-diagram`

**Resolution:** 1024x768

### Emotional Transition (Position 6)

**Detected at:** Line 112 - "## Best Practices"

**Reasoning:**
- Major section break (## header)
- Transition from technical details to best practices
- Narrative flow improvement

**Generated:** Minimalist transition image with clean lines

**Style:** `minimalist`

**Resolution:** 800x400

## Using This Example

### To Reproduce

```bash
# Navigate to the examples directory
cd plugins/wt/skills/image-illustrator/examples

# Run the image illustrator skill on the article
wt:image-illustrator \
  --article article-before.md \
  --image-dir images/ \
  --output article-illustrated.md \
  --min-positions 3 \
  --max-positions 6
```

### Expected Output

1. **images/** directory with 5-6 generated images
2. **article-illustrated.md** with image references inserted
3. **captions.json** with complete metadata
4. **materials/** directory with prompts and position logs

### To Customize

```bash
# Generate more images
wt:image-illustrator \
  --article article-before.md \
  --image-dir images/ \
  --max-positions 10

# Use different resolution
wt:image-illustrator \
  --article article-before.md \
  --image-dir images/ \
  --resolution 1024x768
```

## File Structure

```
examples/
├── README.md                 # This file
├── article-before.md         # Original article (no images)
├── article-after.md          # Article with images inserted
├── positions-detected.md     # Detected positions with rationale
└── captions.json             # Complete metadata for all images
```

## Key Takeaways

1. **Position Detection Works**: The skill correctly identifies technical concepts, dense content, and section transitions

2. **Style Selection is Context-Aware**: Technical diagrams for concepts, sketches for data, minimalist for transitions

3. **Progressive Disclosure**: SKILL.md contains core essentials; reference files contain detailed algorithms and workflows

4. **Complete Traceability**: Every image has metadata including position, prompt, alt text, and generation details

5. **Accessibility First**: All images include descriptive alt text for screen readers

## Related Resources

- **Skill Definition**: `/Users/robin/projects/cc-agents/plugins/wt/skills/image-illustrator/SKILL.md`
- **Position Detection Guide**: `/Users/robin/projects/cc-agents/plugins/wt/skills/image-illustrator/references/position-detection.md`
- **Workflow Examples**: `/Users/robin/projects/cc-agents/plugins/wt/skills/image-illustrator/references/workflows.md`
- **Captions Example**: `/Users/robin/projects/cc-agents/plugins/wt/skills/image-illustrator/assets/captions-example.json`

## Version

**Skill Version:** 1.0.0
**Example Created:** 2026-01-30
**Article Topic:** Microservices Architecture
