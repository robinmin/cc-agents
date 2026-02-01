# Skill Quality Evaluation: {{skill_name}}

**Quality:** {{quality_level}}
**Readiness:** {{readiness_status}}
**Path:** `{{skill_path}}`

---

## Phase 1: Structural Validation

{{validation_status}} **{{validation_result}}:** {{validation_message}}

---

## Phase 2: Quality Assessment

### Summary

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
{{scores_table}}

### Dimension Details

{{dimension_details}}

---

## Overall Score

**Total Score:** {{total_score}}/100

**Grade:** {{grade_letter}} - {{grade_description}}

---

## Recommendations

### Critical (Fix Immediately)

{{recommendations_critical}}

### High Priority

{{recommendations_high}}

### Medium Priority

{{recommendations_medium}}

---

## Positive Aspects

{{strengths}}

---

## Next Steps

1. Fix critical issues first
2. Address high priority items
3. Run `/rd2:skill-refine` for automated improvements
4. Re-evaluate with `/rd2:skill-evaluate` to confirm fixes

---

## Scoring Reference

### Grading Scale

| Grade | Range | Description |
|-------|-------|-------------|
| A | 90.0-100.0 | Production ready |
| B | 70.0-89.9 | Minor fixes needed |
| C | 50.0-69.9 | Moderate revision |
| D | 30.0-49.9 | Major revision |
| F | 0.0-29.9 | Rewrite needed |

### Scoring Weights

| Category | Weight | Focus Areas |
|----------|--------|-------------|
| Frontmatter | 10% | name, description, trigger phrases |
| Content | 25% | workflows, examples, completeness |
| Security | 20% | dangerous patterns, input validation |
| Structure | 15% | progressive disclosure, organization |
| Efficiency | 10% | token usage, references/ usage |
| Best Practices | 10% | writing style, naming conventions |
| Code Quality | 10% | scripts/, error handling |
