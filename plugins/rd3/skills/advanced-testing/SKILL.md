---
name: advanced-testing
description: "Advanced testing techniques: mutation testing, property-based testing (including AI-augmented), accessibility testing (WCAG 2.2), and code permutation testing for deeper QA workflows and SOTA test quality validation."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
type: technique
tags: [qa-depth, testing, mutation-testing, property-based-testing, accessibility, wcag-2.2, ai-augmented-testing]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: qa-depth
  interactions:
    - knowledge-only
  openclaw:
    emoji: "🧪"
see_also:
  - rd3:tdd-workflow
  - rd3:sys-testing
  - rd3:sys-debugging
  - rd3:frontend-design
---

# rd3:advanced-testing — Advanced Testing Techniques

Advanced techniques for validating test quality beyond coverage metrics.

## Overview

Advanced techniques validate test quality: mutation analysis, property-based testing, accessibility, and implementation comparison.

## Quick Start

| Goal | Technique |
|------|-----------|
| Validate test quality | Mutation testing |
| Test algorithms/data structures | Property-based testing |
| Ensure UI accessibility | Accessibility testing |
| Compare implementations | Code permutation testing |

## Mutation Testing

**Purpose:** Introduce artificial bugs to validate test quality. If tests don't catch mutants, they won't catch real bugs.

### Tools

| Language | Tool |
|----------|------|
| Java | PIT (PITest) |
| JavaScript/TypeScript | Stryker Mutator |
| Python | mutmut |
| Go | gremlins |
| Ruby | mutant |
| PHP | infection |

### Target Scores

| Code Type | Target |
|-----------|--------|
| Critical (security, payments) | 80%+ |
| Business logic | 70%+ |
| Utilities | 60%+ |

### Quick Start (Python)

```bash
pip install mutmut
mutmut run
mutmut results  # Review survived mutants
mutmut apply    # Apply patches after review
```

### Common Mutations

Arithmetic: `+` → `-`, `*` → `/` | Conditionals: `if` → `else`, `==` → `!=` | Logical: `&&` → `||`, `!` → remove

See `references/mutation-testing-guide.md` for complete guide.

## Property-Based Testing

**Purpose:** Test invariants across hundreds of random inputs instead of specific examples.

### Tools

| Language | Tool |
|----------|------|
| Python | Hypothesis |
| JavaScript/TypeScript | fast-check |
| Haskell | QuickCheck |
| Scala | ScalaCheck |
| Rust | proptest |

### Example (Python)

```python
from hypothesis import given, strategies as st

@given(st.integers(), st.integers())
def test_add_commutative(a, b):
    assert add(a, b) == add(b, a)  # Order doesn't matter

@given(st.lists(st.integers()))
def test_reverse_twice(lst):
    assert reverse(reverse(lst)) == lst  # Idempotent

@given(st.text())
def test_roundtrip(text):
    assert decode(encode(text)) == text  # Round-trip
```

### Common Properties

| Property | Description | Example |
|----------|-------------|---------|
| Round-trip | Serialize → deserialize returns original | `parse(format(data)) == data` |
| Idempotence | Operation twice = once | `sort(sort(x)) == sort(x)` |
| Commutativity | Order doesn't matter | `op(a, b) == op(b, a)` |
| Associativity | Grouping doesn't matter | `op(op(a, b), c) == op(a, op(b, c))` |
| Inverse | Opposites cancel | `encrypt(decrypt(x)) == x` |

See `references/property-based-testing.md` for complete guide.

## Accessibility Testing

**Purpose:** Ensure UI is accessible to all users, including assistive technology users.

### Test Categories

| Category | Test | Tools |
|----------|------|-------|
| Keyboard navigation | All functions via Tab | Manual + Playwright |
| Screen reader | ARIA labels, semantic HTML | JAWS/NVDA + axe |
| Color contrast | WCAG AA 4.5:1 ratio | axe, Pa11y |
| Focus management | Logical tab order, visible | Playwright |
| Forms | Labels, error announcements | jest-axe |

### Tools

| Tool | Type | Use Case |
|------|------|----------|
| jest-axe | Component | React/Vue components |
| Playwright | E2E | Full accessibility tree |
| Pa11y | CLI | CI/CD integration |
| Axe DevTools | Browser | Manual testing |
| WAVE | Browser | Quick audits |

