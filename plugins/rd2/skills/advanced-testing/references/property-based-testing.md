# Property-Based Testing Guide

**Load this reference when:** You need to test code with many possible inputs, validate invariants, or find edge cases that example-based tests miss.

## Overview

Property-based testing (PBT) generates hundreds of random inputs and tests that specific **properties** (invariants) hold true across all inputs, rather than testing specific examples.

**Core principle:** Test that a property holds for ALL valid inputs, not just hand-picked examples.

> "Property-based testing combines human domain understanding with machine computation to find edge cases humans wouldn't think of."

Sources:
- [An Empirical Evaluation of Property-Based Testing in Python (OOPSLA 2025)](https://cseweb.ucsd.edu/~mcoblenz/assets/pdf/OOPSLA_2025_PBT.pdf)
- [Agentic Property-Based Testing: Finding Bugs (arXiv 2025)](https://arxiv.org/html/2510.09907v1)
- [Property-Based Testing with Hypothesis (Nov 2024)](https://fasihkhatib.com/2024/11/24/Property-based-testing-with-Hypothesis/)
- [Python Summit: Property-Based Testing with Hypothesis (2024)](https://www.python-summit.ch/recordings/sps24_florian_bruhin_-_property_based-testing_with_hypothesis/sps24_florian_bruhin_-_property_based-testing-with_hypothesis.pdf)

## Example-Based vs Property-Based

### Example-Based Testing (Traditional)

```python
# Traditional unit tests: specific examples
def test_add_positive_numbers():
    assert add(2, 3) == 5

def test_add_negative_numbers():
    assert add(-2, -3) == -5

def test_add_zero():
    assert add(5, 0) == 5

# What about floats? Large numbers? Edge cases? You have to think of them all.
```

### Property-Based Testing

```python
# Property-based: test a property for MANY inputs
from hypothesis import given, strategies as st

@given(st.integers(), st.integers())
def test_add_commutative(a, b):
    # Property: Addition is commutative (order doesn't matter)
    assert add(a, b) == add(b, a)

@given(st.integers(), st.integers())
def test_add_identity(a, b):
    # Property: Adding zero doesn't change value
    assert add(a, 0) == a

@given(st.integers(), st.integers(), st.integers())
def test_add_associative(a, b, c):
    # Property: Addition is associative
    assert add(add(a, b), c) == add(a, add(b, c))
```

**Hypothesis automatically generates 100+ random integer combinations**, including:
- Positive and negative numbers
- Zero
- Large numbers
- Edge cases you wouldn't think of

## How Property-Based Testing Works

### 1. Define Property (Invariant)

Identify something that should **always** be true:

| Function | Property |
|----------|----------|
| `reverse(reverse(list))` | Always equals original list |
| `sort(list)` | Always in ascending order |
| `parse(format(date))` | Always equals original date |
| `compress(decompress(data))` | Always equals original data |

### 2. Generate Random Inputs

Testing framework generates hundreds of inputs:
- Random integers, strings, lists
- Edge cases (empty, null, max values)
- Combinations of inputs

### 3. Shrink Failures

When a failure is found, framework **shrinks** input to minimal case:

```
Failed with: [982347, 123456, -987654, 0, 42, ...]
Shrinking...
Failed with: [982347, 123456]
Shrinking...
Failed with: [1, 0]  ← Minimal failing case!
```

## Tools by Language

### Python: Hypothesis

**Installation:**
```bash
pip install pytest-hypothesis
```

**Basic Usage:**
```python
from hypothesis import given, strategies as st

@given(st.integers(), st.integers())
def test_multiply_by_zero(a, b):
    # Property: Multiplying by zero always equals zero
    assert a * 0 == 0
```

**Built-in Strategies:**
```python
st.integers()           # Any integer
st.integers(min_value=0, max_value=100)  # Bounded
st.text()               # Any string
st.text(alphabet='abc', min_size=0, max_size=10)  # Constrained
st.lists(st.integers()) # List of integers
st.dictionaries(st.text(), st.integers())  # Dict
st.tuples(st.integers(), st.text())  # Tuple
st.frozensets(st.integers())  # Set
```

**Custom Strategies:**
```python
from hypothesis import strategies as st

# Strategy for user data
user_strategy = st.builds(dict,
    name=st.text(min_size=1, max_size=50),
    age=st.integers(min_value=18, max_value=120),
    email=st.emails(),
)

@given(user_strategy)
def test_user_validation(user):
    assert is_valid_user(user) == validate_user(user)
```

### JavaScript: Fast-Check

**Installation:**
```bash
npm install --save-dev fast-check
```

**Basic Usage:**
```typescript
import fc from 'fast-check';

test('reverse is involutive', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      // Property: Reversing twice returns original
      return arr.reverse().reverse() === arr;
    })
  );
});
```

### Haskell: QuickCheck

**Original property-based testing framework:**

```haskell
-- Addition is commutative
prop_add_commutative :: Int -> Int -> Bool
prop_add_commutative a b = a + b == b + a

-- Run tests
main = quickCheck prop_add_commutative
```

### Other Languages

| Language | Tool |
|----------|------|
| **Java** | JUnit-Quickcheck |
| **C#** | FsCheck |
| **Go** | testing/quick |
| **Ruby** | Rantly |
| **PHP** | Eris |
| **Rust** | proptest |
| **Scala** | ScalaCheck |

## Common Properties to Test

### 1. Inverse Functions (Round-Trip)

```python
@given(st.text())
def test_parse_format_roundtrip(text):
    # Property: Parsing formatted data returns original
    assert parse(format(text)) == text
```

**Examples:**
- `json.loads(json.dumps(data))`
- `compress(decompress(data))`
- `parse(format(date))`

### 2. Idempotence

```python
@given(st.lists(st.integers()))
def test_sort_is_idempotent(lst):
    # Property: Sorting twice is same as sorting once
    assert sort(sort(lst)) == sort(lst)
```

### 3. Commutativity

```python
@given(st.integers(), st.integers())
def test_add_commutative(a, b):
    # Property: Order doesn't matter
    assert add(a, b) == add(b, a)
```

### 4. Associativity

```python
@given(st.integers(), st.integers(), st.integers())
def test_add_associative(a, b, c):
    # Property: Grouping doesn't matter
    assert add(add(a, b), c) == add(a, add(b, c))
```

### 5. Transformation Preserves Property

```python
@given(st.lists(st.integers()))
def test_reverse_preserves_length(lst):
    # Property: Reversing doesn't change length
    assert len(reverse(lst)) == len(lst)
```

### 6. Encoding/Decoding

```python
@given(st.binary())
def test_base64_roundtrip(data):
    # Property: Encoding then decoding returns original
    encoded = base64.encode(data)
    assert base64.decode(encoded) == data
```

### 7. Error Handling

```python
@given(st.integers(min_value=-1000, max_value=1000))
def test_sqrt_negative_input(x):
    # Property: Square root of negative raises error
    if x < 0:
        with pytest.raises(ValueError):
            sqrt(x)
    else:
        # Property: Sqrt squared equals original
        assert sqrt(x) ** 2 == x
```

## Stateful Property-Based Testing

For testing systems with state (databases, caches, etc.):

```python
from hypothesis.stateful import RuleBasedStateMachine, rule

class DatabaseStateMachine(RuleBasedStateMachine):
    def __init__(self):
        super().__init__()
        self.db = Database()
        self.data = {}

    @rule(key=st.text(), value=st.integers())
    def insert(self, key, value):
        self.db.insert(key, value)
        self.data[key] = value

    @rule(key=st.text())
    def lookup(self, key):
        result = self.db.lookup(key)
        expected = self.data.get(key, None)
        assert result == expected

TestDatabase = DatabaseStateMachine.TestCase
```

## When to Use Property-Based Testing

### Good Candidates

| Use Case | Why |
|----------|-----|
| **Data structures** | Many input combinations |
| **Algorithms** | Invariants to verify |
| **Parsers/serializers** | Round-trip properties |
| **Mathematical functions** | Commutativity, associativity |
| **State machines** | State transitions should preserve invariants |
| **APIs** | Contracts should hold for all inputs |

### Poor Candidates

- UI testing (too many variables)
- External dependencies (databases, APIs)
- Non-deterministic code (randomness, time)
- Performance testing (not suitable)

## Best Practices

### 1. Start with Example-Based Tests

```python
# 1. Write failing test first (TDD)
def test_add():
    assert add(2, 3) == 5  # Fails: add() doesn't exist

# 2. Implement to pass
def add(a, b): return a + b

# 3. THEN add property-based tests to find edge cases
@given(st.integers(), st.integers())
def test_add_commutative(a, b):
    assert add(a, b) == add(b, a)  # Catches more edge cases
```

### 2. Test Meaningful Properties

Don't just test random things:

```python
# BAD: Trivial property
@given(st.integers())
def test_add_returns_something(x):
    result = add(x, 5)
    assert result is not None  # Doesn't verify useful behavior

# GOOD: Mathematical invariant
@given(st.integers())
def test_add_returns_greater(x):
    result = add(x, 5)
    assert result > x  # Meaningful property
```

### 3. Use Appropriate Strategies

```python
# BAD: Too broad
@given(st.anything())  # Generates useless inputs
def test_parse(data): ...

# GOOD: Specific to domain
@given(st.json_objects())  # Only valid JSON
def test_parse_json(data): ...
```

### 4. Combine with Traditional Tests

```python
# Property-based: Find edge cases
@given(st.integers(), st.integers())
def test_divide_property(a, b):
    if b != 0:
        assert divide(a, b) * b == a  # Invariant

# Example-based: Document specific behavior
def test_divide_specific():
    assert divide(10, 2) == 5  # Documents expected behavior
```

## Common Pitfalls

### 1. Testing Implementation Details

```python
# BAD: Tests internal state
@given(st.lists(st.integers()))
def test_internal_state(lst):
    sorter = Sorter(lst)
    assert sorter.internal_array == sorted(lst)  # Implementation

# GOOD: Tests observable behavior
@given(st.lists(st.integers()))
def test_sorts_correctly(lst):
    assert sort(lst) == sorted(lst)  # Behavior
```

### 2. Ignoring Shrunk Failures

When Hypothesis finds a failure, it shrinks to minimal case:

```
Falsifying example:
test_add_overflow(
    a=2147483647, b=2147483647,  # Large numbers
)

Shrunk example:
test_add_overflow(
    a=1, b=9223372036854775807,  # Minimal failing case!
)
```

**Action:** Fix the bug for the minimal case, not the original failure.

### 3. Over-Complicated Properties

```python
# BAD: Hard to understand
@given(st.integers(), st.integers())
def test_complex_property(a, b):
    assert ((a + b) ** 2 - (a ** 2 + b ** 2)) == 2 * a * b

# GOOD: Clear, testable property
@given(st.integers(), st.integers())
def test_addition_invariant(a, b):
    result = add(a, b)
    assert result >= max(a, b)  # Clear invariant
```

## Quick Reference

| Language | Tool | Command |
|----------|------|---------|
| **Python** | Hypothesis | `pytest` (auto-detects `@given`) |
| **JavaScript** | fast-check | `npm test` |
| **Haskell** | QuickCheck | `cabal test` |
| **Java** | JUnit-Quickcheck | `mvn test` |
| **Go** | testing/quick | `go test` |
| **Rust** | proptest | `cargo test` |

## Key Takeaways

1. **Test invariants, not examples** - Properties that should always hold
2. **Let framework generate inputs** - Don't hand-pick test cases
3. **Shrinking finds minimal failures** - Fix the minimal case, not the original
4. **Combine with TDD** - Start with example-based, add property-based
5. **Use for algorithms/data structures** - Best for code with many input combinations
6. **Stateful testing for systems** - Test state machine invariants

---

For TDD fundamentals, see: `SKILL.md`
For mutation testing, see: `references/mutation-testing-guide.md`
