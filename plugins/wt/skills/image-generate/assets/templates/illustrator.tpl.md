---
name: illustrator
description: Article illustration template for inline images (4:3 aspect ratio)
width: 800
height: 600
style: technical-diagram
backend: huggingface
steps: 40
output_filename: "{{title | illustration}}.png"
variables:
  title:
    description: Illustration title/context
    default: "diagram"
  concept:
    description: Main concept to illustrate
    default: "technical concept"
  style_detail:
    description: Additional style details
    default: "clean"
  complexity:
    description: Level of complexity
    default: "moderate"
  content:
    description: Article content for context (use --content)
    default: ""
keywords: ["technical", "precise", "educational", "clear"]
---

{{complexity | Moderately complex}} {{style_detail | clean}} technical illustration of {{concept}}.
{{content | Drawing from the article's content, }}
professional diagram style with precise lines and clear visual hierarchy.
Educational content illustration suitable for technical documentation.
Minimalist aesthetic with excellent readability, {{title}} context.
