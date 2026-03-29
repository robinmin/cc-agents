---
name: type-system
description: "Python typing patterns: Protocol, TypeGuard, TypeVar, Self, and advanced type manipulation"
see_also:
  - rd3:pl-python
---

# Python Type System Guide

Complete guide to Python's type system for planning and implementation.

## Type Hint Fundamentals

### When to Use Type Hints

| Scenario | Recommendation |
|----------|---------------|
| Function signatures | Always use |
| Class attributes | Use for public APIs |
| Complex generic types | Define intermediate types |
| Union returns | Use `X | Y` syntax (3.10+) |

### Core Type Patterns

```python
from __future__ import annotations  # Enable forward references (3.7+)
# Note: makes ALL annotations strings at runtime — may break libraries
# that inspect annotations (e.g. Pydantic v1, cattrs).
# Pydantic v2 handles this correctly.

# Basic types
def greet(name: str) -> str:
    return f"Hello, {name}"

# Optional with default
def find_user(user_id: int, default: str | None = None) -> str | None:
    ...

# Multiple types
def process(value: int | float | str) -> float:
    return float(value)

# None as a type
def maybe_raise() -> None:
    raise RuntimeError("error")
```

---

## typing.Protocol (Structural Subtyping)

Protocol defines interfaces without inheritance — duck typing with type safety.

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Closable(Protocol):
    def close(self) -> None: ...

class File:
    def close(self) -> None:
        self._file.close()

# File is structurally a Closable
def close_all(thing: Closable) -> None:
    thing.close()

f = File()
close_all(f)  # Works - File has close()
```

### Protocol vs ABC

| Aspect | Protocol | ABC |
|--------|----------|-----|
| Inheritance | None needed | Requires subclassing |
| Type checking | Nominal | Structural |
| Method overriding | Not required | Required |
| Performance | Slightly faster | Slight overhead |

**Use Protocol** when you want structural subtyping (duck typing with type safety).
**Use ABC** when you need to enforce implementation.

### Example: Repository Protocol

```python
from typing import Protocol, TypeVar

T = TypeVar("T")

class Repository(Protocol[T]):
    def find_by_id(self, id: str) -> T | None: ...
    def save(self, entity: T) -> T: ...
    def delete(self, id: str) -> None: ...

class User:
    pass

# Any class with find_by_id/save/delete is a valid Repository[User]
```

---

## typing.TypeVar

TypeVar creates generic type variables for reusable type-safe code.

```python
from typing import TypeVar

T = TypeVar("T")
K = TypeVar("K")
V = TypeVar("V")

# Generic function
def first(items: list[T]) -> T | None:
    return items[0] if items else None

# Generic class
class Box[T]:
    def __init__(self, value: T):
        self.value = value

    def get(self) -> T:
        return self.value
```

### Constrained TypeVar

```python
from typing import TypeVar

# Can only be int or str
T = TypeVar("T", int, str)

def process(value: T) -> T:
    return value

process(1)   # OK
process("x") # OK
process(1.0) # Error - float not allowed
```

### TypeVar with bound

```python
from typing import TypeVar
from collections.abc import Sequence

T = TypeVar("T", bound=Sequence)  # Must be a Sequence

def length(items: T) -> int:
    return len(items)

length([1, 2, 3])  # OK
length("hello")     # OK - str is a Sequence
length(42)         # Error - int is not a Sequence
```

---

## typing.TypeGuard

TypeGuard narrows types at runtime for validation functions.

```python
from typing import TypeGuard

def is_list_of_strings(val: list) -> TypeGuard[list[str]]:
    """Narrows list to list[str] if all elements are strings."""
    return all(isinstance(x, str) for x in val)

# Usage
items: list[int] | list[str] = ["a", "b"]

if is_list_of_strings(items):
    # items is now list[str]
    print(items[0].upper())  # OK - str has .upper()
else:
    # items is still list[int] | list[str]
    pass
```

### TypeIs (Python 3.13+) — Better Type Narrowing

```python
from typing import TypeIs  # 3.13+

def is_list_of_strings(val: list) -> TypeIs[list[str]]:
    """Narrows and preserves the narrowed type in else branch too."""
    return all(isinstance(x, str) for x in val)

items: list[int] | list[str] = ["a", "b"]

if is_list_of_strings(items):
    # items is list[str]
    print(items[0].upper())
else:
    # items is list[int] - TypeIs excludes the narrowed type
    print(items[0] + 1)  # OK - int
```

---

## typing.Self (Python 3.11+)

Self types enable type-safe builder patterns and method chaining.

```python
from typing import Self

class Builder:
    def set_name(self, name: str) -> Self:
        self.name = name
        return self

    def set_age(self, age: int) -> Self:
        self.age = age
        return self

    def build(self) -> User:
        return User(name=self.name, age=self.age)

# Type-safe chaining
user = Builder().set_name("Alice").set_age(30).build()
```

### Without Self (Pre-3.11)

```python
from typing import TypeVar

