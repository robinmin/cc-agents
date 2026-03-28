---
description: Extract, verify, and synthesize knowledge from files, URLs, or search queries with workflow depth control and --save support
model: sonnet
argument-hint: "<input> [--aspect <aspect>] [--workflow quick|standard|deep] [--format synthesis|verification|literature-review] [--save] [--output <path>]"
allowed-tools: [Read, Write, Edit, Bash, Skill, WebSearch, WebFetch]
---

# Info Seek

Extract, verify, and synthesize knowledge from multiple sources with proper citation and confidence scoring. This command delegates to the **rd3:knowledge-extraction** skill for research workflows and **wt:magent-browser** for document conversion. Supports file-based workflow integration with `--save` for Technical Content Workflow.

## Quick Start

```bash
/wt:info-seek "React Server Components"                                # Search and synthesize
/wt:info-seek https://example.com/article                              # Extract from URL
/wt:info-seek path/to/document.pdf                                     # Extract from PDF
/wt:info-seek "OAuth2 flows" --aspect security                         # Filter by aspect
/wt:info-seek "LLM hallucination" --workflow deep                      # Full literature review
/wt:info-seek "Is FastAPI faster than Django?" --format verification   # Quick fact-check
/wt:info-seek paper.pdf --save                                         # Save to 0-materials/
```

## When to Use

Use this command when you need to:

- **Extract knowledge from documents** — PDFs, Office docs, images with OCR, web pages
- **Verify information from multiple sources** — Cross-check claims with citations and confidence scoring
- **Research technical topics** — Search documentation, synthesize findings, identify conflicts
- **Conduct literature reviews** — Systematic research with PRISMA methodology (`--workflow deep`)
- **Fact-check specific claims** — Quick verification with source tracing (`--format verification`)
- **Filter by specific aspects** — Focus on architecture, security, performance, API, etc.
- **Save for workflow** — Store extracted materials in 0-materials/ for Technical Content Workflow

**Not for:**
- Interactive web tasks requiring screenshots -> Use `/wt:magent-browser` directly
- Manual document conversion -> Use `markitdown` CLI directly
- Simple web scraping without verification -> Use `curl` or `wt:magent-browser`
- Enterprise-grade research with HTML reports -> Use `/rd3:deep-research`

## Arguments

| Argument | Required | Description | Default |
|----------|----------|-------------|---------|
| `<input>` | Yes | File path, URL, or search description | — |
| `--aspect` | No | Aspect filter (see Aspect Filtering below) | — |
| `--workflow` | No | Research depth: `quick`, `standard`, `deep` | `standard` |
| `--format` | No | Output template: `synthesis`, `verification`, `literature-review` | `synthesis` |
| `--save` | No | Save output to 0-materials/materials-extracted.md | `false` |
| `--output` | No | Custom output path (implies --save) | Auto-detected |

## Workflow Depth

The `--workflow` option controls how much research effort is applied:

| Workflow | Skill Workflow | Use For | Effort |
|----------|---------------|---------|--------|
| `quick` | Single Source Extraction | Quick facts, simple lookups, known URLs | Low — 1-2 sources |
| `standard` | Multi-Source Synthesis | General research, topic exploration | Medium — 3+ sources, cross-verification |
| `deep` | Full 5-Phase Research Process | Literature reviews, comprehensive analysis | High — systematic search, PRISMA methodology |

The 5-phase research process (for `--workflow deep`) follows the methodology in `rd3:knowledge-extraction/references/research-process.md`:
1. Define Scope — clarify question, set recency threshold
2. Design Search Strategy — select tools, construct queries
3. Execute Systematic Search — run searches, assess source quality
4. Synthesize and Verify — cross-reference, resolve conflicts, score confidence
5. Present Results — structured output with full citations

## Output Format Templates

The `--format` option selects the output structure (templates defined in `rd3:knowledge-extraction/references/output-templates.md`):

| Format | Template | Best For |
|--------|----------|----------|
| `synthesis` | Research Synthesis | General research, topic exploration (default) |
| `verification` | Quick Verification | Fact-checking a specific claim |
| `literature-review` | Literature Review | Academic-style comprehensive reviews |

