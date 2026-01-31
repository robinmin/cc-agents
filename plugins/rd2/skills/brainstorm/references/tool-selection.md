# Tool Selection Guide for Research

This guide details tool selection for research and verification during brainstorm. For the integrated workflow, see `workflows.md`.

## Tool Priority Order

```
1. ref_search_documentation (ref) - Documentation verification
2. WebSearch - Recent facts, announcements (< 6 months)
3. rd2:knowledge-seeker - Literature review, synthesis
4. Local tools - Read/Grep for project content
```

## Decision Tree

```
IF researching API/library usage:
├── Use ref_search_documentation FIRST
├── Fallback: WebSearch (if ref unavailable)
└── Last resort: wt:magent-browser (for JS-rendered docs)

IF researching GitHub code patterns:
├── Use mcp__grep__searchGitHub FIRST
├── Fallback: WebSearch
└── Last resort: Manual browsing

IF researching recent changes (<6 months):
├── Use WebSearch FIRST
├── Fallback: ref_search_documentation
└── Last resort: Release notes/changelogs

IF performing literature review:
├── Use rd2:knowledge-seeker FIRST
├── Fallback: WebSearch
└── Last resort: ref_read_url for specific papers

IF searching local codebase:
├── Use Read/Grep (native tools)
└── No fallback needed
```

## Tool-by-Tool Guidance

### 1. ref_search_documentation

**Best for:** API/library documentation, official guides

**When to use:**
- Researching specific API methods or parameters
- Verifying library usage patterns
- Checking official documentation for frameworks
- Validating configuration options

**Query patterns:**
```
ref_search_documentation "{library} {method/feature} official documentation"

Examples:
- "FastAPI authentication official documentation"
- "React useEffect dependency array"
- "Python asyncio create_task"
```

**Output format:**
- Direct links to official docs
- Code examples from sources
- Version-specific information
- Related API references

### 2. WebSearch

**Best for:** Recent facts, announcements, comparisons

**When to use:**
- Finding information from last 6 months
- Researching multiple approaches/comparisons
- Discovering new tools or libraries
- Checking for deprecations or breaking changes

**Query patterns:**
```
WebSearch "{query} 2024 2025 best practices"

Examples:
- "FastAPI vs Flask authentication 2024"
- "Python async patterns best practices"
- "React Server Components migration guide"
```

**Output format:**
- Multiple sources with dates
- Comparison information
- Recent trends and opinions
- Community discussions

### 3. rd2:knowledge-seeker

**Best for:** Literature review, cross-referencing, synthesis

**When to use:**
- Complex research requiring multiple sources
- Academic or technical whitepapers
- Cross-referencing claims across sources
- Evidence synthesis for technical decisions

**Query patterns:**
```
Invoke rd2:knowledge-seeker with:
- Research question or topic
- Specific claims to verify
- Sources to cross-reference
```

**Output format:**
- Synthesized findings from multiple sources
- Confidence levels with evidence
- Conflicts or contradictions noted
- Citation list with dates

### 4. Local Tools (Read/Grep)

**Best for:** Project-specific context

**When to use:**
- Understanding existing codebase patterns
- Finding similar implementations
- Checking project conventions
- Reading existing documentation

**Query patterns:**
```
Read: /path/to/file
Grep: "pattern" --include="*.py"
```

## Tool-Specific Best Practices

### ref_search_documentation

- **Always use first** for API/library questions
- **Include version** if specific version matters
- **Verify recency** - check document dates
- **Cross-reference** if documentation seems outdated

### WebSearch

- **Include year** in queries for recent information
- **Use specific phrases** for better results
- **Check multiple sources** before concluding
- **Verify source credibility** (official docs > blogs > forums)

### rd2:knowledge-seeker

- **Use for complex research** - don't overuse for simple queries
- **Provide context** - what decision needs to be made
- **Specify constraints** - time, resources, compatibility
- **Ask for synthesis** - not just raw findings

### Local Tools

- **Search broadly first** - then narrow down
- **Check multiple file types** - not just code
- **Look for patterns** - not just exact matches
- **Read context** - not just matching lines

## Fallback Protocol

### ref_search_documentation unavailable

```
1. Try WebSearch with "official documentation" keyword
2. Try wt:magent-browser for JS-rendered docs
3. State: "Could not access official docs, using secondary sources"
4. Reduce confidence to MEDIUM
```

### WebSearch returns outdated results

```
1. Add "2024" or "2025" to query
2. Check official release notes/changelogs
3. Use ref_read_url for specific documentation pages
4. State: "Information may be outdated, verify recency"
```

### rd2:knowledge-seeker unavailable

```
1. Use WebSearch with multiple queries
2. Cross-reference findings manually
3. Use ref_search_documentation for each claim
4. State: "Limited synthesis capability, manual cross-referencing"
```

## Confidence Adjustment by Tool

| Tool Used | Confidence Cap | Reasoning |
|-----------|----------------|-----------|
| ref_search_documentation (2024+ docs) | HIGH | Official, authoritative, recent |
| ref_search_documentation (older docs) | MEDIUM | Official but may be outdated |
| WebSearch (multiple official sources) | MEDIUM | Authoritative but indirect |
| WebSearch (community sources) | LOW-MEDIUM | Less authoritative, may be outdated |
| rd2:knowledge-seeker | MEDIUM-HIGH | Synthesized but needs verification |
| Local tools only | N/A | Project-specific, no external claims |

## Common Research Scenarios

### Scenario 1: New API Integration

```
1. ref_search_documentation "{API} official documentation"
2. WebSearch "{API} examples best practices 2024"
3. Local: Grep for similar integrations in codebase
4. Synthesize findings with confidence scoring
```

### Scenario 2: Framework Comparison

```
1. WebSearch "{framework1} vs {framework2} 2024 comparison"
2. ref_search_documentation for each framework
3. Look for benchmark comparisons
4. Note trade-offs with confidence levels
```

### Scenario 3: Debugging Existing Code

```
1. Local: Read the problematic code
2. Local: Grep for similar patterns in codebase
3. WebSearch "{error message} solution"
4. ref_search_documentation for related APIs
5. Synthesize solution with verification
```

### Scenario 4: Architecture Decision

```
1. rd2:knowledge-seeker for comprehensive research
2. WebSearch for recent trends and best practices
3. ref_search_documentation for official recommendations
4. Local: Check existing architecture patterns
5. Synthesize with trade-off analysis
```

## Anti-Hallucination Integration

All research follows `rd2:anti-hallucination` protocol:

1. **Search before answering** - Always verify first
2. **Cite sources** - Include URL and date
3. **Score confidence** - HIGH/MEDIUM/LOW based on sources
4. **State uncertainty** - Explicitly note when uncertain
5. **Check version** - Note version-specific behavior

For complete anti-hallucination guidance, see `rd2:anti-hallucination`.
