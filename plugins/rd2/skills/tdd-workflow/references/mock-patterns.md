# Mock Design Patterns Reference

**Load this reference when:** Setting up mocking strategies for unit tests, deciding what to mock, or implementing test doubles.

## Core Principle

**Mock at the boundary of your system, not inside.**

```python
# WRONG - Mocking internal implementation
def test_user_service():
    mock_email_validator = Mock()  # Don't mock internal utilities
    mock_password_hasher = Mock()  # Don't mock internal helpers

# CORRECT - Mock external dependencies
def test_user_service():
    mock_database = Mock()  # Mock the database (external)
    mock_email_service = Mock()  # Mock email API (external)
    # Test real email validation and password hashing
```

## When to Mock

| Scenario | Mock? | Reason |
|----------|-------|--------|
| **Database queries** | Yes | Slow, external, requires setup |
| **API calls** | Yes | Slow, external, non-deterministic |
| **File system** | Yes | Slow, side effects |
| **Time/Date** | Yes | Non-deterministic |
| **Random numbers** | Yes | Non-deterministic |
| **Internal utilities** | No | Fast, deterministic |
| **Business logic** | No | This is what you're testing |

## Common Mock Patterns

### 1. Repository Pattern Mock (Database)

**Use when:** Testing service layer with database operations.

```python
from unittest.mock import Mock

def test_get_user_by_id():
    # Arrange
    mock_repo = Mock()
    mock_repo.get_by_id.return_value = User(id=1, name="Alice")
    service = UserService(mock_repo)

    # Act
    user = service.get_user(1)

    # Assert
    assert user.name == "Alice"
    mock_repo.get_by_id.assert_called_once_with(1)
```

**Key points:**
- Mock repository interface, not ORM
- Return domain objects, not database rows
- Verify method calls with `assert_called_once_with()`

### 2. Service Client Mock (External API)

**Use when:** Testing code that calls external APIs (Stripe, AWS, etc.).

```python
def test_create_payment():
    # Arrange
    mock_stripe = Mock()
    mock_stripe.charge.return_value = {
        "id": "ch_123",
        "status": "succeeded"
    }
    payment_service = PaymentService(mock_stripe)

    # Act
    result = payment_service.process_payment(1000, "tok_visa")

    # Assert
    assert result["status"] == "succeeded"
    mock_stripe.charge.assert_called_once_with(1000, "tok_visa")
```

**Key points:**
- Mock the API client, not HTTP library
- Mirror real API response structure
- Test error cases with `side_effect`

**Error handling example:**
```python
def test_payment_failure():
    mock_stripe = Mock()
    mock_stripe.charge.side_effect = PaymentError("Card declined")

    with pytest.raises(PaymentError, match="Card declined"):
        payment_service.process_payment(1000, "tok_visa")
```

### 3. Time Mocking (Temporal Logic)

**Use when:** Testing code with time-dependent behavior (expirations, deadlines, scheduling).

```python
from unittest.mock import patch
from datetime import datetime

def test_subscription_expiry():
    with patch('app.services.datetime') as mock_datetime:
        # Freeze time at specific moment
        mock_datetime.now.return_value = datetime(2026, 1, 1)
        mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)

        service = SubscriptionService()
        expired = service.is_expired(datetime(2025, 12, 31))

        assert expired is True
```

**Key points:**
- Patch datetime in the module where it's used, not where it's defined
- Set `side_effect` to preserve datetime constructor
- Test time boundaries (just before, at, just after threshold)

**Freezing time:**
```python
from freezegun import freeze_time  # Alternative library

@freeze_time("2026-01-01")
def test_new_year_promotion():
    assert is_promotion_active() is True
```

### 4. Environment Variable Mocking

**Use when:** Testing code that reads environment variables.

```python
import pytest
from unittest.mock import patch

@pytest.fixture
def mock_env():
    """Fixture that mocks environment variables."""
    with patch.dict('os.environ', {
        'API_KEY': 'test-key',
        'DB_URL': 'test-db',
        'DEBUG': 'false'
    }):
        yield

def test_service_initialization(mock_env):
    service = ApiService()
    assert service.api_key == 'test-key'
    assert service.db_url == 'test-db'
    assert service.debug is False
```

**Key points:**
- Use `patch.dict` for environment variables
- Clean up automatically with yield/fixture
- Test with different env configurations

### 5. File System Mocking

**Use when:** Testing file operations without real I/O.

**Option 1: Use tmp_path fixture (pytest)**
```python
def test_config_loader(tmp_path):
    # Create test file in temp directory
    config_file = tmp_path / "config.json"
    config_file.write_text('{"key": "value"}')

    # Test with real file operations in isolated temp dir
    config = ConfigLoader.load(str(config_file))
    assert config.key == "value"
```

**Option 2: Mock file operations**
```python
from unittest.mock import mock_open, patch

def test_read_config():
    m = mock_open(read_data='{"key": "value"}')
    with patch('builtins.open', m):
        config = read_config('config.json')
        assert config.key == "value"
        m.assert_called_once_with('config.json')
```

### 6. Context Manager Mocking

**Use when:** Testing code with context managers (database connections, file handles).

