# Python Type System

Comprehensive guide to Python's type system for type-safe code.

## Table of Contents

1. [Type System Overview](#type-system-overview)
2. [Advanced Type Constructs](#advanced-type-constructs)
3. [TypeVar Best Practices](#typevar-best-practices)
4. [Protocol vs ABC](#protocol-vs-abc)
5. [Generic Classes and Functions](#generic-classes-and-functions)
6. [Type Checker Configuration](#type-checker-configuration)
7. [Common Patterns](#common-patterns)

---

## Type System Overview

### Type Hints Benefits

| Benefit | Description | Example |
|---------|-------------|---------|
| **IDE Support** | Autocomplete, refactoring | `user.` shows methods |
| **Early Error Detection** | Catch bugs before runtime | `mypy` finds type errors |
| **Documentation** | Self-documenting code | `def process(x: int) -> str:` |
| **Refactoring Safety** | Track type changes | Rename with confidence |

### Minimum Python Versions for Types

| Feature | Python Version |
|---------|----------------|
| Basic type hints (`x: int`) | 3.5+ |
| `typing` module | 3.5+ |
| Union syntax (`A \| B`) | 3.10+ |
| `typing.Self` | 3.11+ |
| Type parameter syntax (`def[T]`) | 3.12+ |

---

## Advanced Type Constructs

### TypeGuard (3.10+)

```python
from typing import TypeGuard, Any

def is_list_of_strings(val: list) -> TypeGuard[list[str]]:
    """Narrow type in conditionals."""
    return all(isinstance(x, str) for x in val)

def process(items: list):
    if is_list_of_strings(items):
        # Type narrowed to list[str]
        print(items[0].upper())  # OK
    else:
        # Type is list but not list[str]
        pass
```

### Protocol (3.8+)

```python
from typing import Protocol

class Renderable(Protocol):
    """Structural typing - duck typing with types."""

    def render(self) -> str: ...

def display(obj: Renderable) -> None:
    """Works with any object that has render()."""
    print(obj.render())

# Any class with render() method works
class Widget:
    def render(self) -> str:
        return "widget"

display(Widget())  # OK - Widget has render()
```

### Self (3.11+)

```python
from typing import Self

class Builder:
    def __init__(self) -> None:
        self.name: str | None = None
        self.age: int | None = None

    def with_name(self, name: str) -> Self:
        self.name = name
        return self

    def with_age(self, age: int) -> Self:
        self.age = age
        return self

# Type-safe chaining
builder = Builder().with_name("Alice").with_age(30)
```

### Never (3.11+)

```python
from typing import Never

def raise_error(message: str) -> Never:
    """This function never returns."""
    raise ValueError(message)

def handle(value: int | str) -> str:
    if isinstance(value, int):
        return str(value)
    elif isinstance(value, str):
        return value
    else:
        raise_error("Invalid type")  # Type checker knows this never returns
        # Any code here is unreachable
```

### Literal (3.8+)

```python
from typing import Literal

Mode = Literal["debug", "info", "error"]

def log(message: str, level: Mode) -> None:
    pass

log("test", "debug")  # OK
log("test", "verbose")  # Type error
```

### Final (3.8+)

```python
from typing import Final

MAX_RETRIES: Final[int] = 3  # Constant
API_URL: Final[str] = "https://api.example.com"  # Constant

class Connection:
    timeout: Final[int] = 30  # Cannot be overridden in subclasses
```

### ReadOnly TypedDict (3.13+)

```python
from typing import ReadOnly, TypedDict

class Config(ReadOnly[str, str]):
    """Immutable configuration."""
    api_key: str
    endpoint: str

config: Config = {"api_key": "key", "endpoint": "url"}
config["api_key"] = "new"  # Type error
```

---

## TypeVar Best Practices

### Bounded TypeVar

```python
from typing import TypeVar

# Bounded TypeVar - must be subclass of BaseEntity
T = TypeVar('T', bound='BaseEntity')

class BaseEntity:
    id: int

def process(entity: T) -> T:
    """Returns the same type as input."""
    return entity

class User(BaseEntity):
    name: str

user: User = process(User())  # Returns User
```

### Constrained TypeVar

```python
from typing import TypeVar

# Can only be one of these types
T = TypeVar('T', int, str, float)

def double(value: T) -> T:
    return value * 2

double(5)  # OK - returns int
double("hi")  # OK - returns str
double([1, 2])  # Type error - list not allowed
```

### TypeVar vs Any

```python
from typing import Any, TypeVar

T = TypeVar('T')

# BAD: Using Any loses type information
def process_any(value: Any) -> Any:
    return value  # No type safety

# GOOD: Using TypeVar preserves type information
def process_typed(value: T) -> T:
    return value  # Returns same type
```

---

## Protocol vs ABC

### Comparison

| Feature | Protocol | ABC |
|---------|----------|-----|
| **Typing style** | Structural (duck) | Nominal (inheritance) |
| **Registration** | Not required | Must register or inherit |
| **Use case** | Duck typing with types | Explicit interfaces |
| **Multiple inheritance** | Easy | Can have diamond issues |

### Protocol (Structural)

```python
from typing import Protocol

class Renderable(Protocol):
    def render(self) -> str: ...

def display(obj: Renderable):
    obj.render()

# Any class with render() works - no inheritance needed
class Widget:
    def render(self) -> str:
        return "widget"

display(Widget())  # OK
```

### ABC (Nominal)

```python
from abc import ABC, abstractmethod

class Renderable(ABC):
    @abstractmethod
    def render(self) -> str: ...

# Must explicitly inherit
class Widget(Renderable):
    def render(self) -> str:
        return "widget"

display(Widget())  # OK

# Fails - no inheritance
class Gadget:
    def render(self) -> str:
        return "gadget"

display(Gadget())  # Type error - not a Renderable
```

### When to Use Each

**Use Protocol when:**
- Working with existing code you can't modify
- Multiple independent implementations
- Emulating duck typing with types

**Use ABC when:**
- Designing new class hierarchies
- Want explicit interface declarations
- Need inheritance-based polymorphism

---

## Generic Classes and Functions

### Generic Class (Python 3.12+ syntax)

```python
# Modern type parameter syntax (3.12+)
class Container[T]:
    def __init__(self, value: T) -> None:
        self.value = T

    def get(self) -> T:
        return self.value

# Works with any type
int_container: Container[int] = Container(42)
str_container: Container[str] = Container("hello")
```

### Generic Class (Python 3.11 and below)

```python
from typing import Generic, TypeVar

T = TypeVar('T')

class Container(Generic[T]):
    def __init__(self, value: T) -> None:
        self.value = value

    def get(self) -> T:
        return self.value
```

### Generic Function with Constraints

```python
from typing import TypeVar

# Constrained to specific types
Comparable = TypeVar('Comparable', int, str, float)

def maximum(a: Comparable, b: Comparable) -> Comparable:
    return a if a > b else b

maximum(1, 2)  # OK - returns int
maximum("a", "b")  # OK - returns str
```

### Multiple Type Parameters

```python
from typing import TypeVar, Generic

K = TypeVar('K')
V = TypeVar('V')

class Mapping(Generic[K, V]):
    def __init__(self) -> None:
        self.data: dict[K, V] = {}

    def set(self, key: K, value: V) -> None:
        self.data[key] = value

    def get(self, key: K) -> V | None:
        return self.data.get(key)
```

---

## Type Checker Configuration

### mypy Configuration

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"
strict = true

# Individual strict flags
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_no_return = true
follow_imports = "normal"
ignore_missing_imports = false

# Per-module overrides
[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false

[[tool.mypy.overrides]]
module = "third_party_lib.*"
ignore_missing_imports = true
```

### basedpyright (Stricter Alternative)

```toml
# pyproject.toml
[tool.basedpyright]
typeCheckingMode = "strict"
pythonVersion = "3.12"

# More strict by default than mypy
venvPath = "."
venv = ".venv"
```

### Running Type Checkers

```bash
# mypy
mypy src/

# basedpyright
basedpyright src/

# Check specific file
mypy src/module.py

# Verbose output
mypy --show-traceback src/
```

---

## Common Patterns

### Callable Types

```python
from typing import Callable

# Function that takes int and returns str
IntToStr = Callable[[int], str]

def apply(f: IntToStr, value: int) -> str:
    return f(value)

# Async callable
from typing import Awaitable

AsyncFunc = Callable[[int], Awaitable[str]]
```

### Union and Optional

```python
from typing import Optional, Union

# Optional is shorthand for Union[T, None]
def find_user(user_id: int) -> Optional[User]:
    """Returns User or None."""
    pass

# Modern union syntax (3.10+)
def process(value: int | str | None) -> str:
    if value is None:
        return "none"
    return str(value)
```

### TypedDict

```python
from typing import TypedDict

class User(TypedDict):
    """Type for dictionary with specific keys."""
    id: int
    name: str
    email: str

def process_user(user: User) -> None:
    # Type-safe access
    print(user['name'].upper())

# Usage
user: User = {"id": 1, "name": "Alice", "email": "alice@example.com"}
process_user(user)
```

### NewType for Distinct Types

```python
from typing import NewType

UserId = NewType('UserId', int)
UserName = NewType('UserName', str)

def get_user(user_id: UserId) -> UserName:
    # Type-safe - can't confuse with regular int
    pass

# Usage
user_id = UserId(123)  # Explicit conversion
name = get_user(user_id)  # OK
get_user(123)  # Type error - need UserId
```

### TypedDict with Total=False

```python
from typing import TypedDict, Required, NotRequired

class UserUpdate(TypedDict, total=False):
    """All fields optional for partial updates."""
    name: str
    email: str
    age: int

# Or mix required and optional
class UserCreate(TypedDict):
    name: Required[str]
    email: Required[str]
    age: NotRequired[int]
```

---

## Quick Reference

### Common Type Import Locations

| Feature | Import From | Python Version |
|---------|-------------|----------------|
| Basic types | `typing` | 3.5+ |
| Protocol | `typing` | 3.8+ |
| Self | `typing` | 3.11+ |
| Never | `typing` | 3.11+ |
| TypeIs | `typing` | 3.13+ |

### Type Declaration Style Guide

```python
# GOOD: Use built-in collections (3.9+)
def process(items: list[str]) -> dict[str, int]:
    return {item: 1 for item in items}

# AVOID: Old typing module
from typing import List, Dict
def process(items: List[str]) -> Dict[str, int]:
    pass

# GOOD: Union syntax (3.10+)
def process(value: int | str | None) -> str:
    pass

# AVOID: Old Union
from typing import Union
def process(value: Union[int, str, None]) -> str:
    pass
```

---

## References

- [Python typing documentation](https://docs.python.org/3/library/typing.html)
- [mypy documentation](https://mypy.readthedocs.io/)
- [typing stubs repository](https://github.com/python/typeshed)
