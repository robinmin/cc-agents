# Complete Workflow Example

A comprehensive end-to-end demonstration of the 7-Stage Technical Content Workflow.

## Overview

This example demonstrates the complete workflow for creating technical content using the Technical Content Creation system. Each stage is fully populated with sample content showing how the system progresses from raw materials through multi-platform publishing.

## The 7-Stage Workflow

```
Stage 0: Materials     (0-materials/)  - Extract and verify source materials
Stage 1: Research      (1-research/)   - Conduct systematic research
Stage 2: Outline       (2-outline/)    - Generate structured content outlines (MULTI-OPTION)
Stage 3: Draft         (3-draft/)      - Write content with consistent style
Stage 4: Illustration  (4-illustration/) - Generate AI images for content
Stage 5: Adaptation    (5-adaptation/) - Adapt for different platforms
Stage 6: Publish       (6-publish/)    - Publish to blogs and social media
```

## Topic: "Effective Code Documentation"

This example walks through creating a comprehensive article about code documentation best practices. The article covers:

- Why documentation matters
- Core principles of good documentation
- Tools and techniques
- Measuring documentation quality
- Building a documentation culture

## Stage-by-Stage Walkthrough

### Stage 0: Materials (`0-materials/`)

**Purpose:** Extract and organize source materials

**Key Files:**
- `source.md` - Original research materials
- `materials-extracted.md` - Processed extraction with frontmatter
- `materials.json` - Materials index

**What happens:**
1. Raw sources are gathered (documentation, blog posts, research papers)
2. Content is extracted and structured with confidence scoring
3. Materials are indexed for reference

**Sample frontmatter:**
```yaml
---
title: Extracted Materials: Code Documentation
source: source.md
source_type: file
extracted_at: 2026-01-30T10:00:00Z
topic: effective-code-documentation
word_count: 1250
confidence: HIGH
---
```

---

### Stage 1: Research (`1-research/`)

**Purpose:** Conduct systematic, evidence-based research

**Key Files:**
- `research-brief.md` - Synthesized research findings
- `sources.json` - Source citations and references

**What happens:**
1. Research materials are analyzed and synthesized
2. Claims are verified with confidence scoring
3. Sources are properly cited

**Sample frontmatter:**
```yaml
---
title: Research Brief: Code Documentation
source_materials: 0-materials/materials-extracted.md
research_type: systematic
time_range: 2024-2026
topics:
  - documentation
  - developer-experience
  - technical-writing
created_at: 2026-01-30T10:00:00Z
status: approved
confidence: HIGH
sources_count: 8
---
```

---

### Stage 2: Outline (`2-outline/`)

**Purpose:** Generate structured content outlines (MULTI-OPTION)

**Key Files:**
- `outline-option-a.md` - Traditional/Structured approach
- `outline-option-b.md` - Narrative/Story-driven approach
- `outline-option-c.md` - Technical/Deep-dive approach
- `outline-approved.md` - User-selected outline
- `materials/prompts-used.md` - Prompts used for generation
- `materials/generation-params.json` - Generation parameters

**What happens:**
1. Research brief is analyzed
2. **2-3 alternative outlines are generated in parallel**, each with a different style:
   - **Option A (Traditional)**: Hierarchical, logical structure with clear sections
   - **Option B (Narrative)**: Engaging flow with real-world examples
   - **Option C (Technical)**: Comprehensive, detailed with code examples
3. User reviews and selects the best option
4. Selected option is copied to `outline-approved.md`

**Multi-Option Selection Process:**

```bash
# Generate 3 outline options
python3 scripts/outline-generator.py --options 3 --length long --interactive

# System generates:
# - 2-outline/outline-option-a.md (Traditional/Structured)
# - 2-outline/outline-option-b.md (Narrative/Story-driven)
# - 2-outline/outline-option-c.md (Technical/Deep-dive)

# User reviews options and selects:
# Option A: Professional documentation guide
# Option B: Journey through documentation challenges
# Option C: Comprehensive technical reference

# User selects Option B (Narrative approach)
python3 scripts/outline-generator.py --approve b

# Selected outline is copied to:
# - 2-outline/outline-approved.md
```

