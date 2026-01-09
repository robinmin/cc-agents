---
description: Improve skill quality using cc-skills meta-skill best practices
argument-hint: <skill-folder>
---

# Refine Existing Skill

Improve skill quality: clarity, conciseness, structure, activation, and compliance.

## Quick Start

```bash
/rd:skill-refine 10-stages-developing
/rd:skill-refine plugins/rd/skills/code-review
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<skill-folder>` | Path to skill directory (relative, absolute, or name only) |

## Workflow

1. **Load Best Practices**: Invoke `cc-skills` for guidelines
2. **Analyze Skill**: Check frontmatter, content, structure
3. **Generate Plan**: Prioritized improvements
4. **Apply Refinements**: With user approval
5. **Validate**: Verify changes meet standards

## Analysis Checklist

### Structure
- [ ] Frontmatter valid (name ≤64, description ≤1024 chars)
- [ ] SKILL.md under 500 lines
- [ ] References one level deep
- [ ] Forward slashes (not Windows paths)

### Content
- [ ] Description: what + when to use
- [ ] No time-sensitive info
- [ ] Consistent terminology
- [ ] Concrete examples
- [ ] Clear workflows

### Code (if scripts exist)
- [ ] Error handling
- [ ] No magic numbers
- [ ] Dependencies listed

## Issue Priority

| Priority | Examples | Action |
|----------|----------|--------|
| **Critical** | Invalid frontmatter, name >64 chars | Fix immediately |
| **High** | >500 lines, unclear activation | Reduce/clarify |
| **Medium** | Missing examples, inconsistent terms | Add/standardize |
| **Low** | Organization improvements | When time permits |

## Refinement Patterns

### Verbosity Reduction

```diff
- Python is a programming language. To read a file in Python,
- you use the open() function. The open() function takes...
+ Read config files with strict validation:
+ - Use `ConfigParser` for .ini
+ - Validate required sections
+ - Raise specific errors
```

### Adding Examples

```diff
- Validate the input data before processing.
+ **Input Validation:**
+ ```python
+ if not all(k in data for k in ['name', 'email']):
+     raise ValidationError("Missing required fields")
+ ```
```

### Terminology Consistency

```diff
- Extract data from the API endpoint.
- Pull the response from the URL.
- Get information from the service path.
+ Extract data from the endpoint. (use consistently)
```

### Progressive Disclosure

```
SKILL.md (450 lines): Core workflow, quick reference
REFERENCE.md: Detailed docs, edge cases, advanced config
```

## Refinement Session

```
Step 1: Assessment
→ Reading SKILL.md (650 lines)
→ Found: Critical (1), High (2), Medium (3)

Step 2: Proposed Changes
1. Fix description (1150 → <1024 chars)
2. Reduce SKILL.md (650 → 450 lines)
3. Add concrete examples
4. Standardize terminology

Step 3: Apply (with approval)
✓ Description: 980 chars
✓ SKILL.md: 445 lines
✓ Examples added
✓ Terminology fixed

Step 4: Validation
✓ Frontmatter valid
✓ Under 500 lines
✓ No anti-patterns
```

## Interactive Mode

Claude may ask:
- "Move advanced topics to REFERENCE.md?"
- "Standardize on 'endpoint' or 'URL'?"
- "Ready to apply changes? [y/n]"

## Post-Refinement

1. Restart Claude Code to load changes
2. Test activation keywords
3. Verify improved guidance
4. Run `/rd:skill-evaluate` to confirm

## See Also

- `/rd:skill-add` - Create new skills
- `/rd:skill-evaluate` - Evaluate quality
- `cc-skills` skill - Best practices reference
