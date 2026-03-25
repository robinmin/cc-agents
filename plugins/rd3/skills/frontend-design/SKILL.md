---
name: frontend-design
description: "Frontend implementation patterns: component architecture, state management (Zustand/React Query), data fetching, Core Web Vitals optimization, and testing strategies. Trigger when designing component architecture, planning state management, or optimizing frontend performance."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
type: technique
tags: [frontend, react, nextjs, component-architecture, state-management, react-query, performance, testing]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - pipeline
  pipeline_steps:
    - design-component-architecture
    - plan-state-management
    - design-data-fetching
    - optimize-performance
    - plan-testing
  trigger_keywords:
    - component-architecture
    - state-management
    - react-query
    - core-web-vitals
    - server-components
    - frontend-testing
    - frontend-performance
see_also:
  - rd3:frontend-architect
  - rd3:ui-ux-design
  - rd3:sys-testing
  - rd3:pl-typescript
---

# rd3:frontend-design — Frontend Implementation Patterns

Frontend architecture patterns and implementation guidance for building scalable web applications using modern React and Next.js best practices (2024-2025).

## Overview

This skill provides architectural guidance for frontend development, covering component design, state management, data fetching, performance (Core Web Vitals), and testing.

## When to Use

- Designing frontend component architecture
- Planning state management approach
- Designing data fetching and caching strategies
- Optimizing frontend performance (Core Web Vitals)
- Planning testing strategies
- Designing routing and navigation
- Choosing frontend technology stack
- Implementing Server Components vs Client Components
- Planning Server Actions and mutations

**Not the right fit when:**
- High-level architecture decisions (use `rd3:frontend-architect` instead)
- Visual/UX design (use `rd3:ui-ux-design` instead)
- Backend API design (use `rd3:backend-architect` instead)

## Quick Start

Use the workflow that matches your current task:

**1. Component Architecture** → Follow `Design Component Architecture` workflow to plan component hierarchy, choose Server vs Client components, and organize directory structure.

**2. State Management** → Follow `Plan State Management Strategy` workflow to categorize state types (local, server, global, form) and select appropriate solutions (React Query, Zustand, React Hook Form).

**3. Data Fetching** → Follow `Design Data Fetching Strategy` workflow for Server Components and React Query patterns.

**4. Performance** → Follow `Optimize Performance` workflow to measure and improve Core Web Vitals (LCP < 2.5s, INP < 200ms, CLS < 0.1).

**5. Testing** → Follow `Plan Testing Strategy` workflow (70% unit, 20% integration, 10% E2E).

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

## Quick Reference

For detailed reference tables and patterns, see:

- **Component Patterns**: [`references/component-patterns.md`](references/component-patterns.md) — compound components, render props, hooks patterns
- **State Management**: [`references/state-management.md`](references/state-management.md) — Zustand, Jotai, React Hook Form + Zod
- **Data Fetching**: [`references/data-fetching.md`](references/data-fetching.md) — React Query, SWR, Server Components
- **Routing**: [`references/routing.md`](references/routing.md) — Next.js App Router patterns
- **Performance**: [`references/performance.md`](references/performance.md) — Core Web Vitals, bundle optimization
- **Testing**: [`references/testing.md`](references/testing.md) — Vitest, Testing Library, Playwright
- **Tech Stack**: [`references/tech-stack.md`](references/tech-stack.md) — framework and library selection
- **Implementation Patterns**: [`references/patterns.md`](references/patterns.md) — directory structure, Next.js patterns, performance checklist

## Additional Resources

- **Next.js Documentation**: https://nextjs.org/docs — Official Next.js 14+ App Router docs
- **React Docs**: https://react.dev — React 18 with Server Components
- **TanStack Query**: https://tanstack.com/query — React Query v5 documentation
- **Zustand**: https://zustand.docs.pmnd.rs — Lightweight state management
- **Vitest**: https://vitest.dev — Vite-native testing framework
- **Playwright**: https://playwright.dev — Cross-browser E2E testing
