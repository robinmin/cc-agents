# Image Illustrator Workflows

Step-by-step workflow examples for common article illustration tasks.

## Workflow 1: Illustrate Article from Start to Finish

**Use Case**: Add illustrations to an article from scratch.

### Prerequisites
- Article markdown file
- Output directory for images
- `wt:image-generate` skill available

### Steps

1. **Run the illustration command**:
   ```bash
   wt:image-illustrator --article article.md --image-dir images/ --output article-illustrated.md
   ```

2. **Review the detected positions**:
   - Check `materials/positions/` for detected positions
   - Verify position types match your intent
   - Review rationale for each position

3. **Review generated images**:
   - Check `images/` directory for generated files
   - Verify images match content context
   - Review `captions.json` for metadata

4. **Verify updated article**:
   - Check `article-illustrated.md` has image references
   - Confirm images are inserted at appropriate positions
   - Verify alt text is descriptive

### Output
- Updated article with inline image references
- `captions.json` with all image metadata
- `materials/` directory with prompts and positions
- Generated images in specified directory

---

## Workflow 2: Generate Missing Illustrations Only

**Use Case**: Add illustrations only where images don't already exist.

### Prerequisites
- Article with some existing images
- Want to fill in gaps without duplicating

### Steps

1. **Scan article for existing images**:
   ```bash
   grep -n "!\[" article.md | head -20
   ```

2. **Run illustration with position awareness**:
   ```bash
   wt:image-illustrator --article article.md \
     --image-dir images/new/ \
     --output article-enhanced.md \
     --skip-existing
   ```

3. **Review new positions**:
   - Focus on sections without images
   - Prioritize abstract concepts
   - Check information-dense sections

### Output
- New images only in positions without existing visuals
- Updated `captions.json` with new entries
- Original images preserved

---

## Workflow 3: Illustrate Specific Section

**Use Case**: Add illustrations to a specific section only.

### Prerequisites
- Article with multiple sections
- Want to illustrate one section in detail

### Steps

1. **Extract section to illustrate**:
   ```bash
   # Extract lines 100-200 (example section)
   sed -n '100,200p' article.md > section-to-illustrate.md
   ```

2. **Illustrate the section**:
   ```bash
   wt:image-illustrator --article section-to-illustrate.md \
     --image-dir images/section/ \
     --min-positions 2 \
     --max-positions 5
   ```

3. **Merge images back into main article**:
   - Copy generated images to main images directory
   - Manually insert image references at appropriate positions
   - Update main `captions.json`

### Output
- Focused illustrations for specific section
- Can be merged into main article manually

---

## Workflow 4: High-Density Illustration

**Use Case**: Create heavily illustrated article for visual learners.

### Prerequisites
- Technical or educational content
- Need frequent visual explanations

### Steps

1. **Run with high position limits**:
   ```bash
   wt:image-illustrator --article article.md \
     --image-dir images/ \
     --min-positions 10 \
     --max-positions 20
   ```

2. **Review position distribution**:
   ```bash
   # Check captions.json for position types
   jq '.generation_summary' captions.json
   ```

3. **Adjust style mix**:
   - Technical diagrams for concepts
   - Sketches for data-dense sections
   - Minimalist images for transitions

### Output
- Densely illustrated article (10-20 images)
- Mix of styles for variety
- Comprehensive `captions.json` metadata

---

## Workflow 5: Iterate on Generated Illustrations

**Use Case**: Improve existing illustrations by regenerating specific images.

### Prerequisites
- Article with existing illustrations
- Some images need regeneration

### Steps

1. **Review `captions.json`**:
   ```bash
   # List all images with positions
   jq '.images[] | {id, position, position_type, file}' captions.json
   ```

2. **Identify images to regenerate**:
   - Note image IDs or positions
   - Check `materials/prompts/` for original prompts

3. **Regenerate specific images**:
   ```bash
   # Use wt:image-generate directly for specific image
   wt:image-generate --template illustrator \
     --var concept="Microservices Architecture" \
     --style technical-diagram \
     --output images/microservices-architecture-v2.png
   ```

4. **Update article and metadata**:
   - Replace image reference in article
   - Update `captions.json` with new file path

### Output
- Improved images for selected positions
- Updated article and metadata

---

## Workflow 6: Custom Style by Position Type

**Use Case**: Use different styles for different position types.

### Prerequisites
- Want custom style mapping beyond defaults
- Brand guidelines for specific content types

### Steps

1. **Define style mapping**:
   ```bash
   # Custom style preferences
   abstract_concept -> photorealistic
   information_dense -> sketch
   emotional_transition -> vibrant
   ```

2. **Generate images in batches by type**:
   ```bash
   # First, run analysis to detect positions
   wt:image-illustrator --article article.md --analyze-only

   # Then generate each batch with custom style
   # (This requires manual intervention or custom script)
   ```

3. **Or manually regenerate with preferred styles**:
   ```bash
   wt:image-generate "concept description" \
     --style photorealistic \
     --output image.png
   ```

### Output
- Custom-styled images for each position type
- Potentially more visually engaging article

---

## Workflow 7: Validate Image Accessibility

**Use Case**: Ensure all images have proper alt text and captions.

### Prerequisites
- Article with illustrations
- Need accessibility compliance

### Steps

1. **Check `captions.json` for alt text**:
   ```bash
   # List images with alt text
   jq '.images[] | select(.alt_text == null) | .id' captions.json
   ```

2. **Review alt text quality**:
   - Are descriptions detailed?
   - Do they convey visual content?
   - Are they concise yet informative?

3. **Add missing alt text**:
   - Generate alt text using image description
   - Update `captions.json` manually
   - Or use wt:image-generate to regenerate with better prompts

### Output
- Accessibility-compliant article
- Complete alt text for all images

---

## Workflow 8: Batch Process Multiple Articles

**Use Case**: Illustrate multiple articles in a project.

### Prerequisites
- Multiple articles to illustrate
- Consistent style across project

### Steps

1. **Create batch script**:
   ```bash
   #!/bin/bash
   # illustrate-batch.sh

   ARTICLES=(
     "article-1.md"
     "article-2.md"
     "article-3.md"
   )

   for article in "${ARTICLES[@]}"
   do
     echo "Illustrating $article..."
     wt:image-illustrator --article "$article" \
       --image-dir "images/$(basename $article .md)/" \
       --output "illustrated/$(basename $article .md).md"
   done
   ```

2. **Run batch illustration**:
   ```bash
   chmod +x illustrate-batch.sh
   ./illustrate-batch.sh
   ```

3. **Review results**:
   - Check each article for consistency
   - Verify style uniformity across articles
   - Aggregate `captions.json` files if needed

### Output
- Multiple illustrated articles
- Consistent style across project
- Separate image directories per article

---

## Quick Reference

| Task | Command Template |
|------|------------------|
| Basic illustration | `--article article.md --image-dir images/` |
| Update in place | `--output article.md` |
| High density | `--min-positions 10 --max-positions 20` |
| Skip existing | `--skip-existing` (if implemented) |
| Custom resolution | `--resolution 1024x768` |
| Specific section | Extract section, illustrate, merge manually |

## Tips for Best Results

1. **Start with defaults** - Let position detection work automatically first
2. **Review detected positions** - Check `materials/positions/` for rationale
3. **Adjust position limits** - Use `--min-positions` and `--max-positions` for control
4. **Match style to content** - Technical diagrams for concepts, sketches for data
5. **Verify accessibility** - Ensure all images have descriptive alt text
6. **Preserve originals** - Always keep backup of original article
7. **Iterate selectively** - Regenerate only images that need improvement
