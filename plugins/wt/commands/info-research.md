---
description: Conduct systematic, evidence-based research with file input support and 1-research/ output integration
argument-hint: "<research-topic>" [--file <path>] [--type <type>] [--years <N>] [--format <format>] [--depth <depth>]
---

# Info Researcher

Conduct comprehensive, systematic research on any topic using evidence-based methodology with multi-source verification and quality assessment. Supports file-based input from materials-extracted.md and automatic save to 1-research/ folder.

## Quick Start

```bash
/wt:info-research "machine learning interpretability"                        # Topic-based research
/wt:info-research --file 0-materials/materials-extracted.md                 # File-based research
/wt:info-research "AI trends" --type rapid --format brief                   # Quick research
```

## When to Use

- Conducting academic literature reviews or systematic reviews
- Verifying controversial claims or fact-checking statements
- Exploring emerging technologies or scientific developments
- Analyzing research trends across multiple domains
- Generating evidence-based reports with citations
- Understanding complex topics through rigorous synthesis
- Research from extracted materials (file-based workflow)

## Arguments

| Argument   | Required | Description                                                         | Default      |
| ---------- | -------- | ------------------------------------------------------------------- | ------------ |
| `<topic>`  | Yes*     | Research question or topic to investigate                           | -            |
| `--file`   | Yes*     | Input file for context (materials-extracted.md)                     | -            |
| `--type`   | No       | Research type: `systematic`, `rapid`, `meta-analysis`, `fact-check` | `systematic` |
| `--years`  | No       | Time range in years (e.g., 5, 10, 20)                               | `5`          |
| `--format` | No       | Output format: `markdown`, `report`, `brief`                        | `markdown`   |
| `--depth`  | No       | Research depth: `quick`, `standard`, `comprehensive`                | `standard`   |
| `--save`   | No       | Save output to 1-research/research-brief.md                         | auto         |
| `--help`   | No       | Show help message                                                   | -            |

*Either `<topic>` or `--file` must be provided

## Enhanced Workflow with --file

```
1. Parse command arguments (topic, --file, --type, --years, --save)
2. Detect topic folder for 1-research/ path
3. Input processing:
   IF --file provided:
     - Read materials-extracted.md
     - Extract key topics, keywords, aspects from content
     - Use extracted topics as research focus
   ELSE:
     - Use <topic> string directly
4. Execute research using wt:super-researcher
5. Generate research-brief.md with frontmatter:
   - source_materials: materials-extracted.md (if provided)
   - research_type: --type value
   - time_range: --years value
   - topics: researched topics
6. Update 1-research/sources.json index
7. Report success with file path
```

## File-Based Input

When `--file` is provided, the command:

1. Reads `materials-extracted.md` from 0-materials/
2. Extracts key topics and research themes from the content
3. Uses extracted topics as the research focus
4. Generates comprehensive research on those topics

**Example workflow:**

```bash
# Stage 0: Extract materials
/wt:info-seek research-paper.pdf --save

# Stage 1: Research from materials
/wt:info-research --file 0-materials/materials-extracted.md
```

## sources.json Index Format

```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-28T10:00:00Z",
  "sources": [
    {
      "id": "src-001",
      "title": "Research Paper Title",
      "url": "https://example.com/paper",
      "type": "academic | web | documentation",
      "cited_in": "research-brief.md",
      "added_at": "2026-01-28T10:00:00Z"
    }
  ],
  "research_type": "systematic",
  "time_range": "2021-2026",
  "confidence": "HIGH"
}
```

## research-brief.md Frontmatter

```markdown
---
title: Research Brief: [Topic]
source_materials: 0-materials/materials-extracted.md
research_type: systematic
time_range: 2021-2026
topics:
  - topic-1
  - topic-2
  - topic-3
created_at: 2026-01-28T10:00:00Z
status: draft | approved
confidence: HIGH | MEDIUM | LOW
sources_count: 25
---

# Research Brief: [Topic]

## Executive Summary

[3-5 key findings with confidence levels]

## Research Parameters

- **Type**: systematic
- **Time Range**: 2021-2026
- **Sources**: 25 sources
- **Confidence**: HIGH

## Key Findings

### Theme 1: [Category]

- Finding 1 [HIGH confidence]
- Finding 2 [MEDIUM confidence]

## Methodology

[Research methodology description]

## Sources

- [Source 1](URL) | Verified: 2026-01-28
- [Source 2](URL) | Verified: 2026-01-28
```

## Input Validation

### Required Arguments

- **`<topic>`**: Must be non-empty research question or topic (if --file not provided)
- **`--file`**: Must exist and be readable (if provided instead of topic)

### Optional Arguments

- **`--type`**: Must be one of `systematic`, `rapid`, `meta-analysis`, `fact-check`
- **`--years`**: Positive integer between 1-100
- **`--format`**: Must be one of `markdown`, `report`, `brief`
- **`--depth`**: Must be one of `quick`, `standard`, `comprehensive`

### Error Handling

