# Stage Details Reference

## Stage 0: Materials Extraction

### Input Types
| Type  | Example                          | Processing                        |
|-------|----------------------------------|-----------------------------------|
| File  | `path/to/document.pdf`           | Convert to markdown, extract      |
| URL   | `https://example.com/article`    | Fetch and convert                 |
| Desc  | `"React Server Components"`      | Search and synthesize             |

### Aspect Filtering
- `architecture` - System design, components, patterns
- `performance` - Benchmarks, optimization, bottlenecks
- `security` - Vulnerabilities, best practices, auth
- `examples` - Code examples, usage patterns
- `API` - Endpoints, parameters, responses
- `configuration` - Setup, options, environment

## Stage 1: Research

### Research Types
| Type          | Description                    | Duration    | Sources  |
|---------------|-------------------------------|-------------|----------|
| `systematic`  | PRISMA-compliant review       | ~10-15 min  | 20-50    |
| `rapid`       | Accelerated key sources       | ~5-8 min    | 10-20    |
| `meta-analysis`| Statistical synthesis         | ~15-20 min  | 15-40    |
| `fact-check`  | Single claim verification     | ~3-5 min    | 5-15     |

### Evidence Quality (GRADE)
| Quality    | Criteria                           | Examples                          |
|------------|------------------------------------|-----------------------------------|
| HIGH       | RCTs, systematic reviews          | Multi-center RCTs, Cochrane       |
| MODERATE   | Consistent observational           | Cohort studies, case-control      |
| LOW        | Small samples, high bias           | Pilot studies, retrospective      |
| VERY LOW   | Expert opinion                     | Editorials, commentaries          |

## Stage 2: Outline Generation

### Outline Lengths
| Length  | Sections | Use Case                          |
|---------|----------|-----------------------------------|
| `short` | 3-5      | Blog posts, quick tutorials       |
| `long`  | 8+       | Long-form articles, guides        |

### Outline Options (Multi-Option Generation)

**Default: Generate 2-3 outline options in parallel, user selects one to become approved**

| Option | Style/Approach      | Description                          |
|--------|---------------------|--------------------------------------|
| A      | Traditional/Structured | Hierarchical, logical progression   |
| B      | Narrative/Story-driven | Storytelling, engaging flow         |
| C      | Technical/Deep-dive   | Comprehensive, detail-oriented      |

### Short Form Structure
1. Introduction
2. Main Content (2-3 sections)
3. Conclusion

### Long Form Structure
1. Introduction (hook, context, thesis)
2. Background (historical, current)
3. Core Topic 1
4. Core Topic 2
5. Core Topic 3
6. Best Practices
7. Common Pitfalls
8. Conclusion (summary, future)

### Output Files
- `outline-option-a.md` - Option A (Traditional/Structured)
- `outline-option-b.md` - Option B (Narrative/Story-driven)
- `outline-option-c.md` - Option C (Technical/Deep-dive)
- `outline-approved.md` - User-selected approved outline
- `materials/prompts-used.md` - Prompts used for generation (traceability)
- `materials/generation-params.json` - Generation parameters (debugging)

## Stage 4: Illustration

### Image Skill Integration

Stage 4 integrates with enhanced image generation skills for comprehensive illustration capabilities:

#### wt:image-cover - Article Cover Generation

Generate cinematic 2.35:1 aspect ratio cover images based on article content analysis.

```bash
# Basic cover generation
wt:image-cover --article 3-draft/draft-article.md --output 4-illustration/cover.png

# With custom style
wt:image-cover --article 3-draft/draft-article.md --style technical --output 4-illustration/cover.png

# With custom resolution
wt:image-cover --article 3-draft/draft-article.md --resolution 1920x817 --output 4-illustration/cover.png

# Without text overlay
wt:image-cover --article 3-draft/draft-article.md --no-text --output 4-illustration/cover.png
```

**Cover Styles:**
| Style | Use Case |
|-------|----------|
| `technical` | Technical articles, diagrams, architecture |
| `blog` | Blog posts, engaging, readable text |
| `tutorial` | Tutorials, step-by-step visual cues |
| `news` | News, professional, headline-focused |
| `custom` | User-specified style |

**Parameters:**
- `--article` - Path to source article (required)
- `--output` - Output path for cover image (required)
- `--style` - Cover style (auto-detected from content if not specified)
- `--resolution` - Resolution (default: 1920x817 for 2.35:1)
- `--no-text` - Exclude title text overlay
- `--cache` - Temporary cache path (optional)

#### wt:image-illustrator - Inline Illustration Generation

Generate context-aware inline illustrations based on article content analysis.

```bash
# Basic inline illustration
wt:image-illustrator --article 3-draft/draft-article.md \
  --image-dir 4-illustration/images/ --min-positions 3

# With custom style
wt:image-illustrator --article 3-draft/draft-article.md \
  --image-dir 4-illustration/images/ --style technical-diagram

# With custom resolution
wt:image-illustrator --article 3-draft/draft-article.md \
  --image-dir 4-illustration/images/ --resolution 1024x768
```

