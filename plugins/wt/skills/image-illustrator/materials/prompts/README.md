# Prompts Storage

This folder stores generated prompts and position analysis logs for article illustration.

## Structure

```
prompts/
├── prompt-001.md          # Timestamped prompt logs
├── prompt-002.md
└── ...
```

## Prompt Format

Each prompt file contains:

```yaml
---
timestamp: ISO-8601
article_path: "/path/to/article.md"
position_id: "img-001"
position_line: 45
position_type: "abstract_concept|information_dense|emotional_transition"
detected_style: "technical-diagram"
resolution: "800x600"
output_path: "/path/to/images/image-001.png"
status: "success" | "failed"
---

# Prompt: {timestamp}

## Position Analysis

### Position ID
img-001

### Location
Line 45 in article.md

### Position Type
abstract_concept | information_dense | emotional_transition

### Context (100 chars before and after)
```
...text before position...
POSITION HERE
...text after position...
```

### Detection Reasoning
{detailed reasoning for why this position needs an image}

### Confidence Score
{0.0-1.0}

## Enhanced Prompt

```
{enhanced prompt for image generation}
```

## Style Selection

- **Detected Style**: {style}
- **Reasoning**: {why this style was chosen}
- **Modifiers**: {style modifiers applied}

## Content Context

### Key Terms Extracted
- Term 1
- Term 2
- Term 3

### Section Heading
{heading of section containing position}

### Related Code/Content
{relevant code snippets or content}

## Parameters

- **Article**: {article_path}
- **Position**: line {line_number}
- **Style**: {style}
- **Resolution**: {resolution}
- **Output**: {output_path}

## Result

- **Status**: {success|failed}
- **Output Path**: {actual output path}
- **Alt Text**: {generated alt text}
- **Generation Time**: {duration}
- **Error**: {error message if failed}
```

## Usage

These logs help with:

1. **Traceability** - See what prompts generated what images
2. **Iteration** - Learn position detection patterns
3. **Debugging** - Understand generation failures
4. **Improvement** - Refine detection algorithms

## Position Types

### abstract_concept

Complex ideas needing visual explanation:
- Technical jargon without visuals
- Theoretical concepts
- Architectural patterns
- Complex processes

### information_dense

Data-heavy content needing visual organization:
- Large tables (3+ columns)
- Long lists (5+ items)
- Code blocks needing explanation
- Statistics and benchmarks

### emotional_transition

Narrative flow needing visual breaks:
- Major section breaks
- Tone shifts
- Story sections
- Case studies

## Example

See `prompt-example.md` for a complete example.
