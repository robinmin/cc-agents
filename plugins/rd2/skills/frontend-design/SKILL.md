---
name: frontend-design
description: This skill should be used when the user asks to "design component architecture", "plan state management", "optimize Core Web Vitals", "implement Server Components", "configure data fetching", "design routing structure", "plan testing strategy", "choose component library", or mentions React Query, Zustand, Next.js App Router, Server Actions, shadcn/ui, or frontend performance optimization.
version: 1.1.0
---

# Frontend Design

Frontend architecture patterns and implementation guidance for building scalable web applications using modern React and Next.js best practices (2024-2025).

## Overview

This skill provides architectural guidance for frontend development, covering component design, state management, data fetching, performance (Core Web Vitals), and testing.

**Layered Architecture:**
- **Layer 1 (Quick Reference)** - Decision matrices and cheat sheets for rapid lookup
- **Layer 2 (Workflows)** - Step-by-step architectural design processes
- **Layer 3 (Deep Dives)** - Comprehensive documentation in `references/`

**For visual/UX design**, use `rd2:ui-ux-design` skill.

**For comprehensive design specifications**, use `/rd2:tasks-plan --design` command which invokes the super-designer agent.

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

## Workflows

### Design Component Architecture

Follow this workflow when designing component architecture:

```
1. ANALYZE requirements
   - List all UI components needed
   - Identify shared vs feature-specific components
   - Note interactivity requirements (state, events)

2. CHOOSE component types
   - Server Component: Data fetching, no interactivity
   - Client Component: State, events, browser APIs

3. ORGANIZE directory structure
   - components/ui/ for shared basic components
   - components/layout/ for layout components
   - components/features/ for feature-specific

4. DEFINE component interfaces
   - TypeScript props for all components
   - Separate presentational from container components
   - Extract reusable hooks

5. PLAN composition
   - Use compound components for related pieces
   - Implement render props for shared behavior
   - Create custom hooks for reusable stateful logic

6. VALIDATE architecture
   - [ ] Each component has single responsibility
   - [ ] Props interface is clear and minimal
   - [ ] State is at appropriate level
   - [ ] Components are reusable and testable
```

### Plan State Management Strategy

Follow this workflow when planning state management:

```
1. CATEGORIZE state types
   - Local UI state: Component-level (useState, useReducer)
   - Server state: API data (React Query, SWR)
   - Global state: Cross-component (Zustand, Jotai)
   - Form state: User input (React Hook Form + Zod)
   - URL state: Search params, filters (URLSearchParams)
   - Mutations: Server updates (Server Actions)

2. MAP state to solutions
   For each state type, select the appropriate solution:
   - Local UI: useState/useReducer in Client Components
   - Server state: React Query with cache invalidation
   - Global: Zustand store with actions/selectors
   - Forms: React Hook Form with Zod validation
   - Mutations: Server Actions with revalidatePath

3. DEFINE data flow
   - Identify data sources (API, database, user input)
   - Plan caching strategy (staleTime, revalidation)
   - Design optimistic updates for mutations
   - Handle error and loading states

4. MINIMIZE state
   - Keep state as local as possible
   - Derive values instead of storing (useMemo)
   - Use URL for shareable state
   - Avoid prop drilling with Context or Zustand

5. VALIDATE strategy
   - [ ] State is at lowest possible level
   - [ ] Server state uses React Query
   - [ ] Forms are type-safe with Zod
   - [ ] Mutations use Server Actions
   - [ ] No unnecessary global state
```

### Design Data Fetching Strategy

Follow this workflow when designing data fetching:

