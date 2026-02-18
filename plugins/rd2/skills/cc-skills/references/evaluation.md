# Evaluation-First Skill Development

Build skills based on verified gaps, not assumptions.

## Core Principle

> Write content based on observed failure modes, not anticipated needs.

**Traditional approach:** Write comprehensive documentation → Test → Revise what doesn't work.
**Problem:** You write content Claude already knows, miss what it actually needs.

**Evaluation-first approach:** Test without skill → Document gaps → Write ONLY what addresses gaps → Iterate.
**Benefit:** Every token serves a verified purpose.

---

## The Evaluation Loop

```
┌─────────────────┐
│  1. Baseline    │  Run tasks WITHOUT skill
│     Testing     │  Document what Claude misses
└────────┬────────┘
         ▼
┌─────────────────┐
│  2. Write       │  Address ONLY documented gaps
│     Content     │  Use concrete examples
└────────┬────────┘
         ▼
┌─────────────────┐
│  3. Retest      │  Same scenarios with skill
│                 │  Document improvements
└────────┬────────┘
         ▼
    Baseline achieved?
         │
    Yes ─┴─ No → Return to step 2
         ▼
┌─────────────────┐
│  4. Ship        │  Stop adding content
└─────────────────┘
```

---

## Step 1: Baseline Testing

### Create Test Scenarios

```yaml
scenario_1:
  name: "SQL Injection Detection"
  input: |
    Review this code for vulnerabilities:
    query = f"SELECT * FROM users WHERE id = {user_id}"
  expected:
    - Identifies SQL injection
    - Suggests parameterized query
```

### Run Without Skill

Test with fresh Claude instance (not the one helping write the skill).

### Document Results

| Scenario | Pass/Fail | What Claude Missed | Severity |
|----------|-----------|-------------------|----------|
| SQL Injection 1 | ❌ | f-string interpolation | High |
| SQL Injection 2 | ✓ | N/A | - |
| XSS Detection | ❌ | innerHTML assignment | Critical |

**Baseline Score: 2/4 (50%)**

---

## Step 2: Write Targeted Content

### Address ONLY Identified Gaps

```markdown
## SQL Injection Patterns Claude Misses

### String Interpolation in Queries
```python
# VULNERABLE
query = f"SELECT * FROM users WHERE id = {user_id}"

# SECURE
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))
```
```

### Target the Gap, Not the Domain

❌ **Bad:** 500 words explaining what SQL injection is (Claude knows this)

✓ **Good:** Specific patterns Claude missed in testing

---

## Step 3: Iterative Refinement

### Track Iterations

| Iteration | Score | Issues Found | Fixes Applied |
|-----------|-------|--------------|---------------|
| 0 (baseline) | 2/4 (50%) | - | - |
| 1 (draft) | 3/4 (75%) | Missing ORM patterns | Added examples |
| 2 (refined) | 4/4 (100%) | ✓ | Ship |

### Stop When Baseline Achieved

Don't add more content "just in case." If tests pass, the skill is complete.

---

## Cross-Model Testing

Test with multiple models:

| Model | Score | Notes |
|-------|-------|-------|
| Haiku | 3/4 | Struggles with complex patterns |
| Sonnet | 4/4 | ✓ Optimal |
| Opus | 4/4 | No additional benefit |

**Ship if Sonnet ≥ 90%.** Note if Haiku needs more guidance.

---

## Common Pitfalls

| Pitfall | Problem | Solution |
|---------|---------|----------|
| Testing only success cases | Miss edge cases | Test negative scenarios too |
| Content based on assumptions | Wastes tokens | Only address verified gaps |
| Testing with same Claude | Inflated results | Use fresh instances |
| Adding "just in case" content | Bloats skill | Stop when baseline achieved |
| Over-generalization | Vague guidance | Be specific about what Claude misses |

---

## Quick Evaluation Checklist

Before shipping:

### Baseline Coverage
- [ ] Ran tests without skill installed
- [ ] Documented specific failure modes
- [ ] Content targets ONLY those failures

### Iterative Testing
- [ ] Tested each iteration
- [ ] Documented score improvements
- [ ] Stopped when baseline achieved

### Cross-Model Validation
- [ ] Tested with Haiku (minimum viable)
- [ ] Tested with Sonnet (primary target)
- [ ] Used fresh Claude instances

### Token Efficiency
- [ ] No content Claude already knows
- [ ] Concrete examples over explanations
- [ ] SKILL.md under 500 lines

---

## Automated Skill Evaluation

The `skills.py evaluate` command provides automated quality assessment using AST-based analysis.

### Running Evaluation

```bash
# Basic evaluation (text output)
python3 scripts/skills.py evaluate /path/to/skill

# JSON output for programmatic use
python3 scripts/skills.py evaluate /path/to/skill --format json

# Markdown output for documentation
python3 scripts/skills.py evaluate /path/to/skill --format markdown
```

