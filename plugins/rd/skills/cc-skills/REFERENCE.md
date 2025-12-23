# Agent Skills Technical Reference

Technical specifications for the Claude Code Agent Skills format.

## File Format Specification

### SKILL.md Structure

Every skill must have a `SKILL.md` file with the following structure:

```markdown
---
name: skill-name
description: What this skill does and when to use it
---

# Skill Title

[Content body]
```

### YAML Frontmatter Specification

| Field | Type | Constraints | Required | Description |
|-------|------|-------------|----------|-------------|
| `name` | string | Max 64 chars, lowercase/a-z0-9/- only | Yes | Skill identifier |
| `description` | string | Max 1024 chars, non-empty | Yes | What it does + when to use it |

**Name Rules:**
- Must start with a letter
- Only lowercase letters, numbers, hyphens
- No spaces or underscores
- Cannot contain "anthropic" or "claude"

**Description Rules:**
- Must be non-empty
- No XML tags allowed
- Should include BOTH what it does AND when to use it
- Max 1024 characters

### Valid Examples

```yaml
---
name: python-security-review
description: Identifies SQL injection, XSS, and authentication vulnerabilities in Python code. Use when reviewing Python pull requests or preparing code for production security.
---
```

```yaml
---
name: react-component-builder
description: Creates React components with TypeScript, Tailwind CSS, and proper hooks patterns. Use when generating new UI components or refactoring class components to functions.
---
```

### Invalid Examples

```yaml
# ❌ Too vague
---
name: helper
description: Helps with code
---
```

```yaml
# ❌ Missing "when to use"
---
name: python-formatter
description: Formats Python code according to PEP 8
---
```

```yaml
# ❌ Invalid name (uppercase)
---
name: PythonSecurity
description: Reviews Python code for security issues
---
```

## Directory Structure

### Minimum Structure

```
skill-name/
└── SKILL.md
```

### Recommended Structure

```
skill-name/
├── SKILL.md              # Required: Main entry point
├── GETTING_STARTED.md    # Optional: Tutorials
├── BEST_PRACTICES.md     # Optional: How-to guides
├── EXAMPLES.md           # Optional: Concrete examples
├── CONCEPTS.md           # Optional: Explanations
├── REFERENCE.md          # Optional: Technical specs
├── PATTERNS.md           # Optional: Domain patterns
├── TEMPLATES.md          # Optional: Starter templates
└── scripts/              # Optional: Executable utilities
    └── script.py
```

### Installation Locations

| Location | Scope | Path |
|----------|-------|------|
| Global | All projects | `~/.claude/skills/` |
| Project | Single project | `.claude/skills/` |
| Plugin | Shareable package | `plugins/organization/skill-name/` |

## Content Loading Behavior

### Level 1: Metadata (Always Loaded)

- YAML frontmatter from every skill
- Loaded at Claude startup
- Used for skill discovery and triggering
- ~100 tokens per skill

**When Loaded:** Immediately when Claude Code starts

**Purpose:** Claude decides which skills are relevant to the current task

### Level 2: Instructions (When Triggered)

- Full SKILL.md body content
- Loaded when skill is triggered by task relevance
- Recommended: under 5,000 tokens
- Used for procedural knowledge and workflows

**When Loaded:** After Claude determines skill is relevant to current task

**Purpose:** Provides main instructions for the task

### Level 3: Resources (As Needed)

- Additional markdown files referenced from SKILL.md
- Scripts in `scripts/` directory
- Loaded only when specifically referenced
- Can be arbitrarily large

**When Loaded:** When Claude encounters a reference like `See PATTERNS.md for details`

**Purpose:** Provides detailed information without bloating main context

## File Reference Patterns

### Correct References

```markdown
# Direct reference (one level deep)
See PATTERNS.md for comprehensive pattern catalog
See EXAMPLES.md for complete input/output examples

# Script execution
Run `scripts/validator.sh` to check for issues

# Conditional reference
For advanced configurations, see ADVANCED.md
```

### Incorrect References

```markdown
# ❌ Nested references (two levels deep)
# SKILL.md → PATTERNS.md → ADVANCED.md
# Claude may not fully read ADVANCED.md

# ❌ Windows-style paths
See reference\guide.md

# ❌ Absolute paths
See /home/user/skills/reference/guide.md
```

## Script Execution

### Script Guidelines

Scripts in the `scripts/` directory are executed via Bash without loading code into context.

### Execution Intent

**For Execution:**
```markdown
Run `scripts/validator.sh` to perform validation checks
```

**For Reference:**
```markdown
See `scripts/example.py` for implementation patterns
```

### Error Handling

```bash
#!/bin/bash
set -e

# Explicit error messages
if [ ! -f "$FILE" ]; then
    echo "ERROR: File not found: $FILE"
    echo "Please check the path and try again."
    exit 1
fi
```

### Script Best Practices

| Practice | Description |
|----------|-------------|
| `set -e` | Exit on error |
| Explicit messages | Clear error output |
| Exit codes | 0 for success, non-zero for failure |
| No external calls | No network access or APIs |
| No runtime installs | Use only pre-installed packages |

## Skill Activation

### How Claude Determines Relevance

Claude uses the following signals to determine when to load a skill:

1. **Name keywords** - Domain-specific terms
2. **Description keywords** - "when to use" conditions
3. **Task context** - Current conversation context
4. **File types** - Related file extensions in project

### Activation Example

Given skill with:
```yaml
name: python-security-review
description: Identifies SQL injection in Python code. Use when reviewing Python database queries.
```

**Triggers activation:**
- "Review this Python code for security issues"
- "Check for SQL injection in my Django app"
- File contains: `models.py`, `views.py`

