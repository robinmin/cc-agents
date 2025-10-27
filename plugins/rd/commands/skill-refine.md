# Refine Existing Skill

Improve the quality of an existing Claude Code Agent Skill using best practices from the cc-skills meta-skill.

## Purpose

Analyze and refine an existing skill to improve:
- Content clarity and conciseness
- Structure and organization
- Activation accuracy
- Token efficiency
- Compliance with best practices

## Usage

```bash
/rd:skill-refine <skill-folder>
```

### Arguments

- `skill-folder` (required): Path to skill directory to refine
  - Can be relative: `skills/my-skill`
  - Can be absolute: `/Users/robin/projects/cc-agents/plugins/rd/skills/my-skill`
  - Can be skill name only: `my-skill` (searches in current plugin)

## Examples

**Refine skill in current plugin:**
```bash
/rd:skill-refine 10-stages-developing
```

**Refine skill with full path:**
```bash
/rd:skill-refine plugins/rd/skills/code-review
```

**Refine skill in another plugin:**
```bash
/rd:skill-refine plugins/hello/skills/greeting-messages
```

## Workflow

When you invoke this command, Claude will:

1. **Load Best Practices**
   - Invoke `cc-skills` skill for domain knowledge
   - Load quality checklist and anti-patterns
   - Load refinement guidelines

2. **Analyze Current Skill**
   - Read SKILL.md and supporting files
   - Check frontmatter validity
   - Assess content structure
   - Identify issues:
     - Verbosity (should be under 500 lines)
     - Unclear activation conditions
     - Missing concrete examples
     - Inconsistent terminology
     - Anti-patterns present

3. **Generate Refinement Plan**
   - List specific improvements needed
   - Prioritize by impact (Critical/High/Medium/Low)
   - Suggest concrete changes
   - Identify missing components

4. **Apply Refinements** (with your approval)
   - Simplify overlong sections
   - Add concrete examples where needed
   - Improve terminology consistency
   - Reorganize for better progressive disclosure
   - Remove redundant information
   - Fix anti-patterns

5. **Validate Changes**
   - Verify frontmatter still valid
   - Check SKILL.md under 500 lines
   - Confirm no XML tags in frontmatter
   - Ensure description under 1024 chars

## Analysis Checklist

Claude will review against these criteria:

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

