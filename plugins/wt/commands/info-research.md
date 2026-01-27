---
description: Conduct systematic, evidence-based research using PRISMA methodology with multi-source verification, GRADE quality assessment, and comprehensive citation management
argument-hint: "<research-topic>" [--type <type>] [--years <N>] [--format <format>] [--depth <depth>]
examples:
  - "/wt:info-research 'machine learning interpretability techniques 2020-2025'"
  - "/wt:info-research 'effect of intermittent fasting on longevity' --type systematic --years 10"
  - "/wt:info-research 'quantum computing applications in drug discovery' --type rapid --format report"
  - "/wt:info-research 'climate change impact on coastal cities' --depth comprehensive"
---

# Info Researcher

Conduct comprehensive, systematic research on any topic using evidence-based methodology with multi-source verification and quality assessment.

## When to Use

- Conducting academic literature reviews or systematic reviews
- Verifying controversial claims or fact-checking statements
- Exploring emerging technologies or scientific developments
- Analyzing research trends across multiple domains
- Generating evidence-based reports with citations
- Understanding complex topics through rigorous synthesis

## Arguments

| Argument   | Required | Description                                                         | Default      |
| ---------- | -------- | ------------------------------------------------------------------- | ------------ |
| `<topic>`  | Yes      | Research question or topic to investigate                           | -            |
| `--type`   | No       | Research type: `systematic`, `rapid`, `meta-analysis`, `fact-check` | `systematic` |
| `--years`  | No       | Time range in years (e.g., 5, 10, 20)                               | `5`          |
| `--format` | No       | Output format: `markdown`, `report`, `brief`                        | `markdown`   |
| `--depth`  | No       | Research depth: `quick`, `standard`, `comprehensive`                | `standard`   |

## Input Validation

### Required Arguments

- **`<topic>`**: Must be non-empty research question or topic

### Optional Arguments

- **`--type`**: Must be one of `systematic`, `rapid`, `meta-analysis`, `fact-check`
- **`--years`**: Positive integer between 1-100 (recommended: 1-20 for most topics)
- **`--format`**: Must be one of `markdown`, `report`, `brief`
- **`--depth`**: Must be one of `quick`, `standard`, `comprehensive`

### Error Handling

| Error                          | Behavior                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------ |
| Missing `<topic>`              | Prompt user for research topic before proceeding                              |
| Invalid `--type`               | Default to `systematic` with warning message                                     |
| Invalid `--years`              | Default to `5` with warning message                                                |
| Invalid `--format`             | Default to `markdown` with warning message                                          |
| Invalid `--depth`              | Default to `standard` with warning message                                          |
| `<topic>` too short (<5 chars) | Request more specific research topic                                           |
| `<topic>` contains only stop words | Request more specific research topic                                           |
| `<topic>` is a URL without context | Extract the topic/research question from URL, validate is meaningful topic      |
| `<topic>` too long (>500 chars)  | Truncate to first 500 chars with warning, request clarification if needed          |

## Research Types

| Type              | Description                             | Use Case                                            | Duration   |
| ----------------- | --------------------------------------- | --------------------------------------------------- | ---------- |
| **systematic**    | PRISMA-compliant systematic review      | Academic research, comprehensive evidence synthesis | ~10-15 min |
| **rapid**         | Accelerated review with key sources     | Time-sensitive decisions, quick overview            | ~5-8 min   |
| **meta-analysis** | Statistical synthesis with effect sizes | Quantitative research, clinical questions           | ~15-20 min |
| **fact-check**    | Single claim verification               | Debunking myths, verifying statistics               | ~3-5 min   |

### Performance Expectations

| Research Type     | Expected Sources | Output Size     | Notes                          |
| ----------------- | ---------------- | --------------- | ------------------------------ |
| **systematic**    | 20-50 sources    | 2000-5000 words | Comprehensive coverage         |
| **rapid**         | 10-20 sources    | 800-1500 words  | Key sources only               |
| **meta-analysis** | 15-40 sources    | 1500-3000 words | Includes statistical synthesis |
| **fact-check**    | 5-15 sources     | 300-800 words   | Focused verification           |

