# Getting Started with Agent Skills

Hands-on tutorials for creating your first Claude Code Agent Skill.

## Tutorial 1: Create Your First Skill in 10 Minutes

This tutorial teaches you the basics by creating a simple skill.

### What You'll Build

A skill that helps Claude write better commit messages following conventional commits format.

### Prerequisites

- Claude Code installed and configured
- Basic familiarity with markdown
- 10 minutes

---

### Step 1: Create the Skill Directory

```bash
mkdir -p ~/.claude/skills/commits
cd ~/.claude/skills/commits
```

### Step 2: Create SKILL.md

Create `SKILL.md` with this content:

```markdown
---
name: conventional-commits
description: Formats git commit messages following conventional commits specification. Use when creating git commits or reviewing commit history.
---

# Conventional Commits Skill

Helps write clear, consistent commit messages.

## Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

## Examples

Good commit messages:
```
feat(auth): add OAuth2 login support

Implements OAuth2 authentication flow using Google provider.

- Added login button to navbar
- Implemented callback handler
- Stores user session in localStorage

Closes #123
```

```
fix(api): resolve race condition in user creation

Fixed timing issue where duplicate users could be created
when multiple requests were sent simultaneously.
```

Bad commit messages:
```
fix
update stuff
wip
done
```

## Workflow

1. Identify the type of change
2. Add scope if applicable (e.g., "auth", "api", "ui")
3. Write a clear description in imperative mood
4. Add body for significant changes
5. Reference issues in footer
```

### Step 3: Test Your Skill

Start a new Claude Code session:

```bash
cd my-project
claude
```

Try it out:

```
You: I just fixed a bug in the login form where the password field
     wasn't being validated. Help me write a commit message.

Claude: Here's a conventional commit message for your fix:

        fix(auth): add password validation to login form

        The password field now validates minimum length and special
        character requirements before form submission.

        Fixes login issue reported in #42
```

### Step 4: Refine Based on Results

If Claude doesn't trigger the skill or misses something:

1. Note what Claude struggles with
2. Add specific content addressing that gap
3. Test again

**Example refinement:**

If Claude misses scope suggestions:

```markdown
## Suggesting Scopes

Common scopes:
- **auth**: Authentication, authorization
- **api**: API endpoints, routes
- **ui**: Frontend components, styling
- **db**: Database, migrations
- **config**: Configuration files

When the change affects a specific area, always include the scope.
```

---

## Tutorial 2: Evaluation-First Skill Development

Learn the 2025 best practice: test first, then write.

### Scenario

You want to create a skill that helps Claude identify security vulnerabilities in Python code.

### Step 1: Test Without Skill

First, see what Claude misses:

```python
# Prompt Claude:
"""
Review this Python code for security vulnerabilities:

def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return db.execute(query).fetchone()
"""
```

**Document what Claude misses:**
- ❌ Didn't identify SQL injection in f-string
- ❌ Didn't suggest parameterized queries
- ✓ Identified the function returns user data

### Step 2: Write Targeted Content

Create SKILL.md addressing ONLY the gaps:

```markdown
---
name: python-security
description: Identifies security vulnerabilities in Python code. Use when reviewing Python code for production deployment.
---

# Python Security Review

## SQL Injection Patterns

Claude often misses these patterns:

### F-String Interpolation
```python
# VULNERABLE
query = f"SELECT * FROM users WHERE id = {user_id}"

# SECURE
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))
```

### .format() Method
```python
# VULNERABLE
query = "SELECT * FROM users WHERE name = '{}'".format(name)

# SECURE
query = "SELECT * FROM users WHERE name = %s"
cursor.execute(query, (name,))
```

### String Concatenation
```python
# VULNERABLE
query = "SELECT * FROM users WHERE id = " + user_id

# SECURE
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```
```

### Step 3: Retest and Iterate

```python
# Test again with the same code
"""
Review this Python code for security vulnerabilities:

def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return db.execute(query).fetchone()
"""
```

**Result:** ✓ Now identifies SQL injection and suggests fix

### Step 4: Expand to Other Patterns

Test additional scenarios:

```python
# XSS Test
def render_comment(comment):
    return f"<div>{comment}</div>"

# Command Injection Test
def run_command(filename):
    os.system("cat " + filename)
```