All formats include confidence scoring (HIGH/MEDIUM/LOW/UNVERIFIED) and source citations with dates.

## Aspect Filtering

The `--aspect` option focuses extraction on specific information types:

| Aspect | Use Case |
|--------|----------|
| `architecture` | System design, components, patterns |
| `performance` | Benchmarks, optimization techniques, bottlenecks |
| `security` | Vulnerabilities, best practices, authentication |
| `examples` | Code examples, usage patterns, tutorials |
| `API` | Endpoints, parameters, response formats |
| `configuration` | Setup, options, environment variables |
| `troubleshooting` | Common issues, error messages, solutions |

When `--aspect` is specified:
1. Extract all information from sources
2. Filter and prioritize content matching the specified aspect
3. Note if relevant information was filtered out
4. Adjust confidence scoring based on aspect-relevance

## Input Types

The command auto-detects input type and routes accordingly:

### 1. File Path

Local files that need conversion or analysis: `.pdf`, `.docx`, `.pptx`, `.xlsx`, `.html`, `.png`, `.jpg`, `.md`, `.txt`

**Delegation flow:**
1. `wt:magent-browser` — Converts file to markdown using markitdown (if needed)
2. `rd3:knowledge-extraction` skill — Extracts, verifies, and synthesizes knowledge
3. Output with citations and confidence level

### 2. URL

Web pages or online documents: blog posts, documentation, PDFs from URLs, news sites.

**Delegation flow:**
1. `wt:magent-browser` — Navigates and converts URL to markdown (handles JS-rendered content)
2. `rd3:knowledge-extraction` skill — Extracts, verifies, and cross-checks with additional sources
3. Output with citations and confidence level

### 3. Description (Search Query)

Search queries or topic descriptions: API names, framework features, technical concepts.

**Delegation flow:**
1. `rd3:knowledge-extraction` skill — Searches documentation (ref MCP), WebSearch, mcp__grep__searchGitHub
   - Applies triangulation methodology for credibility assessment
   - Cross-checks with 2+ sources (or 3+ for `--workflow deep`)
2. Output with multiple citations and confidence level

## Implementation

This command delegates to the **rd3:knowledge-extraction** skill and **wt:magent-browser** agent:

```
# Step 1: Input detection
IF input starts with http:// or https:// → URL
ELIF input is a file path (exists or contains /) → FILE_PATH
ELSE → DESCRIPTION

# Step 2: Document conversion (FILE_PATH and URL only)
IF FILE_PATH or URL:
    Agent(subagent_type="wt:magent-browser",
          prompt="Convert <input> to markdown using markitdown")
    → markdown_content

# Step 3: Knowledge extraction via skill
Skill(skill="rd3:knowledge-extraction", args="<workflow-args>")

The skill applies:
  --workflow quick   → Single Source Extraction (Workflow 1)
  --workflow standard → Multi-Source Synthesis (Workflow 2)
  --workflow deep    → Full 5-Phase Research Process

The skill outputs using:
  --format synthesis        → Research Synthesis template
  --format verification     → Quick Verification template
  --format literature-review → Literature Review template

# Step 4: Save to workflow (if --save or --output)
IF --save or --output:
    Save to 0-materials/materials-extracted.md
    Update 0-materials/materials.json index
```

## Save Workflow (`--save`)

The `--save` option integrates with the Technical Content Workflow by saving extracted materials to the 0-materials/ folder.

### Save Flow

```
1. Parse command arguments (input, --aspect, --workflow, --format, --save, --output)
2. Detect topic folder:
   - If 0-materials/ exists in current path → use it
   - If running from topic root → use 0-materials/
   - Otherwise → create or ask user
3. Process input via delegation flow above
4. Generate materials-extracted.md with frontmatter:
   - source: original file/URL
   - aspect: --aspect value if provided
   - workflow: quick/standard/deep
   - extracted_at: timestamp
   - topic: detected topic name
   - confidence: overall confidence level
5. Update 0-materials/materials.json index
6. Report success with file path
```

### materials-extracted.md Frontmatter

