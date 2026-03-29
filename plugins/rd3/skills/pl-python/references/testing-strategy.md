---
name: testing-strategy
description: "pytest testing strategies: fixtures, coverage, async testing, property-based testing"
see_also:
  - rd3:pl-python
  - rd3:sys-testing
---

# Python Testing Strategy

Complete guide to testing Python applications with pytest.

## Test Organization

### Directory Structure

```
tests/
├── __init__.py
├── conftest.py                 # Shared fixtures
├── unit/
│   ├── __init__.py
│   ├── test_services.py
│   └── test_models.py
├── integration/
│   ├── __init__.py
│   ├── test_api.py
│   └── test_database.py
└── fixtures/
    ├── __init__.py
    └── sample_data.py
```

### Test Naming

```python
# test_<module_name>.py
# test_<ClassName>_<method_name>

class TestUserService:
    def test_create_user_with_valid_data(self):
        ...

    def test_create_user_raises_error_for_duplicate_email(self):
        ...

    async def test_get_user_by_id_returns_user(self):
        ...
```

---

## pytest Fixtures

### Function-Scoped Fixture

```python
import pytest

@pytest.fixture
def sample_user():
    return {"name": "Alice", "email": "alice@example.com"}

def test_user(sample_user):
    assert sample_user["name"] == "Alice"
```

### Session-Scoped Fixture

```python
@pytest.fixture(scope="session")
def database_connection():
    """Create a database connection for the entire test session."""
    conn = create_connection()
    yield conn
    conn.close()
```

### Async Fixtures

```python
import pytest
import httpx

@pytest.fixture
async def async_client():
    async with httpx.AsyncClient() as client:
        yield client

@pytest.mark.asyncio
async def test_api(async_client):
    response = await async_client.get("https://api.example.com")
    assert response.status_code == 200
```

### Fixture with parameters

```python
@pytest.fixture(params=["alice@example.com", "bob@example.com"])
def user_email(request):
    return request.param

def test_user_email(user_email):
    assert "@" in user_email
```

---

## Async Testing

### Basic Async Test

```python
import pytest

@pytest.mark.asyncio
async def test_async_fetch():
    result = await fetch_data()
    assert result is not None
```

### Async Fixture Pattern

```python
import pytest
import aiofiles

@pytest.fixture
async def temp_file(tmp_path):
    file_path = tmp_path / "test.txt"
    async with aiofiles.open(file_path, "w") as f:
        await f.write("hello")
    return file_path

@pytest.mark.asyncio
async def test_read_file(temp_file):
    async with aiofiles.open(temp_file) as f:
        content = await f.read()
    assert content == "hello"
```

### pytest-asyncio Configuration

```toml
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
```

---

## Mocking

### unittest.mock

```python
from unittest.mock import Mock, patch, MagicMock

def test_with_mock():
    mock_db = Mock()
    mock_db.fetch.return_value = {"id": 1, "name": "Alice"}

    result = get_user(mock_db, user_id=1)

    assert result == {"id": 1, "name": "Alice"}
    mock_db.fetch.assert_called_once_with(user_id=1)
```

### Async Mock

```python
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_async_mock():
    mock_service = AsyncMock()
    mock_service.fetch_data.return_value = {"key": "value"}

    result = await mock_service.fetch_data()
    assert result == {"key": "value"}
```

### Patch Decorator

```python
from unittest.mock import patch

@patch("mymodule.Database")
def test_with_patch(MockDatabase):
    MockDatabase.return_value.fetch.return_value = {"id": 1}
    # Now mymodule.Database is replaced with MockDatabase
```

---

## Coverage

### pytest-cov

```bash
pytest --cov=src --cov-report=html --cov-report=term
```

### Configuration

```toml
[tool.coverage.run]
source = ["src"]
omit = ["*/tests/*", "*/migrations/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
```

### Coverage Targets

| Project Type | Target Coverage |
|-------------|---------------|
| Libraries | 90%+ |
| Applications | 85%+ |
| Scripts | 70%+ |

