---
name: version-features
description: "Python 3.11-3.13 feature matrix for version-aware project planning"
see_also:
  - rd3:pl-python
---

# Python Version Features

Complete guide to Python version-specific features for planning decisions.

## Version Selection Guide

| Version | Release Date | Status | Recommended For |
|---------|--------------|--------|-----------------|
| **3.13+** | 2024-10 | Latest | Experimental features, JIT exploration |
| **3.12+** | 2023-10 | Stable | Modern syntax, type parameter syntax |
| **3.11+** | 2022-10 | **Recommended Baseline** | TaskGroup, Self, exception groups |
| **3.10+** | 2021-10 | Stable | Match statements, union syntax |
| **3.9+** | 2020-10 | Legacy | Generic collections |
| **3.8+** | 2019-10 | Minimum | Walrus operator, basic modern features |

**Selection Criteria:**
- **New projects (2024+)**: Use 3.11+ as baseline, consider 3.12+ for type syntax
- **Enterprise/LTS**: Use 3.11+ (stable, well-tested)
- **Experimental**: Use 3.13+ for free-threaded mode or JIT

---

## Python 3.13+ Features

### Experimental Features

| Feature | PEP | Description | Use Case |
|---------|-----|-------------|----------|
| **Free-threaded mode** | 703 | No GIL (experimental) | CPU-bound parallel workloads |
| **JIT compiler** | 744 | Copy-and-patch JIT | Performance optimization |
| **TypeIs** | 742 | Better type narrowing | Custom type guards |
| **ReadOnly TypedDict** | 705 | Immutable keys | Config objects |
| **Type parameter defaults** | 696 | Default generic values | Generic classes |

### TypeIs (PEP 742)

Better than `TypeGuard` for precise type narrowing:

```python
from typing import TypeIs

def is_list_of_strings(val: list) -> TypeIs[list[str]]:
    """Narrows type more precisely than TypeGuard."""
    return all(isinstance(x, str) for x in val)

# Usage
items: list[int] | list[str] = ["a", "b"]
if is_list_of_strings(items):
    # items is narrowed to list[str], not just list
    print(items[0].upper())  # OK - str has .upper()
```

### ReadOnly TypedDict (PEP 705)

```python
from typing import ReadOnly, TypedDict

class Config(TypedDict):
    api_key: ReadOnly[str]  # Immutable key
    endpoint: str           # Mutable key

cfg: Config = {"api_key": "secret", "endpoint": "..."}
# cfg["api_key"] = "new"  # Error - ReadOnly
cfg["endpoint"] = "new"  # OK
```

### Type Parameter Defaults (PEP 696)

PEP 696 allows default values for type parameters. Use with the PEP 695 syntax:

```python
# PEP 695 + PEP 696: type parameter with default
class Container[T=int]:
    def __init__(self, value: T):
        self.value = value

# T defaults to int
c = Container(42)           # Container[int]
c_str = Container("hello")  # Container[str] - inferred
c_explicit = Container[str]("hello")  # Container[str] - explicit
```

With the older `TypeVar` style (PEP 696 standalone):

```python
from typing import TypeVar, Generic

T = TypeVar("T", default=int)

class Container(Generic[T]):
    def __init__(self, value: T):
        self.value = value

c = Container(42)  # Container[int]
```

### When to Use 3.13+

**Use when:**
- Exploring free-threaded mode for CPU-bound parallelism
- Need JIT compilation for performance
- Want latest type system features

**Avoid when:**
- Requires stable production environment
- Team unfamiliar with experimental features
- Dependency compatibility uncertain

---

## Python 3.12+ Features

### Type Parameter Syntax (PEP 695)

**Old way (3.11 and below):**
```python
from typing import TypeVar, Generic

T = TypeVar("T")

class Container(Generic[T]):
    def __init__(self, value: T):
        self.value = value

def first(items: list[T]) -> T:  # Error in 3.11
    return items[0]
```

