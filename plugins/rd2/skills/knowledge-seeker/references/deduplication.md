# Deduplication and Content Merging

This reference provides detailed guidance on identifying and handling duplicate information when consolidating from multiple sources.

## Content-Based Matching

### Exact Duplicates

**Characteristics:**
- Identical text across multiple sources
- Same information word-for-word
- Direct quotations or copies

**Identification:**
```
Source A: "React 18 introduces automatic batching"
Source B: "React 18 introduces automatic batching"
→ Exact duplicate
```

**Handling:**
- Remove entirely
- Keep single instance
- Cite all sources that contained the duplicate

**Output Format:**
```markdown
### Consolidated Information

**Fact**: React 18 introduces automatic batching for state updates.

**Sources**:
- [React 18 Release Blog](URL1) | Verified: 2024-01-10
- [React Tutorial Site](URL2) | Verified: 2024-01-12
- [StackOverflow Answer](URL3) | Verified: 2024-01-15

**Note**: This information appears in multiple sources (quoting official blog)
```

---

### Near Duplicates

**Characteristics:**
- Same core information, slightly different wording
- Minor additional details in one version
- Paraphrased or reworded content

**Identification:**
```
Source A: "React 18 introduces automatic batching for state updates"
Source B: "React 18 automatically batches multiple state updates together"
Source C: "Automatic batching is now the default in React 18"
→ Near duplicate (same core information)
```

**Handling:**
- Merge overlapping content
- Keep most comprehensive version
- Note variations if significant
- Cite all sources

**Output Format:**
```markdown
### Consolidated Information

**Fact**: React 18 automatically batches multiple state updates together by default.

**Variations across sources**:
- Source A emphasizes "introduces" (new feature)
- Source B emphasizes "together" (mechanism)
- Source C emphasizes "default" (behavior change)

**Most comprehensive**: Source B

**Sources**:
- [React 18 Release Blog](URL1) | Verified: 2024-01-10
- [React Tutorial Site](URL2) | Verified: 2024-01-12
- [StackOverflow Answer](URL3) | Verified: 2024-01-15
```

---

### Semantic Duplicates

**Characteristics:**
- Same underlying information
- Different perspectives or contexts
- Conceptually equivalent content

**Identification:**
```
Source A: "Use useEffect for side effects in React"
Source B: "React hooks for side effects: useEffect"
Source C: "How to handle side effects in functional components? useEffect hook"
→ Semantic duplicate (same concept)
```

**Handling:**
- Consolidate into single entry
- Note source variations
- Synthesize comprehensive explanation
- Attribute all contributing sources

**Output Format:**
```markdown
### Consolidated Information

**Concept**: useEffect is the React hook for handling side effects in functional components.

**Key aspects covered**:
- Purpose: Side effects in functional components
- Hook name: useEffect
- Usage: "How to handle side effects"

**Sources**:
- [React Hooks Guide](URL1) - Purpose | Verified: 2024-01-10
- [React Tutorial](URL2) - Hook name | Verified: 2024-01-12
- [StackOverflow Q&A](URL3) - Usage pattern | Verified: 2024-01-15
```

---

## Information Merging

### When Sources Agree

**Scenario:**
All sources present the same core information

**Protocol:**
1. Present single consolidated fact
2. Cite all confirming sources
3. Note if sources quote each other (avoid circular attribution)
4. Use most authoritative wording

**Output Format:**
```markdown
### Consolidated Fact

**Information**: Python 3.11 added the `Self` type for type hints via PEP 673.

**Sources (all agree)**:
- [Python 3.11 Documentation](https://docs.python.org/3.11/whatsnew/3.11.html) | Verified: 2024-01-15
- [PEP 673 - Self Type](https://peps.python.org/pep-0673/) | Verified: 2024-01-15
- [Real Python Blog](https://realpython.com/python311-new-features/) | Verified: 2024-01-10

**Confidence**: HIGH (multiple authoritative sources in agreement)
```

---

### When Sources Disagree

**Scenario:**
Sources present conflicting information

**Protocol:**
1. Present conflicting information separately
2. Attribute each claim to its source
3. Note credibility assessment
4. Attempt resolution (see conflict-resolution.md)
5. Flag for manual review if uncertain

**Output Format:**
```markdown
### Conflicting Information

**Claim 1**: Use `create-react-app` for React projects
- Source: [Old React Docs](URL1) | Verified: 2024-01-15
- Credibility: LOW (outdated, archived)

**Claim 2**: Use Vite for React projects
- Source: [New React Docs](URL2) | Verified: 2024-01-15
- Credibility: HIGH (current, official)

**Resolution**: Claim 2 is current recommendation. Claim 1 is outdated.

**See also**: `references/conflict-resolution.md` - Temporal Disagreements
```

---

### When Sources Complement

**Scenario:**
Each source provides different pieces of the puzzle

**Protocol:**
1. Synthesize comprehensive view
2. Cite all contributing sources
3. Note what each source provides
4. Organize by aspect or category

