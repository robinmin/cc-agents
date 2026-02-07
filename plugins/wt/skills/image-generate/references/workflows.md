# Common Image Generation Workflows

This guide provides step-by-step workflows for common image generation tasks.

## Workflow 1: Generate Cover Image from Article Title

**Use Case**: Create a cinematic cover image for an article or blog post.

### Prerequisites
- Article title and optional topics
- Output directory for cover image

### Steps

1. **Use the cover template** (recommended):
   ```bash
   wt:image-generate --template cover \
     --var title="Introduction to Microservices" \
     --var topics="distributed systems, scalability" \
     --var mood="modern and professional" \
     --output covers/microservices-cover.png
   ```

2. **Or specify parameters directly**:
   ```bash
   wt:image-generate "Microservices architecture cover" \
     --style vibrant \
     --resolution 1344x576 \
     --output covers/microservices-cover.png
   ```

### Output
- 1344x576 (21:9 cinematic aspect ratio)
- Bold, professional cover image
- Saved to specified output path

---

## Workflow 2: Generate Inline Illustration

**Use Case**: Create technical diagrams for article content.

### Prerequisites
- Concept to illustrate
- Article content for context (optional)

### Steps

1. **Use the illustrator template** (recommended):
   ```bash
   wt:image-generate --template illustrator \
     --var title="Microservices Architecture" \
     --var concept="API Gateway pattern" \
     --var complexity="moderately complex" \
     --output illustrations/api-gateway.png
   ```

2. **Or with content context**:
   ```bash
   wt:image-generate --template illustrator \
     --var concept="Database sharding strategy" \
     --content article.md \
     --output illustrations/sharding.png
   ```

### Output
- 1152x864 (4:3 aspect ratio)
- Clean technical illustration style
- Suitable for inline article images

---

## Workflow 3: Generate Social Media Image

**Use Case**: Create square images for social media posts.

### Prerequisites
- Product/service description
- Brand context

### Steps

1. **Create custom social template** (first time):
   ```bash
   mkdir -p .image-templates
   cat > .image-templates/social.tpl.md << 'EOF'
   ---
   name: social
   description: Social media square image
   width: 1080
   height: 1080
   style: vibrant
   keywords: ["engaging", "eye-catching", "social media"]
   output_filename: "{{campaign | post}}.png"
   variables:
     product:
       description: Product or service name
       default: "product"
     benefit:
       description: Key benefit or feature
       default: "amazing"
   ---

   Professional {{product}} showcase highlighting {{benefit}}.
   Engaging social media visual with vibrant colors and modern aesthetic.
   Eye-catching composition for maximum engagement.
   EOF
   ```

2. **Generate images using template**:
   ```bash
   wt:image-generate --template social \
     --var product="AI Writing Assistant" \
     --var benefit="10x faster writing" \
     --output social/writing-assistant.png
   ```

### Output
- 1080x1080 (1:1 square)
- Optimized for social media
- Reusable template for consistent branding

---

## Workflow 4: Generate Multiple Images in Bulk

**Use Case**: Generate multiple images with consistent style.

### Prerequisites
- List of prompts/concepts
- Output directory structure

### Steps

1. **Create a simple bash script**:
   ```bash
   #!/bin/bash
   # generate-batch.sh

   OUTPUT_DIR="output/batch-$(date +%Y%m%d)"
   mkdir -p "$OUTPUT_DIR"

   # Array of prompts
   declare -a PROMPTS=(
     "Cloud architecture diagram"
     "Database schema visualization"
     "API integration flow"
     "Security layers diagram"
   )

   # Generate each image
   for prompt in "${PROMPTS[@]}"
   do
     filename=$(echo "$prompt" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
     wt:image-generate "$prompt" \
       --style technical-diagram \
       --resolution 1024x1024 \
       --output "$OUTPUT_DIR/${filename}.png"
   done

   echo "Batch complete: $OUTPUT_DIR"
   ```

2. **Run the script**:
   ```bash
   chmod +x generate-batch.sh
   ./generate-batch.sh
   ```

### Output
- Multiple images with consistent style
- Organized in dated output directory
- Filename-safe naming

---

## Workflow 5: Generate with Content Context

**Use Case**: Generate images based on article content for relevance.

### Prerequisites
- Article markdown file
- Desired image placement/subject

