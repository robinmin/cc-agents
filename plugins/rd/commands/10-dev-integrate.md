---
description: Create integration tests for related functions to verify they work together correctly.
---

# integrate-10-dev

Create integration tests for related functions that work together.

## Purpose

When you have multiple related functions (e.g., `get_user_info` and `set_user_info`), this command:
- Analyzes function relationships and data flow
- Identifies integration scenarios (workflows, CRUD, pipelines)
- Creates comprehensive integration test suite in `tests/integration/`
- Runs tests separately from unit tests
- Reports integration coverage

## Usage

```bash
# Test two related functions
/rd:10-dev-integrate get_user_info set_user_info

# Test a workflow chain
/rd:10-dev-integrate create_order process_payment ship_order

# Test all functions in a module
/rd:10-dev-integrate --module user_service

# Add to existing integration suite
/rd:10-dev-integrate validate_email --add-to-suite
```

## Parameters

- `<function-names>`: Space-separated list of related functions (required)
- `--module <name>`: Test all functions in specified module
- `--add-to-suite`: Add to existing integration test file
- `--scenario <type>`: Focus on specific scenario (crud|pipeline|async|error)

## When to Use

### Automatic Suggestion
After `/rd:10-dev-apply` Stage 6, workflow suggests integration tests when:
- Multiple functions share data models
- Functions form workflow chains (CRUD operations)
- Functions have input/output dependencies
- Functions operate on same domain objects

### Manual Invocation
Explicitly create integration tests for:
- **CRUD workflows**: Create → Read → Update → Delete
- **Data pipelines**: Extract → Transform → Load
- **Async operations**: Start → Check status → Get results
- **Error propagation**: How errors flow through system

## What Happens

### Step 1: Relationship Analysis
Analyzes:
- **Data Flow**: What data passes between functions?
- **Dependencies**: What order must functions be called?
- **State Changes**: How do functions modify shared state?
- **Error Propagation**: How do errors flow through system?

### Step 2: Integration Scenarios
Generates test scenarios:
```
Functions: get_user_info, set_user_info, delete_user

Scenarios:
1. Set then Get (verify data persistence)
2. Set twice then Get (verify update)
3. Set, Delete, then Get (verify deletion)
4. Get before Set (verify error handling)
```

### Step 3: Create Tests
Creates `tests/integration/test_<module>_integration.py`:

```python
"""Integration tests for user info functions."""

class TestUserInfoIntegration:
    def test_set_and_get_user_info(self):
        """Test setting and retrieving user info."""
        user_id = "test_user_123"
        user_data = {"name": "John", "email": "john@example.com"}

        set_user_info(user_id, user_data)
        retrieved = get_user_info(user_id)

        assert retrieved == user_data

    def test_update_user_info(self):
        """Test updating existing user info."""
        user_id = "test_user_456"
        initial = {"name": "Jane"}
        updated = {"name": "Jane Smith"}

        set_user_info(user_id, initial)
        set_user_info(user_id, updated)
        retrieved = get_user_info(user_id)

        assert retrieved == updated

    def test_delete_user_info(self):
        """Test deleting user info."""
        user_id = "test_user_789"

        set_user_info(user_id, {"name": "Bob"})
        delete_user(user_id)

        with pytest.raises(UserNotFoundError):
            get_user_info(user_id)
```

### Step 4: Run Tests
Executes using build tool:

```bash
# Python
make test-integration

# JavaScript
npm run test:integration

# Go
make test-integration PKG=./pkg/module

# Java
mvn verify -Pintegration
```

### Step 5: Report Results
```
🔗 INTEGRATION TEST RESULTS

Test Suite: User Info Management
Functions: get_user_info, set_user_info, delete_user

✅ PASSED (8/8):
  ✓ Complete user workflow
  ✓ Update user info
  ✓ Delete user info
  ✓ Get nonexistent user
  ✓ Concurrent operations
  ✓ Data persistence
  ✓ Error propagation
  ✓ State consistency

Coverage:
  - Function integration: 100%
  - Workflow scenarios: 100%
  - Error cases: 100%

📋 Next Steps:
  - Add E2E tests if needed
  - Document integration patterns
  - Commit: git add tests/integration/
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
    assert read_object(obj_id).data == new_data

    # Delete
    delete_object(obj_id)
    with pytest.raises(NotFoundError):
        read_object(obj_id)
```

### Data Pipeline
```python
def test_data_pipeline():
    """Test data flowing through multiple functions."""
    raw_data = extract_data(source)
    transformed = transform_data(raw_data)
    load_data(destination, transformed)

    result = query_data(destination)
    assert result == expected_output
```

### Async Operations
```python
@pytest.mark.asyncio
async def test_async_workflow():
    """Test asynchronous operation workflow."""
    task_id = await start_operation(params)

    # Wait for completion
    while True:
        status = await check_status(task_id)
        if status.complete:
            break
        await asyncio.sleep(0.1)

    results = await get_results(task_id)
    assert results.success
```

### Error Recovery
```python
def test_error_recovery():
    """Test error handling across functions."""
    # Cause error
    with pytest.raises(ProcessingError):
        function_a(invalid_data)

    # Verify graceful handling
    result = function_b()
    assert result.status == "recovered"

    # Verify consistency
    assert get_system_state().is_consistent()
```

## Examples

### Example 1: User Management
```bash
/rd:10-dev-integrate get_user set_user delete_user
```

Creates integration tests for complete user lifecycle.

### Example 2: Payment Processing
```bash
/rd:10-dev-integrate create_order process_payment ship_order --scenario pipeline
```

Tests order fulfillment pipeline end-to-end.

### Example 3: Module Integration
```bash
/rd:10-dev-integrate --module authentication
```

Tests all authentication functions together (login, logout, refresh_token, validate_session).

## Best Practices

### Keep Tests Independent
- Each test should be runnable independently
- Use setup/teardown for clean state
- Don't rely on test execution order

### Test Real Scenarios
- Focus on actual user workflows
- Test common use cases first
- Add edge cases based on real issues

### Balance Coverage
- Don't test every possible combination
- Focus on critical integration paths
- Refactor tests as code evolves

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No related functions found" | Manually specify: `/rd:10-dev-integrate func1 func2` |
| "Integration tests fail but unit tests pass" | Check function call order, data transformations, state management |
| "Tests are slow" | Use mocks for external dependencies, optimize test data |
| "Integration directory not found" | Run `/rd:10-dev-init` to create directory structure |

## See Also

- **Implementation**: `/rd:10-dev-apply` (implement functions with unit tests)
- **Setup**: `/rd:10-dev-check` (verify test setup)
- **Patterns**: `skills/10-stages-developing/docs/examples.md` (integration test examples)
- **Workflow**: `skills/10-stages-developing/SKILL.md` (Stage 6b details)
