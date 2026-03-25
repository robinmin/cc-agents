---
name: testing
description: "Frontend testing strategies: unit testing with Vitest, component testing with Testing Library, E2E with Playwright, and coverage optimization."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
tags: [frontend, testing, vitest, playwright, testing-library, coverage, e2e]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:frontend-design
  - rd3:frontend-architect
  - rd3:sys-testing
  - rd3:advanced-testing
---

# Frontend Testing Strategies

Comprehensive guide to testing React and Next.js applications.

## Testing Pyramid

```
       /\
      /E2E\         10% - Critical user flows
     /------\
    /Integration\    20% - Component interactions
   /------------\
  /   Unit Tests \   70% - Functions, hooks, utilities
 /----------------\
```

## Unit Testing with Vitest

### Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
})
```

### Testing Functions and Utilities

```typescript
// utils/formatters.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, truncate } from './formatters'

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56')
  })

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00')
  })

  it('handles negative amounts', () => {
    expect(formatCurrency(-50, 'USD')).toBe('-$50.00')
  })
})

describe('truncate', () => {
  it('truncates long text', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...')
  })

  it('preserves short text', () => {
    expect(truncate('Hi', 10)).toBe('Hi')
  })
})
```

### Testing React Hooks

```typescript
// hooks/useCounter.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCounter } from './useCounter'

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.count).toBe(0)
  })

  it('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current.count).toBe(10)
  })

  it('increments', () => {
    const { result } = renderHook(() => useCounter())

    act(() => {
      result.current.increment()
    })

    expect(result.current.count).toBe(1)
  })

  it('decrements', () => {
    const { result } = renderHook(() => useCounter(5))

    act(() => {
      result.current.decrement()
    })

    expect(result.current.count).toBe(4)
  })

  it('resets', () => {
    const { result } = renderHook(() => useCounter(5))

    act(() => {
      result.current.reset()
    })

    expect(result.current.count).toBe(0)
  })
})
```

## Component Testing with React Testing Library

### Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

### Testing Components

```typescript
// components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>Click me</Button>)

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows loading state', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
```

### Testing Form Components

```typescript
// components/SearchInput.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchInput } from './SearchInput'

describe('SearchInput', () => {
  it('renders with placeholder', () => {
    render(<SearchInput placeholder="Search..." />)
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('calls onSearch when form is submitted', async () => {
    const handleSearch = vi.fn()
    render(<SearchInput onSearch={handleSearch} />)

    const input = screen.getByRole('searchbox')
    await userEvent.type(input, 'test query{Enter}')

    expect(handleSearch).toHaveBeenCalledWith('test query')
  })

  it('debounces input changes', async () => {
    const handleChange = vi.fn()
    vi.useFakeTimers()
    render(<SearchInput onChange={handleChange} debounceMs={300} />)

    const input = screen.getByRole('searchbox')
    await userEvent.type(input, 'test')

    // Fast-forward timers
    vi.runAllTimers()

    expect(handleChange).toHaveBeenCalledWith('test')
    vi.useRealTimers()
  })
})
```

### Testing with Mocked Fetch

```typescript
// components/UserProfile.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserProfile } from './UserProfile'

const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
}

beforeEach(() => {
  global.fetch = vi.fn()
})

describe('UserProfile', () => {
  it('fetches and displays user data', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    } as Response)

    render(<UserProfile userId="1" />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  it('shows loading state', () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Promise(() => {}) // Never resolves
    )

    render(<UserProfile userId="1" />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows error state', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    render(<UserProfile userId="1" />)

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument()
    })
  })
})
```

## E2E Testing with Playwright

### Setup

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
})
```

### E2E Test Examples

```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('allows user to login with valid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill form
    await page.getByLabel('Email').fill('user@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Wait for redirect
    await expect(page).toHaveURL('/dashboard')

    // Verify logged in state
    await expect(page.getByText('Welcome')).toBeVisible()
  })

  test('shows error with invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email').fill('invalid@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('alert')).toContainText('Invalid credentials')
  })

  test('persists login across page reloads', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('user@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await page.reload()

    await expect(page).toHaveURL('/dashboard')
  })
})

// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Checkout Flow', () => {
  test('completes full checkout process', async ({ page }) => {
    // Add item to cart
    await page.goto('/products/1')
    await page.getByRole('button', { name: 'Add to Cart' }).click()

    // Go to cart
    await page.getByLabel('Shopping cart').click()
    await expect(page.getByText('Product 1')).toBeInTheDocument()

    // Proceed to checkout
    await page.getByRole('button', { name: 'Checkout' }).click()

    // Fill shipping
    await page.getByLabel('Address').fill('123 Main St')
    await page.getByLabel('City').fill('New York')
    await page.getByLabel('ZIP').fill('10001')

    // Fill payment (use test card)
    await page.getByLabel('Card number').fill('4242424242424242')
    await page.getByLabel('Expiry').fill('12/28')
    await page.getByLabel('CVC').fill('123')

    // Submit
    await page.getByRole('button', { name: 'Place order' }).click()

    // Verify success
    await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible()
    await expect(page.getByText(/ORD-\d+/)).toBeVisible()
  })
})
```

### API Mocking with MSW

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'John Doe',
      email: 'john@example.com',
    })
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: '123',
      ...body,
    }, { status: 201 })
  }),

  http.get('/api/products', () => {
    return HttpResponse.json([
      { id: '1', name: 'Product 1', price: 29.99 },
      { id: '2', name: 'Product 2', price: 49.99 },
    ])
  }),
]

export const server = setupServer(...handlers)
```

```typescript
// mocks/browser.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

```typescript
// test/setup.ts (browser)
import { worker } from '../mocks/browser'

beforeAll(() => worker.start())
afterAll(() => worker.stop())
afterEach(() => worker.resetHandlers())
```

## Coverage Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        'e2e/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
})
```

## Testing Checklist

### Unit Tests
- [ ] Pure functions have comprehensive tests
- [ ] Hooks are tested in isolation
- [ ] Edge cases handled (empty, null, undefined)
- [ ] Error paths covered
- [ ] Utils and formatters tested

### Integration Tests
- [ ] Components render correctly
- [ ] User interactions work as expected
- [ ] Forms validate and submit properly
- [ ] Loading and error states display
- [ ] Accessibility attributes present

### E2E Tests
- [ ] Critical user flows covered
- [ ] Login/authentication flows
- [ ] Core business transactions
- [ ] Navigation between pages
- [ ] Browser back/forward works

### Performance
- [ ] Tests run in < 2 minutes (unit)
- [ ] E2E tests run in < 5 minutes
- [ ] Coverage thresholds enforced in CI
- [ ] No flaky tests
