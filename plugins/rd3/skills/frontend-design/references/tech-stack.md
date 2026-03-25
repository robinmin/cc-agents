---
name: tech-stack
description: "Frontend technology stack selection: React frameworks, build tools, styling solutions, and ecosystem libraries for 2024-2025."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
tags: [frontend, tech-stack, react, nextjs, build-tools, styling, framework]
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

# Technology Stack Selection

Guide to selecting and combining frontend technologies for modern web applications.

## Framework Comparison

### Next.js 14+ (App Router)

**Best for:** SEO-critical apps, SaaS, e-commerce, content sites, full-stack React

```typescript
// app/page.tsx - Server Component (default)
export default async function Page() {
  const data = await fetchData() // Direct database/API access
  return <MainContent data={data} />
}

// app/components/Interactive.tsx - Client Component
'use client'
import { useState } from 'react'

export function InteractiveCounter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

**Pros:**
- Server Components by default (zero JS to client)
- Built-in routing, API routes, middleware
- Image, font, and script optimization
- Excellent DX and deployment (Vercel)
- ISR for dynamic content with caching

**Cons:**
- Lock-in to App Router patterns
- Server-side complexity for simple SPAs
- Learning curve for Server/Client component boundary

### Vite + React (SPA)

**Best for:** Dashboards, admin panels, SPAs without SEO requirements, libraries

```typescript
// main.tsx
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <App />
)

// App.tsx
function App() {
  return <Dashboard />
}
```

**Pros:**
- Simple SPA architecture
- Fast HMR with Vite
- Full control over routing (React Router)
- Smaller bundle for pure SPAs
- Easy to deploy anywhere

**Cons:**
- No SSR capability
- Manual optimization setup
- SEO requires extra tooling

### Remix

**Best for:** Data-heavy applications, nested routing, form-heavy apps

```typescript
// app/routes/projects.tsx
import { useLoaderData, Form } from '@remix-run/react'

export async function loader() {
  const projects = await db.projects.findAll()
  return { projects }
}

export default function Projects() {
  const { projects } = useLoaderData<typeof loader>()

  return (
    <div>
      <h1>Projects</h1>
      <Form method="post">
        <input name="name" placeholder="Project name" />
        <button type="submit">Create</button>
      </Form>
      {projects.map(p => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  )
}
```

**Pros:**
- Nested routes with parallel data loading
- Progressive enhancement (forms work without JS)
- Built-in data loading with loaders
- Excellent for optimistic UI

**Cons:**
- Smaller ecosystem than Next.js
- Different mental model from React

## Build Tool Comparison

| Tool | Bundle Speed | Dev Speed | Plugin Ecosystem | Best For |
|------|-------------|-----------|-----------------|----------|
| **Vite** | Fast | Very Fast | Good | SPA, Libraries |
| **Next.js** | Good | Good | Built-in | Full-stack |
| **Webpack** | Slow | Medium | Excellent | Complex Legacy |
| **Turbopack** | Fast | Very Fast | Growing | Next.js Apps |
| **esbuild** | Very Fast | N/A | Limited | Bundling Libs |

## Styling Solutions

### Tailwind CSS + shadcn/ui

**Best for:** Rapid UI development, design system consistency

```typescript
// tailwind.config.ts
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

// Button component (shadcn pattern)
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'
}

export function Button({ className, variant = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium',
        'transition-colors focus-visible:outline-none disabled:opacity-50',
        variant === 'default' && 'bg-primary text-primary-foreground',
        variant === 'outline' && 'border border-input bg-background',
        className
      )}
      {...props}
    />
  )
}
```

**Pros:**
- Utility-first = no unused styles
- Consistent design tokens
- shadcn/ui components are copy-paste (not a library)
- Easy dark mode with CSS variables

**Cons:**
- Class name explosion in JSX
- Learning curve for utility naming
- Not semantic

### CSS Modules

**Best for:** Scoped styles, component isolation

```css
/* Button.module.css */
.button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
}

.primary {
  background: var(--color-primary);
  color: white;
}

.secondary {
  background: var(--color-secondary);
}

/* Button.tsx */
import styles from './Button.module.css'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
}

