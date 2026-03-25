---
name: tdd-patterns
description: "TDD cycle patterns: red-green-refactor, test naming, mock strategies, and anti-patterns"
see_also:
  - rd3:code-implement-common
  - rd3:tdd-workflow
  - rd3:sys-debugging
---

# TDD Patterns and Examples

Complete reference for test-driven development cycle patterns.

## TDD Enforcement

**Iron Law: NO production code without a failing test first.**

### TDD Cycle with Fix-and-Repeat

```
RED (Fail) ──→ GREEN (Pass) ──→ REFACTOR (Improve)
   │                │                  │
   ▼                ▼                  ▼
Write test      Write minimal      Clean code
that fails     code to pass      Keep tests green
                    │
                    ▼
               If test fails:
               FIX code, re-test
               until all pass
```

**Key point:** GREEN is NOT "write code once and done." If tests fail after initial implementation, you MUST fix the code and re-test. Repeat until all tests pass.

### TDD Cycle Steps

```
1. RED: Write failing test
   └── Verify test fails for the right reason

2. GREEN: Write minimal code to pass
   └── If test still fails: FIX code, re-test
   └── Repeat FIX → TEST until test passes
   └── Only then proceed to next step

3. REFACTOR: Clean code while keeping tests green
   └── If refactoring breaks tests: FIX and re-test
   └── Never leave tests red after refactoring
```

For detailed patterns, examples, and anti-patterns, see the sections below.

## Red-Green-Refactor Cycle

### The Three Phases

```
┌─────────────────────────────────────────────────────────────┐
│ RED PHASE                                                   │
│ ─────────                                                   │
│ Write a failing test that describes desired behavior         │
│                                                             │
│ ✓ Test must compile (if compiled language)                  │
│ ✓ Test must fail for the right reason                      │
│ ✓ Test name describes the behavior                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ GREEN PHASE                                                  │
│ ──────────                                                   │
│ Write minimal code to make the test pass                    │
│                                                             │
│ ✓ Write ONLY enough code to pass                            │
│ ✓ Do not optimize or refactor                               │
│ ✓ Focus on correctness, not elegance                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ REFACTOR PHASE                                              │
│ ─────────────                                               │
│ Clean up code while keeping tests green                     │
│                                                             │
│ ✓ Improve code structure                                     │
│ ✓ Remove duplication                                        │
│ ✓ Improve naming                                           │
│ ✓ Keep tests unchanged                                     │
└─────────────────────────────────────────────────────────────┘
```

## Test Naming Conventions

### Behavior-Describing Names

Good test names describe **behavior**, not implementation:

```typescript
// GOOD: Describes behavior
describe('UserService', () => {
  it('returns user profile when valid ID provided', () => {
    // ...
  });

  it('throws NotFoundError when user does not exist', () => {
    // ...
  });

  it('sanitizes input before saving to database', () => {
    // ...
  });
});

// BAD: Describes implementation
describe('UserService', () => {
  it('testGetUserById', () => {
    // ...
  });

  it('testUserNotFound', () => {
    // ...
  });
});
```

### Naming Patterns

| Pattern | Format | Example |
|---------|--------|---------|
| `describe` | Module/Class | `describe('UserService')` |
| `it` | Expected behavior | `it('returns user when found')` |
| `it` | Condition + Result | `it('throws when input is invalid')` |
| `it` | When + Should | `it('when user is admin, allows delete')` |

## AAA Pattern (Arrange-Act-Assert)

```typescript
describe('Calculator', () => {
  describe('add', () => {
    it('returns sum of two positive numbers', () => {
      // Arrange
      const calculator = new Calculator();
      const a = 2;
      const b = 3;
      const expected = 5;

      // Act
      const result = calculator.add(a, b);

      // Assert
      expect(result).toBe(expected);
    });

    it('handles zero correctly', () => {
      // Arrange
      const calculator = new Calculator();

      // Act
      const result = calculator.add(5, 0);

      // Assert
      expect(result).toBe(5);
    });
  });
});
```

## Test Data Builders

### Fluent Builder Pattern

