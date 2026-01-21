# Scanner Validation Criteria

This document describes each validation dimension in the skill evaluation scanner, ensuring documentation stays synchronized with implementation.

## Overview

The scanner evaluates skills across 7 dimensions, each weighted to contribute to an overall quality score (0-10) and letter grade (A-F).

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Frontmatter | 10% | YAML frontmatter quality |
| Content | 25% | SKILL.md content quality |
| Security | 20% | Security considerations |
| Structure | 15% | Directory organization |
| Efficiency | 10% | Token efficiency |
| Best Practices | 10% | Coding best practices |
| Code Quality | 10% | Script code quality |

## Dimension 1: Frontmatter (10% weight)

### What the scanner checks

**Required fields:**
- name field: Must be present
- description field: Must be present

**Name validation:**
- Maximum 64 characters
- Hyphen-case only: lowercase letters, numbers, hyphens
- Cannot start/end with hyphen
- No consecutive hyphens

**Description validation:**
- 20-1024 characters (optimal: 50-500)
- No angle brackets (prevents XML injection)
- Describes both what AND when to use

**Optional fields:**
- allowed-tools: Lists tools this skill uses
- license: License for the skill
- metadata: Additional metadata

### Examples

Passing frontmatter:
```yaml
---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
allowed-tools:
  - pdfplumber
  - PyPDF2
---
```

Failing frontmatter (underscores, not hyphen-case):
```yaml
---
name: PDF_Helper
description: Too short
---
```

## Dimension 2: Content (25% weight)

### What the scanner checks

**Content length:**
- 20-500 lines (excluding frontmatter) is ideal
- Less than 20 lines is too brief
- More than 500 lines should be split

**Required sections:**
- Overview section
- Examples or code blocks
- Workflow or guidance on when to use

**TODO placeholders:**
- Any unresolved TODO placeholders will be flagged

## Dimension 3: Security (20% weight)

### What the scanner checks

The scanner performs AST-based analysis of Python code blocks in SKILL.md and scripts:

**Dangerous patterns flagged:**
- Direct eval() calls (code injection risk)
- Direct exec() calls (code injection risk)
- __import__() calls (dynamic import risk)
- os.system() calls (command injection risk)
- os.popen() calls (command injection risk)
- pickle.loads() calls (arbitrary code execution risk)
- subprocess calls with shell=True (command injection risk)

**Positive indicators:**
- Mentions security considerations
- Has references/ directory for security guidance

### Rationale

Code blocks in documentation are executable. Dangerous patterns in examples can lead to security vulnerabilities if copied.

## Dimension 4: Structure (15% weight)

### What the scanner checks

**Directory structure:**
- SKILL.md in root (required)
- scripts/ directory (if applicable)
- references/ directory (if applicable)
- assets/ directory (if applicable)

**Progressive disclosure:**
- Quick Start section (recommended)
- Overview section
- Advanced section indicated by ### headings (optional)

**Heading hierarchy:**
- Starts with # or ## heading
- Starting with ### or deeper is flagged as issue

### Rationale

Progressive disclosure ensures Claude loads only what's needed. Quick Start provides immediate value, while Advanced sections load only when needed.

## Dimension 5: Efficiency (10% weight)

### What the scanner checks

**Token count (rough estimate: 4 characters ≈ 1 token):**
- Under 500 tokens: Token-efficient
- 500-1500 tokens: Reasonable size
- 1500-3000 tokens: Large skill, consider splitting
- Over 3000 tokens: Very large skill, strongly consider splitting

**Content quality:**
- Duplicate lines (case-insensitive, over 20 characters)
- Verbose lines (over 30 words per line average)

## Dimension 6: Best Practices (10% weight)

### What the scanner checks

**Name convention:**
- Follows hyphen-case format

**TODO placeholders:**
- Each TODO placeholder reduces score

**Description quality:**
- Between 20-1024 characters

**When to use guidance:**
- Has when to use section (recommended)

**Script quality:**
- Scripts have proper shebang
- Scripts use future imports

## Dimension 7: Code Quality (10% weight)

### What the scanner checks (for Python scripts)

**Error handling:**
- Has try blocks for error handling

**Main guard:**
- Has if name == "__main__" guard

**Type hints:**
- Uses type hints (coverage percentage reported)

**Documentation:**
- Has docstrings

**Exception handling:**
- Bare except (catches everything) is flagged
- Broad except Exception is noted (informational)

## Scoring and Grading

Each dimension receives a score from 0-10. Total score is weighted sum:

Total = Sum(Dimension_Score × Dimension_Weight)

Letter grades:
- A: 9.0-10.0 (Production ready)
- B: 7.0-8.9 (Minor fixes needed)
- C: 5.0-6.9 (Moderate revision)
- D: 3.0-4.9 (Major revision)
- F: 0.0-2.9 (Rewrite needed)

## Running the scanner

```bash
# Validate a skill
python3 scripts/skills.py validate ./skills/my-skill

# Evaluate a skill
python3 scripts/skills.py evaluate ./skills/my-skill

# Generate JSON output
python3 scripts/skills.py evaluate ./skills/my-skill --json
```

## Phase 1: Structural Validation

Before quality assessment, the scanner performs structural validation:

**Required:**
- SKILL.md exists
- Valid YAML frontmatter
- Allowed properties only
- No unresolved TODO placeholders

**Result:** PASS or FAIL
