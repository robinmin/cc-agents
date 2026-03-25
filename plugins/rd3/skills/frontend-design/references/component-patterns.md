---
name: component-patterns
description: "React component patterns: Server/Client components, presentational vs container, compound components, render props, and component composition."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
tags: [frontend, react, components, server-components, client-components, patterns]
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

# Component Patterns

Comprehensive guide to React component patterns in Next.js App Router.

## Server vs Client Components

### When to Use Server Components

```typescript
// Default in Next.js App Router - no directive needed
// app/users/page.tsx

export default async function UsersPage() {
  // Direct database access (no API needed)
  const users = await db.users.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div>
      <h1>Users</h1>
      <UserList users={users} />
    </div>
  )
}
```

### When to Use Client Components

```typescript
// Add 'use client' directive
'use client'

// app/components/InteractiveCounter.tsx
import { useState } from 'react'

export function InteractiveCounter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Clicked {count} times
    </button>
  )
}
```

### Composition Pattern (Server + Client)

```typescript
// Server Component (parent)
import { InteractiveCounter } from './InteractiveCounter'
import { CounterDisplay } from './CounterDisplay'  // Server component

export default async function Page() {
  // Server-side data fetching
  const analytics = await getAnalytics()

  return (
    <div>
      {/* Client component for interactivity */}
      <InteractiveCounter />

      {/* Server component for static display */}
      <CounterDisplay data={analytics} />
    </div>
  )
}

// Client component
'use client'
import { useState } from 'react'

export function InteractiveCounter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

## Presentational vs Container Components

```typescript
// Presentational Component - focuses on UI
// app/components/UserCard.tsx
interface UserCardProps {
  name: string
  email: string
  avatarUrl?: string
  variant?: 'compact' | 'expanded'
}

export function UserCard({ name, email, avatarUrl, variant = 'compact' }: UserCardProps) {
  return (
    <div className={variant === 'expanded' ? 'p-4 border' : 'p-2'}>
      {avatarUrl && <img src={avatarUrl} alt={name} className="w-12 h-12 rounded-full" />}
      <h3>{name}</h3>
      <p className="text-gray-600">{email}</p>
    </div>
  )
}

// Container Component - focuses on data fetching
// app/containers/UserCardContainer.tsx
async function getUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`)
  return res.json()
}

export function UserCardContainer({ userId }: { userId: string }) {
  // In App Router, container pattern less common
  // Data fetched directly in Server Component instead
}
```

## Compound Components

```typescript
// Compound component pattern
// app/components/Tabs.tsx
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface TabsContextValue {
  activeTab: string
  setActiveTab: (id: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

export function Tabs({ children, defaultTab }: { children: ReactNode; defaultTab: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  )
}

export function TabList({ children }: { children: ReactNode }) {
  return <div role="tablist" className="flex gap-2">{children}</div>
}

export function Tab({ id, children }: { id: string; children: ReactNode }) {
  const { activeTab, setActiveTab } = useContext(TabsContext)!
  const isActive = activeTab === id

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(id)}
      className={isActive ? 'font-bold' : 'text-gray-500'}
    >
      {children}
    </button>
  )
}

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  const { activeTab } = useContext(TabsContext)!
  if (activeTab !== id) return null

  return <div role="tabpanel">{children}</div>
}

// Usage
function MyTabs() {
  return (
    <Tabs defaultTab="overview">
      <TabList>
        <Tab id="overview">Overview</Tab>
        <Tab id="settings">Settings</Tab>
      </TabList>
      <TabPanel id="overview">Overview content</TabPanel>
      <TabPanel id="settings">Settings content</TabPanel>
    </Tabs>
  )
}
```

## Render Props

```typescript
// Render prop pattern for reusable behavior
// app/hooks/useAsyncData.tsx
'use client'

import { useState, useEffect, ReactNode } from 'react'

interface UseAsyncDataOptions<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
}

interface RenderPropChildren {
  (state: UseAsyncDataOptions<T>): ReactNode
}

export function AsyncData<T>({
  promise,
  children,
}: {
  promise: Promise<T>
  children: RenderPropChildren
}) {
  const [state, setState] = useState<UseAsyncDataOptions<T>>({
    data: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    promise
      .then(data => setState({ data, isLoading: false, error: null }))
      .catch(error => setState({ data: null, isLoading: false, error }))
  }, [promise])

  return <>{children(state)}</>
}

// Usage
function UserProfile({ userId }: { userId: string }) {
  return (
    <AsyncData promise={fetchUser(userId)}>
      {({ data, isLoading, error }) => {
        if (isLoading) return <Skeleton />
        if (error) return <ErrorMessage error={error} />
        return <UserCard user={data} />
      }}
    </AsyncData>
  )
}
```

## Custom Hooks

```typescript
// Custom hook for reusable stateful logic
// app/hooks/useLocalStorage.ts
'use client'

import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      return initialValue
    }
  })

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }

  return [storedValue, setValue] as const
}

// app/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
```

## Component Composition

```typescript
// Slot pattern for flexible composition
// app/components/Card.tsx
import { ReactNode } from 'react'

interface CardProps {
  header?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Card({ header, children, footer, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  )
}

// Usage with flexible content
<Card
  header={<h2>User Profile</h2>}
  footer={<Button>Save Changes</Button>}
>
  <UserForm user={user} />
</Card>
```

## Higher-Order Components (HOC)

```typescript
// HOC for conditional rendering
function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithAuthComponent(props: P) {
    const { user, isLoading } = useAuth()

    if (isLoading) return <LoadingSpinner />
    if (!user) return <Navigate to="/login" />

    return <WrappedComponent {...props} user={user} />
  }
}

// Usage
const ProtectedDashboard = withAuth(Dashboard)

// With loader
function withData<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  dataLoader: (props: P) => Promise<unknown>
) {
  return function WithDataComponent(props: P) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      dataLoader(props)
        .then(setData)
        .finally(() => setLoading(false))
    }, [props])

    if (loading) return <Skeleton />
    return <WrappedComponent {...props} data={data} />
  }
}
```

## Error Boundaries

```typescript
// Error boundary component
'use client'

import { Component, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode | ((error: Error) => ReactNode)
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error!)
      }
      return this.props.fallback
    }

    return this.props.children
  }
}

// Usage
function MyPage() {
  return (
    <ErrorBoundary
      fallback={(error) => (
        <div>
          <h2>Something went wrong</h2>
          <p>{error.message}</p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      )}
    >
      <RiskyComponent />
    </ErrorBoundary>
  )
}
```
