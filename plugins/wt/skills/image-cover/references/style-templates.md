# Cover Style Templates Reference

Complete guide to cover image styles for the `wt:image-cover` skill.

## Quick Reference Table

| Style | Description | Color Palette | Text Overlay | Best For |
|-------|-------------|---------------|--------------|----------|
| `technical` | Clean technical illustrations | Blues, grays, white | Yes, sans-serif | Documentation, technical articles |
| `blog` | Engaging, readable content | Warm, inviting | Yes, stylized | Personal blog posts, opinion pieces |
| `tutorial` | Step-by-step visual cues | Clear, high contrast | Yes, emphasis on learning | How-to guides, tutorials |
| `news` | Professional, headline-focused | Newsroom aesthetic | Yes, headline style | News articles, announcements |
| `custom` | User-defined style | User-specified | Optional | Custom requirements |

## Style Details

### Technical Style

**Purpose**: Technical articles, documentation, architecture diagrams

**Visual Characteristics**:
- Clean lines and precise shapes
- Professional color scheme (blues, grays, white)
- Minimal decoration
- Clear, readable typography

**Prompt Modifiers**:
```
clean technical illustration, professional, precise, architectural diagram style,
minimal colors, clean background, sharp focus
```

**Text Overlay**:
- Font: Clean sans-serif (Inter, Roboto, or similar)
- Position: Center-left or centered
- Size: Large, prominent
- Color: White or light gray on dark background

**Example Use Cases**:
- API documentation covers
- Architecture diagram headers
- Technical blog covers
- White paper covers
- Developer documentation

**Style Template**:
```markdown
---
name: technical
description: Technical article cover style
prompt_modifiers:
  - "clean technical illustration"
  - "professional"
  - "precise lines"
  - "architectural diagram style"
  - "minimal colors"
text_overlay: true
font_family: sans-serif
color_palette:
  - "#2E5C8A"  # Primary blue
  - "#5A7CA3"  # Secondary blue-gray
  - "#E8EDF2"  # Light background
  - "#FFFFFF"  # White
---
```

### Blog Style

**Purpose**: Personal blog posts, opinion pieces, stories

**Visual Characteristics**:
- Engaging and approachable
- Personal touch
- Warm, inviting colors
- Modern blog aesthetic

**Prompt Modifiers**:
```
engaging, readable, personal touch, modern blog aesthetic,
warm colors, approachable, friendly atmosphere
```

**Text Overlay**:
- Font: Stylized display font (can vary based on tone)
- Position: Centered or dynamic placement
- Size: Large, expressive
- Color: Varied (based on mood/theme)

**Example Use Cases**:
- Personal blog posts
- Opinion pieces
- Personal stories
- Lifestyle content
- Thought leadership articles

**Style Template**:
```markdown
---
name: blog
description: Blog post cover style
prompt_modifiers:
  - "engaging"
  - "readable"
  - "personal touch"
  - "modern blog aesthetic"
  - "warm colors"
text_overlay: true
font_family: display
color_palette:
  - "#FF6B6B"  # Warm accent
  - "#4ECDC4"  # Teal accent
  - "#FFE66D"  # Yellow accent
  - "#1A1A1A"  # Dark text
---
```

### Tutorial Style

**Purpose**: How-to guides, tutorials, instructional content

**Visual Characteristics**:
- Step-by-step visual cues
- Instructional design
- Clear progression indicators
- Educational layout

**Prompt Modifiers**:
```
step-by-step visual cues, instructional, clear progression,
educational, how-to guide style, numbered steps implied
```

**Text Overlay**:
- Font: Bold, instructional
- Position: Prominent, easy to read
- Size: Large with emphasis on learning
- Color: High contrast for readability

**Example Use Cases**:
- How-to guides
- Step-by-step tutorials
- Course materials
- Educational content
- Training materials

**Style Template**:
```markdown
---
name: tutorial
description: Tutorial/How-to cover style
prompt_modifiers:
  - "step-by-step visual cues"
  - "instructional"
  - "clear progression"
  - "educational"
  - "how-to guide style"
text_overlay: true
font_family: bold
color_palette:
  - "#2ECC71"  # Green (success/progress)
  - "#3498DB"  # Blue (information)
  - "#F39C12"  # Orange (attention)
  - "#ECF0F1"  # Light background
---
```

### News Style

**Purpose**: News articles, announcements, press releases

**Visual Characteristics**:
- Professional and authoritative
- Headline-focused typography
- Journalistic aesthetic
- Clean, newsroom style

**Prompt Modifiers**:
```
professional, headline-focused, journalistic, clean,
newsroom aesthetic, authoritative, trustworthy
```

**Text Overlay**:
- Font: Headline style (serif or bold sans-serif)
- Position: Prominent, headline-style
- Size: Very large, commanding
- Color: High contrast, professional

**Example Use Cases**:
- News articles
- Company announcements
- Press releases
- Industry updates
- Breaking news

**Style Template**:
```markdown
---
name: news
description: News article cover style
prompt_modifiers:
  - "professional"
  - "headline-focused"
  - "journalistic"
  - "clean"
  - "newsroom aesthetic"
text_overlay: true
font_family: headline
color_palette:
  - "#2C3E50"  # Dark blue-gray
  - "#E74C3C"  # News red accent
  - "#34495E"  # Muted blue
  - "#ECF0F1"  # Light background
---
```

### Custom Style

