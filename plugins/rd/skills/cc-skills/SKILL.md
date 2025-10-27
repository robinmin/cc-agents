---
name: cc-skills
description: Meta-skill containing domain knowledge and best practices for creating and refining Claude Code Agent Skills. Use when creating new skills or improving existing ones.
---

# Claude Code Agent Skills - Domain Knowledge

This skill provides comprehensive guidance for creating and refining Claude Code Agent Skills effectively.

## Core Architecture

### Required Structure

Every skill MUST have a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: skill-name
description: What this skill does and when to use it
---
```

**Frontmatter Rules:**
- `name`: Max 64 chars, lowercase/numbers/hyphens only, no "anthropic" or "claude"
- `description`: Max 1024 chars, non-empty, no XML tags

### Three-Level Content Loading

Skills use progressive disclosure to optimize token usage:

**Level 1: Metadata (Always Loaded)**
- YAML frontmatter only (~100 tokens/skill)
- Used for discovery and triggering

**Level 2: Instructions (Loaded When Triggered)**
- Main SKILL.md body (under 5k tokens recommended)
- Procedural knowledge and workflows

**Level 3: Resources (Loaded As Needed)**
- Additional markdown files, scripts, templates
- Referenced one level deep from SKILL.md
- Scripts execute without loading code into context

### File Organization Pattern

```
skill-name/
├── SKILL.md              # Main instructions + frontmatter
├── REFERENCE.md          # Detailed API/technical docs
├── EXAMPLES.md           # Usage examples
├── templates/            # Template files
│   └── starter.template
└── scripts/              # Executable utilities
    └── helper.py
