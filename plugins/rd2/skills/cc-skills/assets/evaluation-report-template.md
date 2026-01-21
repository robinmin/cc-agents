# Skill Quality Evaluation: {{skill_name}}

**Quality:** {{quality_level}}
**Readiness:** {{readiness_status}}

## Summary

**Strengths:**
{{#strengths}}
- {{.}}
{{/strengths}}

**Critical Issues:**
{{#critical_issues}}
- {{.}}
{{/critical_issues}}

## Scores

| Category       | Score  | Notes |
|----------------|--------|-------|
| Frontmatter    | {{score_frontmatter}}/10   | {{notes_frontmatter}} |
| Content        | {{score_content}}/10   | {{notes_content}} |
| Security       | {{score_security}}/10   | {{notes_security}} |
| Structure      | {{score_structure}}/10   | {{notes_structure}} |
| Efficiency     | {{score_efficiency}}/10   | {{notes_efficiency}} |
| Best Practices | {{score_best_practices}}/10   | {{notes_best_practices}} |
| Code Quality   | {{score_code_quality}}/10   | {{notes_code_quality}} |
| **Overall**    | **{{score_overall}}/10** | |

## Recommendations

### Critical (Fix Immediately)
{{#recommendations_critical}}
1. **{{issue}}**: {{current}} -> {{fix}}
{{/recommendations_critical}}

### High Priority
{{#recommendations_high}}
1. **{{issue}}**: {{current}} -> {{fix}}
{{/recommendations_high}}

### Medium Priority
{{#recommendations_medium}}
1. **{{issue}}**: {{improvement}}
{{/recommendations_medium}}

## Next Steps

1. Fix critical issues
2. Address high priority items
3. Run skill-expert for refinement
4. Re-evaluate to confirm fixes

---

## Scoring Reference

### Grading Scale

| Grade | Score    | Status              |
|-------|----------|---------------------|
| A     | 9.0-10.0 | Production ready    |
| B     | 7.0-8.9  | Minor fixes needed  |
| C     | 5.0-6.9  | Moderate revision   |
| D     | 3.0-4.9  | Major revision      |
| F     | 0.0-2.9  | Rewrite needed      |

### Scoring Weights

| Category       | Weight |
|----------------|--------|
| Frontmatter    | 10%    |
| Content        | 25%    |
| Security       | 20%    |
| Structure      | 15%    |
| Efficiency     | 10%    |
| Best Practices | 10%    |
| Code Quality   | 10%    |
