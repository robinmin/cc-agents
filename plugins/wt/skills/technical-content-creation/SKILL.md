---
name: technical-content-creation
description: This skill should be used when the user asks to "create technical content", "write a technical article", "publish to multiple platforms", "generate AI images for content", "adapt content for Twitter/LinkedIn/Dev.to", or "work through a content workflow from research to publishing". Provides comprehensive 7-stage technical content creation orchestration.
version: 1.0.0
---

# Technical Content Creation

Orchestrate the complete technical content creation process through a systematic 7-stage workflow. Create professional technical articles, blog posts, and documentation from research materials extraction through multi-platform publishing.

**Agent Integration**: This skill works with the `wt:it-writer` agent for content generation tasks.

## Overview

Implement the **Technical Content Workflow** - produce high-quality technical articles, blog posts, and documentation through a systematic 7-stage process.

### 7-Stage Workflow

```
Stage 0: Materials     (0-materials/)  - Extract and verify source materials
Stage 1: Research      (1-research/)   - Conduct systematic research
Stage 2: Outline       (2-outline/)    - Generate structured content outlines
Stage 3: Draft         (3-draft/)      - Write content with consistent style
Stage 4: Illustration  (4-illustration/) - Generate AI images for content
Stage 5: Adaptation    (5-adaptation/) - Adapt for different platforms
Stage 6: Publish       (6-publish/)    - Publish to blogs and social media
```

**Key Principle**: Each stage produces output that feeds into the next, with automatic folder detection and workflow integration.

## When to Use

Activate this skill when:

- Creating new content from scratch - Initialize topic structure and work through all stages
- Coordinating complex content projects - Orchestrate multiple stages with dependencies
- Maintaining workflow consistency - Ensure all content follows the same process
- Multi-platform publishing - Adapt and publish to multiple platforms
- Creating research-driven content - Generate evidence-based technical articles

**Not for:**

- Single-stage tasks - Use individual stage commands directly
- Simple document editing - Use text editors or built-in editing tools
- Quick content generation - Use dedicated style commands for faster results

## Quick Start

The complete workflow progresses through 7 stages:

1. **Initialize topic** - Create topic structure with metadata
2. **Extract materials** - Gather and verify source materials from multiple inputs
3. **Conduct research** - Perform systematic research and synthesize findings
4. **Generate outline** - Create structured content outlines (generate 2-3 options, user selects one)
5. **Write draft** - Apply writing style profiles to generate full articles
6. **Generate illustrations** - Create AI images for technical content
7. **Adapt and publish** - Adapt for different platforms and publish

## Workflow Stages

| Stage | Name | Location | Action | Key Outputs |
|-------|------|----------|--------|-------------|
| 0 | Materials | `0-materials/` | Extract and verify source materials | `materials.json`, `materials-extracted.md` |
| 1 | Research | `1-research/` | Conduct systematic research | `sources.json`, `research-brief.md` |
| 2 | Outline | `2-outline/` | **Generate 2-3 outline options in parallel, user selects one** | `outline-option-{a,b,c}.md`, `outline-approved.md`, `materials/` |
| 3 | Draft | `3-draft/` | Write content using style profiles | `draft-article.md`, `draft-revisions/` |
| 4 | Illustration | `4-illustration/` | **Generate AI images using wt:image-cover, wt:image-illustrator, wt:image-generate** | `cover.png`, `images/`, `captions.json` |
| 5 | Adaptation | `5-adaptation/` | Adapt content for target platforms (image-aware) | `article-{platform}.md` |
| 6 | Publish | `6-publish/` | Publish to target platforms | `article.md`, `publish-log.json` |

### Quick Reference

- **Stage 0**: Extract and verify knowledge from multiple sources
- **Stage 1**: Conduct systematic, evidence-based research
- **Stage 2**: Transform research into organized article structures (multi-option)
- **Stage 3**: Apply writing style profiles to generate full articles
- **Stage 4**: Generate AI images using wt:image-cover, wt:image-illustrator, wt:image-generate skills
- **Stage 5**: Adapt content for different publishing platforms (image-aware adaptations)
- **Stage 6**: Publish content to blogs and social platforms

**Detailed stage specifications**: See `references/stage-details.md` for input types, research types, outline structures, and resolution options.

## Integration Points

### Research Integration

- **rd2:knowledge-seeker** - Deep research and knowledge synthesis with multi-source verification
- **wt:super-researcher** - Comprehensive research applying PICO framework and GRADE assessment
- **wt:magent-browser** - Web content extraction with clean markdown conversion