**New way (3.12+):**
```python
class Container[T]:
    def __init__(self, value: T):
        self.value = value

def first[T](items: list[T]) -> T:
    return items[0]
```

### @override Decorator (PEP 698)

```python
from typing import override

class Base:
    def method(self) -> str:
        return "base"

class Derived(Base):
    @override  # Error if base.method() doesn't exist
    def method(self) -> str:
        return "derived"
```

### F-string Enhancements (PEP 701)

```python
# Quote reuse inside f-strings
name = "World"
message = f"Hello {name}"

# Multiline f-strings
message = f"""
    Name: {name}
    Value: {value}
"""

# Debug formatting (3.8+)
x = 42
print(f"{x=}")  # x=42
print(f"{x + 1=}")  # x + 1=43
```

### Unpack for **kwargs (PEP 692)

```python
from typing import Unpack, TypedDict

class MovieKwargs(TypedDict):
    title: str
    year: int

def create_movie(**kwargs: Unpack[MovieKwargs]) -> None:
    pass

# Type-safe kwargs
create_movie(title="Inception", year=2010)
```

---

## Python 3.11+ Features (Recommended Baseline)

### asyncio.TaskGroup (PEP 654)

**Structured concurrency - preferred over gather():**

```python
import asyncio

async def fetch_all(urls: list[str]) -> list[dict]:
    """Structured concurrency with automatic error handling."""
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(fetch(url)) for url in urls]

    # All tasks complete or none do (no orphaned tasks)
    return [task.result() for task in tasks]
```

**Comparison with gather():**

| Feature | `asyncio.gather()` | `asyncio.TaskGroup` |
|---------|-------------------|---------------------|
| Cancellation on error | No (by default) | Yes (cancels all) |
| Exception handling | First exception or `return_exceptions=True` | ExceptionGroup |
| Orphaned tasks | Possible | Impossible |
| Scope | Unstructured | Structured (context manager) |

See `references/async-patterns.md` for detailed async pattern comparisons.

### typing.Self (PEP 673)

```python
from typing import Self

class Builder:
    def with_name(self, name: str) -> Self:
        self.name = name
        return self

    def with_age(self, age: int) -> Self:
        self.age = age
        return self

# Type-safe chaining
builder = Builder().with_name("Alice").with_age(30)
```

### Exception Groups (PEP 654)

```python
import asyncio

async def run_all():
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(task1())
            tg.create_task(task2())
            tg.create_task(task3())
    except* ExceptionGroup as eg:
        # Handle multiple exceptions
        for exc in eg.exceptions:
            print(f"Error: {exc}")
```

### asyncio.timeout()

```python
import asyncio

async def fetch_with_timeout(url: str):
    try:
        async with asyncio.timeout(5.0):
            return await fetch(url)
    except TimeoutError:
        print(f"Timeout fetching {url}")
        return None
```

---

## Python 3.10+ Features

### Match Statements (PEP 634)

```python
def handle_command(command: str):
    match command.split():
        case ["load", filename]:
            load_file(filename)
        case ["save", filename]:
            save_file(filename)
        case ["quit"]:
            exit()
        case _:
            print("Unknown command")
```

### Union Syntax (PEP 604)

```python
# Old way
from typing import Union

def process(value: Union[int, str]) -> str:
    return str(value)

# New way (3.10+)
def process(value: int | str) -> str:
    return str(value)
```

### TypeGuard (PEP 647)

```python
from typing import TypeGuard

def is_list_of_strings(val: list) -> TypeGuard[list[str]]:
    return all(isinstance(x, str) for x in val)

# Type narrows correctly
if is_list_of_strings(items):
    print(items[0].upper())  # Items is list[str]
```

---

## Python 3.9+ Features

### Generic Collections (PEP 585)

```python
# Old way
from typing import List, Dict, Tuple

def process(items: List[int], mapping: Dict[str, int]) -> Tuple[int, int]:
    pass

# New way (3.9+)
def process(items: list[int], mapping: dict[str, int]) -> tuple[int, int]:
    pass
```

