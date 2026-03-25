---
name: core-principles
description: "Extracted section: Core Principles"
see_also:
  - rd3:knowledge-extraction
---

# Core Principles

### 1. Verification Before Synthesis [CRITICAL]

**Never present information without verification.**

```
EXTRACT → VERIFY → CONSOLIDATE → CITE
```

- Extract information from primary source
- Cross-verify with 2+ independent sources
- Flag conflicts for manual resolution
- Always attribute sources

### 2. Confidence Scoring

| Level | Score | Criteria |
|-------|-------|----------|
| **HIGH** | >90% | Direct quotes from official docs (2024+), verified today |
| **MEDIUM** | 70-90% | Synthesized from 2+ authoritative sources |
| **LOW** | <70% | Unclear sourcing, outdated, single source |
| **UNVERIFIED** | 0% | No sources found — do not present |

### 3. Tool Priority

1. **`ref` (MCP)** — API/Library official documentation
2. **`mcp__grep__searchGitHub`** — GitHub code examples
3. **`WebSearch`** — Recent facts (< 6 months)
4. **`WebFetch`** — Static content, specific URLs
5. **`rd3:quick-grep` + `Read`** — Local codebase discovery and file inspection

### 4. Chain-of-Verification (SOTA)

Chain-of-Verification (CoV) is a SOTA technique where the LLM iteratively verifies its own outputs against source material. Unlike one-pass extraction, CoV involves explicit verification steps that catch hallucinations before they reach the user.

```
EXTRACT → GENERATE_ANSWERS → GENERATE_VERIFICATION_QUESTIONS →
INDEPENDENT_VERIFICATION → REVISE_ANSWER → CONSOLIDATE → CITE
```

**CoV Protocol:**

1. **Extract** — Gather raw information from primary sources
2. **Generate Answers** — Form initial response from extracted material
3. **Generate Verification Questions** — Create specific test questions that would confirm or deny each claim
4. **Independent Verification** — Answer each question by re-reading sources (not from memory of step 1)
5. **Revise Answer** — Correct any claims that failed verification
6. **Consolidate** — Merge verified claims with proper attribution
7. **Cite** — Format with sources and confidence

**When to use CoV:**
- Complex multi-claim answers where a single error invalidates the whole response
- High-stakes information (security, architecture, API contracts)
- Conflicting sources that require careful reconciliation
- When working without MCP tools (manual verification steps substitute for automated ref checks)

**Anti-Pattern it prevents:** "Hallucination cascade" — where one wrong fact leads to increasingly confident but wrong conclusions.

### 5. RAG-Grounded Synthesis (SOTA)

RAG (Retrieval-Augmented Generation) patterns ensure responses are always grounded in retrieved context rather than LLM parametric memory.

**Groundedness Protocol:**

```typescript
interface GroundedResponse {
  claim: string;
  supportingContext: string;  // Exact quote from retrieved source
  sourceUrl: string;
  retrievalScore: number;     // 0-1 similarity score
}
```

**RAG Workflow:**
1. **Retrieve** — Fetch relevant documents using `ref`, `WebFetch`, or `mcp__grep__searchGitHub`
2. **Chunk** — Segment retrieved content into verifiable units
3. **Generate** — Produce claims, each explicitly tied to a chunk
4. **Score** — Rate retrieval relevance (0-1)
5. **Filter** — Discard claims with retrieval score < 0.7
6. **Cite** — Attach exact source URL and chunk location

**Groundedness vs. Confidence:**
- Confidence = "Is this claim correct?" (truth value)
- Groundedness = "Is this claim connected to source material?" (traceability)

A claim can be HIGH confidence but LOW groundedness (LLM knows it from training) — always prefer HIGH groundedness for factual claims.

### 6. Multi-Hop Reasoning (SOTA)

Multi-hop reasoning chains connect facts across multiple sources that individually don't answer the question.

**Multi-Hop Protocol:**
```
Hop 1: Source A → Fact 1
Hop 2: Source B → Fact 2 (builds on Fact 1)
Hop 3: Source C → Fact 3 (builds on Fact 2)
→ Synthesis: Inferred conclusion from chained facts
```

**Example:**
- Hop 1: "LangChain added LangGraph in March 2024" (GitHub release notes)
- Hop 2: "LangGraph supports cycles for agent loops" (docs)
- Hop 3: "Claude Code uses LangChain" (web search)
- Synthesis: "Claude Code potentially benefits from LangGraph cycles for agentic workflows"

**Each hop must cite its source.** Multi-hop conclusions are always MEDIUM or LOW confidence unless each hop is independently verified.

### 7. Credibility Hierarchy

1. **Official documentation** (python.org, react.dev) — HIGHEST
2. **Official engineering blogs** (Google, Meta, OpenAI) — HIGH
3. **Well-maintained GitHub repos** — MEDIUM-HIGH
4. **Peer-reviewed papers** — MEDIUM
5. **Technical blogs** — MEDIUM
6. **StackOverflow, forums** — LOW-MEDIUM
