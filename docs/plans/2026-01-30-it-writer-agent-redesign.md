# IT Writer Agent - Design Document

**Date:** 2026-01-30
**Status:** Validated Design
**Version:** 1.0
**Agent:** `wt:it-writer`

---

## Executive Summary

Redesign the `wt:it-writer` agent from a thin wrapper into an intelligent orchestration layer for the 7-stage Technical Content Workflow. The agent provides hybrid input patterns, adaptive output, intelligent stage selection, interactive stage gates, and comprehensive error handling while delegating all content creation to specialized skills and tools.

**Core Philosophy:** Fat in orchestration, thin in implementation. The agent handles decision-making, user interaction, and workflow coordination—never generating content directly.

---

## Architecture Overview

### Agent Type

**Intelligent Orchestration Layer** - Sits between user intent and the `wt:technical-content-creation` skill, coordinating decision-making, user interaction, and workflow management.

### Core Responsibilities

1. **Intent Parsing & Validation** - Accept hybrid input (natural language or structured), parse requirements, validate against capabilities, prompt for missing required fields

2. **Workflow Planning** - Determine which stages to run based on task complexity, identify dependencies, plan optimal execution sequence

3. **Stage Gate Orchestration** - Pause at key decision points (outline approval, draft review, publishing), present options via `AskUserQuestion`, await confirmation

4. **Delegation to Skills/Tools** - All content creation delegated to `wt:technical-content-creation` skill and related tools (`wt:image-*`, commands)

5. **Adaptive Response Generation** - Generate detailed reports for full workflows, concise summaries for single-stage tasks

### Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     wt:it-writer Agent                      │
│  (Intelligent Orchestration Layer)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ InputParser  │→│ WorkflowPlanner │→│StageGateHandler│   │
│  └─────────────┘  └──────────────┘  └──────────────┘    │
│         │                 │                  │               │
│         ↓                 ↓                  ↓               │
│  ┌──────────────────────────────────────────────────┐      │
│  │          SkillInvoker (Delegation Layer)        │      │
│  └──────────────────────────────────────────────────┘      │
│              │                  │                          │
│              ↓                  ↓                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ wt:technical│  │ wt:image-*   │  │ Commands     │     │
│  │ -content-   │  │ skills       │  │ (doc-style,  │     │
│  │ creation    │  │ (cover,      │  │  doc-adapt,  │     │
│  │ skill       │  │ illustrator, │  │  doc-publish)│     │
│  └──────────────┘  │ generate)    │  └──────────────┘     │
│                   └──────────────┘                          │
│                                                               │
│  ┌──────────────────────────────────────────────────┐      │
│  │         ResponseFormatter (Adaptive Output)       │      │
│  └──────────────────────────────────────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Input Design

### Hybrid Approach

The agent accepts two input patterns and normalizes them internally.

#### Pattern A: Natural Language Task

```text
"Create a tutorial on FastAPI REST APIs for the Python Development collection.
Use technical-writer style. Generate 3 illustrations. Adapt for Twitter and LinkedIn."
```

#### Pattern B: Structured Parameters

```yaml
topic: "FastAPI REST APIs"
collection: "Python Development"
style_profile: "technical-writer"
stages: [0, 1, 2, 3, 4, 5, 6]
illustrations: 3
platforms: [twitter, linkedin]
output_style: comprehensive
```

### Required Fields Validation

| Field | Required | Default | Validation |
|-------|----------|---------|------------|
| `topic` | Yes | - | Non-empty string |
| `collection` | No* | From config | Exists or auto-create |
| `style_profile` | No | `technical-writer` | Valid style name |
| `stages` | No | All (0-6) | Valid stage numbers |
| `platforms` | No | blog+twitter+linkedin | Valid platform names |
| `illustrations` | No | Auto-based on content | Positive integer |

*Required for new topics, optional for existing topics.

---

## Output Design

### Adaptive Response Pattern

The agent generates different output formats based on workflow complexity.

#### Full Workflow Output (7 Stages)