### Two-Tier Evaluation Architecture

The evaluation system uses a Two-tier architecture for robust skill validation:

**Tier 1: Structural Validation (Deterministic)**
- Verifies SKILL.md exists
- Validates YAML frontmatter syntax
- Checks required fields (name, description)
- Validates naming conventions (hyphen-case)
- Detects optional directories (scripts/, references/, assets/)
- Each check returns: **STOP** (critical) or **SUGGEST** (warning)
- If STOP action triggered, quality assessment still runs for diagnostics

**Tier 2: Quality Scoring (Subjective)**
- Scores 7 dimensions (see below)
- Weighted scoring for overall grade
- Findings with specific file:line references
- Actionable recommendations

#### Tier 1 Action Types

| Action | Icon | Meaning | Evaluation Continues? |
|--------|------|---------|----------------------|
| **STOP** | ⏹ | Critical failure - skill cannot function | Yes (for diagnostics) |
| **SUGGEST** | 💡 | Warning - improvement suggested | Yes |

**Example Tier 1 Output:**
```
Phase 1: Running Tier 1 (Structural Validation)...
  ✓ SKILL.md exists: SKILL.md exists
  ✓ Name format: Name 'my-skill' is valid
  ✓ Directory: references/: references/ directory exists
  ⏹ [STOP] Name field type: Name must be a string, got NoneType

⚠ STOP action(s) triggered. Quality assessment will still run for diagnostics.
```

### Scoring Dimensions

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| **Frontmatter** | 10% | YAML validity, required fields, version |
| **Content** | 25% | Length, sections (Overview, Quick Start), examples |
| **Security** | 20% | AST-based dangerous pattern detection |
| **Structure** | 15% | Directory organization, progressive disclosure |
| **Efficiency** | 10% | Token count, file sizes |
| **Best Practices** | 10% | Naming conventions, when-to-use guidance |
| **Code Quality** | 10% | Error handling, type hints, docstrings |

### Grading Scale

| Grade | Score Range | Meaning |
|-------|-------------|---------|
| **A** | 90.0 - 100.0 | Production ready |
| **B** | 70.0 - 89.9 | Minor fixes needed |
| **C** | 50.0 - 69.9 | Moderate revision |
| **D** | 30.0 - 49.9 | Major revision |
| **F** | 0.0 - 29.9 | Rewrite needed |

### AST-Based Security Analysis

The evaluator uses Abstract Syntax Tree (AST) parsing to detect dangerous patterns:

**What It Detects:**
- Dynamic code execution functions
- Shell command execution with shell=True
- Dangerous import patterns

**Why AST Analysis?**
- Parses actual code, not strings or comments
- Distinguishes dangerous calls from documentation about them
- No false positives from security documentation
- Provides exact line numbers for findings

**Finding Format:**
```
SECURITY in SKILL.md:45: Dangerous call detected
scripts/helper.py:23: Dangerous call detected
```

### Example Output

```
======================================================================
SKILL EVALUATION REPORT
Path: /path/to/your-skill
======================================================================

## Tier 1: Structural Validation
----------------------------------------------------------------------
✓ PASSED: All Tier 1 checks passed

## Tier 2: Quality Assessment
----------------------------------------------------------------------

### Security
Score: 100.0/100 | Weight: 20% | Weighted: 20.00

Findings:
  • Mentions security considerations
  • No obvious security issues detected

### Code Quality
Score: 100.0/100 | Weight: 10% | Weighted: 10.00

Findings:
  • scripts/main.py: Has error handling
  • scripts/main.py: Uses type hints (95.2% coverage)
  • scripts/main.py:45: Broad 'except Exception' - consider specific types

## Overall Score
----------------------------------------------------------------------
Total Score: 94.3/100
Grade: A - Production ready
```

### Interpreting Results

**Findings** describe what was detected (informational).

**Recommendations** suggest improvements (actionable).

**Score deductions** occur for:
- Missing required sections (-2.0 points)
- Dangerous code patterns (-1.5 points per finding)
- Missing error handling (-0.5 points per script)
- Broad exception handlers (informational, no deduction)

---

## LLM-as-Judge Evaluation

Starting with cc-skills 2.0, you can use Claude itself to evaluate skills against full rubric criteria for deeper analysis.

### When to Use Deep Evaluation

- **Human-level nuance**: When you need judgment beyond pattern matching
- **Quality assessment**: When you want Claude's opinion on skill quality
- **Rubric compliance**: When you need structured scoring against criteria
- **Comparative analysis**: When comparing multiple skills

### Usage

```bash
# Basic evaluation (pattern-based, fast)
python3 skills.py evaluate /path/to/skill

# Deep evaluation (LLM-based, thorough)
python3 skills.py evaluate /path/to/skill --deep

# Deep evaluation with specific model
python3 skills.py evaluate /path/to/skill --deep --model claude-sonnet-4-20250514
```

