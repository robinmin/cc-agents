# Python Version Features

Complete guide to Python version-specific features for planning decisions.

## Table of Contents

1. [Version Selection Guide](#version-selection-guide)
2. [Python 3.13+ Features](#python-313-features)
3. [Python 3.12+ Features](#python-312-features)
4. [Python 3.11+ Features](#python-311-features)
5. [Python 3.10+ Features](#python-310-features)
6. [Python 3.9+ Features](#python-39-features)
7. [Version Decision Matrix](#version-decision-matrix)

---

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

### Usage Examples

```python
# TypeIs - Better than TypeGuard
from typing import TypeIs

def is_list_of_strings(val: list) -> TypeIs[list[str]]:
    """Narrows type more precisely than TypeGuard."""
    return all(isinstance(x, str) for x in val)

# ReadOnly TypedDict
from typing import ReadOnly, TypedDict

class Config(ReadOnly[str, str]):  # Immutable
    api_key: str
    endpoint: str

# Type parameter defaults
from typing import TypeVar

T = TypeVar("T", default=int)  # Default type parameter

class Container:
    def __init__(self, value: T = ...):  # Default to int
        self.value = value
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
# Quote reuse
message = f"Hello {name}"  # Can use quotes inside

# Multiline f-strings
message = f"""
    Name: {name}
    Value: {value}
"""

# Nested f-strings
message = f"Result: {f'{value}'}"
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
| Cancellation on error | No | Yes (cancels all) |
| Exception handling | First exception or all | ExceptionGroup |
| Orphaned tasks | Possible | Impossible |
| Scope | Unstructured | Structured (context manager) |

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

### asyncio.timeout() (PEP 678)

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
| Walrus operator | X | X | X | X | X | X |
| Generic collections | | X | X | X | X | X |
| Match statement | | | X | X | X | X |
| Union syntax (`A \| B`) | | | X | X | X | X |
| Self type | | | | X | X | X |
| TaskGroup | | | | X | X | X |
| Exception groups | | | | X | X | X |
| Type parameter syntax | | | | | X | X |
| @override decorator | | | | | X | X |
| TypeIs | | | | | | X |

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
| `match` statement | 3.10 |
| `X \| Y` union types | 3.10 |
| Walrus `:=` operator | 3.8 |
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
```

---

## References

- [Python 3.13 Release Notes](https://docs.python.org/3.13/whatsnew/3.13.html)
- [Python 3.12 Release Notes](https://docs.python.org/3.12/whatsnew/3.12.html)
- [Python 3.11 Release Notes](https://docs.python.org/3.11/whatsnew/3.11.html)
- [PEP 654 - Exception Groups](https://peps.python.org/pep-0654/)
- [PEP 673 - Self Type](https://peps.python.org/pep-0673/)
