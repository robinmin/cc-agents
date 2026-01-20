---
description: Improve skill quality using cc-skills2 best practices
skills: [cc-skills2]
argument-hint: <skill-folder>
---

# Refine Existing Skill

Thin wrapper for cc-skills2. Improves skill quality with user approval.

## Quick Start

```bash
/rd2:skill-refine data-pipeline
/rd2:skill-refine plugins/rd2/skills/code-review
```

## Arguments

| Argument         | Description                               |
|------------------|-------------------------------------------|
| `<skill-folder>` | Path to skill (relative, absolute, or name) |

## Workflow

1. **Load** - Read cc-skills2 best practices
2. **Analyze** - Check structure, content, patterns
3. **Plan** - Generate prioritized improvements
4. **Apply** - Make changes with user approval
5. **Validate** - Verify changes meet standards

## Improvement Areas

| Area | Checks |
|------|--------|
| Structure | Frontmatter valid, under 500 lines |
| Content | Description clarity, examples, terminology |
| Code | Error handling, no magic numbers |

## Refinement Patterns

**Reduce Verbosity:**
```diff
- Python is a programming language. To read a file...
+ Read config files with strict validation:
+ - Use ConfigParser for .ini
+ - Validate required sections
```

**Add Examples:**
```diff
- Validate the input data before processing.
+ **Input Validation:**
+ if not all(k in data for k in ['name', 'email']):
+     raise ValidationError("Missing fields")
```

**Fix Terminology:**
```diff
- Extract data from the API endpoint.
- Pull the response from the URL.
+ Extract data from the endpoint. (consistent)
```

## Interactive Mode

The refinement may ask for approval:
- "Move advanced topics to REFERENCE.md?"
- "Standardize on 'endpoint' or 'URL'?"
- "Ready to apply changes? [y/n]"

## Post-Refinement

1. Restart Claude Code to load changes
2. Test activation keywords
3. Verify improved guidance
4. Run `/rd2:skill-evaluate` to confirm

## See Also

- `/rd2:skill-add` - Create new skills
- `/rd2:skill-evaluate` - Assess quality
- `cc-skills2` - Best practices reference
