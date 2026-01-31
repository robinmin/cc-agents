# Technical Content Creation Workflows

Step-by-step workflow examples for common content creation scenarios.

## Workflow 1: Complete End-to-End Workflow

**Use Case**: Create a comprehensive technical article from scratch with full research, illustrations, and multi-platform publishing.

**Prerequisites**:
- Topic idea or research materials
- Target collection folder
- Git repository for publishing (optional)

**Steps**:

```bash
# Step 1: Initialize topic structure
wt:topic-init --collection "Technical Tutorials" \
  --name "microservices-guide" \
  --title "Microservices Architecture Patterns" \
  --description "Comprehensive guide to microservices design patterns"

# Step 2: Extract materials (Stage 0)
# From file
Extract materials from /path/to/source.pdf focusing on architecture aspects --save

# From URL
Extract materials from https://example.com/article focusing on architecture aspects --save

# From description
Extract materials on "microservices architecture patterns" focusing on architecture aspects --save

# Step 3: Conduct research (Stage 1)
Perform systematic research on extracted materials

# Step 4: Generate outline (Stage 2)
Generate long-form outline options from research brief

# Select option when prompted: A, B, or C
# Option A: Traditional/Structured
# Option B: Narrative/Story-driven
# Option C: Technical/Deep-dive

# Step 5: Write draft (Stage 3)
Write draft using technical-writer style profile based on approved outline

# Step 6: Generate illustrations (Stage 4)
# Generate article cover
wt:image-cover --article 3-draft/draft-article.md \
  --output 4-illustration/cover.png

# Generate inline illustrations
wt:image-illustrator --article 3-draft/draft-article.md \
  --image-dir 4-illustration/images/ --min-positions 3

# Step 7: Adapt for platforms (Stage 5)
Adapt draft article for blog, Twitter, and LinkedIn platforms

# Step 8: Publish (Stage 6)
# Publish to blog (dry-run first)
Publish article.md to blog with dry-run mode

# Then publish for real
Publish article.md to blog

# Publish to social platforms
Publish article-twitter.md to twitter
Publish article-linkedin.md to linkedin
```

**Expected Output**:
- Complete article with research-backed content
- Professional cover image and inline illustrations
- Platform-specific adaptations (blog, Twitter, LinkedIn)
- Git commits with publish log
- All 7 stage folders populated with artifacts

---

## Workflow 2: Quick Blog Post (Skip Illustrations)

**Use Case**: Fast blog post creation without image generation. Focus on content quality over visual elements.

**Prerequisites**:
- Blog topic idea
- Basic research materials (optional)
- ~30 minutes for full workflow

**Steps**:

```bash
# Step 1: Initialize topic structure
wt:topic-init --collection "Blog Posts" \
  --name "async-js-tips" \
  --title "5 Async JavaScript Tips"

# Step 2: Extract materials (quick)
Extract materials on "async JavaScript patterns" focusing on examples --save

# Step 3: Conduct rapid research
Perform rapid research on extracted materials

# Step 4: Generate short outline
Generate short-form outline options from research brief

# Step 5: Write draft with blog style
Write draft using blogger style profile based on approved outline

# Step 6: Skip illustration stage (go directly to adaptation)
Adapt draft article for blog platform

# Step 7: Publish directly
Publish article.md to blog
```

**Expected Output**:
- Concise blog post (3-5 sections)
- Research-backed content
- Blog platform format
- No illustrations (Stage 4 skipped)
- Total time: ~30 minutes

---

## Workflow 3: Research-Heavy Article (Systematic Review)

**Use Case**: Academic-style article with comprehensive research, evidence quality assessment, and systematic review.

**Prerequisites**:
- Well-defined research question
- Access to academic sources
- ~2 hours for comprehensive research

**Steps**:

```bash
# Step 1: Initialize topic structure
wt:topic-init --collection "Research Reviews" \
  --name "llm-security-analysis" \
  --title "LLM Security: A Systematic Review"

# Step 2: Extract materials from multiple sources
Extract materials from https://arxiv.org/abs/2401.12345 focusing on security
Extract materials from https://example.com/paper2 focusing on security
Extract materials from /path/to/local-doc.pdf focusing on security

# Step 3: Conduct systematic research (PRISMA-compliant)
Perform systematic research on extracted materials with sources 20-50

# Step 4: Generate long-form technical outline
Generate long-form outline options from research brief

# Select Option C (Technical/Deep-dive) for research articles

# Step 5: Write draft with academic style
Write draft using academic-writer style profile based on approved outline

# Step 6: Add illustrations (diagrams for complex concepts)
wt:image-cover --article 3-draft/draft-article.md \
  --style technical --output 4-illustration/cover.png

wt:image-generate "LLM threat architecture diagram" \
  --style technical-diagram --resolution 1920x1080 \
  --output 4-illustration/images/threat-model.png

# Step 7: Adapt for academic platforms
Adapt draft article for medium platform

# Step 8: Publish with attribution
Publish article-medium.md to medium
```

**Expected Output**:
- Long-form academic article (8+ sections)
- HIGH confidence sources with GRADE assessment
- Technical diagrams for complex concepts
- Academic-style references and citations
- Systematic research methodology documented

---

## Workflow 4: Tutorial with Code Examples

**Use Case**: Technical tutorial with code examples, syntax highlighting, and step-by-step instructions.

**Prerequisites**:
- Programming topic or framework
- Working code examples
- Target audience (beginner/intermediate/advanced)

**Steps**:

```bash
# Step 1: Initialize topic structure
wt:topic-init --collection "Tutorials" \
  --name "rust-basics" \
  --title "Rust Basics: Ownership and Borrowing"

# Step 2: Extract materials with code focus
Extract materials from /path/to/rust-docs focusing on examples --save

# Step 3: Conduct research with code examples
Perform rapid research on extracted materials

# Step 4: Generate tutorial-style outline
Generate short-form outline options from research brief

# Select Option A (Traditional/Structured) for tutorials

# Step 5: Write draft with tutorial style
Write draft using tutorial-writer style profile based on approved outline

# Step 6: Add visual diagrams for concepts
wt:image-illustrator --article 3-draft/draft-article.md \
  --style technical-diagram --min-positions 5

# Step 7: Adapt for Dev.to (code-friendly)
Adapt draft article for devto platform

# Step 8: Publish to Dev.to
Publish article-devto.md to devto
```

**Expected Output**:
- Tutorial with clear step-by-step instructions
- Code blocks with syntax highlighting
- Visual diagrams explaining concepts
- Dev.to format with tags and frontmatter
- Runnable code examples

---

## Workflow 5: Opinion Piece (Narrative Outline)

**Use Case**: Thought leadership article with personal insights, storytelling approach, and engaging narrative.

**Prerequisites**:
- Clear opinion or thesis statement
- Personal experience or expertise
- Target audience (industry peers, developers)

**Steps**:

```bash
# Step 1: Initialize topic structure
wt:topic-init --collection "Opinion" \
  --name "future-of-coding" \
  --title "Why AI Won't Replace Developers (Yet)"

# Step 2: Extract materials (light research)
Extract materials on "AI coding assistants 2024" focusing on trends --save

# Step 3: Conduct fact-checking research
Perform fact-check research on extracted materials

# Step 4: Generate narrative outline
Generate long-form outline options from research brief

# Select Option B (Narrative/Story-driven) for opinion pieces

# Step 5: Write draft with opinion style
Write draft using opinion-writer style profile based on approved outline

# Step 6: Add engaging cover image
wt:image-cover --article 3-draft/draft-article.md \
  --style blog --output 4-illustration/cover.png

# Step 7: Adapt for LinkedIn (professional audience)
Adapt draft article for linkedin platform

# Step 8: Publish to LinkedIn and blog
Publish article-linkedin.md to linkedin
Publish article.md to blog
```

**Expected Output**:
- Engaging narrative-style article
- Personal insights and experience
- Story-driven structure
- Professional LinkedIn format
- Blog post for broader audience

---

## Workflow 6: Multi-Platform Publishing

**Use Case**: Maximize content reach by publishing to multiple platforms with platform-specific adaptations.

**Prerequisites**:
- Completed article draft
- Target platforms identified
- Platform-specific accounts configured

**Steps**:

```bash
# Assuming Stage 0-3 completed, start from Stage 4

# Step 1: Generate illustrations
wt:image-cover --article 3-draft/draft-article.md \
  --output 4-illustration/cover.png

wt:image-illustrator --article 3-draft/draft-article.md \
  --image-dir 4-illustration/images/ --min-positions 3

# Step 2: Adapt for all platforms
Adapt draft article for blog, twitter, linkedin, devto platforms

# Step 3: Review platform-specific outputs
# Check image handling in each adaptation
cat 5-adaptation/article-blog.md      # Full article with all images
cat 5-adaptation/article-twitter.md   # Thread format, no images
cat 5-adaptation/article-linkedin.md  # Professional format, key images
cat 5-adaptation/article-devto.md     # Code-friendly, all images

# Step 4: Publish to all platforms
Publish article-blog.md to blog
Publish article-twitter.md to twitter
Publish article-linkedin.md to linkedin
Publish article-devto.md to devto

# Step 5: Verify publish log
cat 6-publish/publish-log.json
```

**Expected Output**:
- 4+ platform-specific adaptations
- Cover image included where appropriate
- Inline images handled per platform
- Publish log tracking all publications
- Consistent messaging across platforms

---

## Workflow 7: Revision Workflow (Iterate on Existing Draft)

**Use Case**: Improve an existing draft with new research, revised outline, or updated content.

**Prerequisites**:
- Existing draft with approved outline
- New materials or feedback to incorporate
- Clear revision goals

**Steps**:

```bash
# Step 1: Add new materials
Extract materials from /path/to/new-source.pdf focusing on updates --save

# Step 2: Update research with new findings
Perform rapid research on materials-extracted.md

# Step 3: Generate revised outline options
Generate long-form outline options from research brief

# Step 4: Select revised outline
# When prompted, select the best revised option

# Step 5: Write revision based on approved outline
Write revision-001 using technical-writer style profile based on approved outline

# Step 6: Update illustrations if content changed significantly
wt:image-illustrator --article 3-draft/draft-revisions/revision-001.md \
  --image-dir 4-illustration/images/ --min-positions 3

# Step 7: Adapt and publish revision
Adapt revision-001 for blog platform
Publish article.md to blog
```

**Expected Output**:
- Revision saved in `3-draft/draft-revisions/`
- Comparison with original draft
- Updated research brief
- Improved content based on new materials

---

## Workflow 8: Batch Content Creation

**Use Case**: Create multiple related articles efficiently by reusing research and materials across topics.

**Prerequisites**:
- Broad topic area with multiple subtopics
- Shared research materials
- Content plan with article topics

**Steps**:

```bash
# Step 1: Initialize master topic with comprehensive materials
wt:topic-init --collection "Content Series" \
  --name "rust-series" \
  --title "Rust Programming Series"

# Step 2: Extract comprehensive materials
Extract materials on "Rust programming language 2024" focusing on all --save

# Step 3: Conduct systematic research (reuse for all articles)
Perform systematic research on extracted materials

# Step 4: Create subtopics for each article
# For each article in the series:

# Article 1: Rust Basics
wt:topic-init --collection "Content Series" \
  --name "rust-basics" --parent rust-series \
  --title "Rust Basics: Getting Started"

# Copy master research brief
cp rust-series/1-research/research-brief.md rust-basics/1-research/

# Generate article-specific outline
Generate short-form outline options from research brief

# Write article-specific draft
Write draft using tutorial-writer style profile

# Article 2: Rust Ownership
wt:topic-init --collection "Content Series" \
  --name "rust-ownership" --parent rust-series \
  --title "Rust Ownership Deep Dive"

# Reuse research, generate specific outline and draft
# [Repeat process]

# Step 5: Add series-wide branding (consistent cover style)
for topic in rust-basics rust-ownership rust-async; do
  wt:image-cover --article $topic/3-draft/draft-article.md \
    --style technical --output $topic/4-illustration/cover.png
done

# Step 6: Publish all articles to blog
for topic in rust-basics rust-ownership rust-async; do
  Adapt draft article for blog platform --topic $topic
  Publish article.md to blog --topic $topic
done
```

**Expected Output**:
- Multiple related articles with consistent quality
- Reused research materials (efficient)
- Series-wide branding and style
- Cross-linked articles
- Complete content series published

---

## Workflow 9: Image-Heavy Technical Documentation

**Use Case**: Technical documentation with extensive illustrations, diagrams, and visual aids.

**Prerequisites**:
- Complex technical topic
- Need for multiple visual explanations
- Clear diagram requirements

**Steps**:

