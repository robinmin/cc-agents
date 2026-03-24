---
name: frontend-architect
description: "Frontend system architecture: SPA vs SSR vs SSG vs ISR, microfrontends, monorepo, CDN/edge strategies, frontend security, and scalability patterns. Trigger when making high-level frontend architecture decisions."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-24
type: technique
tags: [frontend, architecture, rendering-strategies, microfrontends, monorepo, scalability, security]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - inversion
    - knowledge-only
  openclaw:
    emoji: "🛠️"
see_also:
  - rd3:frontend-design
  - rd3:ui-ux-design
  - rd3:backend-architect
---

# rd3:frontend-architect — Frontend Architecture Patterns

Frontend system architecture and scalability patterns for building large-scale, maintainable frontend applications using 2024-2025 best practices.

## Overview

This skill provides architectural guidance for frontend systems design, covering rendering strategies, application structure (monolith vs microfrontends), build/deployment architecture, security, observability, and multi-team coordination patterns.

## Quick Start

```typescript
// Example 1: Rendering strategy decision
// User: "Choose between SPA, SSR, SSG, or ISR for an e-commerce platform with 100K products"
// Response: Ask team size, SEO needs, content update frequency first → then recommend SSR+ISR

// Example 2: Microfrontends decision
// User: "Should we use microfrontends for our banking platform?"
// Response: Ask team count, deployment independence needs first → then evaluate Module Federation
```

## Workflows

### Architecture Consultation Workflow

1. **Interview**: Ask one requirement question at a time
   - Team size and deployment cadence
   - SEO and content requirements
   - Scale and performance targets
2. **Analyze**: Map requirements to architecture patterns
3. **Recommend**: Present decision matrix with trade-offs
4. **Document**: Create ADR for significant decisions

### Trigger when:
- Choosing rendering strategies (SPA, SSR, SSG, ISR)
- Planning application structure (monolith vs microfrontends)
- Designing build/deployment architecture (CI/CD, CDN, edge)
- Planning frontend security architecture
- Designing observability and monitoring
- Planning performance architecture at scale
- Coordinating multi-team frontend development
- Selecting frontend technology stack
- Planning monorepo or multi-repo strategy
- Designing frontend governance patterns

**Not the right fit when:**
- Implementation-level guidance (use `rd3:frontend-design` instead)
- UI/UX patterns and visual design (use `rd3:ui-ux-design` instead)
- Backend architecture decisions (use `rd3:backend-architect` instead)

## When to Use

Ask one question at a time before recommending architecture. Gather requirements incrementally:

- **First**: Ask about team size, deployment needs, and SEO requirements
- **Then**: Ask about content update frequency and personalization needs
- **Finally**: Recommend rendering strategy and architecture pattern

Do not recommend until requirements are understood: team size, content type, SEO needs, and scale requirements.

## Core Principles

### Verification Before Design

- **Search first**: Always verify current framework capabilities
- **Cite sources**: Every decision should reference documentation
- **Version awareness**: Framework behavior changes between versions
- **Benchmark claims**: Performance assertions require data

### Architecture by Necessity

