# Structured Output Format

Code reviews use a structured template that serves as a communication protocol for task generation and further processing.

## Template Structure

```yaml
---
type: auggie-code-review
version: 1.0
target: src/auth/
mode: review
focus_areas: security,performance
quality_score: 8
recommendation: Request Changes
files_reviewed: 5
---
```

## Output Sections

| Section                    | Content                                   |
| -------------------------- | ----------------------------------------- |
| **Executive Summary**      | High-level overview of findings           |
| **Critical Issues**        | Blocking issues that must be resolved     |
| **High Priority Issues**   | Important improvements                    |
| **Medium Priority Issues** | Suggested enhancements                    |
| **Low Priority Issues**    | Optional improvements                     |
| **Detailed Analysis**      | Security, Performance, Quality, Testing   |
| **Overall Assessment**     | Strengths, improvements, next steps        |

## Issue Format

### Structured Format (Recommended)

```markdown
## Critical Issues (Must Fix)

**[CRITICAL-001]** SQL Injection Vulnerability
- **Location**: src/auth/login.py:45
- **Issue**: User input directly concatenated into SQL query
- **Impact**: Allows attackers to execute arbitrary SQL
- **Fix**: Use parameterized queries or ORM
```

### Simple Bullet Format

```markdown
## High Priority Issues (Should Fix)

- Missing input validation on user registration form
- No rate limiting on API endpoints
- Passwords stored without hashing
```

Both formats are supported by the `import` command for task file generation.

## Benefits

- **Machine-readable**: YAML frontmatter for automation
- **Human-readable**: Clear markdown sections
- **Task generation**: Enables `import` command
- **Consistency**: Uniform structure across reviews
- **Parsable**: Easy to process for further analysis

## See Also

- `../assets/code-review-result.md` - Full template file
- `import-format.md` - Import command parsing rules
