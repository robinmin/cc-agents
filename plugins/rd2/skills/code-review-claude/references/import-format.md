# Import Format Documentation

How the `import` command parses review results and creates tasks.

## Overview

The `import` command converts structured review results into individual task files that can be tracked and executed.

## Command Syntax

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/code-review-claude/scripts/code-review-claude.py import \
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
    "type": "claude-code-review",
    "target": "src/auth/",
    "mode": "review",
    "date": "2026-01-22T15:30:00Z",
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
    identifier="HIGH-001",  # Auto-generated
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
created_from: code-review-claude
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
**Reviewed by**: claude-code-review

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
python3 .../code-review-claude.py import review.md --priority critical

# Only import high priority issues
python3 .../code-review-claude.py import review.md --priority high
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
$ python3 .../code-review-claude.py import nonexistent.md
Error: Review file not found: nonexistent.md
```

### No Issues Found

```bash
$ python3 .../code-review-claude.py import clean-review.md
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

## Import Output

### Success Output

```bash
$ python3 .../code-review-claude.py import review-src.md
Parsing review results from: review-src.md
Found 10 issue(s) to import

[1/10] Creating task for: CRITICAL-001 - SQL Injection
  OK Created: docs/prompts/CRITICAL-001_SQL_Injection_Vulnerability.md

[2/10] Creating task for: CRITICAL-002 - Missing Auth
  OK Created: docs/prompts/CRITICAL-002_Missing_Authentication.md

...

============================================================
Task Import Summary
============================================================
Total issues: 10
Successfully created 10 tasks

All tasks created successfully!
```

### Partial Failure Output

```bash
============================================================
Task Import Summary
============================================================
Total issues: 10
Successfully created 8 tasks
Failed to create 2 tasks

Failed Issues:
- HIGH-003: Task file not found after creation
- MEDIUM-001: Error creating task: File exists
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

# Issue: "Missing error handling"
# Task: MEDIUM-002_Missing_error_handling.md
```

### Sanitization Rules

- Spaces → underscores
- Slashes → hyphens
- Special chars → hyphens
- Max length: 50 characters from title

## Best Practices

### Before Importing

1. **Review the file**: Check for false positives
2. **Adjust priorities**: Ensure correct classification
3. **Verify locations**: Confirm file:line references
4. **Check duplicates**: Avoid duplicate tasks

### After Importing

1. **Review created tasks**: Verify content is accurate
2. **Assign to sprints**: Add to workflow
3. **Set deadlines**: Based on priority
4. **Track progress**: Use kanban board

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

## Examples

### Example 1: Import All Issues

```bash
# Review file with 10 issues
$ python3 .../code-review-claude.py import security-review.md
Parsing review results from: security-review.md
Found 10 issue(s) to import
...
Successfully created 10 tasks
```

### Example 2: Import Only Critical Issues

```bash
# Filter by priority
$ python3 .../code-review-claude.py import security-review.md --priority critical
Parsing review results from: security-review.md
Found 10 issue(s) to import
Filtered to 2 critical priority issue(s)
...
Successfully created 2 tasks
```

### Example 3: Import from Planning Review

```bash
# Architecture planning review
$ python3 .../code-review-claude.py import migration-plan.md
Parsing review results from: migration-plan.md
Found 5 issue(s) to import
...
Successfully created 5 tasks
```

## API Reference

### Functions

#### `parse_yaml_frontmatter(content: str)`

Parses YAML frontmatter from markdown content.

**Returns:** `(metadata: dict, remaining: str)`

#### `extract_issues_from_section(section: str, priority: str)`

Extracts issues from a priority section.

**Returns:** `list[ReviewIssue]`

#### `parse_review_result_file(file_path: Path)`

Parses a complete review result file.

**Returns:** `(metadata: dict, issues: list[ReviewIssue])`

#### `create_task_from_issue(issue: ReviewIssue, metadata: dict)`

Creates a task file from a single issue.

**Returns:** `(success: bool, message: str)`

### Data Structures

#### `ReviewIssue`

```python
@dataclass
class ReviewIssue:
    priority: str              # "critical" | "high" | "medium" | "low"
    identifier: str            # e.g., "CRITICAL-001"
    title: str                 # Issue title
    location: str | None       # e.g., "auth.py:45"
    issue_description: str | None
    impact: str | None
    fix_recommendation: str | None
    raw_content: str | None    # For simple format issues
```
