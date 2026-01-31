# Pytest Setup Example

## Project Structure

```
project/
├── src/
│   ├── __init__.py
│   └── auth.py
├── tests/
│   ├── conftest.py          # Shared fixtures
│   └── test_auth.py         # Auth tests
└── pyproject.toml           # Dependencies
```

## Configuration

### pyproject.toml

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
addopts = ["--cov=src", "--cov-report=term-missing", "--cov-report=html"]

[tool.coverage.run]
source = ["src"]
omit = ["*/tests/*", "*/test_*.py"]

[project.optional-dependencies]
dev = ["pytest>=7.0.0", "pytest-cov>=4.0.0", "pytest-mock>=3.10.0"]
```

### conftest.py (Shared Fixtures)

```python
import pytest
from unittest.mock import Mock

@pytest.fixture
def sample_user():
    return {"id": 1, "username": "testuser", "email": "test@example.com", "is_active": True}

@pytest.fixture
def mock_repo():
    class MockRepository:
        def __init__(self):
            self._users = {1: sample_user()}
        def find_by_id(self, user_id: int):
            return self._users.get(user_id)
    return MockRepository()

# Module registration for dashed filenames (e.g., context-validator.py)
# See references/python-module-registration.md for complete pattern
```

## Example Test File

### test_auth.py

```python
"""
Tests for auth.py module.
"""

import pytest
from unittest.mock import Mock, patch
from src.auth import AuthService, InvalidCredentialsError, TokenExpiredError

# Fixtures
@pytest.fixture
def auth_service(mock_repo):
    return AuthService(mock_repo)

@pytest.fixture
def sample_token(auth_service):
    result = auth_service.login("testuser", "correct_password")
    return result["token"]

# Happy Path
def test_login_success(auth_service):
    result = auth_service.login("testuser", "correct_password")
    assert result["token"] is not None
    assert result["user"]["username"] == "testuser"

# Edge Cases (parameterized)
@pytest.mark.parametrize("username,password", [
    ("", "password"),           # Empty username
    ("user", ""),               # Empty password
    (None, "password"),         # None username
])
def test_login_empty_credentials(auth_service, username, password):
    with pytest.raises(InvalidCredentialsError):
        auth_service.login(username, password)

# Error Paths
def test_login_wrong_password(auth_service):
    with pytest.raises(InvalidCredentialsError):
        auth_service.login("testuser", "wrong_password")

# Mock-Based Tests
@patch('src.auth.requests.get')
def test_external_auth(mock_get, auth_service):
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"verified": True}
    mock_get.return_value = mock_response
    result = auth_service.verify_external_token("token")
    assert result is True
```

## Running Tests

### Basic Commands

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src

# Run specific file
pytest tests/test_auth.py

# Generate HTML report
pytest --cov=src --cov-report=html && open htmlcov/index.html
```

### Expected Output

```
====================== 45 passed in 2.34s =======================
---------- coverage: platform darwin, python 3.11 ----------
Name                Stmts   Miss  Cover   Missing
-------------------------------------------------
src/auth.py            89      5    94%   23-27
src/user.py           156      8    95%   45-48, 78-82
-------------------------------------------------
TOTAL                 290     15    95%
======================== 45 passed, 95% coverage =========================
```

## Common Issues

### ModuleNotFoundError (Dashed Filenames)

**Cause:** `context-validator.py` cannot import as `context_validator`

**Fix:** Add module registration to conftest.py (see references/python-module-registration.md)

### Tests Not Found

**Fix:** Ensure files start with `test_` and are in `tests/` directory. Verify with `pytest --collect-only`

### Coverage Not Measured

**Fix:** `pip install pytest-cov` and verify with `pytest --cov=src --version`