**Purpose**: User-defined style for specific requirements

**Usage**: Provide custom style description via `--custom-style` parameter

```bash
wt:image-cover --article article.md --style custom \
  --custom-style "cyberpunk aesthetic, neon lights, dark background" \
  --output cover.png
```

**Best Practices**:
- Be specific with visual descriptors
- Include color preferences
- Mention mood or atmosphere
- Specify text treatment (optional)

**Example Custom Styles**:

```bash
# Cyberpunk aesthetic
--custom-style "cyberpunk aesthetic, neon lights, rain-soaked streets,
blade runner vibe, dark background, high contrast"

# Minimalist design
--custom-style "minimalist design, clean lines, plenty of whitespace,
simple geometric shapes, neutral color palette"

# Retro/vintage
--custom-style "vintage 1980s aesthetic, retro colors, grainy texture,
film photography style, nostalgic atmosphere"
```

## Style Selection Workflow

```
Article Input
    ↓
Content Type Detection
    ↓
┌─────────────────────────────────────┐
│ Auto-Detection (Default)            │
│ - technical → technical-diagram      │
│ - tutorial → tutorial               │
│ - news → news                       │
│ - blog → blog                       │
│ - other → minimalist                │
└─────────────────────────────────────┘
    ↓
User Override (Optional)
    ↓
┌─────────────────────────────────────┐
│ --style <name>                      │
│ Overrides auto-detection            │
└─────────────────────────────────────┘
    ↓
Apply Style Modifiers
    ↓
Enhanced Prompt Generation
```

## Style Modifiers Reference

Complete list of style modifiers applied to each style:

| Style | Modifiers |
|-------|-----------|
| `technical` | clean technical illustration, professional, precise, architectural diagram style, minimal colors, clean background, sharp focus |
| `blog` | engaging, readable, personal touch, modern blog aesthetic, warm colors, approachable, friendly atmosphere |
| `tutorial` | step-by-step visual cues, instructional, clear progression, educational, how-to guide style, numbered steps implied |
| `news` | professional, headline-focused, journalistic, clean, newsroom aesthetic, authoritative, trustworthy |
| `minimalist` | minimalist design, clean lines, simple aesthetic, plenty of whitespace, neutral colors, minimal decoration |
| `custom` | User-provided modifiers via `--custom-style` |

## Color Palette Reference

Standard color palettes for each style:

### Technical Palette
```yaml
primary: "#2E5C8A"
secondary: "#5A7CA3"
accent: "#7BA3D4"
background: "#E8EDF2"
text: "#FFFFFF"
```

### Blog Palette
```yaml
primary: "#FF6B6B"
secondary: "#4ECDC4"
accent: "#FFE66D"
background: "#F7F9FC"
text: "#1A1A1A"
```

### Tutorial Palette
```yaml
primary: "#2ECC71"
secondary: "#3498DB"
accent: "#F39C12"
background: "#ECF0F1"
text: "#2C3E50"
```

### News Palette
```yaml
primary: "#2C3E50"
secondary: "#34495E"
accent: "#E74C3C"
background: "#ECF0F1"
text: "#2C3E50"
```

## Text Overlay Guidelines

### Typography Best Practices

| Aspect | Technical | Blog | Tutorial | News |
|--------|-----------|------|----------|------|
| Font Family | Sans-serif | Display | Bold | Headline |
| Weight | Medium/Regular | Medium/Bold | Bold | Heavy/Bold |
| Size | Large | XLarge | Large | XXLarge |
| Color | White/Light | Varied | High Contrast | High Contrast |
| Position | Center-Left | Centered | Centered | Headline |
| Shadow | Subtle | None | Strong | Medium |

### Text Visibility Rules

1. **High contrast** - Always ensure text is readable against background
2. **No busy backgrounds** - Avoid placing text over detailed areas
3. **Sufficient padding** - Leave space around text
4. **Appropriate size** - Text should be readable at small sizes
5. **Limit length** - Keep titles under 80 characters

### Disabling Text Overlay

```bash
# Generate cover without text overlay
wt:image-cover --article article.md --no-text --output cover.png
```

**Use cases for `--no-text`**:
- Adding custom text later in editing software
- Preferring minimal, text-free covers
- Internationalization (adding translated titles)

## Style Comparison Examples

### Same Content, Different Styles

**Article**: "Introduction to Microservices"

| Style | Result Description |
|-------|-------------------|
| `technical` | Clean diagram with server icons, API arrows, blue/gray palette, title in sans-serif |
| `blog` | Engaging visual with warm tones, approachable layout, stylized title text |
| `tutorial` | Step-by-step visual hints, numbered elements implied, clear progression |
| `news` | Headline-style title, professional newsroom feel, authoritative appearance |
| `minimalist` | Simple geometric shapes, neutral colors, minimal decoration |

## Creating Custom Style Presets

For frequently used custom styles, create style preset files in `materials/styles/`:

```markdown
---
name: brand-cover
description: Company branded cover style
prompt_modifiers:
  - "corporate branding"
  - "company colors"
  - "professional business style"
color_palette:
  - "#0055A4"  # Company blue
  - "#FF6B35"  # Company orange
text_overlay: true
font_family: "Inter, sans-serif"
---
```

Use custom preset:
```bash
wt:image-cover --article article.md --style custom \
  --custom-style "$(cat materials/styles/brand-cover.md)" \
  --output cover.png
```
