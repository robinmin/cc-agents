---
name: frontend-architect
description: Frontend system architecture and scalability patterns for 2024-2025. Use when making high-level frontend architecture decisions: SPA vs SSR vs SSG vs ISR, monolith vs microfrontends, build/deployment architecture, CDN/edge strategies, frontend security, monitoring/observability, performance at scale, multi-team coordination, or technology selection. Use when frontend architecture decisions are needed.
---

# Frontend Architect

Frontend system architecture and scalability patterns for building large-scale, maintainable frontend applications using 2024-2025 best practices.

## Overview

This skill provides architectural guidance for frontend systems design, covering rendering strategies, application structure (monolith vs microfrontends), build/deployment architecture, security, observability, and multi-team coordination patterns. It complements `frontend-design` (implementation patterns) and `ui-ux-design` (visual/UX patterns).

**For comprehensive architecture analysis**, use `/rd2:tasks-plan --architect` command which invokes the super-architect agent to provide detailed system design with ADRs, complete verification with benchmarks, and migration strategies.

## Quick Start

```bash
# Rendering strategy decision
"Choose between SPA, SSR, SSG, or ISR for an e-commerce platform with 100K products"

# Microfrontends architecture
"Design microfrontends architecture for a large banking platform with 10 teams"

# Deployment architecture
"Design deployment architecture with edge computing for global SaaS application"

# Monorepo strategy
"Design monorepo structure for 50+ frontend applications with shared design system"

# Performance architecture
"Design performance architecture for 10M+ user dashboard with real-time updates"

# Frontend security
"Design security architecture for payment processing frontend"
```

## When to Use

**Use this skill when:**

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

**For implementation-level guidance** (component design, state management, data fetching), use `/rd2:frontend-design` skill.

**For UI/UX patterns** (accessibility, design tokens, visual design), use `/rd2:ui-ux-design` skill.

## Core Principles (2024-2025)

### Verification Before Design

- **Search first**: Always verify current framework capabilities
- **Cite sources**: Every decision should reference documentation
- **Version awareness**: Framework behavior changes between versions
- **Benchmark claims**: Performance assertions require data

### Architecture by Necessity

