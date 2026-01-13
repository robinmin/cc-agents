---
name: anti-hallucination
description: Use when working with APIs, libraries, or external services. Forces verification before generation.
allowed-tools: Read, Grep, WebSearch, WebFetch
---

# Anti-Hallucination Protocol

A systematic approach to prevent hallucination when working with external APIs, libraries, and services.

## Core Principle

**VERIFY BEFORE GENERATING** — Never write code from memory for external interfaces. Search first, cite sources, acknowledge uncertainty.

## When to Use This Protocol

Activate this protocol when:

- Writing API calls to external services
- Using library methods you haven't verified recently
- Implementing authentication/authorization flows
- Configuring third-party integrations
- Working with version-specific features

## Verification Workflow

### Step 1: Identify Verification Need

Before writing code, ask:

- [ ] Am I calling an external API endpoint?
- [ ] Am I using a method signature I haven't verified?
- [ ] Is this version-specific behavior?
- [ ] Has this library changed recently?

If ANY answer is YES → Proceed to verification.

### Step 2: Search for Current Information

**Priority Order:**

1. **ref (Context7)** — Search official documentation first
2. **WebSearch** — For recent updates, changelogs, deprecations
3. **WebFetch** — Fetch specific documentation URLs
4. **Local** — Check existing code patterns in codebase

**Search Strategy:**

```
Query: "{library} {method/endpoint} {version} official documentation"
Example: "axios interceptors 1.6 official documentation"
```

### Step 3: Verify Critical Details

Before writing, confirm:

| Item                  | Verification Method               |
| --------------------- | --------------------------------- |
| Method signature      | Official API reference            |
| Required parameters   | Documentation + examples          |
| Return type           | API reference or TypeScript types |
| Error handling        | Error documentation               |
| Version compatibility | Release notes                     |

### Step 4: Cite Source

Every external interface MUST include citation:

```typescript
// Verified: axios 1.6.x interceptors
// Source: https://axios-http.com/docs/interceptors
// Date: 2026-01-12
axios.interceptors.request.use(...)
```

### Step 5: Score Confidence

| Level           | Criteria                          | Action                |
| --------------- | --------------------------------- | --------------------- |
| HIGH (>90%)     | Direct quote from official docs   | Proceed with citation |
| MEDIUM (70-90%) | Synthesized from multiple sources | Note assumptions      |
| LOW (<70%)      | Cannot verify                     | FLAG for user review  |

## Red Flags — STOP and Verify

These situations require IMMEDIATE verification:

### API-Related

- [ ] Endpoint URLs from memory
- [ ] HTTP method assumptions (GET vs POST)
- [ ] Request/response body structure
- [ ] Authentication header format
- [ ] Rate limiting or pagination

### Library-Related

- [ ] Method signatures without reference
- [ ] Default parameter values
- [ ] Async/sync behavior assumptions
- [ ] Side effects of methods
- [ ] Deprecation status

### Version-Related

- [ ] Features without version check
- [ ] Breaking changes between versions
- [ ] Migration patterns
- [ ] Compatibility matrices

### Security-Related

- [ ] Authentication flows
- [ ] Token handling
- [ ] Secret management
- [ ] CORS configuration
- [ ] Input validation

## Fallback Protocol

When verification tools fail:

```
IF ref unavailable:
├── Try WebFetch on official docs URL
├── Try WebSearch for official documentation
├── Check local codebase for existing patterns
└── ELSE: State "UNVERIFIED" + LOW confidence

IF all verification fails:
├── State clearly: "I cannot verify this information"
├── Mark all claims as LOW confidence
├── Suggest user verify manually
└── NEVER present unverified code as working
```

## Output Templates

### When Verified (HIGH confidence)

```markdown
## Verified Solution

**Source**: [Documentation URL]
**Version**: X.Y.Z
**Verified**: YYYY-MM-DD

\`\`\`typescript
// Code here
\`\`\`

**Confidence**: HIGH
```

### When Partially Verified (MEDIUM confidence)

```markdown
## Solution (Verify Before Production)

**Based on**: [Source 1], [Source 2]
**Assumptions**:

- [Assumption 1]
- [Assumption 2]

\`\`\`typescript
// Code here
\`\`\`

**Confidence**: MEDIUM
**Verify**: [What to double-check]
```

### When Unverified (LOW confidence)

```markdown
## UNVERIFIED Solution

**WARNING**: Could not verify from official sources

\`\`\`typescript
// Code here - VERIFY BEFORE USE
\`\`\`

**Confidence**: LOW
**Required**: Manual verification of [specific items]
```

## Quick Reference

### Verification Checklist

- [ ] Searched official documentation
- [ ] Verified version compatibility
- [ ] Checked for recent changes/deprecations
- [ ] Confirmed method signatures
- [ ] Added source citation
- [ ] Assigned confidence level

### Confidence Quick Guide

| Situation                          | Confidence |
| ---------------------------------- | ---------- |
| Direct doc quote + current version | HIGH       |
| Doc synthesis + verified examples  | MEDIUM     |
| Memory only OR outdated sources    | LOW        |
| Cannot find documentation          | UNVERIFIED |

### Citation Format

```
// Verified: {library} {version}
// Source: {URL}
// Date: {YYYY-MM-DD}
```

## Integration with Expert Agents

All expert agents should invoke this protocol when:

1. Their competency list includes external libraries
2. Working with APIs outside the codebase
3. Implementing integrations
4. Handling authentication/security

Reference this skill in agent verification protocols:

```markdown
## Verification Protocol

When working with external APIs or libraries:

1. Invoke anti-hallucination protocol
2. Follow verification workflow
3. Include source citations
4. Assign confidence scores
```
