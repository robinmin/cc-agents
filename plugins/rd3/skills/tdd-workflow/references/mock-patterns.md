---
name: mock-patterns
description: "Mock design patterns: repository, service client, time/async/file mocking, patching strategies, and common pitfalls."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
platform: rd3
tags: [testing, mocks, tdd, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions:
    - knowledge-only
see_also:
  - rd3:tdd-workflow
  - rd3:sys-testing
  - rd3:tdd-workflow/references/testing-anti-patterns
---

# Mock Design Patterns Reference

**Load this reference when:** Setting up mocking strategies for unit tests, deciding what to mock, or implementing test doubles.

## Core Principle

**Mock at the boundary of your system, not inside.**

```typescript
// WRONG - Mocking internal implementation
function testUserService() {
  const mockEmailValidator = { validate: vi.fn() }; // Don't mock internal utilities
  const mockPasswordHasher = { hash: vi.fn() }; // Don't mock internal helpers
}

// CORRECT - Mock external dependencies
function testUserService() {
  const mockDatabase = { query: vi.fn() }; // Mock the database (external)
  const mockEmailService = { send: vi.fn() }; // Mock email API (external)
  // Test real email validation and password hashing
}
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
| **Business logic** | No | This is what you are testing |

## Common Mock Patterns

### 1. Repository Pattern Mock (Database)

**Use when:** Testing service layer with database operations.

```typescript
import { describe, it, expect, vi } from 'vitest';

interface User {
  id: number;
  name: string;
}

interface UserRepository {
  getById(id: number): Promise<User | null>;
}

interface UserService {
  getUser(id: number): Promise<User | null>;
}

function createUserService(repo: UserRepository): UserService {
  return {
    async getUser(id: number) {
      return repo.getById(id);
    },
  };
}

describe('UserService', () => {
  it('gets user by id', async () => {
    // Arrange
    const mockRepo: UserRepository = {
      getById: vi.fn().mockResolvedValue({ id: 1, name: 'Alice' }),
    };
    const service = createUserService(mockRepo);

    // Act
    const user = await service.getUser(1);

    // Assert
    expect(user).toEqual({ id: 1, name: 'Alice' });
    expect(mockRepo.getById).toHaveBeenCalledOnceWith(1);
  });
});
```

**Key points:**
- Mock repository interface, not ORM
- Return domain objects, not database rows
- Verify method calls with `toHaveBeenCalledOnceWith()`

### 2. Service Client Mock (External API)

**Use when:** Testing code that calls external APIs (Stripe, AWS, etc.).

```typescript
import { describe, it, expect, vi } from 'vitest';

interface PaymentResult {
  id: string;
  status: string;
}

interface StripeClient {
  charge(amount: number, token: string): Promise<PaymentResult>;
}

interface PaymentService {
  processPayment(amount: number, token: string): Promise<PaymentResult>;
}

function createPaymentService(stripe: StripeClient): PaymentService {
  return {
    async processPayment(amount: number, token: string) {
      return stripe.charge(amount, token);
    },
  };
}

describe('PaymentService', () => {
  it('processes payment successfully', async () => {
    // Arrange
    const mockStripe: StripeClient = {
      charge: vi.fn().mockResolvedValue({
        id: 'ch_123',
        status: 'succeeded',
      }),
    };
    const service = createPaymentService(mockStripe);

    // Act
    const result = await service.processPayment(1000, 'tok_visa');

    // Assert
    expect(result.status).toBe('succeeded');
    expect(mockStripe.charge).toHaveBeenCalledOnceWith(1000, 'tok_visa');
  });
});
```

**Key points:**
- Mock the API client, not HTTP library
- Mirror real API response structure
- Test error cases with `mockRejectedValue`

**Error handling example:**
```typescript
it('handles payment failure', async () => {
  const mockStripe: StripeClient = {
    charge: vi.fn().mockRejectedValue(new Error('Card declined')),
  };
  const service = createPaymentService(mockStripe);

  await expect(service.processPayment(1000, 'tok_visa')).rejects.toThrow('Card declined');
});
```

### 3. Time Mocking (Temporal Logic)

**Use when:** Testing code with time-dependent behavior (expirations, deadlines, scheduling).

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDate = new Date('2026-01-01T00:00:00Z');

vi.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());

describe('SubscriptionService', () => {
  it('detects expired subscription', () => {
    const expiryDate = new Date('2025-12-31T00:00:00Z');
    const isExpired = expiryDate.getTime() < Date.now();
    expect(isExpired).toBe(true);
  });
});
```

**Key points:**
- Use `vi.useFakeTimers()` for time-dependent code
- Test time boundaries (just before, at, just after threshold)

**Using `vi.useFakeTimers`:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('PromotionService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('activates promotion within date range', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));

    const promotionStart = new Date('2026-01-01T00:00:00Z');
    const promotionEnd = new Date('2026-01-31T23:59:59Z');
    const now = new Date();

    const isActive = now >= promotionStart && now <= promotionEnd;
    expect(isActive).toBe(true);
  });
});
```

### 4. Environment Variable Mocking

**Use when:** Testing code that reads environment variables.

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const originalEnv = { ...process.env };

describe('ApiService initialization', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses api key from environment', () => {
    process.env.API_KEY = 'test-key';
    process.env.DB_URL = 'test-db';
    process.env.DEBUG = 'false';

    const service = new ApiService();

    expect(service.apiKey).toBe('test-key');
    expect(service.dbUrl).toBe('test-db');
    expect(service.debug).toBe(false);
  });
});
```

