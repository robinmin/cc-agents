# Routing

Next.js App Router patterns and best practices (2024-2025).

## File-Based Routing (App Router)

The App Router uses a file-system based router where folders define routes.

### Basic Structure

```
app/
├── page.tsx                 # / (home)
├── about/
│   └── page.tsx             # /about
├── blog/
│   ├── page.tsx             # /blog
│   └── [slug]/
│       └── page.tsx         # /blog/[slug]
├── products/
│   ├── page.tsx             # /products
│   └── [...slug]/
│       └── page.tsx         # /products/a/b/c (catch-all)
└── layout.tsx               # Root layout
```

### Route Groups

Organize routes without affecting URL structure using `(folder)` syntax:

```
app/
├── (marketing)/             # Route group (no URL prefix)
│   ├── about/
│   │   └── page.tsx         # /about
│   ├── pricing/
│   │   └── page.tsx         # /pricing
│   └── layout.tsx           # Marketing layout
├── (dashboard)/             # Route group with shared layout
│   ├── layout.tsx           # Dashboard layout
│   ├── page.tsx             # / (if no root page.tsx)
│   ├── settings/
│   │   └── page.tsx         # /settings
│   └── profile/
│       └── page.tsx         # /profile
└── layout.tsx               # Root layout
```

### Dynamic Routes

```tsx
// app/blog/[slug]/page.tsx
interface Props {
  params: { slug: string };
}

export default function BlogPost({ params }: Props) {
  return <Article slug={params.slug} />;
}

// Generate static paths
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}
```

### Catch-All Routes

```tsx
// app/docs/[...slug]/page.tsx
interface Props {
  params: { slug: string[] };
}

export default function DocsPage({ params }: Props) {
  // /docs/a/b/c -> params.slug = ['a', 'b', 'c']
  return <Documentation path={params.slug.join('/')} />;
}
```

## Parallel Routes

Load multiple page sections simultaneously using `@folder` syntax.

```
app/
├── @dashboard/
│   └── page.tsx             # Dashboard slot
├── @analytics/
│   └── page.tsx             # Analytics slot
└── layout.tsx               # Renders both slots
```

```tsx
// app/layout.tsx
export default function Layout({
  children,
  dashboard,
  analytics,
}: {
  children: React.ReactNode;
  dashboard: React.ReactNode;
  analytics: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-2">
      <div>{dashboard}</div>
      <div>{analytics}</div>
    </div>
  );
}
```

### Conditional Rendering with Parallel Routes

```tsx
export default function Layout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
```

## Intercepting Routes

Show content in a modal while preserving URL context using `(.)` syntax.

```
app/
├── feed/
│   └── page.tsx             # /feed (main feed)
├── photo/
│   └── [id]/
│       └── page.tsx         # /photo/[id] (full page)
└── @modal/
    └── (.)photo/            # Intercepts /photo/[id]
        └── [id]/
            └── page.tsx     # Modal version
```

**Interception prefixes:**
- `(.)` - Same level
- `(..)` - One level up
- `(..)(..)` - Two levels up
- `(...)` - Root level

```tsx
// app/@modal/(.)photo/[id]/page.tsx
export default function PhotoModal({ params }: { params: { id: string } }) {
  return (
    <Modal>
      <Photo id={params.id} />
    </Modal>
  );
}
```

## Nested Layouts

Layouts persist across navigation and preserve state.

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}

// Nested routes inherit layout
// /dashboard/settings renders DashboardLayout + SettingsPage
```

### Templates vs Layouts

Templates re-render on navigation (don't preserve state):

```tsx
// app/dashboard/template.tsx
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  // This component re-renders on every navigation
  return <div>{children}</div>;
}
```

## Route Handlers (API Routes)

Create API endpoints using `route.ts` files.

```tsx
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const users = await db.user.findMany();
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const user = await db.user.create({ data: body });
  return NextResponse.json(user, { status: 201 });
}
```

### Dynamic Route Handlers

```tsx
// app/api/users/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await db.user.findUnique({ where: { id: params.id } });
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(user);
}
```

## Middleware

Intercept and modify requests before they reach routes.

```tsx
// middleware.ts (at project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check auth
  const token = request.cookies.get('token');

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Match specific paths
export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

## Navigation

### Link Component

```tsx
import Link from 'next/link';

<Link href="/about">About</Link>
<Link href="/blog/my-post">Blog Post</Link>
<Link href={{ pathname: '/search', query: { q: 'test' } }}>Search</Link>
```

### Programmatic Navigation

```tsx
"use client";
import { useRouter } from 'next/navigation';

function Navigation() {
  const router = useRouter();

  return (
    <button onClick={() => router.push('/dashboard')}>
      Go to Dashboard
    </button>
  );
}
```

### Navigation Methods

```tsx
router.push('/dashboard');      // Navigate forward
router.replace('/dashboard');   // Replace current history entry
router.refresh();               // Refresh current route
router.back();                  // Go back
router.forward();               // Go forward
router.prefetch('/about');      // Prefetch a route
```

## Common Patterns

### Protected Routes

```tsx
// app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return <div>{children}</div>;
}
```

### Not Found Pages

```tsx
// app/not-found.tsx (global)
export default function NotFound() {
  return (
    <div>
      <h2>Not Found</h2>
      <p>Could not find the requested resource</p>
    </div>
  );
}

// Trigger from Server Component
import { notFound } from 'next/navigation';

async function Page({ params }: { params: { id: string } }) {
  const item = await getItem(params.id);
  if (!item) notFound();
  return <Item data={item} />;
}
```

## Sources

- [Mastering Next.js and React Features for 2025 (Dev.to, 2024)](https://dev.to/golsaesk/mastering-the-most-useful-nextjs-and-react-features-for-2025-4g60)
- [Next.js 16: An Engineer's Perspective (Medium, 2025)](https://medium.com/@narayanansundar02/next-js-16-a-engineers-perspective-on-the-future-of-frontend-architecture-5de0ac17f6fb)
