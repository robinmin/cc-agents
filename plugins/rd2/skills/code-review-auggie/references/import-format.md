# Import Command Format Reference

Detailed documentation for the `import` command parsing rules and format specifications.

## Overview

The `import` command converts structured code review result files into individual task files for tracking follow-up actions. It parses YAML frontmatter and markdown sections to extract issues at different priority levels.

---

## File Format Requirements

### Required File Structure

```markdown
---
type: auggie-code-review
target: src/auth/
quality_score: 8
recommendation: Request Changes
---

# Code Review Result

## Critical Issues (Must Fix)
[Issues here]

## High Priority Issues (Should Fix)
[Issues here]

## Medium Priority Issues (Consider Fixing)
[Issues here]

## Low Priority Issues (Nice to Have)
[Issues here]
```

### Minimum Requirements

1. **YAML Frontmatter** (optional but recommended):
   - Must start with `---` and end with `---`
   - Contains metadata about the review
   - Used to populate task file background

2. **Priority Sections** (at least one required):
   - Must use exact section headers (see below)
   - Can have issues in structured or simple format
   - Empty sections are ignored

---

## YAML Frontmatter Fields

### Supported Metadata Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `type` | string | No | Review type identifier | `auggie-code-review` |
| `target` | string | No | Target reviewed | `src/auth/` |
| `mode` | string | No | Review mode | `review` or `planning` |
| `quality_score` | int | No | Quality score (0-10) | `8` |
| `recommendation` | string | No | Review recommendation | `Request Changes` |
| `files_reviewed` | int | No | Number of files | `5` |
| `focus_areas` | string | No | Focus areas | `security,performance` |

### Example Frontmatter

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
generated: 2024-01-22T10:30:00
---
```

---

## Priority Section Headers

### Exact Headers (Case-Sensitive)

The parser looks for these exact headers:

```markdown
## Critical Issues (Must Fix)
## High Priority Issues (Should Fix)
## Medium Priority Issues (Consider Fixing)
## Low Priority Issues (Nice to Have)
```

**Important:**
- Headers must be H2 level (`##`)
- Text must match exactly (including parentheses)
- Case-sensitive matching
- Alternative headers are NOT supported

---

## Issue Formats

The parser supports two issue formats within each priority section.

### Format 1: Structured Format (Recommended)

**Best for:** Detailed issues with multiple fields

```markdown
## Critical Issues (Must Fix)

**[CRITICAL-001]** SQL Injection Vulnerability

- **Location**: src/auth/login.py:45
- **Issue**: User input directly concatenated into SQL query
- **Impact**: Allows attackers to execute arbitrary SQL
- **Fix**: Use parameterized queries or ORM

**[CRITICAL-002]** Authentication Bypass

- **Location**: src/auth/middleware.py:23
- **Issue**: JWT signature not verified
- **Impact**: Unauthorized access to protected resources
- **Fix**: Enable signature verification in JWT library
```

**Parsing Rules:**
1. **Identifier Line**: `**[IDENTIFIER]** Title`
   - Identifier: Extracted from `[CRITICAL-001]`
   - Title: Everything after `]** `

2. **Field Lines**: `- **FieldName**: Value`
   - Supported fields: `Location`, `Issue`, `Impact`, `Fix`
   - Field names are case-insensitive
   - Values: Everything after `: `

3. **Continuation Lines**: Additional text between issues
   - Added to `raw_content` field

### Format 2: Simple Bullet Format

**Best for:** Quick lists, less detailed issues

```markdown
## High Priority Issues (Should Fix)

- Missing input validation on user registration form
- No rate limiting on API endpoints
- Passwords stored without hashing
- Session tokens have infinite lifetime
```

**Parsing Rules:**
1. Each bullet point becomes a separate issue
2. Auto-generated identifier: `{PRIORITY}-{NUMBER}` (e.g., `HIGH-001`)
3. Title: Full bullet point text (truncated to 100 chars)
4. No location or detailed fields
5. Full text stored in `raw_content`

---

## Field Mapping

### Structured Format Field Mapping

When an issue is parsed, it's converted to a `ReviewIssue` object:

