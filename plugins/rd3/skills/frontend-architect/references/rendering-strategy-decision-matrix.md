---
name: rendering-strategy-decision-matrix
description: "Extracted section: Rendering Strategy Decision Matrix"
see_also:
  - rd3:frontend-architect
---

# Rendering Strategy Decision Matrix

### Comparison Table

| Strategy | Best For | TTFB | JavaScript | SEO | Dynamic Data | Complexity | 2026 Recommendation |
|----------|----------|------|------------|-----|--------------|------------|---------------------|
| **SPA** | Highly interactive, auth-required apps | Slow | Heavy | Poor | Excellent | Low | Use for dashboards |
| **SSR** | SEO-critical, dynamic content | Fast | Medium | Good | Excellent | Medium | Use for e-commerce |
| **SSG** | Static content, marketing pages | Fastest | Light | Perfect | None | Low | Use for marketing |
| **ISR** | Dynamic but cacheable content | Fast | Medium | Perfect | Good | Medium | Use for blogs/catalogs |
| **SSR + Streaming** | Complex pages with slow components | Medium | Medium | Good | Excellent | High | Use for complex dashboards |
| **Edge SSR** | Geo-specific, personalization | Fastest | Light | Perfect | Good | Medium | **Established 2026** |

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