- Start simple, scale when needed
- YAGNI (You Aren't Gonna Need It) applies to frontend
- Premature optimization is the root of complexity
- Architecture investment should match team size and scale

### Team Topology Matters

- Architecture follows team structure
- Independent teams need independent deployment
- Shared code requires shared ownership
- Governance is essential at scale

### Data-Driven Decisions

- Real user metrics over intuition
- Core Web Vitals guide performance architecture
- Load testing before launch
- Cost-per-request guides infrastructure decisions

## Rendering Strategy Decision Matrix

### Comparison Table

| Strategy | Best For | TTFB | JavaScript | SEO | Dynamic Data | Complexity | 2025 Recommendation |
|----------|----------|------|------------|-----|--------------|------------|---------------------|
| **SPA** | Highly interactive, auth-required apps | Slow | Heavy | Poor | Excellent | Low | Use for dashboards |
| **SSR** | SEO-critical, dynamic content | Fast | Medium | Good | Excellent | Medium | Use for e-commerce |
| **SSG** | Static content, marketing pages | Fastest | Light | Perfect | None | Low | Use for marketing |
| **ISR** | Dynamic but cacheable content | Fast | Medium | Perfect | Good | Medium | Use for blogs/catalogs |
| **SSR + Streaming** | Complex pages with slow components | Medium | Medium | Good | Excellent | High | Use for complex dashboards |
| **Edge SSR** | Geo-specific, personalization | Fastest | Light | Perfect | Good | Medium | **Emerging 2025** |

### Decision Framework

**Choose SPA when:**
- Authentication required (no SEO needed)
- Highly interactive dashboard
- Real-time updates (WebSocket-heavy)
- Small to medium content size
- Example: Internal admin panel, SaaS dashboard

**Choose SSR when:**
- SEO is critical
- Dynamic content on every request
- Social media sharing important
- First-render performance matters
- Example: E-commerce product page, news site

**Choose SSG when:**
- Content changes infrequently
- Maximum performance required
- Zero server costs desired
- Example: Marketing pages, documentation, blog

**Choose ISR when:**
- Dynamic but cacheable content
- Updated frequently but not real-time
- CDN distribution needed
- Example: Blog with daily updates, product catalog

**Choose SSR + Streaming when:**
- Complex pages with slow sections
- Multiple data sources with different latencies
- Need progressive page rendering
- Example: Dashboard with multiple widgets

**Choose Edge SSR when:**
- Geo-specific content (localization, A/B testing)
- Personalization without revalidation
- Low latency required globally
- Example: Global SaaS with regional customization

### Current Next.js App Router Patterns

```typescript
// SPA (Client-side rendering)
// app/dashboard/page.tsx
'use client'  // Forces client-side rendering

export default function Dashboard() {
  // Full React interactivity
}

// App Router pages are Server Components by default.
// If data is cacheable, the route can stay static by default.
// app/marketing/page.tsx
export const revalidate = 3600

export default async function MarketingPage() {
  const res = await fetch('https://api.example.com/marketing', {
    next: { revalidate: 3600 },
  })
  const data = await res.json()
  return <MarketingPageView data={data} />
}

// SSG (Static site generation)
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  return posts.map(post => ({ slug: post.slug }))
}
// Static generation at build time

// Dynamic SSR / request-time rendering
// app/products/[id]/page.tsx
export const dynamic = 'force-dynamic'

export default async function ProductPage() {
  const res = await fetch('https://api.example.com/products', {
    cache: 'no-store',
  })
  const data = await res.json()
  return <ProductView data={data} />
}

// ISR (Incremental Static Regeneration)
// app/products/page.tsx
export const revalidate = 3600  // Revalidate every hour

export default async function ProductsPage() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600 },
  })
  const data = await res.json()
  return <ProductsView data={data} />
}

// SSR + Streaming (React Suspense)
// app/dashboard/page.tsx
import { Suspense } from 'react'

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />  {/* Streams in when ready */}
      </Suspense>
    </div>
  )
}

// Edge runtime for latency-sensitive server rendering
// app/page.tsx
export const runtime = 'edge'

export default function Page() {
  // Runs on edge network (Cloudflare Workers, Vercel Edge)
}
```

## Application Architecture

### Monolith vs Microfrontends

**Monolith Advantages:**
- Simpler deployment and operations
- Shared dependencies and design system
- Easier routing and state management
- Lower infrastructure cost
- Better for small to medium teams

**Microfrontends Advantages:**
- Independent team deployment
- Technology diversity (React, Vue, Angular共存)
- Fault isolation
- Scalable team structure
- Better for large organizations (10+ teams)

**Decision Framework:**
```
Use Monolith when:
- Team size < 10 developers
- Single technology stack preferred
- Simple deployment is valued
- Shared state is manageable

Use Microfrontends when:
- 10+ frontend teams
- Different technology stacks required
- Independent deployment cycles needed
- Teams have different release cadences
```

### Microfrontends Patterns

**1. Module Federation (Recommended for 2025)**

```typescript
// webpack.config.js (host app)
const ModuleFederationPlugin = require('@module-federation/webpack')

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        product: 'product@https://product.example.com/remoteEntry.js',
        checkout: 'checkout@https://checkout.example.com/remoteEntry.js',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
}

// Use remote component
import ProductCatalog from 'product/ProductCatalog'
```

**2. Next.js Multi-Zones**

```typescript
// Zone 1: app.example.com (main app)
// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/checkout',
        destination: `${process.env.CHECKOUT_DOMAIN}/checkout`,
      },
      {
        source: '/checkout/:path+',
        destination: `${process.env.CHECKOUT_DOMAIN}/checkout/:path+`,
      },
      {
        source: '/checkout-static/:path+',
        destination: `${process.env.CHECKOUT_DOMAIN}/checkout-static/:path+`,
      },
    ]
  },
}

// Zone 2: checkout.example.com (checkout micro-frontend)
module.exports = {
  assetPrefix: '/checkout-static',
}
```

**3. Backend-for-Frontend (BFF) Pattern**

```typescript
// Next.js API Routes as BFF layer
// app/api/users/route.ts
export async function GET(request: Request) {
  const [profile, preferences, activity] = await Promise.all([
    userService.getProfile(),
    preferencesService.getPreferences(),
    activityService.getActivity(),
  ])

  return Response.json({ profile, preferences, activity })
}
```

### Monorepo vs Multi-Repo

**Monorepo Advantages:**
- Single source of truth
- Shared dependencies via workspace protocol
- Atomic commits across packages
- Unified CI/CD pipeline
- Easier code sharing and refactoring

**Multi-Repo Advantages:**
- Independent deployment cycles
- Clear ownership boundaries
- Flexible technology choices
- Reduced blast radius

**Recommendation for 2025:**
- **Start with monorepo** using Nx or Turborepo
- Move to microfrontends only when team pain points emerge
- Use Module Federation within monorepo for best DX
- Consider multi-repo only for truly independent products

## Build and Deployment Architecture

### CI/CD Pipeline

```yaml
# Modern CI/CD pipeline (GitHub Actions)
name: Frontend CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run build
      - run: npm run test:e2e

  deploy-preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy:preview
```

### Proxy and Edge Routing Strategy

**Current Next.js guidance:**
- In Next.js 16+, use `proxy.ts` for request-time routing logic
- Keep routing decisions fast and avoid slow backend work in proxy
- Prefer config-based `redirects`/`rewrites` when the routing is static

**Good use cases:**
- Geo-specific content (A/B testing, localization)
- Personalization without revalidation
- Rate limiting and auth checks
- Dynamic routing based on user attributes
- API proxying with low latency

```typescript
// proxy.ts (called middleware.ts in older Next.js versions)
import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  const country = request.headers.get('x-country') ?? 'US'  // Set by CDN/proxy

  // A/B test routing
  if (url.pathname.startsWith('/landing') && Math.random() < 0.5) {
    url.pathname = `/new-design${url.pathname}`
  }

  // Geographic routing
  if (country !== 'US') {
    url.pathname = `/intl${url.pathname}`
  }

  // Authentication check should stay lightweight
  const session = request.cookies.get('session')
  if (!session && url.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.rewrite(url)
}
```

### CDN Strategy

**Cache Hierarchy:**
1. **Browser cache** (1 hour - 1 day)
2. **CDN edge cache** (1 hour - 7 days)
3. **CDN regional cache** (1 day - 30 days)
4. **Origin** (source of truth)

**CDN Selection:**

| CDN | Best For | Edge Computing | Pricing |
|-----|----------|----------------|---------|
| **Cloudflare** | Global performance, security | Workers (JS), Pages | Free tier |
| **Vercel** | Next.js apps, developer DX | Edge Functions, ISR | Simple, usage-based |
| **AWS CloudFront** | AWS integration | Lambda@Edge | Complex, pay-per-use |
| **Fastly** | Enterprise, edge logic | Compute@Edge | Expensive, powerful |

## Frontend Security Architecture

### Authentication Patterns

```typescript
// Store tokens securely
// Use httpOnly cookies for server sessions
// Use memory or httpOnly cookies for JWT (never localStorage)

// Bad (vulnerable to XSS):
localStorage.setItem('token', jwt)  // DON'T DO THIS

// Good (httpOnly cookie):
fetch('/api/login', {
  method: 'POST',
  credentials: 'include',  // Sends cookies
})

// Good (memory + refresh token):
let accessToken = null
async function refreshToken() {
  const res = await fetch('/api/refresh', {
    credentials: 'include',  // httpOnly refresh token
  })
  accessToken = await res.json()
}
```

### Authorization Architecture

```typescript
// Middleware-based authorization
export async function requireRole(role: string) {
  const session = await getSession()
  if (!session?.roles.includes(role)) {
    throw new RedirectError('/403')
  }
}

// Component-level authorization
export function withRole<P>(
  Component: React.ComponentType<P>,
  role: string
) {
  return function ProtectedComponent(props: P) {
    const { roles } = useSession()
    if (!roles.includes(role)) {
      return <Forbidden />
    }
    return <Component {...props} />
  }
}
```

### Security Headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "object-src 'none'",
    ].join('; ')
  },
]

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
```

## Observability and Monitoring

### Three Pillars

**1. Metrics (RED method):**
- Rate: Requests per second
- Errors: Error rate (4xx, 5xx)
- Duration: Response time (p50, p95, p99)

**2. Logs:**
```typescript
// Structured logging (JSON)
logger.info('User logged in', {
  user_id: '123',
  timestamp: '2025-01-15T10:30:00Z',
  ip: '192.168.1.1',
  user_agent: 'Mozilla/5.0...',
})
```

**3. Traces (OpenTelemetry):**
```typescript
// Distributed tracing
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('frontend')

