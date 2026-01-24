---
name: knowledge-seeker
description: Extract, synthesize, and validate information from multiple sources with cross-verification, deduplication, and proper source attribution. Use when researching APIs, libraries, frameworks, verifying facts, or consolidating information from PDFs, web pages, and code files.
triggers:
  - research
  - find documentation
  - verify information
  - extract from
  - look up
  - what is
  - how does
  - cross-check
  - consolidate information
  - verify claim
  - fact check
  - source attribution
  - cross-reference
---

# Knowledge Seeker

## Overview

Systematic information extraction, synthesis, and validation skill that transforms raw data from multiple sources into verified, citable knowledge. Implements triangulation-based verification with confidence scoring and proper source attribution.

**Key distinction:**
- **`rd2:knowledge-seeker`** = Information extraction, verification, and synthesis (knowledge work)
- **Other tools** = Information access (WebSearch, WebFetch, grep, ref, etc.)

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

### 2. Triangulation Methodology

Use multiple sources to enhance credibility:

| Confidence Level | Requirement | Evidence |
|-----------------|------------|----------|
| **HIGH** (>90%) | Direct quotes from official docs (2024+) | Official docs, API references |
| **MEDIUM** (70-90%) | Synthesized from 2+ sources | Cross-verified claims |
| **LOW** (<70%) | Single source or outdated | Flag for manual review |
| **UNVERIFIED** | No sources found | Do not present |

### 3. Progressive Disclosure

- Keep SKILL.md concise (overview + workflows)
- Move detailed methodologies to `references/`
- Link to specifics when needed

### 4. MCP Tools Priority

- API/Library Docs → `ref` (MCP)
- GitHub Code → `mcp__grep__searchGitHub`
- Recent Facts (<6mo) → `WebSearch`
- Local Codebase → `Read`/`Grep`
- Specific URL → `ref_read_url` (MCP)

See Tool Selection Summary below for complete table with fallbacks.

## Quick Start

**Basic extraction workflow:**

```bash
# Extract information about a specific aspect
Source: file.pdf or https://example.com
Aspect: "authentication mechanisms"
```

**Step 1: EXTRACT** - Identify relevant information
- Scan source for aspect-related content
- Extract key facts, patterns, relationships

**Step 2: VERIFY** - Cross-check with other sources
- Use `ref` for official documentation
- Use `WebSearch` for recent validation
- Use `mcp__grep__searchGitHub` for code examples

**Step 3: CONSOLIDATE** - Merge and deduplicate
- Combine verified information
- Remove duplicates
- Resolve conflicts

**Step 4: CITE** - Add source attribution
- Format: **Source**: [Title](URL) | **Verified**: YYYY-MM-DD
- Include confidence level and reasoning

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

## Tool Selection Summary

### Priority Order
1. **MCP Tools** (ref, searchGitHub, brave-search) - Fast, credible, specialized
2. **rd:agent-browser** - JS-rendered content, screenshots, forms
3. **WebFetch** - Static content, specific URLs
4. **WebSearch** - Recent information, general queries
5. **Grep/Read** - Local codebase analysis

### Quick Reference

| Information Type | Primary Tool | Fallback |
|-----------------|--------------|----------|
| **API/Library Docs** | `ref` (MCP) | WebFetch → WebSearch |
| **GitHub Code** | `mcp__grep__searchGitHub` | WebFetch → WebSearch |
| **Recent Facts (<6mo)** | `WebSearch` | `ref` → WebFetch |
| **Local Codebase** | `Read` / `Grep` | - |
| **Specific URL** | `ref_read_url` (MCP) | WebFetch |

**For detailed tool selection guidance:** `references/tool-selection.md`

## Validation Summary

### Triangulation Methodology

See Core Principles for confidence scoring framework (HIGH/MEDIUM/LOW/UNVERIFIED).

### Credibility Hierarchy

1. **Official documentation** (python.org, react.dev, etc.) - HIGHEST
2. **Official engineering blogs** (Google, Meta, OpenAI) - HIGH
3. **Well-maintained GitHub repos** - MEDIUM-HIGH
4. **Peer-reviewed papers** - MEDIUM
5. **Technical blogs** - MEDIUM
6. **StackOverflow, forums** - LOW-MEDIUM
7. **Unclear sources** - LOW

**For detailed validation methods:** `references/validation-methods.md`

## Output Format

### Standard Output Format

```markdown
## [Aspect] Information Summary

### Extracted Information

[Consolidated information from verified sources]

### Sources

- [Source 1 Title](URL1) | **Verified**: YYYY-MM-DD
- [Source 2 Title](URL2) | **Verified**: YYYY-MM-DD
- [Source 3 Title](URL3) | **Verified**: YYYY-MM-DD

### Confidence

**Level**: HIGH/MEDIUM/LOW
**Reasoning**: [Brief justification for confidence level]

### Conflicts

[List any conflicting information with source attributions]

### Recommendations

[Actionable insights or next steps]
```

### Citation Format

**Inline citations:**
```markdown
**Source**: [React Server Components](https://react.dev/reference/react/18/server-components) | **Verified**: 2025-01-15
```

