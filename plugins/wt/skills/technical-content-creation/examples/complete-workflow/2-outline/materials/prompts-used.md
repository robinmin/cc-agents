# Prompts Used for Outline Generation

## Generation Context

- **Date**: 2026-01-30
- **Source**: 1-research/research-brief.md
- **Tool**: scripts/outline-generator.py
- **Options Generated**: 3 (A, B, C)
- **Selected**: B (Narrative/Story-driven)

---

## Prompt for Option A - Traditional/Structured

```
Generate a structured outline for an article on code documentation.

REQUIREMENTS:
- Style: Traditional/Structured
- Approach: Hierarchical, logical organization
- Length: Long (2000 words)
- Audience: Developers seeking a comprehensive reference

CONTENT FOCUS:
- Core principles (clarity, accuracy, completeness, examples)
- Documentation types (API, architecture, inline, README, tutorials)
- Tools and techniques (generators, API docs, diagrams)
- Documentation as Code (version control, automation, CI/CD)
- Quality measurement (coverage, readability, currency)
- Building culture (leadership, process, training)
- Language-specific best practices
- Future trends

STRUCTURE:
- Use clear, hierarchical sections
- Number sections for easy reference
- Include subsections for detailed topics
- Conclude with key takeaways and resources
```

---

## Prompt for Option B - Narrative/Story-driven

```
Generate a narrative-driven outline for an article on code documentation.

REQUIREMENTS:
- Style: Narrative/Story-driven
- Approach: Engaging flow with real-world examples
- Length: Long (1800 words)
- Audience: Developers who find traditional documentation dry

CONTENT FOCUS:
- Start with relatable "documentation crisis" story
- Emphasize empathy and the reader's journey
- Use real-world case studies (good vs. bad examples)
- Focus on the human side of documentation
- Include industry examples (Google, Stripe, Twilio)
- Make it practical and actionable

STRUCTURE:
- Use storytelling to engage readers
- Include real-world examples throughout
- Build emotional connection
- Conclude with call to action
- Make technical content accessible through narrative
```

---

## Prompt for Option C - Technical/Deep-dive

```
Generate a comprehensive technical outline for an article on code documentation.

REQUIREMENTS:
- Style: Technical/Deep-dive
- Approach: Comprehensive, detailed with code examples
- Length: Long (2500 words)
- Audience: Senior developers, technical leads, documentation architects

CONTENT FOCUS:
- Documentation architecture and standards
- API documentation specifications (OpenAPI, AsyncAPI)
- Language-specific standards (Python, JavaScript, Java, Go, Rust)
- Tools deep dive (architecture, extensions, configuration)
- Advanced topics (i18n, a11y, testing, automation)
- Implementation guide with workflows
- Language-specific patterns
- Case studies from large-scale systems
- Future directions and emerging standards

STRUCTURE:
- Maximum technical depth
- Include implementation details
- Cover multiple languages and tools
- Provide actionable technical guidance
- Include reference material and specifications
```

---

## Selection Criteria

**Option A (Traditional)**:
- Pros: Clear, structured, easy to reference
- Cons: May feel dry or academic
- Best for: Technical reference guides

**Option B (Narrative)** [SELECTED]:
- Pros: Engaging, relatable, memorable
- Cons: Less structured than Option A
- Best for: Blog posts, educational content

**Option C (Technical)**:
- Pros: Comprehensive, implementation-focused
- Cons: May overwhelm general audience
- Best for: Senior developer audience

---

## User Selection

**Selected**: Option B (Narrative/Story-driven)

**Reasoning**:
- Target audience prefers engaging content
- Story-driven approach increases retention
- Real-world examples make concepts relatable
- Balances accessibility with information
- Best suited for publication on developer blogs

---

## Generation Parameters

See `generation-params.json` for technical parameters used during generation.
