# Agent Skills Evaluation Framework

> "Start with evaluation: Identify specific gaps in your agents' capabilities by running them on representative tasks and observing where they struggle." — Anthropic Engineering, 2025

This guide provides a systematic approach to building skills through evaluation-first development.

## The Evaluation-First Approach

### Why Evaluation-First?

**Traditional Approach (Inefficient):**
1. Write comprehensive documentation based on assumptions
2. Test if Claude uses it
3. Revise what doesn't work
4. Result: Content Claude already knows, gaps in what it actually needs

**Evaluation-First Approach (2025):**
1. Run test scenarios without any skill
2. Document exactly where Claude struggles
3. Write ONLY what addresses those specific gaps
4. Iterate based on observed behavior
5. Result: Every token serves a verified purpose

### The Core Principle

**Write content based on observed failure modes, not anticipated needs.**

---

## Phase 1: Establish Baseline

### Step 1.1: Define Representative Scenarios

Create test scenarios that represent real usage:

```yaml
scenario_1:
  name: SQL Injection Detection
  input: |
    Review this code for SQL injection vulnerabilities:
    ```python
    query = f"SELECT * FROM users WHERE id = {user_id}"
    cursor.execute(query)
    ```
  expected_behavior:
    - Identifies SQL injection vulnerability
    - Suggests parameterized query fix
    - Explains why the original is vulnerable
```

### Step 1.2: Run Baseline Tests

Test with NO skill installed:

```bash
# Test with fresh Claude instance
"Review this code for SQL injection vulnerabilities:
query = f'SELECT * FROM users WHERE id = {user_id}'
cursor.execute(query)"
```

### Step 1.3: Document Baseline Performance

Create a baseline scorecard:

| Test Scenario | Pass/Fail | What Claude Missed | Severity |
|---------------|-----------|-------------------|----------|
| SQL Injection 1 | ❌ | f-string interpolation | High |
| SQL Injection 2 | ✓ | N/A | - |
| SQL Injection 3 | ❌ | ORM raw() with user input | High |
| XSS Detection 1 | ❌ | innerHTML assignment | Critical |
| XSS Detection 2 | ✓ | N/A | - |
| XSS Detection 3 | ❌ | DOMPurify not mentioned | Medium |

**Baseline Score: 2/6 (33%)**

### Step 1.4: Identify Gap Patterns

Group failures by pattern:

```
Pattern 1: SQL Injection
- Misses: f-string interpolation, raw() queries
- Common theme: Doesn't recognize all string-based query patterns

Pattern 2: XSS
- Misses: innerHTML, lacks sanitization suggestions
- Common theme: Incomplete vulnerability coverage
```

---

## Phase 2: Write Minimal Viable Skill

### Step 2.1: Address ONLY Identified Gaps

```markdown
---
name: security-review
description: Reviews code for common security vulnerabilities. Use when reviewing pull requests or preparing code for production.
---

# Security Review Skill

## Common SQL Injection Patterns Claude Misses

### 1. String Interpolation in Queries
```python
# VULNERABLE
query = f"SELECT * FROM users WHERE id = {user_id}"
cursor.execute(query)

# SECURE
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))
```

### 2. ORM Raw Methods with User Input
```python
# VULNERABLE
User.objects.raw(f"SELECT * FROM users WHERE name = '{name}'")

# SECURE
User.objects.filter(name=name)  # ORM handles escaping
```

## Common XSS Patterns Claude Misses

### 1. Direct innerHTML Assignment
```javascript
// VULNERABLE
element.innerHTML = userInput;

// SECURE
element.textContent = userInput;
// OR
element.innerHTML = DOMPurify.sanitize(userInput);
```
```

**Key Points:**
- Only covers what Claude missed in testing
- Concrete examples (not abstract descriptions)
- Minimal word count (every token earns its place)

### Step 2.2: Target the Gap, Not the Domain

❌ **Bad: Comprehensive SQL injection guide**
```markdown
## SQL Injection

SQL injection is a code injection technique that exploits
vulnerabilities in an application's software by injecting
malicious SQL statements into an entry field...
[500 words of general SQL injection knowledge]
```

✓ **Good: Specific failures Claude exhibits**
```markdown
## SQL Injection Patterns Claude Misses

### String Interpolation
Claude often misses f-string and format() based queries.

### ORM Raw Methods
Claude trusts raw() methods without checking for user input.
```

---

## Phase 3: Iterative Refinement

### Step 3.1: Create Iteration Tracker

```markdown
| Iteration | Test Score | Issues Found | Fixes Applied |
|-----------|------------|--------------|---------------|
| 0 (baseline) | 2/6 (33%) | - | - |
| 1 (draft) | 4/6 (67%) | Missing JSON-based SQL, setTimeout XSS | Added patterns |
| 2 (refined) | 6/6 (100%) | ✓ | Ship |
```

### Step 3.2: Test After Each Change

```bash
# Re-run same scenarios with updated skill
"Review this code for SQL injection:
User.objects.raw(f\"SELECT * FROM users WHERE name = '{name}'\")"

# Document result
✓ Now catches this pattern
```

### Step 3.3: Stop When Baseline Achieved

When Claude passes all baseline scenarios consistently across Haiku, Sonnet, and Opus, the skill is complete.

**Don't add more content "just in case."**

---

## Cross-Model Testing

### Testing Matrix

| Model | Test Set 1 | Test Set 2 | Test Set 3 | Overall | Notes |
|-------|------------|------------|------------|---------|-------|
| Haiku | 4/6 | 5/6 | 3/6 | 12/18 (67%) | Struggles with complex patterns |
| Sonnet | 6/6 | 6/6 | 5/6 | 17/18 (94%) | Optimal performance |
| Opus | 6/6 | 6/6 | 6/6 | 18/18 (100%) | No significant improvement |

