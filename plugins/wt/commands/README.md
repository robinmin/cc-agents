# Writing Tools (WT) Commands

Professional writing style extraction and application tools for Claude Code.

## Quick Start

```bash
# 1. Extract your writing style from samples
/wt:style-extractor ~/my-blog-posts

# 2. List saved styles
/wt:style-apply --list

# 3. Generate content using a style
/wt:style-apply technical-blogger-casual "How to optimize React performance"
```

## Commands Overview

### `/wt:style-extractor` - Extract Writing Style Fingerprint

Analyzes text files to create a reusable style profile with quantitative metrics.

**Basic usage:**
```bash
/wt:style-extractor <folder_path>
```

**Examples:**
```bash
# Analyze blog posts
/wt:style-extractor ~/Documents/blog-posts

# Analyze current directory
/wt:style-extractor

# Analyze documentation
/wt:style-extractor ~/projects/my-app/docs
```

**What it does:**
1. Scans `.md`, `.txt`, `.rst`, `.adoc` files in the folder
2. Analyzes 5 dimensions: Syntax, Vocabulary, Tone, Rhetoric, Structure
3. Generates quantitative metrics (sentence length, burstiness, voice %)
4. Creates unique profile ID (e.g., `technical-blogger-casual`)
5. Saves to `~/.claude/wt/styles/{profile_id}.style.md`

**Minimum requirements:**
- 3+ text files OR 2000+ words total
- Consistent writing style (single author preferred)

---

### `/wt:style-apply` - Apply Saved Style Profile

Use extracted style profiles to generate or rewrite content.

**List profiles:**
```bash
/wt:style-apply --list
```

**Preview a profile:**
```bash
/wt:style-apply technical-blogger-casual --preview
```

**Generate new content:**
```bash
/wt:style-apply {profile_id} "your topic here"
```

**Examples:**
```bash
# Write blog post in casual technical style
/wt:style-apply technical-blogger-casual "Introduction to WebAssembly"

# Write academic paper introduction
/wt:style-apply academic-researcher-formal "Machine learning applications in healthcare"

# Write motivational email
/wt:style-apply startup-ceo-motivational "Q4 team goals announcement"
```

**Rewrite existing content:**
```bash
/wt:style-apply {profile_id} --file <path>
```

**Examples:**
```bash
# Transform README to developer-friendly docs style
/wt:style-apply developer-docs-practical --file README.md

# Convert blog post to academic tone
/wt:style-apply academic-researcher-formal --file blog-post.md
```

---

## Complete Workflow Example

### Scenario: Build a Technical Blog Style Library

**Step 1: Extract style from existing blog**
```bash
/wt:style-extractor ~/blog/published-posts
```

**Output:**
```
✅ Style profile saved: technical-blogger-casual

📁 Location: ~/.claude/wt/styles/technical-blogger-casual.style.md

🎯 Usage:
- Apply style: /wt:style-apply technical-blogger-casual "your topic"
- List profiles: /wt:style-apply --list
```

**Step 2: Review the extracted profile**
```bash
/wt:style-apply technical-blogger-casual --preview
```

**Step 3: Generate new blog post**
```bash
/wt:style-apply technical-blogger-casual "How to debug Node.js memory leaks"
```

**Step 4: Iterate and refine**
After generation, you can:
- Edit the generated content
- Regenerate with more specific prompts
- Combine multiple styles

---

## Advanced Usage

### Multiple Style Profiles

Create profiles for different contexts:

```bash
# Professional documentation
/wt:style-extractor ~/work/api-docs
# → Saves as: api-technical-formal

# Personal blog
/wt:style-extractor ~/blog/personal
# → Saves as: blogger-conversational

# Academic papers
/wt:style-extractor ~/research/publications
# → Saves as: academic-researcher-formal
```

Use them contextually:
```bash
# Writing API docs
/wt:style-apply api-technical-formal "Authentication endpoint documentation"

# Writing blog post
/wt:style-apply blogger-conversational "My journey learning Rust"

# Writing research summary
/wt:style-apply academic-researcher-formal "Survey of neural architecture search methods"
```

### Rewriting Content

Transform existing content between styles:

```bash
# Convert casual blog to formal docs
/wt:style-apply api-technical-formal --file casual-tutorial.md

# Convert technical docs to blog post
/wt:style-apply blogger-conversational --file technical-spec.md
```

---

## File Structure

```
~/.claude/wt/styles/
├── registry.json                           # Index of all profiles
├── technical-blogger-casual.style.md       # Style profile
├── academic-researcher-formal.style.md     # Style profile
└── api-technical-formal.style.md           # Style profile
```

**Registry format:**
```json
{
  "profiles": [
    {
      "id": "technical-blogger-casual",
      "name": "Technical Blogger (Casual)",
      "author": "John Doe",
      "created": "2026-01-04",
      "confidence": "High",
      "tags": ["developer", "casual", "tutorial"],
      "file": "technical-blogger-casual.style.md"
    }
  ]
}
```

---

## Tips & Best Practices

### For Best Results

**When extracting:**
- ✅ Use 5-10+ writing samples (more is better)
- ✅ Ensure single author / consistent voice
- ✅ Use complete articles/documents (not fragments)
- ✅ Minimum 2000 words total corpus
- ❌ Avoid mixing multiple authors
- ❌ Don't include generated/templated content

**When applying:**
- ✅ Review profile with `--preview` first
- ✅ Start with clear, specific topics
- ✅ Edit generated content as needed (90%+ fidelity, not 100%)
- ✅ Combine with your own expertise
- ❌ Don't expect perfect replication
- ❌ Don't use for content requiring factual accuracy alone

### Common Use Cases

| Use Case | Extract From | Apply To |
|----------|--------------|----------|
| Blog consistency | Published posts | New blog topics |
| Documentation standardization | Existing docs | New features |
| Email tone matching | Sent emails | Team announcements |
| Academic writing | Published papers | New research summaries |
| Social media voice | Tweet history | New campaigns |

---

## Troubleshooting

**"Profile not found"**
```bash
# List available profiles
/wt:style-apply --list

# Check if profile exists
ls ~/.claude/wt/styles/
```

**"Insufficient content"**
```bash
# Error: Found only 800 words in 2 files. Minimum 2000 words needed.

# Solution: Add more writing samples to the folder
```

**"Inconsistent styles detected"**
```bash
# Error: Detected 2+ distinct voices. Files may have multiple authors.

# Solution: Extract from single-author content only
```

**Low confidence rating**
```bash
# Possible causes:
# - Small corpus size (< 2000 words)
# - Inconsistent writing patterns
# - Multiple authors mixed

# Solution: Provide more consistent, single-author samples
```

---

## FAQ

**Q: Where are style profiles stored?**
A: User-level at `~/.claude/wt/styles/`, shared across all projects.

**Q: Can I edit a saved profile manually?**
A: Yes! Profiles are markdown files with YAML frontmatter. Edit freely.

**Q: Can I delete a profile?**
A: Yes. Remove from both `~/.claude/wt/styles/{id}.style.md` and `registry.json`.

**Q: How accurate is style replication?**
A: 90%+ fidelity. Expect to refine generated content.

**Q: Can I extract from non-English text?**
A: Yes, but metrics (grade level, etc.) may be less accurate.

**Q: Can I share profiles with teammates?**
A: Yes! Share the `.style.md` file. Recipients can place it in their `~/.claude/wt/styles/`.

---

## See Also

- **style-extractor.md** - Detailed extraction process and analysis framework
- **style-apply.md** - Complete application workflow and options

---

**Version:** 1.0.0
**Plugin:** Writing Tools (wt)
**Author:** Robin Min
