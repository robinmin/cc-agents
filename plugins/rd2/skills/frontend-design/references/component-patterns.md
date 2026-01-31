# Component Patterns

Detailed patterns for component architecture in React and Next.js (2024-2025).

## Server Components vs Client Components

### Server Components (Default in Next.js App Router)

**Characteristics:**
- No client-side JavaScript
- Direct database access
- Secure server-side logic
- Better performance (smaller bundles)

**Use for:**
- Data fetching
- Accessing backend resources
- Keeping sensitive information on server
- Large dependencies that would bloat client bundle

```tsx
// Server Component (default in Next.js App Router)
async function UserProfile({ userId }: { userId: string }) {
  const user = await db.user.findUnique({ where: { id: userId } });
  return <ProfileCard user={user} />;
}
```

### Client Components (When Needed)

**Characteristics:**
- State management (useState, useReducer)
- Browser APIs (window, localStorage)
- Event handlers (onClick, onChange)
- React hooks and lifecycle

**Use for:**
- Interactivity (forms, buttons, toggles)
- Browser-only APIs
- Custom hooks that use state or effects
- Third-party libraries that need browser context

```tsx
// Client Component (for interactivity)
"use client";
import { useState } from "react";

export function LikeButton() {
  const [likes, setLikes] = useState(0);
  return <button onClick={() => setLikes(l => l + 1)}>{likes} Likes</button>;
}
```

### Decision Matrix

| Feature | Server Component | Client Component |
|---------|-----------------|------------------|
| Data fetching | Direct async/await | useEffect, React Query |
| State | Not supported | useState, useReducer |
| Event handlers | Not supported | onClick, onChange |
| Browser APIs | Not supported | window, localStorage |
| Database access | Direct | Via API only |
| Bundle size | Zero JS | Adds to bundle |

## Presentational vs Container Components

### Presentational Components (Dumb Components)

**Characteristics:**
- Receive data via props
- Emit events via callbacks
- No business logic
- Highly reusable

```tsx
// Presentational component
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({
  label,
  onClick,
  variant = "primary",
  disabled = false,
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
```

### Container Components (Smart Components)

**Characteristics:**
- Manage state and side effects
- Fetch data (in Client Components) or receive data (Server Components)
- Pass data to presentational components
- Less reusable, more specific

```tsx
// Container component (Client Component)
"use client";
import { useState, useEffect } from "react";

export function UserProfileContainer({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then((data) => {
      setUser(data);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <LoadingSpinner />;
  if (!user) return <ErrorMessage />;

  return <UserProfileCard user={user} />;
}
```

## Component Organization

### Recommended Directory Structure

```
src/
├── components/           # Shared components
│   ├── ui/              # Basic UI components (Button, Input)
│   ├── layout/          # Layout components (Header, Sidebar)
│   └── features/        # Feature-specific components
├── app/                 # Next.js App Router (Server Components)
│   ├── (routes)/       # File-based routing
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── hooks/               # Custom React hooks
├── services/            # API and external services
├── stores/              # State management
├── utils/               # Utility functions
└── types/               # TypeScript types
```

### Component File Structure

```
components/
├── ui/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   └── Input/
│       ├── Input.tsx
│       ├── Input.test.tsx
│       └── index.ts
└── features/
    └── UserProfile/
        ├── UserProfile.tsx
        ├── UserProfileCard.tsx
        ├── UserProfileSkeleton.tsx
        └── index.ts
```

## Advanced Patterns

### Compound Components

Share state between related components:

```tsx
const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({ children, defaultValue }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

Tabs.List = function TabsList({ children }) { /* ... */ };
Tabs.Tab = function Tab({ value, children }) { /* ... */ };
Tabs.Panel = function TabsPanel({ value, children }) { /* ... */ };

// Usage
<Tabs defaultValue="tab1">
  <Tabs.List>
    <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
    <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
  <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
</Tabs>
```

### Render Props Pattern

Share behavior between components:

```tsx
interface RenderProps<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

function DataFetcher<T>({
  url,
  children
}: {
  url: string;
  children: (props: RenderProps<T>) => React.ReactNode;
}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return <>{children({ data, loading, error })}</>;
}

// Usage
<DataFetcher<User> url="/api/user">
  {({ data, loading, error }) => (
    loading ? <Spinner /> : <UserCard user={data} />
  )}
</DataFetcher>
```

### Custom Hooks Pattern

Extract reusable stateful logic:

```tsx
// Custom hook
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  return { user, loading, error };
}

// Usage in component
function UserProfile({ userId }: { userId: string }) {
  const { user, loading, error } = useUser(userId);

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <ProfileCard user={user} />;
}
```

## Sources

- [React & Next.js in 2025 - Modern Best Practices (Strapi, 2025)](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices)
- [Next.js 16: An Engineer's Perspective on Frontend Architecture (Medium, 2025)](https://medium.com/@narayanansundar02/next-js-16-a-engineers-perspective-on-the-future-of-frontend-architecture-5de0ac17f6fb)
