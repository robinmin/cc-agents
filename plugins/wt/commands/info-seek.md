---
description: Extract and verify knowledge from files, URLs, or search queries with --save workflow support
model: sonnet
argument-hint: <input> [--aspect <aspect>] [--save] [--output <path>]
allowed-tools: [Read, Write, Edit, Bash]
---

# Info Seek

Extract, verify, and synthesize knowledge from multiple sources with proper citation and confidence scoring. This command delegates to specialized subagents for document conversion and knowledge extraction. Supports file-based workflow integration with `--save` for Technical Content Workflow.

## Quick Start

```bash
/wt:info-seek path/to/document.pdf                                  # Extract from PDF
/wt:info-seek https://example.com/article                           # Extract from URL
/wt:info-seek "React Server Components"                             # Search and extract
/wt:info-seek "React Server Components" --aspect architecture       # Filter by aspect
/wt:info-seek path/to/document.pdf --save                           # Save to 0-materials/
```

## When to Use

Use this command when you need to:

- **Extract knowledge from documents** - PDFs, Office docs, images with OCR, web pages
- **Verify information from multiple sources** - Cross-check claims with citations and confidence scoring
- **Research technical topics** - Search documentation, synthesize findings, identify conflicts
- **Filter by specific aspects** - Focus on architecture, security, performance, API, etc.
- **Save for workflow** - Store extracted materials in 0-materials/ for Technical Content Workflow

**Not for:**
- Interactive web tasks requiring screenshots -> Use `/wt:magent-browser` directly
- Manual document conversion -> Use `markitdown` CLI directly
- Simple web scraping without verification -> Use `curl` or `wt:magent-browser`

## Arguments

| Argument | Required | Description | Default |
|----------|----------|-------------|---------|
| `<input>` | Yes | File path, URL, or search description | - |
| `--aspect` | No | Optional aspect to filter results | - |
| `--save` | No | Save output to 0-materials/materials-extracted.md | `false` |
| `--output` | No | Custom output path (implies --save) | Auto-detected |
| `--help` | No | Show help message | - |

## Aspect Filtering

The `--aspect` option allows you to focus on specific types of information, filtering out irrelevant content:

**Common Aspects:**

| Aspect | Use Case |
|--------|----------|
| `architecture` | System design, components, patterns |
| `performance` | Benchmarks, optimization techniques, bottlenecks |
| `security` | Vulnerabilities, best practices, authentication |
| `examples` | Code examples, usage patterns, tutorials |
| `API` | Endpoints, parameters, response formats |
| `configuration` | Setup, options, environment variables |
| `troubleshooting` | Common issues, error messages, solutions |

**Examples:**

```bash
# Extract only architecture information
/wt:info-seek "Microservices patterns" --aspect architecture

# Extract only security considerations
/wt:info-seek https://blog.example.com/oauth-guide --aspect security

# Extract only API documentation
/wt:info-seek "FastAPI endpoints" --aspect API
```

When `--aspect` is specified, the command will:
1. Extract all information from sources
2. Filter and prioritize content matching the specified aspect
3. Add note if relevant information was filtered out
4. Adjust confidence scoring based on aspect-relevance

## Save Workflow (`--save`)

The `--save` option integrates with the Technical Content Workflow by saving extracted materials to the 0-materials/ folder.

### Enhanced Workflow with --save

```
1. Parse command arguments (input, --aspect, --save, --output)
2. Detect topic folder:
   - If 0-materials/ exists in current path -> use it
   - If running from topic root -> use 0-materials/
   - Otherwise -> create or ask user
3. Process input (file/URL/description) with rd2:knowledge-seeker
4. If --aspect provided, filter content accordingly
5. Generate materials-extracted.md with frontmatter:
   - source: original file/URL
   - aspect: --aspect value if provided
   - extracted_at: timestamp
   - topic: detected topic name
6. Update 0-materials/materials.json index
7. Report success with file path
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
      "extracted_at": "2026-01-28T10:00:00Z",
      "word_count": 1500,
      "confidence": "HIGH"
    },
    {
      "id": "mat-002",
      "file": "source-2.md",
      "source": "https://example.com/article",
      "source_type": "url",
      "aspect": null,
      "extracted_at": "2026-01-28T10:30:00Z",
      "word_count": 800,
      "confidence": "MEDIUM"
    }
  ]
}
```

### materials-extracted.md Frontmatter

