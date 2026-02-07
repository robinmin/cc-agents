---
name: cover-xhs
description: Xiaohongshu (XHS) cover image template (3:4 portrait, mobile-first social media)
width: 864
height: 1152
style: custom
backend: nano_banana
steps: 8
output_filename: "{{title | xhs-cover}}.png"
variables:
  title:
    description: Cover title or hook text (Chinese or English)
    default: "lifestyle"
  xhs_category:
    description: "Content category: recommend, tips, review, tutorial, lifestyle, avoid-traps"
    default: "tips"
  aesthetic:
    description: "Visual aesthetic: warm-cozy, fresh-natural, cute-playful, clean-minimal, bold-editorial"
    default: "warm-cozy"
  color_palette:
    description: Color palette direction
    default: "soft cream base, muted terracotta, dusty rose accents, warm golden highlights"
  focal_subject:
    description: Main visual subject or scene
    default: "lifestyle scene"
  text_area:
    description: Where to reserve clean space for text overlay
    default: "upper third with generous padding"
  mood:
    description: Emotional mood
    default: "inviting and aspirational"
  content:
    description: Article content for context (use --content)
    default: ""
keywords:
  - "mobile-first"
  - "social media cover"
  - "portrait orientation"
  - "high-quality"
  - "lifestyle photography"
  - "soft aesthetic"
  - "inviting"
  - "save-worthy"
  - "shallow depth of field"
  - "warm color temperature"
---

Xiaohongshu-style portrait cover image for "{{title}}".
Category: {{xhs_category | tips}} content — designed for high save and share value.
Visual aesthetic: {{aesthetic | warm-cozy}} with soft, inviting atmosphere.
Composition: {{focal_subject | lifestyle scene}} as central subject,
  shallow depth of field with creamy bokeh background,
  {{text_area | upper third with generous padding}} reserved for text overlay.
Color palette: {{color_palette | soft cream base, muted terracotta, dusty rose accents, warm golden highlights}}.
Lighting: soft natural window light, warm color temperature, gentle shadows.
Mood: {{mood | inviting and aspirational}}.
{{content | Inspired by the content's themes, }}
style: modern lifestyle photography meets editorial illustration,
  rounded organic shapes, no harsh edges, approachable and aesthetically pleasing.
Render as a high-quality mobile-first social media cover that invites tapping and saving.
