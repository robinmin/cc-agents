# Auggie vs Gemini Tool Comparison

Detailed comparison between Auggie (code-review-auggie) and Gemini (code-review-gemini) code review skills.

## Quick Reference

| Aspect              | Gemini (code-review-gemini)    | Auggie (code-review-auggie)       |
| ------------------- | ------------------------------ | ---------------------------------- |
| **Interface**       | Subprocess (gemini CLI)        | MCP tool (codebase-retrieval)     |
| **Context**         | Manually gathered file content | Semantic codebase index           |
| **Speed**           | Network request to Gemini API  | Local semantic search             |
| **Awareness**       | Needs explicit file content    | Knows entire codebase structure   |
| **Best For**        | External analysis perspective  | Context-aware internal review     |

---

## Detailed Comparison

### Interface and Architecture

**Gemini:**
- Uses `gemini` CLI via subprocess calls
- Requires Google Cloud authentication
- Network round-trip for each query
- Stateless - no awareness between queries

**Auggie:**
- Uses MCP tool `codebase-retrieval`
- Runs locally as MCP server
- In-memory semantic index
- Maintains codebase context

### Context Awareness

**Gemini:**
```python
# Must explicitly provide file content
with open('src/auth/login.py') as f:
    content = f.read()
# Pass content to gemini for analysis
```

**Auggie:**
```python
# Auggie knows the entire codebase structure
# Query semantic relationships directly
"Show me authentication flow in this codebase"
```

### Performance Characteristics

| Metric        | Gemini                    | Auggie                  |
| ------------- | ------------------------- | ----------------------- |
| **Latency**   | Network dependent (~1-3s)  | Local (~100-500ms)      |
| **Throughput**| API rate limited          | Limited by index size   |
| **Cold Start**| Authentication required   | Index build on first use|

### Use Case Guidance

| Scenario                  | Recommended Tool | Reason                                    |
| ------------------------- | ---------------- | ----------------------------------------- |
| Internal code review      | Auggie           | Knows codebase structure and patterns     |
| Architecture analysis     | Auggie           | Semantic understanding of dependencies    |
| Security audit            | Auggie or Gemini | Auggie for patterns, Gemini for fresh eyes |
| External perspective      | Gemini           | Unbiased outside view                     |
| Quick question            | Auggie           | Fast local semantic search                |
| Complex reasoning         | Gemini           | More capable reasoning model               |
| PR review (new code)      | Gemini           | No index bias against new patterns        |
| Legacy code analysis      | Auggie           | Deep understanding of existing patterns   |

### When to Combine Both

For critical reviews, use both tools:

```bash
# Get Auggie's context-aware analysis
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review src/ \
  --output auggie-review

# Get Gemini's external perspective
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review src/ \
  --output gemini-review

# Compare and synthesize findings
```

### Feature Parity

Both tools support:
- Multi-focus reviews (security, performance, testing, quality, architecture)
- Structured output with YAML frontmatter
- Task file generation via `import` command
- Planning mode for architecture analysis
- Custom output file names

### Strengths and Weaknesses

**Auggie Strengths:**
- Semantic codebase understanding
- Fast local queries
- Awareness of established patterns
- Relationship mapping between files

**Auggie Weaknesses:**
- Requires codebase indexing
- May miss novel approaches
- Limited to indexed code

**Gemini Strengths:**
- Powerful reasoning capabilities
- Fresh perspective on code
- No indexing requirement
- Handles novel patterns well

**Gemini Weaknesses:**
- Slower (network dependent)
- No inherent codebase context
- Requires manual file gathering
- API rate limits

---

## Migration from Gemini to Auggie

If you're familiar with `code-review-gemini`, the transition is straightforward:

```bash
# Gemini command
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-gemini/scripts/code-review-gemini.py review src/

# Auggie command (same interface)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-auggie/scripts/code-review-auggie.py review src/
```

Key differences to note:
1. No need to gather files manually - Auggie knows your codebase
2. Faster responses - no network round-trip
3. Different query style - ask semantic questions, not just describe files

---

## See Also

- `../SKILL.md` - Main skill documentation
- `usage-examples.md` - Comprehensive usage examples
- `auggie-query-patterns.md` - Effective Auggie query patterns
