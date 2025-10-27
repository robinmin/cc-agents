# integrate-10-dev Command

Create integration tests for related functions in the 10-stage development workflow.

## What This Command Does

When you have multiple related functions (e.g., `get_user_info` and `set_user_info`), this command creates integration tests that verify they work together correctly:

1. **Detect Related Functions**: Analyze function relationships and data flow
2. **Generate Integration Test Spec**: Define what integration scenarios to test
3. **Create Integration Tests**: Write comprehensive integration test suite
4. **Verify Tests Pass**: Ensure integration tests succeed
5. **Report Coverage**: Show integration test coverage

## When to Use

### Automatic Detection

The workflow automatically suggests integration tests after Stage 6 when:
- Multiple functions share data models
- Functions form a workflow chain (CRUD operations)
- Functions have input/output dependencies
- Functions operate on the same domain objects

### Manual Invocation

Explicitly create integration tests:
```bash
# Test two related functions
/integrate-10-dev get_user_info set_user_info

# Test a function workflow
/integrate-10-dev create_order process_payment ship_order

# Test all functions in a module
/integrate-10-dev --module user_service

# Add integration tests to existing suite
/integrate-10-dev --function validate_email --add-to-suite
```

## Execution Process

### Step 1: Relationship Analysis

Claude analyzes:
- **Data Flow**: What data passes between functions?
- **Dependencies**: What order must functions be called?
- **State Changes**: How do functions modify shared state?
- **Error Propagation**: How do errors flow through the system?

Example analysis:
```
Functions: get_user_info, set_user_info, delete_user

Relationships:
- set_user_info → modifies user data
- get_user_info → reads user data (depends on set)
- delete_user → removes user data (invalidates get)

Integration Scenarios:
1. Set then Get (verify data persistence)
2. Set twice then Get (verify update)
3. Set, Delete, then Get (verify deletion)
4. Get before Set (verify error handling)
```

### Step 2: Integration Test Specification

Defines test scenarios:
```
Integration Test Spec: User Info Management

Scenario 1: Complete User Workflow
  1. set_user_info(user_id, data)
  2. get_user_info(user_id)
  3. Verify: retrieved data matches set data

Scenario 2: Update User Info
  1. set_user_info(user_id, initial_data)
  2. set_user_info(user_id, updated_data)
  3. get_user_info(user_id)
  4. Verify: data reflects updates

Scenario 3: Delete User
  1. set_user_info(user_id, data)
  2. delete_user(user_id)
  3. get_user_info(user_id)
  4. Verify: raises UserNotFoundError

Scenario 4: Concurrent Operations
  1. set_user_info(user_id, data1) in thread 1
  2. set_user_info(user_id, data2) in thread 2
  3. get_user_info(user_id)
  4. Verify: consistent state (no corruption)
```

### Step 3: Create Integration Tests

Generates test file in `tests/integration/`:

**Python Example**:
```python
# tests/integration/test_user_info_integration.py
"""Integration tests for user info functions."""

import pytest
from src.user_service import get_user_info, set_user_info, delete_user


class TestUserInfoIntegration:
    """Integration tests for user info management."""

    def test_set_and_get_user_info(self):
        """Test setting and retrieving user info."""
        user_id = "test_user_123"
        user_data = {"name": "John Doe", "email": "john@example.com"}

        # Set user info
        set_user_info(user_id, user_data)

        # Get user info
        retrieved_data = get_user_info(user_id)

        # Verify
        assert retrieved_data == user_data

    def test_update_user_info(self):
        """Test updating existing user info."""
        user_id = "test_user_456"
        initial_data = {"name": "Jane Doe", "email": "jane@example.com"}
        updated_data = {"name": "Jane Smith", "email": "jane.smith@example.com"}

        # Set initial data
        set_user_info(user_id, initial_data)

        # Update data
        set_user_info(user_id, updated_data)

        # Get and verify
        retrieved_data = get_user_info(user_id)
        assert retrieved_data == updated_data

    def test_delete_user_info(self):
        """Test deleting user info."""
        user_id = "test_user_789"
        user_data = {"name": "Bob Smith", "email": "bob@example.com"}

        # Set user info
        set_user_info(user_id, user_data)

        # Delete user
        delete_user(user_id)

        # Verify deletion
        with pytest.raises(UserNotFoundError):
            get_user_info(user_id)

    def test_get_nonexistent_user(self):
        """Test getting info for non-existent user."""
        with pytest.raises(UserNotFoundError):
            get_user_info("nonexistent_user")
```

**JavaScript Example**:
```javascript
// tests/integration/userInfo.integration.test.js
const { getUserInfo, setUserInfo, deleteUser } = require('../../src/userService');

describe('User Info Integration Tests', () => {
    test('set and get user info', async () => {
        const userId = 'test_user_123';
        const userData = { name: 'John Doe', email: 'john@example.com' };

        await setUserInfo(userId, userData);
        const retrieved = await getUserInfo(userId);

        expect(retrieved).toEqual(userData);
    });

    test('update user info', async () => {
        const userId = 'test_user_456';
        const initialData = { name: 'Jane Doe' };
        const updatedData = { name: 'Jane Smith' };

        await setUserInfo(userId, initialData);
        await setUserInfo(userId, updatedData);

        const retrieved = await getUserInfo(userId);
        expect(retrieved).toEqual(updatedData);
    });

    test('delete user info', async () => {
        const userId = 'test_user_789';
        const userData = { name: 'Bob Smith' };

        await setUserInfo(userId, userData);
        await deleteUser(userId);

        await expect(getUserInfo(userId))
            .rejects.toThrow('UserNotFoundError');
    });
});
```