**Key points:**
- Save and restore original env
- Test with different env configurations

### 5. File System Mocking

**Use when:** Testing file operations without real I/O.

**Option 1: Use `tmpdir` fixture**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

describe('ConfigLoader', () => {
  const tmpDir = await Deno.makeTempDir();

  beforeEach(() => {
    // Create test file in temp directory
    writeFileSync(join(tmpDir, 'config.json'), '{"key": "value"}');
  });

  it('loads config from file', () => {
    const config = ConfigLoader.load(join(tmpDir, 'config.json'));
    expect(config.key).toBe('value');
  });
});
```

**Option 2: Mock file operations**
```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('{"key": "value"}'),
}));

describe('readConfig', () => {
  it('reads config file', () => {
    const config = readConfig('config.json');
    expect(config.key).toBe('value');
  });
});
```

### 6. Context Manager Mocking

**Use when:** Testing code with context managers (database connections, file handles).

```typescript
import { describe, it, expect, vi } from 'vitest';

interface MockCursor {
  fetchall(): Array<[number, string]>;
}

interface MockConnection {
  cursor(): MockCursor;
}

function getAllUsers(conn: MockConnection): Array<[number, string]> {
  const cursor = conn.cursor();
  return cursor.fetchall();
}

describe('getAllUsers', () => {
  it('fetches all users from database', () => {
    const mockCursor: MockCursor = {
      fetchall: vi.fn().mockReturnValue([[1, 'Alice'], [2, 'Bob']]),
    };
    const mockConnection: MockConnection = {
      cursor: vi.fn().mockReturnValue(mockCursor),
    };

    const result = getAllUsers(mockConnection);

    expect(result).toEqual([[1, 'Alice'], [2, 'Bob']]);
    expect(mockConnection.cursor).toHaveBeenCalledOnce();
    expect(mockCursor.fetchall).toHaveBeenCalledOnce();
  });
});
```

### 7. Generator Mocking

**Use when:** Mocking generators or iterators.

```typescript
import { describe, it, expect, vi } from 'vitest';

interface ApiResponse {
  data: string;
}

function processStream(api: { streamEvents(): Iterator<ApiResponse> }): ApiResponse[] {
  const results: ApiResponse[] = [];
  for (const event of api.streamEvents()) {
    results.push(event);
  }
  return results;
}

describe('processStream', () => {
  it('processes all events from stream', () => {
    const mockResponses: ApiResponse[] = [
      { data: 'chunk1' },
      { data: 'chunk2' },
      { data: 'chunk3' },
    ];

    function* mockStream(): Iterator<ApiResponse> {
      yield* mockResponses;
    }

    const mockApi = { streamEvents: vi.fn().mockReturnValue(mockStream()) };
    const results = processStream(mockApi);

    expect(results).toHaveLength(3);
    expect(results[0].data).toBe('chunk1');
  });
});
```

### 8. Async Mocking

**Use when:** Testing async code with async dependencies.

```typescript
import { describe, it, expect, vi } from 'vitest';

interface Database {
  fetch<T>(query: string): Promise<T>;
}

interface UserService {
  getUser(id: number): Promise<{ id: number; name: string }>;
}

function createUserService(db: Database): UserService {
  return {
    async getUser(id: number) {
      return db.fetch<{ id: number; name: string }>(`SELECT * FROM users WHERE id = ${id}`);
    },
  };
}

describe('UserService', () => {
  it('fetches user from database', async () => {
    const mockDb: Database = {
      fetch: vi.fn().mockResolvedValue({ id: 1, name: 'Alice' }),
    };
    const service = createUserService(mockDb);

    const result = await service.getUser(1);

    expect(result.name).toBe('Alice');
    expect(mockDb.fetch).toHaveBeenCalledOnceWith('SELECT * FROM users WHERE id = 1');
  });
});
```

## Mock Verification Patterns

### Verify Called
```typescript
expect(mockMethod).toHaveBeenCalled();
expect(mockMethod).toHaveBeenCalledTimes(1);
expect(mockMethod).toHaveBeenCalledWith(arg1, arg2);
```

### Verify Not Called
```typescript
expect(mockMethod).not.toHaveBeenCalled();
```

### Verify Call Count
```typescript
expect(mockMethod).toHaveBeenCalledTimes(3);
```

### Inspect Call Arguments
```typescript
// Get all calls
const allCalls = mockMethod.mock.calls;

