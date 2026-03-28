---
name: research-methodology
description: "Systematic literature review (PRISMA), meta-analysis, research question formulation (PICO/SMART), search strategy design, knowledge synthesis patterns (scoping/rapid/realist review), and specialized research techniques (snowballing, citation chaining)."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-27
updated_at: 2026-03-27
tags: [research, methodology, PRISMA, meta-analysis, PICO, literature-review, knowledge-extraction, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
see_also:
  - rd3:knowledge-extraction
  - rd3:knowledge-extraction/references/research-process
  - rd3:knowledge-extraction/references/source-evaluation
  - rd3:knowledge-extraction/references/synthesis-patterns
---

# Research Methodology

Systematic research approaches for rigorous knowledge extraction, from question formulation through evidence synthesis.

## Systematic Literature Review (PRISMA)

PRISMA (Preferred Reporting Items for Systematic Reviews and Meta-Analyses) provides a structured methodology for comprehensive, reproducible reviews.

### PRISMA Stages

```
1. IDENTIFICATION
   - Define search databases and tools (ref, WebSearch, arXiv, GitHub)
   - Construct search strings with Boolean operators
   - Record total results found per database

2. SCREENING
   - Apply inclusion/exclusion criteria to titles and abstracts
   - Remove duplicates across databases
   - Record reasons for exclusion

3. ELIGIBILITY
   - Full-text assessment of remaining sources
   - Apply quality appraisal criteria
   - Record reasons for exclusion at this stage

4. INCLUSION
   - Final set of sources for synthesis
   - Extract data using standardized forms
   - Document the complete selection process
```

### Inclusion/Exclusion Criteria Template

| Criterion | Include | Exclude |
|-----------|---------|---------|
| **Publication date** | Within recency threshold | Older than threshold (unless seminal) |
| **Source type** | Peer-reviewed, official docs, authoritative blogs | Anonymous forums, unverified sources |
| **Language** | English (or specified language) | Other languages without translation |
| **Relevance** | Directly addresses research question | Tangentially related only |
| **Quality** | Passes credibility assessment | Fails quality appraisal |

## Meta-Analysis Patterns

Meta-analysis synthesizes quantitative findings across multiple studies to derive aggregate conclusions.

### When to Apply

- Multiple studies report comparable metrics (benchmarks, accuracy, latency)
- Aggregation adds value beyond individual studies
- Sufficient study count for meaningful synthesis (typically 3+)

### Key Concepts

| Concept | Description | Application |
|---------|-------------|-------------|
| **Effect size** | Standardized measure of magnitude | Compare results across different measurement scales |
| **Heterogeneity** | Variation between studies | I-squared statistic; high heterogeneity warns against simple pooling |
| **Publication bias** | Tendency to publish positive results | Funnel plots, fail-safe N analysis |
| **Weighting** | Studies weighted by quality/size | Higher-quality studies receive more weight in synthesis |

### Synthesis Approach

```
1. Extract comparable metrics from each source
2. Standardize measurements where possible
3. Assess heterogeneity — can results meaningfully be combined?
4. If yes: weight by quality/sample size, compute aggregate
5. If no: present narrative synthesis noting reasons for variation
6. Check for publication bias indicators
```

## Research Question Formulation

### PICO Framework (Quantitative Research)

| Element | Description | Example |
|---------|-------------|---------|
| **P**opulation | Who or what is being studied | "TypeScript projects using React 18+" |
| **I**ntervention | What treatment or approach | "Server Components with streaming SSR" |
| **C**omparison | What is it compared to | "Traditional client-side rendering" |
| **O**utcome | What is measured | "Time to First Byte, bundle size, developer experience" |

**Example question:** "In TypeScript React 18+ projects (P), does using Server Components with streaming SSR (I) compared to client-side rendering (C) improve Time to First Byte and reduce bundle size (O)?"

### PICo Framework (Qualitative Research)

| Element | Description | Example |
|---------|-------------|---------|
| **P**opulation | Context or group | "Engineering teams adopting microservices" |
| **I**nterest | Phenomenon of interest | "Challenges in service decomposition" |
| **Co**ntext | Setting or circumstances | "Organizations with monolithic legacy systems" |

### SMART Criteria for Research Questions

| Criterion | Requirement |
|-----------|-------------|
| **S**pecific | Clearly defined scope, not vague |
| **M**easurable | Can be answered with verifiable evidence |
| **A**chievable | Answerable with available tools and sources |
| **R**elevant | Directly useful to the user's goal |
| **T**ime-bound | Includes recency constraints where applicable |

## Search Strategy Design

### Boolean Query Construction

```
# Basic pattern
(primary_term OR synonym1 OR synonym2)
AND (secondary_term OR synonym3)
NOT (exclusion_term)

# Example: Searching for React Server Components performance
("React Server Components" OR "RSC" OR "Server Components")
AND ("performance" OR "benchmark" OR "latency" OR "TTFB")
NOT ("Angular" OR "Vue")
```

### Database-Specific Syntax

| Database | Syntax Notes |
|----------|-------------|
| **Google Scholar** | Use quotes for exact phrases; `site:` for domain filtering |
| **arXiv** | Use `ti:` for title, `abs:` for abstract, `cat:` for category |
| **PubMed** | Use MeSH terms; `[tiab]` for title/abstract fields |
| **IEEE Xplore** | Use "All Metadata" search; filter by publication type |
| **GitHub** | Use `language:`, `stars:>N`, `path:` qualifiers |

### Search Documentation Template

```markdown
## Search Strategy

**Date conducted:** YYYY-MM-DD
**Databases searched:** [list]
**Search strings:**
- Database 1: "query string"
- Database 2: "query string"

**Results per database:**
- Database 1: N results
- Database 2: N results
- Total before dedup: N
- Total after dedup: N

**Screening:** N included after title/abstract screening
**Final set:** N sources included in synthesis
```

## Knowledge Synthesis Patterns

| Pattern | Use Case | Depth | Time Investment |
|---------|----------|-------|-----------------|
| **Scoping Review** | Map existing research landscape, identify evidence gaps | Broad | Medium |
| **Rapid Review** | Timely synthesis with simplified methodology | Focused | Low |
| **Realist Review** | Understand what works, for whom, in what contexts | Deep | High |
| **Systematic Mapping** | Categorize and visualize research distribution | Broad | Medium |
| **Narrative Synthesis** | Textual integration when quantitative pooling isn't possible | Flexible | Medium |
| **Thematic Analysis** | Identify patterns and develop codes across sources | Deep | High |
| **Critical Appraisal** | Evaluate study quality and identify bias | Focused | Medium |
| **Evidence Mapping** | Visualize evidence distribution and identify gaps | Broad | Low |
| **State-of-the-Art Review** | Summarize current practice and emerging trends | Focused | Medium |

### Pattern Selection Guide

```
IF quick answer needed with time pressure:
└── Rapid Review

IF mapping a new or unfamiliar domain:
├── Scoping Review (broad landscape)
└── Systematic Mapping (categorized overview)

IF understanding effectiveness in context:
└── Realist Review (context-mechanism-outcome)

IF synthesizing qualitative findings:
├── Narrative Synthesis
└── Thematic Analysis

IF assessing research quality:
└── Critical Appraisal

IF identifying research gaps:
└── Evidence Mapping
```

## Specialized Research Techniques

### Snowballing / Citation Chaining

```
Forward snowballing: Find papers that CITE a known good source
  → Use Google Scholar "Cited by" or Semantic Scholar citations
  → Captures newer work building on foundational research

Backward snowballing: Check the REFERENCES of a known good source
  → Read the bibliography of relevant papers
  → Traces back to foundational and seminal work

Combined: Alternate forward and backward until saturation
  → Stop when new sources no longer add unique information
```

### Annotated Bibliography

For each source in a review, maintain:

```markdown
## [Source Title](URL)

**Authors:** [list]
**Date:** YYYY-MM-DD
**Type:** journal article | conference paper | technical blog | official docs
**Key findings:** [1-3 bullet points]
**Quality assessment:** HIGH/MEDIUM/LOW
**Relevance to question:** [brief note]
**Limitations:** [any caveats]
```

### Research Logs

Document the search process for reproducibility:

```markdown
## Research Log: [Topic]

### Session 1 — YYYY-MM-DD HH:MM

**Goal:** [what I'm looking for]
**Tools used:** ref, WebSearch
**Queries:**
- "query 1" → N results, M relevant
- "query 2" → N results, M relevant
**Key sources found:** [list]
**Gaps identified:** [what's still missing]
**Next steps:** [plan for next session]
```
