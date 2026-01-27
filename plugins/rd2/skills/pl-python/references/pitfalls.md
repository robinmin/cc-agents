# Python Common Pitfalls & Gotchas

Complete guide to common Python mistakes and their solutions.

## Table of Contents

1. [Mutable Default Arguments](#mutable-default-arguments)
2. [Late Binding Closures](#late-binding-closures)
3. [Generator Exhaustion](#generator-exhaustion)
4. [Name Shadowing](#name-shadowing)
5. [Identity vs Equality](#identity-vs-equality)
6. [Modifying While Iterating](#modifying-while-iterating)
7. [Exception Handling Anti-Patterns](#exception-handling-anti-patterns)
8. [Import Pitfalls](#import-pitfalls)
9. [Async Pitfalls](#async-pitfalls)
10. [Quick Reference](#quick-reference)

---

## Mutable Default Arguments

### The Problem

Mutable default arguments share state across function calls.

```python
# BAD - Creates one list reused by all invocations
def process_items(items=[]):
    items.append("processed")
    return items

# First call
process_items()  # Returns ['processed']

# Second call - surprising result!
process_items()  # Returns ['processed', 'processed']

# Third call - keeps growing!
process_items()  # Returns ['processed', 'processed', 'processed']
```

### The Solution

Use `None` as default, then initialize inside function.

```python
# GOOD - Creates fresh list each time
def process_items(items=None):
    if items is None:
        items = []
    items.append("processed")
    return items

# All calls return ['processed']
process_items()  # ['processed']
process_items()  # ['processed']
process_items()  # ['processed']
```

### Planning Implications

- Always use `None` as default for mutable arguments (list, dict, set)
- Initialize mutable objects inside the function body
- Document expected behavior clearly

---

## Late Binding Closures

### The Problem

Closures capture variable references, not values.

```python
# BAD - All lambdas return the same final value
functions = [lambda: x for x in range(3)]

for func in functions:
    print(func())  # All print 2, not 0, 1, 2
```

### The Solution

Use default argument to bind value immediately.

```python
# GOOD - Use default argument to bind immediately
functions = [lambda x=x: x for x in range(3)]

for func in functions:
    print(func())  # Prints 0, 1, 2 correctly

# Alternative - Use factory function
def make_func(x):
    return lambda: x

functions = [make_func(x) for x in range(3)]
```

### Planning Implications

- Use default arguments when capturing loop variables in closures
- Consider factory functions for complex closure scenarios
- Be aware of closure behavior in list comprehensions

---

## Generator Exhaustion

### The Problem

Generators and iterators exhaust after one pass.

```python
gen = (x for x in range(3))

list(gen)  # [0, 1, 2]

# Second iteration returns nothing!
list(gen)  # []

# This causes bugs when generators are reused
def process_data(data):
    filtered = filter(lambda x: x > 1, data)
    print("First pass:", list(filtered))  # [2]
    print("Second pass:", list(filtered))  # [] - Empty!

process_data([1, 2, 3])
```

### The Solution

Materialize with `list()` if multiple iterations needed, or use `itertools.tee()`.

```python
# Option 1: Materialize explicitly
gen = list(x for x in range(3))

list(gen)  # [0, 1, 2]
list(gen)  # [0, 1, 2] - Still works!

# Option 2: Use itertools.tee() for independent iterators
import itertools

gen1, gen2 = itertools.tee((x for x in range(3)), 2)
list(gen1)  # [0, 1, 2]
list(gen2)  # [0, 1, 2]

# Option 3: Create generator fresh each time
def process_data(data):
    filtered = lambda: filter(lambda x: x > 1, data)
    print("First pass:", list(filtered()))  # [2]
    print("Second pass:", list(filtered()))  # [2]
```

### Planning Implications

- Document if generators are single-use
- Materialize with `list()` if multiple iterations needed
- Use `itertools.tee()` for independent iterators
- Consider returning lists instead of generators for small datasets

---

## Name Shadowing

### The Problem

Variable names can silently shadow built-ins.

```python
# BAD - Shadows built-in list
list = [1, 2, 3]

# Later: list() fails because list is now a variable
numbers = list("abc")  # TypeError: 'list' object is not callable

# Common shadowed built-ins to avoid
dict = {}      # Shadows dict()
id = 123       # Shadows id()
type = "text"  # Shadows type()
input = "data" # Shadows input()
str = "text"   # Shadows str()
int = 123      # Shadows int()
```

### The Solution

Use descriptive names that don't shadow built-ins.

```python
# GOOD - Use descriptive names
items = [1, 2, 3]
user_id = 123
content_type = "text"
user_input = "data"
text = "text"
count = 123
```

### Common Shadowed Names to Avoid

| Built-in | Alternative Name |
|----------|------------------|
| `list` | `items`, `values`, `elements` |
| `dict` | `mapping`, `lookup`, `registry` |
| `id` | `user_id`, `item_id`, `pk` |
| `type` | `content_type`, `data_type`, `kind` |
| `input` | `user_input`, `data`, `raw_input` |
| `str` | `text`, `string`, `content` |
| `int` | `count`, `number`, `integer` |
| `max` | `maximum`, `max_value` |
| `min` | `minimum`, `min_value` |
| `sum` | `total`, `aggregate` |

### Planning Implications

- Never assign to built-in names
- Use descriptive, domain-specific names
- Use linters (ruff, flake8) to catch shadowing
- Run `builtins.list` to see all built-in names

---

## Identity vs Equality

### The Problem

`is` checks identity (same object), `==` checks equality (same value).

```python
# BAD - Using is for value comparison
x = 256
y = 256
print(x is y)  # True (small integers cached)

x = 257
y = 257
print(x is y)  # False! (not cached, different objects)
print(x == y)  # True (same value)

# This causes unpredictable behavior
def check_value(value):
    if value is 256:  # Unreliable!
        return "cached"
    return "not cached"
```

### The Solution

Use `==` for value comparison, `is` only for singletons.

```python
# GOOD - Use == for value comparison
x = 257
y = 257
print(x == y)  # True

# Use is only for singletons (None, True, False)
if value is None:
    pass

if flag is True:
    pass

if flag is False:
    pass
```

### Singleton Checklist

Use `is` ONLY for these singletons:
- `None`
- `True`
- `False`
- `Ellipsis` (`...`)

Use `==` for everything else.

### Planning Implications

- Use `is` only for `None`, `True`, `False`
- Use `==` for all value comparisons
- Never rely on interning/caching for identity checks
- Document expected comparison behavior

---

## Modifying While Iterating

### The Problem

Modifying a list while iterating causes `RuntimeError`.

```python
# BAD - RuntimeError
items = [1, 2, 3, 4, 5]
for item in items:
    if item % 2 == 0:
        items.remove(item)  # RuntimeError: list changed size

# Also bad - modifying dict while iterating
mapping = {'a': 1, 'b': 2, 'c': 3}
for key in mapping:
    if mapping[key] == 2:
        del mapping[key]  # RuntimeError: dict changed size
```

### The Solution

Use list comprehension or iterate over a copy.

```python
# GOOD - List comprehension
items = [1, 2, 3, 4, 5]
items = [item for item in items if item % 2 != 0]

# GOOD - Iterate over copy
items = [1, 2, 3, 4, 5]
for item in items[:]:  # Slice creates a copy
    if item % 2 == 0:
        items.remove(item)

# GOOD - Use filter()
items = list(filter(lambda x: x % 2 != 0, items))

# For dictionaries - use list() to copy keys
mapping = {'a': 1, 'b': 2, 'c': 3}
for key in list(mapping.keys()):  # list() creates copy
    if mapping[key] == 2:
        del mapping[key]

# Or use dict comprehension
mapping = {k: v for k, v in mapping.items() if v != 2}
```

### Planning Implications

- Never modify a collection while iterating
- Use comprehensions for filtering transformations
- Use `list()` or slicing to create copies when needed
- Document if function modifies input in place

---

## Exception Handling Anti-Patterns

### Bare Except Clauses

```python
# BAD - Catches everything including SystemExit/KeyboardInterrupt
try:
    risky_operation()
except:
    pass  # Silently ignores all errors

# GOOD - Catch specific exceptions
try:
    risky_operation()
except (ValueError, TypeError) as e:
    logger.error(f"Expected error: {e}")
    raise
```

### Swallowing Exceptions

```python
# BAD - Loses error context
try:
    parse_config(config_string)
except Exception as e:
    pass  # Error lost forever

# GOOD - Log and re-raise
try:
    parse_config(config_string)
except Exception as e:
    logger.exception("Config parsing failed")
    raise
```

### Planning Implications

- Always catch specific exception types
- Use `logger.exception()` to capture full stack traces
- Re-raise with context when appropriate
- Never use bare `except:` clauses

---

## Import Pitfalls

### Circular Imports

```python
# module_a.py
from module_b import func_b

def func_a():
    func_b()

# module_b.py
from module_a import func_a

def func_b():
    func_a()

# Error: ImportError: cannot import name 'func_a'
```

### Solution: Deferred Imports

```python
# module_a.py
def func_a():
    from module_b import func_b  # Import inside function
    func_b()

# OR use __init__.py for organization
# package/__init__.py
from .module_a import func_a
from .module_b import func_b
```

### Planning Implications

- Design module structure to avoid circular dependencies
- Use deferred imports (inside functions) when necessary
- Consider `__init__.py` imports for package-level APIs

---

## Async Pitfalls

### Blocking the Event Loop

```python
# BAD - Blocks entire event loop
async def process():
    time.sleep(1)  # Blocks all async operations
    return "done"

# GOOD - Non-blocking
async def process():
    await asyncio.sleep(1)  # Yields to event loop
    return "done"
```

### Fire-and-Forget Tasks

```python
# BAD - Errors are silently ignored
asyncio.create_task(risky_function())  # No await

# GOOD - Track tasks
task = asyncio.create_task(risky_function())
all_tasks = asyncio.all_tasks()
```

### Planning Implications

- Never use blocking calls (`time.sleep()`, `requests.get()`) in async
- Always use `asyncio.sleep()` instead of `time.sleep()`
- Track tasks or await them to handle errors
- See `references/async-patterns.md` for complete async guidance

---

## Quick Reference

### Anti-Patterns to Avoid

| Anti-Pattern | Solution |
|--------------|----------|
| `def f(x=[]):` | `def f(x=None):` if x is None: x = [] |
| `[lambda: x for x in range(3)]` | `[lambda x=x: x for x in range(3)]` |
| `if x is 256:` | `if x == 256:` |
| `for x in lst: lst.remove(x)` | `lst = [x for x in lst if condition]` |
| `except: pass` | `except SpecificError:` |
| `time.sleep()` in async | `await asyncio.sleep()` |
| `list = [...]` | `items = [...]` |

### Checklist for Code Review

- [ ] No mutable default arguments
- [ ] Closures bind values correctly (default args)
- [ ] Generators handled as single-use or materialized
- [ ] No shadowing of built-in names
- [ ] `is` used only for `None`, `True`, `False`
- [ ] No modification of collections while iterating
- [ ] Specific exception types caught
- [ ] Async functions don't block event loop
- [ ] Imports don't create circular dependencies

---

## References

- [Python Common Gotchas](https://docs.python.org/3/faq/programming.html)
- [Python Anti-Patterns](https://docs.quantifiedcode.com/python-anti-patterns/)
- [AsyncIO Pitfalls](https://docs.python.org/3/library/asyncio.html)