## Workflow

This command coordinates multiple research resources in a systematic workflow:

### Phase 1: Research Planning & Execution

```
Step 1: Initialize research with super-researcher
→ Task(subagent_type="wt:super-researcher",
    prompt="Conduct {type} research on: {topic}
     Time range: {years} years
     Depth: {depth}

     Apply PICO framework, search multiple databases,
     assess evidence quality using GRADE, detect biases,
     and provide confidence scores for all findings.")
```

### Phase 2: Knowledge Synthesis & Extraction

```
Step 2: Synthesize findings across sources
→ Task(subagent_type="rd2:knowledge-seeker",
    prompt="Synthesize research findings from Phase 1
     Extract key insights, identify patterns,
     highlight consensus and controversies,
     assess evidence quality across sources,
     provide integrated knowledge synthesis.")
```

### Phase 3: Web Content Verification (if needed)

```
Step 3: Verify and extract web content
→ IF web sources identified:
   Task(subagent_type="wt:magent-browser",
       prompt="Extract and verify content from identified web sources
        Convert to clean markdown using markitdown
        Ensure accurate citation and metadata extraction")
```

### Phase 4: Anti-Hallucination Verification

```
Step 4: Apply verification protocol
→ Skill(skill="rd2:anti-hallucination",
    args="Verify all claims, check source citations,
          validate evidence quality, flag uncertainties,
          ensure proper attribution and confidence scoring")
```

### Phase 5: Final Report Generation

```
Step 5: Generate comprehensive report
→ Format output based on --format parameter:
   - markdown: Full research report with sections
   - report: Executive summary + detailed findings
   - brief: Concise summary with key insights
```

## Research Methodology

### Systematic Review Process (Default)

Follows **PRISMA-2020** guidelines:

1. **Protocol Development**
   - Define research question using PICO framework
   - Specify inclusion/exclusion criteria
   - Select appropriate databases

2. **Literature Search**
   - Design Boolean search strings
   - Search multiple databases (Semantic Scholar, ArXiv, Google Scholar, etc.)
   - Document search strategy for reproducibility

3. **Screening & Selection**
   - Title/abstract screening
   - Full-text review
   - Document exclusion reasons

4. **Quality Assessment**
   - Apply GRADE evidence hierarchy
   - Assess risk of bias (RoB 2, ROBINS-I)
   - Evaluate study quality

5. **Data Extraction & Synthesis**
   - Extract key findings, effect sizes, sample sizes
   - Conduct meta-analysis if appropriate
   - Perform narrative synthesis for heterogeneous evidence