export function Button({ variant = 'primary', children }: ButtonProps) {
  return (
    <button className={`${styles.button} ${styles[variant]}`}>
      {children}
    </button>
  )
}
```

### CSS-in-JS (Styled Components / Emotion)

**Best for:** Dynamic styles, theme systems, component libraries

```typescript
import styled from 'styled-components'

interface ButtonProps {
  $variant?: 'primary' | 'secondary'
  $fullWidth?: boolean
}

export const StyledButton = styled.button<ButtonProps>`
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  width: ${props => props.$fullWidth ? '100%' : 'auto'};
  background: ${props => props.$variant === 'primary'
    ? 'var(--color-primary)'
    : 'var(--color-secondary)'};
  color: ${props => props.$variant === 'primary'
    ? 'white'
    : 'inherit'};

  &:hover {
    opacity: 0.9;
  }
`
```

### CSS Variables + Vanilla CSS

**Best for:** Simple projects, design system foundation

```css
/* variables.css */
:root {
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --radius: 0.375rem;
}

/* Button.css */
.btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius);
  font-weight: 500;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}
```

## State Management Selection

| Scenario | Solution | Why |
|----------|----------|-----|
| Server data, caching | **React Query** | Built-in caching, refetching, optimistic updates |
| Simple global state | **Zustand** | Minimal boilerplate, TypeScript-first |
| Complex global state | **Jotai** | Atomic state, good for derived state |
| Form state | **React Hook Form** | Performance, validation integration |
| URL state | **nuqs** | Type-safe URL params |
| WebSocket state | **Custom hook** | Domain-specific needs |
| Server state + mutations | **Server Actions** | Next.js native, automatic revalidation |

## Type Safety Stack

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

### Runtime Validation with Zod

```typescript
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
  preferences: z.object({
    newsletter: z.boolean(),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
  }),
  createdAt: z.coerce.date(),
})

type User = z.infer<typeof UserSchema>

// Runtime validation
function createUser(data: unknown): User {
  return UserSchema.parse(data)
}

// Safe API response typing
const result = UserSchema.safeParse(apiResponse)
if (result.success) {
  console.log(result.data.name)
}
```

## Recommended Stack Combinations

### Startup / MVPP

```
Framework:    Next.js 14+ (App Router)
Styling:      Tailwind CSS + shadcn/ui
State:        React Query (server) + Zustand (client)
Forms:        React Hook Form + Zod
Testing:      Vitest + Testing Library + Playwright
Deploy:       Vercel
```

### Enterprise / Large App

```
Framework:    Next.js 14+ (App Router)
Styling:      Tailwind CSS + CSS Variables + shadcn/ui
State:        React Query + Zustand slices
Forms:        React Hook Form + Zod
Testing:      Vitest + Testing Library + Playwright
CI/CD:        GitHub Actions
Monitoring:   Sentry + Datadog RUM
```

### Simple SPA (No SSR needed)

```
Framework:    Vite + React 18
Routing:      React Router 6
Styling:      Tailwind CSS
State:        Zustand
Forms:        React Hook Form + Zod
Testing:      Vitest + Testing Library
Deploy:       Netlify / Vercel / Cloudflare Pages
```

### Design System / Component Library

```
Framework:    Vite + React 18
Styling:      CSS Modules + CSS Variables
State:        React Context (theme) + Zustand (UI state)
Forms:        React Hook Form + Zod
Testing:      Vitest + Testing Library + Storybook
Storybook:    7+ with addon-a11y
Build:        Vite + Tsup for lib bundling
```

## Tool Version Reference (2024-2025)

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 20+ LTS | Use nvm for version management |
| **pnpm** | 8+ | Fast, disk-efficient package manager |
| **TypeScript** | 5.3+ | Latest features, best DX |
| **React** | 18.2+ | Server Components support |
| **Next.js** | 14.2+ | App Router stable |
| **Vite** | 5+ | Fast dev and build |
| **Tailwind CSS** | 3.4+ | JIT mode, containers |
| **React Query** | 5+ | TanStack Query v5 |
| **Zustand** | 4+ | Simplified API |
| **React Router** | 6.21+ | Data routers |
| **Playwright** | 1.42+ | Cross-browser E2E |
| **Vitest** | 1.3+ | Vite-native testing |
| **Zod** | 3.22+ | Runtime validation |
| **shadcn/ui** | Latest | Copy-paste components |
