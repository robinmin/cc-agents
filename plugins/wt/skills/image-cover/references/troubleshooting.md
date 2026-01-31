# Image Cover Troubleshooting Guide

Common issues and solutions when using the `wt:image-cover` skill.

## Article Analysis Issues

### Article Not Found

**Error**: `Article not found: /path/to/article.md`

**Cause**: The specified article file doesn't exist or path is incorrect.

**Solution**:
```bash
# Check file exists
ls -la /path/to/article.md

# Verify current directory
pwd

# Use correct relative or absolute path
wt:image-cover --article docs/article.md --output cover.png
# or
wt:image-cover --article /full/path/to/article.md --output cover.png
```

### Empty Article Content

**Symptom**: Cover generated but themes are generic, title is "Cover"

**Cause**: Article file is empty or has very little content (< 50 words)

**Solution**:
```bash
# Check article content
wc -l article.md
cat article.md

# Ensure article has:
# - Title in frontmatter or first heading
# - At least 50 words of content
# - Some structure (headings, paragraphs)
```

### No Title Detected

**Symptom**: Cover uses filename or "Cover" as title instead of article title

**Cause**: Article missing title in frontmatter and first heading

**Solution**:
```bash
# Add title to article frontmatter
cat > article.md << 'EOF'
---
title: "My Article Title"
date: 2024-01-15
tags: [tech, tutorial]
---

# Article content starts here...
EOF
```

**Title Extraction Priority**:
1. Frontmatter `title` field
2. First `#` heading in markdown
3. Filename without extension
4. Default "Cover"

### Wrong Content Type Detected

**Symptom**: Generated cover doesn't match article style (e.g., technical style for blog post)

**Cause**: Content type detection heuristics don't match actual article type

**Solution**:
```bash
# Override auto-detected style
wt:image-cover --article article.md --style blog --output cover.png

# Review analysis to understand detection
wt:image-cover --article article.md --output cover.png --debug
cat skills/image-cover/materials/analysis/analysis-*.md
```

**Content Type Indicators**:

| Type | Indicators | Detection Rules |
|------|------------|-----------------|
| `technical` | Code blocks, technical terms | `contains(\`\`\`) AND technical_vocab` |
| `tutorial` | Step-by-step structure | `contains(/^##?\s*Step\s*\d+/i)` |
| `news` | Dateline, formal tone | `starts_with(date) AND formal_language` |
| `blog` | Default fallback | None of the above |

## Style Issues

### Invalid Style Specified

**Error**: `Invalid style: 'xyz'`

**Cause**: Style name not in supported list

**Solution**:
```bash
# Use valid style
wt:image-cover --article article.md --style technical --output cover.png

# Valid styles: technical, blog, tutorial, news, custom
```

### Custom Style Missing Description

**Error**: `Custom style requires --custom-style parameter`

**Cause**: Used `--style custom` without providing style description

**Solution**:
```bash
# Provide custom style description
wt:image-cover --article article.md --style custom \
  --custom-style "cyberpunk aesthetic, neon lights, dark background" \
  --output cover.png
```

### Style Not Applied

**Symptom**: Generated cover doesn't reflect selected style

**Cause**: Style modifiers not being passed to image generation

**Solution**:
```bash
# Enable debug mode to see prompt
wt:image-cover --article article.md --style technical --output cover.png --debug

# Check generated prompt in materials/prompts/
cat skills/image-cover/materials/prompts/prompt-*.md
```

## Output Path Issues

### Output Directory Does Not Exist

**Error**: `Output directory does not exist: covers/`

**Cause**: Directory hasn't been created

**Solution**:
```bash
# Create directory first
mkdir -p covers

# Or use full path (directory will be created)
wt:image-cover --article article.md --output /full/path/to/covers/cover.png
```

### Permission Denied

**Error**: `Permission denied when writing to output path`

**Cause**: No write permission for output directory

**Solution**:
```bash
# Check directory permissions
ls -la covers/

# Add write permission
chmod +w covers/

# Or use different output location
wt:image-cover --article article.md --output /tmp/cover.png
```

### Invalid Output Path

**Error**: `Invalid output path` or `Cannot write to path`

**Cause**: Output path points to invalid location (e.g., `/dev/null`, system directory)

