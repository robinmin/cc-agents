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
- [Testing and Iteration](#testing-and-iteration)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
- [Checklist for Effective Skills](#checklist-for-effective-skills)

---

## Core Principles

### Concise is Key

The context window is a public good. Your skill shares the context window with everything else Claude needs: system prompt, conversation history, other skills' metadata, and the actual request.

**Default assumption: Claude is already very smart.** Only add context Claude doesn't already have. Challenge each piece of information:

- "Does Claude really need this explanation?"
- "Can I assume Claude knows this?"
- "Does this paragraph justify its token cost?"

**Good example (~50 tokens):**

````markdown
## Extract PDF text

Use pdfplumber for text extraction:

```python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
````

````

**Bad example (~150 tokens):**

```markdown
## Extract PDF text

PDF (Portable Document Format) files are a common file format that contains
text, images, and other content. To extract text from a PDF, you'll need to
use a library. There are many libraries available for PDF processing, but we
recommend pdfplumber because it's easy to use and handles most cases well.
First, you'll need to install it using pip. Then you can use the code below...
````

### Set Appropriate Degrees of Freedom

Match specificity to the task's fragility and variability:

| Freedom Level                                   | When to Use                                                       | Example                               |
| ----------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| **High** (text-based instructions)              | Multiple valid approaches, context-dependent decisions            | Code review guidelines                |
| **Medium** (pseudocode/scripts with parameters) | Preferred pattern exists, some variation acceptable               | Report generation with format options |
| **Low** (specific scripts, few parameters)      | Fragile operations, consistency critical, exact sequence required | Database migrations                   |

**Analogy:** Think of Claude as exploring a path:

- **Narrow bridge with cliffs**: One safe way forward → provide specific guardrails (low freedom)
- **Open field**: Many paths lead to success → give general direction (high freedom)

### Test with All Target Models

Skills act as additions to models, so effectiveness depends on the underlying model:

- **Claude Haiku** (fast, economical): Does the skill provide enough guidance?
- **Claude Sonnet** (balanced): Is the skill clear and efficient?
- **Claude Opus** (powerful reasoning): Does the skill avoid over-explaining?

What works for Opus might need more detail for Haiku.

---

## Skill Structure

### YAML Frontmatter Requirements

Every SKILL.md requires two fields in YAML frontmatter:

**`name`:**

- Maximum 64 characters
- Lowercase letters, numbers, and hyphens only
- No XML tags or reserved words ("anthropic", "claude")

**`description`:**

- Non-empty, maximum 1024 characters
- No XML tags
- Must describe what the skill does AND when to use it

### Naming Conventions

Use **gerund form** (verb + -ing) for skill names:

**Good examples:**

- `processing-pdfs`
- `analyzing-spreadsheets`
- `managing-databases`
- `testing-code`

**Avoid:**

- Vague names: `helper`, `utils`, `tools`
- Overly generic: `documents`, `data`, `files`
- Reserved words: `anthropic-helper`, `claude-tools`

### Token Budgets

- Keep SKILL.md body under **500 lines** for optimal performance
- Split content into separate files when approaching this limit
- Use progressive disclosure patterns for larger content

---

## Writing Effective Descriptions

The `description` field is the primary triggering mechanism. Claude uses it to choose the right skill from potentially 100+ available skills.

### Always Write in Third Person

The description is injected into the system prompt; inconsistent point-of-view causes discovery problems.

- ✓ **Good:** "Processes Excel files and generates reports"
- ✗ **Avoid:** "I can help you process Excel files"
- ✗ **Avoid:** "You can use this to process Excel files"

### Be Specific and Include Key Terms

Include both what the skill does AND specific triggers/contexts:

**Good examples:**

```yaml
# PDF Processing
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.

# Excel Analysis
description: Analyze Excel spreadsheets, create pivot tables, generate charts. Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files.

# Git Commit Helper
description: Generate descriptive commit messages by analyzing git diffs. Use when the user asks for help writing commit messages or reviewing staged changes.
```

**Avoid vague descriptions:**

```yaml
description: Helps with documents
description: Processes data
description: Does stuff with files
```

---

## Progressive Disclosure

Skills use a three-level loading system:

1. **Metadata (name + description)** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words)
3. **Bundled resources** - As needed by Claude (unlimited)

### Pattern 1: High-Level Guide with References

```markdown
# PDF Processing

## Quick start

Extract text with pdfplumber:
[code example]

## Advanced features

- **Form filling**: See [FORMS.md](FORMS.md) for complete guide
- **API reference**: See [REFERENCE.md](REFERENCE.md) for all methods
- **Examples**: See [EXAMPLES.md](EXAMPLES.md) for common patterns
```

### Pattern 2: Domain-Specific Organization

Organize by domain to avoid loading irrelevant context:

```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── reference/
    ├── finance.md (revenue, billing metrics)
    ├── sales.md (opportunities, pipeline)
    ├── product.md (API usage, features)
    └── marketing.md (campaigns, attribution)
```

### Pattern 3: Conditional Details

```markdown
# DOCX Processing

## Creating documents

Use docx-js for new documents. See [DOCX-JS.md](DOCX-JS.md).

## Editing documents

For simple edits, modify the XML directly.

**For tracked changes**: See [REDLINING.md](REDLINING.md)
**For OOXML details**: See [OOXML.md](OOXML.md)
```

### Key Guidelines

- **Keep references one level deep** from SKILL.md
- **Structure longer files** (>100 lines) with a table of contents
- **Name files descriptively**: `form_validation_rules.md`, not `doc2.md`
- **Organize for discovery**: `reference/finance.md`, not `docs/file1.md`

---

## Content Guidelines

### Avoid Time-Sensitive Information

Don't include information that will become outdated:

**Bad:**

```
If you're doing this before August 2025, use the old API.
After August 2025, use the new API.
```

**Good:**

```markdown
## Current method

Use the v2 API endpoint: `api.example.com/v2/messages`

## Old patterns

<details>
<summary>Legacy v1 API (deprecated 2025-08)</summary>

The v1 API used: `api.example.com/v1/messages`
This endpoint is no longer supported.

</details>
```

### Use Consistent Terminology

Choose one term and use it throughout:

- ✓ **Consistent**: Always "API endpoint", "field", "extract"
- ✗ **Inconsistent**: Mix "API endpoint", "URL", "API route", "path"

### Use Imperative/Infinitive Form

Write instructions as commands:

- ✓ "Extract text from the PDF"
- ✓ "Run the validation script"
- ✗ "You should extract text from the PDF"

---

## Workflows and Feedback Loops

### Sequential Workflows with Checklists

For complex tasks, provide a checklist that Claude can track:

```markdown
## PDF form filling workflow

Copy this checklist and check off items as you complete them:
```

Task Progress:

- [ ] Step 1: Analyze the form (run analyze_form.py)
- [ ] Step 2: Create field mapping (edit fields.json)
- [ ] Step 3: Validate mapping (run validate_fields.py)
- [ ] Step 4: Fill the form (run fill_form.py)
- [ ] Step 5: Verify output (run verify_output.py)

```

**Step 1: Analyze the form**

Run: `python3 scripts/analyze_form.py input.pdf`

This extracts form fields and their locations, saving to `fields.json`.

[Continue with detailed steps...]
```

### Implement Feedback Loops

**Common pattern**: Run validator → fix errors → repeat

```markdown
## Document editing process

1. Make your edits to `word/document.xml`
2. **Validate immediately**: `python3 ooxml/scripts/validate.py unpacked_dir/`
3. If validation fails:
   - Review the error message carefully
   - Fix the issues in the XML
   - Run validation again
4. **Only proceed when validation passes**
5. Rebuild: `python3 ooxml/scripts/pack.py unpacked_dir/ output.docx`
6. Test the output document
```

### Conditional Workflows

Guide Claude through decision points:

```markdown
## Document modification workflow

1. Determine the modification type:

   **Creating new content?** → Follow "Creation workflow" below
   **Editing existing content?** → Follow "Editing workflow" below

2. Creation workflow:
   - Use docx-js library
   - Build document from scratch
   - Export to .docx format

3. Editing workflow:
   - Unpack existing document
   - Modify XML directly
   - Validate after each change
   - Repack when complete
```

---

## Scripts and Executable Code

### Solve, Don't Punt

Handle error conditions rather than punting to Claude:

**Good:**

```python
def process_file(path):
    """Process a file, creating it if it doesn't exist."""
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        print(f"File {path} not found, creating default")
        with open(path, 'w') as f:
            f.write('')
        return ''
    except PermissionError:
        print(f"Cannot access {path}, using default")
        return ''
```

**Bad:**

```python
def process_file(path):
    # Just fail and let Claude figure it out
    return open(path).read()
```

### Document Configuration Values

Avoid "voodoo constants"—justify and document all values:

**Good:**

```python
# HTTP requests typically complete within 30 seconds
# Longer timeout accounts for slow connections
REQUEST_TIMEOUT = 30

# Three retries balances reliability vs speed
# Most intermittent failures resolve by the second retry
MAX_RETRIES = 3
```

**Bad:**

```python
TIMEOUT = 47  # Why 47?
RETRIES = 5   # Why 5?
```

### Provide Utility Scripts

Pre-made scripts offer advantages over generated code:

- More reliable than generated code
- Save tokens (no need to include code in context)
- Save time (no code generation required)
- Ensure consistency across uses

**Make execution intent clear:**

- "Run `analyze_form.py` to extract fields" (execute)
- "See `analyze_form.py` for the extraction algorithm" (read as reference)

### Create Verifiable Intermediate Outputs

For complex tasks, use the "plan-validate-execute" pattern:

1. Analyze → **create plan file** → **validate plan** → execute → verify
2. Make validation scripts verbose with specific error messages

### Package Dependencies

- List required packages in SKILL.md
- Verify availability in the code execution environment
- Note platform-specific limitations (claude.ai vs API)

### MCP Tool References

Always use fully qualified tool names:

```markdown
Use the BigQuery:bigquery_schema tool to retrieve table schemas.
Use the GitHub:create_issue tool to create issues.
```

---

## Testing and Iteration

### Build Evaluations First

Create evaluations BEFORE writing extensive documentation:

1. **Identify gaps**: Run Claude on representative tasks without a skill
2. **Create evaluations**: Build 3+ scenarios that test these gaps
3. **Establish baseline**: Measure performance without the skill
4. **Write minimal instructions**: Just enough to address gaps
5. **Iterate**: Execute evaluations, compare, refine

### Develop Skills Iteratively with Claude

Work with one Claude instance ("Claude A") to create skills for other instances ("Claude B"):

1. Complete a task without a skill, noting what context you provide
2. Identify the reusable pattern
3. Ask Claude A to create a skill capturing the pattern
4. Review for conciseness—remove unnecessary explanations
5. Improve information architecture
6. Test with Claude B on similar tasks
7. Iterate based on observations

### Observe Navigation Patterns

Watch for:

- **Unexpected exploration paths**: Structure might not be intuitive
- **Missed connections**: Links might need to be more explicit
- **Overreliance on certain sections**: Content might belong in SKILL.md
- **Ignored content**: Files might be unnecessary or poorly signaled

---

## Anti-Patterns to Avoid

### Avoid Windows-Style Paths

Always use forward slashes:

- ✓ `scripts/helper.py`, `reference/guide.md`
- ✗ `scripts\helper.py`, `reference\guide.md`

### Avoid Offering Too Many Options

**Bad:**

```
You can use pypdf, or pdfplumber, or PyMuPDF, or pdf2image, or...
```

**Good:**

````
Use pdfplumber for text extraction:
```python
import pdfplumber
````

For scanned PDFs requiring OCR, use pdf2image with pytesseract instead.

```

### Avoid Assuming Tools Are Installed

**Bad:**
```

Use the pdf library to process the file.

```

**Good:**
```

Install required package: `pip install pypdf`

Then use it:

```python
from pypdf import PdfReader
reader = PdfReader("file.pdf")
```

```

### Avoid Deeply Nested References

Keep references one level deep from SKILL.md.

**Bad:**
```

SKILL.md → advanced.md → details.md → actual information

```

**Good:**
```

SKILL.md → advanced.md (with actual information)
SKILL.md → reference.md (with actual information)
SKILL.md → examples.md (with actual information)

```

### Avoid Extraneous Documentation

Do NOT create:
- README.md
- INSTALLATION_GUIDE.md
- QUICK_REFERENCE.md
- CHANGELOG.md

The skill should only contain information needed for an AI agent to do the job.

---

## Checklist for Effective Skills

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
- [ ] MCP tools use fully qualified names

### Testing

- [ ] At least three evaluations created
- [ ] Tested with Haiku, Sonnet, and Opus
- [ ] Tested with real usage scenarios
- [ ] Team feedback incorporated (if applicable)
- [ ] Scripts tested by actually running them

### Structure

- [ ] No extraneous documentation files
- [ ] Resources organized by type (scripts/, references/, assets/)
- [ ] Files named descriptively
- [ ] Longer reference files have table of contents
```
