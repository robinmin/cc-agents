---
name: cover
description: Article cover image template (21:9 ultrawide cinematic aspect ratio)
width: 1344
height: 576
style: vibrant
backend: nano_banana
steps: 8
output_filename: "{{title | cover}}.png"
variables:
  title:
    description: Article title
    default: "Article"
  subtitle:
    description: Article subtitle or tagline
    default: ""
  topics:
    description: Main topics or themes
    default: "technology"
  mood:
    description: Cover mood or atmosphere
    default: "modern and aspirational"
  visual_style:
    description: Visual approach (abstract-geometric, organic-flowing, photographic, illustrative, isometric)
    default: "abstract geometric with clean modern lines"
  color_palette:
    description: Color direction with specific tones
    default: "deep navy transitioning to electric blue with warm amber accents"
  composition:
    description: Composition and layout guidance
    default: "strong central focal point, negative space in upper third for text overlay"
  atmosphere:
    description: Atmosphere and emotional tone
    default: "professional, aspirational, forward-looking"
  content:
    description: Article content for context (use --content)
    default: ""
keywords:
  - "8K"
  - "ultra-high-quality"
  - "masterpiece"
  - "cinematic composition"
  - "rule of thirds"
  - "volumetric lighting"
  - "dramatic shadows"
  - "fine detail textures"
  - "professional color grading"
---

Cinematic wide-format cover illustration for "{{title}}"{{subtitle | , subtitled "{{subtitle}}"}}.
Theme: {{topics | technology and innovation}}.
Visual approach: {{visual_style | abstract geometric with clean modern lines}}.
Composition: {{composition | strong central focal point, negative space in upper third for text overlay}}.
Color palette: {{color_palette | deep navy transitioning to electric blue with warm amber accents}}.
Atmosphere: {{atmosphere | professional, aspirational, forward-looking}}, {{mood | modern and aspirational}} sensibility.
{{content | Inspired by the article's core concepts, }}
create a visually striking hero image with dramatic volumetric lighting,
fine detail textures, and cinematic depth of field.
Magazine-quality digital art with strong visual hierarchy.