**Solution**:
```bash
# Use valid output path with .png extension
wt:image-cover --article article.md --output covers/cover.png

# Avoid:
# - System directories (/etc, /sys, /proc)
# - Special files (/dev/null, /dev/zero)
# - Paths without proper permissions
```

## Generation Issues

### Image Generation Failed

**Error**: `Image generation failed`

**Cause**: Backend API unavailable or error during generation

**Solution**:
```bash
# Check API keys are set
echo $HUGGINGFACE_API_TOKEN
echo $GEMINI_API_KEY

# Enable debug mode
wt:image-cover --article article.md --output cover.png --debug

# Try different backend (if supported)
wt:image-cover --article article.md --output cover.png --backend gemini
```

### API Token Not Set

**Error**: `HUGGINGFACE_API_TOKEN environment variable not set`

**Cause**: Required API token for backend not configured

**Solution**:
```bash
# Set environment variable
export HUGGINGFACE_API_TOKEN="hf_xxxxxxxxxxxxx"

# Or add to .env file
echo "HUGGINGFACE_API_TOKEN=hf_xxxxxxxxxxxxx" >> .env
source .env

# Get token from: https://huggingface.co/settings/tokens
```

**For Gemini**:
```bash
export GEMINI_API_KEY="AIxxxxxxxxxxxx"
# Get key from: https://makersuite.google.com/app/apikey
```

### Timeout During Generation

**Error**: `Request timeout after N seconds`

**Cause**: Backend API taking too long to respond

**Solution**:
```bash
# Increase timeout (if supported)
wt:image-cover --article article.md --output cover.png --timeout 120

# Or try faster backend
wt:image-cover --article article.md --output cover.png --backend nano_banana
```

## Resolution Issues

### Invalid Resolution Format

**Error**: `Invalid resolution format: '1920x'`

**Cause**: Resolution not in `WIDTHxHEIGHT` format

**Solution**:
```bash
# Use correct format: WIDTHxHEIGHT
wt:image-cover --article article.md --resolution 1920x817 --output cover.png

# Valid examples:
# 1920x817   (2.35:1)
# 2560x1089  (2.35:1, high-res)
# 1280x545   (2.35:1, mobile)
```

### Resolution Not Maintaining 2.35:1 Ratio

**Symptom**: Cover looks stretched or squashed

**Cause**: Resolution doesn't maintain 2.35:1 aspect ratio

**Solution**:
```bash
# Calculate correct height for 2.35:1 ratio
# HEIGHT = WIDTH / 2.35

# Examples:
# 1920 / 2.35 ≈ 817
# 2560 / 2.35 ≈ 1089
# 3840 / 2.35 ≈ 1634

# Use predefined resolutions
wt:image-cover --article article.md --resolution 1920x817 --output cover.png
```

**Resolution Quick Reference**:

| Use Case | Width | Height | Resolution |
|----------|-------|--------|------------|
| Standard | 1920 | 817 | 1920x817 |
| High-DPI | 2560 | 1089 | 2560x1089 |
| 4K | 3840 | 1634 | 3840x1634 |
| Mobile | 1280 | 545 | 1280x545 |

## Text Overlay Issues

### Title Text Not Visible

**Symptom**: Generated cover missing title text

**Cause**: Text overlay disabled or not applied

**Solution**:
```bash
# Check if --no-text was used
# Omit --no-text to enable text overlay
wt:image-cover --article article.md --output cover.png

# Verify title was extracted
wt:image-cover --article article.md --output cover.png --debug
cat skills/image-cover/materials/analysis/analysis-*.md
```

### Title Text Too Long

**Symptom**: Title text truncated or cut off on cover

**Cause**: Title exceeds 80 character limit for cover text

**Solution**:
```bash
# Shorten title in article frontmatter
---
title: "Short Title"  # Instead of "Very Long Title That Will Be Truncated"
---

# Or use --no-text and add custom text later
wt:image-cover --article article.md --no-text --output cover.png
```

### Title Contains Special Characters

**Symptom**: Title text has artifacts or garbled characters

**Cause**: Special characters in title not properly escaped

**Solution**:
```bash
# Simplify title in frontmatter
---
title: "API Design Guide"  # Instead of "API Design Guide: REST vs GraphQL"
---

# Or use --no-text for full control
wt:image-cover --article article.md --no-text --output cover.png
```

