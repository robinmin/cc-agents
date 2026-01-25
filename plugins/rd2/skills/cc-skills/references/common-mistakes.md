# Common Mistakes to Avoid When Creating Skills

This reference documents common mistakes in skill creation with before/after examples and explanations.

## Overview

Creating effective skills requires attention to detail in structure, writing style, and organization. Learn from these common pitfalls to create production-ready skills.

---

## Mistake 1: Weak Trigger Description

### The Problem

Vague descriptions without specific trigger phrases fail to effectively trigger skills. Claude relies on the description to know when to load a skill.

### ❌ Bad Example

```yaml
---
name: pdf-processor
description: Use this skill when working with PDF files.
---
```

**Why this is bad:**
- Uses second person ("Use this skill")
- No specific trigger phrases
- Too generic - "working with" is vague
- Doesn't indicate what the skill actually does

### ✅ Good Example

```yaml
---
name: pdf-processor
description: This skill should be used when the user asks to "rotate a PDF", "merge PDFs", "extract text from PDF", "compress PDF", or mentions PDF operations. Provides comprehensive PDF manipulation workflows.
---
```

**Why this is good:**
- Third person format ("This skill should be used when...")
- Specific trigger phrases users would actually say
- Concrete operations (rotate, merge, extract)
- Comprehensive coverage of PDF operations
- Clear about what the skill provides

### Key Takeaways

1. **Use third person**: "This skill should be used when..." not "Use this skill when..."
2. **Include exact phrases**: What would users actually type/say?
3. **Be specific**: List concrete operations, not generic "working with"
4. **Cover variations**: Include multiple ways users might ask

---

## Mistake 2: Too Much Content in SKILL.md

### The Problem

Putting everything in SKILL.md bloats the context window. The skill loads with excessive content even when not all details are needed.

### ❌ Bad Example

```
skill-name/
└── SKILL.md  (8,000 words - everything including advanced patterns)
```

**Sample problematic SKILL.md:**
```markdown
# My Skill

## Overview
[Brief overview - 200 words]

## Basic Usage
[Basic workflows - 500 words]

## Intermediate Patterns
[Intermediate content - 1,500 words]

## Advanced Techniques
[Advanced content - 2,500 words]

## API Reference
[Complete API docs - 2,000 words]

## Edge Cases
[Edge case handling - 1,300 words]
```

**Why this is bad:**
- SKILL.md loads entire 8,000 words every time skill triggers
- Advanced techniques rarely needed for basic tasks
- API reference can be loaded on-demand
- Wastes context window tokens
- Slower skill loading

### ✅ Good Example

```
skill-name/
├── SKILL.md  (1,800 words - core essentials only)
└── references/
    ├── patterns.md (2,500 words - detailed patterns)
    ├── advanced.md (3,700 words - advanced techniques)
    └── api-reference.md (2,000 words - complete API docs)
```

**Sample lean SKILL.md:**
```markdown
# My Skill

## Overview
[Brief overview - 200 words]

## Quick Start
[Common use cases - 300 words]

## Basic Workflows
[Essential procedures - 800 words]

## Additional Resources
- **`references/patterns.md`** - Detailed patterns and techniques
- **`references/advanced.md`** - Advanced use cases
- **`references/api-reference.md`** - Complete API documentation
```

**Why this is good:**
- SKILL.md has only essential information (~1,800 words)
- Detailed content in references/ loaded only when needed
- Progressive disclosure respects context limits
- Faster skill loading
- Claude can request specific references when needed

### Key Takeaways

