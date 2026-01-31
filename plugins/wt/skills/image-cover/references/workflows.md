# Image Cover Workflows

Step-by-step workflow examples for common cover generation tasks using the `wt:image-cover` skill.

## Workflow 1: Generate Cover from Article (Auto-Detect)

**Use Case**: Create a cover image with automatic style detection based on article content.

### Prerequisites
- Article markdown file with title in frontmatter or first heading
- Output directory for cover image

### Steps

1. **Generate cover with auto-detection**:
   ```bash
   wt:image-cover --article docs/intro-to-microservices.md \
     --output covers/microservices-cover.png
   ```

2. **Review results**:
   - Check `materials/analysis/` for detected content type and themes
   - Verify generated cover at output path

### What Happens

1. **Read article** from specified path
2. **Extract title** from frontmatter or first heading
3. **Analyze content**:
   - Detect content type (technical/blog/tutorial/news)
   - Extract key themes and keywords
   - Select appropriate style
4. **Generate cover** using `wt:image-generate`
5. **Save materials** to `materials/` directory
6. **Return output path**

### Output

```
✓ Cover generated: covers/microservices-cover.png
  - Title: "Introduction to Microservices"
  - Detected Type: technical
  - Selected Style: technical-diagram
  - Resolution: 1920x817 (2.35:1)
```

---

## Workflow 2: Generate Cover with Manual Style

**Use Case**: Override auto-detection and specify a specific style.

### Prerequisites
- Article markdown file
- Desired style selection

### Steps

1. **Generate cover with specific style**:
   ```bash
   # Blog style
   wt:image-cover --article docs/my-journey.md --style blog \
     --output covers/journey-cover.png

   # Tutorial style
   wt:image-cover --article docs/how-to-deploy.md --style tutorial \
     --output covers/deploy-guide-cover.png

   # News style
   wt:image-cover --article docs/product-announcement.md --style news \
     --output covers/announcement-cover.png
   ```

2. **Compare styles**:
   ```bash
   # Generate same article with different styles
   for style in technical blog tutorial news; do
     wt:image-cover --article article.md --style $style \
       --output covers/article-$style.png
   done
   ```

### Style Options

| Style | Best For |
|-------|----------|
| `technical` | Documentation, technical articles |
| `blog` | Personal blog posts, stories |
| `tutorial` | How-to guides, tutorials |
| `news` | News articles, announcements |
| `custom` | Custom requirements (use `--custom-style`) |

---

## Workflow 3: Generate Cover Without Text Overlay

**Use Case**: Create a cover image without title text for later customization.

### Prerequisites
- Article markdown file
- Output directory

### Steps

1. **Generate cover without text**:
   ```bash
   wt:image-cover --article docs/architecture.md \
     --no-text \
     --output covers/architecture-clean.png
   ```

2. **Add custom text later**:
   - Use image editing software (Photoshop, GIMP, Figma)
   - Add custom typography, branding, or translated text

### Use Cases

- **Localization**: Adding translated titles for different languages
- **Branding**: Adding company logo and branded typography
- **Customization**: Creating multiple variants with different text
- **Minimal design**: Preferring clean, text-free covers

---

## Workflow 4: Generate Cover with Custom Resolution

**Use Case**: Create cover with non-standard resolution while maintaining 2.35:1 aspect ratio.

### Prerequisites
- Article markdown file
- Desired resolution (must maintain 2.35:1 ratio)

### Steps

1. **Calculate resolution for 2.35:1 ratio**:
   ```bash
   # Width / Height = 2.35:1
   # Height = Width / 2.35

   # Examples:
   # 1920 / 2.35 = 817 (default)
   # 2560 / 2.35 = 1089
   # 3840 / 2.35 = 1634 (4K)
   ```

2. **Generate with custom resolution**:
   ```bash
   # 2560x1089 (higher resolution)
   wt:image-cover --article docs/high-res-article.md \
     --resolution 2560x1089 \
     --output covers/cover-hr.png

   # 3840x1634 (4K resolution)
   wt:image-cover --article docs/4k-article.md \
     --resolution 3840x1634 \
     --output covers/cover-4k.png
   ```

### Resolution Guide

| Resolution | Width | Height | Use Case |
|------------|-------|--------|----------|
| Standard | 1920 | 817 | Web articles, blog posts |
| High | 2560 | 1089 | High-DPI displays |
| 4K | 3840 | 1634 | 4K displays, print |
| Mobile | 1280 | 545 | Mobile-optimized |

---

## Workflow 5: Batch Generate Covers for Multiple Articles

**Use Case**: Generate covers for multiple articles in a directory.

### Prerequisites
- Directory of article markdown files
- Output directory for covers

### Steps

1. **Create batch generation script**:
   ```bash
   #!/bin/bash
   # batch-covers.sh

   ARTICLES_DIR="docs/articles"
   OUTPUT_DIR="covers/batch"
   mkdir -p "$OUTPUT_DIR"

   for article in "$ARTICLES_DIR"/*.md; do
     filename=$(basename "$article" .md)
     echo "Processing: $filename"

     wt:image-cover --article "$article" \
       --output "$OUTPUT_DIR/$filename-cover.png"

     if [ $? -eq 0 ]; then
       echo "✓ Generated: $OUTPUT_DIR/$filename-cover.png"
     else
       echo "✗ Failed: $filename"
     fi
   done

   echo "Batch complete: $OUTPUT_DIR"
   ```

2. **Run the script**:
   ```bash
   chmod +x batch-covers.sh
   ./batch-covers.sh
   ```

### Output Structure

```
covers/batch/
├── article1-cover.png
├── article2-cover.png
├── article3-cover.png
└── article4-cover.png
```

