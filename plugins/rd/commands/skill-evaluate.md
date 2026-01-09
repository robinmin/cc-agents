---
description: Comprehensive security and quality assessment for Claude Code Agent Skills
argument-hint: <skill-folder>
---

# Evaluate Skill Quality

Read-only evaluation of a skill against best practices, quality standards, and security requirements.

## Quick Start

```bash
/rd:skill-evaluate 10-stages-developing
/rd:skill-evaluate plugins/rd/skills/code-review
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<skill-folder>` | Path to skill directory (relative, absolute, or name only) |

## Workflow

1. **Load Framework**: Invoke `cc-skills` for evaluation criteria
2. **Analyze Structure**: Read SKILL.md and supporting files
3. **Evaluate Criteria**: Score each dimension
4. **Generate Report**: Produce detailed findings

## Evaluation Dimensions

| Category | Weight | Key Criteria |
|----------|--------|--------------|
| **Frontmatter** | 10% | Name format, description length, activation clarity |
| **Content** | 25% | Clarity, conciseness, completeness, examples |
| **Security** | 20% | Command injection, file access, credentials, input validation |
| **Structure** | 15% | Progressive disclosure, organization, workflow design |
| **Efficiency** | 10% | Token count (<500 lines), uniqueness, references |
| **Best Practices** | 10% | Naming, anti-patterns, conventions |
| **Code Quality** | 10% | Error handling, dependencies, clarity (N/A if no scripts) |

## Frontmatter Criteria

| Check | Pass |
|-------|------|
| Name format | lowercase-hyphens, ≤64 chars |
| Description | ≤1024 chars, no XML tags |
| Activation | Clear "when to use" statement |
| Reserved words | No `anthropic`, `claude` |

## Security Assessment

**Critical for skills with scripts/commands:**

| Risk | What to Check |
|------|---------------|
| **Command Injection** | User input in shell commands without sanitization |
| **Path Traversal** | Unchecked paths allowing `../` escape |
| **Secrets** | Hardcoded credentials, API keys |
| **Input Validation** | Missing type/boundary checks |
| **Privileges** | Unnecessary sudo/admin operations |

**Severity Levels:**
- 🔴 Critical: Block deployment
- 🟠 High: Fix before production
- 🟡 Medium: Fix next iteration
- 🟢 Low: Document and monitor

**Security Gate:** Score <6/10 = NOT production ready

## Anti-Patterns Checked

- ❌ Windows paths (`\` instead of `/`)
- ❌ Deeply nested references (>1 level)
- ❌ Time-sensitive content
- ❌ Excessive options without defaults
- ❌ Magic numbers in scripts
- ❌ Inconsistent terminology

## Output Report

```markdown
# Skill Quality Evaluation: [Name]

**Quality:** [Excellent/Good/Fair/Needs Work]
**Readiness:** [Production/Minor Fixes/Major Revision]

## Summary
**Strengths:** [list]
**Critical Issues:** [list]

## Scores

| Category | Score |
|----------|-------|
| Frontmatter | X/10 |
| Content | X/10 |
| Security | X/10 |
| Structure | X/10 |
| Efficiency | X/10 |
| Best Practices | X/10 |
| Code Quality | X/10 |
| **Overall** | **X.X/10** |

## Recommendations

### Critical
1. **[Issue]**: [Current] → [Fix]

### High Priority
[...]

## Next Steps
1. Fix critical issues
2. Run `/rd:skill-refine [name]`
3. Re-evaluate
```

## Grading Scale

| Grade | Score | Status |
|-------|-------|--------|
| A | 9.0-10.0 | Production ready |
| B | 7.0-8.9 | Minor fixes needed |
| C | 5.0-6.9 | Moderate revision |
| D | 3.0-4.9 | Major revision |
| F | 0.0-2.9 | Rewrite needed |

## Read-Only Guarantee

This command **makes NO changes**:
- ✅ Only reads files
- ✅ Only analyzes content
- ✅ Only generates report

Use `/rd:skill-refine` to apply improvements.

## Integration

```bash
/rd:skill-evaluate my-skill    # Get assessment
# Review report
/rd:skill-refine my-skill      # Apply fixes
/rd:skill-evaluate my-skill    # Verify improvements
```

## See Also

- `/rd:skill-add` - Create new skills
- `/rd:skill-refine` - Apply improvements
- `cc-skills` skill - Best practices reference
