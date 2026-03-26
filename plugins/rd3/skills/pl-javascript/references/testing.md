---
name: testing
description: "JavaScript testing strategies: Vitest, Jest, Playwright, coverage, and testing patterns for modern JavaScript applications."
see_also:
  - rd3:pl-javascript
  - rd3:sys-testing
---

# JavaScript Testing Reference

Comprehensive guide to testing JavaScript applications.

## Table of Contents

- [Testing Strategy](#testing-strategy)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [E2E Testing](#e2e-testing)
- [Test Runners](#test-runners)
- [Mocking](#mocking)
- [Coverage](#coverage)

---

## Testing Strategy

### Test Pyramid

```
        ╱▔▔▔▔▔▔▔╲
       ╱  E2E     ╲      ← Few, slow, high confidence
      ╱▔▔▔▔▔▔▔▔▔▔▔▔╲
     ╱ Integration  ╲    ← Some, medium speed
    ╱▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔╲
   ╱    Unit Tests    ╲  ← Many, fast, isolated
  ╱▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔╲
```

### Coverage Goals

| Test Type | Coverage Target | Purpose |
|-----------|----------------|---------|
| **Unit Tests** | 80%+ | Logic, utilities, pure functions |
| **Integration Tests** | 60%+ | API endpoints, component integration |
| **E2E Tests** | Critical paths only | User journeys, happy paths |

---

## Unit Testing

### Basic Test Structure

```javascript
// sum.js
export function sum(a, b) {
  return a + b;
}

// sum.test.js
import { describe, it, expect } from 'vitest';
import { sum } from './sum.js';

describe('sum', () => {
  it('adds two numbers correctly', () => {
    expect(sum(1, 2)).toBe(3);
  });

  it('handles negative numbers', () => {
    expect(sum(-1, -1)).toBe(-2);
  });

  it('throws on invalid input', () => {
    expect(() => sum(null, 1)).toThrow();
  });
});
```

### Testing Async Functions

```javascript
import { describe, it, expect } from 'vitest';

describe('fetchUser', () => {
  it('fetches user data correctly', async () => {
    const user = await fetchUser(1);
    expect(user.id).toBe(1);
    expect(user.name).toBe('Alice');
  });

  it('throws on not found', async () => {
    await expect(fetchUser(999)).rejects.toThrow('Not found');
  });
});
```

### Testing DOM Manipulation

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, setContent } from './dom.js';

describe('DOM manipulation', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('sets text content', () => {
    setContent(container, 'Hello');
    expect(container.textContent).toBe('Hello');
  });

  it('handles nested elements', () => {
    container.innerHTML = '<span>Nested</span>';
    expect(container.querySelector('span').textContent).toBe('Nested');
  });
});
```

---

## Integration Testing

### API Testing

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from './server.js';
import { fetch } from './api-client.js';

let server;

beforeAll(async () => {
  server = await createServer();
  await server.listen({ port: 3000 });
});

afterAll(async () => {
  await server.close();
});

describe('User API', () => {
  it('GET /api/users/:id returns user', async () => {
    const response = await fetch('/api/users/1');
    const user = await response.json();

    expect(response.status).toBe(200);
    expect(user.id).toBe(1);
    expect(user.name).toBe('Alice');
  });

  it('POST /api/users creates user', async () => {
    const newUser = { name: 'Bob', email: 'bob@example.com' };
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });

    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created.name).toBe('Bob');
  });

  it('handles validation errors', async () => {
    const response = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({}),  // Missing required fields
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('validation');
  });
});
```

### Component Integration

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { UserList } from './UserList.js';
import { userService } from './services/user.js';

vi.mock('./services/user.js');

describe('UserList', () => {
  it('displays list of users', async () => {
    userService.getUsers.mockResolvedValue([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    render(UserList);

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    userService.getUsers.mockResolvedValue([
      { id: 1, name: 'Alice' },
    ]);

    render(UserList);

    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(userService.deleteUser).toHaveBeenCalledWith(1);
  });
});
```

---

## E2E Testing

### Playwright

```javascript
// tests/e2e/user-flows.spec.js
import { test, expect } from '@playwright/test';

test.describe('User flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('user can register and login', async ({ page }) => {
    // Register
    await page.click('text=Sign up');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'secure123');
    await page.click('text=Create account');

    // Login
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'secure123');
    await page.click('text=Login');

    // Verify logged in
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('cart checkout flow', async ({ page }) => {
    await page.goto('/products');

    // Add item to cart
    await page.click('[data-testid="product-1"] >> text=Add to cart');

    // Go to cart
    await page.click('text=Cart');

    // Checkout
    await page.fill('[name="cardNumber"]', '4242424242424242');
    await page.click('text=Checkout');

    // Verify success
    await expect(page.locator('text=Order confirmed')).toBeVisible();
  });
});
```

### Cypress

```javascript
// tests/e2e/user-flows.cy.js
describe('User flows', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('completes checkout', () => {
    // Add item
    cy.get('[data-testid="product-1"]').find('button').click();

    // Go to cart
    cy.get('text=Cart').click();

    // Checkout
    cy.fillForm({
      cardNumber: '4242424242424242',
      expiry: '12/25',
      cvc: '123',
    });

    cy.get('text=Checkout').click();

    // Verify
    cy.contains('Order confirmed').should('be.visible');
  });
});
```

---

## Test Runners

### Vitest (Recommended)

```javascript
// vitest.config.js
export default {
  test: {
    environment: 'node',  // or 'jsdom', 'happy-dom'
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
};
```

### Jest

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

---

## Mocking

### Manual Mocks

```javascript
// __mocks__/axios.js
export default {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

// In test
import axios from 'axios';
vi.mock('axios');
```

### vi.fn() Mocks

```javascript
import { describe, it, expect, vi } from 'vitest';

describe('UserService', () => {
  it('calls onSuccess callback', () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    fetchUser(1, { onSuccess, onError });

    // Simulate async response
    vi.mocked(axios.get).mockResolvedValue({ data: { id: 1, name: 'Alice' } });

    expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'Alice' });
    expect(onError).not.toHaveBeenCalled();
  });
});
```

### Spy on Methods

```javascript
import { describe, it, expect, vi } from 'vitest';