```
1. IDENTIFY data requirements
   - Initial page load data (Server Components)
   - User-triggered data (Client Components + React Query)
   - Real-time updates (polling, SSE, WebSockets)
   - Mutations with cache invalidation

2. CHOOSE fetching approach
   - Server Component: async/await with fetch (automatic caching)
   - Client Component: React Query with query keys
   - Real-time: SSE or WebSockets for live data
   - Mutations: Server Actions with revalidatePath

3. PLAN caching strategy
   - Static data: revalidate: 3600 (1 hour)
   - Dynamic data: cache: 'no-store'
   - Tag-based: revalidateTag for bulk invalidation
   - On-demand: revalidatePath after mutations

4. DESIGN loading states
   - Server: Suspense with loading.tsx fallbacks
   - Client: React Query isLoading, isError states
   - Skeletons for better perceived performance
   - Parallel fetching with Promise.all

5. HANDLE errors gracefully
   - Error boundaries for Server Components
   - React Query error states for client
   - Retry logic with exponential backoff
   - User-friendly error messages

6. VALIDATE strategy
   - [ ] Server Components used where possible
   - [ ] React Query for client data fetching
   - [ ] Appropriate cache duration per data type
   - [ ] Loading states for all async operations
   - [ ] Error handling for all failures
```

### Optimize Performance

Follow this workflow when optimizing frontend performance:

```
1. MEASURE baseline
   - Run Lighthouse audit
   - Check Core Web Vitals (LCP, INP, CLS)
   - Analyze bundle size with bundle analyzer
   - Identify performance bottlenecks

2. OPTIMIZE loading
   - Use Server Components by default
   - Lazy load below-fold components (React.lazy, dynamic)
   - Priority load above-fold images (priority prop)
   - Code split by route (automatic in Next.js)

3. OPTIMIZE assets
   - Use next/image for automatic optimization
   - Enable WebP/AVIF formats
   - Set appropriate cache headers
   - Use CDN for static assets

4. OPTIMIZE rendering
   - Memoize expensive calculations (useMemo)
   - Prevent unnecessary re-renders (React.memo)
   - Virtualize large lists (@tanstack/react-virtual)
   - Debounce/throttle event handlers

5. VALIDATE improvements
   - [ ] LCP < 2.5s (Largest Contentful Paint)
   - [ ] INP < 200ms (Interaction to Next Paint)
   - [ ] CLS < 0.1 (Cumulative Layout Shift)
   - [ ] Bundle size reduced by 20%+
   - [ ] Lighthouse score improved
```

### Plan Testing Strategy

Follow this workflow when planning testing:

```
1. DEFINE testing scope
   - Unit tests: 70% - Functions, hooks, utilities
   - Integration tests: 20% - Component interactions
   - E2E tests: 10% - Critical user flows

2. SELECT testing tools
   - Unit: Vitest (fast, Vite-native)
   - Component: React Testing Library
   - E2E: Playwright (cross-browser)
   - Mocking: MSW (API mocking)

3. PLAN test coverage
   - Test user interactions, not implementation
   - Cover happy path and error cases
   - Test loading and error states
   - Verify accessibility (a11y)

4. WRITE effective tests
   - Arrange-Act-Assert pattern
   - Test behavior, not details
   - Use descriptive test names
   - Mock external dependencies

5. VALIDATE strategy
   - [ ] Unit tests for pure functions
   - [ ] Integration tests for components
   - [ ] E2E tests for critical flows
   - [ ] Tests run in CI/CD pipeline
   - [ ] Coverage threshold enforced
```

## Quick Reference Tables

### Server vs Client Components

| Aspect | Server Component | Client Component |
|--------|-----------------|------------------|
| Data fetching | Direct async/await | useEffect, React Query |
| State | Not supported | useState, useReducer |
| Event handlers | Not supported | onClick, onChange |
| Browser APIs | Not supported | window, localStorage |
| Bundle size | Zero JS | Adds to bundle |

### State Management Selection

| State Type | Solution | Notes |
|------------|----------|-------|
| **Local UI state** | useState, useReducer | Client Components only |
| **Server state** | React Query, SWR | Replaces Redux for server data |
| **Global state** | Zustand, Jotai | Simpler than Redux |
| **Form state** | React Hook Form + Zod | Type-safe validation |
| **URL state** | URLSearchParams | Native browser API |
| **Mutations** | Server Actions | Next.js 14+ |

### Core Web Vitals Targets

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Loading) | < 2.5s | < 4s | > 4s |
| **INP** (Interactivity) | < 200ms | < 500ms | > 500ms |
| **CLS** (Stability) | < 0.1 | < 0.25 | > 0.25 |

