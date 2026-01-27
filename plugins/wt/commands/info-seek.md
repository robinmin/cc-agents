---
description: Extract and verify knowledge from files, URLs, or search queries
subagents: [rd2:knowledge-seeker, wt:magent-browser]
model: sonnet
argument-hint: <file-path-or-url-or-description> [--aspect <aspect>]
allowed-tools: [Read, Write, Edit, Bash]
arguments:
  aspect:
    description: Optional aspect to filter information (e.g., architecture, performance, security, examples, API)
    required: false
    type: string
---

# Info Seek

Extract, verify, and synthesize knowledge from multiple sources with proper citation and confidence scoring. This command delegates to specialized subagents for document conversion and knowledge extraction.

## Quick Start

```bash
/wt:info-seek path/to/document.pdf              # Extract from PDF
/wt:info-seek https://example.com/article       # Extract from URL
/wt:info-seek "React Server Components"         # Search and extract
/wt:info-seek "React Server Components" --aspect architecture  # Filter by aspect
```

## When to Use

Use this command when you need to:

- **Extract knowledge from documents** - PDFs, Office docs, images with OCR, web pages
- **Verify information from multiple sources** - Cross-check claims with citations and confidence scoring
- **Research technical topics** - Search documentation, synthesize findings, identify conflicts
- **Filter by specific aspects** - Focus on architecture, security, performance, API, etc.

**Not for:**
- Interactive web tasks requiring screenshots → Use `/wt:magent-browser` directly
- Manual document conversion → Use `markitdown` CLI directly
- Simple web scraping without verification → Use `curl` or `wt:magent-browser`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<input>` | Yes | File path, URL, or search description |
| `--aspect` | No | Optional aspect to filter results (e.g., architecture, performance, security, examples, API) |

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

This command implements a **subagent delegation pattern** — it detects input type and routes to appropriate subagents with their specialized capabilities.

### Subagent Capabilities

| Subagent | Capabilities |
|----------|-------------|
| **wt:magent-browser** | Browser automation, screenshots, JS-rendered content, form interaction, markitdown document conversion |
| **rd2:knowledge-seeker** | Literature review, multi-source verification, evidence synthesis, fact-checking, citation formatting, confidence scoring |

### Input Detection & Routing

```python
# Input validation
VALID_ASPECTS = ["architecture", "performance", "security", "examples", "API", "configuration", "troubleshooting"]

if not input or input.strip() == "":
    raise ValueError("Input cannot be empty. Provide file path, URL, or search description.")

if aspect and aspect.lower() not in [a.lower() for a in VALID_ASPECTS]:
    logger.warning(f"Unknown aspect '{aspect}'. Valid aspects: {', '.join(VALID_ASPECTS)}")

# Input detection and subagent delegation
if input.startswith(('http://', 'https://')):
    input_type = "URL"
elif os.path.exists(input) or '/' in input or '\\' in input:
    input_type = "FILE_PATH"
else:
    input_type = "DESCRIPTION"

# Delegate to appropriate subagent
if input_type in ["URL", "FILE_PATH"]:
    delegate_to("wt:magent-browser", {
        "task": "convert_to_markdown",
        "input": input,
        "aspect": aspect  # Pass through --aspect filter
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
```

### Subagent Task Specification

**wt:magent-browser tasks:**

- `convert_to_markdown` - Convert file/URL to markdown using markitdown
  - Handles PDFs, Office docs, images (OCR), HTML
  - Supports JS-rendered content via browser automation
  - Returns clean markdown text

**rd2:knowledge-seeker tasks:**

- `extract_and_verify` - Extract knowledge from markdown source
  - Applies triangulation methodology
  - Cross-verifies with ref MCP, WebSearch, searchGitHub
  - Filters by `--aspect` if provided
  - Outputs with citations, confidence levels

- `search_and_synthesize` - Research topic via documentation search
  - Uses ref MCP for official docs
  - Cross-verifies with 2+ sources
  - Filters by `--aspect` if provided
  - Synthesizes with conflict detection
  - Outputs with citations, confidence levels

### Aspect Filter Propagation

When `--aspect` is provided, it propagates to subagents:

```python
# Pass aspect filter to subagents
delegate_to("rd2:knowledge-seeker", {
    "task": "extract_and_verify",
    "source": markdown,
    "aspect": aspect  # e.g., "architecture", "security"
})

# Subagent applies aspect filtering during extraction
# - Prioritizes content matching aspect
# - Notes if irrelevant content filtered
# - Adjusts confidence based on aspect-relevance
```

### Output Format

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

**Aspect filtering behavior** (handled by subagents):
- Extract all information first
- Filter and prioritize by aspect if `--aspect` provided
- Add note if relevant content was filtered out
- Adjust confidence scoring based on aspect-relevance

## Error Handling

### Common Issues

**1. File not found**
- Verify file path is correct
- Check file permissions
- Suggest similar files if available

**2. URL inaccessible**
- Check URL format
- Try with and without redirects
- Inform if paywall/login required

**3. No search results**
- Refine search query
- Try alternative terms
- Suggest broader topic

**4. Conversion failure**
- Check file format is supported
- Verify markitdown installation
- Try alternative conversion method

**5. Verification fails**
- Note as UNVERIFIED in output
- Explain why verification failed
- Suggest manual review

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
- [ ] Let subagents handle verification with multiple sources
- [ ] Include publication dates in citations (handled by knowledge-seeker)
- [ ] Assign confidence levels based on verification (handled by knowledge-seeker)
- [ ] Flag conflicting information (handled by knowledge-seeker)
- [ ] Use official documentation as primary source (handled by knowledge-seeker)

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
1. Delegates to `wt:magent-browser` → Converts PDF to markdown
2. Delegates to `rd2:knowledge-seeker` → Extracts findings, methodology, results
3. Subagent verifies claims with citations
4. Output with confidence level

**Example 2: Blog post**

```bash
/wt:info-seek https://blog.example.com/how-to-use-fastapi
```

Delegation flow:
1. Delegates to `wt:magent-browser` → Converts blog to markdown
2. Delegates to `rd2:knowledge-seeker` → Extracts FastAPI usage patterns
3. Subagent cross-verifies with official FastAPI docs
4. Output with multiple citations

**Example 3: API search**

```bash
/wt:info-seek "React Server Components caching"
```

Delegation flow:
1. Delegates to `rd2:knowledge-seeker` → Searches React docs via ref MCP
2. Subagent extracts caching information
3. Subagent cross-verifies with React blog and GitHub
4. Subagent synthesizes with triangulation
5. Output with HIGH/MEDIUM/LOW confidence

## Integration with Subagents

This command delegates to specialized subagents:

- **wt:magent-browser** - Browser automation, document conversion (PDFs, Office docs, images, web pages)
- **rd2:knowledge-seeker** - Literature review, multi-source verification, evidence synthesis, fact-checking

### Subagent Tool Access

These subagents have access to MCP tools:
- **ref MCP** - Official documentation search
- **WebSearch** - Recent information validation
- **mcp__grep__searchGitHub** - Code example verification

## Related Commands

- `/wt:style-extractor` - Extract styling information from documents
- `/wt:translate` - Translate documents to different languages
- `/rd2:knowledge-seeker` - Deep research and synthesis tasks

---

**Remember**: Verification before synthesis. Always cite sources with dates. Assign confidence levels based on verification quality.