describe('Counter', () => {
  it('logs increment', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const counter = new Counter();

    counter.increment();

    expect(consoleSpy).toHaveBeenCalledWith('Incremented to 1');
  });
});
```

---

## Coverage

### Interpreting Coverage Reports

| Metric | What It Measures |
|--------|-----------------|
| **Statements** | Every statement executed |
| **Branches** | Each branch path (if/else) |
| **Functions** | Functions called |
| **Lines** | Source lines executed |

### Coverage with Vitest

```javascript
// vitest.config.js
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        autoUpdate: true,
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
};
```

### Running Coverage

```bash
# Vitest
vitest run --coverage

# Jest
jest --coverage

# Generate HTML report
npx vitest --coverage && open coverage/index.html
```

---

## Best Practices

### Test Structure

- **Arrange**: Set up test data and conditions
- **Act**: Execute the code under test
- **Assert**: Verify the expected behavior

### Naming Tests

```javascript
describe('Calculator', () => {
  describe('add', () => {
    it('returns sum of two positive numbers', () => { /* ... */ });
    it('returns sum of two negative numbers', () => { /* ... */ });
    it('handles mixed positive and negative', () => { /* ... */ });
    it('throws on non-numeric input', () => { /* ... */ });
  });
});
```

### Avoid Testing Implementation Details

```javascript
// BAD: Testing internal state
expect(component.state.count).toBe(1);

// GOOD: Testing observable behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

### Test One Thing

```javascript
// BAD: Multiple assertions on different things
it('validates and saves user', async () => {
  const result = await saveUser(user);
  expect(result.isValid).toBe(true);  // Validates
  expect(result.saved).toBe(true);    // Saves
  expect(result.id).toBeDefined();    // Has ID
});

// GOOD: Separate tests
it('validates user data', async () => { /* ... */ });
it('saves valid user', async () => { /* ... */ });
```