**Does NOT trigger:**
- "Review this JavaScript code"
- "Format my Python code"
- "How do I write a for loop?"

### Improving Activation

If skill doesn't trigger reliably:

1. **Add more specific keywords to description**
```yaml
description: Identifies SQL injection, XSS, CSRF, and authentication vulnerabilities in Python, Django, Flask, and FastAPI code.
```

2. **Include domain-specific terms**
```yaml
name: orm-security-review
description: Reviews Django ORM, SQLAlchemy, and Peewee queries for SQL injection vulnerabilities including raw(), execute(), and raw_sql() methods.
```

3. **Use explicit trigger phrases**
```markdown
## When to Use
When you hear phrases like:
- "security review"
- "SQL injection"
- "check for vulnerabilities"
- "production readiness check"
```

## Token Limits and Guidelines

### SKILL.md Token Limits

| Metric | Limit | Rationale |
|--------|-------|-----------|
| Lines | 500 | Maintainability and readability |
| Tokens | 5,000 | Balance detail with load time |
| Sections | ~20 | Organizational clarity |

### When to Split Content

Split SKILL.md into multiple files when:

- Content exceeds 500 lines
- Specific topics are rarely used together
- Different audiences need different content
- Token count approaches 5,000

### Token Counting

Quick estimation:
- 1 line ≈ 10-15 tokens
- 1 code block (20 lines) ≈ 300 tokens
- 1 table (10 rows) ≈ 200 tokens

## Context Window Considerations

### Context Rot

As more tokens are loaded, the model's ability to recall information from early context decreases.

**Mitigation Strategies:**
1. Progressive disclosure (load only what's needed)
2. External state files (NOTES.md for persistence)
3. Compaction points (summarize and reset context)

### Long-Horizon Tasks

For tasks spanning context windows:

```bash
# Create progress tracking
echo "# Task Progress" > PROGRESS.md
echo "- [x] Step 1 complete" >> PROGRESS.md

# After context reset
cat PROGRESS.md  # Resume from checkpoint
```

## Integration with Other Claude Code Features

### Skills and Commands

```bash
# Command can trigger skill
/my-command "review code"

# Command uses skill's domain knowledge
# Skill provides expertise, command orchestrates
```

### Skills and MCP

```
┌─────────────────────────────────────────┐
│                 Skill                   │
│  (Workflow orchestration, domain logic)  │
└────────────┬────────────────────────────┘
             │
             │ Invokes
             ▼
┌─────────────────────────────────────────┐
│           MCP Server                     │
│   (External tool access, data sources)   │
└─────────────────────────────────────────┘
```

### Skills and Hooks

Skills can define hook behaviors:

```markdown
## Session Start Behavior

When a new session starts:
1. Check for project-specific configuration
2. Load project context if available
3. Initialize workspace state
```

## Security Considerations

### Skill Security Model

| Aspect | Constraint | Rationale |
|--------|-----------|-----------|
| Network access | None | Prevent data exfiltration |
| Filesystem access | Project directory only | Sandbox isolation |
| Package installation | None | Environment stability |
| Subprocess execution | Scripts only | Explicit approval |

### Auditing Skills

Before installing a skill:

```bash
# Review all files
find skill-name -type f -exec echo "=== {} ===" \; -exec cat {} \;

# Check for suspicious patterns
grep -r "requests\|urllib\|subprocess\|eval" skill-name/

# Verify no obfuscated code
grep -r "base64\|exec\|compile" skill-name/
```

### Best Practices

- ✓ Install skills from trusted sources only
- ✓ Review all code before use
- ✓ Check for hardcoded credentials
- ✓ Verify script dependencies
- ✗ Never install unreviewed skills
- ✗ Never run skills from unknown sources

## Version Compatibility

### Claude Code Version Requirements

| Feature | Minimum Version | Notes |
|---------|-----------------|-------|
| YAML frontmatter | 1.0 | All versions |
| Progressive disclosure | 1.2 | Always supported |
| Script execution | 1.0 | All versions |
| MCP integration | 1.5 | Requires Claude Code 1.5+ |

### Backward Compatibility

Skills created with older specifications continue to work:

- SKILL.md format unchanged since initial release
- Additional files are optional
- Scripts remain compatible

### New Features (2025)

| Feature | Version | Description |
|---------|---------|-------------|
| XML-tagged sections | 2025 | Improved prompt structure |
| Diátaxis alignment | 2025 | Documentation organization |
| Evaluation-first | 2025 | Development methodology |
| MCP integration patterns | 2025 | External tool orchestration |

## Troubleshooting

### Skill Not Triggering

**Symptom:** Claude ignores the skill

**Diagnostic Steps:**
1. Verify YAML frontmatter is valid
2. Check description includes "when to use"
3. Add domain-specific keywords to description
4. Test with explicit trigger: "Using [skill-name], ..."

### Content Not Being Read

**Symptom:** Referenced file not loaded

**Diagnostic Steps:**
1. Verify reference is one level deep from SKILL.md
2. Check file path uses forward slashes
3. Confirm file exists in skill directory
4. Test direct access: "Read PATTERNS.md"

### Script Failing

**Symptom:** Script returns error

**Diagnostic Steps:**
1. Check script has execute permission: `chmod +x scripts/script.sh`
2. Verify shebang line: `#!/bin/bash` or `#!/usr/bin/env python3`
3. Test script directly: `./scripts/script.sh`
4. Check error messages in output

---

**See also:**
- CONCEPTS.md for understanding the principles
- GETTING_STARTED.md for hands-on tutorials
- BEST_PRACTICES.md for writing guidelines
- EVALUATION.md for testing frameworks
- SECURITY.md for security guidelines
