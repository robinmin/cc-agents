# Skill Anatomy

Detailed reference for skill structure, components, and organization.

## Directory Structure

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown body
└── Bundled Resources (optional)
    ├── scripts/          - Executable code
    ├── references/       - Documentation loaded as needed
    └── assets/           - Files used in output (not context)
```

## SKILL.md (Required)

Every skill must have a SKILL.md file at the root level.

### Frontmatter (YAML)

The frontmatter contains metadata that Claude uses to determine when to load the skill.

**Required fields:**
- `name`: The skill name (hyphen-case, max 64 chars)
- `description`: When to use this skill (20-1024 chars, no angle brackets)

**Example:**
```yaml
---
name: pdf-processor
description: Comprehensive PDF processing for rotation, merging, and text extraction. Use when working with PDF files: rotating pages, merging documents, extracting content, or modifying structure.
---
```

**Important notes:**
- The `description` is Claude's PRIMARY trigger mechanism
- Include BOTH what the skill does AND when to use it
- Put "when to use" information in description, NOT in body
- Body is only loaded AFTER triggering, so "When to Use" sections in body are wasted

### Body (Markdown)

The body contains instructions and guidance for using the skill.

**Structure guidelines:**
- Start with Overview and Quick Start
- Include workflow or usage patterns
- Keep concise (<500 lines target, <5k words preferred)
- Link to detailed references for extended content

**Writing style:**
- Use imperative/infinitive form ("Create X", not "Creates X")
- Challenge each line: "Does this justify its token cost?"
- Move detailed examples and patterns to `references/` files

## Bundled Resources (Optional)

### scripts/ - Executable Code

Executable code (Python/Bash/etc.) for tasks that require deterministic reliability or are repeatedly rewritten.

**When to include:**
- The same code is being rewritten repeatedly
- Deterministic reliability is needed
- Complex logic that shouldn't be recreated each time

**Examples:**
- `scripts/rotate_pdf.py` - PDF rotation with specific libraries
- `scripts/format_csv.py` - CSV formatting with edge case handling
- `scripts/deploy.sh` - Deployment automation with error handling

**Benefits:**
- Token efficient (don't need to include code in SKILL.md)
- Deterministic behavior
- Can be executed without loading into context
- Version controlled and testable

**Notes:**
- Scripts must be tested before packaging
- Scripts may still need to be read by Claude for patching or environment adjustments
- Include error handling and proper exit codes

**Example structure:**
```
scripts/
├── __init__.py          # Optional: marks as Python package
├── rotate_pdf.py        # Main functionality
└── utils.py             # Shared utilities
```

### references/ - Documentation

Documentation and reference material loaded as needed into context to inform Claude's process.

**When to include:**
- Documentation Claude should reference while working
- Information re-discovered each time
- Large reference materials (>10k words)

**Examples:**
- `references/schema.md` - Database schemas and relationships
- `references/api_docs.md` - API specifications and endpoints
- `references/policies.md` - Company policies and guidelines
- `references/workflows.md` - Multi-step workflow guides

**Use cases:**
- Database schemas
- API documentation
- Domain knowledge
- Company policies
- Detailed workflow guides
- Configuration options
- Troubleshooting guides

**Benefits:**
- Keeps SKILL.md lean
- Loaded only when Claude determines it's needed
- Enables large reference materials without bloating context

**Best practices:**
- If files are large (>10k words), include grep patterns in SKILL.md
- Avoid duplication: Info should live in SKILL.md OR references, not both
- Include table of contents for files >100 lines
- Reference from SKILL.md with clear "when to read" guidance
- Keep references one level deep from SKILL.md (no nested references)

**Example structure:**
```
references/
├── best-practices.md     # General best practices
├── workflows.md          # Detailed workflows
├── api_docs.md           # API reference
└── domain/
    ├── finance.md        # Finance domain info
    └── sales.md          # Sales domain info
```

### assets/ - Output Files

Files used in the output Claude produces, not loaded into context.

**When to include:**
- Files needed in the final output
- Templates or boilerplate to be copied/modified
- Brand assets, icons, fonts

**Examples:**
- `assets/logo.png` - Brand logo for reports
- `assets/template.pptx` - PowerPoint template
- `assets/hello-world/` - Frontend boilerplate project
- `assets/fonts/` - Typography files
- `assets/sample-doc.pdf` - Sample document structure

**Use cases:**
- Templates
- Images and icons
- Boilerplate code
- Fonts and typography
- Sample documents
- Configuration files

**Benefits:**
- Separates output resources from documentation
- Enables file use without loading into context
- Maintains consistent branding/structure

**Notes:**
- Assets are copied/modified but not parsed for content
- Large assets (images, fonts) don't consume tokens
- Keep assets organized in subdirectories if numerous

**Example structure:**
```
assets/
├── templates/
│   ├── report-template.docx
│   └── slides-template.pptx
├── brand/
│   ├── logo.png
│   └── colors.json
└── boilerplate/
    └── frontend-app/
        ├── package.json
        ├── src/
        └── public/
```

## What NOT to Include

A skill should only contain essential files that directly support its functionality.

**Do NOT create:**
- README.md
- INSTALLATION_GUIDE.md
- QUICK_REFERENCE.md
- CHANGELOG.md
- CONTRIBUTING.md
- LICENSE.md
- or any other auxiliary documentation

**Rationale:**
- Skills are for AI agents, not human users
- Auxiliary docs add clutter and confusion
- SKILL.md is the single source of truth
- Installation/changelog info is irrelevant to AI execution

## File Size Guidelines

| Component | Target | Maximum | Notes |
|-----------|--------|---------|-------|
| SKILL.md | <200 lines | <500 lines | ~3k tokens target, ~5k tokens max |
| references/*.md | <500 lines each | No hard limit | Use TOC for >100 lines |
| scripts/*.py | As needed | As needed | Test before packaging |
| assets/* | As needed | As needed | No token impact |

## Progressive Disclosure Patterns

### Pattern 1: High-level Guide with References

Keep overview in SKILL.md, details in references:

```markdown
# PDF Processing

## Quick start

Extract text with pdfplumber:
[brief example]

## Advanced features

- **Form filling**: See [FORMS.md](FORMS.md)
- **API reference**: See [REFERENCE.md](REFERENCE.md)
- **Examples**: See [EXAMPLES.md](EXAMPLES.md)
```

Claude loads FORMS.md, REFERENCE.md, EXAMPLES.md only when needed.

### Pattern 2: Domain-Specific Organization

Organize by domain to avoid loading irrelevant context:

```
bigquery-skill/
├── SKILL.md              # Overview and navigation
└── references/
    ├── finance.md        # Revenue, billing metrics
    ├── sales.md          # Opportunities, pipeline
    ├── product.md        # API usage, features
    └── marketing.md      # Campaigns, attribution
```

When user asks about sales metrics, Claude only reads sales.md.

### Pattern 3: Conditional Details

Show basic content, link to advanced:

```markdown
# DOCX Processing

## Creating documents

Use docx-js for new documents. See [DOCX-JS.md](DOCX-JS.md).

## Editing documents

For simple edits, modify XML directly.

**For tracked changes**: See [REDLINING.md](REDLINING.md)
**For OOXML details**: See [OOXML.md](OOXML.md)
```

Claude reads advanced files only when user needs those features.

## Related Guides

- [Skill Creation Workflow](skill-creation.md) - Step-by-step creation guide
- [Progressive Disclosure](workflows.md#progressive-disclosure) - Token efficiency patterns
- [Best Practices](best_practices.md) - Comprehensive writing guide
- [Workflows](workflows.md) - Architecture and workflow patterns
