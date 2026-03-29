---
name: project-structures
description: "Python project layout patterns: src layout, flat layout, monorepo structures"
see_also:
  - rd3:pl-python
  - rd3:architecture-patterns
---

# Python Project Structures

Complete guide to Python project layout patterns.

## Project Type Overview

| Project Type | Layout | Complexity |
|-------------|--------|------------|
| **Simple Script** | Single file or flat | Low |
| **Small Package** | `src/` layout | Low-Medium |
| **Application** | Layered `src/` | Medium |
| **Library** | Clean `src/` with exposed API | Medium |
| **Monorepo** | Multi-package with tooling | High |

---

## Simple Script / Single Module

**Best for:** Scripts, automation, one-off tools

```
project/
├── script.py
├── pyproject.toml
└── README.md
```

**pyproject.toml:**
```toml
[project]
name = "my-script"
version = "0.1.0"
requires-python = ">=3.11"
```

**When to use:** Data processing scripts, CI/CD helpers, one-time automation.

---

## Small Package (src Layout)

**Best for:** Small libraries, internal packages, microservices

```
project/
├── src/
│   └── mypackage/
│       ├── __init__.py
│       ├── core.py
│       └── utils.py
├── tests/
│   ├── __init__.py
│   ├── test_core.py
│   └── test_utils.py
├── pyproject.toml
├── README.md
└── .gitignore
```

**Why src/ layout?**
- Better import isolation
- Prevents accidental imports of uninstalled package
- Easier to test without installation

**pyproject.toml:**
```toml
[project]
name = "mypackage"
version = "0.1.0"
requires-python = ">=3.11"

[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]
```

---

## Application (Layered Architecture)

**Best for:** Web APIs, services, data pipelines

```
project/
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── main.py              # Entry point
│       ├── config.py             # Settings
│       ├── domain/               # Business logic (no external deps)
│       │   ├── __init__.py
│       │   ├── entities.py
│       │   ├── value_objects.py
│       │   └── services.py
│       ├── application/          # Use cases, orchestration
│       │   ├── __init__.py
│       │   ├── commands.py
│       │   └── queries.py
│       ├── infrastructure/       # External dependencies
│       │   ├── __init__.py
│       │   ├── database.py
│       │   ├── repositories.py
│       │   └── external_api.py
│       └── api/                  # Interface adapters
│           ├── __init__.py
│           ├── routes.py
│           ├── schemas.py
│           └── middleware.py
├── tests/
│   ├── __init__.py
│   ├── unit/
│   │   ├── domain/
│   │   └── application/
│   └── integration/
│       └── api/
├── scripts/
│   └── seed_data.py
├── pyproject.toml
├── Dockerfile
└── README.md
```

**Domain layer — no external dependencies:**
```python
# src/myapp/domain/entities.py
from dataclasses import dataclass

@dataclass(frozen=True)
class Order:
    id: str
    customer_id: str
    items: list["OrderItem"]
    status: "OrderStatus"

class OrderStatus:
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
```

---

## Library / Package (Clean Exposed API)

**Best for:** Libraries published to PyPI, internal shared packages

```
project/
├── src/
│   └── mylib/
│       ├── __init__.py          # Public API exports
│       ├── _internal.py          # Private implementation
│       └── py.typed              # Type stubs marker
├── tests/
│   ├── __init__.py
│   ├── test_public_api.py
│   └── test_integration.py
├── docs/
│   └── api.md
├── examples/
│   └── usage.py
├── pyproject.toml
└── README.md
```

**Exposing public API in `__init__.py`:**
```python
# src/mylib/__init__.py
from mylib.core import Client, connect
from mylib.models import User, Order

__all__ = ["Client", "connect", "User", "Order"]
__version__ = "1.0.0"
```

**pyproject.toml for library:**
```toml
[project]
name = "mylib"
version = "1.0.0"
requires-python = ">=3.11"
readme = "README.md"
license = {text = "MIT"}
authors = [{name = "Your Name", email = "you@example.com"}]
classifiers = [
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
]

[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]

[tool.setuptools.package-data]
mylib = ["py.typed"]
```

---

## Monorepo (Multi-Package)

**Best for:** Multiple related packages, shared tooling

```
monorepo/
├── packages/
│   ├── shared/
│   │   ├── pyproject.toml
│   │   └── src/
│   │       └── shared/
│   ├── api/
│   │   ├── pyproject.toml
│   │   └── src/
│   │       └── api/
│   └── worker/
│       ├── pyproject.toml
│       └── src/
│           └── worker/
├── tooling/
│   ├── ruff.toml
│   └── mypy.toml
├── tests/
│   └── shared/
├── pyproject.toml           # Workspace root
├── uv.lock
└── README.md
```

**Root pyproject.toml (uv workspace):**
```toml
[tool.uv.workspace]
members = ["packages/*"]

[tool.ruff]
workspace.root = "."
```

**Per-package pyproject.toml:**
```toml
[project]
name = "monorepo-shared"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = []

[tool.uv.sources]
shared = { workspace = true }
```

---

## Data Pipeline Project

**Best for:** ETL, data processing, batch jobs

```
project/
├── src/
│   └── mypipeline/
│       ├── __init__.py
│       ├── main.py              # Entry point
│       ├── extract/
│       │   ├── __init__.py
│       │   ├── api_client.py
│       │   └── database.py
│       ├── transform/
│       │   ├── __init__.py
│       │   ├── clean.py
│       │   └── aggregate.py
│       └── load/
│           ├── __init__.py
│           └── writer.py
├── tests/
│   ├── unit/
│   └── integration/
├── scripts/
│   └── local_run.py
├── config/
│   └── pipeline.yaml
├── pyproject.toml
└── Dockerfile
```

---

## Testing Layout

### Standard pytest Layout

```
project/
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # Shared fixtures
│   ├── unit/
│   │   ├── __init__.py
│   │   ├── test_services.py
│   │   └── test_models.py
│   └── integration/
│       ├── __init__.py
│       ├── test_api.py
│       └── test_database.py
└── pyproject.toml
```

### conftest.py Pattern

```python
# tests/conftest.py
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app import create_app

@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with AsyncSession(engine) as session:
        yield session

@pytest.fixture
async def client():
    app = create_app()
    async with AsyncClient(app) as ac:
        yield ac
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|-------------|---------|
| Python modules | `snake_case.py` | `user_service.py` |
| Packages | `snake_case/` | `user_service/` |
| Tests | `test_<module>.py` | `test_user_service.py` |
| Private modules | `_private.py` | `_helpers.py` |
| Type stubs | `<module>.pyi` | `numpy.pyi` |

## File Organization

Prefer many small, focused files over few large ones:

| Metric | Guideline |
|--------|-----------|
| Typical module | 200–400 lines |
| Maximum module | 800 lines (split beyond this) |
| Function / method | <50 lines |
| Nesting depth | <4 levels |
| Class | Single responsibility |
| Organization | By feature/domain, not by type |

Extract utilities from large modules early. High cohesion and low coupling make code easier to test, review, and refactor.

---

## pyproject.toml Reference

```toml
[project]
name = "myproject"
version = "0.1.0"
description = "A short description"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115.0",
    "pydantic>=2.5.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "ruff>=0.1.0",
    "mypy>=1.8.0",
]

[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.mypy]
python_version = "3.11"
strict = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```