**Sample outline frontmatter (Option A - Traditional):**
```yaml
---
title: Outline Option A - Traditional/Structured
source_research: 1-research/research-brief.md
option: a
style: traditional-structured
created_at: 2026-01-30T10:00:00Z
status: draft
confidence: HIGH
---

# Outline Option A: Traditional/Structured Approach

## 1. Introduction
   - What is code documentation?
   - Why it matters
   - Overview of the guide

## 2. Core Principles
   - Clarity and conciseness
   - Audience awareness
   - Maintainability

## 3. Documentation Types
   - API documentation
   - Inline comments
   - README files
   - Architecture docs

## 4. Tools and Techniques
   - Documentation generators
   - Markdown and static sites
   - Diagrams and visuals

## 5. Best Practices
   - Write as you code
   - Keep it current
   - Review and iterate

## 6. Measuring Quality
   - Coverage metrics
   - Readability scores
   - User feedback

## 7. Building Culture
   - Documentation standards
   - Team training
   - Continuous improvement

## 8. Conclusion
   - Key takeaways
   - Next steps
   - Resources
```

**Sample outline frontmatter (Option B - Narrative):**
```yaml
---
title: Outline Option B - Narrative/Story-driven
source_research: 1-research/research-brief.md
option: b
style: narrative-story-driven
created_at: 2026-01-30T10:00:00Z
status: draft
confidence: HIGH
---

# Outline Option B: Narrative/Story-driven Approach

## 1. The Documentation Crisis
   - A tale of undocumented code
   - The cost of poor documentation
   - Why we're here

## 2. A New Mindset
   - Documentation as code
   - The reader's journey
   - Empathy-driven documentation

## 3. The Documentation Spectrum
   - Comments vs. docs
   - When to document what
   - Finding the balance

## 4. Real-World Examples
   - Good documentation patterns
   - Lessons from open source
   - Industry case studies

## 5. The Documentation Toolkit
   - Choosing the right tools
   - Automation and workflows
   - Measuring success

## 6. Building a Documentation Culture
   - Leading by example
   - Team practices
   - Continuous improvement

## 7. The Future of Documentation
   - AI-assisted documentation
   - Interactive docs
   - Emerging trends

## 8. Your Documentation Journey
   - Starting points
   - Action items
   - Resources for growth
```

**Sample outline frontmatter (Option C - Technical):**
```yaml
---
title: Outline Option C - Technical/Deep-dive
source_research: 1-research/research-brief.md
option: c
style: technical-deep-dive
created_at: 2026-01-30T10:00:00Z
status: draft
confidence: HIGH
---

# Outline Option C: Technical/Deep-dive Approach

## 1. Introduction
   - Documentation taxonomy
   - Standards and specifications
   - The documentation development lifecycle

## 2. Documentation Architecture
   - Documentation as code (DaC)
   - Static site generators
   - Version control strategies
   - CI/CD integration

## 3. API Documentation Standards
   - OpenAPI/Swagger
   - AsyncAPI
   - JSDoc, Javadoc, Docstrings
   - Type-driven documentation

## 4. Inline Documentation
   - Comment patterns
   - Self-documenting code
   - Literate programming
   - Design by contract

## 5. Documentation Tools
   - Generators: Sphinx, MkDocs, Docusaurus
   - Diagrams: Mermaid, PlantUML, Graphviz
   - API docs: Swagger UI, Redoc
   - Testing documentation

## 6. Measurement and Metrics
   - Coverage analysis
   - Readability indices
   - Documentation debt
   - Quality assessment

## 7. Advanced Topics
   - Internationalization (i18n)
   - Accessibility (a11y)
   - Documentation testing
   - Automated updates

## 8. Implementation Guide
   - Setting up workflows
   - Team onboarding
   - Maintenance strategies
   - Tool selection matrix
```

