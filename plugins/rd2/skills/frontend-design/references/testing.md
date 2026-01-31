# Testing

Frontend testing strategies and patterns (2024-2025).

## Testing Pyramid

```
        /\
       /  \
      / E2E \          10% - Critical user flows
     /--------\
    / Integration \    20% - Component interactions
   /----------------\
  /   Unit Tests     \  70% - Pure functions, hooks
 /--------------------\
```

**Rationale:**
- Unit tests are fast and cheap to write
- Integration tests catch component interaction bugs
- E2E tests verify critical user journeys

## Testing Tools

| Type | Tools | Purpose |
|------|-------|---------|
| **Unit** | Vitest, Jest | Functions, hooks, utilities |
| **Component** | Testing Library | Component behavior, events |
| **Integration** | Testing Library | Multiple components together |
| **E2E** | Playwright, Cypress | Full user flows across pages |

### Recommended Stack (2024-2025)

- **Vitest** - Fast, Vite-native, ESM support
- **React Testing Library** - DOM testing, user-centric
- **Playwright** - Cross-browser E2E, reliable
- **MSW** - API mocking at network level

## Unit Testing

### Testing Utility Functions

```tsx
// utils/format.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// utils/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './format';

describe('formatCurrency', () => {
  it('formats positive numbers', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negative numbers', () => {
    expect(formatCurrency(-99.99)).toBe('-$99.99');
  });
});
```

### Testing Custom Hooks

```tsx
// hooks/useCounter.ts
import { useState, useCallback } from 'react';

export function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => c - 1), []);
  return { count, increment, decrement };
}

// hooks/useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('starts with initial value', () => {
    const { result } = renderHook(() => useCounter(5));
    expect(result.current.count).toBe(5);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter(0));
    act(() => result.current.increment());
    expect(result.current.count).toBe(1);
  });

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5));
    act(() => result.current.decrement());
    expect(result.current.count).toBe(4);
  });
});
```

## Component Testing

### Testing with React Testing Library

```tsx
// components/Button.tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button label="Click me" onClick={handleClick} />);
    await user.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button label="Click me" onClick={() => {}} disabled />);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

### Testing Forms

```tsx
// components/LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('submits form with email and password', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();

    render(<LoginForm onSubmit={() => {}} />);

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });
});
```

## Integration Testing

### Testing Component Composition

```tsx
// features/UserProfile/UserProfile.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfile } from './UserProfile';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('UserProfile', () => {
  it('displays user data after loading', async () => {
    server.use(
      http.get('/api/users/1', () => {
        return HttpResponse.json({
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        });
      })
    );

    renderWithProviders(<UserProfile userId="1" />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    server.use(
      http.get('/api/users/1', () => {
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      })
    );

    renderWithProviders(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## E2E Testing with Playwright

### Basic Page Test

```tsx
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('user can log in successfully', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Welcome')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });
});
```

### Testing with Authentication

```tsx
// tests/e2e/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');

  // Save auth state
  await page.context().storageState({ path: 'tests/.auth/user.json' });
});

// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/user.json' });

test('authenticated user sees dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Dashboard')).toBeVisible();
});
```

## API Mocking with MSW

### Setup

```tsx
// test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ]);
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '3', ...body }, { status: 201 });
  }),
];

// test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// test/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Testing Best Practices

### Test Structure

```tsx
describe('ComponentName', () => {
  // Group related tests
  describe('when user is logged in', () => {
    beforeEach(() => {
      // Setup authenticated state
    });

    it('shows user profile', () => {});
    it('allows editing profile', () => {});
  });

  describe('when user is logged out', () => {
    it('redirects to login', () => {});
  });
});
```

### What to Test

| Component Type | Test Focus |
|----------------|------------|
| **UI Components** | Rendering, accessibility, events |
| **Forms** | Validation, submission, error states |
| **Data Fetching** | Loading, success, error states |
| **Navigation** | Links work, routes correct |
| **Auth** | Protected routes, redirects |

### Avoid Testing

- Implementation details (internal state, method calls)
- Third-party libraries (assume they work)
- Styling (visual regression tools instead)
- Framework internals (React, Next.js)

## Sources

- [React Testing Library Best Practices](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Vitest Documentation](https://vitest.dev/guide/)