async function checkout() {
  const span = tracer.startSpan('checkout')
  try {
    await validateCart()
    await processPayment()
    span.setStatus({ code: SpanStatusCode.OK })
  } catch (error) {
    span.recordException(error)
    throw error
  } finally {
    span.end()
  }
}
```

### Real User Monitoring (RUM)

```typescript
// Next.js client-side Web Vitals reporting
'use client'
import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    if (['CLS', 'INP', 'LCP', 'TTFB'].includes(metric.name)) {
      analytics.track(metric.name, { value: metric.value })
    }
  })

  return null
}
```

### Error Tracking

```typescript
// Sentry integration
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})

// Error boundaries
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  Sentry.captureException(error)
  return <ErrorUI error={error} reset={reset} />
}
```

## Performance Architecture at Scale

### Performance Budgets

```javascript
// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.performance = {
        maxAssetSize: 244 * 1024,  // 244KB per chunk
        maxEntrypointSize: 244 * 1024,
      }
    }
    return config
  },
}
```

### Code Splitting Strategy

```typescript
// Route-based splitting (automatic with Next.js App Router)

// Component-based splitting
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,  // Client-only
})

// Feature-based splitting
const AdminPanel = dynamic(() =>
  import('./AdminPanel').then(mod => mod.AdminPanel),
  { loading: () => <AdminSkeleton /> }
)
```

### Caching Strategy

```typescript
// Static assets: 1 year
// next.config.js
module.exports = {
  headers: async () => [{
    source: '/static/:path*',
    headers: [{
      key: 'Cache-Control',
      value: 'public, max-age=31536000, immutable',
    }],
  }],
}