| Error                              | Behavior                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------- |
| Missing `<topic>` and no `--file`  | Prompt user for research topic or provide file                             |
| Invalid `--type`                   | Default to `systematic` with warning message                               |
| Invalid `--years`                  | Default to `5` with warning message                                        |
| Invalid `--format`                 | Default to `markdown` with warning message                                 |
| Invalid `--depth`                  | Default to `standard` with warning message                                 |
| File not found (--file)            | Error: "File not found: {path}"                                            |
| 1-research/ folder not found       | Error: "Not in a topic folder. Run from within a topic directory."         |

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
-> Task(subagent_type="wt:super-researcher",
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
-> Task(subagent_type="rd2:knowledge-seeker",
    prompt="Synthesize research findings from Phase 1
     Extract key insights, identify patterns,
     highlight consensus and controversies,
     assess evidence quality across sources,
     provide integrated knowledge synthesis.")
```

### Phase 3: Web Content Verification (if needed)

```
Step 3: Verify and extract web content
-> IF web sources identified:
   Task(subagent_type="wt:magent-browser",
       prompt="Extract and verify content from identified web sources
        Convert to clean markdown using markitdown
        Ensure accurate citation and metadata extraction")
```

### Phase 4: Anti-Hallucination Verification

```
Step 4: Apply verification protocol
-> Skill(skill="rd2:anti-hallucination",
    args="Verify all claims, check source citations,
          validate evidence quality, flag uncertainties,
          ensure proper attribution and confidence scoring")
```

### Phase 5: Save and Final Report

```
Step 5: Generate and save report
-> IF in topic folder with 1-research/:
   Save to 1-research/research-brief.md
   Update 1-research/sources.json
   Format output based on --format parameter
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
   - Search multiple databases
   - Document search strategy for reproducibility

3. **Screening & Selection**
   - Title/abstract screening
   - Full-text review
   - Document exclusion reasons

4. **Quality Assessment**
   - Apply GRADE evidence hierarchy
   - Assess risk of bias
   - Evaluate study quality

5. **Data Extraction & Synthesis**
   - Extract key findings, effect sizes, sample sizes
   - Conduct meta-analysis if appropriate
   - Perform narrative synthesis for heterogeneous evidence

6. **Bias Detection**
   - Assess publication bias
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

### Example 1: Topic-Based Research

```bash
/wt:info-research 'machine learning interpretability techniques 2020-2025'
```

**Output**: PRISMA-compliant systematic review

### Example 2: File-Based Research

```bash
/wt:info-research --file 0-materials/materials-extracted.md
```

**Output**: Research based on extracted materials

### Example 3: Rapid Brief

```bash
/wt:info-research 'quantum computing' --type rapid --format brief
```

**Output**: Concise brief with key insights

## Integration with Technical Content Workflow

This command integrates with the Technical Content Workflow stages:

```
Stage 0: Materials (0-materials/)
         |
         v
Stage 1: Research (1-research/) <-- This command
         |
         v
Stage 2: Outline (2-outline/)
         |
         v
Stage 3: Draft (3-draft/)
```

**Workflow integration:**

1. `/wt:info-seek <sources> --save` - Stage 0: Materials
2. `/wt:info-research --file 0-materials/materials-extracted.md` - Stage 1: Research
3. `/wt:topic-outline 1-research/research-brief.md` - Stage 2: Outline
4. `/wt:topic-draft <profile> --file 2-outline/outline-approved.md` - Stage 3: Draft

## Resource Coordination

This command orchestrates the following resources:

| Resource                   | Role                                            | When Used                |
| -------------------------- | ----------------------------------------------- | ------------------------ |
| `wt:super-researcher`      | Main research agent with systematic methodology | Always (primary)         |
| `rd2:knowledge-seeker`     | Knowledge synthesis and pattern identification  | Phase 2 (synthesis)      |
| `wt:magent-browser`        | Web content extraction and verification         | Phase 3 (if web sources) |
| `rd2:anti-hallucination`   | Verification and anti-hallucination protocol    | Phase 4 (verification)   |

## Quality Assurance

All research outputs include:

- [x] Complete citations with publication dates
- [x] Confidence scores for each claim
- [x] GRADE evidence quality assessment
- [x] Bias assessment (publication, selection, confirmation)
- [x] Explicit acknowledgment of limitations
- [x] Reproducible search strategy documentation
- [x] Distinction between peer-reviewed and preprint sources
- [x] sources.json index update (when in topic folder)

## Troubleshooting

### Common Issues

| Issue                    | Symptoms                              | Solution                                                                           |
| ------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------- |
| **No sources found**     | Empty results, zero citations         | Broaden search terms, increase `--years`, try `--type rapid`                       |
| **Timeout error**        | Research stops mid-execution          | Use `--depth quick` for faster results, reduce `--years`                           |
| **Too many sources**     | Overwhelming output, slow processing  | Use `--depth standard` or `--format brief` for summarized results                  |
| **Conflicting evidence** | Contradictory findings across sources | Results include bias assessment; review "Heterogeneity & Bias Assessment" section  |
| **Not in topic folder**  | Cannot save to 1-research/            | Run from within a topic directory or specify full paths                           |

### Database Fallback Strategy

If primary databases are unavailable:

1. **Semantic Scholar down** -> Use Google Scholar + ArXiv
2. **ArXiv slow** -> Use bioRxiv/medRxiv + WebSearch
3. **All academic databases unavailable** -> Use WebSearch with `site:.edu` filter
4. **WebSearch fails** -> Use `wt:magent-browser` for direct URL extraction
5. **All tools fail** -> State limitation explicitly + assign LOW confidence

## See Also

- `/wt:info-seek` - Extract and save materials (Stage 0)
- `/wt:topic-outline` - Generate outline from research (Stage 2)
- `wt:super-researcher` - Core research agent
- `rd2:knowledge-seeker` - Knowledge synthesis specialist
- `rd2:anti-hallucination` - Verification protocol skill

---

**Remember**: Use `--file` to research from extracted materials. Results are automatically saved to 1-research/ when run from within a topic folder.
