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

### Two-Phase Evaluation

**Phase 1: Structural Validation**
- Verifies SKILL.md exists
- Validates YAML frontmatter syntax
- Checks required fields (name, description)
- Pass/Fail result

**Phase 2: Quality Assessment**
- Scores 7 dimensions (see below)
- Weighted scoring for overall grade
- Findings with specific file:line references
- Actionable recommendations

### Scoring Dimensions

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| **Frontmatter** | 10% | YAML validity, required fields, allowed-tools |
| **Content** | 25% | Length, sections (Overview, Quick Start), examples |
| **Security** | 20% | AST-based dangerous pattern detection |
| **Structure** | 15% | Directory organization, progressive disclosure |
| **Efficiency** | 10% | Token count, file sizes |
| **Best Practices** | 10% | Naming conventions, when-to-use guidance |
| **Code Quality** | 10% | Error handling, type hints, docstrings |

### Grading Scale

| Grade | Score Range | Meaning |
|-------|-------------|---------|
| **A** | 9.0 - 10.0 | Production ready |
| **B** | 7.0 - 8.9 | Minor fixes needed |
| **C** | 5.0 - 6.9 | Moderate revision |
| **D** | 3.0 - 4.9 | Major revision |
| **F** | 0.0 - 2.9 | Rewrite needed |

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

## Phase 1: Structural Validation
----------------------------------------------------------------------
✓ PASSED: Skill is valid!

## Phase 2: Quality Assessment
----------------------------------------------------------------------

### Security
Score: 10.0/10 | Weight: 20% | Weighted: 2.00

Findings:
  • Mentions security considerations
  • No obvious security issues detected

### Code Quality
Score: 10.0/10 | Weight: 10% | Weighted: 1.00

Findings:
  • scripts/main.py: Has error handling
  • scripts/main.py: Uses type hints (95.2% coverage)
  • scripts/main.py:45: Broad 'except Exception' - consider specific types

## Overall Score
----------------------------------------------------------------------
Total Score: 9.43/10
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