### Steps

1. **Generate cover using article content**:
   ```bash
   wt:image-generate --template cover \
     --var title="Understanding Async Rust" \
     --var topics="async programming, rust" \
     --content article.md \
     --output covers/async-rust.png
   ```

2. **Generate illustration using content**:
   ```bash
   wt:image-generate --template illustrator \
     --var concept="async task spawning" \
     --content article.md \
     --output illustrations/task-spawning.png
   ```

### How Content Context Works

The `--content` flag reads the file and adds relevant context to the prompt:
- Extracts key topics and themes
- Adds technical terminology
- Ensures visual consistency with article subject

---

## Workflow 6: Custom Style Generation

**Use Case**: Generate images with custom style description.

### Prerequisites
- Subject description
- Custom style requirements

### Steps

1. **Use custom style**:
   ```bash
   wt:image-generate "Futuristic cityscape" \
     --style custom \
     --custom-style "cyberpunk aesthetic, neon lights, rain-soaked streets, blade runner vibe" \
     --resolution 1920x1080 \
     --output custom/cyberpunk-city.png
   ```

2. **Or use detailed prompt**:
   ```bash
   wt:image-generate "Futuristic cityscape, cyberpunk aesthetic, neon lights, rain-soaked streets, blade runner vibe, highly detailed, cinematic lighting" \
     --resolution 1920x1080 \
     --output custom/cyberpunk-city.png
   ```

### Output
- Image with custom-applied style
- Matches specific aesthetic requirements
- High resolution for detailed scenes

---

## Workflow 7: Generate with Fallback Handling

**Use Case**: Ensure image generation even if primary backend fails.

### Prerequisites
- Multiple API keys configured (for redundancy)
- Critical image generation task

### Steps

1. **Configure multiple backends**:
   ```bash
   export HUGGINGFACE_API_TOKEN="hf_..."
   export GEMINI_API_KEY="AI..."
   ```

2. **Generate with automatic fallback**:
   ```bash
   # Tries huggingface, falls back to gemini, then nano_banana
   wt:image-generate "Server architecture" \
     --style technical-diagram \
     --output diagrams/architecture.png
   ```

3. **Or specify backend explicitly**:
   ```bash
   # Use specific backend
   wt:image-generate "Server architecture" \
     --backend gemini \
     --output diagrams/architecture.png
   ```

### Fallback Order
1. **huggingface** - Primary (highest quality)
2. **gemini** - Secondary (good quality, aspect ratio limits)
3. **nano_banana** - Last resort (fast, 30+ resolutions)

---

## Workflow 8: Generate with Template Override

**Use Case**: Override skill-level template with project-specific version.

### Prerequisites
- Skill template exists
- Project-specific customization needed

### Steps

1. **Copy skill template to project**:
   ```bash
   mkdir -p .image-templates
   cp plugins/wt/skills/image-generate/assets/templates/cover.tpl.md \
      .image-templates/custom-cover.tpl.md
   ```

2. **Modify project template**:
   ```bash
   # Edit .image-templates/custom-cover.tpl.md
   # Change resolution, style, variables as needed
   ```

3. **Use overridden template**:
   ```bash
   wt:image-generate --template custom-cover \
     --var title="My Custom Cover" \
     --output covers/custom.png
   ```

### Template Resolution
1. `.image-templates/` (project overrides)
2. `assets/templates/` (skill defaults)

---

## Quick Reference

| Task | Command Template |
|------|------------------|
| Cover image | `--template cover --var title="..."` |
| Illustration | `--template illustrator --var concept="..."` |
| Custom resolution | `--resolution WIDTHxHEIGHT` |
| With content | `--content article.md` |
| Custom style | `--style custom --custom-style="..."` |
| Specific backend | `--backend huggingface\|gemini\|nano_banana` |
| List templates | `--list-templates` |
| Debug mode | `--debug` |

## Tips for Best Results

1. **Use templates for consistency** - Pre-defined templates ensure consistent output
2. **Provide content context** - Use `--content` flag for better relevance
3. **Start with default style** - `vibrant` works well for most use cases
4. **Increase steps for quality** - `--steps 50` for higher detail
5. **Use appropriate resolution** - Match resolution to use case (cover vs inline)
6. **Enable debug mode** - Use `--debug` when troubleshooting issues