### Step 4: Run Integration Tests

Executes tests using build tool:
```bash
# Python
make test-integration

# JavaScript
npm run test:integration

# Go
make test-integration

# Java
mvn verify -Pintegration
```

### Step 5: Verify and Report

Reports results:
```
🔗 INTEGRATION TEST RESULTS

Test Suite: User Info Management
Functions Tested: get_user_info, set_user_info, delete_user

✅ PASSED (8/8):
  ✓ Complete user workflow
  ✓ Update user info
  ✓ Delete user info
  ✓ Get nonexistent user
  ✓ Concurrent operations
  ✓ Data persistence across calls
  ✓ Error propagation
  ✓ State consistency

Coverage:
  - Function integration: 100%
  - Workflow scenarios: 100%
  - Error cases: 100%

💡 INSIGHTS:
  - All functions work together correctly
  - Data consistency maintained across operations
  - Error handling works end-to-end
  - Ready for system integration

📋 NEXT STEPS:
  - Add E2E tests if needed
  - Document integration patterns
  - Ready to commit: git add tests/integration/
```

## Integration Test Patterns

### CRUD Operations
```python
def test_crud_workflow():
    """Test Create, Read, Update, Delete workflow."""
    # Create
    obj_id = create_object(data)

    # Read
    obj = read_object(obj_id)
    assert obj.data == data

    # Update
    update_object(obj_id, new_data)
    obj = read_object(obj_id)
    assert obj.data == new_data

    # Delete
    delete_object(obj_id)
    with pytest.raises(NotFoundError):
        read_object(obj_id)
```

### Data Pipeline
```python
def test_data_pipeline():
    """Test data flowing through multiple functions."""
    # Stage 1: Extract
    raw_data = extract_data(source)

    # Stage 2: Transform
    transformed_data = transform_data(raw_data)

    # Stage 3: Load
    load_data(destination, transformed_data)

    # Verify end-to-end
    result = query_data(destination)
    assert result == expected_output
```

### Async Operations
```python
@pytest.mark.asyncio
async def test_async_workflow():
    """Test asynchronous operation workflow."""
    # Start async operation
    task_id = await start_operation(params)

    # Check status
    while True:
        status = await check_status(task_id)
        if status.complete:
            break
        await asyncio.sleep(0.1)

    # Get results
    results = await get_results(task_id)
    assert results.success
```

### Error Recovery
```python
def test_error_recovery():
    """Test error handling and recovery across functions."""
    # Cause error in function A
    with pytest.raises(ProcessingError):
        function_a(invalid_data)

    # Verify function B handles it gracefully
    result = function_b()
    assert result.status == "recovered"

    # Verify system remains consistent
    state = get_system_state()
    assert state.is_consistent()
```

## Advanced Features

### Mocking External Dependencies

For integration tests that need external services:
```python
@pytest.fixture
def mock_database():
    """Mock database for integration tests."""
    with mock.patch('src.database') as db:
        yield db

def test_with_mocked_db(mock_database):
    """Test integration with mocked database."""
    mock_database.query.return_value = test_data
    result = integrated_function()
    assert result == expected
```

### Test Data Management

Generate realistic test data:
```python
@pytest.fixture
def test_user_data():
    """Generate test user data."""
    return {
        "user_id": f"test_user_{uuid.uuid4()}",
        "name": faker.name(),
        "email": faker.email(),
        "created_at": datetime.now()
    }
```

### Transaction Rollback

For database integration tests:
```python
@pytest.fixture
def db_transaction():
    """Provide transaction that rolls back after test."""
    transaction = db.begin()
    yield transaction
    transaction.rollback()
```

## Best Practices

### Keep Tests Independent
- Each integration test should be runnable independently
- Use setup/teardown to ensure clean state
- Don't rely on test execution order

### Test Real Scenarios
- Focus on actual user workflows
- Test common use cases first
- Add edge cases based on real issues

### Balance Coverage and Maintenance
- Don't test every possible combination
- Focus on critical integration paths
- Refactor tests as code evolves

### Document Complex Scenarios
- Add comments explaining workflow
- Document why certain scenarios are tested
- Link to requirements or issues

## Troubleshooting

### "No related functions found"
- Ensure functions are in same module or related modules
- Check function signatures for shared data types
- Manually specify functions: `/integrate-10-dev func1 func2`

### "Integration tests fail but unit tests pass"
- Check function call order
- Verify data transformations
- Ensure proper state management
- Check for race conditions

### "Tests are slow"
- Use mocks for external dependencies
- Optimize test data generation
- Run tests in parallel if possible
- Consider test database instead of production

## See Also

- `/apply-10-dev` - Implement functions with unit tests
- `/check-10-dev` - Verify test setup
- Unit vs Integration testing best practices
- Test data management patterns
