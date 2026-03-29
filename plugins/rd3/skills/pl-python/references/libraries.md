---
name: libraries
description: "Python library selection guide by domain: web, async, data, database, testing, CLI"
see_also:
  - rd3:pl-python
  - rd3:sys-developing
---

# Python Libraries Reference

Recommended Python libraries by domain with version guidance and selection criteria.

## Web Frameworks

### FastAPI (Recommended)

**Best for:** Modern async APIs, automatic OpenAPI docs, type-safe APIs

```toml
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
]
```

**When to choose:**
- Need OpenAPI/Swagger documentation
- Want async support
- Type hints are important
- Building REST/GraphQL APIs

### Flask

**Best for:** Microservices, simple APIs, maximum flexibility

```toml
dependencies = [
    "flask>=3.0.0",
]
```

**When to choose:**
- Want minimal framework
- Need maximum control
- Building simple services
- Small team, simple requirements

### Django

**Best for:** Full-stack web apps, CMS, admin panels

```toml
dependencies = [
    "django>=5.0.0",
]
```

**When to choose:**
- Need admin interface out of the box
- Building traditional web apps
- Want ORM, auth, templates included
- Large team, established conventions

---

## Async & Networking

### asyncio (Standard Library)

**Best for:** All async operations, event loop management

```python
import asyncio

async def main():
    await asyncio.gather(
        fetch_data(),
        process_data(),
    )

asyncio.run(main())
```

### httpx (Recommended — Async HTTP)

**Best for:** Async HTTP client/server, drop-in requests replacement

```toml
dependencies = [
    "httpx>=0.27.0",
]
```

```python
import httpx
import asyncio

async def fetch(url: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.text()

async def main():
    html = await fetch("https://example.com")
    print(html)

asyncio.run(main())
```

### aiohttp (Legacy Async HTTP)

**Best for:** Async HTTP server, WebSocket support

```toml
dependencies = [
    "aiohttp>=3.9.0",
]
```

### aiofiles

**Best for:** Async file operations

```toml
dependencies = [
    "aiofiles>=23.0.0",
]
```

### websockets

**Best for:** WebSocket clients/servers

```toml
dependencies = [
    "websockets>=12.0",
]
```

---

## Data Processing

### Polars (Recommended for Large Datasets)

**Best for:** Large datasets, high-performance data processing

```toml
dependencies = [
    "polars>=1.0.0",
]
```

**When to choose:**
- Pandas is too slow
- Working with large datasets
- Want multi-threaded processing
- Need memory-efficient data frames

### Pandas

**Best for:** Tabular data, CSV/Excel processing, data analysis

```toml
dependencies = [
    "pandas>=2.2.0",
]
```

**When to choose:**
- Working with tabular data
- Need data manipulation tools
- CSV/Excel import/export
- Integration with existing ecosystem

---

## Data Validation

### Pydantic (Recommended)

**Best for:** Data validation, settings management, serialization

```toml
dependencies = [
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
]
```

**Example:**
```python
from pydantic import BaseModel, EmailStr, field_validator

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    age: int

    @field_validator('age')
    @classmethod
    def check_age(cls, v: int) -> int:
        if v < 18:
            raise ValueError('Age must be 18+')
        return v
```

---

## Databases

### SQLAlchemy 2.0 (Recommended)

**Best for:** SQL queries, database abstraction, async ORM

```toml
dependencies = [
    "sqlalchemy>=2.0.0",
]
```

**Async usage:**
```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

engine = create_async_engine("postgresql+asyncpg://localhost/db")

async def get_session() -> AsyncSession:
    async with AsyncSession(engine) as session:
        yield session
```

### Async Database Libraries

| Database | Library | Async Support |
|----------|---------|---------------|
| PostgreSQL | `asyncpg` | Native async |
| PostgreSQL | `sqlalchemy[asyncio]` | ORM async |
| MySQL | `aiomysql` | Async wrapper |
| SQLite | `aiosqlite` | Async wrapper |
| MongoDB | `motor` | Native async |
| Redis | `redis.asyncio` | Native async |

**Example (asyncpg):**
```python
import asyncpg
import asyncio

async def fetch_user(user_id: int):
    conn = await asyncpg.connect("postgresql://localhost/db")
    try:
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        return row
    finally:
        await conn.close()
```

---