**Efficiency:**
- [ ] Content concise (only what Claude doesn't already know)
- [ ] References one level deep
- [ ] No repetitive content
- [ ] Appropriate freedom level (text/pseudocode/script)

## Refinement Patterns

### Verbosity Reduction

**Before:**
```markdown
Python is a programming language. To read a file in Python, you use the
open() function. The open() function takes a filename parameter and a mode
parameter. The mode 'r' means read mode. After reading, you should close
the file.
```

**After:**
```markdown
Read configuration files using strict validation:
- Use `ConfigParser` for .ini files
- Validate all required sections exist
- Raise `ConfigError` with specific missing field names
```

### Adding Concrete Examples

**Before:**
```markdown
Validate the input data before processing.
```

**After:**
```markdown
**Input Validation:**
```python
# Check required fields
if not all(k in data for k in ['name', 'email', 'phone']):
    raise ValidationError("Missing required fields")

# Validate email format
if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', data['email']):
    raise ValidationError("Invalid email format")
```
```

### Improving Terminology Consistency

**Before:**
```markdown
Extract the data from the API endpoint.
Pull the response from the URL.
Get information from the service path.
```

**After:**
```markdown
Extract data from the API endpoint.
Extract the response from the endpoint.
Extract information from the endpoint.
```

### Progressive Disclosure

**Before:** Everything in SKILL.md (800 lines)

**After:**
```
SKILL.md (450 lines):
- Core workflow
- Quick reference
- Common patterns
- See REFERENCE.md for details

REFERENCE.md:
- Detailed API documentation
- Edge cases
- Advanced configurations
```

## Common Issues Detected

### Critical Issues

**Missing or Invalid Frontmatter:**
- No YAML frontmatter
- Name > 64 characters
- Description > 1024 characters
- XML tags in description
- Reserved words in name

**Action:** Fix immediately, skill won't load otherwise

### High Priority

**Too Verbose:**
- SKILL.md > 500 lines
- Includes information Claude already knows
- Excessive repetition

**Action:** Reduce to essentials, move details to REFERENCE.md

**Unclear Activation:**
- Description doesn't explain when to use
- Missing activation keywords
- Too vague: "A helpful skill"

**Action:** Rewrite description to include triggering conditions

### Medium Priority

**Missing Examples:**
- Only abstract descriptions
- No concrete input/output pairs
- No code samples

**Action:** Add specific examples

**Inconsistent Terminology:**
- Multiple terms for same concept
- Mixing vocabulary: "fetch/get/pull/retrieve"

**Action:** Pick one term per concept

**Anti-Patterns:**
- Windows-style paths (`\` instead of `/`)
- Deeply nested references
- Time-sensitive content ("as of 2024")
- Assumed pre-installed tools

**Action:** Fix each anti-pattern

### Low Priority

**Organization:**
- Could benefit from better structure
- Sections could be reordered for clarity

**Action:** Improve when time permits

## Refinement Workflow

**Step 1: Initial Assessment**
```
→ Loading skill from: plugins/rd/skills/my-skill
→ Reading SKILL.md...
→ Checking supporting files...
→ Analyzing against best practices...
```

**Step 2: Issue Report**
```
# Refinement Analysis: my-skill

## Critical Issues
- Description > 1024 characters (current: 1150)

## High Priority
- SKILL.md too verbose (current: 650 lines, target: <500)
- Unclear activation condition in description

## Medium Priority
- Missing concrete examples
- Inconsistent terminology (3 different terms for "endpoint")

## Low Priority
- Could improve section organization
```

**Step 3: Refinement Plan**
```
## Proposed Changes

1. **Fix Description** (Critical)
   - Reduce from 1150 to <1024 characters
   - Add activation condition: "Use when..."

2. **Reduce Verbosity** (High)
   - Move detailed API docs to REFERENCE.md
   - Remove redundant explanations Claude already knows
   - Target: 450 lines

3. **Add Examples** (Medium)
   - Add 3 concrete input/output examples
   - Show typical usage patterns

4. **Fix Terminology** (Medium)
   - Standardize on "endpoint" (not "URL/path/route")
   - Create terminology section if needed
```

**Step 4: Apply Changes**
(With user approval)
```
→ Updating SKILL.md frontmatter...
✓ Description reduced to 980 characters
✓ Added activation condition

→ Reorganizing content...
✓ Moved detailed docs to REFERENCE.md
✓ SKILL.md reduced to 445 lines

→ Adding examples...
✓ Added 3 concrete examples

→ Fixing terminology...
✓ Standardized on "endpoint"
✓ Added terminology section

→ Validating changes...
✓ Frontmatter valid
✓ All references one level deep
✓ No anti-patterns detected
```

**Step 5: Summary**
```
# Refinement Complete

**Changes Applied:**
- Fixed description length (1150 → 980 chars)
- Reduced SKILL.md (650 → 445 lines)
- Created REFERENCE.md for detailed docs
- Added 3 concrete examples
- Standardized terminology

**Quality Metrics:**
- Frontmatter: Valid ✓
- Length: Under 500 lines ✓
- Examples: Concrete ✓
- Terminology: Consistent ✓
- Anti-patterns: None ✓

**Next Steps:**
- Test with fresh Claude instance
- Verify activation works as expected
- Consider adding utility scripts if applicable
```

## Interactive Mode

During refinement, Claude may ask:

**Clarification Questions:**
- "Should I move advanced topics to REFERENCE.md?"
- "Which term should I standardize on: 'endpoint' or 'URL'?"
- "Should I create EXAMPLES.md or keep examples in SKILL.md?"

**Approval Requests:**
- "Ready to apply these changes? [y/n]"
- "Create REFERENCE.md with these sections? [y/n]"
- "Should I simplify this section? [y/n]"

## Validation After Refinement

After refinement, verify:

1. **Restart Claude Code** to load updated skill
2. **Test Activation** with relevant keywords
3. **Check Functionality** - does skill provide better guidance?
4. **Verify Quality:**
   - Run through quality checklist
   - Confirm all critical/high issues resolved
   - Ensure no new issues introduced

## Troubleshooting

**Skill not found:**
- Verify path is correct
- Check skill exists in specified location
- Try full absolute path

**Too many issues:**
- Address critical issues first
- Apply high priority fixes second
- Handle medium/low priority later

**Changes too aggressive:**
- Review proposed changes before approval
- Ask Claude to explain reasoning
- Request more conservative approach

**Skill behavior changed:**
- Review what was removed
- May need to restore some content
- Test with actual usage scenarios

## Best Practices Reference

This command leverages the `cc-skills` meta-skill:

- **SKILL.md** - Core refinement workflow
- **BEST_PRACTICES.md** - Detailed guidelines
- **EXAMPLES.md** - Before/after examples
- **TEMPLATES.md** - Structure patterns

## See Also

- `/rd:skill-add` - Create new skills
- `/rd:skill-evaluate` - Evaluate skill quality
- `plugins/rd/skills/cc-skills/` - Skill best practices
- `plugins/rd/skills/cc-skills/BEST_PRACTICES.md` - Detailed guidelines