// API Caching (Next.js fetch caching)
export const revalidate = 3600  // 1 hour

// Client-side caching (React Query)
import { useQuery } from '@tanstack/react-query'

function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 60 * 60 * 1000,
  })
}
```

## Multi-Team Coordination

### Design System Governance

**Versioning Strategy:**
```json
{
  "name": "@company/design-system",
  "version": "3.2.1",
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  }
}
```

**Component Ownership:**
- Core components: Design system team
- Business components: Product teams
- Shared business components: Governance board

### Code Review Guidelines

**Frontend-specific checklist:**
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Performance (Lighthouse score >90)
- [ ] TypeScript strict mode
- [ ] Test coverage >80%
- [ ] No console.log in production
- [ ] Proper error handling
- [ ] Loading/error states
- [ ] Responsive design

### Team Topology Patterns

**Stream-aligned teams** (feature teams):
- End-to-end ownership
- 5-8 developers
- Full-stack capability

**Enabling teams** (platform):
- Design system team
- Developer experience team
- Infrastructure team

**Subsystem teams:**
- Architecture decision group
- Governance board
- Standards committee
## Architecture Decision Records (ADRs)

```markdown
# ADR-001: Use Next.js 16 with SSR for E-commerce Platform

## Context
Building an e-commerce platform with 100K products, requiring SEO, dynamic content, and high performance.

## Decision
Use Next.js 16 with Server-Side Rendering (SSR) and Incremental Static Regeneration (ISR).

## Consequences

### Positive
- SEO-friendly with server-rendered HTML
- Fast first content paint (FCP)
- Incremental static regeneration for product pages
- Built-in image optimization
- API routes for BFF pattern

### Negative
- Higher server costs than SPA
- More complex deployment than static site
- Requires Node.js server

### Alternatives Considered
- **SPA (React)**: Rejected due to poor SEO
- **SSG (Astro)**: Rejected due to dynamic content requirements
- **Remix**: Rejected due to smaller ecosystem

## Status
Accepted

## Date
2025-01-24
```
## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs) — Official Next.js docs for App Router, SSR, ISR patterns
- [Module Federation](https://module-federation.io/) — Module Federation plugin and microfrontends
- [Web Vitals](https://web.dev/vitals/) — Core Web Vitals guidance from Google
- [Turborepo](https://turbo.build/repo) — Monorepo build system for frontend
- [OpenTelemetry](https://opentelemetry.io/) — Observability and distributed tracing

## Platform Notes

### Claude Code
- Use !`cmd` for live command execution
- Use `$ARGUMENTS` or `$1`, `$2` etc. for parameter references
- Use `context: fork` for parallel task execution
- Hooks can be registered in `.claude/hooks.json`

See [Technology Selection](references/technology-selection.md) for detailed content.

See [Quick Reference](references/quick-reference.md) for detailed content.
