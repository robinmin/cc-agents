---
name: illustrator
description: Article illustration template for inline images (4:3 aspect ratio)
width: 1152
height: 864
style: technical-diagram
backend: nano_banana
steps: 8
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
    description: Level of complexity (simple, moderate, complex)
    default: "moderate"
  visual_approach:
    description: Illustration approach (diagrammatic, conceptual, metaphorical, isometric)
    default: "clean diagrammatic with subtle depth"
  color_scheme:
    description: Color scheme direction
    default: "professional blues and grays with one accent color for emphasis"
  content:
    description: Article content for context (use --content)
    default: ""
keywords:
  - "technical"
  - "precise"
  - "educational"
  - "clear"
  - "vector-like lines"
  - "logical flow"
  - "generous whitespace"
  - "polished"
---

{{complexity | Moderately complex}} technical illustration of {{concept}}.
Visual approach: {{visual_approach | clean diagrammatic with subtle depth}}.
Style: {{style_detail | clean}} with precise vector-like lines and clear visual hierarchy.
Color scheme: {{color_scheme | professional blues and grays with one accent color for emphasis}}.
{{content | Grounded in the article's technical content, }}
create an educational diagram with logical flow, labeled components where appropriate,
and generous whitespace for readability. Context: {{title}}.
Render as a polished technical illustration suitable for professional documentation.
