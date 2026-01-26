# Python Project Structures

Complete guide to Python project layouts with rationale for each structure type.

## Table of Contents

1. [Decision Framework](#decision-framework)
2. [Single Script Layout](#single-script-layout)
3. [Flat Layout](#flat-layout)
4. [Src Layout](#src-layout)
5. [Application Structure](#application-structure)
6. [Library Structure](#library-structure)
7. [Monorepo Structure](#monorepo-structure)

---

## Decision Framework

| Project Type | Recommended Layout | When to Use |
|--------------|-------------------|-------------|
| **Single Script** | Single file | One-off scripts, utilities < 100 lines |
| **Small Tool** | Flat layout | Utilities 100-500 lines, no internal imports |
| **Package** | `src/` layout | Reusable packages, applications with tests |
| **Application** | `src/` with layers | Web apps, APIs, services |
| **Library** | Clean `src/` with public API | PyPI packages, shared code |
| **Monorepo** | Multi-package `src/` | Multiple related projects |

**Key Principle:** Start simple, evolve when pain points emerge.

---

## Single Script Layout

### Structure

```
my_script.py
```

### When to Use

- One-off data processing scripts
- Quick automation tasks
- Learning/experimentation code
- Scripts under 100 lines

### Example

```python
#!/usr/bin/env python3
"""Single-purpose script for task X."""

import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", help="Input file")
    args = parser.parse_args()
    # Process input
    print(f"Processing {args.input}")

if __name__ == "__main__":
    main()
```

---

## Flat Layout

### Structure

```
project/
├── main.py
├── utils.py
├── config.py
└── tests/
    └── test_main.py
```

### When to Use

- Small utilities (100-500 lines)
- No internal package imports needed
- Single-purpose tools
- Quick prototypes

### Pros/Cons

| Pros | Cons |
|------|------|
| Simple, direct | No import isolation |
| Easy to navigate | Harder to test in isolation |
| Fast to start | Doesn't scale well |

### Evolution Point

**Migrate to `src/` layout when:**
- Tests need to import from multiple modules
- Project exceeds 500 lines
- Need installable package

---

## Src Layout

### Structure

```
project/
├── src/
│   └── mypackage/
│       ├── __init__.py
│       ├── main.py
│       └── utils.py
├── tests/
│   └── test_main.py
├── pyproject.toml
└── README.md
```

### When to Use

- All new projects (default recommendation)
- Installable packages
- Projects with tests
- Any application with multiple modules

### Why `src/` Layout Matters

**Import Isolation:** Prevents accidental import of local files instead of installed package

**Problem with flat layout:**
```python
# Without src/ layout
import mypackage  # Imports from project directory, not installed version
```

**With src/ layout:**
```python
# Forces explicit installation
import mypackage  # Must pip install -e . first
```

### Installation

```bash
# Development install (editable)
pip install -e .

# Production install
pip install .
```

---

## Application Structure

### Structure

```
app/
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── main.py           # Entry point
│       ├── config/
│       │   ├── __init__.py
│       │   └── settings.py   # Configuration
│       ├── domain/
│       │   ├── __init__.py
│       │   ├── models.py     # Business models
│       │   └── services.py   # Business logic
│       ├── infrastructure/
│       │   ├── __init__.py
│       │   ├── database.py   # DB connections
│       │   └── external_api.py
│       ├── api/
│       │   ├── __init__.py
│       │   ├── routes.py     # HTTP endpoints
│       │   └── schemas.py    # Request/response models
│       └── utils/
│           ├── __init__.py
│           └── helpers.py
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── pyproject.toml
├── .env.example
└── README.md
```

### Module Responsibilities

| Module | Responsibility | Dependencies |
|--------|----------------|--------------|
| **main.py** | Application entry point | All modules |
| **config/** | Settings, environment | None |
| **domain/** | Business logic, models | config/ only |
| **infrastructure/** | External systems | domain/ |
| **api/** | HTTP interfaces | domain/ |
| **utils/** | Shared utilities | None |

### Dependency Rules

**Inward dependency flow:**
```
api/ → domain/ ← infrastructure/
     ↓
   config/
```

**Domain layer** must not depend on infrastructure or API layers.

### When to Use

- Web applications (FastAPI, Flask, Django)
- Microservices
- Applications with clear business logic
- Projects requiring testability

---

## Library Structure

### Structure

```
mylib/
├── src/
│   └── mylib/
│       ├── __init__.py       # Public API
│       ├── core/
│       │   ├── __init__.py
│       │   └── base.py       # Core functionality
│       ├── utils/
│       │   ├── __init__.py
│       │   └── helpers.py    # Internal utilities
│       └── _private/         # Underscore = private
│           ├── __init__.py
│           └── internal.py
├── tests/
│   ├── test_core.py
│   └── test_utils.py
├── docs/
│   └── api.md
├── pyproject.toml
├── README.md
├── LICENSE
└── CHANGELOG.md
```

### Key Differences from Applications

| Aspect | Application | Library |
|--------|-------------|---------|
| **Entry Point** | `main.py` or `__main__.py` | `__init__.py` |
| **API Design** | Internal users | External users |
| **Stability** | Can change freely | SemVer required |
| **Documentation** | Internal comments | Public API docs |

### Public API Design

```python
# src/mylib/__init__.py
"""MyLib - A brief description."""

__version__ = "1.0.0"

# Public API - what users import
from mylib.core import PublicClass, public_function

# Private - not exposed
# from mylib._private.internal import InternalHelper

__all__ = ["PublicClass", "public_function", "__version__"]
```

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| **Public** | No underscore | `my_function`, `MyClass` |
| **Private** | Leading underscore | `_internal`, `_Helper` |
| **Really Private** | Underscore directory | `src/_private/` |

---

## Monorepo Structure

### Structure

```
company-projects/
├── packages/
│   ├── shared-utils/
│   │   └── src/
│   │       └── shared_utils/
│   ├── api-client/
│   │   └── src/
│   │       └── api_client/
│   └── data-pipeline/
│       └── src/
│           └── data_pipeline/
├── services/
│   ├── web-app/
│   │   └── src/
│   │       └── web_app/
│   └── worker/
│       └── src/
│           └── worker/
├── pyproject.toml           # Root config
├── tools/
│   └── scripts/
└── .github/
    └── workflows/
```

### Root pyproject.toml

```toml
[tool.poetry]
name = "company-monorepo"

[tool.poetry.dependencies]
python = "^3.11"

# Workspace packages
[tool.poetry.workspace]
members = ["packages/*", "services/*"]

# Shared dev dependencies
[tool.poetry.group.dev.dependencies]
pytest = "^8.0"
mypy = "^1.8"
ruff = "^0.1"
```

### When to Use

- Multiple related projects
- Shared libraries across services
- Unified CI/CD pipeline
- Coordinated versioning

### Inter-Package Dependencies

```toml
# services/web-app/pyproject.toml
[tool.poetry.dependencies]
shared-utils = {path = "../../packages/shared-utils", develop = true}
api-client = {path = "../../packages/api-client", develop = true}
```

---

## Configuration Files

### pyproject.toml (Modern Standard)

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "myproject"
version = "0.1.0"
description = "Project description"
readme = "README.md"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115.0",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "pytest-cov>=4.1",
    "mypy>=1.8",
    "ruff>=0.1",
]

[project.scripts]
myapp = "myproject.main:main"

# Tool configurations
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]

[tool.mypy]
python_version = "3.11"
strict = true
```

### .env.example

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# API Keys
EXTERNAL_API_KEY=your_key_here

# Application
DEBUG=false
LOG_LEVEL=INFO
```

---

## Testing Layout

### Standard Test Structure

```
tests/
├── unit/                   # Fast, isolated tests
│   ├── test_domain.py
│   └── test_utils.py
├── integration/            # Slower, external deps
│   ├── test_api.py
│   └── test_database.py
├── fixtures/               # Shared test data
│   └── sample_data.json
└── conftest.py             # pytest configuration
```

### conftest.py Template

```python
import pytest
from pathlib import Path

# Fixtures available to all tests
@pytest.fixture
def sample_data():
    return {"key": "value"}

@pytest.fixture
def temp_dir(tmp_path: Path):
    """Create temporary directory for tests."""
    return tmp_path
```

---

## Quick Reference

### Layout Decision Tree

```
Is it a one-off script?
├── Yes → Single Script
└── No
    Will it be installed (pip install)?
    ├── Yes → src/ layout
    └── No
        Multiple modules?
        ├── Yes → src/ layout
        └── No → Flat layout
```

### Common Commands

```bash
# Create new project with src layout
mkdir -p src/myproject tests
touch src/myproject/__init__.py

# Install in development mode
pip install -e .

# Run tests
pytest

# Type check
mypy src/

# Format code
ruff format src/ tests/
```

---

## References

- [Python Packaging Authority (PyPA)](https://packaging.python.org/)
- [Python Application Structure](https://realpython.com/python-application-layouts/)
- [Src Layout Benefits](https://blog.ionelmc.ro/2014/05/25/python-packaging/#the-structure)