```bash
# Step 1: Initialize topic
wt:topic-init --collection "Documentation" \
  --name "kubernetes-networking" \
  --title "Kubernetes Networking: Complete Guide"

# Step 2-5: Standard workflow through Stage 3
# (Extract materials, research, outline, draft)

# Step 6: Extensive illustration generation
# Generate cover
wt:image-cover --article 3-draft/draft-article.md \
  --style technical --output 4-illustration/cover.png

# Generate many inline illustrations (8-12 positions)
wt:image-illustrator --article 3-draft/draft-article.md \
  --image-dir 4-illustration/images/ --min-positions 8

# Generate custom diagrams for specific concepts
wt:image-generate "Kubernetes pod network architecture" \
  --style technical-diagram --resolution 1920x1080 \
  --output 4-illustration/images/pod-networking.png

wt:image-generate "Service mesh data flow" \
  --style technical-diagram --resolution 1920x1080 \
  --output 4-illustration/images/service-mesh.png

wt:image-generate "Ingress controller request flow" \
  --style technical-diagram --resolution 1920x1080 \
  --output 4-illustration/images/ingress-flow.png

# Step 7: Adapt with full image support
Adapt draft article for blog platform

# Step 8: Publish with comprehensive image set
Publish article.md to blog
```

**Expected Output**:
- Comprehensive technical documentation
- 10+ visual illustrations and diagrams
- captions.json with all image metadata
- Complex concepts explained visually
- Professional documentation quality

---

## Workflow 10: Social-First Content (Thread to Article)

**Use Case**: Start with social media engagement (Twitter thread), then expand to full article.

**Prerequisites**:
- Tweet idea or thread concept
- Goal to expand to full article later
- Social media presence

**Steps**:

```bash
# Step 1: Initialize topic for thread
wt:topic-init --collection "Social First" \
  --name "api-design-tips" \
  --title "API Design Tips"

# Step 2: Extract materials (light)
Extract materials on "REST API design best practices" --save

# Step 3: Quick research
Perform rapid research on extracted materials

# Step 4: Generate short outline for thread
Generate short-form outline options from research brief

# Step 5: Write Twitter thread draft
Write draft using thread-writer style profile based on approved outline

# Step 6: Adapt for Twitter (thread format)
Adapt draft article for twitter platform

# Step 7: Publish to Twitter first (test engagement)
Publish article-twitter.md to twitter

# Step 8: After engagement, expand to full article
# Generate long-form outline
Write draft using technical-writer style profile

# Add illustrations
wt:image-cover --article 3-draft/draft-article.md \
  --output 4-illustration/cover.png

# Publish full article to blog
Publish article.md to blog

# Step 9: Reply to thread with link to full article
```

**Expected Output**:
- Engaging Twitter thread (5-10 tweets)
- Full article expanding on thread concepts
- Cross-promotion between platforms
- Audience engagement data informs article

---

## Quick Reference Command Summary

| Stage | Core Commands | Purpose |
|-------|--------------|---------|
| 0 | `Extract materials from {source} focusing on {aspect} --save` | Gather source materials |
| 1 | `Perform {research_type} research on extracted materials` | Conduct research |
| 2 | `Generate {length}-form outline options from research brief` | Create outline options |
| 3 | `Write draft using {style} style profile based on approved outline` | Generate content |
| 4 | `wt:image-cover`, `wt:image-illustrator`, `wt:image-generate` | Create illustrations |
| 5 | `Adapt draft article for {platforms} platforms` | Platform adaptations |
| 6 | `Publish {article} to {platform}` | Publish content |

## Research Type Options

| Type | Duration | Sources | Best For |
|------|----------|---------|----------|
| systematic | 10-15 min | 20-50 | Comprehensive articles |
| rapid | 5-8 min | 10-20 | Quick blog posts |
| meta-analysis | 15-20 min | 15-40 | Research reviews |
| fact-check | 3-5 min | 5-15 | Opinion pieces |

## Outline Length Options

| Length | Sections | Best For |
|--------|----------|----------|
| short | 3-5 | Blog posts, tutorials, threads |
| long | 8+ | Comprehensive guides, documentation |

## Style Profile Examples

| Profile | Tone | Best For |
|---------|-------|----------|
| technical-writer | Formal, precise | Technical documentation |
| blogger | Engaging, conversational | Blog posts |
| academic-writer | Scholarly, cited | Research articles |
| tutorial-writer | Instructional, step-by-step | Tutorials |
| opinion-writer | Personal, narrative | Opinion pieces |
| thread-writer | Concise, punchy | Twitter threads |
