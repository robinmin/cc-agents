---
name: citation-attribution
description: "Citation style guides (APA, IEEE, ACM), in-text citation formats, DOI/URL handling, quotation vs paraphrase, secondary citations, and attribution best practices."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-27
updated_at: 2026-03-27
tags: [research, citation, attribution, plagiarism-prevention, knowledge-extraction, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
see_also:
  - rd3:knowledge-extraction
  - rd3:knowledge-extraction/references/source-evaluation
  - rd3:knowledge-extraction/references/output-templates
---

# Citation and Attribution

Proper citation practices for knowledge extraction, ensuring all claims are traceable to their sources.

## Citation Style Guides

### Quick Reference

| Style | Common In | Format Example |
|-------|----------|----------------|
| **APA 7th** | Social sciences, psychology | Author (Year). Title. *Journal*, vol(issue), pages. DOI |
| **IEEE** | Engineering, computer science | [1] A. Author, "Title," *Journal*, vol. X, pp. Y-Z, Year. |
| **ACM** | Computing research | Author. Year. Title. In *Conference*. Publisher, pages. |
| **Chicago** | Humanities, history | Author. *Title*. Place: Publisher, Year. |
| **MLA 9th** | Literature, arts | Author. "Title." *Journal*, vol., no., year, pp. |

### Default for Technical Knowledge Extraction

For day-to-day knowledge extraction (not academic publishing), use inline citations:

```markdown
"React 18 introduced automatic batching" [React Blog, 2022-03-29]
```

Format: `[Source Name, YYYY-MM-DD]` with URL in the Sources section.

## In-Text Citation Formats

### Parenthetical

Place citation at the end of the claim:

```markdown
Server Components reduce bundle size by eliminating client-side JavaScript
for non-interactive components (React Docs, 2024).
```

### Narrative

Integrate the source into the sentence:

```markdown
According to the React documentation (2024), Server Components reduce
bundle size by eliminating client-side JavaScript for non-interactive components.
```

### Footnote Style

For dense technical writing with many citations:

```markdown
Server Components reduce bundle size significantly.[1]

---
[1] React Documentation. "React Server Components." https://react.dev/... Accessed 2026-03-27.
```

### Recommended: Inline with Date

For knowledge extraction output, prefer inline citations with dates:

```markdown
TypeScript 5.0 includes ECMAScript decorators support [TypeScript Blog, 2023-03-16].
Python 3.11 added the `Self` type for type hints [PEP 673, 2022-01-04].
```

## DOI and URL Handling

### Best Practices

| Situation | Action |
|-----------|--------|
| Source has DOI | Use DOI URL: `https://doi.org/10.xxxx/xxxxx` |
| Source has stable URL | Use the canonical/permalink URL |
| Source URL may change | Include access date: "Accessed YYYY-MM-DD" |
| Source is archived | Provide both original and archive URL |
| Source URL returns 404 | Check Wayback Machine; note as "no longer available" |

### URL Format

```markdown
## Sources

- [React 18 Blog Post](https://react.dev/blog/2022/03/29/react-18) | Accessed: 2026-03-27
- [PEP 673](https://peps.python.org/pep-0673/) | DOI: N/A | Accessed: 2026-03-27
- [Attention Is All You Need](https://doi.org/10.48550/arXiv.1706.03762) | 2017
```

### Link Rot Mitigation

```
1. Prefer DOIs over direct URLs (DOIs are persistent)
2. For web content, include access date
3. For critical sources, check archive.org availability
4. Note when a source URL has changed or redirects
```

## Quotation vs Paraphrase

### When to Quote Directly

- Exact wording matters (definitions, specifications, API signatures)
- The original phrasing is notably clear or authoritative
- You're attributing a specific claim to a specific person
- Legal or compliance language

### When to Paraphrase

- Summarizing broader findings
- Combining information from multiple sources
- The original is verbose or poorly structured
- Adapting for a different audience

### Paraphrasing Guidelines

| Do | Don't |
|----|-------|
| Rewrite in your own structure | Change only a few words (patchwriting) |
| Preserve the original meaning | Distort or omit important nuance |
| Still cite the source | Present paraphrased content as your own |
| Note if you've simplified | Silently remove caveats from the original |

### Example

**Original source:** "React Server Components allow developers to write components that render on the server, reducing the amount of JavaScript shipped to the client, which can significantly improve performance for content-heavy applications."

**Good paraphrase:** RSC moves component rendering to the server, cutting client-side JavaScript. This benefits content-heavy apps most [React Docs, 2024].

**Bad paraphrase (patchwriting):** React Server Components let developers create components rendering server-side, decreasing JavaScript sent to clients, significantly improving performance for content-heavy apps.

## Secondary Citations

When you haven't read the original source:

```markdown
# Format
According to Smith (2020, as cited in Jones, 2023), the framework supports...

# When acceptable
- The original source is unavailable (paywalled, out of print)
- The secondary source is itself authoritative
- You clearly mark it as a secondary citation

# When NOT acceptable
- The original source is freely available (go read it)
- The claim is critical to your conclusion (verify the primary)
- The secondary source may have misrepresented the original
```

## Attribution Best Practices

### Credit Assignment

| Situation | Attribution |
|-----------|-----------|
| Direct quote | Quote marks + source + date |
| Paraphrase | Source + date |
| Summarizing multiple sources | All relevant sources cited |
| Building on an idea | "Building on [Source]..." |
| Common knowledge | No citation needed (e.g., "HTTP uses TCP") |
| Tool-generated content | Note the tool (e.g., "Generated by Claude, verified against...") |

### Plagiarism Prevention

```
Checklist before presenting research:
[ ] Every factual claim has a source citation
[ ] Direct quotes use quotation marks
[ ] Paraphrases are genuinely rewritten, not patchwritten
[ ] Multiple-source syntheses cite all contributing sources
[ ] "Common knowledge" claims are genuinely common (known by most in the field)
[ ] Self-generated analysis is distinguished from source-backed claims
```

### Multiple Source Citations

When a claim is supported by multiple sources, cite all:

```markdown
Server-side rendering improves SEO and initial load time
[Next.js Docs, 2024; Remix Documentation, 2024; Web.dev, 2023].
```

Order: chronological (oldest first) or by authority (most authoritative first).
