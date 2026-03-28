---
name: knowledge-extraction
description: "Extract, synthesize, and validate information from multiple sources with cross-verification, chain-of-verification, RAG-grounded synthesis, deduplication, and source attribution. Trigger when: researching APIs/libraries/frameworks, verifying facts, consolidating from PDFs/web/code, cross-referencing docs, fact-checking claims, investigating version-specific behavior, gathering architectural decision info, or performing multi-hop reasoning across interconnected sources."
license: Apache-2.0
version: 2.1.0
created_at: 2026-03-23
updated_at: 2026-03-27
type: technique
tags: [research, verification, synthesis, knowledge, chain-of-verification, RAG, multi-hop, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions: knowledge-only
see_also:
  - rd3:anti-hallucination
  - rd3:sys-debugging
  - rd3:sys-developing
  - rd3:sys-testing
  - rd3:knowledge-extraction/references/validation-methods
  - rd3:knowledge-extraction/references/conflict-resolution
  - rd3:knowledge-extraction/references/deduplication
  - rd3:knowledge-extraction/references/tool-selection
  - rd3:knowledge-extraction/references/synthesis-patterns
  - rd3:knowledge-extraction/references/research-methodology
  - rd3:knowledge-extraction/references/research-process
  - rd3:knowledge-extraction/references/source-evaluation
  - rd3:knowledge-extraction/references/citation-attribution
  - rd3:knowledge-extraction/references/output-templates
---

# rd3:knowledge-extraction — Information Extraction and Synthesis

Systematic information extraction, verification, and synthesis from multiple sources. Transforms raw data into verified, citable knowledge with confidence scoring.

## Overview

This skill guides the systematic gathering of information from multiple sources with cross-verification, deduplication, and proper attribution. It covers five extraction workflows (single-source, multi-source, aspect-based, consolidation, and multi-source reconciliation), confidence scoring, anti-patterns, and output formatting.

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
- **Reconciling multiple versions** of the same document or skill content
- **Merging conflicting content** during skill migration or document consolidation
- **Conducting systematic literature reviews** with PRISMA methodology
- **Performing evidence synthesis** or meta-analysis across multiple studies
- **Identifying knowledge gaps** in a research area
- **Applying research methodology guidance** (PICO, SMART, search strategy design)
- **Ensuring proper citation and attribution** in research outputs
- **Fact-checking claims** with multi-source verification and confidence scoring

**Key distinction:**
- **`rd3:knowledge-extraction`** = Information extraction, verification, and synthesis
- **Other skills** = Information access (execution, debugging, testing)
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

| Example | Scenario | Workflow | Confidence |
|---------|----------|----------|------------|
| React Server Components | Compare Server vs Client Components | Multi-Source Synthesis | HIGH |
| Python Self Type | PEP 673 type annotation usage | Single Source + Verify | HIGH |

See [Usage Examples](references/usage-examples.md) for full step-by-step walkthroughs with output.

## Extraction Workflows

| Workflow | Use For | Key Steps |
|----------|---------|-----------|
| Single Source | Simple lookups, quick facts | Load → Extract → Verify with 1-2 sources → Cite |
| Multi-Source Synthesis | Complex topics, conflicting info | Extract from 3+ sources → Cross-verify → Resolve conflicts → Cite all |
| Aspect-Based | Targeted retrieval | Define aspect → Scan → Filter by relevance → Verify → Consolidate |
| Consolidation | Merging related information | Extract all → Identify unique/overlapping → Merge → Resolve conflicts |
| Multi-Source Reconciliation | Merging conflicting document versions | Detect conflicts → Deterministic merge → Score quality (0-100) → Attribution |

See [Extraction Workflows](references/extraction-workflows.md) for detailed steps, scripts, and CLI usage.

## Research Workflows

For deeper research tasks (literature reviews, evidence synthesis, fact-checking), use the **5-phase research process**:

1. **Define Scope** — Clarify question, set recency threshold, choose confidence level
2. **Design Search Strategy** — Select tools, construct queries, plan verification
3. **Execute Systematic Search** — Run searches, gather sources, assess quality
4. **Synthesize and Verify** — Cross-reference, resolve conflicts, score confidence
5. **Present Results** — Structure output using appropriate template

See [Research Process](references/research-process.md) for full details and decision framework.

**Supporting references:**
- [Research Methodology](references/research-methodology.md) — PRISMA, meta-analysis, PICO, search strategy, synthesis patterns
- [Source Evaluation](references/source-evaluation.md) — Credibility assessment, evidence hierarchy, bias detection
- [Citation & Attribution](references/citation-attribution.md) — Citation formats, quotation vs paraphrase, attribution practices
- [Output Templates](references/output-templates.md) — Research Synthesis, Quick Verification, Literature Review, Error Response templates

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

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Single Source Verification | Presenting info from only one source | HIGH claims need 2+ sources; CRITICAL need 3+ |
| Ignoring Conflicts | Presenting consensus without noting conflicts | Record each conflicting claim with attribution |
| Outdated Sources | Using outdated info without verification | Prefer current primary sources; note historical context |
| Circular Attribution | Citing sources that quote each other | Trace claims to the original source |
| Missing Confidence Levels | No confidence assessment | Assign HIGH/MEDIUM/LOW/UNVERIFIED with reasoning |

See [Anti-Patterns](references/anti-patterns.md) for detailed examples and code snippets.

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

- **`references/extraction-workflows.md`** — Single-source, multi-source, aspect-based, consolidation, and multi-source reconciliation workflows with scripts and CLI usage
- **`references/usage-examples.md`** — Full step-by-step walkthroughs for React Server Components and Python Self Type research
- **`references/anti-patterns.md`** — Detailed anti-pattern descriptions with code examples
- **`references/tool-selection.md`** — Detailed MCP tool usage, decision trees, source type handling, including HuggingFace papers and W&B Weave traces
- **`references/validation-methods.md`** — Triangulation, credibility assessment, confidence scoring
- **`references/conflict-resolution.md`** — Handling factual, interpretive, temporal, and scope disagreements
- **`references/deduplication.md`** — Content merging and duplicate elimination strategies
- **`references/synthesis-patterns.md`** — Chain-of-Verification, RAG-grounded synthesis, multi-hop reasoning, citation verification, anti-hallucination workflow, red flags, and fallback protocol
- **`references/research-methodology.md`** — PRISMA systematic review, meta-analysis, PICO/SMART question formulation, search strategy design, knowledge synthesis patterns
- **`references/research-process.md`** — Five-phase research process (Define, Design, Execute, Synthesize, Present) with decision framework and workflow routing
- **`references/source-evaluation.md`** — Evidence hierarchy, CRAAP test, publication bias detection, citation analysis, preprint and gray literature evaluation
- **`references/citation-attribution.md`** — Citation style guides (APA, IEEE, ACM), in-text formats, DOI/URL handling, quotation vs paraphrase, attribution best practices
- **`references/output-templates.md`** — Four structured output templates: Research Synthesis, Quick Verification, Literature Review, Error Response

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

## Additional Resources

- [Core Principles](references/core-principles.md) — Foundational verification-before-synthesis philosophy
- [Extraction Workflows](references/extraction-workflows.md) — Detailed workflow steps, reconciliation scripts, CLI usage
- Related skills: `rd3:anti-hallucination`, `rd3:sys-debugging`, `rd3:sys-developing`, `rd3:sys-testing`

---

**Remember**: Verification before synthesis. Never present information as fact without cross-checking. Multiple sources > single source. Always cite sources with dates.
