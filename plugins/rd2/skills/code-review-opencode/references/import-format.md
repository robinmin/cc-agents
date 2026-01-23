# Import Format Documentation

How the `import` command parses review results and creates tasks.

## Overview

The `import` command converts structured review results into individual task files that can be tracked and executed.

## Command Syntax

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-opencode/scripts/code-review-opencode.py import \
  <review_file> \
  [--priority <critical|high|medium|low>]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `review_file` | ✅ | Path to review result markdown file |
| `--priority` | ❌ | Filter issues by priority level |

## Parsing Logic

### Step 1: Parse YAML Frontmatter

```python
metadata, remaining = parse_yaml_frontmatter(content)

# Extracted fields:
metadata = {
    "type": "opencode-code-review",
    "target": "src/auth/",
    "mode": "review",
    "model": "claude-opus",
    ...
}
```

### Step 2: Extract Issues by Priority

The parser scans content for priority sections:

```python
sections = extract_review_sections(content)

# Priority sections (in order):
1. "Critical Issues (Must Fix)" → priority = "critical"
2. "High Priority Issues (Should Fix)" → priority = "high"
3. "Medium Priority Issues (Consider Fixing)" → priority = "medium"
4. "Low Priority Issues (Nice to Have)" → priority = "low"
```

### Step 3: Parse Individual Issues

#### Structured Format (Preferred)

```markdown
**[CRITICAL-001]** SQL Injection Vulnerability
- **Location**: auth.py:45
- **Issue**: User input directly concatenated
- **Impact**: Allows arbitrary SQL execution
- **Fix**: Use parameterized queries
```

**Parsed as:**
```python
ReviewIssue(
    priority="critical",
    identifier="CRITICAL-001",
    title="SQL Injection Vulnerability",
    location="auth.py:45",
    issue_description="User input directly concatenated",
    impact="Allows arbitrary SQL execution",
    fix_recommendation="Use parameterized queries",
    raw_content=None
)
```

#### Simple Format (Fallback)

```markdown
- Missing input validation on user registration
```

**Parsed as:**
```python
ReviewIssue(
    priority="high",
    identifier="HIGH-001",
    title="Missing input validation on user registration",
    location=None,
    issue_description=None,
    impact=None,
    fix_recommendation=None,
    raw_content="Missing input validation on user registration"
)
```

### Step 4: Create Task Files

For each issue, a task file is created:

```python
task_name = f"{issue.identifier}_{issue.title[:50]}"
task_name = task_name.replace(" ", "_").replace("/", "-")
task_name = "".join(c if c.isalnum() or c in "-_" else "-" for c in task_name)

# Example: CRITICAL-001_SQL_Injection_Vulnerability.md
```

## Task File Format

### Frontmatter

```yaml
---
type: task
priority: critical
created_from: code-review-opencode
issue_id: CRITICAL-001
original_review: review-src.md
---
```

### Background Section

```markdown
# Background

**Issue**: SQL Injection Vulnerability
**Priority**: critical
**ID**: CRITICAL-001
**Location**: auth.py:45
**Review Target**: src/auth/
**Reviewed by**: opencode-code-review (model: claude-opus)

**Issue Description**:
User input directly concatenated into SQL query

**Impact**:
Allows arbitrary SQL execution
```

### Requirements Section

```markdown
# Requirements

**Recommended Fix**:
Use parameterized queries instead of string concatenation.

**Additional Context**:
See review file for detailed analysis.
```

## Filtering by Priority

The `--priority` flag filters which issues to import:

```bash
# Only import critical issues
python3 .../code-review-opencode.py import review.md --priority critical

# Only import high priority issues
python3 .../code-review-opencode.py import review.md --priority high
```

### Filtering Logic

```python
if args.priority:
    priority_filter = args.priority.lower()
    issues = [i for i in issues if i.priority.lower() == priority_filter]
```

## Error Handling

### File Not Found

```bash
$ python3 .../code-review-opencode.py import nonexistent.md
Error: Review file not found: nonexistent.md
```

### No Issues Found

```bash
$ python3 .../code-review-opencode.py import clean-review.md
Parsing review results from: clean-review.md
No issues found in review file.
```

### Task Creation Failure

```bash
[1/5] Creating task for: CRITICAL-001 - SQL Injection
  X Failed: Task creation timeout for: CRITICAL-001_SQL_Injection_Vulnerability

Task Import Summary
============================================================
Total issues: 5
Successfully created 4 tasks
Failed to create 1 task

Failed Issues:
- CRITICAL-001: Task creation timeout
```

## Integration with Tasks CLI

The import command uses the `tasks` CLI under the hood:

```python
subprocess.run(
    ["tasks", "create", task_name],
    capture_output=True,
    text=True,
    timeout=30,
)
```

### Task File Location

Created task files are saved to:
```
docs/prompts/<task_name>.md
```

This integrates with the three-agent workflow system.

## Examples

### Example 1: Import All Issues

```bash
$ python3 .../code-review-opencode.py import security-review.md
Parsing review results from: security-review.md
Found 10 issue(s) to import

[1/10] Creating task for: CRITICAL-001 - SQL Injection
  OK Created: docs/prompts/CRITICAL-001_SQL_Injection.md

...
Successfully created 10 tasks
```

### Example 2: Import Only Critical Issues

```bash
$ python3 .../code-review-opencode.py import security-review.md --priority critical
Parsing review results from: security-review.md
Found 10 issue(s) to import
Filtered to 2 critical priority issue(s)
...
Successfully created 2 tasks
```

## Auto-Generated Identifiers

If issues don't have explicit identifiers (e.g., `[HIGH-001]`), they are auto-generated:

```python
counter = 1
for issue in issues:
    if not issue.identifier:
        priority_upper = issue.priority.upper()
        issue.identifier = f"{priority_upper}-{counter:03d}"
        counter += 1
```

## Task Naming Conventions

### From Title

```python
# Issue: "SQL Injection Vulnerability in Login"
# Task: HIGH-001_SQL_Injection_Vulnerability_in_Login.md

# Issue: "Missing Error Handling"
# Task: MEDIUM-002_Missing_Error_Handling.md
```

### Sanitization Rules

- Spaces → underscores
- Slashes → hyphens
- Special chars → hyphens
- Max length: 50 characters from title

## Troubleshooting

### Issue: Tasks Not Created

**Symptoms**: Import runs but no task files appear

**Causes:**
- `tasks` CLI not installed
- `docs/prompts/` directory not writable
- Task name conflicts

**Solutions:**
```bash
# Check tasks CLI
tasks --version

# Check directory permissions
ls -la docs/prompts/

# Check for existing tasks
ls docs/prompts/ | grep CRITICAL-001
```

### Issue: Wrong Priority

**Symptoms**: Issues imported with wrong priority level

**Causes:**
- Section header format mismatch
- Case sensitivity issues

**Solutions:**
- Use exact section headers from template
- Check spelling: "Critical Issues (Must Fix)"

### Issue: Missing Information

**Symptoms**: Task files missing location or fix info

**Causes:**
- Simple format used instead of structured
- Missing fields in review

**Solutions:**
- Use structured issue format
- Include all required fields
```