### Example (jest-axe)

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('has no violations', async () => {
  const { container } = render(<MyComponent />);
  expect(await axe(container)).toHaveNoViolations();
});
```

### WCAG Levels

| Level | Requirement |
|-------|-------------|
| A | Minimum legal |
| AA | Recommended standard |
| AAA | Specialized applications |

See `references/accessibility-testing.md` for comprehensive guide.

## Code Permutation Testing

**Purpose:** Compare multiple implementations objectively before choosing one.

### When to Use

Algorithm selection, architecture decisions, framework choice, optimization strategies

### Process

1. Implement 2-3 approaches
2. Build test simulation environment
3. Evaluate against quality gates
4. Select winner based on weighted score

### Quality Gates (25% each)

| Gate | Metrics |
|------|---------|
| Performance | Response time, throughput, resources |
| Maintainability | Complexity, coverage, documentation |
| Reliability | Error handling, fault tolerance |
| Business | Time to market, TCO, risk |

### Example

```typescript
const results = await evaluateImplementations([
  bubbleSort,
  quickSort,
  mergeSort
], testData);

const winner = selectBest(results, {
  performance: 0.40,
  maintainability: 0.30,
  reliability: 0.20,
  business: 0.10
});
```

## AI-Augmented Testing (SOTA)

Combine advanced testing with AI capabilities for enhanced defect discovery.

### Agentic Property-Based Testing

Use AI agents to discover properties automatically from code behavior:

```typescript
// AI discovers invariants from code execution
// Pattern: Analyze implementation → Generate property candidates → Verify

test('AI-discovered properties hold', () => {
  // 1. AI analyzes implementation and generates property candidates
  const codeAnalysis = analyzeFunction(sortFunction, { sampleSize: 1000 });

  // 2. Extract discovered invariants
  const properties = codeAnalysis.invariants.map(invariant => ({
    strategy: generateStrategy(invariant.type),
    propertyFn: (input: unknown[]) => invariant.holds(input)
  }));

  // 3. Verify each discovered property with fast-check
  for (const property of properties) {
    fc.assert(
      fc.property(property.strategy, property.propertyFn)
    );
  }
});
```

**Key papers:**
- [Agentic Property-Based Testing (arXiv 2025)](https://arxiv.org/html/2510.09907v1) — AI-driven property discovery
- [An Empirical Evaluation of PBT (OOPSLA 2025)](https://cseweb.ucsd.edu/~mcoblenz/assets/pdf/OOPSLA_2025_PBT.pdf) — Empirical study showing PBT finds bugs example-based tests miss

### AI-Assisted Mutation Analysis

Use LLMs to generate more intelligent mutations:

```typescript
// LLM-guided mutation for semantically meaningful mutants
// Pattern: LLM analyzes code semantics → Generates targeted mutations

test('LLM-generated mutations reveal test gaps', async () => {
  // 1. Use LLM to analyze code and generate semantically meaningful mutations
  const codeContext = await analyzeCodeWithLLM(code, {
    focus: 'boundary-conditions',
    depth: 'semantic'
  });

  // 2. Generate mutations based on semantic understanding
  const mutations = codeContext.generateMutations({ count: 20 });

  // 3. Evaluate each mutation against test suite
  for (const mutant of mutations) {
    const result = runTests(mutant.code);
    if (result.passed) {
      console.log(`Survived mutant: ${mutant.description}`);
    }
  }
});
```

### Smart Test Generation

Use AI to generate challenging test cases that human testers miss:

```typescript
// AI generates adversarial edge cases
// Pattern: AI identifies weak points → Generates targeted inputs

test('AI-generated edge cases', async () => {
  // 1. AI analyzes function for potential failure modes
  const failureModes = await identifyFailureModes(parseEmail, {
    count: 50,
    strategy: 'adversarial'
  });

  // 2. Generate inputs targeting identified failure modes
  for (const input of failureModes) {
    expect(() => parseEmail(input)).not.toThrow();
  }
});
```

### Integration Patterns

| Pattern | Use Case | AI Role |
|---------|----------|---------|
| Property Discovery | Unknown invariants | Analyze code → suggest properties |
| Mutation Guidance | Better mutants | Understand semantics → target gaps |
| Edge Case Mining | Hidden failures | Identify patterns → generate cases |
| Test Oracle | Expected outputs | Predict behavior → generate assertions |

## Success Metrics

**Mutation Testing:** 80%+ score for critical code, survivors addressed
**Property-Based:** Invariants tested across 100+ inputs, counter-examples fixed
**Accessibility:** Zero WCAG AA violations, keyboard/screen reader verified
**Permutation:** Multiple implementations compared, winner documented
**AI-Augmented:** AI-discovered properties validated, LLM-guided mutants evaluated

## Additional Resources

- **`references/mutation-testing-guide.md`** — Mutation testing complete guide
- **`references/property-based-testing.md`** — Property-based testing complete guide
- **`references/accessibility-testing.md`** — Accessibility testing comprehensive guide