1. **Target 1,500-2,000 words** for SKILL.md body
2. **Maximum 5,000 words** - above this, split into references/
3. **Move to references/**:
   - Detailed patterns → `references/patterns.md`
   - Advanced techniques → `references/advanced.md`
   - API documentation → `references/api-reference.md`
   - Migration guides → `references/migration.md`
   - Edge cases → `references/troubleshooting.md`
4. **Link from SKILL.md** - Always reference supporting files
5. **Progressive disclosure** - Core in SKILL.md, details in references/

---

## Mistake 3: Second Person Writing

### The Problem

Using second person ("you", "your", "you're") creates conversational tone that's less direct and harder for Claude to process algorithmically.

### ❌ Bad Example

```markdown
# Creating Hooks

## Getting Started
You should start by creating a `.claude/hooks/` directory. You need to define the hook event type first. You can then create the hook script.

## Writing Scripts
You should always include error handling in your scripts. You need to validate inputs before processing them. You can use the provided validation utilities.

## Testing
You must test your hooks before deploying. You should use the test script provided.
```

**Why this is bad:**
- Conversational tone ("You should", "You need")
- Less direct and actionable
- Inconsistent imperative style
- Harder for Claude to process as procedures

### ✅ Good Example

```markdown
# Creating Hooks

## Getting Started
Create a `.claude/hooks/` directory and define the hook event type. Then create the hook script.

## Writing Scripts
Always include error handling in scripts. Validate inputs before processing. Use the provided validation utilities.

## Testing
Test hooks before deploying using the provided test script.
```

**Why this is good:**
- Direct imperative form ("Create", "Validate", "Test")
- Clear and actionable
- Consistent style throughout
- Easy for Claude to follow procedurally

### Key Takeaways

1. **Use imperative form**: "Create X" not "You should create X"
2. **Start with verbs**: "Validate", "Test", "Parse", "Extract"
3. **Be direct**: Not "You can..." or "Claude should..."
4. **Remove "you" completely**: Never use second person
5. **Objective tone**: Focus on what to do, not who does it

---

## Mistake 4: Missing Resource References

### The Problem

Creating supporting files (references/, examples/, scripts/) but not linking them from SKILL.md means Claude doesn't know they exist.

### ❌ Bad Example

**SKILL.md:**
```markdown
# My Skill

## Overview
This skill does X, Y, Z.

## Workflows
[Detailed workflows...]

## Advanced Techniques
[More detailed content...]

## Scripts
[Script usage...]
```

**File structure:**
```
skill-name/
├── SKILL.md
├── references/
│   ├── patterns.md  (exists but not mentioned)
│   └── advanced.md  (exists but not mentioned)
├── examples/
│   └── example.sh  (exists but not mentioned)
└── scripts/
    └── validate.sh  (exists but not mentioned)
```

**Why this is bad:**
- Claude doesn't know references/ files exist
- Detailed content goes undiscovered
- Users/Devs can't leverage additional resources
- Defeats purpose of progressive disclosure

### ✅ Good Example

**SKILL.md:**
```markdown
# My Skill

## Overview
This skill does X, Y, Z.

## Workflows
[Essential workflows only...]

## Additional Resources

### Reference Files
For detailed patterns and techniques:
- **`references/patterns.md`** - Common design patterns
- **`references/advanced.md`** - Advanced use cases and edge cases

### Example Files
Working examples:
- **`examples/example.sh`** - Complete working example
- **`examples/config.json`** - Sample configuration

### Scripts
Utility scripts:
- **`scripts/validate.sh`** - Validate skill configuration
- **`scripts/test.sh`** - Run skill tests

## Quick Start
[Essential getting started info...]
```

**Why this is good:**
- Claude knows all available resources
- Clear categorization (references/examples/scripts)
- Specific file names with descriptions
- Progressive disclosure works as intended
- Users can discover detailed content

### Key Takeaways

1. **Always link supporting files** from SKILL.md
2. **Categorize clearly**: references/, examples/, scripts/
3. **Include file names**: So Claude can Read them
4. **Add descriptions**: What each file contains
5. **Use dedicated section**: "Additional Resources" or similar

---

## Mistake 5: Poor Frontmatter Quality

### The Problem

Frontmatter with incomplete or low-quality fields causes skills to not trigger or provide poor context.

### ❌ Bad Example

```yaml
---
name: skill
description: Helps with stuff
---
```

**Issues:**
- Name too generic ("skill")
- Description too vague
- No trigger phrases
- Doesn't indicate what skill does

### ✅ Good Example

```yaml
---
name: oauth-integration
description: This skill should be used when the user asks to "implement OAuth2", "add Google authentication", "configure OAuth providers", "set up SSO", or mentions OAuth flows, authorization codes, or token management. Provides comprehensive OAuth2 integration workflows for web applications.
---
```

**Why this is good:**
- Specific, descriptive name
- Third-person description
- Multiple trigger phrases
- Covers OAuth terminology
- Clear about scope (web applications)

---

## Quick Reference Checklist

Before finalizing a skill, check for these common mistakes:

| Mistake | Symptom | Fix |
|---------|---------|-----|
| **Weak description** | Skill doesn't trigger | Add specific phrases in third person |
| **SKILL.md too long** | >5,000 words | Move details to references/ |
| **Second person** | "You should" everywhere | Convert to imperative form |
| **Unreferenced resources** | Files undiscovered | Link from SKILL.md |
| **Poor frontmatter** | Generic name/vague description | Be specific and descriptive |
| **No examples** | Users unclear how to use | Add concrete examples |
| **Missing workflows** | Claude unsure what to do | Add step-by-step procedures |
| **No progressive disclosure** | Everything in one file | Split into SKILL.md + references/ |

---

## Additional Resources

For more guidance:
- **[writing-style.md](writing-style.md)** - Detailed writing style requirements
- **[validation-checklist.md](validation-checklist.md)** - Comprehensive validation checklist
- **[SKILL.md](../SKILL.md)** - Main skill documentation
