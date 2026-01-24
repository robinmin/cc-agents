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

### `mcp__brave-search__brave_web_search` - Web Research

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

### `WebSearch` - Recent Information

**Use cases:**
- Recent facts, announcements (< 6 months)
- Current best practices (2024+)
- Industry trends and opinions
- Quick fact verification

**When to use:**
- Information may have changed recently
- Need current community consensus
- Checking for recent updates/releases

---

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
- PDF extraction (via pdfplumber)
- Source code pattern analysis

**When to use:**
- Information is in local codebase
- Need to analyze specific files
- Working with project documentation

---

### `Grep` - Codebase Search

**Use cases:**
- Pattern matching in local code
- Finding function definitions
- Searching for usage patterns

**When to use:**
- Searching for specific code patterns
- Finding where functions are called
- Analyzing code structure

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
| WebFetch | rd:agent-browser (JS-rendered) | Static content first; browser for dynamic |

**Decision tree:**
```
IF static HTML/documentation needed:
    Use WebFetch FIRST (fastest, ~1500 tokens)
    Fallback: rd:agent-browser
IF JavaScript-rendered content:
    Use rd:agent-browser (renders JS)
IF screenshots or visual verification needed:
    Use rd:agent-browser (only option)
```

---

### Code Files

| Primary Tool | Secondary Tools | Notes |
|--------------|-----------------|-------|
| Grep | ast-grep (structural) | Pattern matching; AST for structural queries |

**When to use which:**
- **Grep**: Exact string/identifier matching
- **ast-grep**: Structural pattern matching (e.g., "useState(", "async function")

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
| huggingface (papers) | WebSearch | Academic source first; general web as fallback |

**Access strategy:**
1. Search HuggingFace papers for ML/AI research
2. Use WebSearch for general academic papers
3. Verify with official sources when possible

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
    Use Grep for exact patterns
    Use ast-grep for structural patterns
    Use Read for specific files

IF accessing specific URL:
    Use WebFetch for static content
    Use rd:agent-browser for JS-rendered content

IF needing recent facts (< 6 months):
    Use WebSearch
    Fallback: ref -> WebFetch

IF needing screenshots/visual verification:
    Use rd:agent-browser (only option)
```

---

## Priority Summary

**Tool Priority (highest to lowest):**

1. **MCP Tools** (ref, searchGitHub, brave-search) - Fast, credible, specialized
2. **rd:agent-browser** - JS-rendered content, screenshots, forms
3. **WebFetch** - Static content, specific URLs
4. **WebSearch** - Recent information, general queries
5. **Grep/Read** - Local codebase analysis
6. **ast-grep** - Structural code patterns

---

## Token Efficiency

When working with token limits:

1. **Start with MCP tools** - Typically 500-1500 tokens
2. **Use WebFetch for specific URLs** - ~1500 tokens
3. **Avoid agent-browser for simple pages** - Higher token cost
4. **Grep local files first** - Faster than web searches
