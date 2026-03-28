---
name: output-templates
description: "Four structured output templates for knowledge extraction: Research Synthesis, Quick Verification, Literature Review, and Error Response."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-27
updated_at: 2026-03-27
tags: [research, templates, output, formatting, knowledge-extraction, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
see_also:
  - rd3:knowledge-extraction
  - rd3:knowledge-extraction/references/research-process
  - rd3:knowledge-extraction/references/citation-attribution
---

# Output Templates

Structured templates for presenting knowledge extraction results. Select the template based on the research depth and user needs.

## Template Selection Guide

| Template | Use When | Typical Length |
|----------|----------|---------------|
| **Research Synthesis** | Full research on a topic | 500-2000 words |
| **Quick Verification** | Fact-checking a specific claim | 100-300 words |
| **Literature Review** | Comprehensive academic-style review | 1000-5000 words |
| **Error Response** | Research hit barriers or failed | 100-500 words |

---

## 1. Research Synthesis Template

Use for standard research tasks: "research X", "what is X", "compare X and Y".

```markdown
## Research Synthesis: {Topic}

**Search Date:** YYYY-MM-DD
**Scope:** {Brief description of research scope}
**Confidence:** {Overall confidence level}

### Research Question

{Clear statement of what was investigated}

### Methodology

**Sources Searched:**

- {Source type 1}: {What was searched, tool used}
- {Source type 2}: {What was searched, tool used}

**Search Strategy:**

- {Key search terms used}
- {Time range considered}
- {Inclusion/exclusion criteria}

### Key Findings

#### Finding 1: {Title}

**Claim:** {Specific finding}

**Evidence:**

- Source: [{Citation with link}](URL)
- Date: {Publication date}
- Confidence: HIGH/MEDIUM/LOW
- Summary: {Brief summary of what source states}

**Cross-Reference:** {If multiple sources, note consensus/conflict}

#### Finding 2: {Title}

{Same structure as above}

### Conflicts and Gaps

**Conflicting Information:**

- {Area of conflict}: {Source A says X, Source B says Y}
- Assessment: {Which source is more credible and why}

**Knowledge Gaps:**

- {Could not find: {what information is missing}}
- {Could not verify: {what claims lack authoritative sources}}

### Synthesis

{Integrated summary combining verified findings, noting confidence levels}

### Limitations

- {Methodology limitations}
- {Source limitations}
- {Recency concerns if applicable}
- {Other constraints}

### Sources

**Official/Primary:**

1. [{Title}](URL) | Verified: YYYY-MM-DD
2. [{Title}](URL) | Verified: YYYY-MM-DD

**Industry/Secondary:**

1. [{Title}](URL) | Verified: YYYY-MM-DD
2. [{Title}](URL) | Verified: YYYY-MM-DD

**Additional Reading:**

- {Optional recommendations for further research}
```

---

## 2. Quick Verification Template

Use for fact-checking: "verify X", "is it true that X", "fact-check X".

```markdown
## Verification: {Claim}

**Question:** {What was being verified}

### Result

**Finding:** {Verified claim or inability to verify}

**Sources:**

- Primary: [{Most authoritative source}](URL) | Verified: YYYY-MM-DD
- Supporting: [{Additional source}](URL) | Verified: YYYY-MM-DD

**Confidence:** HIGH/MEDIUM/LOW/UNVERIFIED

**Reasoning:** {Why this confidence level — what was found or not found}

**Caveats:** {Any limitations, version specifics, or concerns}

**Recommendation:** {For LOW/UNVERIFIED: what user should do next}
```

---

## 3. Literature Review Template

Use for comprehensive reviews: "literature review on X", "survey of X", deep research requests.

```markdown
## Literature Review: {Topic}

**Date Conducted:** YYYY-MM-DD
**Scope:** {Inclusion criteria, time range, languages}

### Abstract

{Brief summary of the review findings — 3-5 sentences}

### Introduction

{Background on the topic, why the review was conducted, research question}

### Methodology

**Research Question:**
{Clear question or purpose, formulated using PICO/SMART}

**Search Strategy:**

- Databases/Tools: {Which databases and search tools were used}
- Search Terms: {Key search strings with Boolean operators}
- Time Range: {Dates covered}
- Inclusion Criteria: {What was included and why}
- Exclusion Criteria: {What was excluded and why}

### Results

**Source Selection:**

- Initial results: {Number of sources found}
- After screening: {Number included after title/abstract review}
- Final synthesis: {Number of sources analyzed in depth}

**Thematic Findings:**

#### Theme 1: {Theme Name}

{Synthesis of findings across sources}

- [{Source A}](URL): {Key finding}
- [{Source B}](URL): {Key finding}
- Consensus: {What multiple sources agree on}
- Conflicts: {Where sources disagree}

#### Theme 2: {Theme Name}

{Same structure}

### Discussion

**Summary of Evidence:**
{What the literature collectively shows}

**Quality Assessment:**
{Overall quality of available evidence — strong, moderate, weak}

**Knowledge Gaps:**
{What is not well understood, what needs further research}

### Conclusions

{Main takeaways, evidence-based conclusions with confidence levels}

### References

{Complete citations organized by source type}

**Peer-Reviewed:**

1. {Full citation with URL and date}
2. {Full citation with URL and date}

**Official Documentation:**

1. {Full citation with URL and date}

**Industry/Other:**

1. {Full citation with URL and date}
```

---

## 4. Error Response Template

Use when research could not be completed: tool failures, no sources found, inaccessible content.

```markdown
## Cannot Complete Research

**Research Question:** {What was being investigated}

### Barriers

- {Barrier 1}: {Description — e.g., "ref tool returned no results for query X"}
- {Barrier 2}: {Description — e.g., "Source URL returned 403 Forbidden"}

### What I Found

- {Partial findings if any — include whatever was gathered}
- {Sources that were accessible and what they provided}

### What I Could Not Verify

- {Specific claims that remain unverified}
- {Reason for inability to verify each claim}

### Suggested Next Steps

1. {Action user can take — e.g., "Try accessing the source directly at URL"}
2. {Alternative approach — e.g., "Search for the topic on specific site X"}
3. {Manual verification — e.g., "Check the official changelog for version Y"}

**Confidence:** LOW — Research incomplete
```

---

## Formatting Guidelines

### Confidence Badges

Use consistent formatting for confidence levels throughout all templates:

| Level | Format | Criteria |
|-------|--------|----------|
| **HIGH** | `**Confidence:** HIGH` | Direct quote from official/primary source, verified today, 2+ sources agree |
| **MEDIUM** | `**Confidence:** MEDIUM` | Synthesized from 2+ credible sources, minor conflicts resolved |
| **LOW** | `**Confidence:** LOW` | Single source, outdated information, or unresolved conflicts |
| **UNVERIFIED** | `**Confidence:** UNVERIFIED` | No authoritative sources found; manual verification required |

### Source Citation Format

Consistent across all templates:

```markdown
- [{Source Title}](URL) | Verified: YYYY-MM-DD
```

For sources with additional metadata:

```markdown
- [{Source Title}](URL) | Author: {name} | Published: YYYY-MM-DD | Verified: YYYY-MM-DD
```

### Conflict Notation

When sources disagree:

```markdown
**Conflict:** {Topic of disagreement}
- Position A: {Claim} — [{Source A}](URL)
- Position B: {Claim} — [{Source B}](URL)
- Assessment: {Which is more credible and why}
```
