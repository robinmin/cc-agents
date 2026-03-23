---
name: test-generation-patterns
description: "Language-specific test patterns for extending existing test suites: Python, TypeScript, and Go."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [testing, test-patterns, unit-tests, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions:
    - knowledge-only
see_also:
  - rd3:sys-testing
  - rd3:sys-testing/coverage-analysis
---

# Test Generation Patterns Reference

Language-specific patterns for extending existing test suites.

## Core Principles

### Progressive Test Generation

```
Happy Path → Edge Cases → Error Paths → Complex Scenarios
```

Start simple, add complexity iteratively. AI generates better tests with clear, incremental targets.

### Context-Aware Generation

Provide:
- Function signatures and types
- Documentation strings
- Related test examples
- Usage patterns

### Verification-First

Always verify AI-generated tests:
- Run tests immediately
- Check coverage impact
- Review for correctness

## Language-Specific Patterns

### Python

#### Pytest Fixture-Based Tests

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

#### Parameterized Edge Cases

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

#### Mock-Based Integration Tests

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

#### Jest Test Suite Structure

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
});
```

#### Async/Await Testing

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

#### Table-Driven Tests

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

#### Interface Mocking

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

## Common Test Generation Issues

### Issue 1: No Assertions

**Problem:** Test passes but verifies nothing

```python
# BAD: No assertion
def test_add():
    add(1, 2)

# GOOD: Verifies result
def test_add():
    assert add(1, 2) == 3
```

### Issue 2: Brittle Mocks

**Problem:** Over-mocking internal implementation

```python
# BAD: Mocking internal utility
@patch('module.internal_helper')
def test_something(mock_helper):
    result = my_function()

# GOOD: Test behavior directly
def test_something():
    result = my_function()
    assert result == expected
```

### Issue 3: Hallucinated Imports

**Problem:** AI imports non-existent modules

```bash
# Error: ModuleNotFoundError: No module named 'fake_module'
```

**Fix:**
1. Verify imports exist
2. Use correct module names
3. Align test-runner module resolution with the project's existing layout and config

## Coverage-Guided Generation

### Analyze Coverage Report

```bash
pytest --cov=src --cov-report=term-missing
```

### Generate Targeted Tests

Target specific uncovered lines:
- Lines 23-27: error handling for invalid token
- Lines 45-48: edge case for empty user list
- Line 78: timeout handling

### Verify Impact

Run again and compare:
- Before: 82%
- After: 91%

## Best Practices Summary

1. **Start simple** — Happy path first, then complexity
2. **Specify framework** — pytest, jest, go test patterns
3. **Verify immediately** — Run tests after each generation
4. **Check coverage** — Use reports to guide generation
5. **Mock appropriately** — External dependencies only
6. **Test behavior** — Not implementation details
7. **Include assertions** — No test without verification
8. **Document rationale** — When accepting lower coverage