---

### Stage 3: Draft (`3-draft/`)

**Purpose:** Write full article using style profiles

**Key Files:**
- `draft-article.md` - Full article draft
- `draft-revisions/` - Revision history

**What happens:**
1. Approved outline is expanded into full content
2. Style profiles (technical-writer, concise-narrative, etc.) guide tone
3. Drafts can be revised and improved

**Sample frontmatter:**
```yaml
---
title: Draft: Effective Code Documentation
style_profile: technical-writer
source_outline: 2-outline/outline-approved.md
topic: Effective Code Documentation
version: 1
created_at: 2026-01-30T10:00:00Z
updated_at: 2026-01-30T11:30:00Z
status: approved
style_notes:
  - tone: professional yet approachable
  - vocabulary: technical but accessible
  - structure: narrative-driven with examples
  - length: medium (1500-2000 words)
---
```

---

### Stage 4: Illustration (`4-illustration/`)

**Purpose:** Generate AI images for content

**Key Files:**
- `cover.png` - Article cover image (cinematic 2.35:1 ratio)
- `images/` - Inline illustrations
- `captions.json` - Image metadata and captions
- `context-cover.json` - Content analysis for cover generation
- `context-illustration.json` - Positions for inline illustrations

**What happens:**
1. Article content is analyzed for illustration opportunities
2. **Cover image** is generated using `wt:image-cover` skill:
   - Auto-detects article tone and style
   - Generates cinematic 2.35:1 cover
   - Optional text overlay with title
3. **Inline illustrations** are generated using `wt:image-illustrator` skill:
   - Analyzes content for illustration positions
   - Identifies: abstract concepts, information-dense sections, emotional transitions
   - Generates context-aware images
4. All images are indexed in `captions.json`

**Sample captions.json:**
```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-30T12:00:00Z",
  "article": "3-draft/draft-article.md",
  "cover": {
    "file": "cover.png",
    "prompt": "Professional code documentation workspace with clean interface, showing code alongside documentation, modern tech aesthetic",
    "style": "technical",
    "aspect_ratio": "2.35:1",
    "dimensions": "1920x817"
  },
  "images": [
    {
      "id": "img-001",
      "position": "line 45",
      "section": "The Documentation Crisis",
      "type": "abstract_concept",
      "prompt": "Conceptual illustration showing the gap between code and documentation, visual metaphor for technical debt",
      "file": "images/documentation-gap.png",
      "alt_text": "Visual representation of the documentation gap in software development",
      "created_at": "2026-01-30T12:00:00Z"
    },
    {
      "id": "img-002",
      "position": "line 120",
      "section": "Documentation Tools",
      "type": "information_dense",
      "prompt": "Infographic showing documentation tool categories and their relationships, clean technical diagram style",
      "file": "images/tools-landscape.png",
      "alt_text": "Documentation tools landscape diagram showing tool categories",
      "created_at": "2026-01-30T12:00:00Z"
    },
    {
      "id": "img-003",
      "position": "line 180",
      "section": "Building Culture",
      "type": "emotional_transition",
      "prompt": "Team collaboration around documentation, positive workplace culture, diverse team working together",
      "file": "images/doc-culture.png",
      "alt_text": "Illustration of team collaboration on documentation practices",
      "created_at": "2026-01-30T12:00:00Z"
    }
  ]
}
```

**Image Skills Used:**
- `wt:image-cover` - Cinematic cover generation with content analysis
- `wt:image-illustrator` - Context-aware inline illustration generation
- `wt:image-generate` - Custom image generation for specific needs

---

### Stage 5: Adaptation (`5-adaptation/`)

**Purpose:** Adapt content for different platforms (image-aware)

