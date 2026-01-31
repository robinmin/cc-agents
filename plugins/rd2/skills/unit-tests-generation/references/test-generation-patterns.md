# AI-Assisted Test Generation Patterns

## Overview

This document describes patterns and strategies for generating comprehensive unit tests using AI assistance, based on research and practical experience with AI code generation tools.

## Core Principles

### 1. Progressive Test Generation

Start simple, add complexity iteratively:

```
Happy Path → Edge Cases → Error Paths → Complex Scenarios
```

**Why:** AI generates better tests when given clear, incremental targets

### 2. Context-Aware Generation

Provide AI with:
- Function signatures and types
- Documentation strings
- Related test examples
- Usage patterns

**Why:** More context → Better tests → Higher coverage

### 3. Verification-First Approach

Always verify AI-generated tests:
- Run tests immediately
- Check coverage impact
- Review for correctness
- Fix hallucinations

**Why:** AI may generate syntactically correct but semantically wrong tests

## Language-Specific Patterns

### Python

#### Pattern 1: Pytest Fixture-Based Tests

**Scenario:** Testing class with dependencies

**Generation Prompt:**
```
Generate pytest tests for AuthService class:
- Uses UserRepository dependency
- Has login() and logout() methods
- Raises InvalidCredentials for wrong password
- Use pytest fixtures for setup
```

**Generated Pattern:**
```python
import pytest
from unittest.mock import Mock

@pytest.fixture
def mock_repo():
    return Mock(spec=UserRepository)

@pytest.fixture
def auth_service(mock_repo):
    return AuthService(mock_repo)

def test_login_success(auth_service, mock_repo):
    mock_repo.find_by_username.return_value = user
    token = auth_service.login("user", "pass")
    assert token is not None

def test_login_invalid_credentials(auth_service):
    with pytest.raises(InvalidCredentials):
        auth_service.login("user", "wrong")
```

#### Pattern 2: Parameterized Edge Cases

**Scenario:** Testing boundary conditions

**Generation Prompt:**
```
Generate parameterized tests for paginate() function:
- Accepts page number (int) and page_size (int)
- Returns slice of items
- Raises ValueError for page < 1 or page_size < 1
- Use @pytest.mark.parametrize
```

**Generated Pattern:**
```python
import pytest

@pytest.mark.parametrize("page,page_size,expected", [
    (1, 10, 0),      # First page
    (2, 10, 10),     # Second page
    (1, 1, 0),       # Minimum page_size
    (100, 10, 990),  # Late page
])
def test_paginate_valid(page, page_size, expected):
    items = list(range(1000))
    result = paginate(items, page, page_size)
    assert result.start == expected

@pytest.mark.parametrize("page,page_size", [
    (0, 10),   # Invalid page
    (-1, 10),  # Negative page
    (1, 0),    # Invalid page_size
    (1, -1),   # Negative page_size
])
def test_paginate_invalid(page, page_size):
    with pytest.raises(ValueError):
        paginate([], page, page_size)
```

#### Pattern 3: Mock-Based Integration Tests

**Scenario:** Testing external API calls

**Generation Prompt:**
```
Generate tests for APIClient.fetch_user():
- Makes HTTP GET to /users/{id}
- Returns parsed JSON response
- Raises APIError for non-200 status
- Mock requests.get() using patch
```

**Generated Pattern:**
```python
import pytest
from unittest.mock import patch, Mock

@patch('requests.get')
def test_fetch_user_success(mock_get):
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"id": 1, "name": "Test"}
    mock_get.return_value = mock_response

    client = APIClient()
    user = client.fetch_user(1)

    assert user["name"] == "Test"
    mock_get.assert_called_once_with("https://api.example.com/users/1")

@patch('requests.get')
def test_fetch_user_not_found(mock_get):
    mock_response = Mock()
    mock_response.status_code = 404
    mock_get.return_value = mock_response

    client = APIClient()
    with pytest.raises(APIError):
        client.fetch_user(999)
```

### TypeScript/JavaScript

#### Pattern 1: Jest Test Suite Structure

**Scenario:** Testing React component

**Generation Prompt:**
```
Generate jest tests for UserCard component:
- Accepts name and email props
- Renders name and email
- Handles null/undefined props
- Use @testing-library/react
```

**Generated Pattern:**
```typescript
import { render, screen } from '@testing-library/react';
import { UserCard } from './UserCard';

describe('UserCard', () => {
  const defaultProps = {
    name: 'Test User',
    email: 'test@example.com'
  };

  it('renders name and email', () => {
    render(<UserCard {...defaultProps} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('handles null props gracefully', () => {
    render(<UserCard name={null} email={null} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(<UserCard {...defaultProps} />);
    expect(container).toMatchSnapshot();
  });
});
```

#### Pattern 2: Async/Await Testing

**Scenario:** Testing async functions

**Generation Prompt:**
```
Generate jest tests for async fetchUserData() function:
- Fetches from /api/users/{id}
- Returns user data or null if not found
- Uses axios.get
- Mock axios module
```

**Generated Pattern:**
```typescript
import axios from 'axios';
import { fetchUserData } from './api';

jest.mock('axios');

describe('fetchUserData', () => {
  it('returns user data on success', async () => {
    const mockUser = { id: 1, name: 'Test' };
    (axios.get as jest.Mock).mockResolvedValue({ data: mockUser });

    const result = await fetchUserData(1);
    expect(result).toEqual(mockUser);
  });

  it('returns null on 404', async () => {
    (axios.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });

    const result = await fetchUserData(999);
    expect(result).toBeNull();
  });

  it('throws on other errors', async () => {
    (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(fetchUserData(1)).rejects.toThrow('Network error');
  });
});
```

### Go

#### Pattern 1: Table-Driven Tests

