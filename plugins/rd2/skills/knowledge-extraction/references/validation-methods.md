# Validation Methods for Information Verification

This reference provides detailed guidance on validating information from multiple sources.

## Triangulation Methodology

### 3-Source Verification Protocol

**Source Layering:**

| Layer | Source Type | Credibility | Use Case |
|-------|-------------|-------------|----------|
| **Layer 1** | Official documentation | HIGH | Primary source |
| **Layer 2** | Secondary validation (blog, tutorial) | MEDIUM | Cross-verification |
| **Layer 3** | Tertiary confirmation (StackOverflow, forum) | LOW- MEDIUM | Community consensus |

**Workflow:**
```
1. Extract from official documentation (Layer 1)
2. Cross-check with authoritative blog/tutorial (Layer 2)
3. Verify with community sources (Layer 3)
4. Assess agreement level
5. Flag conflicts if found
```

**When sources disagree:**
1. Identify disagreement type (factual vs interpretive)
2. Assess source credibility
3. Check temporal context (may have changed)
4. Present with conflicting attributions
5. Flag for manual verification if uncertain

---

## Credibility Assessment

### Signal Categories

#### Message-Level Signals

**Clarity:**
- Is the information clear and specific?
- Are there concrete examples?
- Is the language precise?

**Objectivity:**
- Is there bias or agenda?
- Are limitations acknowledged?
- Is marketing language present?

**Completeness:**
- Are edge cases addressed?
- Is context provided?
- Are prerequisites mentioned?

#### Linguistic Signals

**Grammar and Precision:**
- Professional writing quality
- Technical terminology used correctly
- Consistent terminology

**Technical Accuracy:**
- Code examples work
- API signatures correct
- Version numbers specified

#### Source Reputation

**Credibility Hierarchy:**

| Tier | Sources | Trust Level |
|------|---------|-------------|
| **Tier 1** | Official docs (python.org, react.dev, etc.) | HIGHEST |
| **Tier 2** | Official engineering blogs (Google, Meta, OpenAI) | HIGH |
| **Tier 3** | Well-maintained GitHub repos with recent activity | MEDIUM-HIGH |
| **Tier 4** | Peer-reviewed papers, ArXiv preprints | MEDIUM |
| **Tier 5** | Established technical blogs | MEDIUM |
| **Tier 6** | StackOverflow, Reddit, forums | LOW-MEDIUM |
| **Tier 7** | Unclear or single source only | LOW |

**Cross-Source Consistency:**
- Do multiple sources agree?
- Are there outliers? Why?
- Is there a consensus view?

---

## Confidence Scoring

### Level Guidelines

| Level | Score | Criteria | Example |
|-------|-------|----------|---------|
| **HIGH** | >90% | Direct quotes from official docs (2024+), verified today | "Python 3.11 introduced `Self` type [Python Docs, 2022]" |
| **MEDIUM** | 70-90% | Synthesized from 2+ authoritative sources, or single verified source | "React 18 includes automatic batching [React Blog, 2022]" |
| **LOW** | <70% | Unclear sourcing, outdated, single source only | "I believe FastAPI 0.100+ changed this, but cannot verify" |
| **UNVERIFIED** | 0% | No sources found | DO NOT USE |

### Confidence Assessment Process

**Step 1: Source Quality Check**
- [ ] Source is official or authoritative
- [ ] Content is recent (2023-2024 preferred)
- [ ] Information is specific and detailed

**Step 2: Cross-Verification**
- [ ] Verified with 2+ independent sources
- [ ] Sources agree on key facts
- [ ] No major conflicts found

**Step 3: Temporal Validation**
- [ ] Publication date is recent (< 6 months preferred)
- [ ] Version information is current
- [ ] No deprecation warnings

**Step 4: Confidence Assignment**
- [ ] HIGH if all checks pass
- [ ] MEDIUM if most checks pass
- [ ] LOW if critical checks fail
- [ ] UNVERIFIED if no sources

### Confidence Levels in Output

**HIGH Confidence Example:**
```markdown
### Confidence

**Level**: HIGH
**Reasoning**: Direct quote from official Python 3.11 documentation, verified 2024-01-15
**Sources**:
- [Python 3.11 Documentation - PEP 673](https://docs.python.org/3.11/whatsnew/3.11.html#pep-673) | Verified: 2024-01-15
```

**MEDIUM Confidence Example:**
```markdown
### Confidence

**Level**: MEDIUM
**Reasoning**: Synthesized from React 18 release blog and two independent tutorials, all verified in 2024
**Sources**:
- [React 18 Release Blog](https://react.dev/blog/2022/03/29/react-18) | Verified: 2024-01-10
- [React Automatic Batching Tutorial](https://example.com/react-batching) | Verified: 2024-01-12
```

**LOW Confidence Example:**
```markdown
### Confidence

**Level**: LOW
**Reasoning**: Single source from 2021, may be outdated. Cannot verify with current documentation.
**Sources**:
- [FastAPI Authentication Guide](https://example.com/fastapi-auth) | Verified: 2024-01-15 (original: 2021)
```

---

## Verification Checklist

Before presenting information as verified:

### Source Verification
- [ ] Primary source identified and loaded
- [ ] Source is authoritative (official docs, reputable blog)
- [ ] Publication date is recent (< 6 months preferred)
- [ ] No deprecation warnings

### Cross-Verification
- [ ] Cross-verified with 2+ independent sources
- [ ] Sources represent different perspectives
- [ ] No major conflicts detected

### Conflict Resolution
- [ ] Conflicts identified and documented
- [ ] Credibility assessment performed
- [ ] Temporal context considered

### Output Quality
- [ ] Confidence level assigned
- [ ] Sources properly attributed with dates
- [ ] Output format follows standard template
- [ ] Reasoning for confidence level provided

---

## Special Cases

### API Version Changes

**When dealing with version-specific information:**

1. **Identify version** - What version is the user using?
2. **Check for breaking changes** - Did behavior change between versions?
3. **Provide version-specific advice** - Note version number in response
4. **Suggest upgrade path** - If applicable

**Example:**
```markdown
### Version-Specific Information

**For Next.js 13+**: App Router uses `app/` directory
**For Next.js 12 and earlier**: Pages Router uses `pages/` directory

**Source**: [Next.js Documentation](https://nextjs.org/docs) | Verified: 2024-01-15
```

### Deprecated Features

**When encountering deprecated information:**

1. **Identify deprecation** - Check official docs for deprecation notices
2. **Provide alternative** - What should be used instead?
3. **Migration guidance** - How to update code
4. **Timeline** - When will it be removed?

### Conflicting Best Practices

**When sources disagree on best practices:**

1. **Identify disagreement type** - Factual vs interpretive
2. **Assess each source** - Credibility, recency, authority
3. **Present multiple viewpoints** - With attribution
4. **Note context differences** - When to use each approach
5. **Recommend based on use case** - What applies to user's situation
