# WT Plugin Specification v1.0

**Version:** 1.6.3
**Status:** Active
**Last Updated:** 2026-02-02
**Maintainer:** Robin Min

---

## 1. Overview

The WT (Writing Tools) plugin is a comprehensive technical content creation system for Claude Code. It provides a systematic 7-stage workflow from research to multi-platform publishing, with integrated AI image generation and style profile management.

### 1.1 Architecture Philosophy

- **Fat Skills, Thin Wrappers:** Skills contain core logic; commands/agents are thin delegators
- **File-Based Communication:** Pass file paths between stages, not content (prevents context bloat)
- **Verification-First:** All research follows anti-hallucination protocol with source citations
- **Graceful Degradation:** Partial stage failures don't collapse the workflow

### 1.2 Core Components

| Component Type | Count | Purpose |
|----------------|-------|---------|
| Commands | 13 | User-facing slash commands (~50 lines each) |
| Skills | 5 | Core workflow logic and domain expertise |
| Agents | 3 | Adaptive orchestration and coordination |

---

## 2. Directory Structure

```
plugins/wt/
├── .claude/
│   └── plugin.json                 # Plugin metadata (name, version, description)
├── agents/                          # Subagents (adaptive coordinators)
│   ├── tc-writer.md                # Technical content orchestration
│   ├── magent-browser.md           # Browser automation coordinator
│   └── super-researcher.md         # Research specialist
├── commands/                        # User-facing slash commands
│   ├── topic-init.md               # Initialize topic folders
│   ├── topic-create.md             # Full 7-stage workflow
│   ├── topic-outline.md            # Stage 2: Outline generation
│   ├── topic-draft.md              # Stage 3: Draft writing
│   ├── topic-illustrate.md         # Stage 4: AI illustrations
│   ├── topic-adapt.md              # Stage 5: Platform adaptation
│   ├── topic-publish.md            # Stage 6: Publishing
│   ├── info-seek.md                # Stage 0: Materials extraction
│   ├── info-research.md            # Stage 1: Research
│   ├── info-reve.md                # Codebase analysis/HLD
│   ├── style-extractor.md          # Style profile creation
│   └── translate.md                # Multi-lingual translation
├── skills/                          # Core skills (fat skills with logic)
│   ├── technical-content-creation/ # Main orchestration skill
│   │   ├── SKILL.md                # 7-stage workflow specification
│   │   ├── scripts/                # Python utilities (outline-generator.py)
│   │   ├── assets/
│   │   │   ├── topic.md            # Topic metadata template
│   │   │   └── sample_repository/  # Complete workflow examples
│   │   └── references/             # Stage specifications and guides
│   ├── image-generate/             # Core image generation
│   │   ├── SKILL.md
│   │   ├── scripts/
│   │   │   ├── template_engine.py  # Jinja2-based template system
│   │   │   └── image_generator.py  # Generation orchestration
│   │   ├── materials/
│   │   │   ├── styles/             # Style presets (technical-diagram, etc.)
│   │   │   └── prompts/            # Prompt templates
│   │   └── assets/
│   │       └── templates/          # Image generation templates
│   ├── image-cover/                # Cover image generation (2.35:1)
│   ├── image-illustrator/          # Context-aware inline illustrations
│   ├── lead-research-assistant/    # Business lead generation
│   └── markitdown-browser/         # Web to markdown conversion
├── hooks/                           # Empty (reserved for future use)
└── docs/                            # Documentation
    ├── spec-wt-v1.md               # This file
    └── user-manual-wt-v1.md        # End user documentation
```

---

## 3. Commands Reference

### 3.1 Naming Convention

Commands use `verb-noun` or `noun-verb` grouping for alphabetical sorting:

- **Topic lifecycle:** `topic-init`, `topic-create`, `topic-outline`, etc.
- **Info commands:** `info-seek`, `info-research`, `info-reve`
- **Utilities:** `style-extractor`, `translate`

### 3.2 Command Structure

Each command is a ~50 line wrapper following this structure:

