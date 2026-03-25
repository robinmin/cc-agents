---
name: performance
description: "Frontend performance optimization: Core Web Vitals (LCP, INP, CLS), code splitting, lazy loading, image optimization, and bundle analysis."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
tags: [frontend, performance, core-web-vitals, lcp, cls, optimization, bundle-size]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:frontend-design
  - rd3:frontend-architect
  - rd3:sys-testing
---

# Performance Optimization

Comprehensive guide to frontend performance optimization focusing on Core Web Vitals and bundle optimization.

## Core Web Vitals

### LCP (Largest Contentful Paint)

**Target: < 2.5 seconds**

```typescript
// Optimize LCP with priority loading
// app/page.tsx

// Preload critical resources
import { PreloadResources } from './components/PreloadResources'

export default function Page() {
  return (
    <>
      <PreloadResources />
      <main>
        {/* Hero image with priority */}
        <Image
          src="/hero.jpg"
          alt="Hero"
          width={1200}
          height={600}
          priority  // Load with high priority
        />
        <h1>Welcome</h1>
      </main>
    </>
  )
}

// Use fetchpriority for non-Next.js images
<img
  src="/hero.jpg"
  fetchpriority="high"
  loading="eager"
/>
```

### INP (Interaction to Next Paint)

**Target: < 200ms**

```typescript
// Optimize INP with deferred updates
'use client'

import { useDeferredValue, useState } from 'react'

function SearchInput() {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)  // Deferred value for search

  // Use deferredQuery for heavy search operation
  // while query is shown immediately
  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <SearchResults query={deferredQuery} />
    </div>
  )
}

// Heavy callback optimization
import { useMemo, useCallback } from 'react'

function Component({ items, onItemClick }: Props) {
  // Memoize expensive computation
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  // Memoize callback
  const handleClick = useCallback((id: string) => {
    onItemClick(id)
  }, [onItemClick])

  return (
    <ul>
      {sortedItems.map(item => (
        <li key={item.id} onClick={() => handleClick(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  )
}
```

### CLS (Cumulative Layout Shift)

**Target: < 0.1**

```typescript
// Always set dimensions on images
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}   // Always specify
  height={600}    // Always specify
/>

// For responsive images
<div style={{ aspectRatio: '16/9' }}>
  <Image
    src="/hero.jpg"
    alt="Hero"
    fill  // Fills parent container
    style={{ objectFit: 'cover' }}
  />
</div>

// Reserve space for dynamic content
// Before loading
<div style={{ minHeight: '200px' }}>
  <Suspense fallback={<Skeleton height={200} />}>
    <Comments />
  </Suspense>
</div>

// Font optimization
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',  // Prevent FOIT (Flash of Invisible Text)
  preload: true,
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

## Code Splitting

### Route-Based Splitting

```typescript
// Next.js App Router automatically code-splits by route
// No additional setup needed

// Manual dynamic imports for heavy components
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(
  () => import('./components/HeavyChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,  // Don't render on server
  }
)

const MarkdownEditor = dynamic(
  () => import('./components/MarkdownEditor'),
  {
    loading: () => <EditorSkeleton />,
  }
)

// Multiple components in one chunk
const EditorWithPreview = dynamic(() => ({
  default: () => import('./components/Editor'),
  preview: () => import('./components/Preview'),
}), {
  loading: () => <EditorSkeleton />
})
```

### Component-Based Splitting

```typescript
// Split by feature
const DashboardFeature = dynamic(() =>
  import('./features/dashboard').then(mod => mod.Dashboard)
)

const SettingsFeature = dynamic(() =>
  import('./features/settings').then(mod => mod.Settings)
)

// Admin panel loaded separately
const AdminPanel = dynamic(
  () => import('./features/admin'),
  {
    loading: () => <AdminSkeleton />,
    // Only load on admin routes
    ssr: false
  }
)
```

## Image Optimization

```typescript
// Next.js Image component
import Image from 'next/image'

// Responsive images
export function ResponsiveImage({ src, alt }: Props) {
  return (
    <div style={{ position: 'relative', width: '100%', height: 'auto' }}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        style={{ objectFit: 'cover' }}
      />
    </div>
  )
}

// Avatar with placeholder
export function Avatar({ src, name }: Props) {
  return (
    <Image
      src={src || '/default-avatar.png'}
      alt={name}
      width={40}
      height={40}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..." // Base64 placeholder
    />
  )
}

// Next.js image configuration
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.example.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],  // Prefer AVIF
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}
```

## Bundle Analysis

```typescript
// next.config.js with bundle analysis
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // Your config
})

// Analyze script
// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build"
  }
}

// Component-level bundle tracking
// Use dynamic imports to split large dependencies
const ChartLibrary = dynamic(
  () => import('chart.js'),  // Only loads when needed
  { ssr: false }
)

// Identify large dependencies
// 1. Run analyze
// 2. Check for:
// - Moment.js (use date-fns or dayjs)
// - Lodash (use lodash-es with tree shaking)
// - Icons library (use individual imports)
```

## Caching Strategies

```typescript
// Static asset caching
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

// API response caching
// app/api/data/route.ts
export async function GET(request: NextRequest) {
  const data = await fetchData()

  // Cache for 5 minutes, shared across users
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}

// Client-side cache control
fetch('/api/data', {
  headers: {
    'Cache-Control': 'no-cache',  // Skip browser cache
  }
})
```

## Performance Monitoring

```typescript
// Web Vitals tracking
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals'

function sendToAnalytics(metric: Metric) {
  fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function reportWebVitals() {
  onCLS(sendToAnalytics)
  onFID(sendToAnalytics)
  onFCP(sendToAnalytics)
  onLCP(sendToAnalytics)
  onTTFB(sendToAnalytics)
}

// app/layout.tsx
import { reportWebVitals } from './lib/analytics'

export function reportWebVitals() {
  onCLS(console.log)
  onFID(console.log)
  onLCP(console.log)
}

// In your page
export function Page() {
  return (
    <html>
      <body>
        <Main />
        <Scripts />
      </body>
    </html>
  )
}
```

## Performance Checklist

### Loading Performance
- [ ] Server Components for initial render
- [ ] Suspense boundaries with skeletons
- [ ] Priority images (LCP images)
- [ ] Preload critical resources
- [ ] Font display: swap

### Interactivity Performance
- [ ] useDeferredValue for expensive updates
- [ ] useMemo for expensive computations
- [ ] useCallback for stable callbacks
- [ ] Debounce/throttle frequent events

### Stability Performance (CLS)
- [ ] All images have explicit dimensions
- [ ] Font fallbacks match final font
- [ ] Dynamic content has reserved space
- [ ] Ads/embeds have reserved slots

### Bundle Performance
- [ ] Dynamic imports for heavy components
- [ ] Tree-shaking enabled
- [ ] No large unused dependencies
- [ ] Route-based splitting
