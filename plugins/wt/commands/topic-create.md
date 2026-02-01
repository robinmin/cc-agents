---
description: Create technical content with full 7-stage workflow (materials, research, outline, draft, illustrations, adaptation, publishing)
argument-hint: <topic> [--collection <name>] [--style <profile>] [--stages <0-6>] [--platforms <list>] [--illustrations <n>]
---

# Topic Create

Create technical content with the complete 7-stage Technical Content Workflow. This is the primary entry point for end-to-end content creation.

## Quick Start

```bash
# Full workflow with default settings
/wt:topic-create "Building REST APIs with FastAPI"

# With custom collection and style
/wt:topic-create "Microservices Architecture Patterns" --collection "System Design" --style technical-writer

# Research-heavy article with systematic review
/wt:topic-create "Event Sourcing vs CQRS" --style research-article --illustrations 5

# Skip illustrations, publish to specific platforms
/wt:topic-create "Python Type Hints Guide" --stages 0-3,5-6 --platforms blog,linkedin
```

## Overview

The 7-Stage Technical Content Workflow:

| Stage | Name | Command | Output |
|-------|------|---------|--------|
| 0 | Materials Extraction | `/wt:info-seek` | `0-materials/materials-extracted.md` |
| 1 | Research | `/wt:info-research` | `1-research/research-brief.md` |
| 2 | Outline Generation | `/wt:topic-outline` | `2-outline/outline-approved.md` |
| 3 | Draft Writing | `/wt:topic-draft` | `3-draft/draft-article.md` |
| 4 | Illustration | `/wt:topic-illustrate` | `4-illustration/cover.png`, `images/` |
| 5 | Adaptation | `/wt:topic-adapt` | `5-adaptation/article-{platform}.md` |
| 6 | Publishing | `/wt:topic-publish` | `6-publish/article.md` |

## Usage

This command delegates to the `wt:technical-content-creation` skill which defines the complete 7-stage workflow orchestration:

```python
Skill(skill="wt:technical-content-creation",
    prompt="""Create technical content with 7-stage workflow

    Topic: {topic}
    Collection: {collection}
    Style Profile: {style}
    Stages: {stage_range}
    Platforms: {platform_list}
    Illustrations: {count}

    Follow the strict orchestration process:
    - Phase 1: Diagnose - Parse intent, check artifacts, validate dependencies
    - Phase 2: Plan - Determine stages, plan gates, identify delegation targets
    - Phase 3: Execute - Coordinate stages with adaptive selection
    - Phase 4: Verify - Quality assurance and final approval

    Execute workflow with:
    - Stage gates for outline and draft approval
    - Adaptive stage selection based on existing artifacts
    - Error recovery and partial completion support
    """)
```

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `<topic>` | Content topic (required) | - |
| `--collection <name>` | Collection name | From config or default |
| `--style <profile>` | Writing style profile | `technical-writer` |
| `--stages <range>` | Stage range (e.g., `0-3`, `0-6`, `2-6`) | All stages (0-6) |
| `--platforms <list>` | Target platforms (comma-separated) | `blog,twitter,linkedin` |
| `--illustrations <n>` | Number of illustrations to generate | Auto (based on content) |
| `--research-type <type>` | Research methodology (`rapid` or `systematic`) | `rapid` |
| `--no-gates` | Skip interactive stage gates | False (gates enabled) |

## Stage Gates

The workflow includes interactive approval points:

### Gate 1: Outline Approval (Stage 2)
After generating outlines, you'll be presented with 2-3 options:
- **Option A:** Traditional/Structured (hierarchical, logical)
- **Option B:** Narrative/Story-driven (engaging flow)
- **Option C:** Technical/Deep-dive (comprehensive, detailed)

### Gate 2: Draft Review (Stage 3)
After generating the draft, you can:
- **Approve** - Proceed to illustrations
- **Revise** - Provide feedback for regeneration
- **Regenerate** - Start over with different parameters