```markdown
---
description: <60 char clear description>
argument-hint: <arguments in angle brackets>
---

# Command Name

Brief overview paragraph.

## Quick Start
[Code examples]

## Usage
[Delegates to skill with pseudocode]

## Arguments
[Table of arguments with defaults]

## Examples
[Detailed usage examples]

## Related Commands
[Cross-references]
```

### 3.3 Command Delegation Pattern

Commands **MUST** delegate to skills, NOT agents:

```markdown
## Usage

Skill(skill="wt:technical-content-creation",
    prompt="""Create content with 7-stage workflow

    Topic: {topic}
    Collection: {collection}
    ...
    """)
```

**Forbidden:**
```markdown
Task(agent="wt:tc-writer", ...)  # Wrong: Command -> Agent
```

### 3.4 Key Commands

| Command | Delegates To | Purpose |
|---------|--------------|---------|
| `/wt:topic-create` | `wt:technical-content-creation` | Full 7-stage workflow |
| `/wt:topic-outline` | Stage 2 logic | Multi-option outline generation |
| `/wt:topic-draft` | Stage 3 logic | Style-profile-driven writing |
| `/wt:topic-illustrate` | `wt:image-*` skills | AI image generation |
| `/wt:style-extractor` | Inline analysis | Style profile extraction |

---

## 4. Skills Reference

### 4.1 Skill Hierarchy

```
wt:technical-content-creation  [Primary orchestration skill]
├── Stage 0: Materials → wt:info-seek (inline)
├── Stage 1: Research → wt:super-researcher agent
├── Stage 2: Outline → Multi-option generation
├── Stage 3: Draft → Style profile application
├── Stage 4: Illustration →
│   ├── wt:image-cover      [Cover images, 2.35:1]
│   ├── wt:image-illustrator [Inline illustrations]
│   └── wt:image-generate    [Custom generation]
├── Stage 5: Adaptation → Platform-specific formatting
└── Stage 6: Publishing → Multi-platform output
```

### 4.2 Skill Structure

Each skill follows the 6-section structure:

1. **Frontmatter:** Metadata (name, version, namespace)
2. **Overview:** Purpose and scope
3. **When to Use:** Activation triggers with positive/negative examples
4. **Quick Start:** Fast path examples
5. **Workflow:** Step-by-step process
6. **References:** Related resources

### 4.3 Key Skills

#### `wt:technical-content-creation`

**Purpose:** Orchestrate 7-stage content workflow

**Key Features:**
- Adaptive stage selection (skip completed stages)
- Interactive stage gates (outline approval, draft review)
- Multi-platform publishing support
- Research methodology selection (systematic, rapid, narrative)

**Outputs by Stage:**

| Stage | Folder | Key Outputs |
|-------|--------|-------------|
| 0 | `0-materials/` | `materials.json`, `materials-extracted.md` |
| 1 | `1-research/` | `sources.json`, `research-brief.md` |
| 2 | `2-outline/` | `outline-option-{a,b,c}.md`, `outline-approved.md` |
| 3 | `3-draft/` | `draft-article.md`, `draft-revisions/` |
| 4 | `4-illustration/` | `cover.png`, `images/`, `captions.json` |
| 5 | `5-adaptation/` | `article-{platform}.md` |
| 6 | `6-publish/` | `article.md`, `publish-log.json` |

#### `wt:image-generate`

**Purpose:** Core image generation with style presets

**Template System:**
- Uses Jinja2-based `template_engine.py`
- Supports variable interpolation for prompts
- Resolution options: 1024x1024, 1152x896, 1280x720, etc.

**Style Presets:**
- `technical-diagram` - Clean technical illustrations
- `minimalist` - Simple, clean visuals
- `vibrant` - Bold, colorful graphics
- `sketch` - Hand-drawn aesthetic
- `photorealistic` - Realistic imagery

#### `wt:image-cover`

**Purpose:** Article cover generation (2.35:1 cinematic ratio)

**Features:**
- Content analysis for style detection
- Text overlay support
- Auto-positioning for visual balance

