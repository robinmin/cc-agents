---
name: testing-patterns
description: "Testing patterns for unit, integration, E2E, contract, mutation, snapshot, and property-based tests: AAA structure, mocking, test factories, page objects, and the test pyramid."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
tags: [testing, unit-tests, integration-tests, e2e, mocking, contract-testing, mutation-testing, patterns, execution-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw,pi"
  category: execution-core
  interactions:
    - knowledge-only
see_also:
  - rd3:code-implement-common
  - rd3:tdd-workflow
  - rd3:sys-testing
---

# Testing Patterns

rd3 projects should default to `bun test` and `bun:test` unless the target codebase already uses a different test runner.

## Unit Testing

### Test Structure (AAA Pattern)

```typescript
import { describe, expect, it } from "bun:test";

describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid input', () => {
      // Arrange
      const input = { name: 'John', email: 'john@example.com' };
      const userService = new UserService(mockRepo);

      // Act
      const result = userService.createUser(input);

      // Assert
      expect(result.name).toBe('John');
      expect(result.id).toBeDefined();
    });
  });
});
```

### Naming Convention

```
{methodName}_{scenario}_{expectedResult}

Examples:
- createUser_withValidInput_returnsUser
- createUser_withDuplicateEmail_throwsConflictError
- getUser_withNonExistentId_returnsNull
```

### Isolation Principles

| Principle | Description |
|-----------|-------------|
| Independent | Tests do not depend on each other |
| Isolated | Mock external dependencies |
| Deterministic | Same input = same result |
| Fast | Milliseconds, not seconds |

### Mocking Patterns

```typescript
import { mock, spyOn } from "bun:test";

// Mock function
const mockSave = mock(async () => ({ id: '123' }));

// Spy on method
const spy = spyOn(userService, 'validate');

// Mock implementation
mockFn.mockImplementation((x) => x * 2);
```

### What to Unit Test

| Test | Don't Test |
|------|------------|
| Business logic | Framework code |
| Edge cases | Third-party libraries |
| Error handling | Private methods directly |
| Input validation | Database queries |

## Integration Testing

### Database Setup/Teardown

```typescript
describe('UserRepository', () => {
  beforeAll(async () => {
    await database.connect();
    await database.migrate();
  });

  afterAll(async () => {
    await database.disconnect();
  });

  beforeEach(async () => {
    await database.truncate(['users']);
  });

  it('should persist user to database', async () => {
    const user = await repo.save({ name: 'John' });
    const found = await repo.findById(user.id);
    expect(found).toEqual(user);
  });
});
```

### API Testing

```typescript
describe('POST /api/users', () => {
  it('should create user and return 201', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com' })
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.name).toBe('John');
  });

  it('should return 400 for invalid email', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'invalid' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### Test Database Strategies

| Strategy | Pros | Cons |
|----------|------|------|
| In-memory (SQLite) | Fast, no setup | Not production-like |
| Docker containers | Production-like | Slower startup |
| Test schema | Fast, isolated | Schema sync issues |
| Transaction rollback | Fast | Complex with multiple connections |

## E2E Testing

### Page Object Pattern

```typescript
class LoginPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="submit"]');
  }

  async getErrorMessage() {
    return this.page.textContent('[data-testid="error"]');
  }
}

// Usage
const loginPage = new LoginPage(page);
await loginPage.navigate();
await loginPage.login('user@example.com', 'password');
```

### Selector Strategy

| Selector | Maintainability |
|----------|-----------------|
| `data-testid` | Best |
| `role` + `name` | Good (accessibility) |
| CSS class | Fragile |
| XPath | Last resort |

### E2E Test Guidelines

- Test critical user journeys only
- Use stable selectors (data-testid)
- Handle async properly (wait for elements)
- Clean up test data
- Run in isolated environment
- Keep tests independent

## Test Coverage

### Coverage Types

| Type | Measures |
|------|----------|
| Line | % of lines executed |
| Branch | % of branches taken |
| Function | % of functions called |
| Statement | % of statements executed |

### Coverage Guidelines

```
Minimum targets:
- Critical business logic: 90%+
- Service layer: 80%+
- API handlers: 70%+
- Utilities: 60%+
```

**Coverage is not quality** — 100% coverage does not mean bug-free.

## Test Data

### Factory Pattern

```typescript
const userFactory = {
  build: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    createdAt: new Date(),
    ...overrides,
  }),

  create: async (overrides = {}) => {
    const user = userFactory.build(overrides);
    return await db.users.create(user);
  },
};

// Usage
const user = userFactory.build({ name: 'Custom Name' });
const savedUser = await userFactory.create({ role: 'admin' });
```

### Fixture Pattern

```typescript
// fixtures/users.ts
export const validUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'ValidP@ss123',
};

export const invalidEmails = [
  'notanemail',
  '@nodomain.com',
  'spaces in@email.com',
];
```

## Test Pyramid

```
        /\
       /  \
      / E2E\     Few, slow, expensive
     /------\
    /  Integ \   Some, medium speed
   /----------\
  / Unit Tests \  Many, fast, cheap
 /==============\
```

| Layer | Quantity | Speed | Cost |
|-------|----------|-------|------|
| Unit | Many (70%) | Fast | Low |
| Integration | Some (20%) | Medium | Medium |
| E2E | Few (10%) | Slow | High |

## Contract Testing

Contract testing ensures API providers and consumers agree on the interface contract, without requiring full integration.

### Provider-Driven Contracts (Pact)

```typescript
// Consumer side: define expected interactions
import { pactWith } from 'jest-pact';

