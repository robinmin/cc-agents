---
name: Refactor scoring from point-deductions to rubric-based
description: Replace arbitrary point deductions across all evaluators with calibrated rubric-based scoring for transparency and objectivity
status: Done
created_at: 2026-02-11 15:49:01
updated_at: 2026-02-12 20:26:37
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0195. Refactor scoring from point-deductions to rubric-based

### Background

Part of task 0190 (Phase 1). Current scoring uses arbitrary point deductions (e.g., `score -= 2.0` for missing section, `-1.5` per security finding). These values aren't calibrated against real-world outcomes and make scores hard to interpret. Per Anthropic's eval framework, effective grading uses "rubric-based scoring" where each level has clear criteria. Per the ArXiv 4-pillar framework: use "multi-dimensional rubrics" instead of simple pass/fail or arbitrary numeric scales.

Target files: All evaluators in `plugins/rd2/skills/cc-skills/scripts/evaluators/`

### Requirements

- [ ] Define rubric format: each sub-criterion gets a level-based score (e.g., 0/25/50/75/100) with descriptive criteria per level
- [ ] Refactor existing evaluators (frontmatter, content, security, structure, efficiency, best_practices, code_quality) to use rubric-based scoring
- [ ] Add rubric definitions as data (dict/YAML) not hardcoded magic numbers
- [ ] Rebalance dimension weights for 10 total dimensions (existing 7 + 4 new, redistributed)
- [ ] Create calibration dataset: evaluate 10-15 existing skills, verify scores feel right
- [ ] All existing tests pass (update expected scores where rubric changes outputs)
- [ ] New unit tests for rubric scoring logic

### Q&A

[Clarifications added during planning phase]

### Design


## Design: Rubric-Based Scoring Architecture

### RubricCriterion Structure

Each criterion follows this pattern:

```python
RubricCriterion(
    name="criterion_name",
    description="What this criterion measures",
    weight=0.25,  # Percentage contribution to total dimension score
    levels=[
        RubricLevel("excellent", 100, "Description of excellent performance"),
        RubricLevel("good", 75, "Description of good performance"),
        RubricLevel("fair", 50, "Description of fair performance"),
        RubricLevel("poor", 25, "Description of poor performance"),
        RubricLevel("missing", 0, "Criterion not present or unusable"),
    ]
)
```

### Trigger Design Rubric (15% weight)

| Criterion | Weight | Measures |
|-----------|--------|----------|
| trigger_phrases | 0.30 | Presence and quality of trigger phrases |
| third_person_form | 0.20 | Description uses third person (not "you") |
| keyword_specificity | 0.20 | Specific keywords vs generic terms |
| anti_patterns | 0.15 | Absence of CSO violations, workflow summaries |
| cso_coverage | 0.15 | Coverage of Context/Symptoms/Objects categories |

### Instruction Clarity Rubric (10% weight)

| Criterion | Weight | Measures |
|-----------|--------|----------|
| imperative_form | 0.25 | Instructions use imperative mood |
| actionable_refs | 0.25 | References are actionable (not vague) |
| hedging_language | 0.20 | Absence of hedging (maybe, might, could) |
| contradictions | 0.15 | No contradictory instructions |
| completeness | 0.15 | All referenced concepts are defined |

### Value-Add Rubric (10% weight)

| Criterion | Weight | Measures |
|-----------|--------|----------|
| custom_workflows | 0.25 | Provides non-obvious workflows |
| specific_guidance | 0.25 | Specific, actionable guidance |
| examples_quality | 0.20 | Quality of code/text examples |
| artifacts_present | 0.15 | Has reference files, templates, etc. |
| uniqueness | 0.15 | Adds value beyond base LLM capability |

### Behavioral Readiness Rubric (5% weight)

| Criterion | Weight | Measures |
|-----------|--------|----------|
| error_handling | 0.25 | Guidance for handling errors |
| edge_cases | 0.25 | Coverage of edge cases |
| examples_present | 0.20 | Has concrete examples |
| anti_patterns | 0.15 | Documents common mistakes |
| test_infrastructure | 0.15 | Has behavioral test scenarios |

### Solution


## Solution: Refactor to Rubric-Based Scoring

### Approach

Convert the remaining 4 evaluators from mixed point-deduction scoring to consistent rubric-based scoring using the `RubricScorer` infrastructure already in place in `base.py`.

**Target evaluators:**
1. `trigger_design.py` - Uses `anti_pattern_score -= N` deductions
2. `instruction_clarity.py` - Uses mixed scoring approach
3. `value_add.py` - Uses mixed scoring approach
4. `behavioral_readiness.py` - Uses custom scoring logic

**Already converted (reference patterns):**
- `frontmatter.py` - Full RubricScorer usage
- `security.py` - Full RubricScorer usage
- `content.py` - Full RubricScorer usage
- `best_practices.py` - Full RubricScorer usage
- `code_quality.py` - Full RubricScorer usage
- `efficiency.py` - Full RubricScorer usage
- `structure.py` - Full RubricScorer usage
- `behavioral.py` - Full RubricScorer usage
- `llm_judge.py` - Full RubricScorer usage