#### `wt:image-illustrator`

**Purpose:** Context-aware inline illustration generation

**Features:**
- Automatic position detection (abstract concepts, information-dense sections)
- Caption generation via `captions.json`
- Integration with article content

---

## 5. Agents Reference

### 5.1 Agent Structure

Agents follow the 8-section anatomy (~400-600 lines):

1. **METADATA** - Name, role, namespace
2. **PERSONA** - Expertise and approach
3. **PHILOSOPHY** - Core principles and design values
4. **VERIFICATION** - Anti-hallucination protocol
5. **COMPETENCIES** - 50+ skills/concepts across categories
6. **PROCESS** - Decision framework and workflows
7. **RULES** - DO/DON'T guidelines
8. **OUTPUT** - Response format requirements

### 5.2 Key Agents

#### `wt:tc-writer`

**Role:** Senior Technical Content Orchestration Specialist

**Key Responsibilities:**
- Coordinate 7-stage workflows with adaptive selection
- Manage stage gates (outline approval, draft review)
- Delegate to specialized skills appropriately
- Handle error recovery and partial failures

**Subagents:** `wt:super-researcher`, `rd2:knowledge-seeker`, `wt:magent-browser`

**Orchestrates Skills:** `wt:technical-content-creation`, `wt:image-*`

#### `wt:magent-browser`

**Role:** Browser Automation Coordinator

**Key Responsibilities:**
- Coordinate browser interactions (navigation, form filling, screenshots)
- Handle JavaScript-rendered content
- Delegate to `wt:markitdown-browser` for document conversion

#### `wt:super-researcher`

**Role:** Research Specialist

**Key Responsibilities:**
- Systematic research with PICO framework
- GRADE quality assessment
- Multi-source verification and synthesis

---

## 6. Configuration

### 6.1 Configuration File Location

```
~/.claude/wt/config.jsonc
```

### 6.2 Configuration Structure

```jsonc
{
  "version": "1.0.0",
  "last_updated": "ISO-8601 timestamp",
  "technical-content-creation": {
    "tcc_repo_root": null,              // Path to TCC repository (auto-detected if null)
    "default_collection": "test-collection",
    "auto_create_collections": true,
    "collections_path": "collections",
    "last_updated": "ISO-8601 timestamp"
  }
}
```

### 6.3 Style Profiles

**Location:** `~/.claude/wt/styles/`

**Structure:**
```
~/.claude/wt/styles/
├── registry.json              # Style profile registry
└── {profile-id}.style.md      # Individual style profiles
```

**Registry Format:**
```json
{
  "profiles": [
    {
      "id": "technical-blogger-casual",
      "name": "Technical Blogger (Casual)",
      "author": "Author Name",
      "created": "2026-01-04",
      "confidence": "High",
      "tags": ["role", "tone", "domain"],
      "file": "technical-blogger-casual.style.md"
    }
  ]
}
```

---

## 7. Workflow Orchestration

### 7.1 7-Stage Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                     7-Stage Content Workflow                 │
├─────────────────────────────────────────────────────────────┤
│  Stage 0: Materials     → Extract source materials           │
│  Stage 1: Research      → Systematic research & synthesis    │
│  Stage 2: Outline       → Generate 2-3 options, user selects │
│  Stage 3: Draft         → Write with style profile           │
│  Stage 4: Illustration  → Generate AI images                 │
│  Stage 5: Adaptation    → Adapt for platforms                │
│  Stage 6: Publish       → Multi-platform publishing          │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Stage Gate Requirements

**Stage 2 (Outline) - REQUIRED:**
1. Generate 2-3 outline options in parallel
2. Present options via `AskUserQuestion`
3. Save selected option as `outline-approved.md`
4. Do NOT proceed to Stage 3 without approval

**Stage 3 (Draft) - REQUIRED:**
1. Generate draft using approved outline
2. Offer revision cycle (1-3 iterations)
3. Save final draft as `draft-article.md`
4. Do NOT proceed to Stage 4 without approval