### Image Skills (Stage 4)

#### wt:image-generate
Core image generation with style options and resolution support.
**Use Case**: Custom illustrations, diagrams, or visual concepts without content analysis.
**Integration**: Direct image generation for specific visual needs.

#### wt:image-cover
Article cover generation (2.35:1 cinematic) based on content analysis with text overlay options.
**Use Case**: Professional article covers with auto-detected style from article tone.
**Integration**: Featured image generation for blog posts and social media.

#### wt:image-illustrator
Context-aware inline illustration generation with automatic position detection.
**Use Case**: Automatic identification and generation for abstract concepts, information-dense sections, emotional transitions.
**Integration**: Inline illustration generation with captions.json compatibility.

## Quick Reference

### Stage Mapping

| Stage | Action | Output Folder | Key Parameters |
|-------|--------|---------------|---------------|
| 0 | Extract materials | 0-materials/ | Source input, aspect filter, save flag |
| 1 | Conduct research | 1-research/ | Research type, source file |
| 2 | Generate outline | 2-outline/ | Length, number of options (2-3) |
| 3 | Write draft | 3-draft/ | Style profile, source file, revision mode |
| 4 | Generate illustrations | 4-illustration/ | wt:image-cover, wt:image-illustrator, wt:image-generate |
| 5 | Adapt content | 5-adaptation/ | Source file, target platforms, image-aware |
| 6 | Publish content | 6-publish/ | Source file, target platforms, dry-run mode |

### Research Types

| Type | Duration | Sources | Best For |
|------|----------|---------|----------|
| systematic | 10-15 min | 20-50 | Comprehensive articles |
| rapid | 5-8 min | 10-20 | Quick blog posts |
| meta-analysis | 15-20 min | 15-40 | Research reviews |
| fact-check | 3-5 min | 5-15 | Opinion pieces |

### Status Values

| Stage | Status Options |
|-------|----------------|
| All | `draft`, `in_progress`, `approved` |
| Research | `draft`, `approved` |
| Draft | `draft`, `review`, `approved` |
| Publish | `draft`, `published` |

### Confidence Levels

| Level | Score | Use Case |
|-------|-------|----------|
| HIGH | >90% | Primary sources, verified claims |
| MEDIUM | 70-90% | Synthesized sources |
| LOW | <70% | Limited verification |

## References

### Reference Files

- **`references/stage-details.md`** - Detailed stage specifications (input types, research types, outline structures, resolution options)
- **`references/outline-multi-option.md`** - Stage 2 multi-option workflow (complete documentation with examples)
- **`references/workflows.md`** - Step-by-step workflow examples (10+ complete workflows for common scenarios)
- **`references/troubleshooting.md`** - Common issues and solutions (comprehensive troubleshooting for all 7 stages)
- **`references/platform-guide.md`** - Platform adaptation specifications (Twitter, LinkedIn, Dev.to, Medium)
- **`references/error-reference.md`** - Error handling quick reference
- **`references/frontmatter-templates.md`** - Stage-specific frontmatter examples

### Example Files

- **`assets/sample_repository/collections/test-topic-001/`** - Full end-to-end example with all 7 stage folders populated
- **`tests/TEST_RESULTS.md`** - Integration test execution report
- **`scripts/outline-generator.py`** - Stage 2 outline generation script

### Skill Resources

| Path | Purpose |
|------|---------|
| `assets/topic.md` | Topic metadata template for all stages |
| `tests/test-workflow.sh` | Integration test script |

## Related Commands and Resources

### Stage-Specific Commands
Each stage can be invoked individually using dedicated slash commands:
- Stage 0: Material extraction commands
- Stage 1: Research commands with systematic methodology
- Stage 2: Outline generation with multiple style options
- Stage 3: Draft writing with configurable style profiles
- Stage 4: Image generation for illustrations and covers
- Stage 5: Content adaptation for multiple platforms
- Stage 6: Publishing to blogs and social media

### Related Agents
- `wt:super-researcher` - Research specialist
- `wt:it-writer` - Content generation
- `rd2:knowledge-seeker` - Knowledge synthesis
- `wt:magent-browser` - Web content extraction

### Related Skills
- `rd2:anti-hallucination` - Verification protocol
- `rd2:task-workflow` - Task management

---

**Note**: This skill orchestrates the complete workflow. For single-stage tasks, use the specialized commands directly for better efficiency. See `references/workflows.md` for complete step-by-step examples and `references/troubleshooting.md` for common issues and solutions.
