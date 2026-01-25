# Conflict Resolution for Multiple Sources

This reference provides detailed guidance on handling disagreements and conflicts when extracting information from multiple sources.

## Disagreement Types

### 1. Factual Disagreements

**Characteristics:**
- Different dates, version numbers, metrics
- Contradictory statements about facts
- Mutually exclusive claims

**Examples:**
- "Python 3.11 was released in October 2022" vs "November 2022"
- "React 18 supports Server Components" vs "Server Components are experimental"
- "FastAPI 0.100+ breaks backward compatibility" vs "Fully backward compatible"

**Resolution Protocol:**

```
1. Verify with official sources (release notes, official docs)
2. Check publication dates (prefer more recent)
3. Look for version-specific context
4. Prioritize official announcements
5. Present with confidence level based on verification
```

**Output Format:**
```markdown
### Conflicting Information Found

**Claim 1**: Python 3.11 released October 2022
- Source: [Blog Post A](URL) | Verified: 2024-01-10
- Credibility: MEDIUM (third-party blog)

**Claim 2**: Python 3.11 released October 24, 2022
- Source: [Python.org Release Notes](URL) | Verified: 2024-01-10
- Credibility: HIGH (official source)

**Resolution**: Official source is authoritative. Release date is October 24, 2022.

**Confidence**: HIGH
```

---

### 2. Interpretive Disagreements

**Characteristics:**
- Different approaches to same problem
- Conflicting recommendations or best practices
- Subjective assessments or opinions

**Examples:**
- "Use TypeScript strict mode" vs "Start loose, enable strict later"
- "Always use functional components" vs "Class components still have use cases"
- "Microservices architecture" vs "Monolith first"

**Resolution Protocol:**

```
1. Identify as interpretive (not factual)
2. Assess credibility of each perspective
3. Consider context (when to use each approach)
4. Present multiple viewpoints with attribution
5. Provide conditional recommendations
```

**Output Format:**
```markdown
### Differing Perspectives

**Approach 1**: Start with TypeScript strict mode
- Source: [TypeScript Best Practices](URL) | Verified: 2024-01-10
- Argument: Catches errors early, better type safety

**Approach 2**: Enable strict mode gradually
- Source: [Pragmatic TypeScript](URL) | Verified: 2024-01-12
- Argument: Lower learning curve, easier migration

**Recommendation**:
- Use strict mode for new projects
- Enable gradually for existing projects
- Context: Team experience, project size

**Confidence**: MEDIUM (interpretive disagreement)
```

---

### 3. Temporal Disagreements

**Characteristics:**
- Information changed over time
- Old vs new documentation
- Version-specific differences

**Examples:**
- "Use `create-react-app`" (2020) vs "Use Vite" (2024)
- "Express is the default" vs "Fastify is faster"
- "Mocha is standard" vs "Vitest is modern"

**Resolution Protocol:**

```
1. Identify temporal context (when was information published?)
2. Check for official updates
3. Verify current best practices
4. Note what changed and when
5. Provide latest information with historical context
```

**Output Format:**
```markdown
### Temporal Context

**Historical Practice** (2020-2022):
- Use `create-react-app` for React projects
- Source: [React Blog 2020](URL) | Archived: 2024-01-10

**Current Practice** (2023-2024):
- Use Vite for React projects (faster, simpler)
- Source: [React Documentation 2024](URL) | Verified: 2024-01-15

**What Changed**: Vite adoption increased, CRA deprecated

**Recommendation**: Use Vite for new React projects (2024+)

**Confidence**: HIGH (current official guidance)
```

---

### 4. Scope Disagreements

**Characteristics:**
- Different contexts or environments
- Applicability varies by use case
- Scale-dependent recommendations

**Examples:**
- "Use SQLite" (small projects) vs "Use PostgreSQL" (production)
- "Monorepo" (large orgs) vs "Separate repos" (small teams)
- "Serverless" (variable workloads) vs "Dedicated servers" (consistent load)

**Resolution Protocol:**

```
1. Identify scope differences (context, scale, environment)
2. Clarify applicability for each approach
3. Map user situation to appropriate recommendation
4. Present trade-offs clearly
5. Recommend based on user context
```

