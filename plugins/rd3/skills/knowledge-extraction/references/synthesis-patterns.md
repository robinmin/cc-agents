---
name: synthesis-patterns
description: "Chain-of-Verification, RAG-grounded synthesis, multi-hop reasoning, and citation verification patterns for SOTA knowledge extraction."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-24
updated_at: 2026-03-24
tags: [research, verification, chain-of-verification, RAG, multi-hop, groundedness, synthesis, knowledge-extraction, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
see_also:
  - rd3:knowledge-extraction
  - rd3:knowledge-extraction/references/validation-methods
  - rd3:knowledge-extraction/references/conflict-resolution
  - rd3:knowledge-extraction/references/tool-selection
---

# Advanced Synthesis Patterns

This reference covers SOTA techniques for knowledge synthesis that go beyond basic extraction and verification.

## Chain-of-Verification (CoV)

Chain-of-Verification is a SOTA self-verification technique where the agent iteratively verifies its own outputs against source material before presenting them to the user.

### Why CoV?

Standard extraction risks "hallucination cascade" — a single wrong fact leads to increasingly confident but wrong conclusions. CoV breaks this by making verification a separate, explicit step that cannot be skipped.

### CoV Implementation

```
Step 1: EXTRACT
- Gather raw information from primary sources
- Do NOT synthesize yet

Step 2: GENERATE_ANSWER
- Produce initial response from extracted material
- Mark each claim with its source

Step 3: GENERATE_VERIFICATION_QUESTIONS
- For each major claim, generate 1-3 specific test questions
- Questions should be falsifiable (answer is YES/NO, not "maybe")
- Example: "Does the source state X was introduced in version Y?"

Step 4: INDEPENDENT_VERIFICATION
- Answer each question by re-reading sources
- Do NOT use memory from Step 1/2 — read the actual source text
- Record the exact passage that answers each question

Step 5: REVISE_ANSWER
- Discard any claims that failed verification
- Mark uncertain claims with appropriate confidence level
- Do NOT soften failures — be explicit about what failed

Step 6: CONSOLIDATE
- Merge verified claims
- Note any gaps where verification was inconclusive

Step 7: CITE
- Format with sources and confidence
- Include verification questions as a trace (optional but recommended)
```

### CoV Example

**Initial claim:** "FastAPI 0.110 introduced Pydantic V2 support."

**Verification questions generated:**
1. "Did FastAPI 0.110 add Pydantic V2 support?" → YES (source: FastAPI changelog)
2. "Was Pydantic V2 released before FastAPI 0.110?" → YES (source: Pydantic release dates)

**CoV output:**
```markdown
## FastAPI Pydantic V2 Support

### Verified Claims

**Claim**: FastAPI 0.110 added Pydantic V2 support
- Verification: PASSED
- Source: [FastAPI Changelog](https://fastapi.tiangolo.com/release-notes/) | Verified: 2026-03-24
- Supporting passage: "0.110: Support for Pydantic v2 with V1 compatibility mode"

**Claim**: Pydantic V2 was released before FastAPI 0.110
- Verification: PASSED
- Source: [Pydantic Release Notes](https://docs.pydantic.dev/latest/release-notes/) | Verified: 2026-03-24

### Confidence

**Level**: HIGH
**Reasoning**: Direct verification against official changelog, cross-checked with Pydantic release dates.
```

---

## RAG-Grounded Synthesis

RAG (Retrieval-Augmented Generation) patterns ensure every claim is traceable to a specific retrieved chunk, not just to LLM memory.

### Groundedness vs. Confidence

| Property | Confidence | Groundedness |
|----------|-----------|--------------|
| Question | "Is this claim correct?" | "Is this claim connected to source material?" |
| Answer | Truth value | Traceability |
| LLM can be | Overconfident in wrong answer | Low if relying on parametric memory |

A claim can be **HIGH confidence but LOW groundedness** (LLM knows it from training data). Always prefer HIGH groundedness for factual claims.

### Grounded Response Schema

```typescript
interface GroundedClaim {
  claim: string;
  supportingChunk: string;  // Exact quote from retrieved source
  sourceUrl: string;
  retrievalScore: number;    // 0.0-1.0 similarity
  chunkIndex?: number;      // Position in retrieved document
}
```

### RAG Workflow

```
1. RETRIEVE — Fetch documents using ref, WebFetch, mcp__grep__searchGitHub
2. CHUNK — Segment into sentences or paragraphs (verifiable units)
3. GENERATE — Produce claims, each tagged with source chunk
4. SCORE — Rate retrieval relevance (0.0-1.0)
5. FILTER — Discard claims with score < 0.7
6. CITE — Attach source URL and chunk location
```

### Retrieval Score Interpretation

| Score | Meaning | Action |
|-------|---------|--------|
| 0.9-1.0 | Direct match | Use with HIGH confidence |
| 0.7-0.9 | Strong match | Use with MEDIUM-HIGH confidence |
| 0.5-0.7 | Partial match | Use with MEDIUM confidence, note gaps |
| < 0.5 | Weak match | Do not use; re-retrieve |

---

## Multi-Hop Reasoning

Multi-hop reasoning connects facts across multiple sources that individually don't answer the question.

### When to Use Multi-Hop

- The user's question has no direct answer in any single source
- You need to infer a conclusion from chained facts
- Cross-referencing multiple tools/versions/ecosystems

### Multi-Hop Protocol

```
Hop 1: Source A → Fact 1
Hop 2: Source B → Fact 2 (builds on or confirms Fact 1)
Hop 3: Source C → Fact 3 (builds on Fact 2)
→ Synthesis: Inferred conclusion
```

### Multi-Hop Quality Gates

1. **Each hop must cite its source**
2. **Each hop must be independently verifiable** (not just implied)
3. **Gaps must be explicit** — if Hop 3 requires an assumption, state it
4. **Confidence degrades with each hop** — conclusion confidence ≤ weakest hop confidence
5. **Flag speculation** — if the conclusion requires inference beyond the sources, mark as speculative

### Multi-Hop Example

**Question:** "Which AI coding assistants support Claude's extended thinking feature?"

**Hop 1:**
- Source: [Claude Code documentation](https://docs.anthropic.com)
- Fact: Claude Code supports extended thinking with `--think` flag
- Confidence: HIGH (direct from docs)

**Hop 2:**
- Source: [Cursor docs](https://cursor.com/docs)
- Fact: Cursor uses Claude API but does not expose extended thinking to users
- Confidence: HIGH (direct from docs)

**Hop 3:**
- Source: [GitHub Copilot documentation](https://docs.github.com/copilot)
- Fact: Copilot uses GPT-4 and does not have extended thinking
- Confidence: HIGH (direct from docs)

**Synthesis:**
- Claude Code: **YES** — native extended thinking support
- Cursor: **NO** — API access but no extended thinking UI
- GitHub Copilot: **NO** — different model architecture

**Confidence**: HIGH — each hop verified independently with direct source citation.

---

## Citation Verification

Citation verification checks that cited sources actually support the claims attributed to them.

### Why Verify Citations?

- Sources may have been misread or misquoted
- URLs may have changed or content updated
- A citation's context may have been distorted

### Verification Steps

```
1. Load cited URL or source
2. Search for the specific claim within the source
3. Check that the claim matches the attribution (quote, paraphrase, or summary?)
4. Check that the source is still current (not deprecated)
5. Note any discrepancies
```

### Citation Discrepancy Types

| Type | Example | Action |
|------|---------|--------|
| **Direct quote mismatch** | Claim: "is fast" vs Source: "is fast but has limitations" | Correct the quote or soften claim |
| **Paraphrase distortion** | Source nuance lost in paraphrasing | Re-phrase to preserve nuance |
| **Out-of-context** | Source discusses X but claim attributes to Y | Clarify context |
| **Stale source** | URL 404, content updated | Find current source or note archive |
| **Circular citation** | Source A cites Source B cites Source C | Trace to primary source |

### Citation Verification Example

```markdown
### Citation Verification

**Claim**: "React 18 includes automatic batching"
**Cited source**: [React 18 Blog](https://react.dev/blog/2022/03/29/react-18)

**Verification**:
- [PASS] Source loaded successfully
- [PASS] Found phrase "Automatic Batching" in blog post
- [PASS] Quote matches: "React 18 automatically batches state updates"
- [PASS] No deprecation notice found
- [PASS] Source is current (React 18 still the current major version as of 2026-03-24)

**Verdict**: Citation is valid and supports the claim.
```
