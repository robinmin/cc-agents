---
name: advanced-testing
description: Use when implementing mutation testing, property-based testing, accessibility testing, or code permutation testing. Covers advanced techniques for validating test quality beyond coverage.
triggers:
  - mutation testing
  - property-based testing
  - accessibility testing
  - code permutation
  - test quality validation
  - invariant testing
  - PBT
  - WCAG testing
---

# Advanced Testing Techniques

## Overview

Advanced techniques validate test quality beyond coverage: mutation analysis, property-based testing, accessibility, and implementation comparison.

## Quick Start

| Goal | Technique |
|------|-----------|
| Validate test quality | Mutation testing |
| Test algorithms/data structures | Property-based testing |
| Ensure UI accessibility | Accessibility testing |
| Compare implementations | Code permutation testing |

## Workflows

### Workflow 1: Mutation Testing Setup

**Goal:** Validate test suite catches real bugs.

1. Install mutation tool for your language (see [Tools](#tools))
2. Set baseline: Run without mutations to ensure tests pass
3. Run mutation analysis: `mutmut run` or equivalent
4. Review survived mutants (tests didn't catch)
5. Add tests to kill survived mutants
6. Re-run until target score: 80%+ for critical code

**When to use:** Security-critical code, complex algorithms, refactoring legacy code

### Workflow 2: Property-Based Testing

**Goal:** Test invariants across hundreds of random inputs.

1. Identify properties that should always be true (round-trip, idempotence, etc.)
2. Install PBT library: Hypothesis (Python), fast-check (JS)
3. Write property test with strategy generators
4. Run with default iterations (100+)
5. Analyze any counter-examples found
6. Fix code or adjust property

**When to use:** Algorithms, data structures, serialization, state machines

### Workflow 3: Accessibility Testing

**Goal:** Ensure WCAG AA compliance.

1. Install testing tool: jest-axe (components) or Playwright (E2E)
2. Add accessibility test to component suite
3. Test keyboard navigation manually (Tab through UI)
4. Check color contrast with axe DevTools
5. Verify screen reader announces key elements
6. Run in CI/CD pipeline to catch regressions

**When to use:** All UI components, critical user flows, design systems

### Workflow 4: Code Permutation Testing

**Goal:** Compare multiple implementations objectively.

1. Implement 2-3 approaches to same problem
2. Define quality gates: performance, maintainability, reliability, business
3. Create simulation test environment
4. Run all implementations against same test data
5. Score each gate (25% each, or weight as needed)
6. Select winner based on total score

**When to use:** Algorithm selection, architecture decisions, framework choice

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

```javascript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('has no violations', async () => {
  render(<MyComponent />);
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

```python
results = evaluate_implementations([
    bubble_sort,
    quick_sort,
    merge_sort
], test_data)

winner = select_best(results, weights={
    'performance': 0.40,
    'maintainability': 0.30,
    'reliability': 0.20,
    'business': 0.10
})
```

## Success Metrics

**Mutation Testing:** 80%+ score for critical code, survivors addressed
**Property-Based:** Invariants tested across 100+ inputs, counter-examples fixed
**Accessibility:** Zero WCAG AA violations, keyboard/screen reader verified
**Permutation:** Multiple implementations compared, winner documented

## Related Skills

- `tdd-workflow` - Core TDD methodology
- `test-coverage` - Coverage requirements and measurement
- `references/mutation-testing-guide.md` - Mutation testing complete guide
- `references/property-based-testing.md` - Property-based testing complete guide
- `references/accessibility-testing.md` - Accessibility testing comprehensive guide

---

**Remember:** Advanced techniques complement solid TDD practices. Use them to validate test quality, discover edge cases, and ensure robust, accessible software.
