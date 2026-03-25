---
name: routing
description: "Next.js App Router patterns: dynamic routes, parallel routes, intercepting routes, middleware, and route groups."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
tags: [frontend, nextjs, routing, middleware, url-management]
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

# Routing Patterns

Comprehensive guide to Next.js App Router routing patterns.

## Route Structure

```
app/
├── (marketing)/           # Route group - shared layout
│   ├── page.tsx          # /
│   ├── about/page.tsx    # /about
│   └── pricing/page.tsx  # /pricing
├── (app)/                # App routes with auth
│   ├── layout.tsx        # Auth layout
│   ├── dashboard/
│   │   └── page.tsx     # /dashboard
│   └── settings/
│       └── page.tsx      # /settings
├── api/                  # API routes
│   └── users/
│       └── route.ts     # /api/users
└── layout.tsx           # Root layout
```

## Dynamic Routes

```typescript
// app/products/[category]/[productId]/page.tsx
interface ProductPageProps {
  params: {
    category: string
    productId: string
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProduct(params.category, params.productId)

  return (
    <div>
      <h1>{product.name}</h1>
      <p>Category: {params.category}</p>
    </div>
  )
}

// Generate static params for SSG
export async function generateStaticParams() {
  const products = await getAllProducts()

  return products.map((product) => ({
    category: product.category,
    productId: product.id,
  }))
}

// Catch-all routes
// app/docs/[...slug]/page.tsx
export default async function DocPage({
  params,
}: {
  params: { slug: string[] }
}) {
  const path = params.slug.join('/')
  const doc = await getDoc(path)

  return <DocContent doc={doc} />
}
```

## Parallel Routes

```typescript
// Parallel routes - render multiple slots simultaneously
// app/@analytics/(.)dashboard/page.tsx
// app/@realtime/(.)dashboard/page.tsx
// app/dashboard/page.tsx

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Named slots */}
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsPanel />
      </Suspense>

      <Suspense fallback={<RealtimeSkeleton />}>
        <RealtimePanel />
      </Suspense>
    </div>
  )
}

// @analytics/page.tsx
// @realtime/page.tsx
// These are parallel route slots that render alongside the main content
```

## Intercepting Routes

```typescript
// Intercepting routes for modal behavior
// app/(.)photo/[id]/page.tsx  ← intercepts
// app/photo/[id]/page.tsx     ← renders on direct navigation

// When clicking a photo link in the feed, the modal version shows
// When navigating directly, the full page shows

// feed/page.tsx
export default function Feed() {
  const router = useRouter()

  return (
    <div>
      {photos.map(photo => (
        <Link
          key={photo.id}
          href={`/photo/${photo.id}`}
          onClick={(e) => {
            // Intercept and show modal instead of navigation
            e.preventDefault()
            router.push(`/photo/${photo.id}`, { modal: true })
          }}
        >
          <Photo img={photo} />
        </Link>
      ))}
    </div>
  )
}
```

## Route Groups

```typescript
// app/(marketing)/layout.tsx
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="marketing-layout">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  )
}

// app/(marketing)/page.tsx     → /
export default function HomePage() {
  return <MarketingHome />
}

// app/(marketing)/about/page.tsx  → /about

// app/(app)/layout.tsx
export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="app-layout">
      <AppSidebar />
      <AppHeader />
      {children}
    </div>
  )
}

// app/(app)/dashboard/page.tsx  → /dashboard
```

## Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Handle auth
  const token = request.cookies.get('auth-token')
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard')

  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect logged-in users away from auth pages
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
}
```

## Programmatic Navigation

```typescript
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

function NavigationExample() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Navigate to a new route
  function handleClick() {
    router.push('/dashboard')
  }

  // Navigate with options
  function navigateWithOptions() {
    router.push('/dashboard?tab=overview', {
      scroll: false,  // Don't scroll to top
    })
  }

  // Replace current route (no history entry)
  function replaceRoute() {
    router.replace('/new-route')
  }

  // Refresh data (re-run loaders)
  function refreshData() {
    router.refresh()
  }

  // Prefetch routes
  function prefetchRoutes() {
    router.prefetch('/dashboard')
    router.prefetch('/settings')
  }

  // Update search params
  function updateSearchParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)

    router.push(`${pathname}?${params.toString()}`)
  }

  return (/* component JSX */)
}
```

## Route Handlers

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'

// GET handler
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = searchParams.get('page') || '1'
  const limit = searchParams.get('limit') || '10'

  const users = await db.users.findMany({
    skip: (parseInt(page) - 1) * parseInt(limit),
    take: parseInt(limit),
  })

  const total = await db.users.count()

  return NextResponse.json({
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  })
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const user = await db.users.create(body)

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 400 }
    )
  }
}

// Dynamic route handler
// app/api/users/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await db.users.findUnique({
    where: { id: params.id },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  const user = await db.users.update({
    where: { id: params.id },
    data: body,
  })

  return NextResponse.json(user)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await db.users.delete({
    where: { id: params.id },
  })

  return new NextResponse(null, { status: 204 })
}
```