6. **Bias Detection**
   - Assess publication bias (funnel plots, Egger's test)
   - Identify selective outcome reporting
   - Evaluate funding conflicts

### Evidence Quality Assessment

Uses **GRADE** approach:

| Quality      | Criteria                                       | Examples                            |
| ------------ | ---------------------------------------------- | ----------------------------------- |
| **HIGH**     | RCTs with low risk of bias; systematic reviews | Multi-center RCTs, Cochrane reviews |
| **MODERATE** | Observational studies with consistent effects  | Cohort studies, case-control        |
| **LOW**      | Case series, small samples, high bias          | Pilot studies, retrospective        |
| **VERY LOW** | Expert opinion, animal studies                 | Editorials, commentaries            |

### Confidence Scoring

Every claim includes confidence level:

- **HIGH** (>90%): Verified from primary, peer-reviewed sources
- **MEDIUM** (70-90%): Synthesized from multiple credible sources
- **LOW** (<70%): Limited verification, inconsistent evidence
- **UNVERIFIED**: No reliable sources found

## Output Format

### Standard Markdown Report

```markdown
# Research: {Topic}

## Executive Summary

{3-5 key findings with confidence levels}

## Confidence: {HIGH/MEDIUM/LOW}

**Sources**: {N} sources from {databases}
**Evidence Quality**: {GRADE assessment}
**Date Range**: {earliest} - {most recent}
**Search Date**: {YYYY-MM-DD}

## Search Strategy

**Databases Searched**:

- {Database 1}: {N} results
- {Database 2}: {N} results

**Inclusion Criteria**: {criteria}
**Exclusion Criteria**: {criteria}

## Key Findings

### Theme 1: {Category}

**Primary Finding**: {summary}

- {Finding 1} [{Citation}]
  - **Evidence Quality**: {GRADE}
  - **Effect Size**: {value}
  - **Confidence**: {HIGH/MEDIUM/LOW}

### Theme 2: {Category}

{Same structure}

## Heterogeneity & Bias Assessment

**Publication Bias**: {assessment}
**Other Biases**: {identified biases}

## Limitations

{acknowledged limitations}

## Conclusions

{overall conclusions}

## Bibliography

{Full citations}
```

## Examples

### Example 1: Systematic Literature Review

```bash
/wt:info-research 'machine learning interpretability techniques 2020-2025'
```

**Output**: PRISMA-compliant systematic review with:

- PICO-formulated research question
- Multi-database search (Semantic Scholar, ArXiv, Google Scholar)
- GRADE quality assessment for each source
- Effect sizes and confidence intervals
- Publication bias assessment
- Full bibliography with DOIs

**Sample Result**:

```markdown
# Research: ML Interpretability Techniques

## Executive Summary

1. SHAP values show highest consistency across model types [HIGH]
2. Attention mechanisms remain model-specific [MEDIUM]
3. Counterfactual explanations gain traction in healthcare [HIGH]
4. LIME methods criticized for instability [MEDIUM]
5. Integrated gradients preferred for neural networks [HIGH]

## Confidence: HIGH

**Sources**: 47 sources from Semantic Scholar, ArXiv, Google Scholar
**Evidence Quality**: MODERATE to HIGH
**Date Range**: 2020 - 2025
...
```

### Example 2: Fact-Check Controversial Claim

```bash
/wt:info-research 'intermittent fasting extends lifespan by 30% in humans' --type fact-check
```

**Output**: Verification report with:

- Primary source verification
- Assessment of claim accuracy
- Context and caveats
- Evidence quality rating

**Sample Result**:

```markdown
# Fact Check: Intermittent fasting extends lifespan by 30%

**Status**: PARTIALLY VERIFIED
**Confidence**: MEDIUM
**Last Verified**: 2025-01-27

## Evidence Summary

**Primary Source**: [Lee et al., 2023, Cell Metabolism] — 16% lifespan extension in mice, not yet confirmed in humans
**Supporting Sources**: 3 observational studies showing 10-15% healthspan improvement in humans

## Context & Nuance

- Animal studies show promise (20-30% extension in rodents)
- Human RCTs limited to short-term biomarkers
- 30% figure extrapolated from animal models
  ...

## Evidence Quality

**Study Design**: Animal studies, observational human studies
**Sample Size**: Varied (N=50-5000 across studies)
**GRADE Assessment**: LOW to MODERATE
**Risk of Bias**: Medium (publication bias detected)
...
```

### Example 3: Rapid Review for Quick Overview

```bash
/wt:info-research 'quantum computing applications in drug discovery' --type rapid --format brief
```

**Output**: Concise brief with:

- 3-5 key insights
- Current state of research
- Major players and breakthroughs
- Future outlook

**Sample Result**:

```markdown
# Research Brief: Quantum Computing in Drug Discovery

## Key Insights

1. **Molecular Simulation**: Quantum computers excel at simulating molecular interactions [HIGH]
   - IBM Quantum partnered with Roche (2024)
   - 100x speedup for specific molecular systems

2. **Current Limitations**: Hardware noise limits practical applications [HIGH]
   - <100 qubit systems currently available
   - Error correction remains challenge

3. **Timeline Projection**: Practical applications expected 2030-2035 [MEDIUM]
   - Based on industry expert consensus
   - Hardware roadmap predictions

## Confidence: MEDIUM

**Sources**: 12 sources from industry reports, academic preprints
**Evidence Quality**: MODERATE (mostly grey literature, early-stage research)
...
```

**Note on Namespace Usage:** The `wt:` prefix indicates this command is from the `wt` plugin. When using from within the `wt` plugin context, you can use simply `/info-research`. The full namespace `/wt:info-research` is required when invoking from other plugins or contexts.

## Resource Coordination

This command orchestrates the following resources:

| Resource                   | Role                                            | When Used                |
| -------------------------- | ----------------------------------------------- | ------------------------ |
| `wt:super-researcher`      | Main research agent with systematic methodology | Always (primary)         |
| `rd2:knowledge-seeker`     | Knowledge synthesis and pattern identification  | Phase 2 (synthesis)      |
| `wt:magent-browser`        | Web content extraction and verification         | Phase 3 (if web sources) |
| `rd2:anti-hallucination`   | Verification and anti-hallucination protocol    | Phase 4 (verification)   |
| `rd2:knowledge-extraction` | Structured information extraction               | Phase 2-3 (extraction)   |
| `wt:markitdown-browser`    | Clean markdown conversion                       | Phase 3 (web content)    |

## Quality Assurance

All research outputs include:

- [x] Complete citations with publication dates
- [x] Confidence scores for each claim
- [x] GRADE evidence quality assessment
- [x] Bias assessment (publication, selection, confirmation)
- [x] Explicit acknowledgment of limitations
- [x] Reproducible search strategy documentation
- [x] Distinction between peer-reviewed and preprint sources

## Implementation

This command uses a hybrid approach:

**Command Layer (this file)**: Thin wrapper with pseudocode for orchestration

**Agent Layer**: Delegates to:

- `wt:super-researcher` - Core research methodology
- `rd2:knowledge-seeker` - Synthesis specialist
- Other resources as needed per research type

## Troubleshooting

### Common Issues

| Issue                    | Symptoms                              | Solution                                                                           |
| ------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------- |
| **No sources found**     | Empty results, zero citations         | Broaden search terms, increase `--years`, try `--type rapid`                       |
| **Timeout error**        | Research stops mid-execution          | Use `--depth quick` for faster results, reduce `--years`                           |
| **Too many sources**     | Overwhelming output, slow processing  | Use `--depth standard` or `--format brief` for summarized results                  |
| **Conflicting evidence** | Contradictory findings across sources | Results include bias assessment; review "Heterogeneity & Bias Assessment" section  |
| **Preprint overload**    | Too many unverified sources           | Command distinguishes peer-reviewed from preprints; check evidence quality ratings |

### Database Fallback Strategy

If primary databases are unavailable:

1. **Semantic Scholar down** → Use Google Scholar + ArXiv
2. **ArXiv slow** → Use bioRxiv/medRxiv + WebSearch
3. **All academic databases unavailable** → Use WebSearch with `site:.edu` filter
4. **WebSearch fails** → Use `wt:magent-browser` for direct URL extraction
5. **All tools fail** → State limitation explicitly + assign LOW confidence

### Timeout Handling

Research tasks may take longer depending on:

- Source availability and database response times
- Complexity of research topic
- Specified time range (`--years`)
- Research depth (`--depth`)

**Mitigation:**

- Start with `--depth quick` for initial overview
- Increase to `--depth standard` or `--comprehensive` for deeper research
- Use `--type rapid` for time-sensitive queries

## See Also

- `wt:super-researcher` - Core research agent with systematic methodology
- `rd2:knowledge-seeker` - Knowledge synthesis specialist
- `rd2:anti-hallucination` - Verification protocol skill
- `wt:magent-browser` - Browser automation for web research
- `/info-seek` - Quick information extraction command
