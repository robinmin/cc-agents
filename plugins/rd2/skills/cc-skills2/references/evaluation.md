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