Document new gaps, add content, retest.

---

## Tutorial 3: Progressive Disclosure with Multiple Files

Learn to organize skills with multiple files for efficiency.

### The Problem

A single SKILL.md with 10,000 tokens of content:
- Takes too long to load
- Contains information only sometimes needed
- Wastes attention budget

### The Solution: Progressive Disclosure

```
skill-name/
├── SKILL.md              # Core workflow (~3k tokens)
├── PATTERNS.md           # Detailed patterns (~5k tokens)
├── EXAMPLES.md           # Concrete examples (~3k tokens)
└── scripts/
    └── validator.sh      # Automation tool
```

### Step 1: Create SKILL.md (Core)

```markdown
---
name: code-review
description: Performs comprehensive code reviews for Python projects. Use when reviewing pull requests or preparing code for production.
---

# Code Review Skill

Systematic approach to reviewing Python code.

## Workflow

1. **Run automated checks**
   ```bash
   python scripts/validator.sh
   ```

2. **Review by category**
   - Security vulnerabilities (see PATTERNS.md)
   - Code quality issues
   - Performance concerns

3. **Generate report** (see EXAMPLES.md for format)

## Quick Checklist

- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Input validation on all user inputs
- [ ] Error handling for edge cases
- [ ] Tests cover critical paths
```

### Step 2: Create PATTERNS.md (Details)

```markdown
# Code Review Patterns

Detailed vulnerability patterns for comprehensive reviews.

## SQL Injection Patterns

[Comprehensive list of patterns...]

## XSS Patterns

[Comprehensive list of patterns...]

## Authentication Issues

[Comprehensive list of patterns...]
```

### Step 3: Create EXAMPLES.md (Concrete)

```markdown
# Code Review Examples

Complete input/output examples.

## Example 1: SQL Injection Review

**Input Code:**
```python
[code here]
```

**Review Output:**
```markdown
## Code Review Summary

**Risk Level:** High

### Critical Issues
- line 5: SQL injection vulnerability in f-string query

### Recommendations
- Use parameterized queries with %s placeholders
- Add input validation for user_id

[Full output example]
```
```

### Step 4: Test Progressive Disclosure

```bash
# Trigger skill
"Review my code for security issues"

# Claude loads SKILL.md (3k tokens)
# Runs validator.sh script
# Reads PATTERNS.md only when specific questions arise
# Reads EXAMPLES.md only when generating final report
```

**Benefit:** Main interaction uses only ~3k tokens, additional ~8k tokens loaded only when needed.

---

## Tutorial 4: Adding Scripts to Skills

Scripts provide deterministic operations that Claude can execute.

### When to Use Scripts

| Use Script When | Why |
|-----------------|-----|
| Operation requires exact sequence | Deterministic, repeatable |
| Complex validation logic | Handles edge cases |
| Performance-critical operation | Faster than token generation |
| Need error handling | Graceful failure messages |

### Example: Validator Script

Create `scripts/validator.sh`:

```bash
#!/bin/bash
# Python project validator
# Checks for common issues before code review

set -e

echo "Running validation checks..."

# Check for security issues
echo "→ Checking for security vulnerabilities..."
if grep -r "eval(" src/ 2>/dev/null; then
    echo "⚠️  WARNING: eval() found in code"
fi

if grep -r "execute(" src/ 2>/dev/null | grep -v "%s\|%d"; then
    echo "⚠️  WARNING: Possible SQL injection"
fi

# Check for tests
echo "→ Checking test coverage..."
if [ ! -d "tests/" ]; then
    echo "⚠️  WARNING: No tests directory found"
fi

# Check for requirements
echo "→ Checking dependencies..."
if [ -f "requirements.txt" ]; then
    echo "✓ requirements.txt found"
else
    echo "⚠️  WARNING: No requirements.txt"
fi

echo "✓ Validation complete"
```

### Reference Script in SKILL.md

```markdown
## Automated Validation

Run the validator script:

```bash
bash scripts/validator.sh
```

This checks for:
- Security vulnerabilities (eval, SQL injection)
- Test coverage
- Required files

**Note:** Execute this script, don't read it as reference.
```

### Script Best Practices

