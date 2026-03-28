---
name: source-evaluation
description: "Source credibility assessment, publication bias detection, evidence hierarchy, citation analysis, and preprint/gray literature evaluation for knowledge extraction."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-27
updated_at: 2026-03-27
tags: [research, evaluation, credibility, bias, evidence-hierarchy, knowledge-extraction, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
see_also:
  - rd3:knowledge-extraction
  - rd3:knowledge-extraction/references/research-methodology
  - rd3:knowledge-extraction/references/validation-methods
  - rd3:knowledge-extraction/references/conflict-resolution
---

# Source Evaluation

Systematic assessment of source quality, credibility, and reliability for knowledge extraction.

## Evidence Hierarchy

Sources are ranked by reliability. Always prefer higher-tier sources.

| Tier | Source Type | Trust Level | Examples |
|------|-----------|-------------|---------|
| 1 | **Official documentation** | Highest | Python.org, TypeScript docs, framework official guides |
| 2 | **Peer-reviewed research** | Very High | Journal articles, conference proceedings |
| 3 | **Authoritative guides** | High | MDN, Go Blog, official engineering blogs |
| 4 | **Well-maintained repos** | High | Official GitHub repos with recent activity |
| 5 | **Industry white papers** | Medium-High | Vendor research, case studies |
| 6 | **Company engineering blogs** | Medium | OpenAI, Anthropic, Google AI, Meta AI (may have marketing bias) |
| 7 | **Preprints** | Medium | arXiv, bioRxiv (not yet peer-reviewed) |
| 8 | **Community consensus** | Low | Stack Overflow, Reddit, forums |

### Recency Modifiers

| Field Category | Recency Requirement | Rationale |
|---------------|-------------------|-----------|
| AI/ML, LLMs | < 6 months | Rapid evolution, frequent breakthroughs |
| Web frameworks | < 1 year | Major versions release frequently |
| Programming languages | < 2 years | Slower evolution, more stable |
| Standards (RFC, ISO) | Version-specific | Check for superseding documents |
| Algorithms, CS theory | No recency requirement | Fundamentals rarely change |

## Source Credibility Assessment

### CRAAP Test

| Criterion | Questions to Ask | Red Flags |
|-----------|-----------------|-----------|
| **C**urrency | When was it published/updated? | No date; date >2 years for fast-moving topics |
| **R**elevance | Does it address the research question? | Tangential coverage; different domain |
| **A**uthority | Who is the author/publisher? | Anonymous; no credentials; no affiliation |
| **A**ccuracy | Is evidence provided? Peer-reviewed? | No citations; unverifiable claims; contradicts official docs |
| **P**urpose | Why does this exist? Inform, sell, persuade? | Marketing content disguised as research; clear vendor bias |

### Author Credibility Indicators

```
HIGH credibility:
  - Known expert in the field (published papers, recognized contributions)
  - Employed by relevant organization (framework core team, research lab)
  - Has verifiable track record (GitHub contributions, conference talks)

MEDIUM credibility:
  - Professional developer with relevant experience
  - Blogger with consistent, well-sourced content
  - Author affiliated with reputable company

LOW credibility:
  - Anonymous author
  - No verifiable expertise
  - Content farm or AI-generated without expert review
  - Self-published without peer review
```

## Publication Bias Detection

### Types of Bias

| Bias Type | Description | How to Detect |
|-----------|-------------|--------------|
| **Positive results bias** | Studies showing positive results published more often | Look for null/negative results; check if "it didn't work" papers exist |
| **File drawer problem** | Negative results never submitted for publication | Absence of contradicting evidence is not evidence of absence |
| **Vendor bias** | Company-sponsored research favoring their products | Check funding, affiliations; look for independent replication |
| **Survivorship bias** | Only successful approaches are documented | Search for "lessons learned", "post-mortem", failure case studies |
| **Confirmation bias** | Researchers finding what they expect | Check methodology rigor; look for preregistered studies |

### Bias Mitigation

```
1. Actively search for contradicting evidence
2. Check if study was funded by parties with financial interest
3. Look for independent replications of findings
4. Note absence of negative results as a potential red flag
5. Weight meta-analyses over individual studies
```

## Conflict of Interest Identification

| Indicator | Risk Level | Action |
|-----------|-----------|--------|
| Author works for vendor being evaluated | HIGH | Seek independent verification |
| Research funded by interested party | MEDIUM-HIGH | Note funding; seek independent replication |
| Author has competing product/paper | MEDIUM | Note potential bias; cross-reference |
| No disclosed conflicts | LOW (if credible venue) | Proceed with normal evaluation |
| Disclosure statement missing | MEDIUM | Note absence; apply extra scrutiny |

## Citation Analysis

### Indicators of Source Quality

| Metric | Interpretation | Caveat |
|--------|---------------|--------|
| **Citation count** | Higher = more impactful | Older papers accumulate more citations naturally |
| **h-index** | Author productivity and impact | Varies by field; not comparable across disciplines |
| **Citation context** | Supporting, contrasting, or neutral? | Check if cited positively or as a counterexample |
| **Self-citation rate** | Excessive self-citation suggests inflation | Some self-citation is normal (building on own work) |
| **Recent citation trend** | Increasing = growing relevance | Sudden spike may indicate controversy, not quality |

## Publication Venue Assessment

| Venue Type | Quality Indicators | Red Flags |
|-----------|-------------------|-----------|
| **Top-tier journals** | High impact factor, rigorous review | Long publication lag (content may be outdated) |
| **Top conferences** | Competitive acceptance rate (<25%) | Proceedings may lack full methodology details |
| **Reputable workshops** | Peer-reviewed, associated with major conference | Lower rigor than main conference |
| **Preprint servers** | Rapid access, version history | Not peer-reviewed; quality varies widely |
| **Predatory journals** | N/A — avoid | Pay-to-publish, no real peer review, spam solicitation |

### Predatory Journal Detection

```
Red flags:
  - Aggressive email solicitation for submissions
  - Unrealistically fast peer review (<2 weeks)
  - No identifiable editorial board or fake credentials
  - Not indexed in reputable databases (Scopus, Web of Science)
  - Charges high APCs with no editorial services
  - Check against Beall's List or Think.Check.Submit
```

## Preprint Evaluation

Preprints (arXiv, bioRxiv, SSRN) require extra scrutiny:

| Check | Action |
|-------|--------|
| Peer review status | Has a published version appeared? Prefer it if available |
| Version history | Check if early versions were substantially revised |
| Author credentials | Apply standard credibility assessment |
| Community reception | Check for public commentary, social media discussion |
| Replication | Has anyone replicated or extended the results? |
| Time since posting | Very recent preprints have less community vetting |

## Gray Literature Assessment

Gray literature (white papers, technical reports, government documents) is not peer-reviewed but can be valuable.

| Source | Typical Quality | Use With |
|--------|----------------|----------|
| Government reports | Medium-High | Good for policy, statistics, standards |
| NGO/IGO reports | Medium-High | Good for domain-specific data |
| Corporate white papers | Medium (vendor bias risk) | Good for industry trends; verify independently |
| Technical reports | Medium | Good for implementation details; check methodology |
| Theses/dissertations | Medium | Good for comprehensive reviews; check supervisor/institution |
| Conference abstracts | Low-Medium | Preliminary results; seek full paper if available |

## Quick Evaluation Workflow

```
FOR EACH source:
  1. Check publication date → meets recency threshold?
  2. Identify author → credible in this domain?
  3. Assess venue → reputable publication channel?
  4. Check for conflicts → funding, affiliation, competing interests?
  5. Verify claims → does evidence support conclusions?
  6. Assign tier → where in evidence hierarchy?
  7. Record assessment → add to research log
```