**Scenario:** Testing validation logic

**Generation Prompt:**
```
Generate table-driven tests for ValidateEmail() function:
- Returns error for invalid emails
- Returns nil for valid emails
- Test various formats
```

**Generated Pattern:**
```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        wantErr bool
    }{
        {"valid standard", "user@example.com", false},
        {"valid plus", "user+tag@example.com", false},
        {"missing @", "userexample.com", true},
        {"missing domain", "user@", true},
        {"empty", "", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateEmail(tt.email)
            if (err != nil) != tt.wantErr {
                t.Errorf("ValidateEmail() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

#### Pattern 2: Interface Mocking

**Scenario:** Testing service layer

**Generation Prompt:**
```
Generate tests for UserService using mock repository:
- CreateUser() calls repo.Save()
- Returns user or error
- Mock Repository interface
```

**Generated Pattern:**
```go
func TestUserService_CreateUser(t *testing.T) {
    mockRepo := &MockRepository{
        SaveFunc: func(u *User) error {
            u.ID = 123
            return nil
        },
    }

    service := NewUserService(mockRepo)

    user := &User{Name: "Test", Email: "test@example.com"}
    err := service.CreateUser(user)

    if err != nil {
        t.Errorf("CreateUser() error = %v", err)
    }
    if user.ID != 123 {
        t.Errorf("ID not set, got %d", user.ID)
    }
}
```

## AI Prompt Engineering Strategies

### Strategy 1: Provide Context First

**Good Prompt:**
```
Context:
- Function: calculate_discount(user, amount)
- User has is_vip() method
- Business rule: VIP gets 10% off, regular gets 5% off for orders > $100

Generate tests covering:
1. VIP users
2. Regular users
3. Order amount thresholds
4. Edge cases
```

**Bad Prompt:**
```
Generate tests for calculate_discount function
```

### Strategy 2: Specify Test Framework

**Good Prompt:**
```
Generate pytest tests for Python function:
- Use pytest.raises() for exceptions
- Use @pytest.mark.parametrize for multiple cases
- Use fixtures for setup
```

**Bad Prompt:**
```
Generate unit tests
```

### Strategy 3: Request Coverage Goals

**Good Prompt:**
```
Generate tests to achieve 85% coverage for auth.py:
- Focus on uncovered lines 23-45, 78-92
- Test error paths in login()
- Test edge cases in validate_token()
```

**Bad Prompt:**
```
Generate more tests
```

## Common AI Generation Issues

### Issue 1: Hallucinated Imports

**Problem:** AI imports non-existent modules

**Detection:**
```bash
# Run tests
pytest

# Error: ModuleNotFoundError: No module named 'fake_module'
```

**Fix:**
1. Verify imports exist
2. Use correct module names
3. Add conftest.py for module registration

### Issue 2: Wrong Assertions

**Problem:** AI generates tests that pass but don't verify behavior

**Example:**
```python
# Bad: No assertion
def test_add():
    add(1, 2)

# Good: Verifies result
def test_add():
    assert add(1, 2) == 3
```

**Fix:**
1. Always include assertions
2. Verify expected behavior
3. Test edge cases

### Issue 3: Brittle Mocks

**Problem:** AI over-mocks internal implementation

**Example:**
```python
# Bad: Mocking internal utility
@patch('module.internal_helper')
def test_something(mock_helper):
    result = my_function()

# Good: Test behavior directly
def test_something():
    result = my_function()
    assert result == expected
```

**Fix:**
1. Mock only external dependencies
2. Test behavior, not implementation
3. Use real implementations when fast

## Iterative Improvement Workflow

### Iteration 1: Generate Happy Path

```
Prompt: "Generate basic tests for {function}"
→ Run tests
→ Check coverage
```

### Iteration 2: Add Edge Cases

```
Prompt: "Add edge case tests for uncovered lines {lines}"
→ Run tests
→ Check coverage
```

### Iteration 3: Add Error Paths

```
Prompt: "Add error handling tests for {function}"
→ Run tests
→ Check coverage
```

### Iteration 4: Quality Review

```
Prompt: "Review tests for correctness and quality"
→ Fix issues
→ Final verification
```

## Coverage-Guided Generation

### Analyze Coverage Report

```bash
pytest --cov=src --cov-report=term-missing
```

**Output:**
```
Name              Stmts   Miss  Cover   Missing
-----------------------------------------------
src/auth.py          45      8    82%   23-27, 45-48
```

### Generate Targeted Tests

**Prompt Strategy:**
```
Generate tests for src/auth.py:
- Target uncovered lines: 23-27, 45-48
- Line 23: error handling for invalid token
- Line 45: edge case for empty user list
- Line 48: timeout handling
```

### Verify Impact

```bash
# Run again
pytest --cov=src --cov-report=term-missing

# Compare coverage
# Before: 82%
# After:  91%
```

## Best Practices Summary

1. **Start simple** - Happy path first, then complexity
2. **Provide context** - Function signatures, types, documentation
3. **Specify framework** - pytest, jest, go test patterns
4. **Verify immediately** - Run tests after each generation
5. **Check coverage** - Use coverage reports to guide generation
6. **Review quality** - Fix hallucinations, add missing assertions
7. **Iterate** - Incremental improvements over batch generation
8. **Mock appropriately** - External dependencies only
9. **Test behavior** - Not implementation details
10. **Document rationale** - When accepting lower coverage

## Sources

- [Qt.io: AI Test Generation Guide](https://www.qt.io/quality-assurance/blog/a-practical-guide-to-generating-unit-tests-with-ai-code-assistants)
- [Claude Code Testing Best Practices](https://code.claude.com/docs/en/testing)
- [AI-Assisted Testing Research](https://arxiv.org/abs/2305.12345)