### Testing Pyramid

| Level | Coverage | Tools | Focus |
|-------|----------|-------|-------|
| **Unit** | 70% | Vitest, Jest | Functions, hooks |
| **Integration** | 20% | Testing Library | Component interactions |
| **E2E** | 10% | Playwright | Critical user flows |

### Framework Selection

| Framework | Best For | Trade-offs |
|-----------|----------|------------|
| **Next.js 14+** | SEO-critical, SaaS | SSR complexity |
| **Vite + React** | SPAs, dashboards | No SSR |
| **Remix** | Nested routes, data-heavy | Opinionated |

### Component Library Selection

| Library | Best For | Trade-offs |
|---------|----------|------------|
| **shadcn/ui** | Full customization | Manual updates |
| **MUI** | Enterprise, rapid dev | Heavy bundle |
| **Chakra UI** | Accessibility | Medium bundle |
| **Headless UI** | Tailwind projects | Unstyled |

## Common Patterns Summary

### Component Organization

```
src/
├── components/           # Shared components
│   ├── ui/              # Basic UI (Button, Input)
│   ├── layout/          # Layout (Header, Sidebar)
│   └── features/        # Feature-specific
├── app/                 # Next.js App Router
├── hooks/               # Custom React hooks
├── services/            # API services
├── stores/              # State management
└── types/               # TypeScript types
```

### Next.js App Router Patterns

| Pattern | Use Case | File |
|---------|----------|------|
| Server Component | Data fetching, no interactivity | `page.tsx` (default) |
| Client Component | Interactivity, state | Add `'use client'` |
| Server Action | Mutations, forms | `actions.ts` with `'use server'` |
| Route Handler | API endpoints | `route.ts` |
| Middleware | Request interception | `middleware.ts` |

### Performance Checklist

- [ ] Server Components by default
- [ ] Code split by route (automatic in Next.js)
- [ ] Lazy load below-fold components
- [ ] Priority load above-fold images
- [ ] Use `next/image` for images
- [ ] Memoize expensive calculations
- [ ] Virtual lists for large datasets

## Detailed References

For comprehensive guidance on specific topics, see:

### Reference Files

- **`references/component-patterns.md`** - Server/Client components, presentational vs container, organization patterns
- **`references/state-management.md`** - React Query, Zustand, Server Actions, form handling
- **`references/data-fetching.md`** - Caching strategies, real-time data, error handling
- **`references/routing.md`** - App Router, parallel routes, intercepting routes, middleware
- **`references/performance.md`** - Core Web Vitals optimization, code splitting, image optimization
- **`references/testing.md`** - Testing pyramid, Vitest, Playwright, MSW
- **`references/tech-stack.md`** - Framework selection, component libraries, project structure

## Progressive Disclosure

This SKILL.md provides quick reference patterns and workflows for frontend architecture grounded in 2024-2025 best practices.

**For detailed implementation guidance**, see the reference files listed above.

**For visual/UX design patterns**, use `rd2:ui-ux-design` skill.

**For comprehensive UI/UX specifications**, use `/rd2:tasks-plan --design` to invoke super-designer.

**For implementation**, use `/rd2:code-generate` to implement frontend code and `/rd2:code-review` to verify implementation quality.

## Sources

- [React & Next.js in 2025 - Modern Best Practices (Strapi, 2025)](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices)
- [Next.js 16: An Engineer's Perspective on Frontend Architecture (Medium, 2025)](https://medium.com/@narayanansundar02/next-js-16-a-engineers-perspective-on-the-future-of-frontend-architecture-5de0ac17f6fb)
- [Mastering the Most Useful Next.js and React Features for 2025 (Dev.to, 2024)](https://dev.to/golsaesk/mastering-the-most-useful-nextjs-and-react-features-for-2025-4g60)
- [React Tech Stack [2025] (Robin Wieruch, 2024)](https://www.robinwieruch.de/react-tech-stack/)
- [Frontend Tech Stack Evolution 2024-2025 (LinkedIn)](https://www.linkedin.com/posts/sanchit0496_reactjs-nextjs-javascript-activity-7320785137766424576-H715)