```markdown
---
title: Extracted Materials: [Topic]
source: research-paper.pdf
source_type: file | url | description
aspect: architecture | performance | security | examples | API | null
workflow: quick | standard | deep
extracted_at: 2026-01-28T10:00:00Z
topic: topic-name
word_count: 1500
confidence: HIGH | MEDIUM | LOW
---
```

### materials.json Index Format

```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T10:00:00Z",
  "materials": [
    {
      "id": "mat-001",
      "file": "materials-extracted.md",
      "source": "research-paper.pdf",
      "source_type": "file",
      "aspect": "architecture",
      "workflow": "standard",
      "extracted_at": "2026-01-28T10:00:00Z",
      "word_count": 1500,
      "confidence": "HIGH"
    }
  ]
}
```

### File-Based Re-Processing

```bash
# Read existing materials and re-filter with different aspect
/wt:info-seek 0-materials/materials-extracted.md --aspect security
```

## Error Handling

| Error | Resolution |
|-------|-----------|
| File not found | Verify file path is correct |
| URL inaccessible | Check if URL is correct and accessible |
| No search results | Try alternative search terms or broader query |
| Topic folder not found (--save) | Run from within a topic folder or use --output |
| 0-materials/ missing (--save) | Create the folder first or run `/wt:topic-init` |

## Examples

**Example 1: Standard research**

```bash
/wt:info-seek "React Server Components caching" --aspect performance
```

1. Searches React documentation via ref MCP, WebSearch
2. Filters for performance-related content
3. Cross-verifies with 2+ sources
4. Outputs performance-focused synthesis with confidence scoring

**Example 2: Quick fact-check**

```bash
/wt:info-seek "Does Python 3.12 support the Self type?" --workflow quick --format verification
```

1. Quick lookup via ref MCP
2. Outputs verification template: claim, finding, source, confidence

**Example 3: Literature review with save**

```bash
/wt:info-seek "Chain-of-Thought prompting effectiveness" --workflow deep --save
```

1. Runs full 5-phase research process with PRISMA methodology
2. Searches academic sources, official docs, engineering blogs
3. Synthesizes across 5+ sources with thematic findings
4. Saves literature review to 0-materials/materials-extracted.md

**Example 4: PDF extraction**

```bash
/wt:info-seek ~/Documents/research-paper.pdf --aspect architecture
```

1. Delegates to wt:magent-browser for PDF → markdown conversion
2. Extracts architecture-related content via rd3:knowledge-extraction
3. Verifies claims with additional sources
4. Outputs with citations and confidence level

## Integration with Technical Content Workflow

```
Stage 0: Materials (0-materials/)     ← /wt:info-seek <sources> --save
         |
         v
Stage 1: Research (1-research/)       ← /wt:info-research "topic"
         |
         v
Stage 2: Outline (2-outline/)        ← /wt:topic-outline research-brief.md
         |
         v
Stage 3: Draft (3-draft/)            ← /wt:topic-draft <profile>
```

## Integration with Skills and Agents

| Component | Role | When Used |
|-----------|------|-----------|
| **rd3:knowledge-extraction** (skill) | Core research engine — extraction workflows, verification, synthesis, templates | Always — handles all research logic |
| **wt:magent-browser** (agent) | Document conversion, JS-rendered content | FILE_PATH and URL inputs |
| **rd3:knowledge-seeker** (agent) | Research specialist wrapper | When spawned as subagent for complex tasks |
| **rd3:anti-hallucination** (skill) | Pre-answer verification protocols | Loaded by knowledge-seeker agent |
| **rd3:verification-chain** (skill) | Chain-of-Verification orchestration | Loaded by knowledge-seeker agent |

### Tool Access

The skill and agents have access to:
- **ref MCP** — Official documentation search (`ref_search_documentation`, `ref_read_url`)
- **WebSearch** — Recent information validation
- **WebFetch** — Static web content retrieval
- **mcp__grep__searchGitHub** — Code example verification
- **mcp__huggingface__paper_search** — Academic paper search

## Related Commands

- `/wt:info-research` — Conduct systematic research and generate research brief (Stage 1)
- `/wt:topic-outline` — Generate outlines from research (Stage 2)
- `/wt:topic-draft` — Apply writing style to content (Stage 3)
- `/rd3:deep-research` — Enterprise-grade research with HTML report output