**Decision:** Ship if Sonnet ≥ 90%. Note if Haiku struggles significantly.

### Fresh Instance Testing

❌ **Don't** test with the Claude instance that helped write the skill
✓ **Do** test with fresh conversations to simulate real usage

---

## Evaluation Templates

### Test Scenario Template

```yaml
scenario_name: Brief descriptive name
trigger_condition: When does this apply in real usage?

input:
  user_prompt: |
    The exact user input that should trigger this skill

expected_behavior:
  - Skill is triggered (check name/description)
  - Specific workflow is followed
  - Output matches expected format

baseline_result:
  what_happened_without_skill: |
    What Claude does without the skill
  gap_identified: |
    What Claude misses or gets wrong

target_result:
  what_should_happen_with_skill: |
    Expected behavior with skill installed
```

### Example Filled Template

```yaml
scenario_name: Detect SQL Injection in ORM Raw Queries
trigger_condition: User asks to review Python code for security issues

input:
  user_prompt: |
    Review this Django code for security vulnerabilities:
    ```python
    def get_user(username):
        return User.objects.raw(f"SELECT * FROM auth_user WHERE username = '{username}'")
    ```

expected_behavior:
  - Security review skill triggers
  - Identifies SQL injection in raw() query
  - Suggests using filter() instead

baseline_result:
  what_happened_without_skill: |
    Claude reviewed the code but missed the SQL injection
    in the raw() query. It suggested checking for authentication
    but didn't flag the f-string interpolation.
  gap_identified: |
    Claude doesn't recognize that raw() methods with f-strings
    are vulnerable when they include user input.

target_result:
  what_should_happen_with_skill: |
    Claude identifies the SQL injection vulnerability and
    suggests: User.objects.filter(username=username) as the
    secure alternative.
```

---

## Advanced Evaluation Techniques

### A/B Testing Different Approaches

Test two versions of content to see which performs better:

```markdown
| Version | Test Pass Rate | Token Count | Preference |
|---------|----------------|-------------|------------|
| A (verbose examples) | 8/10 (80%) | 1200 tokens | Lower recall, high precision |
| B (canonical patterns) | 9/10 (90%) | 400 tokens | ✓ Best balance |
| C (minimal checklist) | 7/10 (70%) | 200 tokens | Too minimal |
```

### Negative Testing

Test what happens when skill should NOT trigger:

```yaml
negative_scenario_1:
  name: Don't trigger on general code review
  input: "Review this code for style issues"
  expected: Security skill does NOT activate
```

### Edge Case Coverage

Identify and test edge cases:

```markdown
Edge Cases to Test:
- Empty/missing input
- Malformed code
- Mixed vulnerability types
- Language-specific variations
- Framework-specific patterns
```

---

## Evaluation Checklist

Before shipping any skill:

### Baseline Coverage
- [ ] Ran baseline tests without skill
- [ ] Documented all failure modes
- [ ] Wrote content targeting ONLY those failures

### Iterative Testing
- [ ] Tested each iteration
- [ ] Documented improvements per iteration
- [ ] Stopped adding content when baseline achieved

### Cross-Model Validation
- [ ] Tested with Haiku
- [ ] Tested with Sonnet
- [ ] Tested with Opus (optional if Sonnet performs well)

### Real Usage Validation
- [ ] Tested with fresh Claude instance
- [ ] Tested with real user scenarios
- [ ] Observed usage patterns

### Edge Cases
- [ ] Tested negative cases (when NOT to trigger)
- [ ] Tested edge cases
- [ ] Tested error conditions

### Token Efficiency
- [ ] Removed redundant content
- [ ] Used canonical examples over exhaustive lists
- [ ] Verified SKILL.md under 500 lines

### Security
- [ ] Reviewed for security issues
- [ ] No hardcoded credentials
- [ ] No obfuscated code
- [ ] See SECURITY.md for complete audit

---

## Common Evaluation Pitfalls

### Pitfall 1: Testing Only Success Cases

❌ **Bad:** Only testing scenarios where the skill should work
✓ **Good:** Also testing when the skill should NOT trigger

### Pitfall 2: Content Based on Assumptions

❌ **Bad:** Writing content based on what you think Claude needs
✓ **Good:** Writing content based on what you observe Claude missing

### Pitfall 3: Over-Generalization

❌ **Bad:** "Claude needs help with SQL injection"
✓ **Good:** "Claude misses SQL injection in f-strings and raw() queries"

### Pitfall 4: Stopping Too Early

❌ **Bad:** Testing with the Claude that helped write the skill
✓ **Good:** Testing with fresh instances and real users

### Pitfall 5: Adding "Just In Case" Content

❌ **Bad:** Adding content for scenarios you haven't tested
✓ **Good:** Only addressing verified failure modes

---

## Summary: The Evaluation-First Loop

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐ │
│  │   Test       │ ───▶ │  Document    │ ───▶ │  Write   │ │
│  │  Baseline    │      │   Failures   │      │  Content │ │
│  └──────────────┘      └──────────────┘      └──────────┘ │
│         ▲                                        │         │
│         │                                        │         │
│         ▼                                        ▼         │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐ │
│  │   Ship      │ ◀─── │  Achieve     │ ◀─── │  Retest  │ │
│  │  When Ready  │      │   Baseline   │      │          │ │
│  └──────────────┘      └──────────────┘      └──────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key insight:** Every iteration is data-driven. No content is written without a corresponding observed failure.

---

**See also:**
- CONCEPTS.md for understanding the "why" behind evaluation-first
- BEST_PRACTICES.md for writing effective skill content
- GETTING_STARTED.md for hands-on tutorials