**Stage 6 (Publish) - REQUIRED:**
1. Always use `--dry-run` first for preview
2. Present platform adaptations for review
3. Require explicit confirmation before live publishing

### 7.3 Adaptive Stage Selection

| Situation | Action |
|-----------|--------|
| New content from scratch | Run full 7-stage workflow with gates |
| Existing research brief | Skip Stage 0-1, run Stages 2-6 |
| Existing outline | Skip Stages 0-2, run Stages 3-6 |
| Draft revision | Run Stage 3 only with revision mode |
| Quick blog post | Run Stages 0-3, 5-6 (skip illustrations) |
| Research-heavy article | Extend Stage 1 with systematic methodology |
| Missing dependencies | Prompt user, offer to run prerequisites |

### 7.4 Error Recovery Protocol

| Error Type | Recovery Action |
|------------|-----------------|
| Materials extraction failed | Retry with different source or user provides manually |
| Research insufficient | Extend research time, switch to systematic methodology |
| Outline generation failed | Re-run with different style parameters |
| Draft generation failed | Re-run with different style profile |
| Illustration failed | Continue without illustrations or retry |
| Adaptation failed | Re-run for specific platform only |
| Publishing failed | Retry or user publishes manually |

---

## 8. External Dependencies

### 8.1 MCP Servers

| MCP Server | Purpose | Used By |
|------------|---------|---------|
| `mcp__huggingface__gr1_z_image_turbo_generate` | Image generation | `wt:image-generate` |
| `mcp__auggie-mcp__codebase-retrieval` | Codebase search | `wt:style-extractor` |
| `mcp__ref__ref_*` | Documentation search | Research stages |

### 8.2 Python Dependencies

**Location:** `plugins/wt/skills/image-generate/scripts/`

| Script | Purpose | Dependencies |
|--------|---------|--------------|
| `template_engine.py` | Jinja2 template rendering | `jinja2`, `jsoncomment` |
| `image_generator.py` | Generation orchestration | Standard library |

### 8.3 External Skills/Agents

| Resource | Plugin | Purpose |
|----------|--------|---------|
| `rd2:knowledge-seeker` | rd2 | Knowledge synthesis |
| `rd2:anti-hallucination` | rd2 | Verification protocol |
| `rd2:super-coder` | rd2 | Fallback image generation |

---

## 9. File Format Specifications

### 9.1 Topic Metadata (`topic.md`)

```markdown
---
title: "Article Title"
collection: "collection-name"
style: "style-profile"
platforms: ["blog", "twitter", "linkedin"]
created: "2026-01-01T00:00:00Z"
status: "in_progress"
stages_completed: [0, 1, 2]
---

# Topic Title

Brief description of the content topic.
```

### 9.2 Materials JSON (`materials.json`)

```json
{
  "sources": [
    {
      "type": "url|file|search",
      "path": "path or URL",
      "extracted_at": "ISO-8601 timestamp"
    }
  ],
  "total_words": 0,
  "file_count": 0
}
```

### 9.3 Sources JSON (`sources.json`)

```json
{
  "sources": [
    {
      "title": "Source Title",
      "url": "https://example.com",
      "type": "documentation|paper|blog|code",
      "confidence": "HIGH|MEDIUM|LOW",
      "cited": true
    }
  ],
  "research_type": "systematic|rapid|narrative",
  "total_sources": 0
}
```

### 9.4 Captions JSON (`captions.json`)

```json
{
  "images": [
    {
      "file": "cover.png",
      "caption": "Image caption",
      "position": "header|inline",
      "context": "Content context for placement"
    }
  ]
}
```

### 9.5 Publish Log JSON (`publish-log.json`)

```json
{
  "published_at": "ISO-8601 timestamp",
  "platforms": [
    {
      "name": "blog",
      "url": "https://example.com/article",
      "status": "published|draft|error"
    }
  ],
  "article_path": "6-publish/article.md"
}
```

---

## 10. Development Guidelines

### 10.1 Adding New Commands