## Materials Storage Issues

### Materials Directory Not Created

**Symptom**: `materials/` directory doesn't exist after generation

**Cause**: Error during generation or materials storage disabled

**Solution**:
```bash
# Check generation completed successfully
ls -la covers/cover.png

# Manually create materials directory
mkdir -p skills/image-cover/materials/{prompts,analysis,tasks}

# Re-run with debug mode
wt:image-cover --article article.md --output cover.png --debug
```

### Analysis Logs Missing

**Symptom**: `materials/analysis/` directory is empty

**Cause**: Analysis logs not saved or debug mode disabled

**Solution**:
```bash
# Re-run with debug mode to save analysis logs
wt:image-cover --article article.md --output cover.png --debug

# Check analysis logs
ls -la skills/image-cover/materials/analysis/
cat skills/image-cover/materials/analysis/analysis-*.md
```

## Debugging Steps

### Enable Debug Mode

```bash
# Enable verbose output
wt:image-cover --article article.md --output cover.png --debug

# Check materials directory
ls -la skills/image-cover/materials/

# Review analysis logs
cat skills/image-cover/materials/analysis/analysis-*.md

# Review generated prompt
cat skills/image-cover/materials/prompts/prompt-*.md
```

### Check Environment Variables

```bash
# Check if API keys are set
env | grep API

# Set missing API keys
export HUGGINGFACE_API_TOKEN="hf_xxxxxxxxxxxxx"
export GEMINI_API_KEY="AIxxxxxxxxxxxx"

# Verify keys are set
echo $HUGGINGFACE_API_TOKEN
echo $GEMINI_API_KEY
```

### Verify Article Content

```bash
# Check article exists and is readable
ls -la article.md
cat article.md

# Verify article has title
head -20 article.md | grep -E "(title:|^#)"

# Check article has sufficient content
wc -l article.md
wc -w article.md
```

### Test with Simple Article

```bash
# Create minimal test article
cat > test-article.md << 'EOF'
---
title: "Test Article"
tags: [test]
---

# Test Article

This is a test article with technical content.

## Technical Details

Code example:
\`\`\`python
print("Hello, World!")
\`\`\`
EOF

# Generate cover for test article
wt:image-cover --article test-article.md --output test-cover.png --debug
```

## Common Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `Article not found` | File path incorrect | Check file exists, use correct path |
| `No title detected` | Article missing title | Add title to frontmatter or first heading |
| `Invalid style` | Style name not recognized | Use valid style: technical/blog/tutorial/news/custom |
| `Custom style requires --custom-style` | Missing custom style description | Add `--custom-style "description"` |
| `Output directory does not exist` | Directory not created | Create directory first or use full path |
| `Permission denied` | No write access | Check permissions or use different output location |
| `Invalid resolution format` | Resolution not `WIDTHxHEIGHT` | Use format like `1920x817` |
| `API token not set` | Missing environment variable | Set `HUGGINGFACE_API_TOKEN` or `GEMINI_API_KEY` |
| `Image generation failed` | Backend error | Check API keys, try different backend |
| `Request timeout` | API taking too long | Increase timeout or try faster backend |

## Getting Help

For issues not covered here:

1. **Check analysis logs**: Review `materials/analysis/` to understand detection results
2. **Enable debug mode**: Use `--debug` flag for verbose output
3. **Verify environment**: Check API keys and file permissions
4. **Test with simple article**: Create minimal test case to isolate issue
5. **Review reference docs**: Check `references/content-analysis.md` for detection details
6. **Check related skills**: Verify `wt:image-generate` skill is working correctly

## Prevention Best Practices

1. **Always include title** in article frontmatter for reliable extraction
2. **Use correct paths** - Verify article and output paths before generation
3. **Set API keys** - Configure environment variables before first use
4. **Create output directories** - Ensure output directory exists or can be created
5. **Use valid resolutions** - Maintain 2.35:1 aspect ratio for covers
6. **Enable debug mode** - Use `--debug` when troubleshooting or developing
7. **Review analysis logs** - Check `materials/analysis/` after generation to verify detection
8. **Test with simple cases** - Start with minimal articles to verify setup
