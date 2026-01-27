# Python Core Language Patterns

Complete guide to essential Python language patterns and idioms.

## Table of Contents

1. [Comprehensions](#comprehensions)
2. [Context Managers](#context-managers)
3. [functools Patterns](#functools-patterns)
4. [Dataclasses vs Pydantic](#dataclasses-vs-pydantic)
5. [Abstract Base Classes](#abstract-base-classes)
6. [Properties](#properties)
7. [Iterators & Generators](#iterators--generators)
8. [Decorators](#decorators)
9. [Descriptors](#descriptors)
10. [Quick Reference](#quick-reference)

---

## Comprehensions

### List Comprehensions

Concise syntax for creating lists.

```python
# Basic comprehension
squared = [x**2 for x in range(10)]
# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

# With filtering
evens = [x for x in range(20) if x % 2 == 0]
# [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]

# With transformation
words = ["hello", "world", "python"]
lengths = [len(word) for word in words]
# [5, 5, 6]

# Nested comprehension
matrix = [[i * j for j in range(3)] for i in range(3)]
# [[0, 0, 0], [0, 1, 2], [0, 2, 4]]
```

### Dict Comprehensions

Create dictionaries concisely.

```python
# Basic dict comprehension
word_lengths = {word: len(word) for word in ["hello", "world", "python"]}
# {'hello': 5, 'world': 5, 'python': 6}

# With filtering
squares = {x: x**2 for x in range(10) if x % 2 == 0}
# {0: 0, 2: 4, 4: 16, 6: 36, 8: 64}

# Transform keys
mapping = {"key1": "value1", "key2": "value2"}
upper_mapping = {k.upper(): v for k, v in mapping.items()}
# {'KEY1': 'value1', 'KEY2': 'value2'}
```

### Set Comprehensions

Create sets with uniqueness.

```python
# Set comprehension for unique lengths
unique_lengths = {len(word) for word in ["hello", "world", "hi", "python"]}
# {2, 5, 6}

# With filtering
primes = {x for x in range(100) if is_prime(x)}
```

### Generator Expressions

Lazy evaluation for memory efficiency.

```python
# Generator expression (lazy)
sum_of_squares = sum(x**2 for x in range(1_000_000))

# Materialized list comprehension (eager)
sum_of_squares = sum([x**2 for x in range(1_000_000)])

# Generator expressions are preferred for large datasets
# They use constant memory instead of storing all values
```

### When to Use Each

| Pattern | Use Case | Memory | Speed |
|---------|----------|--------|-------|
| **List comprehension** | Small datasets, need indexing | O(n) | Fast |
| **Generator expression** | Large datasets, single pass | O(1) | Slower |
| **Dict comprehension** | Key-value mappings | O(n) | Fast |
| **Set comprehension** | Unique values | O(n) | Fast |

---

## Context Managers

### Built-in Context Managers

Automatic resource cleanup using `with` statements.

```python
# File handling - automatic close
with open("file.txt", "r") as f:
    content = f.read()
# File is closed automatically after with block

# Multiple context managers
with open("in.txt") as f_in, open("out.txt", "w") as f_out:
    f_out.write(f_in.read())

# Lock management
import threading

lock = threading.Lock()
with lock:
    # Critical section - lock released automatically
    shared_resource.update()

# Database transactions
with db.transaction():
    user.delete()
    # Commits automatically on success, rolls back on exception
```

### Custom Context Managers

Using `@contextmanager` decorator for simple cases.

```python
from contextlib import contextmanager
import time

@contextmanager
def timer(name: str):
    """Time a block of code."""
    start = time.time()
    yield
    elapsed = time.time() - start
    print(f"{name} took {elapsed:.2f}s")

# Usage
with timer("data processing"):
    process_large_dataset()
# Output: "data processing took 2.34s"
```

### Context Manager Class

For more complex scenarios, use class-based approach.

```python
class DatabaseConnection:
    def __init__(self, connection_string):
        self.connection_string = connection_string
        self.conn = None

    def __enter__(self):
        """Setup: establish connection."""
        self.conn = connect(self.connection_string)
        return self.conn

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Teardown: cleanup connection."""
        if self.conn:
            self.conn.close()
        # Return False to propagate exceptions, True to suppress
        return False

# Usage
with DatabaseConnection("postgresql://...") as conn:
    conn.execute("SELECT * FROM users")
# Connection closed automatically
```

### ContextLib Utilities

```python
from contextlib import suppress, redirect_stdout, ExitStack

# Suppress specific exceptions
with suppress(FileNotFoundError):
    os.remove("temp.txt")  # No error if file doesn't exist

# Redirect output
with open("log.txt", "w") as f:
    with redirect_stdout(f):
        print("This goes to file, not stdout")

# Multiple context managers with ExitStack
with ExitStack() as stack:
    f1 = stack.enter_context(open("file1.txt"))
    f2 = stack.enter_context(open("file2.txt"))
    f3 = stack.enter_context(open("file3.txt"))
    # All files closed automatically
```

---

## functools Patterns

### lru_cache - Memoization

Cache function results for expensive computations.

```python
from functools import lru_cache
import time

@lru_cache(maxsize=128)
def fibonacci(n: int) -> int:
    """Memoized fibonacci - exponential speedup."""
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# First call - slow
fibonacci(100)  # Takes time

# Subsequent calls - instant (cached)
fibonacci(100)  # Returns immediately

# Clear cache
fibonacci.cache_clear()

# View cache statistics
print(fibonacci.cache_info())
# CacheInfo(hits=10, misses=100, maxsize=128, currsize=100)
```

### partial - Function Argument Freezing

Pre-fill function arguments.

```python
from functools import partial

def multiply(x: float, y: float) -> float:
    return x * y

# Freeze first argument
double = partial(multiply, 2.0)
triple = partial(multiply, 3.0)

# Usage
double(5)   # 10.0
triple(5)   # 15.0

# Useful for callbacks
from threading import Timer

def schedule_notification(message: str, delay: float):
    Timer(delay, lambda: send_notification(message)).start()

# Or with partial
def notify(message: str):
    print(f"Notification: {message}")

schedule = partial(notify, "Hello!")
Timer(5.0, schedule).start()
```

### wraps - Decorator Metadata

Preserve function metadata in decorators.

```python
from functools import wraps

def my_decorator(func):
    @wraps(func)  # Preserves __name__, __doc__, etc.
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@my_decorator
def example_function():
    """This docstring is preserved."""
    pass

# Without @wraps: wrapper.__name__ == "wrapper"
# With @wraps: example_function.__name__ == "example_function"
```

### reduce - Cumulative Operations

Apply function cumulatively to items.

```python
from functools import reduce

# Sum of list (like sum())
reduce(lambda x, y: x + y, [1, 2, 3, 4])
# (((1 + 2) + 3) + 4) = 10

# Product of list
reduce(lambda x, y: x * y, [1, 2, 3, 4])
# (((1 * 2) * 3) * 4) = 24

# Flatten nested lists
reduce(lambda x, y: x + y, [[1, 2], [3, 4], [5, 6]])
# [1, 2, 3, 4, 5, 6]

# Custom initial value
reduce(lambda acc, x: acc + x, [1, 2, 3], 100)
# ((100 + 1) + 2) + 3 = 106
```

---

## Dataclasses vs Pydantic

### dataclasses - Simple Data Containers

Built-in (3.7+), no dependencies, fast.

```python
from dataclasses import dataclass, field
from typing import List

@dataclass
class User:
    """Simple data container for internal use."""
    name: str
    email: str
    age: int = 0  # Default value
    tags: List[str] = field(default_factory=list)

# Usage
user = User(name="Alice", email="alice@example.com")
print(user.name)  # Alice

# Dataclasses are mutable
user.age = 31
```

### Immutable dataclass

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Point:
    """Immutable point - hashable, can be dict key."""
    x: float
    y: float

# Usage
p = Point(1.0, 2.0)
p.x = 3.0  # FrozenInstanceError: cannot assign to field

# Can be used as dict key
locations = {Point(0, 0): "origin"}
```

### Pydantic - Runtime Validation + Serialization

External data, API models, configuration.

```python
from pydantic import BaseModel, Field, field_validator
import re

class UserModel(BaseModel):
    """User model with validation and serialization."""
    name: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$')
    age: int = Field(..., ge=18, le=120)

    @field_validator('name')
    @classmethod
    def name_not_reserved(cls, v: str) -> str:
        reserved = ['admin', 'root', 'system']
        if v.lower() in reserved:
            raise ValueError('Reserved username')
        return v

    class Config:
        # Extra serialization options
        json_encoders = {
            # Custom encoding for specific types
        }

# Usage - validates on input
user = UserModel(
    name="Alice",
    email="alice@example.com",
    age=30
)

# JSON export
user.json()  # '{"name": "Alice", "email": "alice@example.com", "age": 30}'
user.dict()  # {'name': 'Alice', 'email': 'alice@example.com', 'age': 30}

# Validation error
try:
    UserModel(name="ab", email="invalid", age=10)
except ValidationError as e:
    print(e)
    # 3 validation errors
```

### When to Use Each

| Feature | dataclass | Pydantic |
|---------|-----------|----------|
| **Use case** | Internal data structures | API models, external data |
| **Validation** | None (type hints only) | Runtime validation |
| **Serialization** | Manual (asdict()) | Built-in (json(), dict()) |
| **Performance** | Faster (no validation) | Slower (validation overhead) |
| **Dependencies** | None (built-in) | Requires pydantic |
| **JSON schema** | No | Yes (schema()) |

---

## Abstract Base Classes

### When to Use ABCs

- Need explicit interface enforcement
- Designing class hierarchies
- Require inheritance-based polymorphism

### Basic ABC Definition

```python
from abc import ABC, abstractmethod

class DataProcessor(ABC):
    """Abstract base class for data processors."""

    @abstractmethod
    def process(self, data: dict) -> dict:
        """Process data and return result."""
        pass

    @abstractmethod
    def validate(self, data: dict) -> bool:
        """Validate data before processing."""
        pass

    def template_method(self, data: dict) -> dict:
        """Template method - uses abstract methods."""
        if self.validate(data):
            return self.process(data)
        raise ValueError("Invalid data")

# Concrete implementation
class JSONProcessor(DataProcessor):
    def process(self, data: dict) -> dict:
        # Custom processing
        return {k: v.upper() for k, v in data.items()}

    def validate(self, data: dict) -> bool:
        return bool(data)

# Usage
processor = JSONProcessor()
result = processor.template_method({"name": "alice"})
```

### Abstract Properties

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @property
    @abstractmethod
    def area(self) -> float:
        """Area of the shape."""
        pass

    @property
    @abstractmethod
    def perimeter(self) -> float:
        """Perimeter of the shape."""
        pass

class Circle(Shape):
    def __init__(self, radius: float):
        self.radius = radius

    @property
    def area(self) -> float:
        return 3.14159 * self.radius ** 2

    @property
    def perimeter(self) -> float:
        return 2 * 3.14159 * self.radius
```

### ABC vs Protocol

| Feature | ABC | Protocol |
|---------|-----|----------|
| **Type** | Nominal (inheritance) | Structural (duck typing) |
| **Registration** | Must inherit | Not required |
| **Use case** | Explicit interfaces | Duck typing with types |
| **Multiple inheritance** | Can have diamond issues | No issues |

See `references/type-system.md` for detailed Protocol patterns.

---

## Properties

### Basic Property Usage

Computed attributes with validation.

```python
class Temperature:
    def __init__(self, celsius: float):
        self._celsius = celsius

    @property
    def celsius(self) -> float:
        """Get temperature in Celsius."""
        return self._celsius

    @celsius.setter
    def celsius(self, value: float):
        """Set temperature in Celsius with validation."""
        if value < -273.15:
            raise ValueError("Temperature below absolute zero")
        self._celsius = value

    @property
    def fahrenheit(self) -> float:
        """Computed: get temperature in Fahrenheit."""
        return self._celsius * 9/5 + 32

    @fahrenheit.setter
    def fahrenheit(self, value: float):
        """Computed: set temperature via Fahrenheit."""
        self._celsius = (value - 32) * 5/9

# Usage
temp = Temperature(25)
print(temp.celsius)     # 25.0
print(temp.fahrenheit)  # 77.0 (computed)

temp.fahrenheit = 100
print(temp.celsius)     # 37.78 (computed)
```

### Read-Only Property

```python
class User:
    def __init__(self, birth_year: int):
        self._birth_year = birth_year

    @property
    def age(self) -> int:
        """Read-only computed property."""
        from datetime import datetime
        current_year = datetime.now().year
        return current_year - self._birth_year

# No setter - read-only
user = User(1990)
print(user.age)  # 34 (or current year - 1990)
user.age = 35    # AttributeError: can't set attribute
```

### Property with Caching

```python
class ExpensiveCalculation:
    def __init__(self, data: list):
        self.data = data
        self._result = None

    @property
    def result(self) -> float:
        """Lazy computation with caching."""
        if self._result is None:
            print("Computing...")
            self._result = sum(x**2 for x in self.data)
        return self._result

# First access - computes
calc = ExpensiveCalculation(range(1000))
print(calc.result)  # Prints "Computing..." then result

# Subsequent access - cached
print(calc.result)  # Returns cached value instantly
```

---

## Iterators & Generators

### Custom Iterator

```python
class Countdown:
    """Custom iterator for countdown."""

    def __init__(self, start: int):
        self.start = start
        self.current = start

    def __iter__(self):
        """Return iterator object."""
        return self

    def __next__(self):
        """Return next value or raise StopIteration."""
        if self.current < 0:
            raise StopIteration
        value = self.current
        self.current -= 1
        return value

# Usage
for i in Countdown(5):
    print(i)  # 5, 4, 3, 2, 1, 0
```

### Generator Functions

Simpler than custom iterators.

```python
def countdown(start: int):
    """Simple generator function."""
    while start >= 0:
        yield start
        start -= 1

# Usage
for i in countdown(5):
    print(i)  # 5, 4, 3, 2, 1, 0
```

### Generator Pipelines

Chain generators for data processing.

```python
def read_lines(path: str):
    """Read file line by line."""
    with open(path) as f:
        for line in f:
            yield line.strip()

def filter_empty(lines):
    """Remove empty lines."""
    for line in lines:
        if line:
            yield line

def transform_lines(lines):
    """Transform each line."""
    for line in lines:
        yield line.upper()

# Pipeline
lines = read_lines("data.txt")
filtered = filter_empty(lines)
transformed = transform_lines(filtered)

for line in transformed:
    print(line)
```

### Async Generators

```python
async def async_count(n: int):
    """Async generator."""
    for i in range(n):
        await asyncio.sleep(0.1)
        yield i

# Usage
async for value in async_count(5):
    print(value)
```

---

## Decorators

### Function Decorator

Modify or enhance function behavior.

```python
def timing_decorator(func):
    """Time function execution."""
    import time

    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result

    return wrapper

@timing_decorator
def slow_function():
    time.sleep(0.1)
    return "done"

slow_function()  # Prints: "slow_function took 0.1001s"
```

### Decorator with Arguments

```python
def repeat(times: int):
    """Decorator factory - repeats function N times."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            results = []
            for _ in range(times):
                results.append(func(*args, **kwargs))
            return results
        return wrapper
    return decorator

@repeat(times=3)
def greet(name: str):
    return f"Hello, {name}"

greet("Alice")  # ['Hello, Alice', 'Hello, Alice', 'Hello, Alice']
```

### Class Decorator

```python
def singleton(cls):
    """Singleton class decorator."""
    instances = {}

    @wraps(cls)
    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]

    return get_instance

@singleton
class Database:
    def __init__(self):
        print("Initializing database connection")

# Only one instance created
db1 = Database()  # Prints: "Initializing database connection"
db2 = Database()  # No print (same instance)
print(db1 is db2)  # True
```

### Parameterized Decorator

```python
def authorize(roles: list[str]):
    """Authorization decorator with roles."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if user.role not in roles:
                raise PermissionError("Unauthorized")
            return func(*args, **kwargs)
        return wrapper
    return decorator

@authorize(roles=["admin", "moderator"])
def delete_user(user_id: int):
    # Only admins and moderators can access
    pass
```

---

## Quick Reference

### Pattern Selection Guide

| Pattern | Use Case | Complexity | Example |
|---------|----------|------------|---------|
| **Comprehensions** | Transform collections | Low | `[x**2 for x in range(10)]` |
| **Context managers** | Resource management | Medium | `with open(...) as f:` |
| **functools** | Function manipulation | Medium | `@lru_cache`, `partial` |
| **dataclass** | Simple data containers | Low | `@dataclass` |
| **Pydantic** | External data validation | Medium | `class Model(BaseModel)` |
| **ABC** | Interface enforcement | Medium | `class X(ABC)` |
| **Protocol** | Structural typing | Medium | `class X(Protocol)` |
| **Properties** | Computed attributes | Low | `@property` |
| **Generators** | Lazy sequences | Medium | `yield x` |
| **Decorators** | Function enhancement | High | `@decorator` |

### Common Imports

```python
# Comprehensions - built-in (no imports)

# Context managers
from contextlib import contextmanager, suppress, ExitStack

# functools
from functools import lru_cache, partial, wraps, reduce

# Data structures
from dataclasses import dataclass, field
from typing import Protocol

# ABC
from abc import ABC, abstractmethod

# Decorators
from functools import wraps

# Generators - built-in (yield keyword)
```

---

## References

- [Python Comprehensions](https://docs.python.org/3/tutorial/datastructures.html#list-comprehensions)
- [Context Managers](https://docs.python.org/3/library/contextlib.html)
- [functools documentation](https://docs.python.org/3/library/functools.html)
- [dataclasses documentation](https://docs.python.org/3/library/dataclasses.html)
- [ABC documentation](https://docs.python.org/3/library/abc.html)
- [Generators](https://docs.python.org/3/howto/functional.html#generators)