### Progress Tracking

The script generates output like:
```
Processing: intro-to-microservices
✓ Generated: covers/batch/intro-to-microservices-cover.png
Processing: api-design-guide
✓ Generated: covers/batch/api-design-guide-cover.png
Processing: deployment-tutorial
✓ Generated: covers/batch/deployment-tutorial-cover.png
Batch complete: covers/batch
```

---

## Workflow 6: Generate Cover with Content Analysis Review

**Use Case**: Review content analysis before generating cover.

### Prerequisites
- Article markdown file
- Want to verify detected style and themes

### Steps

1. **Enable debug mode**:
   ```bash
   wt:image-cover --article docs/complex-article.md \
     --output covers/complex-cover.png \
     --debug
   ```

2. **Review analysis log**:
   ```bash
   # Check analysis results
   cat skills/image-cover/materials/analysis/analysis-*.md
   ```

### Analysis Log Format

```markdown
# Content Analysis Log

**Article**: docs/complex-article.md
**Timestamp**: 2024-01-15T10:30:00Z

## Extraction Results

- **Title**: "Advanced API Design Patterns"
- **Content Type**: technical
- **Selected Style**: technical-diagram
- **Themes**: API, REST, GraphQL, rate limiting, caching

## Detection Details

- Code blocks found: 12
- Technical terms: 58
- Section headings: 15
- Tags: [api, architecture, backend]

## Enhanced Prompt

"Advanced API Design Patterns, API, REST, GraphQL, rate limiting, caching,
clean technical illustration, professional, precise, architectural diagram style,
with title text: 'Advanced API Design Patterns'"
```

3. **Adjust if needed**:
   ```bash
   # Override detected style
   wt:image-cover --article docs/complex-article.md \
     --style blog \
     --output covers/complex-cover.png
   ```

---

## Workflow 7: Generate Cover from Article with No Title

**Use Case**: Handle articles missing title in frontmatter or heading.

### Prerequisites
- Article markdown file without explicit title
- Want to provide title manually

### Steps

1. **Auto-detection behavior**:
   ```bash
   # Tries: frontmatter → first heading → filename → "Cover"
   wt:image-cover --article docs/no-title-article.md \
     --output covers/untitled-cover.png
   ```

2. **Manual title override** (future enhancement):
   ```bash
   # Currently not supported, but planned:
   # wt:image-cover --article docs/no-title-article.md \
   #   --title "My Custom Title" \
   #   --output covers/custom-titled-cover.png
   ```

3. **Workaround**: Add title to article frontmatter:
   ```markdown
   ---
   title: "My Custom Title"
   ---

   # Article content starts here...
   ```

### Title Extraction Priority

1. **Frontmatter** - `title` field in YAML frontmatter
2. **First Heading** - First `#` heading in markdown
3. **Filename** - Filename without extension
4. **Default** - "Cover" if all else fails

---

## Workflow 8: Troubleshooting Cover Generation

**Use Case**: Debug issues with cover generation.

### Common Issues and Solutions

#### Issue: Article Not Found

**Error**: `Article not found: /path/to/article.md`

**Solution**:
```bash
# Check file exists
ls -la /path/to/article.md

# Use relative or absolute path correctly
wt:image-cover --article docs/article.md --output cover.png
# or
wt:image-cover --article /full/path/to/article.md --output cover.png
```

#### Issue: No Title Detected

**Symptom**: Cover uses filename or "Cover" as title

**Solution**:
```bash
# Add title to article frontmatter
cat > article.md << 'EOF'
---
title: "My Article Title"
---

# Article content
EOF
```

#### Issue: Wrong Style Detected

**Symptom**: Generated cover doesn't match article type

**Solution**:
```bash
# Override auto-detected style
wt:image-cover --article article.md --style technical --output cover.png
```

#### Issue: Generation Failed

**Error**: `Image generation failed`

**Solution**:
```bash
# Check API keys are set
echo $HUGGINGFACE_API_TOKEN
echo $GEMINI_API_KEY

# Enable debug mode
wt:image-cover --article article.md --output cover.png --debug

# Try different backend
wt:image-cover --article article.md --output cover.png --backend gemini
```

### Debug Checklist

- [ ] Article path is correct and file exists
- [ ] Article has title in frontmatter or first heading
- [ ] API keys are set (`HUGGINGFACE_API_TOKEN` or `GEMINI_API_KEY`)
- [ ] Output directory exists or can be created
- [ ] Style is valid (technical/blog/tutorial/news/custom)
- [ ] Resolution maintains 2.35:1 aspect ratio

---

## Quick Reference

| Task | Command Template |
|------|------------------|
| Auto-detect style | `--article <path> --output <path>` |
| Manual style | `--article <path> --style <style> --output <path>` |
| No text overlay | `--article <path> --no-text --output <path>` |
| Custom resolution | `--article <path> --resolution WxH --output <path>` |
| Debug mode | `--article <path> --output <path> --debug` |
| Batch generation | `for f in *.md; do wt:image-cover --article $f --output covers/$f.png; done` |

## Tips for Best Results

1. **Provide article context** - Articles with clear titles and structure generate better covers
2. **Check analysis logs** - Review `materials/analysis/` to understand detection results
3. **Override when needed** - Use `--style` to correct wrong auto-detection
4. **Use appropriate resolution** - 1920x817 for web, higher for print
5. **Enable debug mode** - Use `--debug` when troubleshooting issues
6. **Maintain 2.35:1 ratio** - Custom resolutions should preserve aspect ratio
7. **Organize materials** - Store generated prompts and analysis for iteration
