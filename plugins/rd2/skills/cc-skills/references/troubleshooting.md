# Troubleshooting Guide

This guide helps diagnose and fix common issues when building and using Claude Code skills.

## Quick Diagnosis

| Symptom | Likely Cause | See Section |
|---------|--------------|-------------|
| "Could not find SKILL.md" | File naming/placement | Skill Won't Upload |
| Skill never triggers | Generic description | Skill Doesn't Trigger |
| Loads for unrelated queries | Too broad triggers | Triggers Too Often |
| Claude ignores instructions | Verbose/buried content | Instructions Not Followed |
| MCP calls fail | Connection/auth issues | MCP Connection Issues |
| Slow responses | Large SKILL.md | Large Context Issues |

---

## 1. Skill Won't Upload

### Symptoms
- "Could not find SKILL.md"
- "Invalid frontmatter"
- "Invalid skill name"

### Causes & Solutions

**Wrong filename:**
```bash
# WRONG
my-skill/Readme.md
my-skill/SKILL.md.txt

# CORRECT
my-skill/SKILL.md
```

**Invalid YAML frontmatter:**
```yaml
---
name: my-skill
description: A skill for X
---  # ← Missing closing ---
```

**Invalid skill name:**
```yaml
# WRONG
name: My Skill       # Contains spaces
name: my_skill       # Contains underscores
name: my--skill      # Double hyphen

# CORRECT
name: my-skill       # hyphen-case only
```

### Diagnostic Commands
```bash
# Check file exists
ls -la my-skill/SKILL.md

# Validate YAML
python3 -c "import yaml; yaml.safe_load(open('my-skill/SKILL.md'))"

# Check name format
grep "^name:" my-skill/SKILL.md
```

---

## 2. Skill Doesn't Trigger

### Symptoms
- Skill never loads automatically
- Users must manually enable it
- "When would you use this skill?" returns nothing useful

### Causes & Solutions

**Generic description:**
```yaml
# BAD
description: "A helpful skill"

# GOOD
description: "This skill should be used when the user asks to 'create a database', 'set up PostgreSQL', or mentions 'database migration'. Use it for: schema design, query optimization, connection pooling. Examples: 'add table', 'fix slow query', 'migrate schema'."
```

**Missing trigger phrases:**
```yaml
# Add these to description:
- "create X" / "add X"
- "build X" / "setup X"
- "fix X" / "debug X"
- Error messages: "connection refused", "timeout", "permission denied"
```

**Missing CSO coverage:**
- **Context**: When user needs to do X
- **Symptoms**: Error messages, "can't", "fails to"
- **Objects**: Tools, files, configurations

### Debugging

Ask Claude directly:
> "When would you use the [skill-name] skill?"

If Claude can't answer, the description is too vague.

---

## 3. Skill Triggers Too Often

### Symptoms
- Loads for unrelated queries
- Users disable the skill
- "Why did this skill activate?"

### Causes & Solutions

**Too broad triggers:**
```yaml
# BAD - Matches everything
description: "A skill that helps with coding"

# GOOD - Specific scope
description: "Use when user mentions 'optimize SQL', 'slow query', or 'add index'"
```

**Add negative triggers:**
```yaml
# Include what NOT to trigger on
anti_triggers:
  - "write unit tests"
  - "deploy to production"
```

**Be more specific:**
```yaml
# BAD
"build a website"

# GOOD
"build a Next.js website"  # More specific context
```

---

## 4. Instructions Not Followed

### Symptoms
- Claude ignores guidance
- Skips steps
- Produces low-quality output

### Causes & Solutions

**Instructions too verbose:**
```markdown
# BAD - Wall of text
The skill should consider various factors when approaching this task. It is important to take into account the following considerations: first, second, third... [500 more words]

# GOOD - Concise with structure
## Important
- Keep responses under 200 words

## Steps
1. Analyze input
2. Generate output
3. Validate result
```

**Content buried:**
```markdown
# BAD - Key info at bottom
[500 lines of context]
## Important
- Do X first

# GOOD - Important first
## Important
- Do X first

[Supporting context below]
```

**Ambiguous language:**
```yaml
# BAD
"Make it good"
"Be careful"

# GOOD
"Keep response under 200 words"
"Validate JSON syntax before returning"
```

### Techniques

1. **Use ## Important headers** - Claude pays attention
2. **Be explicit**: "You MUST do X"
3. **Limit to 3-5 key points** - More gets ignored
4. **Use action verbs**: "Validate", "Check", "Ensure"

---

## 5. MCP Connection Issues

### Symptoms
- Skill loads but MCP calls fail
- "Tool not found" errors
- Authentication failures

### Diagnostic Checklist

- [ ] MCP server running?
- [ ] API keys valid?
- [ ] Tool names correct?
- [ ] Config file valid?

### Common Solutions

**Server not running:**
```bash
# Start your MCP server
npx @anthropic/mcp-server  # or your server
```

**Authentication:**
```bash
# Check API keys are set
echo $ANTHROPIC_API_KEY  # or relevant env var
```

**Tool name mismatch:**
```yaml
# In your skill
Use the `filesystem_read` tool, not `read_file`
```

---

## 6. Large Context Issues

### Symptoms
- Skill responses slow
- Token limit errors
- Truncated outputs

### Solutions

**Optimize SKILL.md size:**
- Target <3000 tokens
- Move details to `references/`
- Use links instead of inline content

**Structure for quick reference:**
```markdown
## Quick Reference
[2-3 line summary]

## Details
[Extended content in references/]
```

**Reduce enabled skills:**
- Disable unused skills
- Claude only scans enabled skills

---

## Troubleshooting Workflow

```
1. IDENTIFY the symptom
       ↓
2. CHECK the table above for category
       ↓
3. RUN diagnostic commands
       ↓
4. APPLY solution
       ↓
5. TEST the fix
       ↓
6. If still broken → Check Common Mistakes guide
```

---

## Get More Help

- [Common Mistakes](common-mistakes.md) - Anti-patterns to avoid
- [Best Practices](best-practices.md) - Comprehensive guidance
- [Skill Patterns](skill-patterns.md) - Pattern selection guide
- [Validation Checklist](validation-checklist.md) - Pre-upload checks
