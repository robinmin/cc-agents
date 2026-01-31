# Data Fetching

Data fetching strategies and patterns for React and Next.js (2024-2025).

## Fetching Strategies Overview

### Server Components (Recommended)

Server Components can fetch data directly using async/await with automatic caching.

```tsx
// Server Component with data fetching
async function DashboardPage() {
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 }, // Cache for 1 hour
  }).then(r => r.json());

  return <Dashboard data={data} />;
}
```

**Benefits:**
- No loading states needed on initial render
- Data is fetched on server, reducing client bundle
- Automatic caching with Next.js fetch
- Secure access to databases and APIs

### Client Components

For interactive data that needs to respond to user actions.

**Simple fetching:**
```tsx
"use client";
import { useState, useEffect } from 'react';

function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  return <UserTable users={users} />;
}
```

**With React Query (recommended for complex cases):**
```tsx
"use client";
import { useQuery } from '@tanstack/react-query';

function UserList() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <UserTable users={users} />;
}
```

## Next.js Caching Strategies

### Static Data (Long Cache)

Data that rarely changes. Cached indefinitely until manually revalidated.

```tsx
// Cached for 1 hour, then revalidated
const data = await fetch('https://api.example.com/products', {
  next: { revalidate: 3600 },
});
```

### Dynamic Data (No Cache)

Data that changes frequently or is user-specific.

```tsx
// Always fetch fresh data
const data = await fetch('https://api.example.com/user/me', {
  cache: 'no-store',
});
```

### On-Demand Revalidation

Invalidate cache when data is updated.

```tsx
// In a Server Action
"use server";
import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateProduct(id: string, data: ProductData) {
  await db.product.update({ where: { id }, data });

  // Revalidate by path
  revalidatePath('/products');

  // Or revalidate by tag
  revalidateTag('products');
}

// Tagged fetch
const products = await fetch('https://api.example.com/products', {
  next: { tags: ['products'] },
});
```

### ISR (Incremental Static Regeneration)

Regenerate static pages on demand.

```tsx
// page.tsx
export const revalidate = 3600; // Revalidate every hour

async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  return <ProductDetails product={product} />;
}
```

## Real-Time Data Patterns

### Polling

Simple approach for near-real-time updates.

```tsx
// With React Query
const { data } = useQuery({
  queryKey: ['notifications'],
  queryFn: fetchNotifications,
  refetchInterval: 30000, // Poll every 30 seconds
});

// Or manual polling
useEffect(() => {
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval);
}, []);
```

### Server-Sent Events (SSE)

One-way server-to-client streaming.

```tsx
// Client component
"use client";

function LiveFeed() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (e) => {
      const event = JSON.parse(e.data);
      setEvents(prev => [...prev, event]);
    };

    return () => eventSource.close();
  }, []);

  return <EventList events={events} />;
}

// API route (route.ts)
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send event every second
      const interval = setInterval(() => {
        const data = `data: ${JSON.stringify({ time: Date.now() })}\n\n`;
        controller.enqueue(encoder.encode(data));
      }, 1000);

      // Clean up on close
      return () => clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### WebSockets

Bidirectional real-time communication.

```tsx
"use client";
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function Chat() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => { newSocket.close(); };
  }, []);

  const sendMessage = (text: string) => {
    socket?.emit('message', { text });
  };

  return <ChatUI messages={messages} onSend={sendMessage} />;
}
```

## Fetching Strategy Decision Matrix

| Scenario | Strategy | Tool |
|----------|----------|------|
| Initial page data | Server Component | async/await + fetch |
| User-triggered data | Client Component | React Query |
| Cached API data | Server Component | fetch + revalidate |
| Real-time updates | Client Component | WebSocket / SSE |
| Form submission | Server Action | revalidatePath |
| Complex caching | Client Component | React Query |
| Authentication | Server Component | cookies() + fetch |

## Error Handling Patterns

### Server Component Error Boundary

```tsx
// app/dashboard/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### Client Component Error Handling

```tsx
const { data, error, isError, refetch } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

if (isError) {
  return (
    <ErrorMessage
      message={error.message}
      onRetry={() => refetch()}
    />
  );
}
```

## Loading State Patterns

### Suspense with Server Components

```tsx
// page.tsx
import { Suspense } from 'react';

export default function Dashboard() {
  return (
    <div>
      <Suspense fallback={<UserSkeleton />}>
        <UserProfile />
      </Suspense>
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>
    </div>
  );
}
```

### Loading UI File

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />;
}
```

## Sources

- [Mastering Next.js and React Features for 2025 (Dev.to, 2024)](https://dev.to/golsaesk/mastering-the-most-useful-nextjs-and-react-features-for-2025-4g60)
- [React & Next.js in 2025 - Modern Best Practices (Strapi, 2025)](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices)
