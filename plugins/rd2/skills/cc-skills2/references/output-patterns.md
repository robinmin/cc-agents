# Output Patterns

Use these patterns when skills need to produce consistent, high-quality output.

## Template Pattern

Provide templates for output format. Match the level of strictness to your needs.

**For strict requirements (like API responses or data formats):**

```markdown
## Report structure

ALWAYS use this exact template structure:

# [Analysis Title]

## Executive summary
[One-paragraph overview of key findings]

## Key findings
- Finding 1 with supporting data
- Finding 2 with supporting data
- Finding 3 with supporting data

## Recommendations
1. Specific actionable recommendation
2. Specific actionable recommendation
```

**For flexible guidance (when adaptation is useful):**

```markdown
## Report structure

Here is a sensible default format, but use your best judgment:

# [Analysis Title]

## Executive summary
[Overview]

## Key findings
[Adapt sections based on what you discover]

## Recommendations
[Tailor to the specific context]

Adjust sections as needed for the specific analysis type.
```

## Examples Pattern

For skills where output quality depends on seeing examples, provide input/output pairs:

```markdown
## Commit message format

Generate commit messages following these examples:

**Example 1:**
Input: Added user authentication with JWT tokens
Output:
```
feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware
```

**Example 2:**
Input: Fixed bug where dates displayed incorrectly in reports
Output:
```
fix(reports): correct date formatting in timezone conversion

Use UTC timestamps consistently across report generation
```

Follow this style: type(scope): brief description, then detailed explanation.
```

Examples help Claude understand the desired style and level of detail more clearly than descriptions alone.

## Checklist Pattern

For workflow validation with recovery actions:

```markdown
## [Phase Name] Checklist

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

If any fail:
1. [Recovery action]
2. Return to [previous step]
```

## Anti-Pattern Format

Show what NOT to do alongside correct approach:

```markdown
## Anti-Pattern: [Name]

**Bad:**
```
[Wrong approach]
```

**Problem:** [Why it's wrong]

**Good:**
```
[Correct approach]
```
```

## Decision Tree Pattern

For conditional workflows:

```markdown
## Determine Approach

1. Is [condition A]?
   - Yes → Follow [Workflow A]
   - No → Continue

2. Is [condition B]?
   - Yes → Follow [Workflow B]
   - No → Follow [Default Workflow]
```

## Reference Table Pattern

For configuration or option documentation:

```markdown
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| opt1   | str  | "x"     | [Purpose] |
| opt2   | int  | 10      | [Purpose] |
```

## Analysis Report Pattern

For investigation/review skills:

```markdown
# [Subject] Analysis

**Date:** [Date]
**Scope:** [What was analyzed]

## Summary
[1-2 paragraphs]

## Findings

### Critical
- [Issue with file/line reference]

### High Priority
- [Issue]

### Low Priority
- [Suggestion]

## Recommendations
1. **Immediate:** [Action]
2. **Short-term:** [Action]
3. **Long-term:** [Action]
```
