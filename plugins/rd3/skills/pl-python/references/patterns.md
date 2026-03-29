---
name: patterns
description: "Core Python language patterns: comprehensions, context managers, decorators, dataclasses, and more"
see_also:
  - rd3:pl-python
  - rd3:sys-developing
---

# Python Core Patterns

Complete guide to core Python language patterns and idioms.

## Comprehensions

### List Comprehension

```python
# Basic list comprehension
squares = [x ** 2 for x in range(10)]

# With condition
evens = [x for x in range(20) if x % 2 == 0]

# Nested
matrix = [[i * j for j in range(3)] for i in range(3)]

# With multiple sources
pairs = [(a, b) for a in [1, 2] for b in [3, 4]]
```

### Dict Comprehension

```python
# Basic dict comprehension
word_lengths = {word: len(word) for word in ["hello", "world"]}

# From two lists
keys = ["a", "b", "c"]
values = [1, 2, 3]
mapping = {k: v for k, v in zip(keys, values)}

# With condition
filtered = {k: v for k, v in data.items() if v > 0}
```

### Set Comprehension

```python
unique_lengths = {len(word) for word in ["hello", "hi", "world"]}
```

### Generator Expression

```python
# Lazy evaluation - memory efficient
sum_squares = sum(x ** 2 for x in range(1_000_000))

# For large datasets - doesn't create intermediate list
lines = (line.strip() for line in huge_file)
for line in lines:
    process(line)
```

---

## Context Managers

### with Statement

```python
# File handling
with open("file.txt", "r") as f:
    content = f.read()
# File automatically closed

# Lock acquisition
with lock:
    shared_resource += 1

# Database transaction
with session.begin():
    session.add(User(name="Alice"))
# Automatic commit/rollback
```

### @contextmanager Decorator

```python
from contextlib import contextmanager
import tempfile
import shutil

@contextmanager
def temp_directory():
    """Create and clean up a temporary directory."""
    tmpdir = tempfile.mkdtemp()
    try:
        yield tmpdir
    finally:
        shutil.rmtree(tmpdir)

# Usage
with temp_directory() as tmpdir:
    # tmpdir exists and is usable
    write_temp_files(tmpdir)
# tmpdir is cleaned up
```

### Async Context Manager

```python
import aiofiles
import asyncio

async def read_file(filename: str):
    async with aiofiles.open(filename, "r") as f:
        return await f.read()

async def main():
    content = await read_file("file.txt")
```

---

## Dataclasses

### Basic dataclass

```python
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

    def distance_from_origin(self) -> float:
        return (self.x ** 2 + self.y ** 2) ** 0.5

p = Point(3.0, 4.0)
print(p.distance_from_origin())  # 5.0
```

### dataclass with field defaults

```python
from dataclasses import dataclass, field

@dataclass
class User:
    name: str
    email: str
    active: bool = True
    roles: list[str] = field(default_factory=list)

user = User(name="Alice", email="alice@example.com")
```

### frozen dataclass (immutable)

**Prefer immutable data structures by default.** Use `frozen=True` for value objects that should not change after creation — this prevents accidental mutation and makes objects safe to use as dict keys or set members.

```python
from dataclasses import dataclass
from typing import NamedTuple

# Frozen dataclass — best for complex value objects with defaults
@dataclass(frozen=True)
class Config:
    api_key: str
    endpoint: str

config = Config(api_key="secret", endpoint="...")
# config.endpoint = "new"  # Error - frozen!

# NamedTuple — lightweight immutable alternative (no inheritance needed)
class Point(NamedTuple):
    x: float
    y: float

p = Point(3.0, 4.0)
# p.x = 5.0  # Error - immutable!
```

**When to use which:**
- `@dataclass(frozen=True)` — when you need defaults, `field()`, methods, or inheritance
- `NamedTuple` — when you want positional construction, tuple unpacking, and minimal overhead

---

## Pydantic Models

### BaseModel

```python
from pydantic import BaseModel, EmailStr, field_validator

class User(BaseModel):
    name: str
    email: EmailStr
    age: int
    nickname: str | None = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_admin(cls, v: str) -> str:
        if v.lower() == "admin":
            raise ValueError("Name cannot be admin")
        return v

user = User(name="Alice", email="alice@example.com", age=30)
```

### Computed Fields

```python
from pydantic import BaseModel, computed_field

class Rectangle(BaseModel):
    width: float
    height: float

    @computed_field
    @property
    def area(self) -> float:
        return self.width * self.height

r = Rectangle(width=3, height=4)
print(r.area)  # 12.0
```

---

## Decorators

### Basic Decorator

```python
import functools
import time

def timer(func):
    """Measure execution time."""
    @functools.wraps(func)  # Preserve function metadata
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        print(f"{func.__name__} took {end - start:.2f}s")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)
```

### Decorator with Arguments

```python
def retry(max_attempts: int = 3, delay: float = 1.0):
    """Retry decorator with configurable attempts."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(delay * (2 ** attempt))
        return wrapper
    return decorator

@retry(max_attempts=5, delay=0.5)
def unreliable_call():
    ...
```

### Class Decorator