```markdown
## Content Creation Complete

**Workflow Summary:**
- Topic: FastAPI REST APIs
- Collection: Python Development
- Stages Completed: 7/7
- Duration: ~15 minutes

**Generated Outputs:**
- Materials: 0-materials/materials-extracted.md
- Research Brief: 1-research/research-brief.md
- Outline: 2-outline/outline-approved.md (Option A: Traditional/Structured)
- Draft: 3-draft/draft-article.md (2,450 words)
- Cover Image: 4-illustration/cover.png
- Illustrations: 4-illustration/images/ (3 diagrams)
- Adaptations: 5-adaptation/ (twitter, linkedin, devto)
- Published: 6-publish/article.md

**Quality Metrics:**
- Research Confidence: HIGH (92%)
- Sources Synthesized: 18
- Draft Revisions: 1
- Image Generation: 3/3 successful

**Next Steps:**
- Review draft at 3-draft/draft-article.md
- Check illustrations in 4-illustration/
- Review adaptations in 5-adaptation/
- Final published version at 6-publish/article.md
```

#### Single-Stage Output

```
✓ Draft generated: 3-draft/draft-article.md (1,850 words)
  Style: technical-writer | Confidence: HIGH
  Source: 2-outline/outline-approved.md
```

---

## Workflow Orchestration

### Intelligent Stage Selection

The agent analyzes task requirements and determines optimal workflow:

| Task Type | Stages to Run | Rationale |
|-----------|--------------|-----------|
| New content from source | 0-6 (full) | Need complete pipeline |
| Existing research brief | 1-6 | Skip stage 0 |
| Existing outline | 2-6 | Skip stages 0-1 |
| Draft revision | 3 only | Use --revise flag |
| Quick blog post | 0-3, 5-6 | Skip stage 4 |
| Research-heavy article | 0-6, extended stage 1 | Use `systematic` research |
| Opinion piece | 0-6, option B outline | Use narrative style |
| Tutorial with code | 0-6, code-focused outline | Use technical style |

### Dependency Validation

Before running each stage, the agent verifies prerequisites:

```python
DEPENDENCY_GRAPH = {
    1: [0],  # Research requires Materials
    2: [1],  # Outline requires Research
    3: [2],  # Draft requires Outline
    4: [3],  # Illustration requires Draft
    5: [3, 4],  # Adaptation requires Draft (+ Illustration optional)
    6: [5],  # Publish requires Adaptations
}
```

### Context Awareness

- Detect completed stages by file presence
- Skip already-completed stages
- Track user preferences across stages (outline style, revision requests)
- Maintain workflow state in session

---

## Stage Gate Handlers

### Gate 1: Outline Approval (Stage 2)

**Purpose:** Allow user to select from multiple outline options

**Flow:**
1. Generate 2-3 outline options via `scripts/outline-generator.py`
2. Present options with style descriptions
3. Use `AskUserQuestion` to request selection
4. Copy selected option to `2-outline/outline-approved.md`
5. Store generation materials in `2-outline/materials/`

**Options:**
- A: Traditional/Structured (hierarchical, logical progression)
- B: Narrative/Story-driven (engaging flow, storytelling)
- C: Technical/Deep-dive (comprehensive, detail-oriented)

### Gate 2: Draft Review (Stage 3)

**Purpose:** Allow user to review and approve/revise draft

**Flow:**
1. Present draft summary (word count, style, sections)
2. Offer options: Approve, Revise, Regenerate
3. If Revise: collect feedback via `AskUserQuestion`
4. Regenerate with `--revise` flag and feedback
5. Pause for final approval

**Options:**
- Approve - Proceed to illustrations
- Revise - Provide feedback for regeneration
- Regenerate - Start over with different parameters
- Skip - Move to adaptations without revising

### Gate 3: Publishing Approval (Stage 6)

**Purpose:** Prevent accidental publishing

**Flow:**
1. Show target platforms and publishing modes
2. Display dry-run vs live options
3. For social platforms: show character counts and preview
4. Request explicit confirmation before live publishing

**Options:**
- Live publish to all platforms
- Dry-run only (preview mode)
- Select platforms manually
- Skip publishing (save for later)

---

## Error Handling & Recovery

### Error Categories

| Category | Example Error | Recovery Pattern |
|----------|---------------|-----------------|
| File not found | Outline not found | Offer to run previous stage first |
| Validation failed | Invalid style name | Show valid options, request correction |
| Generation failed | API rate limit | Suggest delay, offer retry or skip |
| Missing dependency | Stage 0 incomplete | Auto-run or prompt user |

### Smart Defaults

```python
DEFAULTS = {
    "style_profile": "technical-writer",
    "platforms": ["blog", "twitter", "linkedin"],
    "illustrations": "auto",  # Based on content length
    "collection": get_default_from_config(),
    "research_type": "rapid",
    "outline_length": "long",
}
```

### Partial Success Handling

