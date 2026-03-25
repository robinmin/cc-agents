---
name: build-and-deployment-architecture
description: "Extracted section: Build and Deployment Architecture — CI/CD, caching, performance budgets"
see_also:
  - rd3:frontend-architect
---

# Build and Deployment Architecture

## CI/CD Pipeline

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

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy:production
```

## Caching Strategy

**Static Asset Caching:**
```typescript
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

**API Caching (Next.js fetch caching):**
```typescript
// next.config.js
export const revalidate = 3600  // 1 hour

async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600 },
  })
  return res.json()
}
```

**Client-side Caching (React Query):**
```typescript
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

## Performance Budgets

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

## Code Splitting Strategy

```typescript
// Route-based splitting (automatic with Next.js App Router)

// Component-based splitting
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
})

// Feature-based splitting
const AdminPanel = dynamic(() =>
  import('./AdminPanel').then(mod => mod.AdminPanel),
  { loading: () => <AdminSkeleton /> }
)
```

## Image Optimization

```typescript
// Next.js Image component
import Image from 'next/image'

export default function ProductImage({ src, alt }: { src: string, alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      priority={false}
      placeholder="blur"
    />
  )
}
```