1. Create `plugins/wt/commands/{command-name}.md`
2. Use `verb-noun` or `noun-verb` naming
3. Keep description under 60 characters
4. Delegate to skill (NOT agent)
5. Include Quick Start, Usage, Arguments, Examples sections

### 10.2 Adding New Skills

1. Create `plugins/wt/skills/{skill-name}/SKILL.md`
2. Follow 6-section structure (frontmatter, overview, when to use, quick start, workflow, references)
3. Use `verb-ing-noun` naming (e.g., `image-generating`)
4. Move detailed content to `references/`
5. Include examples in `examples/`

### 10.3 Adding New Agents

1. Create `plugins/wt/agents/{agent-name}.md`
2. Follow 8-section anatomy (metadata, persona, philosophy, verification, competencies, process, rules, output)
3. Use `role-prefix` naming (e.g., `super-architect`)
4. Keep 400-600 lines total
5. Include 50+ competencies across 4-5 categories
6. Add 8+ DO and 8+ DON'T rules

### 10.4 Circular Reference Rule

**Skills MUST NOT reference their associated agents or commands.**

Example:
- `wt:technical-content-creation` skill should NOT reference `wt:tc-writer` agent
- `wt:technical-content-creation` skill should NOT reference `/wt:topic-create` command
- Commands SHOULD reference skills they delegate to
- Agents SHOULD reference skills they orchestrate

### 10.5 File-Based Communication

**Rule:** Pass file paths between stages, NOT content

**Why:** Prevents context bloat, enables manual intervention, supports recovery

**Implementation:**
```python
# Good
Stage 3 reads: 2-outline/outline-approved.md
Stage 3 writes: 3-draft/draft-article.md

# Bad
Stage 3 receives: (2000 words of outline content)
Stage 3 returns: (3000 words of draft content)
```

---

## 11. Testing

### 11.1 Integration Tests

**Location:** `plugins/wt/skills/technical-content-creation/assets/sample_repository/`

**Structure:**
```
sample_repository/
├── collections/
│   ├── template/              # Empty folder structure
│   ├── test-topic-001/        # Full 7-stage example
│   └── example-topic/         # Partial example
└── README.md
```

### 11.2 Test Execution

Run integration tests via:
```bash
cd plugins/wt/skills/technical-content-creation
./tests/test-workflow.sh
```

### 11.3 Test Coverage

- Stage 0: Materials extraction from URLs/files
- Stage 1: Research with source verification
- Stage 2: Multi-option outline generation
- Stage 3: Draft writing with style profiles
- Stage 4: Image generation (cover + inline)
- Stage 5: Multi-platform adaptation
- Stage 6: Publishing with dry-run

---

## 12. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.6.3 | 2026-01-30 | Current version |
| 1.6.0 | - | Added systematic review methodology |
| 1.5.0 | - | Added image generation skills |
| 1.0.0 | - | Initial 7-stage workflow |

---

## 13. Maintenance Checklist

### Weekly
- [ ] Check for deprecated API usage in image generation
- [ ] Verify MCP server connectivity
- [ ] Review error logs for common issues

### Monthly
- [ ] Update documentation with new features
- [ ] Review and update style profiles
- [ ] Check external dependencies (Python packages, MCP servers)

### Quarterly
- [ ] Major version upgrade planning
- [ ] Architecture review and refactoring
- [ ] Performance optimization

---

## 14. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Stage fails silently | Missing dependencies | Check prerequisite stages exist |
| Image generation timeout | API rate limit | Retry with different backend |
| Style profile not found | Registry corruption | Re-run style extractor |
| Outline options not generated | Research brief incomplete | Verify Stage 1 completion |

### Debug Mode

Enable debug logging by setting environment variable:
```bash
export WT_DEBUG=1
```

---

## 15. References

### Internal Documentation
- `plugins/wt/skills/technical-content-creation/references/` - Stage specifications
- `plugins/wt/skills/image-generate/references/` - Image generation docs

### External Documentation
- Claude Code Plugin Development Guide
- MCP Server Integration Guide
- Jinja2 Template Documentation

---

**End of Specification**
