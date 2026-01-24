---
name: frontend-design
description: Frontend architecture patterns and implementation guidance for 2024-2025. Use when designing frontend component structure, state management, data fetching, routing, performance optimization (Core Web Vitals), or testing strategies for web applications. Use when frontend architecture decisions are needed.

**Sources:**
- [React & Next.js in 2025 - Modern Best Practices (Strapi, 2025)](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices)
- [Next.js 16: An Engineer's Perspective on Frontend Architecture (Medium, 2025)](https://medium.com/@narayanansundar02/next-js-16-a-engineers-perspective-on-the-future-of-frontend-architecture-5de0ac17f6fb)
- [Mastering the Most Useful Next.js and React Features for 2025 (Dev.to, 2024)](https://dev.to/golsaesk/mastering-the-most-useful-nextjs-and-react-features-for-2025-4g60)
- [React Tech Stack [2025] (Robin Wieruch, 2024)](https://www.robinwieruch.de/react-tech-stack/)
- [Frontend Tech Stack Evolution 2024-2025 (LinkedIn)](https://www.linkedin.com/posts/sanchit0496_reactjs-nextjs-javascript-activity-7320785137766424576-H715)
---

# Frontend Design

Frontend architecture patterns and implementation guidance for building scalable web applications using modern React and Next.js best practices (2024-2025).

## Overview

This skill provides architectural guidance for frontend development, covering component design, state management, data fetching, performance (Core Web Vitals), and testing. It complements `ui-ux-design` (visual/UX patterns) and `super-designer` (comprehensive design specs).

## Quick Start

```bash
# Component architecture
"Design a component architecture for a dashboard with reusable card, chart, and table components"

# State management
"Design state management for a multi-step form with validation"

# Data fetching
"Design data fetching strategy for an app with real-time updates"

# Performance
"Optimize bundle size and lazy loading for a large React application"

# Testing
"Design testing strategy for a frontend application with unit, integration, and E2E tests"
```

## When to Use

**Use this skill when:**

- Designing frontend component architecture
- Planning state management approach
- Designing data fetching and caching strategies
- Optimizing frontend performance (Core Web Vitals)
- Planning testing strategies
- Designing routing and navigation
- Choosing frontend technology stack
- Implementing Server Components vs Client Components
- Planning Server Actions and mutations

**For visual/UX design**, use `rd2:ui-ux-design` skill.

**For comprehensive design specifications**, use `/rd2:super-designer` agent.

## Core Principles (2024-2025)

### Component-First Architecture

- Design components as reusable, composable units
- Separate presentation from business logic
- Prefer composition over inheritance
- Design for unidirectional data flow
- **Server Components by default, Client Components when needed** [React & Next.js in 2025](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices)

### Performance by Default

- Core Web Vitals first-class (LCP < 2.5s, INP < 100ms, CLS < 0.1)
- **Server Components reduce client bundle** [Next.js 16: Engineer's Perspective](https://medium.com/@narayanansundar02/next-js-16-a-engineers-perspective-on-the-future-of-frontend-architecture-5de0ac17f6fb)
- Code splitting by route and feature
- Lazy load non-critical resources
- Measure before optimizing

### Developer Experience

- Type safety with TypeScript strict mode
- Clear project structure
- Consistent naming conventions
- Comprehensive testing (unit, integration, E2E)

### Progressive Enhancement

- Core functionality works without JavaScript
- Layer enhancements on top
- Graceful degradation for older browsers
- Accessibility built-in from start

## Component Architecture

### Component Design Patterns (2024-2025)

**Server Components (Default)**:
- No client-side JavaScript
- Direct database access
- Secure server-side logic
- Better performance

**Client Components (When Needed)**:
- State management (useState, useReducer)
- Browser APIs (window, localStorage)
- Event handlers (onClick, onChange)
- React hooks and lifecycle

```tsx
// Server Component (default in Next.js App Router)
async function UserProfile({ userId }: { userId: string }) {
  const user = await db.user.findUnique({ where: { id: userId } });
  return <ProfileCard user={user} />;
}

// Client Component (for interactivity)
'use client';
import { useState } from 'react';

export function LikeButton() {
  const [likes, setLikes] = useState(0);
  return <button onClick={() => setLikes(l + 1)}>{likes} Likes</button>;
}
```

### Presentational vs Container Components

**Presentational Components** (aka "dumb" components):
- Receive data via props
- Emit events via callbacks
- No business logic
- Highly reusable

```tsx
// Example: Presentational component
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ label, onClick, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
```

**Container Components** (aka "smart" components):
- Manage state and side effects
- Fetch data (in Client Components) or receive data (Server Components)
- Pass data to presentational components
- Less reusable

```tsx
// Example: Container component (Client Component)
'use client';
import { useState, useEffect } from 'react';

export function UserProfileContainer({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then(data => {
      setUser(data);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <LoadingSpinner />;
  if (!user) return <ErrorMessage />;

  return <UserProfileCard user={user} />;
}
```

### Component Organization

```
src/
├── components/           # Shared components
│   ├── ui/              # Basic UI components (Button, Input)
│   ├── layout/          # Layout components (Header, Sidebar)
│   └── features/        # Feature-specific components
├── app/                 # Next.js App Router (Server Components)
│   ├── (routes)/       # File-based routing
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── hooks/               # Custom React hooks
├── services/            # API and external services
├── stores/              # State management
├── utils/               # Utility functions
└── types/               # TypeScript types
```

## State Management (2024-2025 Trends)

### State Management Strategy

Based on [Frontend Tech Stack Evolution 2024-2025](https://www.linkedin.com/posts/sanchit0496_reactjs-nextjs-javascript-activity-7320785137766424576-H715):

| State Type | Solution | Example | Notes |
|------------|----------|---------|-------|
| **Local UI state** | useState, useReducer | Form inputs, toggles | Client Components |
| **Server state** | React Query, SWR | API data, caching | Replaces Redux |
| **Global state** | Zustand, Jotai | User session, theme | Simpler than Redux |
| **Form state** | React Hook Form, Zod | Complex forms | Type-safe validation |
| **URL state** | URLSearchParams | Search params, filters | Native browser API |
| **Server state** | Server Actions | Mutations, revalidation | Next.js 14+ |

### React Query for Server State (Recommended)

```tsx
// Fetch with caching and invalidation
const { data, isLoading, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Mutation with invalidation
const mutation = useMutation({
  mutationFn: updateUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
  },
});
```

### Zustand for Global State (Recommended)

```ts
// Simple store with TypeScript
interface UserStore {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
```

### Server Actions (Next.js 14+)

Based on [Mastering Next.js and React Features for 2025](https://dev.to/golsaesk/mastering-the-most-useful-nextjs-and-react-features-for-2025-4g60):

```tsx
// Server Action (runs on server)
'use server';
export async function updateUser(userId: string, data: FormData) {
  const updated = await db.user.update({ where: { id: userId }, data });
  revalidatePath('/users');
  return updated;
}

// Client Component usage
'use client';
import { updateUser } from './actions';

export function UserForm({ userId }: { userId: string }) {
  const handleUpdate = async (formData: FormData) => {
    await updateUser(userId, formData);
  };
  return <form action={handleUpdate}>{/* ... */}</form>;
}
```

## Data Fetching (2024-2025)

### Fetching Strategies

**Server Components (Recommended)**:
- Use `async/await` directly in Server Components
- No need for useEffect or loading states
- Automatic caching with Next.js `fetch()`

```tsx
// Server Component with data fetching
async function DashboardPage() {
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 }, // Cache for 1 hour
  }).then(r => r.json());

  return <Dashboard data={data} />;
}
```

**Client Components (When needed)**:
- Use fetch or axios directly
- useState for loading/error states
- useEffect for side effects

**Complex fetching** (high complexity):
- React Query for caching, invalidation, retries
- SWR as alternative
- GraphQL clients (Apollo, urql)

### Next.js Caching Strategies

```tsx
// Static data (long cache)
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 },
});

// Dynamic data (no cache)
const data = await fetch('https://api.example.com/live', {
  cache: 'no-store',
});

// On-demand revalidation
import { revalidatePath } from 'next/cache';
revalidatePath('/dashboard');
```

### Real-Time Data

| Approach | Best For | Tools |
|----------|----------|-------|
| Polling | Simple updates | setInterval, React Query refetchInterval |
| Server-Sent Events | Server push | EventSource |
| WebSockets | Bidirectional | Socket.io, WebSocket API |
| Server Actions | Mutations | Next.js 14+ |

## Routing (Next.js 2024-2025)

### File-Based Routing (App Router)

```
app/
├── (marketing)/         # Route group (no URL prefix)
│   ├── about/
│   │   └── page.tsx    # /about
│   └── pricing/
│       └── page.tsx    # /pricing
├── (dashboard)/         # Route group with shared layout
│   ├── layout.tsx      # Dashboard layout
│   ├── page.tsx        # /dashboard
│   ├── settings/
│   │   └── page.tsx    # /dashboard/settings
│   └── [id]/           # Dynamic route
│       └── page.tsx    # /dashboard/[id]
└── layout.tsx          # Root layout
```

### Parallel and Intercepting Routes

Based on [Mastering Next.js and React Features for 2025](https://dev.to/golsaesk/mastering-the-most-useful-nextjs-and-react-features-for-2025-4g60):

```tsx
// Parallel routes (load multiple sections simultaneously)
app/
├── @dashboard/
│   └── page.tsx
├── @analytics/
│   └── page.tsx
└── layout.tsx          // Renders both slots in parallel

// Intercepting routes (show modal while keeping URL)
app/
├── photo/
│   └── [id]/
│       └── page.tsx
└── @modal/
    └── photo/
        └── [id]/
            └── page.tsx  // Modal overlay
```

### Nested Routes with Layouts

```tsx
// Layout component (Server Component)
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}

// Nested routes inherit layout
// /dashboard/settings renders DashboardLayout + SettingsPage
```

## Performance (Core Web Vitals)

### Core Web Vitals Targets (2024 Standard)

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP (Loading) | < 2.5s | < 4s | > 4s |
| INP (Interactivity) | < 100ms | < 300ms | > 300ms |
| CLS (Stability) | < 0.1 | < 0.25 | > 0.25 |

### Performance Optimization Strategies

**Server Components** (Major performance win):
- Reduce client bundle size
- Move heavy logic to server
- Eliminate unnecessary client-side JavaScript

**Code Splitting**:
```tsx
// Route-based splitting (automatic in Next.js)
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Component-based splitting
const HeavyChart = lazy(() => import('./components/HeavyChart'));

function App() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyChart />
    </Suspense>
  );
}
```

**Image Optimization**:
```tsx
// Next.js Image component (recommended)
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1920}
  height={1080}
  priority // Above-fold images
  placeholder="blur" // Blur-up effect
/>
```

### Performance Checklist

- [ ] Server Components by default
- [ ] Code splitting by route
- [ ] Lazy load heavy components
- [ ] Optimize images (WebP, AVIF)
- [ ] Minimize bundle size (tree shaking)
- [ ] Enable compression (gzip, brotli)
- [ ] Use CDN for static assets
- [ ] Implement caching strategy
- [ ] Measure Core Web Vitals
- [ ] Monitor INP (Interaction to Next Paint)

## Testing (2024-2025)

### Testing Pyramid

```
        ┌─────────┐
       /    E2E   \          10% - Critical user flows
      /───────────\
     /   Integration  \       20% - Component interactions
    /─────────────────\
   /     Unit Tests     \     70% - Pure functions, hooks
  /─────────────────────\
```

### Testing Tools

| Type | Tools | What to Test |
|------|-------|--------------|
| **Unit** | Vitest, Jest | Functions, hooks, utilities |
| **Component** | Testing Library | Component behavior, events |
| **Integration** | Testing Library | Multiple components together |
| **E2E** | Playwright, Cypress | User flows across pages |

### Testing Strategy

```tsx
// Unit test example (Vitest)
import { describe, it, expect } from 'vitest';
import { formatDate } from './utils/date';

describe('formatDate', () => {
  it('formats date correctly', () => {
    expect(formatDate('2024-01-15')).toBe('January 15, 2024');
  });
});

// Component test example (Testing Library)
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

test('button calls onClick when clicked', () => {
  const handleClick = vi.fn();
  render(<Button label="Click me" onClick={handleClick} />);

  screen.getByText('Click me').click();
  expect(handleClick).toHaveBeenCalledTimes(1);
});

// E2E test example (Playwright)
import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

## Technology Stack Decision Guide (2024-2025)

### Framework Selection

Based on [React Tech Stack 2025](https://www.robinwieruch.de/react-tech-stack/):

| Framework | Best For | Trade-offs |
|-----------|----------|------------|
| **Next.js 14+** | SEO-critical, content sites, SaaS | SSR complexity, steeper learning curve |
| **Vite + React** | SPAs, dashboards, internal tools | No SSR, simpler setup |
| **Remix** | Nested routes, data-heavy apps | Learning curve, opinionated |
| **Vue + Nuxt** | Progressive enhancement | Smaller ecosystem |

### Component Library Selection

| Library | Best For | Trade-offs |
|---------|----------|------------|
| **shadcn/ui** | Full customization | Requires setup, manual updates |
| **MUI** | Enterprise, rapid dev | Heavy bundle, opinionated |
| **Chakra UI** | Accessibility, theming | Larger bundle size |
| **Headless UI** | Tailwind projects | Unstyled, need CSS |

### State Management Evolution (2024-2025)

Based on [Frontend Tech Stack Evolution 2024-2025](https://www.linkedin.com/posts/sanchit0496_reactjs-nextjs-javascript-activity-7320785137766424576-H715):

- **Redux → Zustand / RTK Query** (for simplicity)
- **Client state → Server Components** (when possible)
- **useEffect data fetching → React Query / SWR**

## Project Structure Recommendations

### Monorepo for Large Projects

```
frontend-monorepo/
├── apps/
│   ├── web/              # Main web app (Next.js)
│   ├── admin/            # Admin dashboard (Next.js)
│   └── docs/             # Documentation site (Vite)
├── packages/
│   ├── ui/               # Shared UI components
│   ├── config/           # Shared config (ESLint, TSConfig)
│   └── utils/            # Shared utilities
└── package.json
```

### Single Repo for Small Projects

```
frontend-app/
├── src/
│   ├── components/       # Components
│   ├── app/              # Next.js App Router
│   ├── pages/            # Pages (Pages Router)
│   ├── hooks/            # Custom hooks
│   ├── services/         # API services
│   ├── stores/           # State management
│   ├── utils/            # Utilities
│   └── types/            # TypeScript types
├── public/               # Static assets
└── tests/                # Test files
```

## TypeScript Best Practices (2024-2025)

### Strict Mode Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "allowUnusedImports": false,
    "exactOptionalPropertyTypes": true
  }
}
```

### Type-Safe Components

```tsx
// Generic component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

export function List<T>({ items, renderItem }: ListProps<T>) {
  return <ul>{items.map(renderItem)}</ul>;
}

// Usage
<List items={users} renderItem={(u) => <li>{u.name}</li>} />
```

### Zod for Runtime Validation

```tsx
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;

// Parse and validate at runtime
const user = UserSchema.parse(data);
```

## Edge Functions and Server Actions

Based on [Mastering Next.js and React Features for 2025](https://dev.to/golsaesk/mastering-the-most-useful-nextjs-and-react-features-for-2025-4g60):

```tsx
// Edge Function (runs on edge, low latency)
export const runtime = 'edge';

export async function GET() {
  return Response.json({ data: 'hello' });
}

// Server Action with revalidation
'use server';
import { revalidatePath } from 'next/cache';

export async function createPost(data: FormData) {
  const post = await db.post.create({ data });
  revalidatePath('/posts');
  return post;
}
```

## AI Integration (2025 Trend)

Based on [React & Next.js in 2025](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices):

- AI-powered features becoming standard
- Streaming responses for AI chat interfaces
- Edge Functions for low-latency AI inference
- Optimistic UI for immediate feedback

```tsx
// Streaming AI response
import { experimental_streamAction } from 'ai';

export const streamResponse = experimental_streamAction(
  async function* (prompt: string) {
    const response = await ai.generate(prompt);
    for await (const chunk of response) {
      yield chunk;
    }
  }
);
```

## Progressive Disclosure

This SKILL.md provides quick reference patterns for frontend architecture grounded in 2024-2025 best practices.

**For detailed workflows**:
- Use `/rd2:super-designer` for comprehensive UI/UX specifications
- Use `rd2:ui-ux-design` for visual/UX design patterns

**For implementation**:
- Use `/rd2:code-generate` to implement frontend code
- Use `/rd2:code-review` to verify implementation quality

## Quick Reference

### Common Component Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| Compound Components | Components with shared state | Context + children prop |
| Render Props | Share code between components | Function as children |
| Custom Hooks | Reusable stateful logic | Hook composition |
| Higher-Order Components | Cross-cutting concerns | Legacy pattern, avoid |

### Common Performance Optimizations

| Issue | Solution |
|-------|----------|
| Large bundle | Code splitting, tree shaking, Server Components |
| Slow images | WebP, AVIF, lazy loading, next/image |
| Re-renders | useMemo, useCallback, React.memo |
| Slow initial load | SSR, SSG, ISR |
| Flash of unstyled content | CSS-in-JS, critical CSS |

### Common State Gotchas

| Issue | Solution |
|-------|----------|
| Props drilling | Context, state management (Zustand) |
| Stale closures | useRef, useCallback deps |
| Memory leaks | Cleanup in useEffect |
| Unnecessary re-renders | React.memo, useMemo |

### Next.js App Router Patterns

| Pattern | Use Case | File |
|---------|----------|------|
| Server Component | Data fetching, no interactivity | `page.tsx` (default) |
| Client Component | Interactivity, state, browser APIs | Add `'use client'` |
| Server Action | Mutations, form submissions | `actions.ts` with `'use server'` |
| Route Handler | API endpoints | `route.ts` |
| Middleware | Request interception | `middleware.ts` |

## Sources

- [React & Next.js in 2025 - Modern Best Practices (Strapi, 2025)](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices)
- [Next.js 16: An Engineer's Perspective on Frontend Architecture (Medium, 2025)](https://medium.com/@narayanansundar02/next-js-16-a-engineers-perspective-on-the-future-of-frontend-architecture-5de0ac17f6fb)
- [Mastering the Most Useful Next.js and React Features for 2025 (Dev.to, 2024)](https://dev.to/golsaesk/mastering-the-most-useful-nextjs-and-react-features-for-2025-4g60)
- [React Tech Stack [2025] (Robin Wieruch, 2024)](https://www.robinwieruch.de/react-tech-stack/)
- [Frontend Tech Stack Evolution 2024-2025 (LinkedIn)](https://www.linkedin.com/posts/sanchit0496_reactjs-nextjs-javascript-activity-7320785137766424576-H715)
- [Front-End Architecture with Next.js, React and Tailwind CSS (Medium, 2024)](https://medium.com/@codenova/system-design-template-front-end-architecture-with-next-js-react-and-tailwind-css-0b364f0b1fe9)