### What Deep Evaluation Does

1. **Builds a prompt** with:
   - Full skill content (SKILL.md and key files)
   - Complete rubric for each dimension
   - Scoring instructions and examples

2. **Sends to LLM** for evaluation

3. **Parses response** for:
   - Dimension scores (0-100)
   - Level determinations (Excellent/Good/Fair/Poor/Missing)
   - Specific findings with rationale
   - Improvement recommendations

### Cost Estimation

| Skill Size | Dimensions | Est. Tokens | Est. Cost (Claude Sonnet) |
|------------|------------|-------------|---------------------------|
| Small (<1K) | 10 | ~15K | ~$0.01 |
| Medium (1-3K) | 10 | ~25K | ~$0.02 |
| Large (>3K) | 10 | ~40K | ~$0.03 |

### Interpreting Deep Results

```json
{
  "dimensions": {
    "trigger_design": {
      "score": 85,
      "level": "good",
      "findings": [
        "Has 3 trigger phrases in quotes",
        "Third-person form present",
        "Missing synonym coverage for 'timeout'"
      ],
      "recommendations": [
        "Add 'hang' and 'freeze' as related terms"
      ]
    }
  },
  "overall_score": 82,
  "overall_level": "good",
  "cost_report": {
    "input_tokens": 25000,
    "output_tokens": 1500,
    "estimated_cost": 0.02
  }
}
```

### Calibration Notes

Deep evaluation is subjective. Results may vary between:
- Different models
- Different model versions
- Different temperatures

For consistent results:
- Use fixed model versions (--model flag)
- Keep temperature at default (0)
- Run multiple evaluations and average

---

## Pass@k Consistency Metric

For skill development, pass@k measures whether a skill would "pass" evaluation if tested k times with different random seeds.

### Calculation

For a set of n test scenarios where c passed:

```
pass@1 = c/n
pass@k = 1 - (n-c)/n * ((n-c-1)/(n-1)) * ... * ((n-c-k+1)/(n-k))
```

### Example

| Scenarios | Passed | pass@1 | pass@3 |
|-----------|--------|--------|--------|
| 10 | 7 | 0.70 | 0.89 |
| 10 | 5 | 0.50 | 0.78 |
| 10 | 3 | 0.30 | 0.59 |

### Interpretation

- **pass@1 < 0.70**: Skill needs significant work
- **pass@1 0.70-0.85**: Minor improvements needed
- **pass@1 > 0.85**: Skill is ready

Use pass@k to track improvement over iterations.

---

## Rubric-Based Scoring Reference

Each dimension has a rubric with criteria and levels:

### Rubric Structure

```python
RubricCriterion(
    name="description_quality",
    description="Quality of skill description",
    weight=0.30,  # 30% of dimension score
    levels=[
        RubricLevel("excellent", 100, "Clear, specific with trigger phrases"),
        RubricLevel("good", 75, "Clear but generic description"),
        RubricLevel("fair", 50, "Vague or incomplete"),
        RubricLevel("poor", 25, "Minimal or confusing"),
        RubricLevel("missing", 0, "No description"),
    ]
)
```

### Complete Rubrics

See individual dimension implementations for full rubrics:
- [TriggerDesignEvaluator](../scripts/evaluators/trigger_design.py)
- [InstructionClarityEvaluator](../scripts/evaluators/instruction_clarity.py)
- [ValueAddEvaluator](../scripts/evaluators/value_add.py)
- [BehavioralReadinessEvaluator](../scripts/evaluators/behavioral_readiness.py)

### Scoring Algorithm

```python
def calculate_dimension_score(rubric: list, findings: dict) -> float:
    """Calculate dimension score from rubric evaluation."""
    total_weighted_score = 0.0
    total_weight = 0.0
    
    for criterion in rubric:
        level = findings.get(criterion.name, "missing")
        score = criterion.get_level_score(level)
        total_weighted_score += criterion.weight * score
        total_weight += criterion.weight
    
    return total_weighted_score / total_weight
```

---

## Integration with CI/CD

Add skill evaluation to your workflow:

```yaml
# .github/workflows/skill-quality.yml
name: Skill Quality Check

on: [push, pull_request]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install cc-skills
        run: pip install cc-skills
      - name: Evaluate skill
        run: |
          cc-skills evaluate . --output results.json
      - name: Check score
        run: |
          if [ $(jq '.overall_score' results.json) -lt 70 ]; then
            echo "Score below threshold"
            exit 1
          fi
```

---

## See Also

- [Scanner Criteria](scanner-criteria.md) - Detailed dimension descriptions
- [Scenario Schema](scenario-schema.md) - Behavioral test format
- [Behavioral Evaluator](../scripts/evaluators/behavioral.py) - Scenario-based testing
- [LLM Judge Evaluator](../scripts/evaluators/llm_judge.py) - Deep evaluation implementation