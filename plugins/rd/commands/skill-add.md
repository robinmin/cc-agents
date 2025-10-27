# Add New Skill

Add a new Claude Code Agent Skill to any plugin using templates and best practices.

## Purpose

Generate a new skill with proper structure, frontmatter, and template-based content. Automatically creates the skill directory and initial files following Claude Code Agent Skills best practices.

## Usage

```bash
/rd:skill-add <plugin-name> <skill-name> [template-type]
```

### Arguments

- `plugin-name` (required): Target plugin name (e.g., "rd", "hello")
- `skill-name` (required): New skill name (lowercase, hyphens allowed, max 64 chars)
- `template-type` (optional): Template to use (default: "basic")
  - `basic`: Simple, focused task
  - `complete`: Complex domain with supporting files
  - `workflow`: Multi-stage process with validation
  - `analysis`: Investigation or review task

## Examples

**Create basic skill:**
```bash
/rd:skill-add rd api-docs
```

**Create complete skill with supporting files:**
```bash
/rd:skill-add rd code-review complete
```

**Create workflow skill:**
```bash
/rd:skill-add rd data-pipeline workflow
```

**Create analysis skill:**
```bash
/rd:skill-add hello project-analysis analysis
```

## Workflow

When you invoke this command, Claude will:

1. **Validate inputs:**
   - Check skill name format (lowercase, hyphens, no reserved words)
   - Verify skill name length (≤64 characters)
   - Validate plugin exists
   - Ensure skill doesn't already exist

2. **Execute script:**
   - Run `plugins/rd/scripts/addskill.sh` with provided arguments
   - The script creates skill directory and files
   - Generate template-based content

3. **Review output:**
   - Check script output for success/errors
   - Review created file list
   - Note the skill directory location

4. **Customize skill:**
   - Edit `SKILL.md` to add specific content
   - Update description in frontmatter
   - Fill in workflow details
   - Add concrete examples

5. **Refine quality:**
   - Use `/rd:skill-refine <skill-name>` to improve
   - Test with fresh Claude instance
   - Validate against best practices

## Created Structure

### Basic Template

```
skills/skill-name/
├── SKILL.md          # Main skill file with frontmatter
└── README.md         # Next steps guidance
```

### Complete Template

```
skills/skill-name/
├── SKILL.md          # Main skill file
├── REFERENCE.md      # Detailed documentation
├── EXAMPLES.md       # Usage examples
├── scripts/          # Utility scripts directory
└── README.md         # Next steps guidance
```

### Workflow Template

```
skills/skill-name/
├── SKILL.md          # Multi-stage workflow
└── README.md         # Next steps guidance
```

### Analysis Template

```
skills/skill-name/
├── SKILL.md          # Analysis framework
└── README.md         # Next steps guidance
```

## Validation Rules

The script enforces:

✅ **Name Format:**
- Lowercase letters, numbers, hyphens only
- No spaces or special characters
- Valid: `code-review`, `api-docs-v2`, `test-automation`
- Invalid: `Code_Review`, `api.docs`, `test automation`

✅ **Name Length:**
- Maximum 64 characters
- Counted after validation

✅ **Reserved Words:**
- Cannot contain: `anthropic`, `claude`

✅ **Unique Names:**
- Skill must not already exist in target plugin
- Script checks before creating files

## Next Steps After Creation

1. **Edit SKILL.md:**
   - Update description (max 1024 chars, no XML tags)
   - Fill in workflow steps
   - Add concrete examples
   - Remove placeholder text

2. **Add Content:**
   - For complete template: Fill REFERENCE.md and EXAMPLES.md
   - For all templates: Replace generic placeholders with specifics
   - Add utility scripts if needed

3. **Test:**
   - Restart Claude Code to load new skill
   - Test activation with relevant keywords
   - Verify skill provides expected guidance

4. **Refine:**
   - Use `/rd:skill-refine <skill-name>` to improve quality
   - Review against best practices (see `cc-skills` skill)
   - Test with fresh Claude instances

## Template Selection Guide

| Template | Use When | Complexity | Files Created |
|----------|----------|------------|---------------|
| basic | Simple, focused task | Low | SKILL.md only |
| complete | Complex domain needing detailed docs | High | SKILL.md + REFERENCE.md + EXAMPLES.md + scripts/ |
| workflow | Multi-stage process with validation loops | Medium | SKILL.md with stage structure |
| analysis | Investigation, review, or assessment task | Medium | SKILL.md with analysis framework |

**Decision Questions:**

- Does Claude already know most of this? → **basic**
- Need detailed API docs or edge cases? → **complete**
- Multi-step process with validation? → **workflow**
- Analysis or investigation task? → **analysis**

## Troubleshooting

**Error: "Invalid skill name"**
- Check name uses lowercase, numbers, hyphens only
- No spaces or special characters allowed

**Error: "Skill name too long"**
- Reduce name to 64 characters or fewer

**Error: "Skill already exists"**
- Choose different name or remove existing skill first

**Error: "Plugin directory not found"**
- Verify plugin name is correct
- Check plugin exists in `plugins/` directory

**Script execution fails:**
- Verify `plugins/rd/scripts/addskill.sh` is executable
- Check file permissions
- Review script output for specific error

## See Also

- `/rd:skill-refine` - Refine existing skills
- `/rd:skill-evaluate` - Evaluate skill quality
- `plugins/rd/skills/cc-skills/` - Best practices for skills
- `plugins/rd/skills/cc-skills/TEMPLATES.md` - Template details
- `plugins/rd/skills/cc-skills/EXAMPLES.md` - Complete skill examples