### Gate 3: Publishing Approval (Stage 6)
Before publishing, you can:
- **Live publish** - Publish to all specified platforms
- **Dry-run** - Preview without publishing
- **Select platforms** - Choose specific platforms

## Examples

### Full Workflow (All 7 Stages)

```bash
/wt:topic-create "Building REST APIs with FastAPI" --collection "Python Development"
```

**Output:**
```
## Content Creation Complete

Workflow Summary:
- Topic: Building REST APIs with FastAPI
- Collection: Python Development
- Stages Completed: 7/7
- Duration: ~15 minutes

Generated Outputs:
- Materials: 0-materials/materials-extracted.md
- Research Brief: 1-research/research-brief.md
- Outline: 2-outline/outline-approved.md (Option A: Traditional/Structured)
- Draft: 3-draft/draft-article.md (2,450 words)
- Cover Image: 4-illustration/cover.png
- Illustrations: 4-illustration/images/ (3 diagrams)
- Adaptations: 5-adaptation/ (twitter, linkedin, devto)
- Published: 6-publish/article.md
```

### Research-Heavy Article

```bash
/wt:topic-create "Event Sourcing Patterns" --style research-article --research-type systematic --illustrations 5
```

Uses systematic review methodology with PICO framework, GRADE quality assessment, and extended research phase.

### Opinion Piece

```bash
/wt:topic-create "Why Most Microservices Are Overkill" --style opinion --platforms blog,linkedin
```

Generates narrative-style outline (Option B), skips technical diagrams, focuses on persuasive arguments.

### Tutorial with Code

```bash
/wt:topic-create "Complete Guide to Docker Compose" --style tutorial --illustrations 8
```

Code-focused outline with step-by-step structure, generates 8 technical diagrams and screenshots.

### Quick Blog Post (Skip Illustrations)

```bash
/wt:topic-create "Python List Comprehensions Explained" --stages 0-3,5-6 --platforms blog
```

Accelerated workflow: materials, research, outline, draft, adaptation, publishing. No illustration stage.

### Single-Stage Execution

```bash
/wt:topic-create "Update existing draft" --stages 3 --file 3-draft/draft-article.md --revise
```

Revise existing draft with new feedback (Stage 3 only).

## Error Handling

The workflow gracefully handles partial failures:

### Stage 4 (Illustration) Fails
```
## Stage Execution Issue: Illustration Generation

Error: API rate limit exceeded for image generation

Impact: Draft generated successfully, illustrations skipped

Recovery Options:
1. Retry with different backend (gemini instead of huggingface)
2. Skip illustrations and continue to adaptations
3. Manual intervention: Generate images later with /wt:topic-illustrate

Recommendation: Skip illustrations for now, continue to adaptations. You can add images later.

Saved State: 4-illustration/.checkpoint.json
```

### Missing Dependency (Stage 2 Without Stage 1)
```
Workflow Detection: Research brief not found at 1-research/research-brief.md

Auto-action: Running Stage 1 (Research) first with default settings
```

## Related Commands

| Command | Purpose |
|---------|---------|
| `/wt:topic-init` | Initialize topic folder structure |
| `/wt:topic-outline` | Generate outline only (Stage 2) |
| `/wt:topic-draft` | Write draft only (Stage 3) |
| `/wt:topic-illustrate` | Generate illustrations only (Stage 4) |
| `/wt:topic-adapt` | Adapt content for platforms (Stage 5) |
| `/wt:topic-publish` | Publish content (Stage 6) |
| `/wt:info-seek` | Extract source materials (Stage 0) |
| `/wt:info-research` | Conduct research (Stage 1) |

## See Also

- **Agent:** `plugins/wt/agents/tc-writer.md` - Full orchestration layer
- **Skill:** `plugins/wt/skills/technical-content-creation/SKILL.md` - Complete workflow documentation
- **Design:** `docs/plans/2026-01-30-tc-writer-agent-redesign.md` - Architecture details