```python
def singleton(cls):
    """Make a class a singleton."""
    instances = {}
    @functools.wraps(cls)
    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return get_instance

@singleton
class Database:
    ...
```

---

## Properties

### Basic Property

```python
class Temperature:
    def __init__(self, celsius: float):
        self._celsius = celsius

    @property
    def celsius(self) -> float:
        return self._celsius

    @celsius.setter
    def celsius(self, value: float):
        if value < -273.15:
            raise ValueError("Temperature below absolute zero!")
        self._celsius = value

    @property
    def fahrenheit(self) -> float:
        return self._celsius * 9/5 + 32

t = Temperature(25)
print(t.fahrenheit)  # 77.0
t.celsius = 30
print(t.fahrenheit)  # 86.0
```

---

## Generators

### Basic Generator

```python
def count_up_to(n: int):
    """Yield numbers from 1 to n."""
    i = 1
    while i <= n:
        yield i
        i += 1

for num in count_up_to(5):
    print(num)  # 1, 2, 3, 4, 5
```

### Infinite Generator

```python
def fibonacci():
    """Yield fibonacci numbers indefinitely."""
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

fib = fibonacci()
for _ in range(10):
    print(next(fib))  # First 10 fibonacci numbers
```

### Generator Pipeline

```python
def numbers():
    yield from range(20)

def evens(numbers):
    yield from (n for n in numbers if n % 2 == 0)

def squares(numbers):
    yield from (n ** 2 for n in numbers)

result = list(squares(evens(numbers())))
```

---

## functools Utilities

### lru_cache

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def fibonacci(n: int) -> int:
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Caches results for faster repeated calls
print(fibonacci(100))  # Fast due to caching
```

### cache (Python 3.9+)

```python
from functools import cache  # Python 3.9+

@cache
def factorial(n: int) -> int:
    return n * factorial(n - 1) if n else 1
```

### partial

```python
from functools import partial

def power(base: float, exponent: float) -> float:
    return base ** exponent

square = partial(power, exponent=2)
cube = partial(power, exponent=3)

print(square(5))  # 25.0
print(cube(5))     # 125.0
```

### singledispatch (Generic Functions)

```python
from functools import singledispatch

@singledispatch
def process(value):
    """Default implementation."""
    raise TypeError(f"Cannot process {type(value)}")

@process.register(int)
def _(value: int):
    return value * 2

@process.register(str)
def _(value: str):
    return value.upper()

print(process(10))    # 20
print(process("hi"))  # HI
```

---

## itertools Patterns

### Chain and Groupby

```python
import itertools

# Chain multiple iterables
combined = list(itertools.chain([1, 2], [3, 4], [5, 6]))

# Groupby requires sorted input
data = [("a", 1), ("a", 2), ("b", 3)]
for key, group in itertools.groupby(data, key=lambda x: x[0]):
    print(f"{key}: {list(group)}")
```

### Combinations and Permutations

```python
import itertools

# All combinations of 2 from [1, 2, 3]
for combo in itertools.combinations([1, 2, 3], 2):
    print(combo)  # (1, 2), (1, 3), (2, 3)

# All permutations
for perm in itertools.permutations([1, 2, 3], 2):
    print(perm)  # (1, 2), (1, 3), (2, 1), (2, 3), (3, 1), (3, 2)
```

### Infinite Iterators

```python
import itertools

# count, cycle, repeat

# Count from 10 indefinitely
for i in itertools.count(10):
    print(i)
    if i > 15:
        break

# Cycle through [1, 2, 3] indefinitely
counter = 0
for item in itertools.cycle([1, 2, 3]):
    print(item)
    counter += 1
    if counter >= 10:
        break

# Repeat 5 five times
for item in itertools.repeat(5, times=5):
    print(item)  # 5, 5, 5, 5, 5
```

---

## Exception Handling Patterns

### Exception Groups (Python 3.11+)

```python
# Raising multiple exceptions
try:
    raise ExceptionGroup("errors", [
        ValueError("Invalid value"),
        TypeError("Expected int"),
    ])
except ExceptionGroup as eg:
    for exc in eg.exceptions:
        print(f"Error: {exc}")
```

### Exception chaining

```python
try:
    int("not a number")
except ValueError as e:
    raise RuntimeError("Conversion failed") from e
```

### Suppressing exceptions

```python
from contextlib import suppress

# Instead of try/except/pass
with suppress(FileNotFoundError):
    os.remove("file.txt")
```

---

## ABC (Abstract Base Classes)

### Abstract Method

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float:
        ...

    @abstractmethod
    def perimeter(self) -> float:
        ...

class Circle(Shape):
    def __init__(self, radius: float):
        self.radius = radius

    def area(self) -> float:
        return 3.14159 * self.radius ** 2

    def perimeter(self) -> float:
        return 2 * 3.14159 * self.radius

# Can't instantiate abstract class
# shape = Shape()  # Error!
circle = Circle(5)  # OK
```

### Interface with Protocol (Often Preferred)

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Shape(Protocol):
    def area(self) -> float: ...
    def perimeter(self) -> float: ...

# Structural subtyping - any class with area() and perimeter() works
```