**Illustration Styles:**
| Style | Use Case |
|-------|----------|
| `technical-diagram` | Technical concepts, system architecture |
| `minimalist` | Simple, clean aesthetic |
| `vibrant` | Bold colors, high contrast |
| `sketch` | Hand-drawn, artistic feel |
| `photorealistic` | Realistic images |

**Position Detection Types:**
- **Abstract concepts** - Technical terms, complex ideas needing visual explanation
- **Information-dense sections** - Charts, diagrams for data-heavy content
- **Emotional transitions** - Visual breaks for narrative flow

**Parameters:**
- `--article` - Path to source article (required)
- `--image-dir` - Output directory for images (required)
- `--min-positions` - Minimum number of illustration positions to generate
- `--style` - Illustration style (auto-detected from content if not specified)
- `--resolution` - Resolution (default: 800x600 for inline)
- `--output` - Output article path with image references inserted (optional)
- `--cache` - Temporary cache path (optional)

**Output Files:**
- `captions.json` - Image metadata with alt text, positions, prompts

#### wt:image-generate - Custom Image Generation

Generate custom images for specific needs.

```bash
# Basic image generation
wt:image-generate "Architecture diagram" --style technical-diagram \
  --output 4-illustration/images/architecture.png

# With custom resolution
wt:image-generate "Cloud infrastructure" --resolution 1920x1080 \
  --output 4-illustration/images/cloud.png

# With style modifiers
wt:image-generate "API workflow" --style vibrant \
  --output 4-illustration/images/api-workflow.png
```

**Parameters:**
- `prompt` - Image description (required)
- `--style` - Image style (technical-diagram, minimalist, vibrant, sketch, photorealistic, custom)
- `--resolution` - Resolution (default: 1024x1024)
- `--output` - Output path for image (required)
- `--cache` - Temporary cache path (optional)

### Context File Examples

**context-cover.json** - Cover generation context:
```json
{
  "title": "Microservices Architecture Patterns",
  "themes": ["distributed systems", "scalability", "API design"],
  "tone": "technical",
  "detected_style": "technical"
}
```

**context-illustration.json** - Illustration generation context:
```json
{
  "positions": [
    {
      "line": 45,
      "type": "abstract_concept",
      "description": "Microservices architecture diagram"
    },
    {
      "line": 89,
      "type": "information_dense",
      "description": "API gateway flow chart"
    }
  ]
}
```

### captions.json Format

```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-30T12:00:00Z",
  "article": "3-draft/draft-article.md",
  "images": [
    {
      "id": "img-001",
      "position": "line 45",
      "prompt": "Microservices architecture diagram",
      "file": "images/microservices-architecture.png",
      "alt_text": "Diagram showing microservices architecture with API gateway, services, and database",
      "reason": "abstract_concept",
      "created_at": "2026-01-30T12:00:00Z"
    }
  ]
}
```

### Resolution Options
| Resolution | Aspect Ratio | Use Case                    |
|------------|--------------|-----------------------------|
| 1024x1024  | 1:1          | Social media, square        |
| 1920x1080  | 16:9         | Blog headers, wide images   |
| 800x600    | 4:3          | Inline illustrations        |
| 1280x720   | 16:9         | YouTube thumbnails          |
| 1080x1080  | 1:1          | Instagram, LinkedIn         |
| 1920x817   | 2.35:1       | Article cover images        |

## Stage 5: Adaptation

### Image-Aware Adaptation

Stage 5 adaptations reference and preserve image outputs from Stage 4. When adapting content for different platforms:

1. **Cover Images** - Include `../4-illustration/cover.png` in platform-specific adaptations (relative path from 5-adaptation/ or 6-publish/)
2. **Inline Images** - Adapt image references based on platform requirements (use `../4-illustration/images/` from 5-adaptation/ or 6-publish/)
3. **Image Captions** - Use `captions.json` for accessibility and SEO

**Platform-Specific Image Handling:**

| Platform | Cover Image | Inline Images | Image Handling |
|----------|-------------|---------------|----------------|
| Blog | Include as featured | Embed all images | Full-size with captions |
| Twitter | Omit or attach | Omit (thread only) | Optional attachment |
| LinkedIn | Include as featured | Select key images | Embedded with links |
| Dev.to | Include as cover | Embed all images | Markdown syntax |

**Adaptation Examples:**

```bash
# Adaptation for blog (includes all images)
wt:topic-adapt --source 3-draft/draft-article.md --platform blog \
  --cover ../4-illustration/cover.png --images-dir ../4-illustration/images/

# Adaptation for LinkedIn (includes cover, key inline images)
wt:topic-adapt --source 3-draft/draft-article.md --platform linkedin \
  --cover ../4-illustration/cover.png --max-images 3

# Adaptation for Twitter (no images, thread focus)
wt:topic-adapt --source 3-draft/draft-article.md --platform twitter
```

## Stage 6: Publishing

### Git Workflow
1. Validate file is in git repository
2. Stage file: `git add <file>`
3. Generate commit message
4. Commit: `git commit -m "<message>"`
5. Push: `git push origin <branch>`
6. Update publish-log.json
