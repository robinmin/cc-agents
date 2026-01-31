---
name: default
description: General-purpose image generation template with sensible defaults
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
    default: "peaceful"
  detail_level:
    description: Level of detail
    default: "highly detailed"
  content:
    description: Additional context content (use --content)
    default: ""
keywords: ["8K", "high-quality", "professional"]
---

{{detail_level | Highly detailed}} {{subject}}, {{mood}} mood, artistic composition.
{{content | Incorporating the provided context, }}
clean, professional quality with excellent lighting and attention to detail.
