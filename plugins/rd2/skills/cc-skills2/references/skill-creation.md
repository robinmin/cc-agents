# Skill Creation Workflow

Step-by-step guide for creating and refining Agent skills.

## Overview

This document provides detailed step-by-step guidance for creating new skills from scratch or refining existing skills.

## Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SKILL CREATION WORKFLOW                  │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────┐
│ Step 1:       │ Gather concrete examples of how the skill
│ Understand    │ will be used. What functionality should it
│ Requirements  │ support? What would users say to trigger it?
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Step 2:       │ For each example, identify:
│ Plan Resources│ • Scripts: Code rewritten repeatedly?
│               │ • References: Info re-discovered each time?
│               │ • Assets: Boilerplate needed each time?
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Step 3:       │ Run initialization command:
│ Initialize    │ scripts/skills.py init <name> --path <dir>
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Step 4:       │ A. Implement resources (test scripts!)
│ Implement     │ B. Write SKILL.md (frontmatter + body)
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Step 5:       │ scripts/skills.py validate <skill-path>
│ Validate      │ Checks: YAML, structure, completeness
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Step 6:       │ scripts/skills.py evaluate <skill-path>
│ Evaluate      │ 7-dimension quality assessment
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Step 7:       │ scripts/skills.py package <skill-path>
│ Package       │ Creates distributable .skill file
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Step 8:       │ Use on real tasks, gather feedback,
│ Iterate       │ refine SKILL.md and resources
└───────────────┘
```

## Step 1: Understanding Requirements

### Goal

Gather concrete examples of how the skill will be used to ensure it addresses real needs.

### Questions to Ask

When building a new skill, ask the user:

- "What functionality should this skill support?"
- "Can you give examples of how this skill would be used?"
- "What would a user say that should trigger this skill?"
- "Are there existing examples or reference materials?"

### Example: Image Editor Skill

**Questions to ask:**
- "What functionality should the image-editor skill support? Editing, rotating, anything else?"
- "Can you give some examples of how this skill would be used?"
- "What would a user say that should trigger this skill?"

**Sample responses:**
- "Remove red-eye from this image"
- "Rotate this PDF 90 degrees"
- "Resize this image to 100x100"

**Conclude when:** Clear sense of the functionality the skill should support.

### Tips

- Avoid overwhelming users with too many questions at once
- Start with the most important questions
- Follow up as needed for clarification
- Use generated examples if user examples aren't available (validate with feedback)

## Step 2: Planning Resources

### Goal

Analyze each example to identify what reusable resources would help when executing these workflows repeatedly.

### Analysis Framework

For each concrete example, consider:

1. **How would I execute this from scratch?**
2. **What am I re-discovering or re-writing each time?**
3. **What could be pre-packaged to save time and reduce errors?**

### Resource Types

| Type | When to Include | Example |
|------|----------------|---------|
| **scripts/** | Code rewritten repeatedly, deterministic reliability needed | `scripts/rotate_pdf.py` for PDF rotation |
| **references/** | Info re-discovered each time: schemas, APIs, domain knowledge | `references/schema.md` for BigQuery table schemas |
| **assets/** | Boilerplate needed each time: templates, sample files | `assets/hello-world/` for frontend webapp template |

### Example: PDF Editor Skill

**Example query:** "Help me rotate this PDF"

**Analysis:**
1. Rotating a PDF requires re-writing the same code each time
2. A `scripts/rotate_pdf.py` script would be helpful

**Result:** Include `scripts/rotate_pdf.py`

### Example: Frontend Webapp Builder Skill

**Example query:** "Build me a todo app" or "Build me a dashboard"

**Analysis:**
1. Writing a frontend webapp requires the same boilerplate HTML/React each time
2. An `assets/hello-world/` template would be helpful

**Result:** Include `assets/hello-world/` with boilerplate files

### Example: BigQuery Skill

**Example query:** "How many users have logged in today?"

**Analysis:**
1. Querying BigQuery requires re-discovering table schemas and relationships each time
2. A `references/schema.md` documenting schemas would be helpful

**Result:** Include `references/schema.md`

## Step 3: Initialize Skill

### Goal

Create the skill directory structure with proper templates.

### Command

```bash
scripts/skills.py init <skill-name> --path <output-directory>
```

### What It Creates

```
skill-name/
├── SKILL.md          # Template with frontmatter and TODO sections
├── scripts/
│   └── __init__.py   # Example script (customize or delete)
└── references/
    └── best_practices.md  # Example reference (customize or delete)
