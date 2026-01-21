# Tool Usage Guide

Detailed examples of how to use MCP tools correctly for different verification scenarios.

## Example 1: API Documentation

**Task**: Find how to use `axios` interceptors

```bash
# CORRECT: Use ref_search_documentation for documentation
ref_search_documentation "axios interceptors official documentation"

# Then read the specific URL
ref_read_url "https://axios-http.com/docs/interceptors"

# WRONG: Don't start with WebSearch for docs
WebSearch "axios interceptors"  # Less reliable
```

**Why this works:**
- `ref_search_documentation` searches indexed documentation directly
- `ref_read_url` fetches full content of specific documentation URL
- WebSearch may return outdated or third-party tutorials

## Example 2: GitHub Code Search

**Task**: Find examples of `useState` usage in React

```bash
# CORRECT: Use searchCode for code
searchCode "useState(" language=TypeScript path=src/components

# WRONG: Don't use generic grep or web search
grep -r "useState" ./  # Only finds local files
WebSearch "useState example"  # May find outdated info
```

**Why this works:**
- `searchCode` searches across millions of public GitHub repositories
- Language and path filters provide relevant, real-world examples
- Local grep only finds files in your project
- WebSearch may return outdated code examples

## Example 3: Framework Method Verification

**Task**: Verify FastAPI route parameter syntax

```bash
# CORRECT: Search official docs first
ref_search_documentation "FastAPI path parameters official documentation"

# Then verify with source if needed
ref_read_url "https://fastapi.tiangolo.com/tutorial/path-params/"
```

**Why this works:**
- Official documentation is always the most reliable source
- `ref_search_documentation` prioritizes official docs over tutorials
- Two-step approach: search broad, then read specific

## Example 4: Recent Changes Detection

**Task**: Find Python 3.13 new features

```bash
# CORRECT: Use WebSearch for very recent changes
WebSearch "Python 3.13 new features 2024 2025"

# May need ref_search_documentation for official docs afterward
ref_search_documentation "Python 3.13 what's new"
```

**Why this approach:**
- WebSearch finds release announcements, blog posts, news
- `ref_search_documentation` then finds official documentation
- Recent changes may not yet be indexed in documentation search

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Correct Approach |
|---------|---------------|------------------|
| Using WebSearch for APIs | May find outdated tutorials | Use `ref_search_documentation` |
| Using local grep only | Limited to your codebase | Use `searchCode` for examples |
| Not citing sources | Can't verify claims | Always include source URL |
| Ignoring version | APIs change between versions | Always specify version |
| Memory-based answers | Prone to hallucination | Search first, then answer |

## Tool Selection Quick Reference

```
┌─────────────────────────────────────────────────────────────┐
│ What type of information do you need?                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   Official Docs        GitHub Code          Everything Else
   (APIs, libraries)    (source examples)    (recent news, facts)
        │                     │                     │
        ▼                     ▼                     ▼
   ref_search_documentation   searchCode          WebSearch
   (mcp__ref)                  (mcp__grep)           (fallback)
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                        If tool fails:
                        WebFetch (specific URL)
                        Read/Grep (local codebase)
                        State "UNVERIFIED"
```

## Advanced Usage

### Combining Multiple Tools

For comprehensive verification:

```bash
# Step 1: Search documentation
ref_search_documentation "library feature documentation"

# Step 2: Find code examples
searchCode "feature_name" language=Python

# Step 3: Cross-reference with official source
ref_read_url "https://official-docs-url/feature"

# Step 4: Check for recent changes
WebSearch "library feature breaking changes 2024 2025"
```

### Language-Specific Queries

```bash
# Python
ref_search_documentation "python asyncio sleep official documentation"

# JavaScript/TypeScript
ref_search_documentation "typescript utility types official documentation"

# Go
ref_search_documentation "go goroutines cancelcontext official documentation"

# Rust
ref_search_documentation "rust lifetime annotations official documentation"
```

### API-Specific Queries

```bash
# Authentication
ref_search_documentation "API authentication OAuth2 flow"

# Error handling
ref_search_documentation "library exception handling best practices"

# Performance
ref_search_documentation "database connection pooling optimization"
```

## Tips for Effective Searches

1. **Be specific**: Include library name, method, and "official documentation"
2. **Use version numbers**: "React 19" not just "React"
3. **Add context**: "authentication flow" not just "auth"
4. **Search broadly first**, then narrow down
5. **Cross-reference**: Check multiple sources for consensus

## See Also

- `../SKILL.md` - Main protocol and quick reference
- `anti-hallucination-research.md` - Research backing these techniques
- `prompt-patterns.md` - Detailed prompt engineering patterns
