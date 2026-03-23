---
name: knowledge-extraction
description: "Extract, synthesize, and validate information from multiple sources with cross-verification, deduplication, and source attribution. Trigger when: researching APIs/libraries/frameworks, verifying facts, consolidating from PDFs/web/code, cross-referencing docs, fact-checking claims, investigating version-specific behavior, or gathering architectural decision info."
license: Apache-2.0
version: 1.0.1
created_at: 2026-03-23
updated_at: 2026-03-23
type: technique
tags: [research, verification, synthesis, knowledge, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
see_also:
  - rd3:anti-hallucination
  - rd3:sys-debugging
---

# rd3:knowledge-extraction — Information Extraction and Synthesis

Systematic information extraction, verification, and synthesis from multiple sources. Transforms raw data into verified, citable knowledge with confidence scoring.

## Overview

This skill guides the systematic gathering of information from multiple sources with cross-verification, deduplication, and proper attribution. It covers four extraction workflows (single-source, multi-source, aspect-based, and consolidation), confidence scoring, anti-patterns, and output formatting.

## When to Use

Activate this skill when:

- Researching APIs, libraries, or frameworks
- Verifying facts across multiple sources
- Consolidating information from PDFs, web pages, or code files
- Synthesizing knowledge with confidence scoring and proper attribution
- Cross-referencing documentation to resolve ambiguity
- Fact-checking claims made in chat or documents
- Investigating version-specific API behavior
- Gathering information for architectural decisions
- Responding to "what is X?" or "how does Y work?" questions

**Key distinction:**
- **`rd3:knowledge-extraction`** = Information extraction, verification, and synthesis
- **Other skills** = Information access (execution, debugging, testing)

## Core Principles

### 1. Verification Before Synthesis [CRITICAL]

**Never present information without verification.**

```
EXTRACT → VERIFY → CONSOLIDATE → CITE
```

- Extract information from primary source
- Cross-verify with 2+ independent sources
- Flag conflicts for manual resolution
- Always attribute sources

### 2. Confidence Scoring

| Level | Score | Criteria |
|-------|-------|----------|
| **HIGH** | >90% | Direct quotes from official docs (2024+), verified today |
| **MEDIUM** | 70-90% | Synthesized from 2+ authoritative sources |
| **LOW** | <70% | Unclear sourcing, outdated, single source |
| **UNVERIFIED** | 0% | No sources found — do not present |

### 3. Tool Priority

1. **`ref` (MCP)** — API/Library official documentation
2. **`mcp__grep__searchGitHub`** — GitHub code examples
3. **`WebSearch`** — Recent facts (< 6 months)
4. **`WebFetch`** — Static content, specific URLs
5. **`rd3:quick-grep` + `Read`** — Local codebase discovery and file inspection

### 4. Credibility Hierarchy

1. **Official documentation** (python.org, react.dev) — HIGHEST
2. **Official engineering blogs** (Google, Meta, OpenAI) — HIGH
3. **Well-maintained GitHub repos** — MEDIUM-HIGH
4. **Peer-reviewed papers** — MEDIUM
5. **Technical blogs** — MEDIUM
6. **StackOverflow, forums** — LOW-MEDIUM

## Quick Start

**Basic extraction workflow:**

```
Source: file.pdf or https://example.com
Aspect: "authentication mechanisms"
```

**Step 1: EXTRACT** — Identify relevant information
- Scan source for aspect-related content
- Extract key facts, patterns, relationships

**Step 2: VERIFY** — Cross-check with other sources
- Use `ref` for official documentation
- Use `WebSearch` for recent validation

**Step 3: CONSOLIDATE** — Merge and deduplicate
- Combine verified information
- Remove duplicates
- Resolve conflicts

**Step 4: CITE** — Add source attribution
- Format: **Source**: [Title](URL) | **Verified**: YYYY-MM-DD
- Include confidence level and reasoning

## Usage Examples

### Example 1: React Server Components Research

**Scenario:** User asks "What's the difference between React Server Components and Client Components?"

```
**Step 1: EXTRACT**
- Primary source: React Docs - Server Components
- Extract key points: server vs client execution, hydration, bundle size

**Step 2: VERIFY**
- Source 2: React Team Blog (2023)
- Source 3: Next.js Documentation (App Router)
- Cross-verify: Execution context, use cases, limitations

**Step 3: CONSOLIDATE**
- Server Components: Run on server, zero client JS, cannot use hooks
- Client Components: Run on client, can use hooks, hydrates on client

**Step 4: CITE**
```

**Output:**
```markdown
## React Server Components vs Client Components

### Extracted Information

**Server Components:**
- Execute exclusively on the server during render
- Reduce client-side JavaScript bundle size
- Cannot use hooks or browser APIs
- Can read directly from database/filesystem

**Client Components:**
- Execute on client (with optional server pre-rendering)
- Full access to hooks and browser APIs
- Require hydration overhead

### Sources

- [React Docs - Server Components](https://react.dev/reference/react/server-components) | Verified: 2026-03-20
- [React Team Blog - RSC](https://react.dev/blog/2023/rsc) | Verified: 2026-03-20
- [Next.js App Router Docs](https://nextjs.org/docs/app/building-your-application/rendering) | Verified: 2026-03-20

### Confidence

**Level**: HIGH
**Reasoning**: Primary sources from official React documentation, cross-verified with Next.js implementation docs.

### Conflicts

None detected.
```

---

### Example 2: Python Type Hinting Research

**Scenario:** User asks "How do I use Python's Self type introduced in 3.11?"

```
**Step 1: EXTRACT**
- Primary source: PEP 673 - Self Type
- Extract: Usage in methods, return types, class methods

**Step 2: VERIFY**
- Source 2: Python 3.11 whatsnew documentation
- Source 3: Real Python tutorial on 3.11 features
- Cross-verify: Syntax, use cases, compatibility
```

**Output:**
```markdown
## Python Self Type (PEP 673)

### Extracted Information

**Self** is an explicit type annotation for methods returning the same class type.

```python
from typing import Self

class Builder:
    def set_name(self, name: str) -> Self:
        self.name = name
        return self
```

**Usage:**
- annotate return types of chainable methods
- works with classmethods (receives cls instead of self)
- available in Python 3.11+

### Sources

- [PEP 673 - Self Type](https://peps.python.org/pep-0673/) | Verified: 2026-03-23
- [Python 3.11 Whats New](https://docs.python.org/3.11/whatsnew/3.11.html) | Verified: 2026-03-23
- [Real Python - Python 3.11](https://realpython.com/python311-new-features/) | Verified: 2026-03-23

### Confidence

**Level**: HIGH
**Reasoning**: Direct quotes from PEP 673 and official Python 3.11 documentation, verified today.

### Conflicts

None detected.
```

## Extraction Workflows

### Workflow 1: Single Source Extraction

**Use for:** Simple lookups, quick facts

```
1. Load source (file or URL)
2. Extract aspect-related information
3. Verify with 1-2 additional sources
4. Output with single citation
```

### Workflow 2: Multi-Source Synthesis

**Use for:** Complex topics, conflicting information

```
1. Extract from primary source
2. Extract from 2+ secondary sources
3. Cross-verify claims
4. Identify conflicts
5. Consolidate with conflict notes
6. Output with multiple citations
```

### Workflow 3: Aspect-Based Extraction

**Use for:** Targeted information retrieval

```
1. Define aspect clearly (e.g., "OAuth2 flows")
2. Scan sources for aspect matches
3. Extract relevant sections only
4. Filter by relevance score
5. Verify extracted content
6. Consolidate by aspect
```

### Workflow 4: Consolidation From Multiple Sources

**Use for:** Merging related information

```
1. Extract from all sources
2. Identify unique information per source
3. Find overlapping information
4. Merge duplicates (keep best version)
5. Resolve conflicts (prioritize credibility)
6. Create unified knowledge structure
```

## Output Format

### Standard Output Format

```markdown
## [Aspect] Information Summary

### Extracted Information

[Consolidated information from verified sources]

### Sources

- [Source 1 Title](URL1) | **Verified**: YYYY-MM-DD
- [Source 2 Title](URL2) | **Verified**: YYYY-MM-DD

### Confidence

**Level**: HIGH/MEDIUM/LOW
**Reasoning**: [Brief justification for confidence level]

### Conflicts

[List any conflicting information with source attributions]

### Recommendations

[Actionable insights or next steps]
```

## When NOT to Use This Skill

- **Direct execution** — Use `rd3:sys-developing` or platform shell instead
- **Code debugging** — Use `rd3:sys-debugging` instead
- **Test writing** — Use `rd3:sys-testing` or `rd3:advanced-testing` instead
- **File operations** — Use Read/Grep/Write tools directly

## Anti-Patterns to Avoid

### Anti-Pattern 1: Single Source Verification

**Problem:** Presenting information from only one source

```typescript
// HIGH importance requires 2+ sources
// CRITICAL claims require 3+ sources
function validateSourceCount(claimImportance: string, sourcesCount: number): boolean {
  if (claimImportance === "HIGH" && sourcesCount < 2) {
    return false; // Need 2+ sources for HIGH importance
  }
  if (claimImportance === "CRITICAL" && sourcesCount < 3) {
    return false; // Need 3+ sources for CRITICAL claims
  }
  return true;
}
```

### Anti-Pattern 2: Ignoring Conflicts

**Problem:** Presenting consensus without noting conflicts

**Fix:** Record each conflicting claim with attribution, then resolve using credibility, recency, and scope.

### Anti-Pattern 3: Outdated Sources

**Problem:** Using outdated information without verification

**Fix:** Prefer current primary sources and explicitly note historical context when older material is still relevant.

### Anti-Pattern 4: Circular Attribution

**Problem:** Citing sources that quote each other as independent

**Fix:** Trace claims back to the original source and count downstream summaries as supporting context, not independent verification.

### Anti-Pattern 5: Missing Confidence Levels

**Problem:** Presenting information without confidence assessment

**Fix:** Assign HIGH, MEDIUM, LOW, or UNVERIFIED before presenting conclusions and explain the reason briefly.

## Best Practices

### DO

- [ ] Always verify information with 2+ sources when possible
- [ ] Use official documentation as primary source
- [ ] Include publication dates in citations
- [ ] Assign confidence levels based on verification
- [ ] Present conflicting information with attributions
- [ ] Use MCP tools when available (ref, searchGitHub)
- [ ] Cross-reference local codebase with `rd3:quick-grep` and `Read`

### DON'T

- [ ] Present information without verification
- [ ] Use outdated sources without checking
- [ ] Ignore conflicting information
- [ ] Skip confidence scoring
- [ ] Use single source for important claims
- [ ] Present synthesis as direct quotes without attribution

## Verification Checklist

Before presenting extracted information:

- [ ] Primary source identified and loaded
- [ ] Cross-verified with 2+ sources
- [ ] Publication dates checked
- [ ] Conflicts identified and resolved
- [ ] Credibility assessed
- [ ] Confidence level assigned
- [ ] Sources properly attributed
- [ ] Output format follows standard template

## Reference Files

For comprehensive patterns and examples, see:

- **`references/tool-selection.md`** — Detailed MCP tool usage, decision trees, source type handling
- **`references/validation-methods.md`** — Triangulation, credibility assessment, confidence scoring
- **`references/conflict-resolution.md`** — Handling factual, interpretive, temporal, and scope disagreements
- **`references/deduplication.md`** — Content merging and duplicate elimination strategies

## Platform Notes

### Claude Code

- Use `ref` MCP tool for official documentation lookup
- Use inline command syntax for local file analysis
- Argument placeholders (`<arg>`) work for referencing user-provided values
- Forked context mode useful for parallel source verification

### Codex / OpenAI CLI

- Arguments are provided directly in chat rather than through placeholder syntax
- Prefer the platform's configured documentation, web, and shell tools for verification
- `agents/openai.yaml` controls UI metadata and discovery, not the verification workflow itself

### OpenCode / OpenClaw / Antigravity

- Tool availability depends on the generated install target and configured companions
- Prefer documentation/search integrations first, then fall back to web fetch, browser, or shell-based verification
- Use `rd3:quick-grep` plus file reads for local codebase evidence when the install includes rd3 skills

### Cross-Platform Considerations

- Keep platform-specific invocation details in generated companions instead of hard-coding them here
- Prefer official documentation and primary sources before community summaries on every platform
- Use local code search plus direct file reads to verify project-specific claims

---

**Remember**: Verification before synthesis. Never present information as fact without cross-checking. Multiple sources > single source. Always cite your sources with dates.