```markdown
---
title: Extracted Materials: [Topic]
source: research-paper.pdf
source_type: file | url | description
aspect: architecture | performance | security | examples | API | null
extracted_at: 2026-01-28T10:00:00Z
topic: topic-name
word_count: 1500
confidence: HIGH | MEDIUM | LOW
---

# Extracted Materials: [Topic]

## Source

- **File**: research-paper.pdf
- **Type**: PDF Document
- **Extracted**: 2026-01-28

## Extracted Content

[Content extracted from source, filtered by --aspect if provided]

## Confidence

**Level**: HIGH
**Reasoning**: Verified from multiple sources

## Sources

- [Source 1](URL) | **Verified**: YYYY-MM-DD
- [Source 2](URL) | **Verified**: YYYY-MM-DD
```

### File-Based Workflow

The command also supports reading from previously saved materials:

```bash
# Read existing materials-extracted.md and re-filter
/wt:info-seek 0-materials/materials-extracted.md --aspect security
```

This allows you to:
1. Extract and save materials initially
2. Re-process with different aspect filters
3. Update materials.json with new extractions

## Input Types

This command accepts three types of input:

### 1. File Path

Local files that need conversion or analysis:

- PDF documents (`.pdf`)
- Office documents (`.docx`, `.pptx`, `.xlsx`)
- Web pages (`.html`)
- Images with text (`.png`, `.jpg`, `.gif` - OCR)
- Markdown files (`.md`)
- Text files (`.txt`)

**Workflow:**

This command delegates to specialized subagents:

1. `wt:magent-browser` - Converts file to markdown (if needed) using markitdown
2. `rd2:knowledge-seeker` - Extracts, verifies, and synthesizes knowledge
3. Output with citations and confidence level

### 2. URL

Web pages or online documents:

- Blog posts and articles
- Documentation pages
- PDFs from URLs
- News sites

**Workflow:**

This command delegates to specialized subagents:

1. `wt:magent-browser` - Navigates and converts URL to markdown (handles JS-rendered content)
2. `rd2:knowledge-seeker` - Extracts, verifies, and cross-checks with additional sources (ref MCP, WebSearch)
3. Output with citations and confidence level

### 3. Description

Search query or topic description:

- API names (e.g., "React useState hook")
- Framework features (e.g., "FastAPI dependency injection")
- Technical concepts (e.g., "OAuth2 authorization code flow")

**Workflow:**

This command delegates to specialized subagents:

1. `rd2:knowledge-seeker` - Searches documentation (ref MCP), extracts, and verifies
   - Uses multiple sources: ref MCP, WebSearch, mcp__grep__searchGitHub
   - Applies triangulation methodology for credibility assessment
   - Cross-checks with 2+ sources
2. Output with multiple citations and confidence level

## Implementation

This command implements a **subagent delegation pattern** with workflow integration:

```python
# Enhanced implementation with --save support
VALID_ASPECTS = ["architecture", "performance", "security", "examples", "API", "configuration", "troubleshooting"]

def info_seek(input, aspect=None, save=False, output=None):
    # 1. Validate inputs
    if not input or input.strip() == "":
        raise ValueError("Input cannot be empty")

    if aspect and aspect.lower() not in [a.lower() for a in VALID_ASPECTS]:
        logger.warning(f"Unknown aspect '{aspect}'")

    # 2. Detect topic folder (for --save)
    topic_folder = None
    if save or output:
        topic_folder = detect_topic_folder()

    # 3. Input detection and routing
    if input.startswith(('http://', 'https://')):
        input_type = "URL"
    elif os.path.exists(input) or '/' in input or '\\' in input:
        input_type = "FILE_PATH"
    else:
        input_type = "DESCRIPTION"

    # 4. Process input via subagents
    if input_type in ["URL", "FILE_PATH"]:
        delegate_to("wt:magent-browser", {
            "task": "convert_to_markdown",
            "input": input,
            "aspect": aspect
        })
        markdown = get_result()

        delegate_to("rd2:knowledge-seeker", {
            "task": "extract_and_verify",
            "source": markdown,
            "aspect": aspect,
            "source_type": "markdown"
        })
    elif input_type == "DESCRIPTION":
        delegate_to("rd2:knowledge-seeker", {
            "task": "search_and_synthesize",
            "query": input,
            "aspect": aspect,
            "sources": ["ref", "websearch", "searchgithub"]
        })

    output = get_result()

    # 5. Save to workflow (if --save or --output)
    if save or output:
        save_path = output or resolve_workflow_path(topic_folder)
        materials_content = format_for_workflow(output, input, aspect, topic_folder)
        save_to_path(save_path, materials_content)
        update_materials_json(topic_folder, save_path, input, aspect)
        output = f"Saved to: {save_path}\n\n{output}"

    return output
```

## Output Format

Subagents output using this standard format:

```markdown
## [Topic] Information Summary

### Aspect Filter (if --aspect provided)
**Requested Aspect**: {aspect argument}
**Note**: {mention what was filtered out}

### Extracted Information

{Consolidated, verified information filtered by requested aspect}

### Sources

- [Source 1 Title](URL) | **Verified**: YYYY-MM-DD
- [Source 2 Title](URL) | **Verified**: YYYY-MM-DD
- [Source 3 Title](URL) | **Verified**: YYYY-MM-DD

### Confidence

**Level**: HIGH/MEDIUM/LOW
**Reasoning**: {Brief justification}

### Conflicts (if any)

{Any conflicting information with attributions}

### Recommendations (if applicable)

{Actionable insights or next steps}
```

## Error Handling

### Common Issues

**1. File not found**
```
Error: File not found: path/to/document.pdf

Please verify the file path is correct.
```

**2. URL inaccessible**
```
Error: Could not access URL: https://example.com/page

Check if the URL is correct and accessible.
```

**3. No search results**
```
Error: No results found for: "obscure topic"

Try alternative search terms.
```

**4. Topic folder not found (--save)**
```
Error: Topic folder not detected.

Run from within a topic folder or use --output to specify path.
```

**5. 0-materials/ folder missing (--save)**
```
Error: 0-materials/ folder not found.

Create the folder first or run from within a topic folder.
```

## Validation

Before presenting results:

- [ ] Input type correctly identified
- [ ] File/URL accessed successfully
- [ ] Conversion completed (if applicable)
- [ ] Knowledge extracted using appropriate workflow
- [ ] Cross-verified with 2+ sources (for DESCRIPTION)
- [ ] Citations added with dates
- [ ] Confidence level assigned
- [ ] Conflicts flagged (if any)

## Best Practices

### DO

- [ ] Delegate to specialized subagents (wt:magent-browser, rd2:knowledge-seeker)
- [ ] Pass `--aspect` filter to subagents for focused extraction
- [ ] Use `--save` to integrate with Technical Content Workflow
- [ ] Let subagents handle verification with multiple sources
- [ ] Include publication dates in citations (handled by knowledge-seeker)
- [ ] Assign confidence levels based on verification (handled by knowledge-seeker)
- [ ] Update materials.json when using --save

### DON'T

- [ ] Present information without verification
- [ ] Skip confidence scoring
- [ ] Ignore conflicting information
- [ ] Use single source for important claims (DESCRIPTION)
- [ ] Assume file format without checking extension
- [ ] Skip citations for extracted information

## Examples

**Example 1: PDF document**

```bash
/wt:info-seek ~/Documents/research-paper.pdf
```

Delegation flow:
1. Delegates to `wt:magent-browser` -> Converts PDF to markdown
2. Delegates to `rd2:knowledge-seeker` -> Extracts findings, methodology, results
3. Subagent verifies claims with citations
4. Output with confidence level

**Example 2: Blog post with save**

```bash
/wt:info-seek https://blog.example.com/article --save
```

Workflow:
1. Converts blog to markdown
2. Extracts and verifies information
3. Saves to 0-materials/materials-extracted.md
4. Updates materials.json index

**Example 3: Aspect-filtered search**

```bash
/wt:info-seek "React Server Components caching" --aspect performance
```

1. Searches React documentation
2. Filters for performance-related content
3. Outputs performance-focused findings

**Example 4: File-based re-filtering**

```bash
/wt:info-seek 0-materials/materials-extracted.md --aspect security
```

1. Reads existing materials
2. Re-filters for security aspects
3. Updates with new security-focused extraction

## Integration with Technical Content Workflow

This command integrates with the Technical Content Workflow stages:

```
Stage 0: Materials (0-materials/)
         |
         v
Stage 1: Research (1-research/)
         |
         v
Stage 2: Outline (2-outline/)
         |
         v
Stage 3: Draft (3-draft/)
```

**Workflow integration:**

1. `/wt:info-seek <sources> --save` - Stage 0: Materials
2. `/wt:info-research "topic"` - Stage 1: Research
3. `/wt:topic-outline research-brief.md` - Stage 2: Outline
4. `/wt:topic-draft <profile>` - Stage 3: Draft

## Integration with Subagents

This command delegates to specialized subagents:

- **wt:magent-browser** - Browser automation, document conversion
- **rd2:knowledge-seeker** - Literature review, multi-source verification, evidence synthesis

### Subagent Tool Access

These subagents have access to MCP tools:
- **ref MCP** - Official documentation search
- **WebSearch** - Recent information validation
- **mcp__grep__searchGitHub** - Code example verification

## Related Commands

- `/wt:info-research` - Conduct research and generate research brief
- `/wt:topic-outline` - Generate outlines from research
- `/wt:topic-draft` - Apply writing style to content
- `/rd2:knowledge-seeker` - Deep research and synthesis tasks

---

**Remember**: Verification before synthesis. Always cite sources with dates. Assign confidence levels based on verification quality. Use --save to integrate with the Technical Content Workflow.
