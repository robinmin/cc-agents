# JavaScript Testing Reference

Comprehensive guide to JavaScript testing frameworks and strategies.

## Table of Contents

- [Testing Overview](#testing-overview)
- [Testing Frameworks](#testing-frameworks)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [E2E Testing](#e2e-testing)
- [Testing Patterns](#testing-patterns)
- [Test Organization](#test-organization)
- [Mocking and Stubbing](#mocking-and-stubbing)
- [Coverage](#coverage)

---

## Testing Overview

### Testing Pyramid

```
        /\
       /  \      E2E Tests (few)
      /____\     - Critical user flows
     /      \    - Full stack integration
    /________\   Integration Tests (some)
   /          \  - API integration
  /            \ - Service integration
 /______________\ Unit Tests (many)
                   - Business logic
                   - Utilities
                   - Components
```

### Test Type Selection

| Test Type | Coverage Goal | Execution Speed | Examples |
|-----------|---------------|-----------------|----------|
| **Unit Tests** | 80%+ logic | Fast (<1s each) | Pure functions, utilities |
| **Integration Tests** | API/Service | Medium (1-5s each) | API calls, database |
| **E2E Tests** | Critical flows | Slow (5-30s each) | Login, checkout |

---

## Testing Frameworks

### Vitest (Recommended for Modern Projects)

**Pros:** Fast, ESM-first, Vite-native, Jest-compatible API
**Cons:** Newer ecosystem
**Best for:** Modern web apps, Vite projects

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
```

### Jest

**Pros:** Mature ecosystem, broad compatibility
**Cons:** Slower, ESM support still evolving
**Best for:** Node.js services, legacy projects

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js'],
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

### Playwright (E2E)

**Pros:** Modern browsers, cross-browser, auto-waiting
**Cons:** Slower execution
**Best for:** E2E testing, visual regression

```javascript
// playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
});
```

### Testing Library

**Pros:** User-centric, accessibility-focused
**Cons:** Different paradigm (not component-centric)
**Best for:** React/Vue/Svelte component testing

```javascript
// Component test example
import { render, screen } from '@testing-library/vue';
import Button from './Button.vue';

test('renders button with text', () => {
  render(Button, { props: { label: 'Click me' } });
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

---

## Unit Testing

### Pure Function Tests

```javascript
// src/utils/format.js
export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US').format(date);
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// src/utils/format.test.js
import { describe, it, expect } from 'vitest';
import { formatDate, capitalize } from './format.js';

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date)).toBe('1/15/2024');
  });

  it('handles invalid dates', () => {
    expect(() => formatDate(new Date('invalid'))).not.toThrow();
  });
});

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });
});
```

### Async Function Tests

```javascript
// src/services/api.js
export async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error('User not found');
  }
  return response.json();
}

// src/services/api.test.js
import { describe, it, expect, vi } from 'vitest';
import { fetchUser } from './api.js';

describe('fetchUser', () => {
  it('fetches user successfully', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'John' }),
      })
    );

    const user = await fetchUser(1);
    expect(user).toEqual({ id: 1, name: 'John' });
  });

  it('throws error when user not found', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
      })
    );

    await expect(fetchUser(999)).rejects.toThrow('User not found');
  });
});
```

### Table-Driven Tests

```javascript
// src/utils/validator.js
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// src/utils/validator.test.js
import { describe, it, expect } from 'vitest';
import { isValidEmail } from './validator.js';

describe('isValidEmail', () => {
  const validCases = [
    'user@example.com',
    'user.name@example.com',
    'user+tag@example.co.uk',
  ];

  const invalidCases = [
    'invalid',
    '@example.com',
    'user@',
    'user @example.com',
  ];

  it.each(validCases)('validates correct email: %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(invalidCases)('rejects invalid email: %s', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});
```

---

## Integration Testing

### API Integration Tests

```javascript
// test/integration/api.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../src/app.js';

describe('API Integration', () => {
  let server;

  beforeAll(() => {
    server = app.listen(3001);
  });

  afterAll(() => {
    server.close();
  });

  it('creates user via API', async () => {
    const response = await fetch('http://localhost:3001/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
    });

    expect(response.status).toBe(201);
    const user = await response.json();
    expect(user).toHaveProperty('id');
    expect(user.name).toBe('John Doe');
  });
});
```

### Database Integration Tests

```javascript
// test/integration/database.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../src/db/connection.js';
import { User } from '../src/models/user.js';

describe('Database Integration', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('saves and retrieves user', async () => {
    const user = await User.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
    });

    const found = await User.findById(user.id);
    expect(found.email).toBe('jane@example.com');
  });
});
```

---

## E2E Testing

### Playwright E2E Tests

```javascript
// e2e/user-flow.spec.js
import { test, expect } from '@playwright/test';

test.describe('User Authentication Flow', () => {
  test('registers new user', async ({ page }) => {
    await page.goto('/register');

    await page.fill('[name="name"]', 'John Doe');
    await page.fill('[name="email"]', 'john@example.com');
    await page.fill('[name="password"]', 'securepassword');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome, John');
  });

  test('logs in existing user', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'john@example.com');
    await page.fill('[name="password"]', 'securepassword');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'john@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error')).toContainText('Invalid credentials');
  });
});
```

### Visual Regression Tests

```javascript
// e2e/visual.spec.js
import { test, expect } from '@playwright/test';

test('homepage matches screenshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png');
});

test('button component matches screenshot', async ({ page }) => {
  await page.goto('/components/button');
  const button = page.locator('button').first();
  await expect(button).toHaveScreenshot('button-primary.png');
});
```

---

## Testing Patterns

### AAA Pattern (Arrange-Act-Assert)

```javascript
test('calculates total price', () => {
  // Arrange
  const cart = new Cart();
  const item = { price: 100, quantity: 2 };

  // Act
  cart.addItem(item);
  const total = cart.calculateTotal();

  // Assert
  expect(total).toBe(200);
});
```

### Given-When-Then Pattern

```javascript
test('user can withdraw funds', () => {
  // Given
  const account = new Account(1000);

  // When
  account.withdraw(500);

  // Then
  expect(account.balance).toBe(500);
});
```

### Setup-Teardown Pattern

```javascript
describe('ResourceManager', () => {
  let manager;

  beforeEach(() => {
    manager = new ResourceManager();
  });

  afterEach(() => {
    manager.cleanup();
  });

  it('allocates resource', () => {
    const resource = manager.allocate();
    expect(resource).toBeDefined();
  });
});
```

---

## Test Organization

### Co-Located Tests

```
src/
├── utils/
│   ├── format.js
│   ├── format.test.js      # Co-located test
│   ├── validator.js
│   └── validator.test.js
└── services/
    ├── api.js
    └── api.test.js
```

### Test Directory Structure

```
project/
├── src/
│   └── ...
├── test/
│   ├── unit/
│   │   ├── utils.test.js
│   │   └── services.test.js
│   ├── integration/
│   │   ├── api.test.js
│   │   └── database.test.js
│   └── e2e/
│       ├── auth.spec.js
│       └── checkout.spec.js
```

---

## Mocking and Stubbing

### Mocking External Dependencies

```javascript
import { vi, describe, it, expect } from 'vitest';
import { sendEmail } from './email.js';

describe('sendEmail', () => {
  it('sends email via service', async () => {
    const mockSend = vi.fn().mockResolvedValue({ messageId: '123' });

    // Mock external email service
    vi.mock('email-service', () => ({
      send: mockSend,
    }));

    await sendEmail('user@example.com', 'Hello');

    expect(mockSend).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Hello',
    });
  });
});
```

### Stubbing API Responses

```javascript
import { vi, describe, it, expect } from 'vitest';
import { fetchUser } from './api.js';

describe('fetchUser', () => {
  it('returns user data', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'John' }),
      })
    );

    const user = await fetchUser(1);
    expect(user).toEqual({ id: 1, name: 'John' });
  });
});
```

### Spying on Functions

```javascript
import { vi, describe, it, expect } from 'vitest';
import { logger } from './logger.js';

describe('logger', () => {
  it('logs info messages', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    logger.info('Test message');

    expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Test message');
  });
});
```

---

## Coverage

### Coverage Configuration

```javascript
// vitest.config.js
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.js',
        '**/*.config.js',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

### Coverage Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### Interpreting Coverage

| Metric | What It Measures | Good Target |
|--------|------------------|-------------|
| **Lines** | Executable lines run | 80%+ |
| **Functions** | Functions called | 80%+ |
| **Branches** | Conditional branches taken | 75%+ |
| **Statements** | Statements executed | 80%+ |

---

## Best Practices

### Always Do

- Test user behavior, not implementation
- Write descriptive test names
- Use AAA or Given-When-Then pattern
- Mock external dependencies
- Set coverage thresholds
- Run tests in CI/CD
- Keep tests fast and isolated

### Never Do

- Test implementation details
- Write brittle tests
- Skip error cases
- Forget to clean up resources
- Ignore test flakiness
- Test third-party libraries
- Over-mock (test real behavior)