// Get most recent call
const [args, kwargs] = mockMethod.mock.lastCall;

// Get specific call
const [args, kwargs] = mockMethod.mock.calls[0];
```

## Mock Return Values

### Single Return Value
```typescript
mockMethod.mockReturnValue(42);
```

### Different Return Values Per Call
```typescript
mockMethod.mockReturnValueOnce(1)
          .mockReturnValueOnce(2)
          .mockReturnValueOnce(3);
// First call: 1, Second: 2, Third: 3
```

### Raise Exception
```typescript
mockMethod.mockRejectedValue(new Error('Invalid input'));
```

### Dynamic Return Value
```typescript
mockMethod.mockImplementation((value: number) => value * 2);
```

## Mock Objects

### Auto-Spec Mocks
```typescript
import { describe, it, expect, vi } from 'vitest';

interface Service {
  process(input: string): string;
}

function createMockService(): Service {
  return {
    process: vi.fn().mockReturnValue('result'),
  };
}

// Mock with same interface as real class
const mockService = createMockService();
mockService.process('input');
// Calling nonexistent method would be a type error
```

### Mock as Context Manager
```typescript
const mockCm = {
  __enter__: vi.fn().mockReturnValue('resource'),
  __exit__: vi.fn().mockReturnValue(false),
};

// In test:
const resource = mockCm.__enter__();
expect(resource).toBe('resource');
```

## Patching Strategies

### Patch Where Used, Not Where Defined

```typescript
// WRONG - patches where defined
vi.mock('mymodule/SomeClass', () => ({ SomeClass: {} }));

// CORRECT - patches where used
vi.mock('myapp/mymodule/SomeClass', () => ({ SomeClass: {} }));
```

### Patch as Decorator
```typescript
vi.mock('module/externalApiCall', () => ({
  externalApiCall: vi.fn().mockResolvedValue({ status: 'ok' }),
}));

it('calls external API', async () => {
  await myFunction();
});
```

### Patch Inline
```typescript
it('calls external API', async () => {
  vi.mocked(module.externalApiCall).mockResolvedValue({ status: 'ok' });
  await myFunction();
});
```

## Common Pitfalls

### 1. Over-Mocking
```typescript
// BAD - Everything is mocked
function testService() {
  const mockDb = { query: vi.fn() };
  const mockCache = { get: vi.fn() };
  const mockLogger = { log: vi.fn() };
  const mockValidator = { validate: vi.fn() };
  // What are we actually testing?
}

// GOOD - Mock only external dependencies
function testService() {
  const mockDb = { query: vi.fn() }; // External
  const mockCache = { get: vi.fn() }; // External
  // Test real validator and logger
}
```

### 2. Brittle Mocks
```typescript
// BAD - Fails if internal implementation changes
mockMethod.mockResolvedValue({ key: 'value' });
expect(mockMethod).toHaveBeenCalledTimes(1);

// GOOD - Tests behavior, not implementation details
const result = await service.process(input);
expect(result).toEqual(expected_value);
```

### 3. Incomplete Mocks
```typescript
// BAD - Only fields you think you need
const mockResponse = {
  status: 200,
  data: { id: 1, name: 'Alice' },
  // Missing: headers, metadata...
};

// GOOD - Mirror real API structure completely
const mockResponse = {
  status: 200,
  data: { id: 1, name: 'Alice' },
  headers: { 'Content-Type': 'application/json' },
  metadata: { requestId: 'req-789', timestamp: 1234567890 },
};
```

## Quick Reference

| Pattern | Use Case | Key Points |
|---------|----------|------------|
| **Repository** | Database operations | Mock interface, not ORM |
| **Service Client** | External APIs | Mirror API response structure |
| **Time Mocking** | Time-dependent code | Use `vi.useFakeTimers()` |
| **Env Variables** | Configuration | Save and restore `process.env` |
| **File System** | File operations | Use `tmpdir` or `vi.mock('fs')` |
| **Context Manager** | Resources | Mock `__enter__`/`__exit__` |
| **Generator** | Streaming | Return iterator |
| **Async** | Async code | Use `mockResolvedValue`/`mockRejectedValue` |

---

For TDD fundamentals, see `rd3:tdd-workflow`.
For testing anti-patterns, see `rd3:tdd-workflow/references/testing-anti-patterns`.