**Based on [Frontend Architecture Patterns 2025](https://medium.com/@anosike.fortune/frontend-architecture-patterns-you-need-to-know-in-2025-518fcaaea1d4):**

- Start simple, scale when needed
- YAGNI (You Aren't Gonna Need It) applies to frontend
- Premature optimization is the root of complexity
- Architecture investment should match team size and scale

### Team Topology Matters

**Based on [Frontend at Scale](https://frontendatscale.com/):**

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
|----------|----------|------|------------|-----|--------------|------------|-------------------|
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

### Next.js 16 Implementation

**Based on [Next.js 16 Architecture Blueprint](https://medium.com/@sureshdotariya/next-js-16-architecture-blueprint-for-large-scale-applications-build-scalable-saas-multi-tenant-ab0efe9f2dad):**

```typescript
// SPA (Client-side rendering)
// app/dashboard/page.tsx
'use client'  // Forces client-side rendering

export default function Dashboard() {
  // Full React interactivity
}

// SSR (Server-side rendering)
// app/products/[id]/page.tsx
// No directive = SSR by default
export default function ProductPage({ params }: Props) {
  // Server-rendered, SEO-friendly
}

// SSG (Static site generation)
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  return posts.map(post => ({ slug: post.slug }))
}
// Static generation at build time

// ISR (Incremental Static Regeneration)
// app/products/page.tsx
export const revalidate = 3600  // Revalidate every hour
export default function ProductsPage() {
  // Static with periodic revalidation
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
      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivity />
      </Suspense>
    </div>
  )
}

// Edge SSR (2025)
// app/page.tsx
export const runtime = 'edge'

export default function Page() {
  // Runs on edge network (Cloudflare Workers, Vercel Edge)
  // Best for geo-specific content, A/B testing
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

**Based on [Mastering Micro Frontends: 9 Patterns](https://blog.bitsrc.io/mastering-microfrontends-9-patterns-every-developer-should-know-397081673770) and [Micro Frontends in 2025 & Design Systems](https://www.designsystemscollective.com/micro-frontends-in-2025-design-systems-the-ultimate-guide-d87aa1444a20):**

**1. Module Federation (Recommended for 2025)**
```javascript
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

**2. Next.js Multi-Zones (2025 Best Practice)**
**Based on [Next.js Multi-Zones Documentation](https://nextjs.org/docs/app/guides/multi-zones):**

```typescript
// Zone 1: app.example.com (main app)
// next.config.js
module.exports = {
  async rewrites() {
    return {
      before: [
        {
          source: '/checkout/:path*',
          destination: 'http://checkout.example.com/:path*',
        },
        {
          source: '/product/:path*',
          destination: 'http://product.example.com/:path*',
        },
      ],
    }
  },
}

// Zone 2: checkout.example.com (checkout micro-frontend)
// Independent Next.js app with own deployment

// Zone 3: product.example.com (product catalog)
// Independent Next.js app with own deployment
```

**3. Backend-for-Frontend (BFF) Pattern**
**Based on [Module Federation in Next.js](https://medium.com/better-dev-nextjs-react/module-federation-in-next-js-micro-frontends-that-actually-work-2de0ef541839):**

```typescript
// Next.js API Routes as BFF layer
// app/api/users/route.ts
export async function GET(request: Request) {
  // Calls multiple backend services
  const [profile, preferences, activity] = await Promise.all([
    userService.getProfile(),
    preferencesService.getPreferences(),
    activityService.getActivity(),
  ])

  // Aggregates responses for frontend
  return Response.json({ profile, preferences, activity })
}
```

**4. Web Components (Legacy, but still relevant)**
- Use only when necessary
- Performance and UX limitations
- Better isolation but worse integration

**5. Single-SPA Framework**
- Lifecycle management
- Risky: Abandoned in 2024
- Consider Module Federation instead

### Monorepo vs Multi-Repo

**Based on [Microfrontends vs Monorepos Guide (July 2025)](https://www.designsystemscollective.com/microfrontends-vs-monorepos-a-comprehensive-guide-to-scaling-frontend-architecture-a796a998fb09):**

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
      # Deploy to Vercel preview URL

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy:production
      # Deploy to production with smoke tests
```

### Edge Computing Strategy

**Based on [Next.js 16 Middleware & Edge Functions](https://medium.com/@mernstackdevbykevin/next-js-16-middleware-edge-functions-latest-patterns-in-2025-8ab2653bc9de):**

**Edge Runtime Use Cases:**
- Geo-specific content (A/B testing, localization)
- Personalization without revalidation
- Rate limiting and auth checks
- Dynamic routing based on user attributes
- API proxying with low latency

```typescript
// middleware.ts (Edge Runtime)
export const runtime = 'edge'

export async function middleware(request: Request) {
  const url = new URL(request.url)
  const country = request.geo?.country || 'US'

  // A/B test routing
  if (Math.random() < 0.5) {
    url.pathname = `/new-design${url.pathname}`
  }

  // Geographic routing
  if (country !== 'US') {
    url.hostname = `www.${country}.example.com`
  }

  // Authentication check (fast, no database)
  const token = request.headers.get('authorization')
  if (!token && url.pathname.startsWith('/dashboard')) {
    return Response.redirect(new URL('/login', request.url))
  }

  return NextResponse.rewrite(url)
}

// Edge function for personalization
// app/api/recommendations/route.ts
export const runtime = 'edge'

export async function GET(request: Request) {
  const { geo } = request
  const country = geo?.country || 'US'

  // Return country-specific recommendations
  const recommendations = await getRecommendations(country)
  return Response.json(recommendations)
}
```

**Edge Platforms:**
- **Vercel Edge**: Built for Next.js, global distribution
- **Cloudflare Workers**: 200+ locations, JavaScript-based
- **CloudFront Functions@Edge**: AWS-integrated
- **Cloudflare Pages**: Static + edge functions

### CDN Strategy

**Global Distribution:**
```
Origin Server (us-east-1)
    ↓
CDN Provider (Cloudflare, Fastly, CloudFront)
    ↓
Edge POPs (200+ locations globally)
    ↓
User Browser
```

**Cache Hierarchy:**
1. **Browser cache** (1 hour - 1 day)
2. **CDN edge cache** (1 hour - 7 days)
3. **CDN regional cache** (1 day - 30 days)
4. **Origin** (source of truth)

**CDN Selection:**
| CDN | Best For | Edge Computing | Pricing |
|-----|----------|----------------|---------|
| **Cloudflare** | Global performance, security | Workers (JS), Pages (Frontend) | Free tier available |
| **Vercel** | Next.js apps, developer DX | Edge Functions, ISR | Simple, usage-based |
| **AWS CloudFront** | AWS integration | Lambda@Edge | Complex, pay-per-use |
| **Fastly** | Enterprise, edge logic | Compute@Edge | Expensive, powerful |

## Frontend Security Architecture

### Authentication Patterns

**Client-side Auth (SPA):**
```typescript
// Store tokens securely
// Use httpOnly cookies for server sessions
// Use memory or httpOnly cookies for JWT (never localStorage)

// Bad (vulnerable to XSS):
localStorage.setItem('token', jwt)  // DON'T DO THIS

// Good (httpOnly cookie):
// Server sets httpOnly cookie
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

**Role-Based Access Control (RBAC):**
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
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
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

### CORS Configuration

```typescript
// API routes (Next.js)
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://app.example.com',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
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
// Core Web Vitals tracking
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals'

onCLS(console.log)
onFID(console.log)
onFCP(console.log)
onLCP(console.log)
onTTFB(console.log)

// Send to analytics
onCLS((metric) => {
  analytics.track('CLS', { value: metric.value })
})
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
        maxEntrypointSize: 244 * 1024,  // 244KB for entry
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
  {
    loading: () => <AdminSkeleton />,
  }
)
```

### Image Optimization

```typescript
// Next.js Image component (automatic optimization)
import Image from 'next/image'

export default function ProductImage({ src, alt }: { src: string, alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      priority={false}  // Lazy load by default
      placeholder="blur"  // Blur-up effect
    />
  )
}
```

### Caching Strategy

**CDN Caching:**
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
```

**API Caching:**
```typescript
// Next.js fetch caching
export const revalidate = 3600  // 1 hour

async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600 },  // Cache for 1 hour
  })
  return res.json()
}
```

**Client-side Caching:**
```typescript
// React Query (server state)
import { useQuery } from '@tanstack/react-query'

function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 60 * 60 * 1000,  // 60 minutes (formerly cacheTime)
  })
}