pactWith({ consumer: 'UserDashboard', provider: 'UserService' }, async (pact) => {
  it('returns users from the provider', async () => {
    await pact.addInteraction({
      states: [{ description: 'users exist' }],
      uponReceiving: 'a request for users',
      withRequest: {
        method: 'GET',
        path: '/api/v1/users',
      },
      willRespondWith: {
        status: 200,
        body: {
          data: [{
            id: pact.string_like('user-123'),
            email: pact.string_like('user@example.com'),
          }],
        },
      },
    });

    const response = await fetch(`${pact.mockService.baseUrl}/api/v1/users`);
    expect(response.status).toBe(200);
  });
});
```

### Consumer-Driven Contracts (CDC)

```typescript
// Provider side: verify against consumer contracts
import { Verifier } from '@pact-foundation/pact';

const verifier = new Verifier({
  provider: 'UserService',
  providerBaseUrl: 'http://localhost:3000',
  pactBrokerUrl: 'https://pact-broker.example.com',
  consumerVersionTags: ['main'],
  providerVersionTags: ['main'],
});

await verifier.verifyProvider();
```

### When to Use Contract Testing

| Scenario | Use Contract Tests |
|----------|--------------------|
| Microservices with separate teams | Yes — independent API evolution |
| Consumer-driven API design | Yes — consumers define needs |
| Single team, simple API | No — integration tests sufficient |
| External third-party APIs | Yes — validate against spec |

## Snapshot Testing

Snapshot tests capture rendered output and compare against a stored reference. Best for UI components and serialized data structures.

### Component Snapshot (Bun + jsdom)

```typescript
import { describe, expect, it } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { UserCard } from './UserCard';

describe('UserCard', () => {
  it('renders consistently', () => {
    const html = renderToString(
      <UserCard name="Alice" email="alice@example.com" />
    );
    expect(html).toMatchSnapshot();
  });

  it('matches snapshot with new data', () => {
    const html = renderToString(
      <UserCard name="Bob" email="bob@example.com" />
    );
    expect(html).toMatchSnapshot({
      name: 'Bob',
      email: 'bob@example.com',
    });
  });
});
```

### Inline Snapshots

```typescript
// Snapshot stored inline in test file
it('formats date correctly', () => {
  const formatted = formatDate(new Date('2024-01-15'));
  expect(formatted).toMatchInlineSnapshot(`"January 15, 2024"`);
});
```

### Snapshot Update Workflow

```bash
# Run tests (snapshots will fail on first run with new cases)
bun test

# Review diff and update snapshots if correct
bun test --update-snapshots

# Update snapshots for a specific file
bun test --update-snapshot src/components/__snapshots__/UserCard.test.ts
```

## Mutation Testing

Mutation testing validates test quality by introducing deliberate code changes ("mutations") and verifying tests catch them.

### Using Stryker

```bash
# Install stryker
bun add -d @stryker-mutator/bun-runner

# Initialize config
npx stryker init
```

```json
// stryker.config.json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker.conf.json",
  "testRunner": "bun",
  "reporters": ["html", "clear-text"],
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/__snapshots__/**"
  ],
  "coverageAnalysis": "perTest"
}
```

```bash
# Run mutation testing
npx stryker run
```

### Common Mutation Operators

| Operator | Original | Mutation | Catches |
|----------|----------|----------|---------|
| Conditionals | `a > b` | `a >= b` | Boundary bugs |
| Negation | `if (x)` | `if (!x)` | Missing checks |
| Math | `x + 1` | `x + 2` | Off-by-one |
| Remove call | `user.getId()` | removed | Useless code |
| Array push | `[...arr, x]` | `[...arr]` | Missing appends |

### Interpreting Mutation Score

| Score | Quality | Action |
|-------|---------|--------|
| >80% | Excellent | Maintain |
| 60-80% | Good | Monitor trends |
| <60% | Poor | Add targeted tests |
| <50% | Critical | Major test gaps |

## Property-Based Testing

Property-based testing verifies that properties hold for many randomly generated inputs, not just hand-picked cases.

### Using fast-check (TypeScript)

```typescript
import { describe, expect, it } from 'bun:test';
import * as fc from 'fast-check';

describe('sort', () => {
  it('should produce a sorted array', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        (arr) => {
          const sorted = bubbleSort([...arr]);
          for (let i = 1; i < sorted.length; i++) {
            if (sorted[i - 1] > sorted[i]) return false;
          }
          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('should have same length as input', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        return bubbleSort([...arr]).length === arr.length;
      })
    );
  });
});
```

### Custom Arbitraries

```typescript
// Generate valid email addresses
const validEmail = fc.string({ minLength: 3 }).map((name) =>
  `${name.toLowerCase()}@example.com`
);

// Generate user objects matching your domain
const userArb = fc.record({
  id: fc.uuidv4(),
  email: validEmail,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  role: fc.constantFrom('admin', 'user', 'guest'),
  createdAt: fc.date(),
});

// Generate arrays of unique users
const uniqueUsers = fc.array(userArb, {
  minLength: 1,
  maxLength: 10,
  uniq: (a, b) => a.id === b.id,
});
```

### When to Use Property-Based Testing

| Use For | Don't Use For |
|---------|--------------|
| Data transformation logic | UI interactions |
| Serialization/deserialization | External API calls |
| Algorithm correctness | Performance testing |
| Cryptographic operations | Database transactions |