```

## Writing Effective Skills

### Naming Conventions

**Skill Names:**
- Use gerund form: "processing-pdfs", "analyzing-data"
- Or noun phrases: "code-review-guide", "api-docs-builder"
- Avoid vague terms: "helper", "utils", "tools"

**Descriptions:**
- Write in third person
- Include BOTH what it does AND when to use it
- Example: "Analyzes Excel spreadsheets and creates pivot tables. Use when working with .xlsx files or analyzing tabular data."

### Content Guidelines

**Conciseness:**
- Only include information Claude doesn't already know
- Challenge each piece: if Claude likely knows it, omit it
- Keep SKILL.md under 500 lines
- Split additional content into referenced files

**Appropriate Freedom Levels:**
- **High freedom (text instructions)**: When multiple valid approaches exist
- **Medium freedom (pseudocode)**: When preferred patterns exist but variation is acceptable
- **Low freedom (specific scripts)**: For fragile operations requiring exact sequences

**Consistency:**
- Use ONE term per concept throughout
- Don't mix: "API endpoint/URL/path" or "extract/pull/get/retrieve"

**Avoid Time-Sensitivity:**
- No dates or version cutoffs
- Use "old patterns" sections for deprecated approaches

### Structure Best Practices

**Progressive Disclosure:**
- Keep SKILL.md focused and under 500 lines
- Reference additional files one level deep
- Use clear, descriptive filenames: `form_validation_rules.md` not `doc2.md`

**Workflows:**
- Break complex tasks into clear steps
- Provide checklists for critical operations
- Include validation loops: run validator → fix errors → repeat

**Examples:**
- Provide concrete input/output pairs
- Show desired style and detail level
- Especially important for format-dependent tasks

## Scripts and Code

### Script Guidelines

**Error Handling:**
- Scripts should solve problems, not defer to Claude
- Handle error conditions explicitly with helpful messages
- Example:
  ```python
  if not file.exists():
      print("ERROR: File not found. Please check the path.")
      sys.exit(1)
  ```

**Documentation:**
- Justify parameters (no "magic numbers")
- Document why each constant value was chosen
- Make clear: should Claude execute or read as reference?

**Verification Pattern:**
For complex batch operations:
1. Analyze inputs
2. Create plan
3. Validate plan
4. Execute
5. Verify outputs

**Dependencies:**
- List required packages explicitly
- Verify availability in code execution environment
- No network access for external API calls
- No runtime package installation

## Quality Checklist

Before finalizing any skill, verify:

**Structure:**
- [ ] YAML frontmatter valid (name ≤64 chars, description ≤1024 chars)
- [ ] SKILL.md under 500 lines
- [ ] Additional details in separate files (one level deep)
- [ ] File references use forward slashes (not Windows paths)

**Content:**
- [ ] Description includes what it does AND when to use it
- [ ] No time-sensitive information (dates, version cutoffs)
- [ ] Consistent terminology throughout
- [ ] Concrete examples, not abstract descriptions
- [ ] Clear workflows with numbered steps
- [ ] No excessive options without defaults

**Code:**
- [ ] Scripts handle errors explicitly
- [ ] Parameters are justified (no magic numbers)
- [ ] Dependencies listed and verified
- [ ] Clear execution vs reference intent

**Testing:**
- [ ] Tested with fresh Claude instance
- [ ] Works across Haiku, Sonnet, and Opus
- [ ] Real usage scenarios validated
- [ ] Observed behavior matches expectations

## Common Anti-Patterns

Avoid these mistakes:

❌ **Windows-style paths**: Use `reference/guide.md` not `reference\guide.md`
❌ **Deeply nested references**: Keep references one level deep from SKILL.md
❌ **Vague file names**: Use descriptive names, not `doc1.md`, `util.py`
❌ **Assuming pre-installed tools**: Explicitly list and verify dependencies
❌ **Excessive options**: Provide defaults and recommendations
❌ **Time-sensitive content**: No "as of 2024" or version cutoff references
❌ **Inconsistent terminology**: Pick one term per concept and stick to it
❌ **Abstract examples**: Always use concrete input/output pairs

## Skill Creation Workflow

When creating a new skill:

1. **Define Purpose**
   - What specific problem does this solve?
   - When should Claude use this?
   - What are the activation keywords?

2. **Build Evaluations First**
   - Create test scenarios
   - Establish baselines
   - Identify gaps in Claude's existing knowledge

3. **Write Minimal Instructions**
   - Address only identified gaps
   - Start with core workflow
   - Add details only where Claude struggles

4. **Organize Resources**
   - Separate advanced topics into referenced files
   - Create utility scripts for fragile operations
   - Provide templates for common patterns

5. **Test and Iterate**
   - Test with fresh Claude instances
   - Observe real usage patterns
   - Refine based on observed behavior, not assumptions

6. **Document Dependencies**
   - List required packages
   - Verify environment availability
   - Note any limitations (no network, no runtime installs)

## Skill Refinement Workflow

When refining an existing skill:

1. **Observe Issues**
   - Where does Claude struggle?
   - Missed connections?
   - Ignored content?
   - Overreliance on certain sections?

2. **Analyze Root Causes**
   - Too verbose?
   - Unclear activation conditions?
   - Missing concrete examples?
   - Inconsistent terminology?

3. **Apply Refinements**
   - Simplify overlong sections
   - Add examples where Claude struggles
   - Remove redundant information Claude already knows
   - Improve terminology consistency

4. **Validate Changes**
   - Test with fresh Claude instances
   - Verify across different models
   - Confirm real usage scenarios work better

## File Organization Standards

**Skill Directory Naming:**
- Use lowercase with hyphens: `code-review`, `api-builder`
- Reflect skill domain clearly
- Avoid generic names: `utilities`, `helpers`

**File Naming:**
- SKILL.md (required, uppercase)
- Descriptive supporting files: REFERENCE.md, EXAMPLES.md, TEMPLATES.md
- Script directory: `scripts/`
- Template directory: `templates/`

**Path References:**
- Always use forward slashes
- Relative paths from SKILL.md
- One level deep for referenced files
- Example: `See REFERENCE.md for details` or `Run scripts/validate.py`

## Integration Patterns

**With Commands:**
- Commands can trigger skills via Skill tool
- Skills provide domain knowledge
- Commands orchestrate specific operations

**With Other Skills:**
- Skills can reference related skills
- Keep references simple: "See skill-name for X"
- Avoid circular dependencies

**With Scripts:**
- Scripts execute via bash without loading code
- Return only outputs (token efficient)
- Handle all error cases explicitly

## Environmental Constraints

Be aware of limitations:

- **No Network Access**: Cannot call external APIs
- **No Runtime Installation**: Only pre-installed packages available
- **Filesystem-Based**: Skills exist as directories, accessed via bash
- **Context Shared**: Skills share context window with conversation
- **No Auto-Sync**: Skills don't sync between Claude Code/API/claude.ai

## Success Metrics

A well-crafted skill should:

✅ Activate automatically when relevant
✅ Provide value Claude couldn't otherwise deliver
✅ Work consistently across models (Haiku, Sonnet, Opus)
✅ Stay under 500 lines in SKILL.md
✅ Include concrete, actionable guidance
✅ Handle errors gracefully in scripts
✅ Use consistent terminology throughout
✅ Pass quality checklist validation

## Reference Files

For detailed guidance on specific topics:
- See BEST_PRACTICES.md for comprehensive guidelines
- See EXAMPLES.md for complete skill examples
- See TEMPLATES.md for starter templates
