---
name: data-fetching
description: "Data fetching patterns: Server Components, React Query, SWR, caching strategies, real-time updates, and optimistic mutations."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
tags: [frontend, data-fetching, react-query, server-components, caching, real-time]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:frontend-design
  - rd3:frontend-architect
  - rd3:pl-typescript
---

# Data Fetching Patterns

Comprehensive guide to data fetching in modern React and Next.js applications.

## Data Fetching Strategies

| Strategy | Use Case | Implementation |
|----------|----------|----------------|
| **Server Components** | Initial page load, SEO-critical data | async/await in page.tsx |
| **React Query** | Client-side data, real-time updates | useQuery hook |
| **SWR** | Simple client-side caching | useSWR hook |
| **Server Actions** | Mutations, form submissions | 'use server' actions |
| **Route Handlers** | API endpoints | route.ts |

## Server Component Data Fetching

```typescript
// app/users/page.tsx (Server Component)
export default async function UsersPage() {
  // Parallel data fetching
  const [users, permissions, departments] = await Promise.all([
    fetchUsers(),
    fetchPermissions(),
    fetchDepartments()
  ])

  return (
    <UsersLayout
      users={users}
      permissions={permissions}
      departments={departments}
    />
  )
}

// With caching
async function fetchUsers() {
  const res = await fetch('https://api.example.com/users', {
    // Next.js caching options
    next: {
      revalidate: 3600,  // Revalidate every hour (ISR)
      // Or: { tags: ['users'] } for tag-based invalidation
    }
  })

  if (!res.ok) {
    throw new Error('Failed to fetch users')
  }

  return res.json()
}

// Route segments caching
export const revalidate = 3600  // Revalidate entire route segment
export const dynamic = 'force-dynamic'  // Always fetch fresh (no caching)
```

### Suspense for Streaming

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      <Suspense fallback={<StatsSkeleton />}>
        <Stats />  {/* Loads first */}
      </Suspense>

      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivity />  {/* Loads second */}
      </Suspense>

      <Suspense fallback={<NotificationsSkeleton />}>
        <Notifications />  {/* Loads third */}
      </Suspense>
    </div>
  )
}

// Stats component with its own data fetching
async function Stats() {
  const stats = await fetchStats()
  return (
    <div className="stats">
      <StatCard label="Revenue" value={stats.revenue} />
      <StatCard label="Users" value={stats.users} />
    </div>
  )
}
```

## React Query

### Basic Setup

```typescript
// app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,  // 1 minute
            gcTime: 10 * 60 * 1000,  // 10 minutes (formerly cacheTime)
            retry: 3,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### Query Patterns

```typescript
// Basic query
function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })
}

// With parameters
function useUser(userId: string | null) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
    enabled: !!userId,  // Won't run if userId is null
  })
}

// With loading state
function useUserProfile(userId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
  })

  if (isLoading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />
  return <Profile user={data} />
}
```

### Mutation Patterns

```typescript
// Create mutation
function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (newUser: CreateUserDto) =>
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      }).then(r => r.json()),

    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created!')
    },

    onError: (error) => {
      toast.error(`Failed: ${error.message}`)
    }
  })
}

// Update mutation with optimistic update
function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      fetch(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then(r => r.json()),

    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user', id] })

      // Snapshot previous value
      const previous = queryClient.getQueryData(['user', id])

      // Optimistically update
      queryClient.setQueryData(['user', id], (old: User) => ({
        ...old,
        ...data
      }))

      return { previous }
    },

    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['user', variables.id], context?.previous)
    },

    onSettled: ({ id }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['user', id] })
    }
  })
}
```

### Infinite Queries

```typescript
// Infinite scroll
function useInfinitePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/posts?cursor=${pageParam}&limit=10`)
      return res.json()
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}

// Component with infinite scroll
function PostList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePosts()

  return (
    <div>
      {data?.pages.map(page =>
        page.posts.map(post => <PostItem key={post.id} post={post} />)
      )}

      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? 'Loading...' : 'Load More'}
      </button>
    </div>
  )
}
```

## SWR (Alternative to React Query)

```typescript
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function UserProfile({ userId }: { userId: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/users/${userId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,  // Dedupe requests for 1 minute
    }
  )

  if (isLoading) return <Skeleton />
  if (error) return <ErrorMessage />

  return (
    <div>
      <h1>{data.name}</h1>
      <button onClick={() => mutate()}>Revalidate</button>
    </div>
  )
}

// Optimistic update with mutate
async function updateUser(id: string, data: UpdateUserDto) {
  // Optimistically update cache
  mutate(
    `/api/users/${id}`,
    (current: User) => ({ ...current, ...data }),
    false  // Don't revalidate yet
  )

  try {
    await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    // Revalidate to ensure consistency
    mutate(`/api/users/${id}`)
  } catch {
    // Rollback on error
    mutate(`/api/users/${id}`)
  }
}
```

## Caching Strategies

```typescript
// Next.js fetch caching options
const res = await fetch('https://api.example.com/data', {
  // Static - cached indefinitely
  cache: 'force-cache',

  // Dynamic - no caching
  cache: 'no-store',

  // ISR - revalidate after N seconds
  next: { revalidate: 3600 },

  // Tag-based revalidation
  next: { tags: ['products', 'inventory'] },
})

// Revalidate by tag
import { revalidateTag } from 'next/cache'
revalidateTag('products')

// Revalidate by path
import { revalidatePath } from 'next/cache'
revalidatePath('/products')
revalidatePath('/products/[category]', 'page')
```

## Real-time Updates

### Polling

```typescript
// React Query with refetchInterval
function useStockPrice(symbol: string) {
  return useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => fetch(`/api/stock/${symbol}`).then(r => r.json()),
    refetchInterval: 5000,  // Poll every 5 seconds
    refetchIntervalInBackground: false,  // Stop when tab not visible
  })
}
```

### Server-Sent Events (SSE)

```typescript
// app/api/stream/route.ts
export async function GET() {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial data
      const data = await fetchLatestData()
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      // Set up interval
      const interval = setInterval(async () => {
        const newData = await fetchLatestData()
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(newData)}\n\n`))
      }, 5000)

      // Clean up on close
      return () => clearInterval(interval)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// Client component
'use client'

function useEventSource<T>(url: string, onMessage: (data: T) => void) {
  useEffect(() => {
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      onMessage(data)
    }

    eventSource.onerror = () => {
      console.error('SSE connection error')
      eventSource.close()
    }

    return () => eventSource.close()
  }, [url, onMessage])
}
```

### WebSocket

```typescript
// Custom hook for WebSocket
function useWebSocket<T>(url: string) {
  const [messages, setMessages] = useState<T[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const ws = new WebSocket(url)

    ws.onopen = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setMessages(prev => [...prev, data])
    }

    return () => ws.close()
  }, [url])

  const send = (data: unknown) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  return { messages, isConnected, send }
}
```

## Error Handling

```typescript
// Error boundaries for data fetching
class DataErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-state">
          <h2>Failed to load data</h2>
          <p>{this.state.error.message}</p>
          <button onClick={() => this.props.onRetry()}>
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Error handling in React Query
function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error.status >= 400 && error.status < 500) {
        return false
      }
      return failureCount < 3
    },
    throwOnError: false,  // Don't throw, return error in result
  })
}

// Component with error handling
function UsersPage() {
  const { data, isLoading, error, refetch } = useUsers()

  if (isLoading) return <Skeleton />

  if (error) {
    return (
      <div>
        <p>Error: {error.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    )
  }

  return <UserList users={data} />
}
```
