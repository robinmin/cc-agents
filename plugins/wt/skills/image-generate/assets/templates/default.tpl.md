---
name: default
description: General-purpose image generation template with rich art direction defaults
width: 1024
height: 1024
style: vibrant
backend: huggingface
steps: 50
output_filename: "generated-image.png"
variables:
  subject:
    description: Main subject of the image
    default: "a beautiful landscape"
  mood:
    description: Mood or atmosphere
    default: "peaceful and contemplative"
  detail_level:
    description: Level of detail
    default: "highly detailed"
  color_palette:
    description: Color direction
    default: "harmonious and balanced, context-appropriate"
  composition:
    description: Composition style
    default: "balanced with clear focal point and visual breathing room"
  lighting:
    description: Lighting style
    default: "natural and flattering with gentle shadows"
  content:
    description: Additional context content (use --content)
    default: ""
keywords:
  - "8K"
  - "high-quality"
  - "masterpiece"
  - "professional"
  - "rule of thirds"
  - "rich textures"
  - "crisp details"
---

{{detail_level | Highly detailed}} depiction of {{subject}}.
Mood: {{mood | peaceful and contemplative}} — evoking calm contemplation.
Composition: {{composition | balanced with clear focal point and visual breathing room}}.
Color palette: {{color_palette | harmonious and balanced, context-appropriate}}.
Lighting: {{lighting | natural and flattering with gentle shadows}}.
{{content | Drawing from provided context, }}
render with artistic precision, rich textures, and professional color grading.
