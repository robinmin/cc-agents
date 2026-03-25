---
name: tool-selection
description: "MCP and built-in tool selection for information extraction: ref, WebSearch, WebFetch, Read, rd3:quick-grep, and source-type decision trees."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [research, verification, tools, knowledge-extraction, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
see_also:
  - rd3:knowledge-extraction
  - rd3:knowledge-extraction/references/validation-methods
  - rd3:knowledge-extraction/references/conflict-resolution
  - rd3:knowledge-extraction/references/deduplication
  - rd3:knowledge-extraction/references/synthesis-patterns
  - rd3:anti-hallucination
---

# Tool Selection for Knowledge Seeking

This reference provides detailed guidance on selecting the appropriate tools for information extraction and verification.

## MCP Tools (Priority Layer)

### `ref` - Documentation Verification

**Best for:**
- API/library official documentation
- Framework-specific guides
- Language references (Python, TypeScript, Go, etc.)

**Usage:**
```
ref_search_documentation: "Python requests library post method 2024"
```

**Advantages:**
- Direct access to official documentation
- Always returns current information
- High credibility source

**Fallback Chain:**
- WebFetch (for specific URLs)
- WebSearch (for general searches)

---

### `mcp__grep__searchGitHub` - Code Examples

**Best for:**
- Finding usage patterns in real code
- Discovering implementation examples
- Verifying how libraries are used in production

**Usage:**
```
mcp__grep__searchGitHub: "useState React hook"
mcp__grep__searchGitHub: "pytest fixture decorator"
```

**Advantages:**
- Real-world code examples
- Community usage patterns
- Version-specific implementations

**Fallback Chain:**
- WebFetch (for README/docs in repos)
- WebSearch (for general code patterns)

---

### `WebSearch` - Web Research

**Best for:**
- Recent facts and announcements (< 6 months)
- Industry trends
- Current best practices
- Breaking changes

**Usage:**
```
WebSearch: "TypeScript 5.3 new features 2024"
WebSearch: "React Server Components 2024"
```

**Advantages:**
- Current information
- Multiple perspectives
- Quick fact-checking

**Fallback Chain:**
- ref (for documentation)
- WebFetch (for specific articles)

---

## Built-in Tools

### `WebFetch` - Static Content

**Use cases:**
- Specific URLs (blog posts, documentation)
- Fast, low token consumption
- Token-efficient extraction

**When to use:**
- You have a specific URL to fetch
- Content is static HTML (not JS-rendered)
- Need to extract text from known sources

**Limitations:**
- Cannot handle JavaScript-rendered content
- May miss dynamically loaded content

---

### `Read` - Local Files

**Use cases:**
- Project files (code, configs, docs)
- Source code pattern analysis

**When to use:**
- Information is in local codebase
- Need to analyze specific files
- Working with project documentation

---

### `rd3:quick-grep` - Codebase Search

**Use cases:**
- Pattern matching in local code
- Finding function definitions
- Choosing between text search and structural search

**When to use:**
- Searching for specific code patterns
- Finding where functions are called
- Analyzing code structure with `rg` or `sg` through the rd3 wrapper

---

## Source Type Handling

### PDFs

| Primary Tool | Secondary Tools | Notes |
|--------------|-----------------|-------|
| Read (pdfplumber) | OCR (pytesseract) | Best for text extraction; OCR for scanned docs |

**Extraction workflow:**
1. Use Read tool for standard PDFs
2. Falls back to OCR for image-based PDFs
3. Verify extracted text with source

---

### Web Pages

| Primary Tool | Secondary Tools | Notes |
|--------------|-----------------|-------|
| WebFetch | wt:magent-browser (JS-rendered) | Static content first; browser for dynamic |

**Decision tree:**
```
IF static HTML/documentation needed:
    Use WebFetch FIRST (fastest, ~1500 tokens)
    Fallback: wt:magent-browser
IF JavaScript-rendered content:
    Use wt:magent-browser (renders JS)
IF screenshots or visual verification needed:
    Use wt:magent-browser (only option)
```

---

### Code Files

| Primary Tool | Secondary Tools | Notes |
|--------------|-----------------|-------|
| rd3:quick-grep | Read | Wrapper selects `rg` for text and `sg` for structural queries |

**When to use which:**
- **`rd3:quick-grep`**: Default entry point for local search and structural code lookup
- **`Read`**: Inspect exact files once the target path or snippet is known

---

### API Documentation

| Primary Tool | Secondary Tools | Notes |
|--------------|-----------------|-------|
| ref | WebFetch -> WebSearch | Start with MCP; fallback to web tools |

**Verification workflow:**
1. Use ref for official docs
2. Cross-check with WebFetch for specific pages
3. Use WebSearch for recent changes

---

### GitHub Repositories

| Primary Tool | Secondary Tools | Notes |
|--------------|-----------------|-------|
| mcp__grep__searchGitHub | WebFetch | Fast GitHub search; fetch for READMEs |

**Usage patterns:**
- Search for code patterns
- Find usage examples
- Verify implementation approaches

---

### Research Papers

| Primary Tool | Secondary Tools | Notes |
|--------------|-----------------|-------|
| `mcp__huggingface__paper_search` | WebSearch | Academic source first; general web as fallback |
| `mcp__huggingface__hf_doc_search` | WebFetch | HF documentation and product guides |

**Access strategy:**
1. Search HuggingFace papers via `mcp__huggingface__paper_search` for ML/AI research
2. Use `mcp__huggingface__hf_doc_search` for HuggingFace product documentation
3. Use WebSearch for general academic papers
4. Verify with official sources when possible

**Example usage:**
```
mcp__huggingface__paper_search: query="chain of verification LLM hallucination 2025", results_limit=10
```

---

### Weave Traces for Verification (SOTA)

For verifying how tools or libraries are actually used in production, `mcp__wandb__query_weave_traces_tool` provides real execution traces from AI applications.

| Primary Tool | Secondary Tools | Notes |
|--------------|-----------------|-------|
| `mcp__wandb__query_weave_traces_tool` | WebSearch | Production usage evidence from Weave-traced apps |
| `mcp__wandb__count_weave_traces_tool` | — | Quick count of traces matching criteria |

**Access strategy:**
1. Use `count_weave_traces_tool` to assess whether traces exist for a tool/pattern
2. Use `query_weave_traces_tool` with `metadata_only=True` for quick survey
3. Use full trace queries for detailed call patterns, latency, token usage
4. Cross-reference with official docs for authoritative verification

**Example usage:**
```
# Check if a library has production trace evidence
mcp__wandb__count_weave_traces_tool: entity_name="example-org", project_name="ai-app", filters={"op_name_contains": "langchain"}

# Get actual usage patterns
mcp__wandb__query_weave_traces_tool: entity_name="example-org", project_name="ai-app",
  filters={"op_name_contains": "openai", "trace_roots_only": true},
  columns=["op_name", "inputs", "outputs", "status"],
  metadata_only=false
```

**Key filters for knowledge verification:**
- `op_name_contains`: Match tool/library name (e.g., "langchain", "openai", "claude")
- `trace_roots_only`: Only top-level calls (not nested internals)
- `status`: "success" or "error" for reliability assessment
- `time_range`: Recent traces for currency check

---

## Tool Selection Decision Tree

```
IF searching for API/library documentation:
    Use ref (MCP)
    Fallback: WebFetch -> WebSearch

IF searching GitHub content:
    Use mcp__grep__searchGitHub (MCP)
    Fallback: WebFetch -> WebSearch

IF searching local codebase:
    Use rd3:quick-grep
    Use Read for specific files

IF accessing specific URL:
    Use WebFetch for static content
    Use wt:magent-browser for JS-rendered content

IF needing recent facts (< 6 months):
    Use WebSearch
    Fallback: ref -> WebFetch

IF needing screenshots/visual verification:
    Use wt:magent-browser (only option)
```

---

## Priority Summary

**Tool Priority (highest to lowest):**

1. **MCP Tools** (ref, searchGitHub, brave-search) - Fast, credible, specialized
2. **wt:magent-browser** - JS-rendered content, screenshots, forms
3. **WebFetch** - Static content, specific URLs
4. **WebSearch** - Recent information, general queries
5. **rd3:quick-grep + Read** - Local codebase analysis

---

## Token Efficiency

When working with token limits:

1. **Start with MCP tools** - Typically 500-1500 tokens
2. **Use WebFetch for specific URLs** - ~1500 tokens
3. **Avoid agent-browser for simple pages** - Higher token cost
4. **Use `rd3:quick-grep` for local discovery first** - Faster than web searches