```

### After Initialization

- Customize SKILL.md frontmatter with skill-specific name and description
- Keep or remove example files based on skill needs
- Add skill-specific scripts, references, or assets

### Skip This Step When

The skill already exists and you only need to iterate or package it.

## Step 4: Implement Skill

### Goal

Create the resources and write SKILL.md content.

### Part A: Create Resources First

Start with the reusable resources identified in Step 2:

1. **scripts/** - Write and test executable code
2. **references/** - Document schemas, APIs, workflows
3. **assets/** - Gather templates and sample files

**Important:** Test scripts by actually running them to ensure they work correctly.

### Part B: Write SKILL.md

#### Frontmatter (YAML)

```yaml
---
name: skill-name
description: Clear description of what the skill does AND when to use it
---
```

**Description tips:**
- Include BOTH what the skill does and when to use it
- This is Claude's primary trigger mechanism
- Put "when to use" info here, NOT in the body
- Example: "Comprehensive PDF processing for rotation, merging, and text extraction. Use when Claude needs to work with PDF files: rotating pages, merging multiple PDFs, extracting text content, or modifying PDF structure."

**Do NOT include other fields** in frontmatter.

#### Body (Markdown)

Write instructions for using the skill and its bundled resources.

**Writing guidelines:**
- Use imperative/infinitive form ("Create X", not "Creates X")
- Focus on procedural instructions and workflow guidance
- Keep it concise - every line should justify its token cost
- Move detailed reference material to `references/` files

**Key sections to include:**
- Overview
- Quick Start (with examples)
- Workflow or usage patterns
- Links to detailed references

See [best_practices.md](best_practices.md) for comprehensive writing guidelines.

## Step 5: Validate

### Goal

Ensure the skill meets all structural requirements.

### Command

```bash
scripts/skills.py validate <skill-path>
```

### What It Checks

- ✓ SKILL.md exists
- ✓ Valid YAML frontmatter
- ✓ Required fields (name, description)
- ✓ No unresolved TODO placeholders
- ✓ Proper file organization

### Exit Codes

- `0` - Validation passed
- `1` - Validation failed

If validation fails, fix errors and re-run.

## Step 6: Evaluate

### Goal

Assess quality across 7 dimensions.

### Command

```bash
scripts/skills.py evaluate <skill-path>
```

### Dimensions

| Dimension | Weight | What It Checks |
|-----------|--------|----------------|
| Frontmatter | 10% | YAML validity, required fields |
| Content | 25% | Length, sections, examples |
| Security | 20% | Dangerous patterns (AST-based) |
| Structure | 15% | Directory organization |
| Efficiency | 10% | Token count |
| Best Practices | 10% | Naming, conventions |
| Code Quality | 10% | Error handling, type hints |

### Grading Scale

- **A** (9.0-10.0): Production ready
- **B** (7.0-8.9): Minor fixes needed
- **C** (5.0-6.9): Moderate revision
- **D** (3.0-4.9): Major revision
- **F** (0.0-2.9): Rewrite needed

### Address Findings

Review evaluation findings and recommendations. Make improvements and re-evaluate.

## Step 7: Package

### Goal

Create distributable .skill file.

### Command

```bash
# Default output (./dist/)
scripts/skills.py package <skill-path>

# Custom output directory
scripts/skills.py package <skill-path> ./dist
```

### What It Does

1. Automatically validates first (fails if validation fails)
2. Creates zip file with .skill extension
3. Includes all files maintaining directory structure

### Output

```
my-skill.skill  # Zip file ready for installation
```

## Step 8: Iterate

### Goal

Refine skill based on real usage.

### Workflow

```
Use on real tasks
    ↓
Notice struggles or inefficiencies
    ↓
Identify what should be updated
    ↓
Implement changes
    ↓
Test and re-evaluate
```

### Common Improvements

- **Missing guidance**: Add workflow steps for uncovered edge cases
- **Token efficiency**: Move details to references/, tighten language
- **New resources**: Add scripts for repeated patterns, references for re-discovered info
- **Security**: Address any flagged patterns
- **Clarity**: Improve description triggers, simplify instructions

### Re-Package

After making improvements, re-run validate/evaluate/package cycle.

## Quick Reference

```bash
# Full workflow from scratch
scripts/skills.py init my-skill --path ./skills
# Edit SKILL.md and add resources
scripts/skills.py validate ./skills/my-skill
scripts/skills.py evaluate ./skills/my-skill
scripts/skills.py package ./skills/my-skill

# Refinement workflow
scripts/skills.py evaluate ./skills/my-skill
# Make improvements
scripts/skills.py evaluate ./skills/my-skill
scripts/skills.py package ./skills/my-skill
```

## Related Guides

- [Evaluation-First Development](evaluation.md) - Test-driven methodology
- [Progressive Disclosure](workflows.md#progressive-disclosure) - Token efficiency patterns
- [Security Guidelines](security.md) - Security checklist
- [Best Practices](best_practices.md) - Comprehensive guide