**Multiple sources:**
```markdown
**Sources**:
- [Source 1](URL1) (verified: 2025-01-15)
- [Source 2](URL2) (verified: 2025-01-16)
```

## Conflict Resolution Summary

### Disagreement Types

| Type | Description | Resolution |
|------|-------------|------------|
| **Factual** | Different dates, versions, numbers | Prioritize most recent, check official |
| **Interpretive** | Different approaches, recommendations | Present multiple viewpoints |
| **Temporal** | Information changed over time | Note temporal context, provide latest |
| **Scope** | Different contexts/environments | Clarify applicability context |

**Resolution Protocol:** Identify → Assess → Check → Present → Flag

**For detailed conflict resolution:** `references/conflict-resolution.md`

## Deduplication Summary

### Content Matching

| Type | Handling |
|------|----------|
| **Exact duplicates** | Remove entirely, keep single instance |
| **Near duplicates** | Merge overlapping, keep most comprehensive |
| **Semantic duplicates** | Consolidate, note source variations |

### Information Merging

- **Sources agree**: Present single fact, cite all sources
- **Sources disagree**: Present conflicts, attribute to sources
- **Sources complement**: Synthesize comprehensive view

**For detailed deduplication strategies:** `references/deduplication.md`

## Anti-Patterns to Avoid

### Anti-Pattern 1: Single Source Verification

**Problem:** Presenting information from only one source

**Gate function:**
```python
# HIGH importance requires 2+ sources
# CRITICAL claims require 3+ sources
if claim_importance == "HIGH" and sources_count < 2:
    return False, "Need 2+ sources for HIGH importance"
if claim_importance == "CRITICAL" and sources_count < 3:
    return False, "Need 3+ sources for CRITICAL claims"
```

---

### Anti-Pattern 2: Ignoring Conflicts

**Problem:** Presenting consensus without noting conflicts

**Gate function:**
```python
# Conflicts must be resolved or explicitly noted
if conflicts and resolution_status == "IGNORED":
    return False, "Conflicts must be resolved or flagged"
```

---

### Anti-Pattern 3: Outdated Sources

**Problem:** Using outdated information without verification

**Gate function:**
```python
# Sources older than threshold_months require verification
age_months = months_since(source_date)
if age_months > threshold_months:
    return False, f"Source is {age_months} months old (limit: {threshold_months})"
```

---

### Anti-Pattern 4: Circular Attribution

**Problem:** Citing sources that quote each other as independent

**Gate function:**
```python
# Trace quotations to original sources
primary_sources = find_originals(source_chain)
if len(primary_sources) < 2:
    return False, "Circular attribution - single original source"
```

---

### Anti-Pattern 5: Missing Confidence Levels

**Problem:** Presenting information without confidence assessment

**Gate function:**
```python
# All outputs must include confidence level
if "confidence" not in output.lower():
    return False, "Output must include confidence level"
```

---

## Integration with rd2 Ecosystem

### Related Skills

- **`rd2:tdd-workflow`** - Test-driven development for implementation
- **`rd2:task-decomposition`** - Task planning and breakdown
- **`super-coder`** - Code implementation

### Usage Pattern

```
1. Use `knowledge-seeker` to research and validate information
2. Use findings to inform task decomposition
3. Use `super-coder` to implement based on verified knowledge
4. Use `tdd-workflow` to test implementation
```

## Best Practices

### DO

- [ ] Always verify information with 2+ sources when possible
- [ ] Use official documentation as primary source
- [ ] Include publication dates in citations
- [ ] Assign confidence levels based on verification
- [ ] Present conflicting information with attributions
- [ ] Use MCP tools when available (ref, searchGitHub)
- [ ] Follow tool priority (MCP > built-in)
- [ ] Cross-reference local codebase with grep/Read

### DON'T

- [ ] Present information without verification
- [ ] Use outdated sources without checking
- [ ] Ignore conflicting information
- [ ] Skip confidence scoring
- [ ] Use single source for important claims
- [ ] Present synthesis as direct quotes without attribution
- [ ] Assume information is current without date verification

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

## Related Skills

- **`rd2:tasks`** - Task file management for research tasks
- **`rd2:tdd-workflow`** - Test-driven development for implementing based on research
- **`rd2:task-decomposition`** - Breaking down research tasks into subtasks

## Common Use Cases

### API Research
- Extract API endpoints from documentation
- Verify with code examples
- Cross-check multiple API versions

### Framework Comparison
- Extract features from each framework
- Synthesize comparison table
- Verify with official sources

### Best Practices Research
- Extract patterns from multiple guides
- Identify consensus approaches
- Flag outliers for manual review

### Code Pattern Research
- Find implementation patterns via GitHub
- Verify with official documentation
- Synthesize best practice recommendations

---

## For More Details

Detailed references for advanced usage:

- **`references/tool-selection.md`** - MCP tool usage, decision trees, source type handling
- **`references/validation-methods.md`** - Triangulation, credibility assessment, confidence scoring
- **`references/conflict-resolution.md`** - Handling disagreements across sources (factual, interpretive, temporal, scope)
- **`references/deduplication.md`** - Content merging and duplicate elimination strategies

---

**Remember**: Verification before synthesis. Never present information as fact without cross-checking. Multiple sources > single source. Always cite your sources with dates.
