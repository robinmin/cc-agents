---
name: application-architecture
description: "Extracted section: Application Architecture — monolith vs microfrontends, monorepo patterns"
see_also:
  - rd3:frontend-architect
---

# Application Architecture

## Monolith vs Microfrontends

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

### Proxy and Edge Routing Strategy

**Good use cases:**
- Geo-specific content (A/B testing, localization)
- Personalization without revalidation
- Rate limiting and auth checks
- Dynamic routing based on user attributes
- API proxying with low latency

```typescript
// proxy.ts (Edge Runtime)
import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  const country = request.headers.get('x-country') ?? 'US'

  // A/B test routing
  if (url.pathname.startsWith('/landing') && Math.random() < 0.5) {
    url.pathname = `/new-design${url.pathname}`
  }

  // Geographic routing
  if (country !== 'US') {
    url.pathname = `/intl${url.pathname}`
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
