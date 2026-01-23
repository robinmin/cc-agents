# Task Estimation

This document provides detailed guidance on estimating effort and complexity for software development tasks.

## Table of Contents

- [Estimation Techniques](#estimation-techniques)
- [When to Use Each Technique](#when-to-use-each-technique)
- [Best Practices](#best-practices)
- [Complexity Estimation](#complexity-estimation)

---

## Estimation Techniques

### PERT (Program Evaluation Review Technique)

**Best for:** Complex projects with uncertain elements

**Formula:**
```
Estimated = (Optimistic + 4 × Likely + Pessimistic) / 6
```

**Example:**
```
Task: "Implement OAuth2 authentication"

Optimistic:  40 hours (best case, everything works)
Likely:      60 hours (most probable scenario)
Pessimistic: 100 hours (everything goes wrong)

Estimated = (40 + 4×60 + 100) / 6
           = (40 + 240 + 100) / 6
           = 380 / 6
           = 63.3 hours

Add buffer (50% for complexity): 63.3 × 1.5 = ~95 hours
```

**When to use PERT:**
- High uncertainty
- Multiple unknowns
- External dependencies
- New technology or domain

**Advantages:**
- Accounts for uncertainty
- Provides weighted average
- Forces consideration of scenarios

**Disadvantages:**
- Requires three estimates
- Can be time-consuming
- Subjective inputs

---

### T-Shirt Sizing

**Best for:** High-level planning and roadmap work

**Size Definitions:**

| Size | Hours | Complexity | Example |
|------|-------|------------|---------|
| **XS** | < 4 hours | Trivial | Fix typo, change text |
| **S** | 4-8 hours | Low | Add simple validation |
| **M** | 8-16 hours | Medium | Add REST endpoint |
| **L** | 16-32 hours | High | Add feature with UI |
| **XL** | 32-64 hours | Very High | Multi-system integration |
| **XXL** | > 64 hours | Epic | Break down further |

**Usage Guidelines:**
- Use for initial sizing only
- Convert to hours for detailed planning
- Re-estimate after decomposition
- Account for team velocity variations

**Example Mapping:**
```
Feature: "Add user authentication"

Initial sizing: XL (too large, break down)

After decomposition:
- Task 1: Design auth flow → S (8 hours)
- Task 2: Implement user model → M (12 hours)
- Task 3: Create auth service → L (20 hours)
- Task 4: Add auth endpoints → M (16 hours)
- Task 5: Implement session → M (14 hours)
- Task 6: Add auth tests → S (6 hours)

Total: 76 hours → Valid L-sized feature
```

**Advantages:**
- Fast and intuitive
- Good for high-level planning
- Easy to communicate
- Supports relative sizing

**Disadvantages:**
- Not precise enough for detailed planning
- Different interpretations of sizes
- Requires calibration for team

---

### Time-Boxing

**Best for:** Fixed deadlines, MVP planning, sprint planning

**Approach:**
```
Given: 2-week sprint (80 hours available)

Step 1: Subtract overhead (meetings, admin)
Available: 80 - 16 = 64 hours

Step 2: Reverse-engineer task scope
Instead of "how long will this take?"
Ask "what can we realistically complete in 64 hours?"

Step 3: Cut scope to fit
If feature estimates at 80 hours:
- Remove non-essential features
- Simplify implementation
- Defer to next sprint
```

**When to use time-boxing:**
- Fixed release dates
- MVP planning
- Sprint planning
- Resource-constrained projects

**Time-Boxing Strategies:**

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| **Cut scope** | Remove features to fit timebox | MVP, iterative releases |
| **Simplify** | Use simpler implementation | Technical debt, rewrites |
| **Defer** | Move features to later phases | Roadmap planning |
| **Parallelize** | Add resources (if possible) | Large projects |

**Advantages:**
- Ensures predictable delivery
- Forces scope prioritization
- Encourages realistic planning
- Supports incremental delivery

**Disadvantages:**
- May sacrifice quality
- Can lead to technical debt
- May not reflect actual complexity
- Requires scope flexibility

---

### Historical Analysis

**Best for:** Projects with similar past work

**Approach:**
```
Step 1: Find similar past tasks
Search: "authentication implementation completed in 2024"

Step 2: Gather actual data
- Task: "Add OAuth2 Google provider"
- Estimated: 20 hours
- Actual: 32 hours
- Variance: +60%

Step 3: Apply variance to new estimate
New task: "Add OAuth2 GitHub provider"
Base estimate: 20 hours
Adjusted: 20 × 1.6 = 32 hours

Step 4: Refine based on differences
- GitHub API simpler than Google
- Reduce by 20%
- Final: 32 × 0.8 = ~26 hours
```

**Data to Track:**
- Original estimate
- Actual hours spent
- Variance percentage
- Reasons for variance
- Complexity factors
- Team member(s)

**Historical Data Template:**
```
Task: OAuth2 Google Provider
Estimated: 20 hours
Actual: 32 hours
Variance: +60%

Variance Reasons:
- Underestimated API complexity
- Token refresh edge cases
- Testing took longer than expected

Lessons Learned:
- Add 50% buffer for OAuth integrations
- Include comprehensive testing from start
- Research API limitations before estimating
```

**Advantages:**
- Based on real data
- Improves over time
- Accounts for team velocity
- Identifies estimation patterns

**Disadvantages:**
- Requires historical data
- May not apply to novel work
- Assumes similar conditions
- Requires discipline to track

---

### Expert Judgment

**Best for:** Specialized tasks, new technologies, unique domains

**Process:**
```
Step 1: Identify domain experts
- Who has implemented this before?
- Who understands the technology?
- Who knows the system architecture?

Step 2: Present task to experts
- Share requirements
- Explain context
- Identify constraints

Step 3: Gather estimates
- Collect estimates from multiple experts
- Ask for reasoning
- Document assumptions

Step 4: Reconcile differences
Expert A: 16 hours (optimistic)
Expert B: 32 hours (pessimistic)
Expert C: 24 hours (realistic)

Final: Use PERT with expert inputs as three points
Estimated: (16 + 4×24 + 32) / 6 = 24 hours
```

**When to use expert judgment:**
- New technology
- Unique requirements
- Complex integrations
- Specialized domains

**Advantages:**
- Leverages specialized knowledge
- Accounts for hidden complexities
- Multiple perspectives
- Can identify risks early

**Disadvantages:**
- Subjective
- Expert availability
- May reflect individual biases
- Hard to validate

---

## When to Use Each Technique

### Decision Matrix

| Situation | Primary Technique | Secondary Technique |
|-----------|-------------------|---------------------|
| **Simple, well-understood** | Expert Judgment | Historical Analysis |
| **Complex, uncertain** | PERT | Expert Judgment |
| **High-level planning** | T-Shirt Sizing | Historical Analysis |
| **Fixed deadline** | Time-Boxing | T-Shirt Sizing |
| **Similar past work** | Historical Analysis | Expert Judgment |
| **New technology** | Expert Judgment | PERT |
| **Multiple unknowns** | PERT | Expert Judgment |
| **Sprint planning** | Time-Boxing | Historical Analysis |
| **Roadmap planning** | T-Shirt Sizing | Expert Judgment |

### Technique Combinations

**For best results, combine techniques:**

```
Example: Complex feature with deadline

1. Use T-Shirt Sizing for initial assessment
   → Feature sized as "XL"

2. Use Historical Analysis for baseline
   → Similar feature took 40 hours last time

3. Use Expert Judgment for adjustments
   → Experts say 2x complexity this time

4. Use PERT for final estimate
   → Optimistic: 60, Likely: 80, Pessimistic: 120
   → Estimated: (60 + 320 + 120) / 6 = 83 hours

5. Apply Time-Boxing if needed
   → If deadline is 1 week (40 hours), cut scope
```

---

## Best Practices

### Buffer Guidelines

**Always add buffer to estimates:**

| Complexity | Buffer | Example |
|------------|--------|---------|
| **Simple** | +20% | 10 hours → 12 hours |
| **Medium** | +50% | 20 hours → 30 hours |
| **Complex** | +100% | 30 hours → 60 hours |
| **Unknown** | +200% | 10 hours → 30 hours |

**Why buffers are necessary:**
- Unforeseen complications
- Context switching overhead
- Meeting and communication time
- Research and learning time
- Debugging and refactoring
- Documentation and testing
- Integration issues

### Estimation Process

**Step-by-step approach:**
```
1. UNDERSTAND THE TASK
   └─ Read requirements thoroughly
   └─ Identify constraints
   └─ Note unknowns

2. DECOMPOSE
   └─ Break into subtasks if large
   └─ Identify dependencies
   └─ Map integration points

3. CHOOSE TECHNIQUE
   └─ Based on uncertainty level
   └─ Based on available data
   └─ Based on time constraints

4. ESTIMATE
   └─ Apply chosen technique
   └─ Add appropriate buffer
   └─ Document assumptions

5. VALIDATE
   └─ Review with team
   └─ Compare with history
   └─ Adjust if needed

6. TRACK
   └─ Record actual time
   └─ Note variance reasons
   └─ Update historical data
```

### Common Estimation Mistakes

| Mistake | Why Happens | Solution |
|---------|-------------|----------|
| **Optimism bias** | We underestimate complexity | Add buffers, use PERT |
| **Ignoring dependencies** | Focus on single task | Map all dependencies first |
| **Forgetting testing** | Focus on implementation | Add 20-30% for testing |
| **Missing integration** | Focus on core code | Add integration tasks |
| **No buffer** | Pressure to be optimistic | Always add buffer |
| **One-number estimate** | Simplicity | Use range or PERT |
| **Ignoring research** | Assume knowledge | Add research tasks |
| **Forgetting documentation** | Not priority | Add documentation time |

### Re-Estimation

**When to re-estimate:**
- New information discovered
- Requirements change significantly
- Technical approach changes
- Dependencies shift
- Risks materialize
- Sprint/boundary reached

**Re-estimation process:**
```
1. Document variance from original estimate
2. Identify reasons for variance
3. Adjust future estimates based on learning
4. Communicate changes to stakeholders
5. Update historical data
```

---

## Complexity Estimation

### Task Count Estimation

**Use feature complexity to estimate task count:**

| Complexity | Task Count | Example |
|------------|------------|---------|
| **Simple** | 1-3 tasks | Single file/function change |
| **Medium** | 3-7 tasks | Multi-file feature |
| **High** | 7-15 tasks | Cross-system integration |
| **Very High** | 15+ tasks | Major architecture change |

**Examples:**

```
Simple: "Add email validation"
- Task 1: Add validation function
- Task 2: Add validation to registration
- Task 3: Add tests
→ 3 tasks (Simple)

Medium: "Add password reset"
- Task 1: Design flow
- Task 2: Implement token generation
- Task 3: Add reset endpoint
- Task 4: Create email template
- Task 5: Implement frontend form
- Task 6: Add tests
→ 6 tasks (Medium)

High: "Implement OAuth2"
- 12 tasks covering design, implementation,
  multiple providers, testing, docs
→ 12 tasks (High)
```

### Complexity Factors

**Factors that increase complexity:**

| Factor | Impact | Example |
|--------|--------|---------|
| **External APIs** | +50% | Third-party integrations |
| **Database changes** | +30% | Schema migrations |
| **Security requirements** | +40% | Auth, encryption |
| **Performance critical** | +30% | Optimization needed |
| **Multiple systems** | +60% | Cross-team coordination |
| **New technology** | +50% | Learning curve |
| **Unclear requirements** | +100% | Research needed |

**Complexity calculation example:**
```
Base estimate: 20 hours

Adjustments:
- External API: +50% (10 hours)
- Security requirements: +40% (8 hours)
- New technology: +50% (10 hours)

Total: 20 + 10 + 8 + 10 = 48 hours

Add buffer (medium complexity +50%):
48 × 1.5 = 72 hours
```

### Risk-Based Estimation

**Higher risk = larger estimates:**

| Risk Level | Buffer Multiplier | Example |
|------------|-------------------|---------|
| **Low** | 1.2x | Well-understood, internal |
| **Medium** | 1.5x | Some unknowns, standard complexity |
| **High** | 2.0x | External deps, new tech |
| **Critical** | 3.0x | Unproven approach, high stakes |

**Risk factors:**
- External dependencies (APIs, services)
- Integration complexity
- Team experience level
- Timeline pressure
- Quality requirements
- Regulatory compliance
