# Prompt Engineering for Beautiful Images

Guide for crafting image generation prompts that produce beautiful, meaningful results.

## 7-Layer Prompt Anatomy

Effective prompts follow a layered structure. Each layer adds specificity:

| Layer | Purpose | Example |
|-------|---------|---------|
| **1. Subject** | What to depict | "Microservices architecture diagram" |
| **2. Environment** | Scene context | "on white background" / "in modern office" |
| **3. Composition** | Layout and framing | "centered focal point, rule of thirds" |
| **4. Lighting** | Light quality and direction | "soft natural window light, golden hour" |
| **5. Color Palette** | Specific color direction | "deep navy to electric blue gradient" |
| **6. Style Anchors** | Artistic reference | "editorial magazine style" / "kawaii aesthetic" |
| **7. Quality Keywords** | Technical quality | "8K, masterpiece, professional color grading" |

### Prompt Formula

```
[Subject Declaration] + [Environment] + [Composition Directive] +
[Lighting Direction] + [Color Palette] + [Style Anchors] + [Quality Keywords]
```

## Color Psychology Quick Reference

| Color Family | Emotional Association | Best For |
|-------------|----------------------|----------|
| **Warm (amber, terracotta, gold)** | Trust, comfort, approachability | Lifestyle, personal brand, wellness |
| **Cool (navy, teal, ice blue)** | Professionalism, technology, calm | Tech content, corporate, documentation |
| **Fresh (mint, sage, soft green)** | Growth, health, new beginnings | Health, nature, product launches |
| **Pastel (pink, lavender, baby blue)** | Playfulness, sweetness, youth | Social media, tutorials, lifestyle |
| **High contrast (black + accent)** | Authority, sophistication, impact | Editorial, thought leadership, premium |
| **Neutral (gray, off-white, cream)** | Elegance, simplicity, focus | Minimalist design, UI, documentation |

## Composition Rules

### Rule of Thirds
Place key elements along imaginary grid lines dividing the image into 9 equal sections. Creates natural visual balance.

### Focal Point
Every image needs one clear focal point. Avoid competing subjects. Use depth of field, contrast, or scale to emphasize.

### Negative Space
Reserve clean areas for text overlay or visual breathing room. Specify in prompts: "negative space in upper third for text overlay."

### Visual Hierarchy
Guide the viewer's eye: largest/brightest element first, then secondary elements, then details. Use size, contrast, and position.

### Leading Lines
Use lines (real or implied) to draw attention toward the focal point. Diagonal lines add energy; horizontal lines convey calm.

## Weak vs. Strong Prompts

### Weak Prompt
```
Professional cover image for "My Article".
Create an eye-catching visual with bold typography and vibrant colors.
High-end magazine quality illustration.
```
**Problem**: Vague, no specific composition, color, or lighting direction. "Eye-catching" and "bold" are subjective without specifics.

### Strong Prompt
```
Cinematic wide-format cover illustration for "My Article".
Visual approach: abstract geometric with clean modern lines.
Composition: strong central focal point, negative space in upper third for text overlay.
Color palette: deep navy transitioning to electric blue with warm amber accents.
Lighting: dramatic volumetric side lighting with long shadows creating depth.
Magazine-quality digital art with fine detail textures and cinematic depth of field.
```
**Why it works**: Each creative dimension is specified — composition, color, lighting, style — leaving nothing to chance while allowing artistic interpretation within clear bounds.

## Negative Prompts (What to Avoid)

When quality suffers, consider excluding:
- "blurry, low quality, distorted, watermark, text, signature"
- "oversaturated, noisy, grainy, pixelated"
- "cluttered, busy background, multiple focal points"

## Platform-Specific Tips

| Platform | Aspect Ratio | Key Consideration |
|----------|-------------|-------------------|
| Blog cover | 21:9 (1344x576) | Text overlay space, cinematic feel |
| Social square | 1:1 (1024x1024) | Centered composition, mobile-friendly |
| XHS/Xiaohongshu | 3:4 (864x1152) | Warm tones, text overlay in upper third, save-worthy |
| Instagram | 4:5 (832x1248) | Eye-catching in feed scroll |
| YouTube thumbnail | 16:9 (1280x720) | High contrast, readable at small size |
| Technical docs | 4:3 (1152x864) | Clean, readable, generous whitespace |
