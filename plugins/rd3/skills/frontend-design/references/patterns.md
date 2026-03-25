---
name: patterns
description: "Frontend implementation patterns: component organization, Next.js App Router patterns, and performance checklist."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
tags: [frontend, patterns, component-architecture, nextjs, performance]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:frontend-design
  - rd3:frontend-architect
  - rd3:ui-ux-design
---

# Frontend Implementation Patterns

## Component Organization

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

## Next.js App Router Patterns

| Pattern | Use Case | File |
|---------|----------|------|
| Server Component | Data fetching, no interactivity | `page.tsx` (default) |
| Client Component | Interactivity, state | Add `'use client'` |
| Server Action | Mutations, forms | `actions.ts` with `'use server'` |
| Route Handler | API endpoints | `route.ts` |
| Middleware | Request interception | `middleware.ts` |

## Performance Checklist

- [ ] Server Components by default
- [ ] Code split by route (automatic in Next.js)
- [ ] Lazy load below-fold components
- [ ] Priority load above-fold images
- [ ] Use `next/image` for images
- [ ] Memoize expensive calculations
- [ ] Virtual lists for large datasets
