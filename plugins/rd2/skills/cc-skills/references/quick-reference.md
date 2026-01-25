# Quick Reference for Claude Code Skills

This reference provides quick lookup patterns for skill creation and structure.

## Skill Structure Patterns

### Minimal Skill

```
skill-name/
└── SKILL.md
```

**When to use:** Simple knowledge, no complex resources needed
**Characteristics:**
- Single file with frontmatter and content
- No external dependencies
- 500-1,500 words
- Focused on one specific task

**Example use case:**
- Simple formatting guidelines
- Basic reference documentation
- Single-purpose utility

### Standard Skill (Recommended)

```
skill-name/
├── SKILL.md
├── references/
│   └── detailed-guide.md
└── examples/
    └── working-example.sh
```

**When to use:** Most plugin skills with detailed documentation
**Characteristics:**
- Core content in SKILL.md (1,500-2,000 words)
- Detailed documentation in references/
- At least one working example
- Progressive disclosure implemented

**Example use case:**
- Domain-specific workflows
- API integration patterns
- Feature implementation guides

### Complete Skill

```
skill-name/
├── SKILL.md
├── references/
│   ├── patterns.md
│   ├── advanced.md
│   └── api-reference.md
├── examples/
│   ├── example1.sh
│   ├── example2.json
│   └── example3.py
└── scripts/
    ├── validate.sh
    ├── test.sh
    └── utility.py
```

**When to use:** Complex domains with validation utilities
**Characteristics:**
- Comprehensive documentation
- Multiple examples covering scenarios
- Utility scripts for common operations
- Extensive reference documentation

**Example use case:**
- Full-stack development workflows
- Complex system integration
- Multi-language code generation

---

## Frontmatter Templates

### Basic Template

```yaml
---
name: skill-name
description: This skill should be used when the user asks to "specific phrase 1", "specific phrase 2", or mentions domain-specific terms.
---
```

### With Version

```yaml
---
name: skill-name
description: This skill should be used when the user asks to "specific phrase 1", "specific phrase 2", or mentions domain-specific terms.
version: 1.0.0
---
```

### Comprehensive Example

```yaml
---
name: oauth-integration
description: This skill should be used when the user asks to "implement OAuth2", "add Google authentication", "configure OAuth providers", "set up SSO", or mentions OAuth flows, authorization codes, or token management. Provides comprehensive OAuth2 integration workflows for web applications including PKCE, state management, and token refresh.
version: 2.1.0
---
```

---

## SKILL.md Structure Template

### Essential Sections

```markdown
# [Skill Name]

## Overview
[Brief description of skill's purpose - 100-200 words]

## Quick Start
```bash
# Most common usage example
```

## Workflows
### [Workflow 1 Name]
[Step-by-step procedure]

### [Workflow 2 Name]
[Step-by-step procedure]

## Additional Resources
### Reference Files
- **`references/file1.md`** - Description
- **`references/file2.md`** - Description

### Examples
- **`examples/example1.sh`** - Description
```

### Optional Sections

```markdown
## Architecture
[Design patterns, system architecture]

## Best Practices
[Recommendations and guidelines]

## Troubleshooting
[Common issues and solutions]

## Related Skills
- **[other-skill]** - [Relationship]
```

---

## Progressive Disclosure Patterns

### SKILL.md Content (Always Loaded)

**Include:**
- Core concepts (briefly)
- Essential procedures
- Quick start examples
- Reference links
- Common use cases

**Target:** 1,500-2,000 words

### references/ Content (Loaded as Needed)

**Types of content to move:**
- Detailed patterns → `references/patterns.md`
- Advanced techniques → `references/advanced.md`
- API documentation → `references/api-reference.md`
- Migration guides → `references/migration.md`
- Troubleshooting → `references/troubleshooting.md`

**Target:** 2,000-5,000+ words each

### examples/ Content

**Types of examples:**
- Complete working scripts
- Configuration templates
- Before/after comparisons
- Real-world usage scenarios

### scripts/ Content

**Types of scripts:**
- Validation tools
- Testing helpers
- Generation utilities
- Automation scripts

---

## Writing Style Quick Reference

### Description Format

| Aspect | Correct | Incorrect |
|--------|---------|-----------|
| **Person** | Third person ("This skill should be used...") | Second person ("Use this skill...") |
| **Triggers** | Specific phrases ("create X", "configure Y") | Generic ("working with X") |
| **Scope** | Clear about what skill does | Vague or ambiguous |

### Body Format

| Aspect | Correct | Incorrect |
|--------|---------|-----------|
| **Form** | Imperative ("Create X") | Second person ("You should create X") |
| **Tone** | Objective, instructional | Conversational |
| **Structure** | Clear headings, numbered steps | Unstructured paragraphs |

---

## Quality Dimensions Quick Reference

| Dimension | Weight | Key Metrics |
|-----------|--------|-------------|
| **Frontmatter** | 10% | Valid YAML, name, description quality |
| **Content** | 25% | Length, sections, examples |
| **Security** | 20% | No dangerous patterns (eval, exec) |
| **Structure** | 15% | Progressive disclosure, organization |
| **Efficiency** | 10% | Token count, file sizes |
| **Best Practices** | 10% | Naming, anti-patterns |
| **Code Quality** | 10% | Error handling, type hints |

---

## Common Commands

### Initialize Skill

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py init <skill-name> --path ${CLAUDE_PLUGIN_ROOT}/skills
```

### Validate Skill

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py validate ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>
```

### Evaluate Skill

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>

# With JSON output
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name> --json
```

### Package Skill

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py package ${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>
```

---

## Grading Scale

| Grade | Score | Status | Action |
|-------|-------|--------|--------|
| **A** | 90-100 | Production ready | Deploy |
| **B** | 70-89 | Minor polish | Fix minor issues |
| **C** | 50-69 | Needs improvement | Address major issues |
| **D** | 30-49 | Major revision | Rewrite significant portions |
| **F** | <30 | Complete rewrite | Start over |

---

## Checklist Summary

### Before Finalizing

**Structure:**
- [ ] SKILL.md exists with valid frontmatter
- [ ] name and description fields present
- [ ] Referenced files exist
- [ ] Examples are complete

**Description:**
- [ ] Third person format
- [ ] Specific trigger phrases
- [ ] Concrete scenarios
- [ ] Appropriate length (50-500 chars)

**Content:**
- [ ] Imperative/infinitive form
- [ ] 1,500-2,000 words (ideal)
- [ ] Detailed content in references/
- [ ] Examples are working

**Progressive Disclosure:**
- [ ] SKILL.md is lean
- [ ] references/ linked
- [ ] examples/ present
- [ ] No duplication

---

## Related References

- **[writing-style.md](writing-style.md)** - Detailed writing style guide
- **[validation-checklist.md](validation-checklist.md)** - Comprehensive validation
- **[common-mistakes.md](common-mistakes.md)** - Common pitfalls and solutions
- **[SKILL.md](../SKILL.md)** - Main skill documentation
- **[best_practices.md](best_practices.md)** - Comprehensive best practices
- **[workflows.md](workflows.md)** - Detailed workflow patterns