| Markdown Field | ReviewIssue Field | Task File Section | Notes |
|----------------|-------------------|-------------------|-------|
| `[CRITICAL-001]` | `identifier` | Background: **ID** | Unique identifier |
| Title text | `title` | Background: **Issue** | Issue name |
| `**Location**` | `location` | Background: **Location** | File:line reference |
| `**Issue**` | `issue_description` | Background: **Issue Description** | What's wrong |
| `**Impact**` | `impact` | Background: **Impact** | Consequences |
| `**Fix**` | `fix_recommendation` | Requirements: **Recommended Fix** | Solution |
| Priority section | `priority` | Background: **Priority** | critical/high/medium/low |

### Simple Format Field Mapping

| Bullet Point | ReviewIssue Field | Task File Section | Notes |
|--------------|-------------------|-------------------|-------|
| Auto-generated | `identifier` | Background: **ID** | {PRIORITY}-{NUM} |
| Bullet text | `title` | Background: **Issue** | Truncated to 100 chars |
| Bullet text | `raw_content` | Requirements: **Additional Context** | Full text |
| Priority section | `priority` | Background: **Priority** | From section |

---

## Task File Generation

### Task File Structure

For each issue, a task file is created with this structure:

```markdown
---
wbs: 0001
stage: backlog
---

# Background

**Issue**: {title}
**Priority**: {priority}
**ID**: {identifier}
**Location**: {location}
**Review Target**: {metadata.target}

**Issue Description**:
{issue_description}

**Impact**:
{impact}

# Requirements

**Recommended Fix**:
{fix_recommendation}

**Additional Context**:
{raw_content}

# Solutions

# References
```

### Task File Naming

Task files are named: `{WBS}_{identifier}_{title}.md`

**Example:**
- Identifier: `CRITICAL-001`
- Title: `SQL Injection Vulnerability`
- Generated name: `0001_CRITICAL-001_SQL_Injection_Vulnerability.md`

**Sanitization:**
- Spaces → underscores
- Special chars (`/\:*?"<>|`) → hyphens
- Title truncated to 50 characters

---

## Priority Filtering

### Command Usage

```bash
# Import all priorities
python3 code-review-auggie.py import review.md

# Import only critical
python3 code-review-auggie.py import review.md --priority critical

# Import only high
python3 code-review-auggie.py import review.md --priority high
```

### Filtering Rules

| Priority Flag | Matches | Example Identifiers |
|---------------|---------|---------------------|
| `critical` | Critical Issues section | CRITICAL-001, CRITICAL-002 |
| `high` | High Priority Issues section | HIGH-001, HIGH-002 |
| `medium` | Medium Priority Issues section | MEDIUM-001, MEDIUM-002 |
| `low` | Low Priority Issues section | LOW-001, LOW-002 |
| (none) | All sections | All issues |

**Case-Insensitive:** `--priority CRITICAL` same as `--priority critical`

---

## Parsing Examples

### Example 1: Mixed Format Review

**Input File:**
```markdown
---
target: src/auth/
---

## Critical Issues (Must Fix)

**[CRITICAL-001]** SQL Injection
- **Location**: auth.py:45
- **Fix**: Use parameterized queries

## High Priority Issues (Should Fix)

- Missing rate limiting
- No input validation
- Weak password policy
```

**Output:**
- 3 task files created:
  1. `0001_CRITICAL-001_SQL_Injection.md` (structured)
  2. `0002_HIGH-001_Missing_rate_limiting.md` (simple)
  3. `0003_HIGH-002_No_input_validation.md` (simple)

### Example 2: Structured Only

**Input File:**
```markdown
---
type: auggie-code-review
---

## Critical Issues (Must Fix)

**[SEC-001]** XSS Vulnerability
- **Location**: templates/user.html:23
- **Issue**: User input rendered without escaping
- **Impact**: Attackers can execute arbitrary JavaScript
- **Fix**: Use template auto-escaping or manual escaping

**[SEC-002]** CSRF Missing
- **Location**: views/profile.py:45
- **Issue**: No CSRF token validation
- **Impact**: Unauthorized actions on behalf of users
- **Fix**: Add CSRF middleware and tokens
```

**Output:**
- 2 task files with detailed background and requirements

### Example 3: Simple Bullets Only

**Input File:**
```markdown
## Low Priority Issues (Nice to Have)

- Add type hints to utility functions
- Improve error messages
- Add docstrings to public methods
- Consider using dataclasses
```