---

## Property-Based Testing (Hypothesis)

### Basic Example

```python
from hypothesis import given, strategies as st

@given(st.lists(st.integers()), st.integers())
def test_list_reverse_comutative(lst, n):
    lst.append(n)
    reversed_list = list(reversed(lst))
    assert list(reversed(reversed_list)) == lst
```

### Custom Strategies

```python
from hypothesis import given, strategies as st
from dataclasses import dataclass

@dataclass
class User:
    name: str
    email: str

user_strategy = st.builds(
    User,
    name=st.text(min_size=1, max_size=100),
    email=st.emails(),
)

@given(user_strategy)
def test_user_serialization(user):
    serialized = serialize_user(user)
    deserialized = deserialize_user(serialized)
    assert deserialized == user
```

---

## Database Testing

### Async SQLAlchemy Fixture

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with AsyncSession(engine) as session:
        yield session

@pytest.mark.asyncio
async def test_create_user(db_session):
    user = User(name="Alice", email="alice@example.com")
    db_session.add(user)
    await db_session.commit()

    result = await db_session.get(User, user.id)
    assert result.name == "Alice"
```

---

## API Testing

### FastAPI Test Client

```python
from fastapi.testclient import TestClient
from app import create_app

@pytest.fixture
def client():
    app = create_app()
    with TestClient(app) as c:
        yield c

def test_create_user(client):
    response = client.post("/users/", json={
        "name": "Alice",
        "email": "alice@example.com",
        "age": 30
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Alice"
```

### Async Test Client

```python
import pytest
from httpx import AsyncClient, ASGITransport
from app import create_app

@pytest.fixture
async def client():
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_create_user(client):
    response = await client.post("/users/", json={
        "name": "Alice",
        "email": "alice@example.com"
    })
    assert response.status_code == 201
```

---

## Test Categories

### Unit Tests
- Fast, isolated, no external dependencies
- Test single function/class
- Mock dependencies

### Integration Tests
- Test component interactions
- Real database (test instance)
- Test API endpoints

### Contract Tests
- Verify API responses match schema
- Use `schemathesis` for API testing

### End-to-End Tests
- Test full user flows
- Use real services (or close approximations)
- Typically fewer, more critical paths

---

## Best Practices

### Test Markers for Categorization

Use `pytest.mark` to categorize tests by type, enabling selective runs:

```python
import pytest

@pytest.mark.unit
def test_calculate_total():
    ...

@pytest.mark.integration
def test_database_connection():
    ...

@pytest.mark.slow
def test_full_pipeline():
    ...
```

```bash
# Run only unit tests
pytest -m unit

# Run everything except slow tests
pytest -m "not slow"

# Run integration and unit, but not slow
pytest -m "unit or integration"
```

Register markers in `pyproject.toml` (see `references/tooling.md` for full configuration).

### DO

```python
# Arrange-Act-Assert pattern
def test_create_order(self):
    # Arrange
    service = OrderService(repository=mock_repo)

    # Act
    order = service.create_order(customer_id="123", items=[...])

    # Assert
    assert order.status == OrderStatus.PENDING
    mock_repo.save.assert_called_once()
```

### DON'T

```python
# Don't test multiple things
def test_complex():
    # Too many assertions
    # Too many responsibilities
    # Hard to debug failures
```

### Test Structure

```python
class TestUserService:
    """Tests for UserService."""

    @pytest.fixture
    def service(self):
        return UserService(repository=mock_repo)

    @pytest.fixture
    def sample_user(self):
        return User(id="1", name="Alice", email="alice@example.com")

    async def test_create_user(self, service, sample_user):
        result = await service.create(sample_user)
        assert result.id is not None

    async def test_create_user_with_duplicate_email_raises(
        self, service, sample_user
    ):
        await service.create(sample_user)
        with pytest.raises(DuplicateEmailError):
            await service.create(sample_user)
```