### Key Decisions

1. **Rubric levels**: Use 5-level scale (Excellent/Good/Fair/Poor/Missing) with scores 100/75/50/25/0
2. **Weight distribution**: Keep existing dimension weights (already sum to 1.0)
3. **Backward compatibility**: Ensure score outputs remain consistent with existing tests
4. **Documentation**: Each criterion includes description for debugging

### Files to Modify

| File | Changes |
|------|---------|
| `evaluators/trigger_design.py` | Convert to RubricScorer, define 5-6 criteria |
| `evaluators/instruction_clarity.py` | Convert to RubricScorer, define 4-5 criteria |
| `evaluators/value_add.py` | Convert to RubricScorer, define 4-5 criteria |
| `evaluators/behavioral_readiness.py` | Convert to RubricScorer, define 5-6 criteria |
| `tests/test_trigger_design.py` | Update expected scores if needed |
| `tests/test_instruction_clarity.py` | Update expected scores if needed |
| `tests/test_value_add.py` | Update expected scores if needed |
| `tests/test_behavioral_readiness.py` | Update expected scores if needed |

### Acceptance Criteria

- [ ] All 4 evaluators use RubricScorer consistently
- [ ] All 200+ tests pass
- [ ] Score ranges remain reasonable (no major score shifts)
- [ ] Each criterion has clear level descriptions

### Plan


## Plan: Implementation Steps

### Phase 1: Reference Pattern Study (15 min)
- [ ] Review frontmatter.py as reference implementation
- [ ] Document common patterns for criterion definition
- [ ] Note test update patterns

### Phase 2: Convert Evaluators (2 hours)

#### Step 2.1: trigger_design.py (30 min)
- [ ] Define 5 RubricCriterion objects
- [ ] Implement criterion evaluation logic
- [ ] Replace mixed scoring with RubricScorer.evaluate()
- [ ] Update test expectations if needed
- [ ] Run tests: pytest tests/test_trigger_design.py -v

#### Step 2.2: instruction_clarity.py (30 min)
- [ ] Define 5 RubricCriterion objects
- [ ] Implement criterion evaluation logic
- [ ] Replace mixed scoring with RubricScorer.evaluate()
- [ ] Update test expectations if needed
- [ ] Run tests: pytest tests/test_instruction_clarity.py -v

#### Step 2.3: value_add.py (30 min)
- [ ] Define 5 RubricCriterion objects
- [ ] Implement criterion evaluation logic
- [ ] Replace mixed scoring with RubricScorer.evaluate()
- [ ] Update test expectations if needed
- [ ] Run tests: pytest tests/test_value_add.py -v

#### Step 2.4: behavioral_readiness.py (30 min)
- [ ] Define 5 RubricCriterion objects
- [ ] Implement criterion evaluation logic
- [ ] Replace mixed scoring with RubricScorer.evaluate()
- [ ] Update test expectations if needed
- [ ] Run tests: pytest tests/test_behavioral_readiness.py -v

### Phase 3: Validation (30 min)
- [ ] Run full test suite: pytest tests/ -v
- [ ] Verify all 200+ tests pass
- [ ] Run self-evaluation: python scripts/skills.py evaluate .
- [ ] Compare scores before/after for consistency

### Phase 4: Documentation (15 min)
- [ ] Update scanner-criteria.md with rubric details
- [ ] Verify all cross-references correct

### Artifacts


type|path|agent|date
code|plugins/rd2/skills/cc-skills/scripts/evaluators/trigger_design.py|super-planner|2026-02-12
code|plugins/rd2/skills/cc-skills/scripts/evaluators/instruction_clarity.py|super-planner|2026-02-12
code|plugins/rd2/skills/cc-skills/scripts/evaluators/value_add.py|super-planner|2026-02-12
code|plugins/rd2/skills/cc-skills/scripts/evaluators/behavioral_readiness.py|super-planner|2026-02-12
test|plugins/rd2/skills/cc-skills/tests/test_trigger_design.py|super-planner|2026-02-12
test|plugins/rd2/skills/cc-skills/tests/test_instruction_clarity.py|super-planner|2026-02-12
test|plugins/rd2/skills/cc-skills/tests/test_value_add.py|super-planner|2026-02-12
test|plugins/rd2/skills/cc-skills/tests/test_behavioral_readiness.py|super-planner|2026-02-12

### References

- Parent: docs/tasks/0190_enhance_Agent_Skills_cc-skills.md
- Brainstorm: docs/.tasks/brainstorm/0190_brainstorm.md
- Current evaluators: plugins/rd2/skills/cc-skills/scripts/evaluators/
- Scanner criteria: plugins/rd2/skills/cc-skills/references/scanner-criteria.md
- Depends on: 0191, 0192, 0193, 0194 (new evaluators should use rubric format from the start)
