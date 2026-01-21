---
name: anti-hallucination
description: Use for ANY task requiring external information (APIs, libraries, frameworks, facts, recent events). Zero-trust verification-before-generation with MCP tool priority.
---

# Anti-Hallucination Protocol

**The zero-trust approach to LLM reliability.**

## Mental Model

Think of this as **"Source-First Architecture"**: Every claim must trace back to a verifiable source before generation. Like a court of law — facts require evidence, not confidence.

**Tool Philosophy**: Use the RIGHT tool for the job, not just ANY search tool.

```
Memory (Unreliable) → Tool Selection → Source Verification → Generate (Grounded)
                           │                   │
                    ┌────────┴────────┐       │
                    │                 │       │
               Docs? GitHub?      Both!   Evidence
                    │                 │       │
                ref_search_documentation       searchCode  Required
```

## Quick Start (80/20 Rule)

For 80% of cases, use this simple pattern:

```bash
# Step 1: Search using BEST tool
# For APIs/libraries: ref_search_documentation
ref_search_documentation "{library} {method/feature} official documentation"

# For GitHub code: searchCode
searchCode "method_name" language=Python

# Fallback: WebSearch
WebSearch "{query} official documentation 2024 2025"

# Step 2: Cite your source
**Source**: [URL](link) | **Verified**: YYYY-MM-DD

# Step 3: Score confidence
**Confidence**: HIGH/MEDIUM/LOW | **Reasoning**: {why}
```

## Activation Triggers

**IMMEDIATELY activate when:**
- Query contains external APIs, libraries, frameworks
- User asks about recent changes, versions, deprecations
- Task requires factual claims (dates, statistics, specific values)
- Implementing authentication, security, or integration features
- Working with technologies not in current codebase

**Decision Tree:**
```
Is the claim verifiable?
├── YES → Select Tool → Search → Verify → Cite → Generate
│         │
│         ├─ Documentation? → ref_search_documentation
│         ├─ GitHub code? → searchCode
│         └─ Other? → WebSearch
│
└── NO  → State uncertainty explicitly → LOW confidence
```

## Core Verification Workflow

### The 5-Step Protocol
```
1. CHECK → Do I need verification? (see triggers)
2. SELECT → Choose best tool for information type
3. SEARCH → Use selected tool with specific query
4. CITE   → Include source with date
5. SCORE  → Assign confidence level
```

### Tool Selection Guide

| Information Type | Primary Tool | Fallback |
|-----------------|--------------|----------|
| **API/Library Docs** | `ref_search_documentation` | WebFetch → WebSearch |
| **GitHub Source Code** | `searchCode` | WebFetch → WebSearch |
| **Recent Events (<6mo)** | `WebSearch` | ref_search_documentation |
| **Local Codebase** | `Read` / `Grep` | - |
| **Specific URL** | `ref_read_url` | WebFetch |

**Key Principles:**
1. `ref_search_documentation` first for ANY documentation
2. `searchCode` first for ANY GitHub code
3. `WebSearch` only as fallback or for non-code content

### Confidence Scoring

| Level | Score | Criteria | Example |
|-------|-------|----------|---------|
| **HIGH** | >90% | Direct quote from official docs (2024+) | "React 19 docs state X" |
| **MEDIUM** | 70-90% | Synthesized from multiple sources | "Based on AWS + Voiceflow" |
| **LOW** | <70% | Memory, outdated, or incomplete | "I recall but can't verify" |
| **UNVERIFIED** | N/A | No sources found | "Cannot verify - do not use" |

## Red Flags (Stop & Verify)

| Pattern | Red Flag | Action |
|---------|----------|--------|
| **Memory-based** | "I recall", "I think", "Should be" | Search immediately |
| **No citation** | Claim without source link | LOW confidence |
| **Specific values** | Exact numbers, dates, versions | Verify each |
| **API methods** | Method signatures from memory | Check official docs |
| **Security code** | Auth, tokens, secrets | Triple-verify |

## Fallback Protocol

```
IF ref_search_documentation fails:
├── Try ref_read_url (if you have URL)
├── Try WebFetch (specific URL)
├── Try WebSearch
└── ELSE: State "UNVERIFIED" + LOW confidence

IF searchCode fails:
├── Try WebFetch (if GitHub URL)
├── Try WebSearch
├── Check local codebase (Read/Grep)
└── ELSE: State "UNVERIFIED" + LOW confidence

IF all verification fails:
├── "I cannot verify this from official sources"
├── Mark all claims as LOW confidence
└── NEVER present unverified code as working
```

## Output Templates

### HIGH Confidence
```markdown
**Source**: [Documentation URL]
**Version**: X.Y.Z
**Verified**: YYYY-MM-DD

**Confidence**: HIGH
```

### MEDIUM Confidence
```markdown
**Based on**: [Source 1], [Source 2]
**Assumptions**: [list assumptions]

**Confidence**: MEDIUM
**Verify**: [what to double-check]
```

### LOW Confidence
```markdown
**WARNING**: Could not verify from official sources

**Confidence**: LOW
**Required**: Manual verification of [specific items]
```

## Quick Reference

**Verification Checklist:**
- [ ] Searched official documentation
- [ ] Verified version compatibility
- [ ] Checked for recent changes/deprecations
- [ ] Confirmed method signatures
- [ ] Added source citation
- [ ] Assigned confidence level

**Citation Format:**
```
// Verified: {library} {version}
// Source: {URL}
// Date: {YYYY-MM-DD}
```

## Detailed References

For comprehensive patterns and examples, see:

- **`references/tool-usage-guide.md`** - Detailed MCP tool usage examples
- **`references/prompt-patterns.md`** - Research-backed prompt patterns (CoVe, RAG, etc.)
- **`references/anti-hallucination-research.md`** - Complete 16-source research validation

## Research Foundation

**16 validated sources** with 2,500+ combined citations. Core techniques from:

| Source | Citations | Contribution |
|--------|-----------|--------------|
| CoVe (Meta AI) | 727+ | Chain-of-Verification pattern |
| Nature 2024 | 1,017+ | Entropy-based detection |
| HaluEval 2.0 | 226+ | Fact extraction benchmarks |
| UQLM | 115+ | Uncertainty quantification |
| Comprehensive Survey 2024 | 650+ | 32+ technique taxonomy |

## Expert Agent Integration

**When to invoke**: Any task involving external APIs, libraries, frameworks, or factual claims.

**Integration pattern:**
```
1. ACTIVATE anti-hallucination protocol
2. SELECT best tool (ref_search_documentation for docs, searchCode for code)
3. SEARCH with specific query
4. VERIFY from official source
5. CITE sources with dates
6. SCORE confidence levels
```

**Auto-routing**: Agents with external library competencies should reference this skill in their verification protocols and use MCP tools before generic web search.
