# Testing Strategy for TypeScript

## Overview

TypeScript's type system reduces the need for some tests, but comprehensive testing remains critical. This reference covers Vitest-focused testing strategies for TypeScript projects.

## Vitest Configuration

### Basic Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    },
    setupFiles: ['./test/setup.ts']
  }
});
```

### Type Testing

```typescript
// test/setup.ts
import { expect } from 'vitest';
import type { AssertTrue } from 'vitest';

// Type assertions
type AssertTypeEquals<T, Expected> = AssertTrue<[T] extends [Expected] ? true : false>;
```

## Unit Testing

### Testing Pure Functions

```typescript
// utils/format.ts
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

// utils/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './format';

describe('formatCurrency', () => {
  it('formats USD currency', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
  });

  it('formats EUR currency', () => {
    expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('handles negative amounts', () => {
    expect(formatCurrency(-100)).toBe('-$100.00');
  });
});
```

### Testing Async Functions

```typescript
// api/user.ts
export async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error('User not found');
  }
  return response.json();
}

// api/user.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchUser } from './user';

// Mock fetch
global.fetch = vi.fn();

describe('fetchUser', () => {
  it('fetches user successfully', async () => {
    const mockUser = { id: '123', name: 'John' };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser
    } as Response);

    const user = await fetchUser('123');
    expect(user).toEqual(mockUser);
  });

  it('throws error when user not found', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false
    } as Response);

    await expect(fetchUser('999')).rejects.toThrow('User not found');
  });
});
```

### Testing Classes

```typescript
// services/user.service.ts
export class UserService {
  constructor(private repository: UserRepository) {}

  async createUser(data: CreateUserDto): Promise<User> {
    const existing = await this.repository.findByEmail(data.email);
    if (existing) {
      throw new Error('Email already exists');
    }

    const user: User = {
      id: generateId(),
      ...data
    };

    return this.repository.save(user);
  }
}

// services/user.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let mockRepository: UserRepository;

  beforeEach(() => {
    mockRepository = {
      findByEmail: vi.fn(),
      save: vi.fn()
    } as any;
    service = new UserService(mockRepository);
  });

  it('creates user successfully', async () => {
    const userData = { name: 'John', email: 'john@example.com' };
    const expectedUser = { id: '123', ...userData };

    mockRepository.findByEmail.mockResolvedValue(null);
    mockRepository.save.mockResolvedValue(expectedUser);

    const result = await service.createUser(userData);

    expect(result).toEqual(expectedUser);
    expect(mockRepository.findByEmail).toHaveBeenCalledWith(userData.email);
    expect(mockRepository.save).toHaveBeenCalledWith(expectedUser);
  });

  it('throws error if email exists', async () => {
    const userData = { name: 'John', email: 'john@example.com' };
    mockRepository.findByEmail.mockResolvedValue({ id: 'existing' } as User);

    await expect(service.createUser(userData)).rejects.toThrow('Email already exists');
    expect(mockRepository.save).not.toHaveBeenCalled();
  });
});
```

## Type Testing

### Using tsd

```typescript
// utils/format.test-d.ts
import { expectType } from 'tsd';
import { formatCurrency } from './format';

expectType<ReturnType<typeof formatCurrency>>(formatCurrency(100));
```

### Using expect-type

```typescript
// types/api.test.ts
import { expectType, expectError } from 'expect-type';
import { fetchUser } from './api';

expectType<Promise<User>>(fetchUser('123'));
expectError(fetchUser(123)); // Should error - number not allowed
```

### Contract Testing

```typescript
// test/contracts/user.contract.ts
import { expectType } from 'vitest';

describe('User contract', () => {
  it('has required fields', () => {
    const user: User = {
      id: '123',
      name: 'John',
      email: 'john@example.com'
    };

    expectType<string>(user.id);
    expectType<string>(user.name);
    expectType<string>(user.email);
  });

  it('accepts partial updates', () => {
    const update: Partial<User> = {
      name: 'Jane'
    };

    expectType<string | undefined>(update.name);
  });
});
```

## Integration Testing

### API Integration Tests

```typescript
// test/integration/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../app';

describe('User API', () => {
  let server: any;

  beforeAll(() => {
    server = app.listen(3001);
  });

  afterAll(() => {
    server.close();
  });

  it('creates user via API', async () => {
    const response = await fetch('http://localhost:3001/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John',
        email: 'john@example.com'
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.name).toBe('John');
  });
});
```

### Database Integration Tests

```typescript
// test/integration/database.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource } from 'typeorm';
import { User } from '../entities/user';

describe('User Repository', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [User],
      synchronize: true
    });
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.getRepository(User).clear();
  });

  it('saves and retrieves user', async () => {
    const repository = dataSource.getRepository(User);

    const user = repository.create({
      name: 'John',
      email: 'john@example.com'
    });

    await repository.save(user);

    const found = await repository.findOne({ where: { id: user.id } });
    expect(found).toEqual(user);
  });
});
```

## Test Doubles

### Mocks with vi.fn()

```typescript
import { vi, expect, it } from 'vitest';

// Mock function
const mockFn = vi.fn();

mockFn.mockReturnValue('default');
mockFn.mockResolvedValue('async');
mockFn.mockRejectedValue(new Error('error'));

// Usage
expect(mockFn).toHaveBeenCalledWith('arg');
expect(mockFn).toHaveBeenCalledTimes(1);
expect(mockFn).toHaveReturnedWith('value');
```

### Mock Modules

```typescript
// test/utils/mock-fetch.ts
import { vi } from 'vitest';

export const mockFetch = vi.fn();

global.fetch = mockFetch;

// In tests
import { mockFetch } from './utils/mock-fetch';

mockFetch.mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' })
});
```

### Fixtures

```typescript
// test/fixtures/users.ts
export const userFixtures = {
  john: {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com'
  },
  jane: {
    id: '2',
    name: 'Jane Doe',
    email: 'jane@example.com'
  }
};

// In tests
import { userFixtures } from './fixtures/users';

it('uses fixture data', () => {
  const user = userFixtures.john;
  expect(user.email).toBe('john@example.com');
});
```

## Coverage Goals

### Coverage Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  }
});
```

### Testing Priorities

1. **Business logic** - Test all critical paths (100% coverage)
2. **API endpoints** - Test success and error cases (80%+ coverage)
3. **Utilities** - Test all functions (90%+ coverage)
4. **Types** - Type tests for complex types (critical contracts only)
5. **Components** - Test interaction and rendering (70%+ coverage)

## Best Practices

1. **Test behavior, not implementation** - Focus on what, not how
2. **Use descriptive test names** - Should describe the scenario
3. **One assertion per test** - Keep tests focused
4. **Arrange-Act-Assert** - Clear test structure
5. **Mock external dependencies** - Isolate code under test
6. **Test error cases** - Not just happy paths
7. **Use type tests** - For critical type contracts
8. **Keep tests fast** - Run tests frequently
9. **Test in isolation** - Tests shouldn't depend on each other
10. **Use fixtures** - Reusable test data

## Related References

- `async-patterns.md` - Testing async code
- `api-design.md` - Testing API contracts
- `type-system.md` - Type testing strategies
