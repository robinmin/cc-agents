---
name: research-process
description: "Five-phase research process (Define, Design, Execute, Synthesize, Present) with decision framework for systematic knowledge extraction."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-27
updated_at: 2026-03-27
tags: [research, process, workflow, knowledge-extraction, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
see_also:
  - rd3:knowledge-extraction
  - rd3:knowledge-extraction/references/research-methodology
  - rd3:knowledge-extraction/references/source-evaluation
  - rd3:knowledge-extraction/references/output-templates
---

# Research Process

A systematic five-phase process for conducting rigorous research from question definition through results presentation.

## Overview

```
Phase 1: DEFINE SCOPE
    │
    ▼
Phase 2: DESIGN SEARCH STRATEGY
    │
    ▼
Phase 3: EXECUTE SYSTEMATIC SEARCH
    │
    ▼
Phase 4: SYNTHESIZE AND VERIFY
    │
    ▼
Phase 5: PRESENT RESULTS
```

## Phase 1: Define Research Scope

| Step | Action | Output |
|------|--------|--------|
| 1.1 | Clarify the research question | Specific, answerable question (use PICO/SMART from research-methodology.md) |
| 1.2 | Identify source requirements | Source types needed: academic, industry, official docs, or mixed |
| 1.3 | Determine recency needs | Recency threshold (e.g., <6 months for fast-moving fields, <2 years for stable) |
| 1.4 | Assess scope constraints | Depth vs breadth balance, available tools, detail level needed |
| 1.5 | Establish confidence threshold | Minimum confidence level required for the use case |

### Scope Assessment Checklist

```
[ ] Research question is specific and falsifiable
[ ] Source types identified (academic? industry? docs?)
[ ] Recency threshold set
[ ] Depth vs breadth decision made
[ ] Confidence threshold agreed (HIGH required? MEDIUM acceptable?)
```

## Phase 2: Design Search Strategy

| Step | Action | Output |
|------|--------|--------|
| 2.1 | Select appropriate tools | Tool list per claim type (ref, WebSearch, GitHub, arXiv) |
| 2.2 | Construct search queries | Boolean queries, site filters, keyword combinations |
| 2.3 | Identify target sources | Specific journals, repos, documentation sites |
| 2.4 | Plan verification approach | Primary sources, triangulation needs, red flag monitoring |
| 2.5 | Set quality thresholds | Minimum source quality, citation requirements |

### Tool Selection Quick Reference

| Information Type | Primary Tool | Fallback |
|-----------------|-------------|----------|
| API/Library docs | `ref_search_documentation` | WebSearch with `site:` filter |
| Academic papers | WebSearch + arXiv | `mcp__huggingface__paper_search` |
| Code patterns | `mcp__grep__searchGitHub` | WebSearch with "GitHub" qualifier |
| Recent developments | WebSearch (<6 months) | WebFetch for specific URLs |
| Official specs | `ref_read_url` | WebFetch for known URLs |

## Phase 3: Execute Systematic Search

| Step | Action | Output |
|------|--------|--------|
| 3.1 | Execute primary searches | Raw search results from selected tools |
| 3.2 | Gather relevant sources | Collect more sources than needed for filtering |
| 3.3 | Assess source quality | Credibility, recency, relevance scores (see source-evaluation.md) |
| 3.4 | Extract key information | Structured notes per source with claims and evidence |
| 3.5 | Document search methodology | Queries used, results found, decisions made |

### Execution Protocol

```
FOR EACH search query:
  1. Execute query with primary tool
  2. Record result count
  3. IF results < 3: broaden query OR try fallback tool
  4. IF results > 20: add filters to narrow
  5. Screen results for relevance (title + abstract/summary)
  6. Extract full content from top sources
  7. Record in research log
```

## Phase 4: Synthesize and Verify

| Step | Action | Output |
|------|--------|--------|
| 4.1 | Cross-reference claims | Triangulated findings with multiple source support |
| 4.2 | Resolve conflicts | Conflict resolution per conflict-resolution.md |
| 4.3 | Assess evidence quality | Per-claim confidence scores |
| 4.4 | Synthesize findings | Integrated narrative with source attribution |
| 4.5 | Identify knowledge gaps | Explicit list of unanswered questions |

### Verification Rules

- **HIGH confidence claims** require 2+ independent authoritative sources
- **CRITICAL claims** (security, correctness) require 3+ sources or official documentation
- **Conflicting claims** must be explicitly noted with source attribution for each position
- **Single-source claims** must be marked as such with lower confidence

## Phase 5: Present Results

| Step | Action | Output |
|------|--------|--------|
| 5.1 | Structure response | Organized synthesis following output template |
| 5.2 | Cite all sources | Complete attribution with dates and URLs |
| 5.3 | Assign confidence levels | Per-claim and overall confidence scoring |
| 5.4 | Acknowledge limitations | Methodology limits, source limits, recency concerns |
| 5.5 | Provide context | Source quality notes, recency considerations |

### Output Template Selection

| Scenario | Template | Reference |
|----------|----------|-----------|
| Full research on a topic | Research Synthesis | output-templates.md |
| Quick fact-check | Quick Verification | output-templates.md |
| Comprehensive academic-style review | Literature Review | output-templates.md |
| Research that hit barriers | Error Response | output-templates.md |

## Decision Framework

| Situation | Action |
|-----------|--------|
| Clear research question, verifiable sources | Execute systematic search -> Synthesize -> Cite |
| Conflicting information across sources | Cross-reference -> Assess source quality -> Note conflicts |
| No authoritative sources found | State UNVERIFIED -> Suggest verification alternatives |
| Single source for critical claim | Lower confidence -> Seek corroboration -> Flag for review |
| Outdated but only available sources | Note age -> Assess if still relevant -> Lower confidence |
| Request for opinion/prediction | Clarify evidence-based only -> Avoid speculation |
| Fast-moving topic (<6 months) | Prioritize recency -> Note rapid evolution |
| Controversial topic | Present multiple perspectives -> Note consensus vs debate |
| Ambiguous research question | Clarify with user before proceeding -> Use PICO/SMART |
| Too many sources to process | Apply stricter quality filters -> Focus on highest-quality sources |

## Workflow Routing

Map user intent to the appropriate workflow depth:

| User Request Pattern | Workflow | Phases Used |
|---------------------|----------|-------------|
| "verify X" / "fact-check X" | Quick verification | 1, 3 (targeted), 5 |
| "what is X" / "how does Y work" | Standard research | 1-5 |
| "compare X and Y" | Comparative synthesis | 1-5 with conflict focus |
| "literature review on X" | Full systematic review | 1-5 with PRISMA methodology |
| "extract from <source>" | Aspect-based extraction | 3-5 (single source) |
| "reconcile X and Y" | Conflict reconciliation | 3-4 focus |