### String Methods

```python
# Remove prefix/suffix
filename = "example_file_v2.txt"
clean = filename.removeprefix("example_").removesuffix("_v2.txt")
# clean = "file"
```

---

## Python 3.8+ Features (Minimum Modern)

### Walrus Operator (PEP 572)

```python
# Assignment expression
while (line := file.readline()) != "":
    process(line)

# In comprehensions
results = [y for x in data if (y := process(x)) is not None]
```

### Literal Types (PEP 586)

```python
from typing import Literal

def set_mode(mode: Literal["debug", "release"]) -> None:
    pass

set_mode("debug")    # OK
set_mode("verbose")  # Type error
```

### Final Types (PEP 591)

```python
from typing import Final

MAX_RETRIES: Final[int] = 3  # Constant
API_URL: Final[str] = "https://api.example.com"

class Connection:
    timeout: Final[int] = 30  # Cannot be overridden
```

---

## Version Decision Matrix

### Project Type Recommendations

| Project Type | Min Python | Recommended Python | Rationale |
|--------------|------------|-------------------|-----------|
| **New web service** | 3.11+ | 3.12+ | TaskGroup, type syntax |
| **Data processing** | 3.11+ | 3.12+ | Modern async, type safety |
| **Library (PyPI)** | 3.9+ | 3.10+ | Broad compatibility |
| **Enterprise app** | 3.11+ | 3.11+ | Stable LTS baseline |
| **Experimental** | 3.13+ | 3.13+ | Latest features |

### Feature Compatibility

| Feature | 3.8 | 3.9 | 3.10 | 3.11 | 3.12 | 3.13 |
|---------|-----|-----|------|------|------|------|
| Walrus operator `:=` | X | X | X | X | X | X |
| Generic collections | | X | X | X | X | X |
| Match statement | | | X | X | X | X |
| Union syntax `A \| B` | | | X | X | X | X |
| Self type | | | | X | X | X |
| TaskGroup | | | | X | X | X |
| Exception groups | | | | X | X | X |
| Type parameter syntax | | | | | X | X |
| @override decorator | | | | | X | X |
| TypeIs | | | | | | X |
| Type parameter defaults | | | | | | X |
| Free-threaded mode | | | | | | X |

### Migration Path

```
Start with 3.11+ (stable, modern)
    ↓
Need type parameter syntax?
    ↓ Yes
Upgrade to 3.12+
    ↓
Need experimental features?
    ↓ Yes
Upgrade to 3.13+ (with testing)
```

---

## Quick Reference

### Minimum Version for Common Features

| Feature | Min Version |
|---------|-------------|
| `asyncio.TaskGroup` | 3.11 |
| `typing.Self` | 3.11 |
| `asyncio.timeout()` | 3.11 |
| `typing.TypeIs` | 3.13 |
| `match` statement | 3.10 |
| `X \| Y` union types | 3.10 |
| `type[T]` generic syntax | 3.12 |
| `@override` decorator | 3.12 |
| Walrus `:=` operator | 3.8 |
| Generic collections (`list[int]`) | 3.9 |
| f-string `=` debug | 3.8 |
| `dataclasses` | 3.7 |
| f-strings | 3.6 |
| `pathlib` | 3.4 |

### pyproject.toml Version Specification

```toml
[project]
requires-python = ">=3.11"  # Recommended baseline

# For latest features
requires-python = ">=3.12"

# For maximum compatibility
requires-python = ">=3.9"

# For experimental features
requires-python = ">=3.13"
```

### Version-Specific Imports

```python
# Use future imports for forward compatibility
from __future__ import annotations  # 3.7+, enables PEP 563

# Conditional type hints based on version
import sys

if sys.version_info >= 3_11:
    from typing import Self
else:
    from typing import TypeVar
    Self = TypeVar("Self", bound="Builder")
```
