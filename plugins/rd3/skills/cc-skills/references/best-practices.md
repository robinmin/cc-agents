# Agent Skills Best Practices

Consolidated best practices for creating effective Claude Code Agent Skills.

## Table of Contents

- [Core Principles](#core-principles)
- [Skill Structure](#skill-structure)
- [Writing Effective Descriptions](#writing-effective-descriptions)
- [Progressive Disclosure](#progressive-disclosure)
- [Content Guidelines](#content-guidelines)
- [Workflows and Feedback Loops](#workflows-and-feedback-loops)
- [Scripts and Executable Code](#scripts-and-executable-code)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
- [Quality Checklist](#quality-checklist)

---

## Core Principles

### Concise is Key

The context window is a public good. Your skill shares the context window with everything else Claude needs: system prompt, conversation history, other skills' metadata, and the actual request.

**Default assumption: Claude is already very smart.** Only add context Claude doesn't already have. Challenge each piece of information:

- "Does Claude really need this explanation?"
- "Can I assume Claude knows this?"
- "Does this paragraph justify its token cost?"

**Good example (~50 tokens):**

```markdown
## Extract PDF text

Use pdfplumber for text extraction:

import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

**Bad example (~150 tokens):**

```markdown
## Extract PDF text

PDF (Portable Document Format) files are a common file format that contains
text, images, and other content. To extract text from a PDF, you'll need to
use a library. There are many libraries available for PDF processing, but we
recommend pdfplumber because it's easy to use and handles most cases well.
```

### Set Appropriate Degrees of Freedom

Match specificity to the task's fragility and variability:

| Freedom Level | When to Use | Example |
|---------------|-------------|---------|
| **High** (text-based) | Multiple valid approaches, context-dependent decisions | Code review guidelines |
| **Medium** (scripts/params) | Preferred pattern exists, some variation acceptable | Report generation |
| **Low** (specific scripts) | Fragile operations, consistency critical | Database migrations |

**Analogy:** Think of Claude as exploring a path:

- **Narrow bridge**: One safe way forward → provide specific guardrails (low freedom)
- **Open field**: Many paths lead to success → give general direction (high freedom)

### Test with All Target Models

Skills act as additions to models, so effectiveness depends on the underlying model:

- **Claude Haiku**: Does the skill provide enough guidance?
- **Claude Sonnet**: Is the skill clear and efficient?
- **Claude Opus**: Does the skill avoid over-explaining?

---

## Skill Structure

### YAML Frontmatter Requirements

Every SKILL.md requires these fields:

**`name`:**
- Maximum 64 characters
- Lowercase letters, numbers, and hyphens only
- No reserved words ("anthropic", "claude")

**`description`:**
- Non-empty, maximum 1024 characters
- Must describe what the skill does AND when to use it

### Naming Conventions

Use **gerund form** (verb + -ing) for skill names:

- ✓ `pdf-processing`, `spreadsheet-analysis`, `database-management`
- ✗ Vague: `helper`, `utils`, `tools`

### Token Budgets

- Keep SKILL.md body under **500 lines**
- Split content into separate files when approaching this limit
- Use progressive disclosure patterns for larger content

---

## Writing Effective Descriptions

The `description` field is the primary triggering mechanism. Claude uses it to choose the right skill from potentially 100+ available skills.

### Always Write in Third Person

- ✓ "Processes Excel files and generates reports"
- ✗ "I can help you process Excel files"

### Be Specific and Include Key Terms

Include both what the skill does AND specific triggers/contexts:

```yaml
# Good examples
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.

description: Analyze Excel spreadsheets, create pivot tables, generate charts. Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files.

description: Generate descriptive commit messages by analyzing git diffs. Use when the user asks for help writing commit messages or reviewing staged changes.
```

---

## Progressive Disclosure

Skills use three-level loading:

1. **Metadata** - name + description (~100 tokens, always loaded)
2. **SKILL.md body** - Instructions (<500 lines, loaded on trigger)
3. **References** - Detailed docs (loaded on demand)

### Pattern: High-Level Guide with References

```markdown
# PDF Processing

## Quick start

Extract text with pdfplumber:
[code example]

## Advanced features

- **Form filling**: See [forms.md](reference/forms.md)
- **API reference**: See [reference.md](reference/api.md)
```

### Guidelines

- Keep references one level deep from SKILL.md
- Structure longer files (>100 lines) with a table of contents
- Name files descriptively: `form_validation_rules.md`, not `doc2.md`

---

## Content Guidelines

### Avoid Time-Sensitive Information

Don't include information that will become outdated:

```markdown
## Current method

Use the v2 API endpoint: `api.example.com/v2/messages`

<details>
<summary>Legacy v1 API (deprecated)</summary>
The v1 API used: `api.example.com/v1/messages`
</details>
```

### Use Consistent Terminology

- ✓ "API endpoint", "field", "extract"
- ✗ Mix "API endpoint", "URL", "API route"

### Use Imperative/Infinitive Form

- ✓ "Extract text from the PDF"
- ✗ "You should extract text from the PDF"

---

## Workflows and Feedback Loops

### Sequential Workflows with Checklists

```markdown
## PDF form filling workflow

Copy this checklist and check off items as you complete them:

- [ ] Step 1: Analyze the form
- [ ] Step 2: Create field mapping
- [ ] Step 3: Validate mapping
- [ ] Step 4: Fill the form
- [ ] Step 5: Verify output
```

### Implement Feedback Loops

**Common pattern**: Run validator → fix errors → repeat

```markdown
1. Make your edits
2. Validate immediately: `python3 scripts/validate.py`
3. If validation fails, fix and repeat
4. Only proceed when validation passes
```

### Conditional Workflows

```markdown
1. Determine the modification type:

   **Creating new content?** → Follow "Creation workflow"
   **Editing existing content?** → Follow "Editing workflow"
```

---

## Scripts and Executable Code

### Solve, Don't Punt

Handle error conditions rather than letting Claude figure it out:

```python
def process_file(path):
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        print(f"File {path} not found, creating default")
        with open(path, 'w') as f:
            f.write('')
        return ''
```

### Document Configuration Values

Avoid "voodoo constants"—justify and document all values:

```python
# HTTP requests typically complete within 30 seconds
REQUEST_TIMEOUT = 30

# Three retries balances reliability vs speed
MAX_RETRIES = 3
```

### Package Dependencies

- List required packages in SKILL.md
- Verify availability in the execution environment

---

## Anti-Patterns to Avoid

### Avoid Windows-Style Paths

Always use forward slashes:

- ✓ `scripts/helper.py`, `reference/guide.md`
- ✗ `scripts\helper.py`

### Avoid Offering Too Many Options

- ✗ "You can use pypdf, or pdfplumber, or PyMuPDF..."
- ✓ "Use pdfplumber for text extraction"

### Avoid Assuming Tools Are Installed

- ✗ "Use the pdf library to process the file"
- ✓ "Install required package: `pip install pypdf`"

### Avoid Deeply Nested References

- ✓ SKILL.md → reference.md (with actual information)
- ✗ SKILL.md → advanced.md → details.md → info

---

## Quality Checklist

### Core Quality

- [ ] Description is specific and includes key terms
- [ ] Description includes both what the skill does AND when to use it
- [ ] Description written in third person
- [ ] SKILL.md body is under 500 lines
- [ ] Additional details are in separate files (if needed)
- [ ] No time-sensitive information (or in "old patterns" section)
- [ ] Consistent terminology throughout
- [ ] Examples are concrete, not abstract
- [ ] File references are one level deep
- [ ] Progressive disclosure used appropriately
- [ ] Workflows have clear steps
- [ ] Uses imperative/infinitive form

### Code and Scripts

- [ ] Scripts solve problems rather than punt to Claude
- [ ] Error handling is explicit and helpful
- [ ] No "voodoo constants" (all values justified)
- [ ] Required packages listed and verified as available
- [ ] Scripts have clear documentation
- [ ] No Windows-style paths (all forward slashes)
- [ ] Validation/verification steps for critical operations
- [ ] Feedback loops included for quality-critical tasks

### Structure

- [ ] No extraneous documentation files
- [ ] Resources organized by type (scripts/, references/, assets/)
- [ ] Files named descriptively
- [ ] Longer reference files have table of contents