**Output:**
- 4 task files with auto-generated IDs (LOW-001 through LOW-004)

---

## Parsing Algorithm

### Step-by-Step Process

1. **Read File**
   ```python
   content = file_path.read_text()
   ```

2. **Parse YAML Frontmatter**
   ```python
   metadata, body = parse_yaml_frontmatter(content)
   ```

3. **Find Priority Sections**
   - Search for `## {Priority} Issues ({Description})`
   - Extract content between sections
   - Store in section dictionary

4. **Extract Issues from Each Section**
   ```python
   for section_name, priority in sections:
       issues = extract_issues_from_section(section_content, priority)
       all_issues.extend(issues)
   ```

5. **Parse Individual Issues**
   - Detect format (structured vs simple)
   - Extract fields based on format
   - Build `ReviewIssue` object

6. **Create Task Files**
   ```python
   for issue in issues:
       success, message = create_task_from_issue(issue, metadata)
   ```

---

## Error Handling

### Common Parsing Errors

| Error | Cause | Solution |
|-------|-------|----------|
| No issues found | No priority sections | Add at least one priority section |
| Invalid frontmatter | Malformed YAML | Check YAML syntax with `---` delimiters |
| Task creation failed | `tasks` CLI not available | Install tasks CLI or check PATH |
| File not found | Wrong path | Verify file path exists |
| Permission denied | No write access | Check directory permissions |

### Validation Checks

Before parsing:
- ✅ File exists and readable
- ✅ File contains at least one priority section
- ✅ YAML frontmatter (if present) is valid

During parsing:
- ✅ Section headers match expected format
- ✅ Issue format is recognized (structured or simple)
- ✅ Task file naming is valid

After parsing:
- ✅ At least one issue extracted
- ✅ Task files created successfully
- ✅ Task files updated with content

---

## Best Practices

### For Review File Authors

1. **Use Structured Format** for important issues:
   ```markdown
   **[CRITICAL-001]** Clear Title
   - **Location**: file.py:123
   - **Issue**: What's wrong
   - **Impact**: Why it matters
   - **Fix**: How to fix
   ```

2. **Use Simple Format** for quick lists:
   ```markdown
   - Quick issue 1
   - Quick issue 2
   ```

3. **Include YAML Frontmatter** for context:
   ```yaml
   ---
   type: auggie-code-review
   target: src/auth/
   ---
   ```

4. **Use Exact Section Headers**:
   - Don't modify section header text
   - Keep parenthetical descriptions
   - Use H2 level (`##`)

### For Import Command Users

1. **Start with Critical Only**:
   ```bash
   python3 code-review-auggie.py import review.md --priority critical
   ```

2. **Review Task Files** before marking complete:
   ```bash
   tasks list backlog
   cat docs/prompts/0001_*.md
   ```

3. **Update Task Stages** as you work:
   ```bash
   tasks update 0001 wip
   tasks update 0001 done
   ```

4. **Verify Before Importing All**:
   - Check review file format
   - Test with `--priority critical` first
   - Confirm task files look correct

---

## Technical Details

### Data Structures

**ReviewIssue NamedTuple:**
```python
class ReviewIssue(NamedTuple):
    priority: str              # critical, high, medium, low
    identifier: str            # e.g., CRITICAL-001
    title: str                 # Issue title
    location: str | None       # e.g., file.py:45
    issue_description: str | None
    impact: str | None
    fix_recommendation: str | None
    raw_content: str | None
```

### Regular Expressions

**Structured Issue Identifier:**
```python
pattern = r'\*\*\[([^\]]+)\]\*\*\s*(.+)'
# Matches: **[CRITICAL-001]** Title text
```

**Field Lines:**
```python
pattern = r'-\s*\*\*([^:]+)\*\*:\s*(.+)'
# Matches: - **Location**: src/auth/login.py:45
```

**Simple Bullet:**
```python
pattern = r'-\s+(.+)'
# Matches: - Any text here
```

---

## See Also

- `../SKILL.md` - Main skill documentation
- `usage-examples.md` - Comprehensive usage examples
- `auggie-query-patterns.md` - Auggie query patterns
- `../assets/code-review-result.md` - Output template
