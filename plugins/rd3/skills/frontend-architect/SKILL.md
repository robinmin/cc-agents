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
  openclaw:
    emoji: "🛠️"
see_also:
  - rd3:frontend-design
  - rd3:ui-ux-design
  - rd3:backend-architect
---

# rd3:frontend-architect — Frontend Architecture Patterns

Frontend system architecture and scalability patterns for building large-scale, maintainable frontend applications using 2025-2026 best practices.

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
- Technology diversity (React, Vue, Angular)
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

**1. Module Federation (Recommended for 2026)**

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

**Recommendation for 2026:**
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
- In Next.js 15+, use `proxy.ts` for request-time routing logic
- Keep routing decisions fast and avoid slow backend work in proxy
- Prefer config-based `redirects`/`rewrites` when the routing is static

**Good use cases:**
- Geo-specific content (A/B testing, localization)
- Personalization without revalidation
- Rate limiting and auth checks
- Dynamic routing based on user attributes
- API proxying with low latency

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

## Additional Resources {#additional-resources}

See [Additional Resources](references/external-resources.md) for detailed content.

See [Observability and Monitoring](references/observability-and-monitoring.md) for detailed content.

See [Build and Deployment Architecture](references/build-and-deployment-architecture.md) for detailed content.

See [Frontend Security Architecture](references/frontend-security-architecture.md) for detailed content.

See [Application Architecture](references/application-architecture.md) for detailed content.

See [Rendering Strategy Decision Matrix](references/rendering-strategy-decision-matrix.md) for detailed content.

See [Quick Reference](references/quick-reference.md) for detailed content.

See [Technology Selection](references/technology-selection.md) for detailed content.

## Platform Notes

### Claude Code

- Use `!command` for live command execution (e.g., `!npm run build`)
- Use `$ARGUMENTS` or `$1`, `$2` for parameter references in agent prompts
- Use `context: fork` for parallel task execution
- Hooks can be registered in `.claude/hooks.json`

### Next.js Specifics

- Next.js App Router uses Server Components by default
- Use `'use client'` directive for client-side rendering
- `export const dynamic = 'force-dynamic'` for SSR
- `export const revalidate = N` for ISR (N = seconds)
- `export const runtime = 'edge'` for edge runtime
- Module Federation requires webpack configuration
- Next.js Multi-Zones use `rewrites` in `next.config.js`

### General

- All code examples use TypeScript unless explicitly noted as JavaScript
- Framework-agnostic concepts apply across React, Vue, Svelte, and Angular
- Architecture patterns are portable across build tools (Vite, webpack, Turbopack)