**Output Format:**
```markdown
### Context-Dependent Recommendations

**For small projects / MVPs**:
- Use SQLite (simpler, no server needed)
- Source: [SQLite Documentation](URL) | Verified: 2024-01-10

**For production / scale**:
- Use PostgreSQL (ACID, concurrent writes, extensions)
- Source: [Database Best Practices](URL) | Verified: 2024-01-12

**Trade-offs**:
- SQLite: Zero-config, limited to one writer
- PostgreSQL: Requires server, handles concurrent writes

**Recommendation**: Based on project scale and requirements

**Confidence**: HIGH (context-dependent guidance)
```

---

## General Resolution Protocol

### Step 1: Identify

**What type of disagreement is it?**

- [ ] Factual (dates, versions, numbers)
- [ ] Interpretive (approaches, opinions)
- [ ] Temporal (changed over time)
- [ ] Scope (context-dependent)

### Step 2: Assess

**Evaluate source credibility:**

| Factor | Question | Weight |
|--------|----------|--------|
| Authority | Is source official/expert? | HIGH |
| Recency | Is information current? | HIGH |
| Specificity | Is information detailed? | MEDIUM |
| Consensus | Do multiple sources agree? | MEDIUM |

### Step 3: Check Context

**Temporal check:**
- When was information published?
- Is version information current?
- Are there deprecation warnings?

**Scope check:**
- What context does this apply to?
- Is this conditional advice?
- What are the prerequisites?

### Step 4: Present

**With proper attributions:**
```markdown
### Resolution Summary

**Conflicting Claims**:
1. [Claim A with source and date]
2. [Claim B with source and date]

**Credibility Assessment**:
- Claim A: [HIGH/MEDIUM/LOW] - [reasoning]
- Claim B: [HIGH/MEDIUM/LOW] - [reasoning]

**Resolution**: [How conflict is resolved]
**Context**: [When each applies]
**Recommendation**: [What user should do]
```

### Step 5: Flag

**When manual review is needed:**

- [ ] Conflicts cannot be resolved through credibility assessment
- [ ] Information is critical (security, financial decisions)
- [ ] Sources are equally credible but disagree
- [ ] No authoritative source available
- [ ] User context is unclear

**Flag format:**
```markdown
### Manual Review Required

**Issue**: [Description of unresolved conflict]
**Impact**: [Why this matters]
**Recommended Action**: [What user should do to resolve]
```

---

## Handling Special Cases

### Security-Critical Conflicts

**When security best practices conflict:**

1. **Prioritize official security guidelines** (OWASP, vendor security docs)
2. **Check recency** - Security advice changes quickly
3. **Verify with multiple security sources**
4. **Flag for manual review** if uncertain
5. **Never assume** - always verify

**Example:**
```markdown
### Security: Conflicting Guidance

**Source A**: "Use bcrypt for password hashing"
**Source B**: "Use Argon2 (more secure)"

**Resolution**:
- Both are secure, Argon2 is newer (2015 vs 1999)
- OWASP recommends Argon2, bcrypt as fallback
- Use Argon2 if available, bcrypt otherwise

**Verified**: [OWASP Cheat Sheet](URL) | 2024-01-15
**Confidence**: HIGH
```

### Breaking Changes Conflicts

**When documentation conflicts due to version changes:**

1. **Identify version boundary** - When did behavior change?
2. **Check migration guides** - Official upgrade documentation
3. **Provide version-specific advice** - "For version X, do Y"
4. **Recommend upgrade path** - If applicable

**Example:**
```markdown
### Version-Specific Behavior

**Next.js < 13**: Use `getStaticProps` for data fetching
**Next.js 13+**: Use `fetch` in Server Components

**Migration**: Remove `getStaticProps`, move to Server Components
**Source**: [Next.js Migration Guide](URL) | Verified: 2024-01-15
**Confidence**: HIGH
```

### Consensus vs Outliers

**When one source disagrees with many:**

1. **Count consensus sources** - How many agree?
2. **Assess outlier credibility** - Is it authoritative?
3. **Check publication date** - Is it outdated or ahead?
4. **Present consensus view** - With note about outlier
5. **Investigate if outlier is correct** - Sometimes consensus is wrong

**Example:**
```markdown
### Consensus vs Outlier

**Consensus (5 sources)**: "Use functional components"
- React official docs, 3 tutorials, StackOverflow top answer

**Outlier (1 source)**: "Class components are still useful"
- 2024 blog post discussing legacy patterns

**Resolution**: Consensus is correct for new projects
**Context**: Outlier refers to maintaining legacy codebases
**Confidence**: HIGH (with context note)
```
