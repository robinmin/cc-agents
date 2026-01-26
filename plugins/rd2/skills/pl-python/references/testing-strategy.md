# Python Testing Strategy

Complete guide to testing Python applications with pytest and related tools.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Organization](#test-organization)
3. [pytest Fundamentals](#pytest-fundamentals)
4. [Testing Patterns](#testing-patterns)
5. [Async Testing](#async-testing)
6. [Fixtures and Mocking](#fixtures-and-mocking)
7. [Coverage and Quality](#coverage-and-quality)

---

## Testing Philosophy

### The Testing Pyramid

```
        /\
       /  \      E2E Tests (few, slow, expensive)
      /____\
     /      \    Integration Tests (some, medium)
    /________\
   /          \  Unit Tests (many, fast, cheap)
  /____________\
```

**Distribution Rules of Thumb:**
- **70% Unit Tests** - Test business logic in isolation
- **20% Integration Tests** - Test component interactions
- **10% E2E Tests** - Test critical user workflows

### Test Categories

| Category | Scope | Speed | Purpose |
|----------|-------|-------|---------|
| **Unit** | Single function/class | Fast (< 0.1s) | Verify logic correctness |
| **Integration** | Multiple components | Medium (< 1s) | Verify interactions |
| **Contract** | API boundaries | Medium | Verify interface compliance |
| **E2E** | Full system | Slow (> 1s) | Verify user workflows |

---

## Test Organization

### Directory Structure

```
tests/
├── __init__.py
├── conftest.py              # Shared fixtures
├── unit/                    # Isolated tests
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_services.py
│   └── test_utils.py
├── integration/             # Component interaction tests
│   ├── __init__.py
│   ├── test_api.py
│   ├── test_database.py
│   └── test_external_apis.py
├── e2e/                     # End-to-end tests
│   ├── __init__.py
│   └── test_user_flows.py
└── fixtures/                # Test data and mocks
    ├── __init__.py
    ├── sample_data.json
    └── mock_responses.py
```

### Naming Conventions

**Test Files:**
- Prefix: `test_`
- Example: `test_user_service.py`, `test_database.py`

**Test Classes:**
- Prefix: `Test`
- Example: `TestUserService`, `TestDatabase`

**Test Functions:**
- Prefix: `test_`
- Example: `test_create_user`, `test_delete_user_with_invalid_id`

**Good:**
```python
def test_create_user_with_valid_email_returns_user_id():
    pass
```

**Avoid:**
```python
def testUser():
    pass
```

---

## pytest Fundamentals

### Basic Test Structure

```python
import pytest

def test_addition():
    """Simple assertion test."""
    assert 1 + 1 == 2

def test_with_variables():
    """Test with setup and assertion."""
    result = calculate_sum([1, 2, 3])
    assert result == 6

def test_exception_raised():
    """Test that exception is raised."""
    with pytest.raises(ValueError):
        raise ValueError("Invalid input")
```

### Assertions

| Assertion | Usage | Example |
|-----------|-------|---------|
| `assert a == b` | Equality | `assert result == 42` |
| `assert a != b` | Inequality | `assert result != 0` |
| `assert a in b` | Membership | `assert "key" in dict` |
| `assert a is None` | None check | `assert result is None` |
| `assert a is b` | Identity | `assert a is b` |
| `assert isinstance(a, Type)` | Type check | `assert isinstance(x, str)` |
| `pytest.raises(Exception)` | Exception | `with pytest.raises(ValueError):` |

### Test Markers

```python
import pytest

@pytest.mark.unit
def test_something():
    """Marked as unit test."""
    pass

@pytest.mark.slow
def test_slow_operation():
    """Marked as slow test."""
    pass

@pytest.mark.integration
@pytest.mark.database
def test_database_query():
    """Multiple markers."""
    pass
```

**Run specific markers:**
```bash
# Run only unit tests
pytest -m unit

# Run tests NOT marked as slow
pytest -m "not slow"

# Run tests with multiple markers
pytest -m "integration and database"
```

---

## Testing Patterns

### Arrange-Act-Assert (AAA)

```python
def test_create_user():
    # Arrange: Set up test data
    user_data = {"name": "Alice", "email": "alice@example.com"}
    service = UserService()

    # Act: Execute the code under test
    user = service.create_user(user_data)

    # Assert: Verify expected outcome
    assert user.name == "Alice"
    assert user.email == "alice@example.com"
    assert user.id is not None
```

### Parameterized Tests

```python
@pytest.mark.parametrize("input,expected", [
    (2, 4),           # 2 * 2 = 4
    (3, 9),           # 3 * 3 = 9
    (4, 16),          # 4 * 4 = 16
    (-2, 4),          # -2 * -2 = 4
])
def test_square(input, expected):
    assert square(input) == expected

# With parameter names
@pytest.mark.parametrize("x,y,expected", [
    (1, 2, 3),
    (2, 3, 5),
    (10, -5, 5),
])
def test_addition(x, y, expected):
    assert add(x, y) == expected
```

### Test Skipping and Failing

```python
import pytest

@pytest.mark.skip(reason="Feature not implemented yet")
def test_new_feature():
    pass

@pytest.mark.skipif(sys.version_info < (3, 11), reason="Requires Python 3.11+")
def test_python_311_feature():
    pass

@pytest.mark.xfail(reason="Known bug, should be fixed")
def test_known_issue():
    assert 1 == 2  # Will be marked as xfail, not fail

def test_skip_conditionally():
    if not os.getenv("API_KEY"):
        pytest.skip("API_KEY not set")
```

---

## Async Testing

### pytest-asyncio Setup

**Install:**
```bash
pip install pytest-asyncio
```

**pyproject.toml:**
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
```

### Basic Async Tests

```python
import pytest

@pytest.mark.asyncio
async def test_async_function():
    """Basic async test."""
    result = await fetch_data()
    assert result is not None

@pytest.mark.asyncio
async def test_async_with_timeout():
    """Async test with timeout."""
    with pytest.raises(asyncio.TimeoutError):
        async with asyncio.timeout(0.1):
            await slow_operation()
```

### Async Fixtures

```python
import pytest

@pytest.fixture
async def async_client():
    """Async fixture - automatically cleaned up."""
    async with aiohttp.ClientSession() as session:
        yield session

@pytest.mark.asyncio
async def test_with_async_fixture(async_client):
    response = await async_client.get("https://httpbin.org/get")
    assert response.status == 200

@pytest.fixture(scope="session")
async def database():
    """Session-scoped async fixture."""
    db = await Database.connect()
    yield db
    await db.close()
```

### Testing Async Context Managers

```python
@pytest.mark.asyncio
async def test_context_manager():
    """Test async context manager."""
    async with AsyncResource() as resource:
        assert resource.is_connected
        await resource.do_work()
    # Resource is cleaned up here
```

---

## Fixtures and Mocking

### Basic Fixtures

```python
import pytest

@pytest.fixture
def sample_data():
    """Simple fixture returning data."""
    return {"name": "Test", "value": 42}

def test_with_fixture(sample_data):
    assert sample_data["name"] == "Test"
    assert sample_data["value"] == 42

@pytest.fixture
def temp_file(tmp_path):
    """Fixture using pytest's tmp_path."""
    file_path = tmp_path / "test.txt"
    file_path.write_text("Hello, World!")
    return file_path

def test_with_temp_file(temp_file):
    content = temp_file.read_text()
    assert content == "Hello, World!"
```

### Fixture Scopes

| Scope | Description | When to Use |
|-------|-------------|-------------|
| `function` | Default, run per test | Most fixtures |
| `class` | Run once per test class | Shared class setup |
| `module` | Run once per module | Expensive setup |
| `package` | Run once per package | Rarely used |
| `session` | Run once per test session | Databases, servers |

```python
@pytest.fixture(scope="session")
def database_connection():
    """Created once for entire test session."""
    conn = Database.connect()
    yield conn
    conn.close()

@pytest.fixture(scope="module")
def api_client():
    """Created once per module."""
    return APIClient()

@pytest.fixture
def user_token(api_client):
    """Created for each test (default)."""
    return api_client.login("test", "pass")
```

### Mocking with pytest-mock

```python
import pytest

def test_mock_function(mocker):
    """Mock a function."""
    mock_func = mocker.patch("module.function")
    mock_func.return_value = 42

    result = module.function()
    assert result == 42
    mock_func.assert_called_once()

def test_mock_with_side_effect(mocker):
    """Mock with side effect."""
    mock_func = mocker.patch("module.function")
    mock_func.side_effect = [1, 2, 3]

    assert module.function() == 1
    assert module.function() == 2
    assert module.function() == 3

def test_mock_exception(mocker):
    """Mock raising exception."""
    mock_func = mocker.patch("module.function")
    mock_func.side_effect = ValueError("Error")

    with pytest.raises(ValueError):
        module.function()
```

### Mocking Async Functions

```python
import pytest
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_async_mock(mocker):
    """Mock async function."""
    mock_async = AsyncMock(return_value="result")
    result = await mock_async()
    assert result == "result"
    mock_async.assert_awaited_once()

@pytest.mark.asyncio
async def test_patch_async(mocker):
    """Patch async function in module."""
    mocker.patch("module.async_func", AsyncMock(return_value="mocked"))
    result = await module.async_func()
    assert result == "mocked"
```

---

## Coverage and Quality

### pytest-cov

**Install:**
```bash
pip install pytest-cov
```

**Run with coverage:**
```bash
# Terminal output
pytest --cov=src --cov-report=term-missing

# HTML report
pytest --cov=src --cov-report=html

# Combined
pytest --cov=src --cov-report=term-missing --cov-report=html
```

### Coverage Configuration

**pyproject.toml:**
```toml
[tool.coverage.run]
source = ["src"]
omit = [
    "tests/*",
    "*/__init__.py",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise NotImplementedError",
    "if TYPE_CHECKING:",
    "if __name__ == .__main__.:",
]

[tool.coverage.html]
directory = "htmlcov"
```

### Coverage Goals

| Component | Target Coverage | Notes |
|-----------|-----------------|-------|
| **Core Logic** | 90%+ | Business critical code |
| **Services** | 85%+ | Application logic |
| **API** | 80%+ | Routes and handlers |
| **Models** | 80%+ | Data models |
| **Utilities** | 70%+ | Helper functions |

### Hypothesis (Property-Based Testing)

**Install:**
```bash
pip install hypothesis
```

```python
from hypothesis import given, strategies as st

@given(st.integers(), st.integers())
def test_addition_commutative(a, b):
    """Property: Addition is commutative."""
    assert a + b == b + a

@given(st.lists(st.integers()))
def test_sort_preserves_length(lst):
    """Property: Sort preserves list length."""
    assert len(sorted(lst)) == len(lst)

@given(st.text())
def test_roundtrip_encoding(text):
    """Property: Encode then decode returns original."""
    encoded = text.encode("utf-8")
    decoded = encoded.decode("utf-8")
    assert decoded == text
```

---

## Test Configuration

### conftest.py Template

```python
import os
import pytest
import asyncio

# Global fixtures
@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def mock_env(monkeypatch):
    """Set test environment variables."""
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("DEBUG", "true")

# Hooks
def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )

def pytest_collection_modifyitems(config, items):
    """Auto-mark slow tests."""
    for item in items:
        if "slow" in item.nodeid:
            item.add_marker(pytest.mark.slow)
```

### pytest.ini Configuration

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --strict-markers
    --tb=short
    --cov=src
    --cov-report=term-missing
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
    unit: marks tests as unit tests
asyncio_mode = auto
```

---

## Quick Reference

### Common pytest Commands

```bash
# Run all tests
pytest

# Run specific file
pytest tests/test_services.py

# Run specific test
pytest tests/test_services.py::test_create_user

# Run with coverage
pytest --cov=src

# Run and stop on first failure
pytest -x

# Run failed tests only
pytest --lf

# Run verbose output
pytest -v

# Run with debugger on failure
pytest --pdb
```

### Assertion Cheat Sheet

```python
# Equality
assert a == b
assert a != b

# Membership
assert x in [1, 2, 3]
assert key in dict

# Comparison
assert a > b
assert 5 <= x < 10

# Types
assert isinstance(x, str)
assert type(x) is int

# Truthiness
assert value
assert not value
assert value is None
assert value is not None

# Exceptions
with pytest.raises(ValueError):
    raise ValueError("error")

with pytest.raises(ValueError, match="invalid"):
    raise ValueError("invalid input")

# Approximate (for floats)
assert result == pytest.approx(3.14159, rel=1e-3)
```

---

## References

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-asyncio Documentation](https://pytest-asyncio.readthedocs.io/)
- [Hypothesis Documentation](https://hypothesis.readthedocs.io/)
- [Python Testing Best Practices](https://docs.python-guide.org/writing/tests/)