```bash
#!/bin/bash
# Always include set -e for error handling
set -e

# Provide clear output
echo "→ Running check..."

# Explicit error messages
if [ ! -f "$FILE" ]; then
    echo "ERROR: File not found: $FILE"
    echo "Please check the file path and try again."
    exit 1
fi

# Use clear, human-readable messages
echo "✓ Check passed"
echo "⚠️  Warning: potential issue found"
```

---

## Tutorial 5: Debugging a Skill That Doesn't Trigger

Your skill isn't being used. Here's how to fix it.

### Symptom

Claude ignores your skill and uses generic knowledge instead.

### Diagnosis Steps

**Step 1: Check YAML Frontmatter**

```yaml
---
name: my-skill              # ✓ Lowercase, hyphens
description: Does X. Use when Y.  # ✓ Includes when to use
---
```

**Common Issues:**
- ❌ Name too vague: `helper`, `utils`
- ❌ Description missing "when to use"
- ❌ Name contains uppercase: `MySkill`

**Fix:**
```yaml
---
name: python-sql-review     # ✓ Specific
description: Reviews Python code for SQL injection. Use when reviewing Python database queries.
---
```

**Step 2: Test Activation**

```bash
# Try explicit trigger
"Using the python-sql-review skill, check this code: [code]"

# Try natural trigger
"Review this Python database query for SQL injection: [code]"
```

**Step 3: Add Explicit Keywords**

If still not triggering:

```markdown
---
name: python-sql-review
description: Reviews Python code for SQL injection vulnerabilities including f-strings, format(), and raw() methods. Use when reviewing Python database queries, ORMs like Django raw(), or SQLAlchemy execute().
---
```

**Step 4: Verify File Location**

```bash
# Skill must be in skills directory
ls ~/.claude/skills/python-sql-review/SKILL.md

# Or project-specific skills
ls .claude/skills/python-sql-review/SKILL.md
```

### Quick Troubleshooting Checklist

- [ ] YAML frontmatter is valid (no syntax errors)
- [ ] Name is specific and descriptive
- [ ] Description includes "when to use"
- [ ] File is in correct directory
- [ ] File is named SKILL.md (uppercase)
- [ ] Description contains relevant keywords

---

## Tutorial 6: Migrating Old Content to 2025 Patterns

Update existing skills to use modern patterns.

### Old Pattern (Pre-2025)

```markdown
---
name: code-review
description: Helps with code review
---

# Code Review

## What is Code Review?

Code review is the process of examining code...

[10,000 words of general information]
```

**Problems:**
- Vague description
- Content Claude already knows
- Wastes tokens on basics
- No progressive disclosure

### New Pattern (2025)

```markdown
---
name: python-security-review
description: Identifies SQL injection, XSS, and authentication vulnerabilities in Python code. Use when reviewing Python pull requests or preparing code for production security.
---

# Python Security Review

## SQL Injection Patterns Claude Misses

### F-String Queries
[Specific pattern Claude struggles with]

### ORM Raw Methods
[Specific pattern Claude struggles with]

See PATTERNS.md for comprehensive vulnerability catalog.
```

**Improvements:**
- Specific, keyword-rich description
- Addresses observed gaps only
- Progressive disclosure with PATTERNS.md
- ~3k tokens vs ~10k tokens

---

## Next Steps

After completing these tutorials:

1. **Create your own skill** using the templates in TEMPLATES.md
2. **Evaluate systematically** using the framework in EVALUATION.md
3. **Understand the concepts** deeper in CONCEPTS.md
4. **Reference technical specs** in REFERENCE.md

---

## Quick Reference

| Tutorial | Focus | Time |
|----------|-------|------|
| Tutorial 1 | Basic skill creation | 10 min |
| Tutorial 2 | Evaluation-first development | 15 min |
| Tutorial 3 | Progressive disclosure | 15 min |
| Tutorial 4 | Adding scripts | 10 min |
| Tutorial 5 | Debugging triggers | 10 min |
| Tutorial 6 | Migrating to 2025 patterns | 10 min |

**Total Time:** ~1 hour for complete overview

---

**See also:**
- CONCEPTS.md for understanding the "why"
- BEST_PRACTICES.md for writing effective content
- EVALUATION.md for systematic testing
- REFERENCE.md for technical specifications
- TEMPLATES.md for starter templates
