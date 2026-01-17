---
description: Create a new Claude Code Agent Skill with templates and best practices
skills: [cc-skills]
argument-hint: <plugin-name> <skill-name> [template-type]
---

# Add New Skill

Create a new Claude Code Agent Skill with proper structure and templates.

## Quick Start

```bash
/rd:skill-add rd api-docs                # Basic skill
/rd:skill-add rd code-review complete    # With supporting files
/rd:skill-add rd data-pipeline workflow  # Multi-stage workflow
```

## Arguments

| Argument        | Required | Description                                           |
| --------------- | -------- | ----------------------------------------------------- |
| `plugin-name`   | Yes      | Target plugin (e.g., "rd", "wt")                      |
| `skill-name`    | Yes      | Skill name (lowercase-hyphens, ≤64 chars)             |
| `template-type` | No       | `basic` (default), `complete`, `workflow`, `analysis` |

## Templates

| Template     | Use When                    | Structure                                     |
| ------------ | --------------------------- | --------------------------------------------- |
| **basic**    | Simple, focused task        | SKILL.md                                      |
| **complete** | Complex domain with docs    | SKILL.md, REFERENCE.md, EXAMPLES.md, scripts/ |
| **workflow** | Multi-stage with validation | SKILL.md (staged)                             |
| **analysis** | Investigation/review task   | SKILL.md (framework)                          |

**Decision Guide:**

- Claude already knows most of this? → `basic`
- Need detailed API docs or edge cases? → `complete`
- Multi-step process with validation? → `workflow`
- Analysis or investigation? → `analysis`

## Workflow

1. **Validate**: Check name format, length, uniqueness
2. **Create**: Run `addskill.sh` to generate structure
3. **Customize**: Edit SKILL.md with specific content
4. **Refine**: Use `/rd:skill-refine` to improve quality

## Validation Rules

| Rule     | Valid                        | Invalid                        |
| -------- | ---------------------------- | ------------------------------ |
| Format   | `code-review`, `api-docs-v2` | `Code_Review`, `api.docs`      |
| Length   | ≤64 characters               | Longer names                   |
| Reserved | -                            | Contains `anthropic`, `claude` |

## Next Steps After Creation

1. **Edit SKILL.md**
   - Update description (≤1024 chars, third-person)
   - Fill in workflow steps
   - Add concrete examples
   - Remove placeholders

2. **Test**
   - Reload Claude Code
   - Test activation keywords
   - Verify expected behavior

3. **Refine**
   ```bash
   /rd:skill-refine <skill-name>
   /rd:skill-evaluate <skill-name>
   ```

## Troubleshooting

| Error            | Solution                             |
| ---------------- | ------------------------------------ |
| Invalid name     | Use lowercase, numbers, hyphens only |
| Name too long    | ≤64 characters                       |
| Already exists   | Choose different name                |
| Plugin not found | Verify plugin name                   |

## See Also

- `/rd:skill-refine` - Improve existing skills
- `/rd:skill-evaluate` - Evaluate skill quality
- `cc-skills` skill - Best practices reference