```python
def test_database_transaction():
    mock_connection = Mock()
    mock_cursor = Mock()
    mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
    mock_cursor.fetchall.return_value = [(1, 'Alice'), (2, 'Bob')]

    result = get_all_users(mock_connection)

    assert result == [(1, 'Alice'), (2, 'Bob')]
    mock_connection.cursor.assert_called_once()
    mock_cursor.execute.assert_called_once_with("SELECT * FROM users")
```

### 7. Generator Mocking

**Use when:** Mocking generators or iterators.

```python
def test_streaming_api():
    mock_responses = [
        {"data": "chunk1"},
        {"data": "chunk2"},
        {"data": "chunk3"}
    ]

    mock_api = Mock()
    mock_api.stream_events.return_value = iter(mock_responses)

    results = list(process_stream(mock_api))

    assert len(results) == 3
```

### 8. Async Mocking

**Use when:** Testing async code with async dependencies.

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_async_service():
    with patch('app.services.Database.fetch', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = {"id": 1, "name": "Alice"}

        result = await service.get_user(1)

        assert result["name"] == "Alice"
        mock_fetch.assert_awaited_once_with(1)
```

## Mock Verification Patterns

### Verify Called
```python
mock_method.assert_called()
mock_method.assert_called_once()
mock_method.assert_called_with(arg1, arg2)
mock_method.assert_called_once_with(arg1, arg2)
```

### Verify Not Called
```python
mock_method.assert_not_called()
```

### Verify Call Count
```python
assert mock_method.call_count == 3
```

### Inspect Call Arguments
```python
# Get all calls
all_calls = mock_method.call_args_list

# Get most recent call
last_call = mock_method.call_args
args, kwargs = last_call

# Get specific call
first_call = mock_method.call_args_list[0]
```

## Mock Return Values

### Single Return Value
```python
mock_method.return_value = 42
```

### Different Return Values Per Call
```python
mock_method.side_effect = [1, 2, 3]
# First call: 1, Second: 2, Third: 3
```

### Raise Exception
```python
mock_method.side_effect = ValueError("Invalid input")
```

### Dynamic Return Value
```python
def side_effect_func(value):
    return value * 2

mock_method.side_effect = side_effect_func
```

## Mock Objects

### Auto-Spec Mocks
```python
from unittest.mock import create_autospec

# Mock with same interface as real class
mock_service = create_autospec(Service)
mock_service.process.return_value = "result"

# Raises AttributeError for non-existent methods
mock_service.nonexistent_method()  # AttributeError
```

### Mock as Context Manager
```python
mock_cm = Mock()
mock_cm.__enter__ = Mock(return_value="resource")
mock_cm.__exit__ = Mock(return_value=False)

with mock_cm as resource:
    assert resource == "resource"
```

## Patching Strategies

### Patch Where Used, Not Where Defined

```python
# WRONG - patches where defined
patch('mymodule.SomeClass', ...)

# CORRECT - patches where used
patch('myapp.mymodule.SomeClass', ...)
```

### Patch as Decorator
```python
@patch('module.external_api_call')
def test_with_patch(mock_api):
    mock_api.return_value = {"status": "ok"}
    # Test code here
```

### Patch as Context Manager
```python
def test_with_patch():
    with patch('module.external_api_call') as mock_api:
        mock_api.return_value = {"status": "ok"}
        # Test code here
```

### Patch Multiple Items
```python
@patch('module.api_call_1')
@patch('module.api_call_2')
def test_with_multiple_patches(mock2, mock1):
    # Note: Order is reversed!
    mock1.return_value = "result1"
    mock2.return_value = "result2"
```

## Common Pitfalls

### 1. Over-Mocking
```python
# BAD - Everything is mocked
def test_service():
    mock_db = Mock()
    mock_cache = Mock()
    mock_logger = Mock()
    mock_validator = Mock()
    # What are we actually testing?

# GOOD - Mock only external dependencies
def test_service():
    mock_db = Mock()  # External
    mock_cache = Mock()  # External
    # Test real validator and logger
```

### 2. Brittle Mocks
```python
# BAD - Fails if internal implementation changes
mock_method.assert_called_with({"key": "value"})
mock_method.assert_called_once()

# GOOD - Tests behavior, not implementation details
assert result == expected_value
```

### 3. Incomplete Mocks
```python
# BAD - Only fields you think you need
mock_response = Mock()
mock_response.status = 200
# Missing: data, headers, metadata...

# GOOD - Mirror real API structure
mock_response = Mock()
mock_response.status = 200
mock_response.data = {"id": 1}
mock_response.headers = {"Content-Type": "application/json"}
```

## Quick Reference

| Pattern | Use Case | Key Points |
|---------|----------|------------|
| **Repository** | Database operations | Mock interface, not ORM |
| **Service Client** | External APIs | Mirror API response structure |
| **Time Mocking** | Time-dependent code | Patch where used |
| **Env Variables** | Configuration | Use `patch.dict` |
| **File System** | File operations | Use `tmp_path` or `mock_open` |
| **Context Manager** | Resources | Mock `__enter__`/`__exit__` |
| **Generator** | Streaming | Return `iter()` |
| **Async** | Async code | Use `AsyncMock` |

---

For TDD fundamentals, see: `SKILL.md`
For testing anti-patterns, see: `references/testing-anti-patterns.md`
