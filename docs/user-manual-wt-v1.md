# WT Plugin User Manual v1.0

**Version:** 1.6.3
**Last Updated:** 2026-02-02

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Installation & Setup](#2-installation--setup)
3. [Quick Start Guide](#3-quick-start-guide)
4. [Commands Reference](#4-commands-reference)
5. [Style Profiles](#5-style-profiles)
6. [Configuration](#6-configuration)
7. [Workflows & Examples](#7-workflows--examples)
8. [FAQ](#8-faq)

---

## 1. Introduction

The WT (Writing Tools) plugin is a comprehensive technical content creation system for Claude Code. It helps you create professional articles, blog posts, and documentation through a systematic 7-stage workflow.

### What You Can Do

- Create research-driven technical articles
- Generate AI images for your content
- Extract and apply writing styles
- Translate content across languages
- Adapt content for multiple platforms (blog, Twitter, LinkedIn, Dev.to)
- Conduct systematic research with source verification

### The 7-Stage Workflow

```
Stage 0: Materials     → Gather source materials
Stage 1: Research      → Conduct research
Stage 2: Outline       → Create structured outline (you choose from options)
Stage 3: Draft         → Write the article
Stage 4: Illustration  → Generate AI images
Stage 5: Adaptation    → Adapt for different platforms
Stage 6: Publish       → Prepare for publishing
```

---

## 2. Installation & Setup

### 2.1 Prerequisites

- Claude Code installed and configured
- Basic familiarity with markdown files
- (Optional) MCP servers configured for image generation

### 2.2 Plugin Installation

The WT plugin is typically installed as part of your Claude Code plugins directory:

```
plugins/wt/
```

### 2.3 Initial Configuration

Create the configuration directory:

```bash
mkdir -p ~/.claude/wt/styles
```

The plugin will auto-create configuration files on first use.

### 2.4 Optional: Image Generation Setup

For AI image generation, configure the HuggingFace MCP server in your Claude Code settings:

```json
{
  "mcpServers": {
    "huggingface": {
      "command": "path-to-mcp-server",
      "args": []
    }
  }
}
```

---

## 3. Quick Start Guide

### 3.1 Create Your First Article

The fastest way to create content is using the full workflow:

```bash
/wt:topic-create "Building REST APIs with FastAPI"
```

This will:
1. Extract materials from web sources
2. Conduct research on the topic
3. Generate outline options (you choose one)
4. Write the draft
5. Generate cover image and illustrations
6. Adapt for Twitter, LinkedIn, and blog
7. Prepare for publishing

### 3.2 Create Content with Specific Options

```bash
# Use a specific writing style
/wt:topic-create "Microservices Architecture" --style technical-writer

# Target specific platforms only
/wt:topic-create "Docker Best Practices" --platforms blog,linkedin

# Skip illustrations for faster output
/wt:topic-create "Python Type Hints" --stages 0-3,5-6
```

### 3.3 Generate a Single Stage

```bash
# Just generate an outline
/wt:topic-outline "Your Topic"

# Just write a draft from existing outline
/wt:topic-draft --file 2-outline/outline-approved.md

# Just generate images
/wt:topic-illustrate
```

---

## 4. Commands Reference

### 4.1 Topic Lifecycle Commands

#### `/wt:topic-create`

**Purpose:** Full 7-stage workflow from research to publishing

**Usage:**
```bash
/wt:topic-create "<topic>" [--collection <name>] [--style <profile>] [--stages <range>] [--platforms <list>] [--illustrations <n>]
```

**Examples:**
```bash
/wt:topic-create "Event Sourcing Patterns"
/wt:topic-create "Kubernetes Fundamentals" --collection "DevOps" --style tutorial
/wt:topic-create "Go Concurrency" --platforms blog,linkedin --illustrations 5
```

**Arguments:**
| Argument | Description | Default |
|----------|-------------|---------|
| `<topic>` | Content topic (required) | - |
| `--collection` | Collection name | From config |
| `--style` | Writing style profile | `technical-writer` |
| `--stages` | Stage range (e.g., `0-3`, `2-6`) | All (0-6) |
| `--platforms` | Target platforms | `blog,twitter,linkedin` |
| `--illustrations` | Number of illustrations | Auto |

#### `/wt:topic-init`

**Purpose:** Initialize topic folder structure

**Usage:**
```bash
/wt:topic-init "<topic>" [--collection <name>]
```

**Creates:**
```
<topic>/
├── topic.md
├── 0-materials/
├── 1-research/
├── 2-outline/
├── 3-draft/
├── 4-illustration/
├── 5-adaptation/
└── 6-publish/
```

#### `/wt:topic-outline`

**Purpose:** Generate structured outline (Stage 2)

**Usage:**
```bash
/wt:topic-outline [--file <research-brief>] [--options <n>]
```

**Process:**
1. Reads research brief from Stage 1
2. Generates 2-3 outline options with different styles
3. Presents options for your selection
4. Saves selected option as `outline-approved.md`

**Outline Options:**
- **Option A:** Traditional/Structured (hierarchical, logical)
- **Option B:** Narrative/Story-driven (engaging flow)
- **Option C:** Technical/Deep-dive (comprehensive, detailed)

#### `/wt:topic-draft`

**Purpose:** Write article draft (Stage 3)

**Usage:**
```bash
/wt:topic-draft [--file <outline>] [--style <profile>] [--revise]
```

**Process:**
1. Reads approved outline from Stage 2
2. Applies writing style profile
3. Generates full article draft
4. Offers revision cycle if needed

#### `/wt:topic-illustrate`

**Purpose:** Generate AI images (Stage 4)

**Usage:**
```bash
/wt:topic-illustrate [--cover] [--inline <n>] [--style <style>]
```

**Generates:**
- Cover image (2.35:1 cinematic ratio)
- Inline illustrations (context-aware placement)
- Image captions for accessibility

#### `/wt:topic-adapt`

**Purpose:** Adapt content for platforms (Stage 5)

**Usage:**
```bash
/wt:topic-adapt [--platforms <list>]
```

**Supported Platforms:**
- Blog (full article)
- Twitter (thread format)
- LinkedIn (professional post)
- Dev.to (developer community)

#### `/wt:topic-publish`

**Purpose:** Prepare for publishing (Stage 6)

**Usage:**
```bash
/wt:topic-publish [--dry-run] [--platforms <list>]
```

**Note:** Always runs in dry-run mode first for preview

### 4.2 Research Commands

#### `/wt:info-seek`

**Purpose:** Extract materials from sources (Stage 0)

**Usage:**
```bash
/wt:info-seek <url|file|search> [--aspect <filter>]
```

**Examples:**
```bash
/wt:info-seek https://docs.example.com/api
/wt:info-seek ./research.md
/wt:info-seek "FastAPI async patterns"
```

#### `/wt:info-research`

**Purpose:** Conduct systematic research (Stage 1)

**Usage:**
```bash
/wt:info-research [--type systematic|rapid] [--sources <n>]
```

**Research Types:**
- **systematic:** Comprehensive, 20-50 sources, PICO framework
- **rapid:** Quick, 10-20 sources
- **narrative:** Story-driven synthesis

#### `/wt:info-reve`

**Purpose:** Analyze codebase and generate HLD documents

**Usage:**
```bash
/wt:info-reve <path> [--output <file>]
```

### 4.3 Style Commands

#### `/wt:style-extractor`

**Purpose:** Extract writing style from text files

**Usage:**
```bash
/wt:style-extractor <folder_path>
```

**Process:**
1. Analyzes writing patterns in folder
2. Generates unique style profile ID
3. Saves to `~/.claude/wt/styles/{profile-id}.style.md`
4. Updates style registry

**Minimum Requirements:**
- 3+ files OR 2000+ words total
- Supported formats: `.md`, `.txt`, `.rst`, `.adoc`

**Output Example:**
```
Style profile saved: technical-blogger-casual
Location: ~/.claude/wt/styles/technical-blogger-casual.style.md
Usage: /wt:topic-create "topic" --style technical-blogger-casual
```

#### `/wt:translate`

**Purpose:** Professional multi-lingual translation

**Usage:**
```bash
/wt:translate <file> --to <language>
```

**Supported Languages:**
- English (EN)
- Chinese (ZH)
- Japanese (JA)

### 4.4 Utility Commands

#### Image Generation

```bash
# Generate cover image
/wt:image-cover "Article topic" --style technical

# Generate custom illustration
/wt:image-generate "A diagram showing X" --style technical-diagram

# Generate article illustrations automatically
/wt:image-illustrator
```

---

## 5. Style Profiles

### 5.1 Built-in Style Profiles

| Profile | Description | Best For |
|---------|-------------|----------|
| `technical-writer` | Clear, precise technical writing | Documentation, tutorials |
| `tutorial` | Step-by-step instructional | How-to guides |
| `opinion` | Persuasive, narrative-style | Opinion pieces |
| `research-article` | Academic, evidence-based | Research papers |
| `blog` | Engaging, conversational | Blog posts |

### 5.2 Creating Custom Style Profiles

Extract your own writing style:

```bash
/wt:style-extractor ./my-blog-posts
```

The analyzer will:
1. Read all `.md` files in the folder
2. Analyze sentence patterns, vocabulary, tone
3. Generate a unique style profile ID
4. Ask you to confirm the ID
5. Save the profile for reuse

**Style Profile Contents:**
- Syntax rules (sentence rhythm, openings)
- Vocabulary guidelines (complexity, signature phrases)
- Tone calibration (formality, warmth, authority)
- Rhetorical toolkit (analogies, punctuation)
- Formatting protocol (structure, emphasis)
- Example transformations

### 5.3 Using Style Profiles

```bash
# Use built-in profile
/wt:topic-create "Topic" --style technical-writer

# Use custom profile
/wt:topic-create "Topic" --style my-custom-style

# List available profiles
cat ~/.claude/wt/styles/registry.json
```

---

## 6. Configuration

### 6.1 Configuration File

**Location:** `~/.claude/wt/config.jsonc`

**Default Configuration:**
```jsonc
{
  "version": "1.0.0",
  "technical-content-creation": {
    "tcc_repo_root": null,
    "default_collection": "test-collection",
    "auto_create_collections": true,
    "collections_path": "collections"
  }
}
```

### 6.2 Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `tcc_repo_root` | Path to TCC repository | Auto-detected |
| `default_collection` | Default collection name | `test-collection` |
| `auto_create_collections` | Auto-create collections | `true` |
| `collections_path` | Collections folder path | `collections` |

### 6.3 Changing Configuration

Edit `~/.claude/wt/config.jsonc` directly:

```jsonc
{
  "technical-content-creation": {
    "default_collection": "my-blog",
    "collections_path": "content"
  }
}
```

---

## 7. Workflows & Examples

### 7.1 Full Article Workflow

**Scenario:** Create a comprehensive tutorial

```bash
/wt:topic-create "Building REST APIs with FastAPI" \
  --collection "Python Development" \
  --style tutorial \
  --illustrations 8 \
  --platforms blog,twitter,linkedin
```

**Timeline:**
- Stage 0-1: Materials & Research (~5 min)
- Stage 2: Outline generation (~2 min, + user approval)
- Stage 3: Draft writing (~3 min)
- Stage 4: Illustrations (~4 min)
- Stage 5-6: Adaptation & Publishing (~2 min)

**Output:**
```
building-rest-apis-with-fastapi/
├── topic.md
├── 0-materials/materials-extracted.md
├── 1-research/research-brief.md
├── 2-outline/outline-approved.md
├── 3-draft/draft-article.md
├── 4-illustration/
│   ├── cover.png
│   └── images/
├── 5-adaptation/
│   ├── article-blog.md
│   ├── article-twitter.md
│   └── article-linkedin.md
└── 6-publish/article.md
```

### 7.2 Quick Blog Post Workflow

**Scenario:** Fast article without illustrations

```bash
/wt:topic-create "Python List Comprehensions Explained" \
  --stages 0-3,5-6 \
  --platforms blog
```

**Stages executed:** Materials → Research → Outline → Draft → Adaptation → Publish

### 7.3 Research-Heavy Article

**Scenario:** Academic-style article with systematic review

```bash
/wt:topic-create "Event Sourcing vs CQRS" \
  --style research-article \
  --research-type systematic \
  --illustrations 5
```

**Uses:**
- PICO framework for research questions
- GRADE quality assessment
- 20-50 academic sources
- Extended research phase

### 7.4 Opinion Piece

**Scenario:** Persuasive narrative article

```bash
/wt:topic-create "Why Most Microservices Are Overkill" \
  --style opinion \
  --platforms blog,linkedin
```

**Characteristics:**
- Narrative-style outline (Option B)
- Persuasive arguments
- Fewer technical diagrams
- Engaging, conversational tone

### 7.5 Updating Existing Draft

**Scenario:** Revise draft with feedback

```bash
/wt:topic-draft \
  --file 3-draft/draft-article.md \
  --revise
```

Then provide your feedback for revision.

---

## 8. FAQ

### Installation & Setup

**Q: Do I need to install anything separately?**
A: The WT plugin comes with your Claude Code installation. For image generation, configure the HuggingFace MCP server (optional).

**Q: Where are my style profiles stored?**
A: Style profiles are stored in `~/.claude/wt/styles/`

**Q: Can I change the default collection location?**
A: Yes, edit `~/.claude/wt/config.jsonc` and set `collections_path`

---

### Usage & Workflows

**Q: Can I skip stages I don't need?**
A: Yes, use `--stages` flag. Example: `--stages 0-3,5-6` skips illustrations.

**Q: How do I generate just an outline without writing the full article?**
A: Use `/wt:topic-outline "Your Topic"` directly.

**Q: Can I use my own research materials?**
A: Yes. Place materials in `0-materials/` folder and use `/wt:topic-draft` to write from existing research.

**Q: What's the difference between research types?**
A:
- **systematic:** 20-50 sources, academic rigor, PICO framework
- **rapid:** 10-20 sources, quick turnaround
- **narrative:** Story-driven, fewer sources

---

### Style Profiles

**Q: How many files do I need to extract a style?**
A: Minimum 3 files OR 2000 words total.

**Q: Can I edit a style profile after creation?**
A: Yes, edit the `.style.md` file in `~/.claude/wt/styles/`

**Q: What happens if I have multiple authors in my folder?**
A: The style extractor will detect multiple voices and ask you to clarify which subset to analyze.

---

### Image Generation

**Q: Do I need an API key for image generation?**
A: If using HuggingFace MCP, configure your API key in MCP server settings. The plugin can also fall back to other backends.

**Q: Can I generate images without writing an article?**
A: Yes, use `/wt:image-generate "your prompt"` directly.

**Q: What image sizes are supported?**
A: Multiple ratios: 1024x1024 (1:1), 1152x896 (9:7), 1280x720 (16:9), and more.

**Q: Can I use my own images instead of AI-generated ones?**
A: Yes, place images in `4-illustration/images/` and they will be used in adaptations.

---

### Publishing

**Q: Does the plugin publish directly to platforms?**
A: No, it prepares formatted content. You copy-paste to your publishing platform.

**Q: What's the difference between dry-run and live publishing?**
A: Dry-run generates preview content. Live publishing (confirm after dry-run) creates final output.

**Q: Can I publish to custom platforms?**
A: The plugin supports blog, Twitter, LinkedIn, and Dev.to. For other platforms, use the blog format as a template.

---

### Troubleshooting

**Q: A stage failed. What do I do?**
A: The plugin will offer recovery options: retry, skip stage, or manual intervention. Previous stage outputs are preserved.

**Q: My outline options don't match what I expected.**
A: This can happen if the research brief is incomplete. Ensure Stage 1 completed successfully, or provide your own outline manually.

**Q: Image generation timed out.**
A: Retry with a different backend or skip illustrations with `--stages 0-3,5-6`

**Q: Style profile not found.**
A: Check `~/.claude/wt/styles/registry.json` and ensure the profile ID is correct. Re-run style extractor if needed.

---

### Advanced Usage

**Q: Can I chain multiple workflows?**
A: Yes, run multiple `/wt:topic-create` commands for different topics. Collections help organize related content.

**Q: How do I migrate content between collections?**
A: Move the topic folder to the new collection folder and update `topic.md`

**Q: Can I use WT with other plugins?**
A: Yes, WT integrates with rd2 plugins (`rd2:knowledge-seeker`, `rd2:anti-hallucination`) for research and verification.

---

### Tips & Best Practices

**For Better Articles:**
1. Use systematic research for technical topics
2. Always review outline options before drafting
3. Use 1-3 revision cycles for important content
4. Generate illustrations for complex concepts

**For Faster Output:**
1. Use rapid research type
2. Skip illustrations with `--stages 0-3,5-6`
3. Use `--no-gates` to skip approval prompts
4. Target fewer platforms

**For Quality:**
1. Provide clear, specific topics
2. Use appropriate style profiles
3. Review and edit generated drafts
4. Add your expertise and insights

---

## Getting Help

- **Issues:** Report bugs at [GitHub Issues](https://github.com/anthropics/claude-code/issues)
- **Documentation:** See `docs/spec-wt-v1.md` for technical details
- **Examples:** Check `plugins/wt/skills/technical-content-creation/assets/sample_repository/`

---

**End of User Manual**
