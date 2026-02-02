---
name: cover
description: Article cover image template (21:9 ultrawide aspect ratio)
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
    default: "modern"
  content:
    description: Article content for context (use --content)
    default: ""
keywords: ["8K", "ultra-high-quality", "cinematic", "professional"]
---

Professional cover image for "{{title}}"{{subtitle | - {{subtitle}}}}.
{{mood | Modern, clean}} design showcasing {{topics | technology themes}}.
{{content | Based on the article's key concepts and themes, }}
create an eye-catching visual representation with bold typography and vibrant colors.
High-end magazine quality illustration with cinematic composition.
