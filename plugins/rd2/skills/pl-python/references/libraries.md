# Python Libraries Reference

Recommended Python libraries by domain with version guidance and selection criteria.

## Table of Contents

1. [Web Frameworks](#web-frameworks)
2. [Async & Networking](#async--networking)
3. [Data Processing](#data-processing)
4. [Databases](#databases)
5. [Testing](#testing)
6. [Developer Tools](#developer-tools)
7. [CLI & Scripting](#cli--scripting)

---

## Web Frameworks

### FastAPI

**Best for:** Modern async APIs, automatic documentation, type-safe APIs

```toml
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn>=0.30.0",
]
```

**When to choose:**
- Need OpenAPI/Swagger documentation
- Want async support
- Type hints are important
- Building REST/GraphQL APIs

**Alternatives:** Flask (simpler), Django (batteries-included)

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

**When to use:**
- Always start with asyncio
- Combine with async-capable libraries

### aiohttp

**Best for:** Async HTTP client/server

```toml
dependencies = [
    "aiohttp>=3.9.0",
]
```

**When to choose:**
- Need async HTTP requests
- Building async API server
- Websocket support needed

**Example:**
```python
import aiohttp
import asyncio

async def fetch(url: str):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()

async def main():
    html = await fetch("https://example.com")
    print(html)

asyncio.run(main())
```

### aiofiles

**Best for:** Async file operations

```toml
dependencies = [
    "aiofiles>=23.0.0",
]
```

**Example:**
```python
import aiofiles
import asyncio

async def read_file(filename: str):
    async with aiofiles.open(filename) as f:
        return await f.read()
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

### Polars

**Best for:** Large datasets, high-performance data processing

```toml
dependencies = [
    "polars>=0.20.0",
]
```

**When to choose:**
- Pandas is too slow
- Working with large datasets
- Want multi-threaded processing

### Pydantic

**Best for:** Data validation, settings management, serialization

```toml
dependencies = [
    "pydantic>=2.5.0",
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
    def check_age(cls, v):
        if v < 18:
            raise ValueError('Age must be 18+')
        return v
```

---

## Databases

### SQLAlchemy (Core)

**Best for:** SQL queries, database abstraction

```toml
dependencies = [
    "sqlalchemy>=2.0.0",
]
```

**When to choose:**
- Want SQL control
- Need database abstraction
- Building complex queries

### SQLAlchemy (ORM)

**Best for:** Traditional ORM patterns, migrations

```toml
dependencies = [
    "sqlalchemy>=2.0.0",
]
```

### Async Database Libraries

| Database | Library | Async Support |
|----------|---------|---------------|
| PostgreSQL | `asyncpg` | Native async |
| PostgreSQL | `sqlalchemy[asyncio]` | ORM async |
| MySQL | `aiomysql` | Async wrapper |
| SQLite | `aiosqlite` | Async wrapper |
| MongoDB | `motor` | Native async |
| Redis | `aioredis` | Native async |

**Example (asyncpg):**
```python
import asyncpg
import asyncio

async def fetch_user(user_id: int):
    conn = await asyncpg.connect("postgresql://localhost/db")
    row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    await conn.close()
    return row
```

---

## Testing

### pytest

**Best for:** All Python testing (industry standard)

```toml
dev-dependencies = [
    "pytest>=8.0.0",
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

**Best for:** Async test support

```toml
dev-dependencies = [
    "pytest-asyncio>=0.23.0",
]
```

**Example:**
```python
import pytest

@pytest.mark.asyncio
async def test_async_function():
    await some_async_function()
    assert True
```

### pytest-cov

**Best for:** Code coverage reporting

```toml
dev-dependencies = [
    "pytest-cov>=4.1.0",
]
```

**Usage:**
```bash
pytest --cov=src --cov-report=html
```

### pytest-mock

**Best for:** Mocking and patching

```toml
dev-dependencies = [
    "pytest-mock>=3.12.0",
]
```

### Hypothesis

**Best for:** Property-based testing

```toml
dev-dependencies = [
    "hypothesis>=6.100.0",
]
```

**Example:**
```python
from hypothesis import given, strategies as st

@given(st.integers(), st.integers())
def test_addition_commutative(a, b):
    assert a + b == b + a
```

---

## Developer Tools

### Ruff

**Best for:** Linting and formatting (fast, modern replacement for Flake8/Black)

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
select = ["E", "F", "I", "N", "W"]
ignore = ["E501"]  # Line too long
```

**Usage:**
```bash
# Lint
ruff check src/

# Format
ruff format src/
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

**Best for:** Git hooks automation

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

**Example:**
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

### Typer

**Best for:** Modern CLIs with type hints

```toml
dependencies = [
    "typer>=0.9.0",
]
```

**Example:**
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

**Example:**
```python
from rich.console import Console
from rich.table import Table

console = Console()

table = Table(title="Star Wars Movies")
table.add_column("Released", justify="right", style="cyan", no_wrap=True)
table.add_column("Title", style="magenta")
table.add_column("Box Office", justify="right", style="green")

table.add_row("1977", "Star Wars: Episode IV", "$775M")
console.print(table)
```

---

## Configuration & Environment

### python-dotenv

**Best for:** Environment variable management

```toml
dependencies = [
    "python-dotenv>=1.0.0",
]
```

**Example:**
```python
from dotenv import load_dotenv
import os

load_dotenv()  # Load from .env file

database_url = os.getenv("DATABASE_URL")
```

### pydantic-settings

**Best for:** Type-safe configuration management

```toml
dependencies = [
    "pydantic-settings>=2.1.0",
]
```

**Example:**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    debug: bool = False
    api_key: str

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## Scheduling & Tasks

### APScheduler

**Best for:** Scheduled jobs, cron-like tasks

```toml
dependencies = [
    "apscheduler>=3.10.0",
]
```

### Celery

**Best for:** Distributed task queues

```toml
dependencies = [
    "celery>=5.3.0",
    "redis>=5.0.0",  # Broker
]
```

---

## Quick Reference

### Decision Trees

**Web Framework:**
```
Need async + auto docs? → FastAPI
Want minimal boilerplate? → Flask
Need admin + ORM + auth? → Django
```

**Database:**
```
SQL needed? → SQLAlchemy
NoSQL? → Motor (MongoDB), aioredis (Redis)
Async required? → asyncpg, aiomysql, motor
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
| pytest | 8.0+ | 8.0+ | Modern features |
| pydantic | 2.0+ | 2.5+ | V2 has breaking changes |
| mypy | 1.0+ | 1.8+ | Latest type checking |

---

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pytest Documentation](https://docs.pytest.org/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Ruff Documentation](https://docs.astral.sh/ruff/)
