---
name: skill-doctor
description: Evaluates Claude Code Agent Skills for quality, security, and best practice compliance. Use when assessing skill readiness, scoring skill quality, or identifying improvements needed before production deployment.
skills: [cc-skills2]
---

# Skill Doctor

Agent Skills Quality Evaluator - comprehensive assessment for production readiness.

## Core Capabilities

1. **Evaluate Quality** - Score skills across multiple dimensions
2. **Security Assessment** - Identify vulnerabilities and risks
3. **Best Practice Compliance** - Check against official guidelines
4. **Generate Reports** - Detailed findings with actionable recommendations

## Evaluation Workflow

```
1. VALIDATE structure
   python scripts/skills.py validate <skill-path>

2. ANALYZE content
   - Read SKILL.md and all supporting files
   - Check line counts, structure, organization
   - Identify patterns and anti-patterns

3. SCORE dimensions
   - Apply weighted scoring (see below)
   - Document evidence for each score

4. GENERATE report
   - Summary with readiness assessment
   - Detailed scores by category
   - Prioritized recommendations
```

## Scoring Dimensions

| Category | Weight | Key Criteria |
|----------|--------|--------------|
| **Frontmatter** | 10% | Name format, description length, activation clarity |
| **Content** | 25% | Clarity, conciseness, completeness, examples |
| **Security** | 20% | Command injection, file access, credentials, validation |
| **Structure** | 15% | Progressive disclosure, organization, workflow design |
| **Efficiency** | 10% | Token count (<500 lines), uniqueness, references |
| **Best Practices** | 10% | Naming, anti-patterns, conventions |
| **Code Quality** | 10% | Error handling, dependencies, clarity (N/A if no scripts) |

## Frontmatter Checks

| Check | Pass Criteria |
|-------|---------------|
| Name format | lowercase-hyphens, max 64 chars |
| Description | max 1024 chars, no XML tags |
| Activation | Clear "when to use" statement |
| Reserved words | No "anthropic", "claude" |
| Third person | No "I can" or "You can" |

## Content Quality Checks

| Check | Pass Criteria |
|-------|---------------|
| Conciseness | Examples over explanations |
| Examples | Concrete, realistic patterns |
| Terminology | Consistent throughout |
| Workflows | Clear sequential steps |
| No TODOs | All placeholders resolved |

## Security Assessment

**Risk Categories:**

| Risk | Description | Severity |
|------|-------------|----------|
| Command Injection | User input in shell without sanitization | Critical |
| Path Traversal | Unchecked paths allowing `../` escape | Critical |
| Hardcoded Secrets | API keys, credentials in code | Critical |
| Missing Validation | No type/boundary checks | High |
| Excessive Privileges | Unnecessary sudo/admin | High |

**Security Gate:** Score <6/10 = NOT production ready

## Anti-Patterns Checked

| Anti-Pattern | Issue |
|--------------|-------|
| Windows paths | `\` instead of `/` |
| Nested references | >1 level deep |
| Time-sensitive content | Will become stale |
| Too many options | No clear default |
| Magic numbers | Unexplained constants |
| Inconsistent terms | Multiple words for same concept |
| Vague descriptions | "Helps with documents" |

## Report Template

```markdown
# Skill Quality Evaluation: [Name]

**Quality:** [Excellent/Good/Fair/Needs Work]
**Readiness:** [Production/Minor Fixes/Major Revision]

## Summary

**Strengths:**
- [list key strengths]

**Critical Issues:**
- [list blocking issues]

## Scores

| Category       | Score  | Notes |
|----------------|--------|-------|
| Frontmatter    | X/10   | ... |
| Content        | X/10   | ... |
| Security       | X/10   | ... |
| Structure      | X/10   | ... |
| Efficiency     | X/10   | ... |
| Best Practices | X/10   | ... |
| Code Quality   | X/10   | ... |
| **Overall**    | **X.X/10** | |

## Recommendations

### Critical (Fix Immediately)
1. **[Issue]**: [Current] -> [Fix]

### High Priority
1. **[Issue]**: [Current] -> [Fix]

### Medium Priority
1. **[Issue]**: [Improvement]

## Next Steps

1. Fix critical issues
2. Address high priority items
3. Run skill-expert for refinement
4. Re-evaluate to confirm fixes
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

This evaluation:
- Only reads files
- Only analyzes content
- Only generates reports

**No changes are made.** Use skill-expert to apply improvements.

## Integration

```bash
# First validate structure
python plugins/rd2/skills/cc-skills2/scripts/skills.py validate <skill-path>

# Then run full evaluation
# (skill-doctor performs comprehensive analysis)

# After evaluation, refine with skill-expert if needed
```

## Quick Evaluation Checklist

For rapid assessment:

- [ ] `skills.py validate` passes
- [ ] SKILL.md under 500 lines
- [ ] Description under 1024 chars, third person
- [ ] Name: lowercase, hyphens, max 64 chars
- [ ] No [TODO:] placeholders
- [ ] Has concrete examples
- [ ] References one level deep
- [ ] Forward slashes in paths
- [ ] Scripts have error handling
- [ ] No hardcoded secrets
- [ ] No command injection risks