```typescript
interface UserData {
  name: string;
  email: string;
  role: string;
  active: boolean;
}

class UserBuilder {
  private data: UserData = {
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    active: true,
  };

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  asAdmin(): this {
    this.data.role = 'admin';
    return this;
  }

  inactive(): this {
    this.data.active = false;
    return this;
  }

  build(): UserData {
    return { ...this.data };
  }
}

// Usage
const user = new UserBuilder()
  .withName('Alice')
  .withEmail('alice@example.com')
  .asAdmin()
  .build();
```

## Mock Strategies

### Mock at Boundaries Only

```typescript
// GOOD: Mock external dependencies
describe('OrderService', () => {
  it('processes order and sends confirmation', async () => {
    // Mock database and email service (boundaries)
    const mockDb = { save: jest.fn() };
    const mockEmail = { send: jest.fn() };

    const service = new OrderService(mockDb, mockEmail);

    await service.processOrder({ items: [...] });

    expect(mockDb.save).toHaveBeenCalled();
    expect(mockEmail.send).toHaveBeenCalled();
  });
});

// BAD: Mock internal implementation
describe('OrderService', () => {
  it('calculates total correctly', () => {
    // Don't mock internal calculation
    const service = new OrderService();
    // ...
  });
});
```

### Mock Decision Table

| Mock | Don't Mock |
|------|------------|
| Database queries | Internal utilities |
| API calls | Business logic |
| File system | Deterministic functions |
| Time/date | Pure calculations |
| External services | Domain objects |

## Error Testing

### Testing Error Cases

```typescript
describe('UserService', () => {
  it('throws ValidationError when email is invalid', () => {
    const service = new UserService();

    expect(() => service.createUser({
      email: 'not-an-email',
      name: 'Test',
    })).toThrow(ValidationError);
  });

  it('throws NotFoundError when user ID does not exist', async () => {
    const service = new UserService();

    await expect(service.getUser('nonexistent-id'))
      .rejects
      .toThrow(NotFoundError);
  });
});
```

## Edge Case Testing

```typescript
describe('ArrayUtils', () => {
  describe('groupBy', () => {
    it('handles empty array', () => {
      const result = groupBy([], 'key');
      expect(result).toEqual({});
    });

    it('handles single element', () => {
      const result = groupBy([{ key: 'a', value: 1 }], 'key');
      expect(result).toEqual({ a: [{ key: 'a', value: 1 }] });
    });

    it('handles multiple elements with same key', () => {
      const result = groupBy([
        { key: 'a', value: 1 },
        { key: 'a', value: 2 },
      ], 'key');
      expect(result).toEqual({ a: [{ key: 'a', value: 1 }, { key: 'a', value: 2 }] });
    });

    it('handles null values in array', () => {
      const result = groupBy([{ key: 'a', value: null }], 'key');
      expect(result).toEqual({ a: [{ key: 'a', value: null }] });
    });
  });
});
```

## Anti-Patterns

### Testing Mocks Instead of Behavior

```typescript
// BAD
it('calls repository.save', () => {
  const mockRepo = { save: jest.fn() };
  const service = new UserService(mockRepo);

  service.createUser({ name: 'Test' });

  expect(mockRepo.save).toHaveBeenCalled();
});

// GOOD
it('persists user to database', async () => {
  const mockRepo = { save: jest.fn().mockResolvedValue({ id: '123' }) };
  const service = new UserService(mockRepo);

  const user = await service.createUser({ name: 'Test' });

  expect(user.id).toBe('123');
  expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Test',
  }));
});
```

### Overly Specific Tests

```typescript
// BAD: Tests implementation details
it('calls validateEmail and hashPassword', () => {
  // ...
});

// GOOD: Tests behavior
it('creates user with sanitized credentials', () => {
  // ...
});
```

## Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| Business logic | 90%+ | Core domain must be solid |
| Utility functions | 80%+ | Reusable components |
| API handlers | 70%+ | Integration points |
| UI components | 60%+ | Interaction tested elsewhere |

## Continuous Testing

```bash
# Watch mode (instant feedback)
bun test --watch

# Pre-commit hook
bun test && bun run lint

# CI with coverage
bun test --coverage

# Specific file
bun test src/user.test.ts
```