**Output Format:**
```markdown
### Comprehensive Synthesis

**Topic**: React Server Components

**Architecture** (Source: React Docs):
- Server Components run on server, reduce client bundle size
- Cannot use hooks or browser APIs
- Source: [React Server Components](https://react.dev/reference/react/18/server-components) | Verified: 2024-01-15

**Usage Pattern** (Source: Blog Tutorial):
- Use `.server.js` extension (or App Router in Next.js)
- Fetch data directly in component body
- Source: [Server Components Guide](https://example.com/rsc) | Verified: 2024-01-12

**Benefits** (Source: Engineering Blog):
- Zero bundle size for server code
- Direct database access
- Improved initial load performance
- Source: [React Team Blog](https://react.dev/blog/2023/rsc) | Verified: 2024-01-10

**Confidence**: HIGH (complementary information from authoritative sources)
```

---

## Deduplication Workflow

### Step 1: Extract and Catalog

```bash
For each source:
1. Extract information units (facts, claims, examples)
2. Assign source identifier (A, B, C, ...)
3. Note extraction timestamp
4. Store in working document
```

### Step 2: Identify Matches

```bash
For each pair of information units:
1. Compare for exact match (string equality)
2. Compare for near match (similarity threshold)
3. Compare for semantic match (conceptual equivalence)
4. Group related information
```

### Step 3: Consolidate Groups

```bash
For each group of related information:
1. Identify core common content
2. Identify unique contributions per source
3. Detect conflicts within group
4. Merge complementing information
5. Flag unresolved conflicts
```

### Step 4: Format Output

```bash
For each consolidated group:
1. Write consolidated information
2. Cite all contributing sources
3. Note variations and conflicts
4. Include confidence assessment
5. Link to detailed conflict resolution if needed
```

---

## Special Cases

### Circular Attribution

**Problem:**
Sources quote each other, creating false appearance of multiple verification

**Example:**
```
Source A: Official docs
Source B: Blog post quoting A
Source C: Tutorial quoting B
→ Looks like 3 sources, but really only 1 original
```

**Detection:**
- Check for explicit quotations
- Look for "According to X" language
- Verify publication dates (chronology)
- Trace back to original source

**Handling:**
```markdown
### Circular Attribution Detected

**Primary Source**: [React 18 Release Blog](https://react.dev/blog/2022/03/29/react-18)
- Original publication: 2022-03-29

**Secondary Sources** (quoting primary):
- [Tutorial Site A](URL) - Quotes release blog | Published: 2022-04-01
- [Blog Post B](URL) - References tutorial A | Published: 2022-04-05

**Verification Status**: Single primary source, not independently verified

**Confidence**: MEDIUM (requires additional independent verification)
```

---

### Version Evolution

**Problem:**
Same concept described differently across versions

**Example:**
```
React 17: "useEffect for side effects"
React 18: "useEffect for side effects with automatic batching"
→ Same concept, evolved description
```

**Detection:**
- Version information in source
- Publication date clustering
- "New in X.Y" language

**Handling:**
```markdown
### Version Evolution

**React 17** (baseline):
- useEffect for side effects
- Source: [React 17 Docs](URL1) | Verified: 2024-01-15

**React 18** (evolution):
- useEffect for side effects with automatic batching
- Source: [React 18 Docs](URL2) | Verified: 2024-01-15

**Evolution**: Added automatic batching (not breaking change)

**Consolidated**: useEffect handles side effects; React 18+ adds automatic batching
```

---

### Incremental Information

**Problem:**
Each source adds a small piece to build complete picture

**Example:**
```
Source A: "useState returns [value, setter]"
Source B: "useState accepts initial value"
Source C: "useState initial value can be function"
→ Together: Complete useState description
```

**Detection:**
- Sources discuss same topic from different angles
- Each adds unique information
- No conflicts, complementary

**Handling:**
```markdown
### Incremental Synthesis

**Consolidated**: useState hook accepts initial value (or function) and returns [value, setter].

**Contributions by source**:
- Source A: Return value structure [value, setter]
- Source B: Accepts initial value parameter
- Source C: Initial value can be lazy function

**Sources**:
- [React Hooks Intro](URL1) | Verified: 2024-01-10
- [useState Reference](URL2) | Verified: 2024-01-12
- [Hooks Best Practices](URL3) | Verified: 2024-01-15

**Confidence**: HIGH (complementary authoritative sources)
```

---

## Deduplication Checklist

Before finalizing consolidation:

- [ ] All information units cataloged with source IDs
- [ ] Exact duplicates identified and removed
- [ ] Near duplicates merged with variations noted
- [ ] Semantic duplicates consolidated
- [ ] Circular attribution detected and handled
- [ ] Version evolution noted
- [ ] Incremental information synthesized
- [ ] Conflicts flagged and documented
- [ ] All contributing sources cited
- [ ] Output formatted with consolidated view