// SWR (alternative)
import useSWR from 'swr'

function useProducts() {
  const { data, error } = useSWR('/api/products', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,  // 1 minute
  })
  return { data, error }
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

**Based on [Frontend at Scale](https://frontendatscale.com/):**

**Stream-aligned teams** (feature teams):
- End-to-end ownership
- 5-8 developers
- Full-stack capability

**Enabling teams** (platform):
- Design system team
- Developer experience team
- Infrastructure team

**Subsystem teams**:
- Architecture decision group
- Governance board
- Standards committee

## Technology Selection

### Framework Selection Matrix

| Framework | Best For | Team Size | Complexity | Ecosystem | 2025 Recommendation |
|-----------|----------|-----------|------------|-----------|-------------------|
| **Next.js** | Full-stack, SEO, SaaS | Any | Medium | Excellent | **Top choice for most projects** |
| **Remix** | Web apps, progressive enhancement | Small-medium | Low-Medium | Good | Choose for simplicity |
| **Nuxt** | Vue ecosystem, enterprise | Any | Medium | Excellent | Choose if Vue preferred |
| **SvelteKit** | Performance, simplicity | Small | Low | Good | Choose for small teams |
| **Astro** | Content sites, marketing | Small | Low | Growing | Choose for static content |

### State Management Selection

| Library | Use Case | Bundle Size | Learning Curve | 2025 Recommendation |
|---------|----------|-------------|----------------|-------------------|
| **Zustand** | Global client state | Small | Low | **Recommended for most apps** |
| **React Query** | Server state | Medium | Low | **Essential for API data** |
| **Jotai** | Atomic state | Small | Low | Choose for granular updates |
| **Redux Toolkit** | Complex state, time-travel | Medium | Medium | Choose for complex apps |
| **XState** | Complex workflows | Large | High | Choose for state machines |

### Testing Stack

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "vitest": "^1.0.0",
    "playwright": "^1.40.0",
    "msw": "^2.0.0"
  }
}
```

## Architecture Decision Records (ADRs)

**Based on [create-architecture-documentation command](https://github.com/claude-code-subagents-collection):**

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

## Progressive Disclosure

This SKILL.md provides architectural guidance for frontend system design.

**For implementation-level patterns:**
- Use `/rd2:frontend-design` for component architecture, state management, data fetching
- Use `/rd2:ui-ux-design` for accessibility, design tokens, visual design

**For comprehensive architecture analysis:**
- Use `/rd2:tasks-plan --architect` to invoke super-architect for detailed system design with ADRs and migration strategies

**For backend patterns:**
- Use `/rd2:backend-architect` for APIs, databases, distributed systems

**For cloud patterns:**
- Use `/rd2:cloud-architect` for provider selection, infrastructure design

## Sources

### Web Research Integration
- [Frontend Architecture Patterns You Need to Know in 2025](https://medium.com/@anosike.fortune/frontend-architecture-patterns-you-need-to-know-in-2025-518fcaaea1d4)
- [Microfrontends vs Monorepos: A Comprehensive Guide (July 2025)](https://www.designsystemscollective.com/microfrontends-vs-monorepos-a-comprehensive-guide-to-scaling-frontend-architecture-a796a998fb09)
- [Micro Front Ends with Monorepo and Module Federation](https://rebecca-goh.medium.com/micro-frontends-micro-fe-with-monorepo-and-module-federation-4ab38cf081de)
- [Mastering Micro Frontends: 9 Patterns](https://blog.bitsrc.io/mastering-microfrontends-9-patterns-every-developer-should-know-397081673770)
- [Next.js 16 Middleware & Edge Functions: Latest Patterns in 2025](https://medium.com/@mernstackdevbykevin/next-js-16-middleware-edge-functions-latest-patterns-in-2025-8ab2653bc9de)
- [Next.js 16 Architecture Blueprint for Large-Scale Applications](https://medium.com/@sureshdotariya/next-js-16-architecture-blueprint-for-large-scale-applications-build-scalable-saas-multi-tenant-ab0efe9f2dad)
- [Frontend System Design: A Complete Guide](https://dev.to/parth_g/frontend-system-design-a-complete-guide-to-building-scalable-client-side-architectures-1f2c)
- [Frontend at Scale](https://frontendatscale.com/)
- [2025 Frontend Design Patterns: Diagrams Over Drama](https://medium.com/front-end-world/2025-frontend-design-patterns-diagrams-over-drama-df0bc8537937)
- [System Design for Large Scale Frontend Applications](https://namastedev.com/blog/system-design-for-large-scale-frontend/)
- [Module Federation in Next.js: Micro-Frontends That Actually Work](https://medium.com/better-dev-nextjs-react/module-federation-in-next-js-micro-frontends-that-actually-work-2de0ef541839)
- [How to build micro-frontends using multi-zones and Next.js](https://nextjs.org/docs/app/guides/multi-zones)
- [Micro Frontends in 2025 & Design Systems: The Ultimate Guide](https://www.designsystemscollective.com/micro-frontends-in-2025-design-systems-the-ultimate-guide-d87aa1444a20)

## Quick Reference

### Rendering Strategy Quick Decision

| Requirement | Recommended Strategy |
|-------------|---------------------|
| SEO-critical + dynamic | SSR |
| SEO-critical + cacheable | ISR |
| No SEO + highly interactive | SPA |
| Static content | SSG |
| Complex page + slow components | SSR + Streaming |
| Geo-specific + personalization | Edge SSR |

### Microfrontends Signal

**Consider microfrontends when:**
- 10+ frontend teams
- Different technology stacks required
- Independent deployment cycles needed
- Teams have different release cadences

**Avoid microfrontends when:**
- Small team (<10 developers)
- Single technology stack preferred
- Shared state is complex
- Simple deployment is valued

### Performance Targets

| Metric | Target | Tool |
|--------|--------|------|
| LCP | <2.5s | Lighthouse |
| FID | <100ms | Lighthouse |
| CLS | <0.1 | Lighthouse |
| TTFB | <600ms | WebPageTest |
| Bundle size | <244KB | webpack-bundle-analyzer |

### Monitoring Stack

```json
{
  "metrics": "Datadog / New Relic / Prometheus",
  "logs": "ELK Stack / CloudWatch / Loki",
  "traces": "Jaeger / Tempo / Datadog APM",
  "errors": "Sentry / Bugsnag / Rollbar",
  "rum": "Google Analytics / Posthog / Plausible"
}
```