**Key Files:**
- `article-twitter.md` - Twitter thread adaptation
- `article-linkedin.md` - LinkedIn article adaptation
- `article-devto.md` - Dev.to article adaptation

**What happens:**
1. Full article is adapted for platform-specific formats
2. **Image-aware adaptations** include:
   - Image references for platform-specific display
   - Alt text for accessibility
   - Optimized image placement
3. Character limits and style conventions are applied

**Sample Twitter adaptation:**
```yaml
---
title: Adaptation: Twitter - Effective Code Documentation
source_draft: 3-draft/draft-article.md
platform: twitter
adapted_at: 2026-01-30T10:00:00Z
character_count: 720
thread_length: 5
includes_images: true
images:
  - cover.png
  - images/doc-culture.png
---

# Effective Code Documentation Thread

1/5 Why code documentation matters:

Poor documentation costs teams time, money, and sanity. A study found developers spend 30% of time searching for code context instead of building features.

2/5 The core principles:

- Clarity over cleverness
- Write for your future self
- Document decisions, not just code
- Keep it current

The best documentation is written alongside code, not as an afterthought.

3/5 Tools that help:

- Static site generators (MkDocs, Docusaurus)
- API docs (Swagger, OpenAPI)
- Diagrams (Mermaid, PlantUML)
- Doc testing tools

[Image: Documentation tools landscape]

4/5 Building a culture:

- Lead by example
- Make documentation part of code review
- Celebrate good docs
- Treat docs as code

5/5 Key takeaway:

Good documentation isn't extra work—it's part of building good software.

Start small: Document your next function before you write the code.

#Documentation #DevTools #SoftwareEngineering
```

**Sample LinkedIn adaptation:**
```yaml
---
title: Adaptation: LinkedIn - Effective Code Documentation
source_draft: 3-draft/draft-article.md
platform: linkedin
adapted_at: 2026-01-30T10:00:00Z
format: professional-article
includes_images: true
featured_image: cover.png
---

# Effective Code Documentation: A Developer's Guide

We've all been there—staring at undocumented code, trying to understand what it does and why. Poor documentation is one of the biggest sources of technical debt in software development.

[Featured Image: Professional cover image]

## The Cost of Poor Documentation

Studies show developers spend up to 30% of their time searching for code context instead of building features. That's a massive productivity drain that good documentation can prevent.

## Core Principles

1. **Clarity Over Cleverness**: Write documentation that anyone on your team can understand

2. **Document Decisions**: Explain *why* code exists, not just *what* it does

3. **Keep It Current**: Documentation that's outdated is worse than no documentation

## Building a Documentation Culture

The best teams treat documentation as code—versioned, reviewed, and tested. They make documentation part of their definition of "done."

[Image: Team collaborating on documentation]

## Your Next Step

Start small. Document your next function or API endpoint before you write the code. It's a habit that pays dividends immediately.

What documentation practices have worked for your team? Share in the comments.

#SoftwareDevelopment #Documentation #DeveloperTools #Engineering
```

---

### Stage 6: Publish (`6-publish/`)

**Purpose:** Finalize and publish content

**Key Files:**
- `article.md` - Final published article
- `publish-log.json` - Publication history

**What happens:**
1. Final version is prepared for publication
2. Publication is logged with metadata
3. Cross-platform publishing is tracked

**Sample publish-log.json:**
```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-30T10:00:00Z",
  "topic": "effective-code-documentation",
  "publications": [
    {
      "id": "pub-001",
      "platform": "blog",
      "url": "https://example.com/blog/effective-code-documentation",
      "published_at": "2026-01-30T10:00:00Z",
      "status": "published",
      "version": "1.0.0",
      "word_count": 1850,
      "images_included": true,
      "notes": "Initial publication with cover image and 3 inline illustrations"
    }
  ],
  "adaptations": [
    {
      "platform": "twitter",
      "file": "5-adaptation/article-twitter.md",
      "published_at": "2026-01-30T11:00:00Z",
      "status": "published",
      "thread_length": 5
    },
    {
      "platform": "linkedin",
      "file": "5-adaptation/article-linkedin.md",
      "published_at": "2026-01-30T12:00:00Z",
      "status": "published"
    },
    {
      "platform": "devto",
      "file": "5-adaptation/article-devto.md",
      "published_at": "2026-01-30T12:30:00Z",
      "status": "published"
    }
  ]
}
```