Self = TypeVar("Self", bound="Builder")

class Builder:
    def set_name(self: Self, name: str) -> Self:
        self.name = name
        return self
```

---

## typing.Never (Python 3.11+)

Never marks unreachable code for exhaustive pattern matching.

```python
from typing import Never

def assert_never(value: Never) -> Never:
    raise AssertionError(f"Unexpected value: {value}")

def process_status(status: str) -> str:
    match status:
        case "pending":
            return "Waiting..."
        case "running":
            return "In progress..."
        case "done":
            return "Complete"
        case _:
            assert_never(status)  # Compile error if case is missed
```

---

## Generic Collections

### Built-in Generic Types (Python 3.9+)

```python
# Use lowercase types directly (3.9+)
def process(items: list[int], mapping: dict[str, int]) -> tuple[int, int]:
    return sum(items), sum(mapping.values())

# Generator types
from collections.abc import Iterator

def yield_items() -> Iterator[int]:
    for i in range(10):
        yield i
```

### Type Aliases

```python
from typing import TypeAlias

# Semantic type aliases
UserId: TypeAlias = str
OrderId: TypeAlias = str

# Complex type aliases
JSONValue: TypeAlias = dict[str, "JSONValue"] | list["JSONValue"] | str | int | float | bool | None
```

---

## TypedDict

TypedDict defines structured dictionaries with specific key types.

```python
from typing import TypedDict, Required, NotRequired

class User(TypedDict):
    name: Required[str]  # Must be present
    email: Required[str]
    age: NotRequired[int]  # Optional

# Usage
user: User = {"name": "Alice", "email": "alice@example.com"}
user_with_age: User = {"name": "Bob", "email": "bob@example.com", "age": 30}
```

### ReadOnly TypedDict (Python 3.13+)

```python
from typing import ReadOnly, TypedDict

class Config(TypedDict):
    api_key: ReadOnly[str]
    endpoint: str

# cfg: Config = {"api_key": "secret", "endpoint": "..."}
# cfg["api_key"] = "new"  # Error - ReadOnly
cfg["endpoint"] = "new"  # OK
```

---

## ParamSpec (Advanced)

ParamSpec preserves callable parameter types through higher-order functions.

```python
from typing import Callable, TypeVar, ParamSpec
import functools

P = ParamSpec("P")
R = TypeVar("R")

def with_logging(func: Callable[P, R]) -> Callable[P, R]:
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        print(f"Calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

@with_logging
def add(a: int, b: int) -> int:
    return a + b

# Type of add is preserved: (int, int) -> int
result = add(1, 2)  # Works correctly
```

---

## Type Checking Best Practices

### DO

```python
# Use __future__ annotations for forward references
from __future__ import annotations

# Prefer TypeVar over Any
def identity[T](value: T) -> T:
    return value

# Use Protocol for structural typing
@runtime_checkable
class Closeable(Protocol):
    def close(self) -> None: ...

# Narrow types with TypeGuard/TypeIs
def is_email(value: str) -> TypeGuard[EmailStr]:
    return "@" in value

# Use object instead of Any for truly unknown types
def log_value(value: object) -> None:  # We know it's an object
    print(repr(value))
```

### DON'T

```python
# Avoid Any - disables type checking
def flawed(value: Any) -> Any:  # BAD
    return value.check()  # No error!

# Avoid type comments
def bad(x, y):  # type: (int, str) -> bool  # BAD
    return x > y

# Avoid untyped lambdas
fn = lambda x: x + 1  # OK if implicit, avoid if explicit typing needed
```

---

## External Type Providers

| Library | Purpose | Import |
|---------|---------|--------|
| **Pydantic** | Runtime validation + types | `pydantic.BaseModel` |
| **attrs** | Classes without boilerplate | `@attrs.define` |
| **msgspec** | Fast validation, Struct | `msgspec.Struct` |
| **beartype** | Runtime type checking | `@beartype` decorator |

### Pydantic Integration

```python
from pydantic import BaseModel, EmailStr, field_validator

class User(BaseModel):
    name: str
    email: EmailStr
    age: int

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Invalid email")
        return v

# Validation happens automatically
user = User(name="Alice", email="alice@example.com", age=30)
```

---

## Tooling

| Tool | Purpose | Config |
|------|---------|--------|
| **mypy** | Static type checking | `--strict` recommended |
| **pyright** | Fast static analysis | basedpyright for best defaults |
| **pydantic** | Runtime validation | Automatic type coercion |
| **beartype** | Runtime type checking | `@beartype` decorator |

### mypy Configuration

```toml
[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_ignores = true
disallow_untyped_defs = true
```

### pyright Configuration (Recommended)

```json
{
  "include": ["src"],
  "pythonVersion": "3.11",
  "typeCheckingMode": "strict",
  "reportMissingTypeStubs": false
}
```