- Stage 4 (illustrations) fails → Continue to Stage 5, flag missing images
- Stage 5 (adaptation) partially fails → Report successful, retry failed
- Always save intermediate results for recovery

---

## Delegation Pattern

### Stage-to-Skill Mapping

| Stage | Delegation | Tool Type | Parameters |
|-------|------------|-----------|------------|
| 0 | `wt:info-seek` | Command | sources, aspect_filter, --save |
| 1 | `wt:info-research` | Command | --file, research_type |
| 2 | `scripts/outline-generator.py` | Script | options, length, interactive |
| 3 | `wt:doc-style` | Command | style_profile, --file |
| 4 | `wt:image-cover` | Skill | article, output, style |
| 4 | `wt:image-illustrator` | Skill | article, image_dir, min_positions |
| 4 | `wt:image-generate` | Skill | description, context, style, resolution |
| 5 | `wt:doc-adapt` | Command | --source, --platforms |
| 6 | `wt:doc-publish` | Command | --source, --platforms, --dry-run |

### Context Passing

Each stage receives context from previous stages:

```python
STAGE_CONTEXT = {
    1: {"materials": "0-materials/materials-extracted.md"},
    2: {"research": "1-research/research-brief.md"},
    3: {"outline": "2-outline/outline-approved.md"},
    4: {"draft": "3-draft/draft-article.md"},
    5: {"draft": "3-draft/draft-article.md", "images": "4-illustration/captions.json"},
    6: {"adaptations": "5-adaptation/article-{platform}.md"},
}
```

---

## Implementation Checklist

### Frontmatter Updates

- [x] Add `orchestrates` field listing all skills/tools
- [x] Update description to reflect orchestration role

### Section Additions

- [x] **Input Patterns** - Hybrid approach with examples
- [x] **Output Patterns** - Adaptive response formatting
- [x] **Workflow Orchestration** - Intelligent stage selection
- [x] **Context Awareness** - Dependency validation
- [x] **Stage Gate Handlers** - 3 gate types with flows
- [x] **Error Handling & Recovery** - Comprehensive patterns
- [x] **Delegation Pattern** - Stage-to-skill mapping
- [x] **Enhanced Examples** - Full workflow, single-stage, research-heavy

### Section Replacements

- [x] **Overview** - Orchestration layer concept
- [x] **When to Use** - Interactive, adaptive, context-aware scenarios
- [x] **Example Invocations** - New examples matching new capabilities
- [x] **Coordination Pattern** - Updated subagent usage
- [x] **Related Resources** - Updated scripts, skills sections
- [x] **Best Practices** - New orchestration-specific tips

---

## Related Files

### Skills
- `/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/SKILL.md`
- `/Users/robin/projects/cc-agents/plugins/wt/skills/image-cover/SKILL.md`
- `/Users/robin/projects/cc-agents/plugins/wt/skills/image-illustrator/SKILL.md`
- `/Users/robin/projects/cc-agents/plugins/wt/skills/image-generate/SKILL.md`

### Scripts
- `/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/outline-generator.py`
- `/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/repo-config.py`
- `/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/topic-init.py`
- `/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/context-validator.py`
- `/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/shared/config.py`

### Commands
- `/Users/robin/projects/cc-agents/plugins/wt/commands/doc-adapt.md`
- `/Users/robin/projects/cc-agents/plugins/wt/commands/doc-outline.md`
- `/Users/robin/projects/cc-agents/plugins/wt/commands/doc-publish.md`
- `/Users/robin/projects/cc-agents/plugins/wt/commands/doc-style.md`
- `/Users/robin/projects/cc-agents/plugins/wt/commands/info-research.md`
- `/Users/robin/projects/cc-agents/plugins/wt/commands/info-seek.md`
- `/Users/robin/projects/cc-agents/plugins/wt/commands/topic-init.md`

---

## Next Steps

After design validation, proceed with:

1. **Implementation Planning** - Use `superpowers:writing-plans` to create detailed implementation plan
2. **Git Worktree** - Use `superpowers:using-git-worktrees` for isolated implementation workspace
3. **Implementation** - Execute the plan following rd2:super-coder workflow
4. **Testing** - Verify all workflows, stage gates, and error handling
5. **Documentation** - Update related command docs to reference agent usage

---

**Design Status:** Validated and ready for implementation
**Agent File:** `/Users/robin/projects/cc-agents/plugins/wt/agents/it-writer.md` (updated)
**Dependencies:** All required skills and scripts implemented and tested (Phases 1-6 complete)