---

## Key Features Demonstrated

### 1. Multi-Option Outline Generation

The Stage 2 folder demonstrates the **multi-option outline feature**:
- Three distinct outline options with different styles
- User selection workflow
- Prompts and generation parameters saved for reproducibility

### 2. Image-Aware Workflow

Stage 4 demonstrates **full image integration**:
- Cover image generation with content analysis
- Inline illustration generation with position detection
- captions.json for image metadata and accessibility

### 3. Cross-Platform Publishing

Stages 5-6 demonstrate **multi-platform adaptation**:
- Platform-specific formatting (Twitter, LinkedIn, Dev.to)
- Image-aware adaptations
- Comprehensive publish logging

---

## File Structure

```
examples/complete-workflow/
├── README.md                    # This file
├── 0-topic-init/
│   └── topic.md                 # Topic metadata
├── 0-materials/
│   ├── source.md                # Original materials
│   ├── materials-extracted.md   # Processed extraction
│   └── materials.json           # Materials index
├── 1-research/
│   ├── research-brief.md        # Synthesized research
│   └── sources.json             # Source citations
├── 2-outline/
│   ├── outline-option-a.md      # Traditional/Structured
│   ├── outline-option-b.md      # Narrative/Story-driven
│   ├── outline-option-c.md      # Technical/Deep-dive
│   ├── outline-approved.md      # User-selected (Option B)
│   └── materials/
│       ├── prompts-used.md      # Generation prompts
│       └── generation-params.json # Generation parameters
├── 3-draft/
│   ├── draft-article.md         # Full article draft
│   └── draft-revisions/
│       └── revision-001.md      # Revision history
├── 4-illustration/
│   ├── cover.png                # Cinematic cover image
│   ├── context-cover.json       # Cover generation context
│   ├── context-illustration.json # Illustration positions
│   ├── images/
│   │   ├── documentation-gap.png
│   │   ├── tools-landscape.png
│   │   └── doc-culture.png
│   └── captions.json            # Image metadata
├── 5-adaptation/
│   ├── article-twitter.md       # Twitter thread
│   ├── article-linkedin.md      # LinkedIn article
│   └── article-devto.md         # Dev.to article
└── 6-publish/
    ├── article.md               # Final published version
    └── publish-log.json         # Publication history
```

---

## Using This Example

### Explore the Workflow

Navigate through each stage folder to see:
1. What files are created at each stage
2. How frontmatter is structured
3. How content progresses through stages
4. How multi-option outlines work
5. How images are integrated

### Reference for Your Own Content

Use these files as templates:
- Copy frontmatter structures
- Adapt content patterns
- Follow naming conventions
- Model multi-option outline generation

### Testing and Validation

The test suite (`tests/test-workflow.sh`) uses this structure to verify:
- Stage folder creation
- File frontmatter validation
- Multi-option outline workflow
- Image integration compatibility
- Cross-platform adaptation

---

## Next Steps

1. **Try it yourself**: Create a new topic using the scripts
2. **Customize stages**: Adapt the workflow for your content
3. **Extend the system**: Add new platforms, tools, or stages
4. **Contribute**: Improve the examples and documentation

---

**Version**: 1.0.0
**Last Updated**: 2026-01-30
**Topic**: Effective Code Documentation
**Workflow Version**: 7-Stage Technical Content Workflow v1.0