## Testing

### pytest (Standard)

**Best for:** All Python testing

```toml
dev-dependencies = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=4.1.0",
    "pytest-mock>=3.12.0",
    "hypothesis>=6.100.0",
]
```

**Example:**
```python
import pytest

def test_addition():
    assert 1 + 1 == 2

@pytest.fixture
def sample_data():
    return {"key": "value"}

def test_with_fixture(sample_data):
    assert sample_data["key"] == "value"
```

### pytest-asyncio

```python
import pytest

@pytest.mark.asyncio
async def test_async_function():
    await some_async_function()
    assert True
```

### Hypothesis

```python
from hypothesis import given, strategies as st

@given(st.integers(), st.integers())
def test_addition_commutative(a, b):
    assert a + b == b + a
```

---

## Developer Tools

### Ruff (Recommended — Fast Linter/Formatter)

**Best for:** Linting and formatting (replaces Flake8/Black/isort)

```toml
dev-dependencies = [
    "ruff>=0.1.0",
]
```

**pyproject.toml:**
```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]
ignore = ["E501"]
```

### uv (Recommended — Package Manager)

**Best for:** Fast package installation, Python version management

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create project
uv init --python 3.11 myproject

# Add dependencies
uv add fastapi uvicorn

# Add dev dependencies
uv add --dev pytest pytest-asyncio

# Run scripts
uv run pytest
```

### mypy

**Best for:** Type checking

```toml
dev-dependencies = [
    "mypy>=1.8.0",
]
```

**pyproject.toml:**
```toml
[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
```

### pre-commit

```toml
dev-dependencies = [
    "pre-commit>=3.6.0",
]
```

**.pre-commit-config.yaml:**
```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.0
    hooks:
      - id: ruff
      - id: ruff-format
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
```

---

## CLI & Scripting

### Click

**Best for:** Command-line interfaces

```toml
dependencies = [
    "click>=8.1.0",
]
```

```python
import click

@click.command()
@click.option('--count', default=1, help='Number of greetings.')
@click.option('--name', prompt='Your name', help='Person to greet.')
def hello(count, name):
    for _ in range(count):
        click.echo(f'Hello, {name}!')

if __name__ == '__main__':
    hello()
```

### Typer (Type-Hint-Driven CLI)

**Best for:** Modern CLIs with type hints

```toml
dependencies = [
    "typer>=0.9.0",
]
```

```python
import typer

app = typer.Typer()

@app.command()
def hello(name: str = typer.Option(..., prompt=True)):
    typer.echo(f"Hello, {name}!")

if __name__ == "__main__":
    app()
```

### Rich

**Best for:** Beautiful terminal output

```toml
dependencies = [
    "rich>=13.7.0",
]
```

---

## Configuration & Environment

### pydantic-settings (Recommended)

**Best for:** Type-safe configuration management

```toml
dependencies = [
    "pydantic-settings>=2.1.0",
]
```

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    debug: bool = False
    api_key: str

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
```

---

## Decision Trees

**Web Framework:**
```
Need async + auto docs? → FastAPI
Want minimal boilerplate? → Flask
Need admin + ORM + auth? → Django
```

**Database:**
```
SQL needed? → SQLAlchemy 2.0
Async required? → asyncpg, aiomysql, motor
Redis caching? → redis.asyncio
```

**HTTP Client:**
```
Modern async? → httpx (recommended)
Legacy async? → aiohttp
Simple sync? → requests
```

**Testing:**
```
All projects → pytest
Async code → pytest-asyncio
Coverage → pytest-cov
Property tests → Hypothesis
```

---

## Version Guidelines

| Library | Minimum Version | Recommended | Notes |
|---------|----------------|-------------|-------|
| Python | 3.11+ | 3.12+ | Use latest stable |
| FastAPI | 0.100+ | 0.115+ | Active development |
| SQLAlchemy | 2.0+ | 2.0+ | Major 2.0 changes |
| Pydantic | 2.0+ | 2.5+ | V2 has breaking changes |
| httpx | 0.27+ | 0.27+ | Async-first |
| Polars | 1.0+ | 1.0+ | Fast DataFrame |
| pytest | 8.0+ | 8.0+ | Modern features |
| ruff | 0.1+ | latest | Fast linting |
| uv | latest | latest | 10-100x faster |
