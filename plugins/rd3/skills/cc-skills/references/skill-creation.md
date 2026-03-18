# Skill Creation Guide

Step-by-step guide for creating and refining rd3 skills.

## Overview

This document provides detailed guidance for creating new skills using the rd3 workflow. rd3 uses a four-operation approach: add, evaluate, refine, and package.

## Process Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SKILL CREATION WORKFLOW                  │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────┐
│ Step 1:      │ Gather concrete examples of how the skill
│ Understand    │ will be used. What functionality should it
│ Requirements │ support? What would users say to trigger it?
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Step 2:      │ For each example, identify:
│ Plan Resources│ • Scripts: Code rewritten repeatedly?
│               │ • References: Info re-discovered each time?
│               │ • Assets: Boilerplate needed each time?
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Step 3:       │ Run scaffold command:
│ Scaffold      │ bun scripts/scaffold.ts <name> --path <dir>
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Step 4:      │ A. Implement resources (test scripts!)
│ Implement     │ B. Write SKILL.md (frontmatter + body)
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Step 5:      │ bun scripts/evaluate.ts <skill-path>
│ Evaluate      │ Checks: YAML, structure, quality
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Step 6:      │ bun scripts/refine.ts <skill-path>
│ Refine        │ Fix issues, add platform companions
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Step 7:      │ bun scripts/package.ts <skill-path>
│ Package       │ Creates distributable bundle
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Step 8:      │ Use on real tasks, gather feedback,
│ Iterate       │ refine SKILL.md and resources
└───────────────┘
```

---

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

---

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
| **scripts/** | Code rewritten repeatedly, deterministic reliability needed | `scripts/rotate_pdf.ts` for PDF rotation |
| **references/** | Info re-discovered each time: schemas, APIs, domain knowledge | `references/schema.md` for table schemas |
| **assets/** | Boilerplate needed each time: templates, sample files | `assets/hello-world/` for template |

### Example: PDF Editor Skill

**Example query:** "Help me rotate this PDF"

**Analysis:**
1. Rotating a PDF requires re-writing the same code each time
2. A `scripts/rotate_pdf.ts` script would be helpful

**Result:** Include `scripts/rotate_pdf.ts`

---

## Step 3: Scaffold Skill

### Goal

Create the skill directory structure with proper templates.

### Command

```bash
bun scripts/scaffold.ts <skill-name> --path <output-directory>
```

### What It Creates

```
skill-name/
├── SKILL.md          # Template with frontmatter and TODO sections
├── scripts/
│   └── .gitkeep     # Placeholder for scripts
└── references/
    └── .gitkeep     # Placeholder for references
```

### After Scaffolding

- Customize SKILL.md frontmatter with skill-specific name and description
- Keep or remove placeholder files based on skill needs
- Add skill-specific scripts, references, or assets

---

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
metadata:
  platforms: claude-code,codex,openclaw,opencode,antigravity
---
```

**Description tips:**
- Include BOTH what the skill does and when to use it
- Use third person: "This skill should be used when..."
- Put "when to use" info here, NOT in the body
- Example: "Comprehensive PDF processing for rotation, merging, and text extraction. Use when working with PDF files: rotating pages, merging multiple PDFs, extracting text content, or modifying PDF structure."

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

---

## Step 5: Evaluate

### Goal

Ensure the skill meets all structural and quality requirements.

### Command

```bash
# Basic validation
bun scripts/evaluate.ts <skill-path> --scope basic

# Full evaluation with scoring
bun scripts/evaluate.ts <skill-path> --scope full
```

### What It Checks (Basic)

- ✓ SKILL.md exists
- ✓ Valid YAML frontmatter
- ✓ Required fields (name, description)
- ✓ Proper file organization

### What It Checks (Full)

- All basic checks +
- Quality scoring across dimensions
- Recommendations for improvement

### Exit Codes

- `0` - Evaluation passed
- `1` - Evaluation failed

If evaluation fails, fix errors and re-run.

---

## Step 6: Refine

### Goal

Fix issues and improve quality based on evaluation results.

### Command

```bash
# Apply deterministic fixes
bun scripts/refine.ts <skill-path> --best-practices

# Generate platform companions
bun scripts/refine.ts <skill-path> --platform all

# Dry run
bun scripts/refine.ts <skill-path> --dry-run
```

### Refinement Options

| Option | What It Does |
|--------|-------------|
| `--best-practices` | Auto-fix TODOs, Windows paths, circular references |
| `--migrate` | Migrate rd2 skills to rd3 format |
| `--platform` | Generate platform-specific companions |

### Multiple Options

```bash
# Combined refinement
bun scripts/refine.ts <skill-path> --best-practices --platform all
```

---

## Step 7: Package

### Goal

Create distributable bundle for sharing.

### Command

```bash
# Package skill
bun scripts/package.ts <skill-path>

# Custom output directory
bun scripts/package.ts <skill-path> ./dist
```

### What It Does

1. Automatically validates first (fails if validation fails)
2. Creates bundle with skill and all resources
3. Includes platform companions if generated

---

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
- **Clarity**: Improve description triggers, simplify instructions

### Re-Refine

After making improvements, run evaluate/refine cycle again:

```bash
bun scripts/evaluate.ts ./my-skill --scope full
bun scripts/refine.ts ./my-skill --best-practices --platform all
```

---

## Quick Reference

```bash
# Full workflow from scratch
bun scripts/scaffold.ts my-skill --path ./skills
# Edit SKILL.md and add resources
bun scripts/evaluate.ts ./skills/my-skill --scope basic
bun scripts/evaluate.ts ./skills/my-skill --scope full
bun scripts/refine.ts ./skills/my-skill --best-practices --platform all
bun scripts/package.ts ./skills/my-skill

# Refinement workflow
bun scripts/evaluate.ts ./skills/my-skill --scope full
# Make improvements
bun scripts/refine.ts ./skills/my-skill --best-practices
bun scripts/package.ts ./skills/my-skill
```

---

## See Also

- [workflows.md](workflows.md) - Detailed operation workflows
- [best-practices.md](best-practices.md) - Comprehensive guidance
- [quick-reference.md](quick-reference.md) - CLI command reference
- [troubleshooting.md](troubleshooting.md) - Common issues and fixes
