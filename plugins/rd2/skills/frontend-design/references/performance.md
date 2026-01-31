# Performance

Core Web Vitals optimization and performance best practices (2024-2025).

## Core Web Vitals Targets

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | < 2.5s | < 4s | > 4s |
| **INP** (Interaction to Next Paint) | < 200ms | < 500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | < 0.25 | > 0.25 |

**Note:** INP replaced FID (First Input Delay) as of March 2024.

## Server Components for Performance

Server Components are the biggest performance win in modern React/Next.js.

**Benefits:**
- Zero JavaScript sent to client for Server Components
- Heavy dependencies stay on server
- Direct database access without API layer
- Automatic code splitting

```tsx
// Server Component - no client JS
async function ProductList() {
  const products = await db.product.findMany();
  return (
    <ul>
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </ul>
  );
}
```

## Code Splitting Strategies

### Route-Based Splitting (Automatic)

Next.js automatically code-splits by route. Each page only loads its dependencies.

### Component-Based Splitting

```tsx
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const HeavyChart = lazy(() => import('./components/HeavyChart'));
const DataTable = lazy(() => import('./components/DataTable'));

function Dashboard() {
  return (
    <div>
      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <DataTable />
      </Suspense>
    </div>
  );
}
```

### Dynamic Imports with Next.js

```tsx
import dynamic from 'next/dynamic';

// Load component only on client
const Map = dynamic(() => import('./Map'), {
  loading: () => <MapSkeleton />,
  ssr: false, // Disable SSR for this component
});

// Load only when needed
const Modal = dynamic(() => import('./Modal'));
```

## Image Optimization

### Next.js Image Component

```tsx
import Image from 'next/image';

// Basic usage
<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1920}
  height={1080}
/>

// Above-the-fold images
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1920}
  height={1080}
  priority // Preload this image
/>

// Blur placeholder
<Image
  src="/product.jpg"
  alt="Product"
  width={400}
  height={300}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..." // Or auto-generated
/>

// Fill container
<div className="relative w-full h-64">
  <Image
    src="/background.jpg"
    alt="Background"
    fill
    style={{ objectFit: 'cover' }}
  />
</div>
```

### Image Best Practices

| Practice | Impact | Implementation |
|----------|--------|----------------|
| Use WebP/AVIF | 25-50% smaller | `next/image` auto-converts |
| Lazy load | Faster initial load | Default for `next/image` |
| Responsive images | Right size for device | Use `sizes` prop |
| Priority above-fold | Better LCP | Add `priority` prop |
| Blur placeholder | Better perceived perf | Add `placeholder="blur"` |

## Bundle Optimization

### Analyze Bundle Size

```bash
# Install analyzer
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // next config
});

# Run analysis
ANALYZE=true npm run build
```

### Tree Shaking

Import only what you need:

```tsx
// Bad - imports entire library
import _ from 'lodash';

// Good - imports only used function
import debounce from 'lodash/debounce';

// Or use modular alternatives
import { debounce } from 'lodash-es';
```

### Package Alternatives

| Heavy Package | Lighter Alternative | Size Reduction |
|---------------|---------------------|----------------|
| moment.js | date-fns, dayjs | 70-90% |
| lodash | lodash-es (tree-shake) | 50-80% |
| axios | fetch API | 100% (native) |
| uuid | crypto.randomUUID() | 100% (native) |

## Rendering Optimization

### Prevent Unnecessary Re-renders

```tsx
import { memo, useMemo, useCallback } from 'react';

// Memoize component
const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  // Only re-renders if data changes
  return <div>{data}</div>;
});

// Memoize expensive calculations
function Dashboard({ items }) {
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.value, 0);
  }, [items]);

  return <div>Total: {total}</div>;
}

// Memoize callbacks
function Parent() {
  const handleClick = useCallback((id: string) => {
    // Handle click
  }, []);

  return <Child onClick={handleClick} />;
}
```

### Virtual Lists for Large Data

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
            }}
          >
            {items[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Loading Performance

### Streaming with Suspense

```tsx
import { Suspense } from 'react';

async function SlowComponent() {
  const data = await slowFetch(); // 3 seconds
  return <div>{data}</div>;
}

export default function Page() {
  return (
    <div>
      <h1>Fast content</h1>
      <Suspense fallback={<Skeleton />}>
        <SlowComponent />
      </Suspense>
    </div>
  );
}
```

### Parallel Data Fetching

```tsx
// Sequential (slow)
async function Page() {
  const user = await getUser();
  const posts = await getPosts(); // Waits for user
  return <div>...</div>;
}

// Parallel (fast)
async function Page() {
  const [user, posts] = await Promise.all([
    getUser(),
    getPosts(),
  ]);
  return <div>...</div>;
}
```

## Caching Strategies

### Static Generation (Best Performance)

```tsx
// Automatically static
export default function About() {
  return <div>About Us</div>;
}

// Static with data
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map(post => ({ slug: post.slug }));
}
```

### Incremental Static Regeneration

```tsx
// Revalidate every hour
export const revalidate = 3600;

async function Page() {
  const data = await getData();
  return <div>{data}</div>;
}
```

## Performance Checklist

### Initial Load
- [ ] Server Components by default
- [ ] Code split by route (automatic in Next.js)
- [ ] Lazy load below-fold components
- [ ] Priority load above-fold images
- [ ] Use `next/font` for fonts

### Runtime
- [ ] Memoize expensive calculations
- [ ] Use React.memo for pure components
- [ ] Virtual lists for large datasets
- [ ] Debounce/throttle event handlers

### Assets
- [ ] Use next/image for automatic optimization
- [ ] Enable WebP/AVIF formats
- [ ] Set proper cache headers
- [ ] Use CDN for static assets

### Monitoring
- [ ] Set up Core Web Vitals monitoring
- [ ] Use Lighthouse CI in build pipeline
- [ ] Monitor real user metrics (RUM)
- [ ] Regular bundle size audits

## Sources

- [React & Next.js in 2025 - Modern Best Practices (Strapi, 2025)](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices)
- [Next.js 16: An Engineer's Perspective (Medium, 2025)](https://medium.com/@narayanansundar02/next-js-16-a-engineers-perspective-on-the-future-of-frontend-architecture-5de0ac17f6fb)
- [web.dev Core Web Vitals](https://web.dev/vitals/)
