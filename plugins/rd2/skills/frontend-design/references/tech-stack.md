# Technology Stack

Framework and library selection guide for frontend development (2024-2025).

## Framework Selection

Based on [React Tech Stack 2025](https://www.robinwieruch.de/react-tech-stack/):

| Framework | Best For | Trade-offs |
|-----------|----------|------------|
| **Next.js 14+** | SEO-critical sites, SaaS, content | SSR complexity, steeper learning curve |
| **Vite + React** | SPAs, dashboards, internal tools | No SSR, simpler setup |
| **Remix** | Nested routes, data-heavy apps | Learning curve, opinionated |
| **Vue + Nuxt** | Progressive enhancement | Smaller ecosystem than React |
| **Astro** | Content-first, static sites | Limited interactivity model |

### When to Choose Next.js

- SEO is critical (marketing sites, blogs, e-commerce)
- Need Server-Side Rendering (SSR)
- Building full-stack applications with API routes
- Want React Server Components benefits
- Need hybrid static + dynamic rendering

### When to Choose Vite + React

- Building internal dashboards or tools
- SPA with client-side routing is sufficient
- Faster development iteration needed
- Simpler deployment requirements
- Team prefers SPA architecture

## Component Library Selection

| Library | Best For | Trade-offs |
|---------|----------|------------|
| **shadcn/ui** | Full customization, design system | Manual setup, copy-paste components |
| **MUI (Material UI)** | Enterprise apps, rapid development | Large bundle, Material design |
| **Chakra UI** | Accessibility, theming | Medium bundle size |
| **Headless UI** | Tailwind projects, custom design | Unstyled, need CSS work |
| **Radix UI** | Primitives, custom styling | Low-level, more work |
| **Mantine** | Full-featured, hooks library | Medium bundle, opinionated |

### shadcn/ui (Recommended for 2024-2025)

**Pros:**
- Own your components (copy into project)
- Fully customizable with Tailwind CSS
- Accessible by default (uses Radix primitives)
- No dependency bloat

**Cons:**
- Manual updates when library improves
- Initial setup time

```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Add components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
```

## State Management Evolution

Based on [Frontend Tech Stack Evolution 2024-2025](https://www.linkedin.com/posts/sanchit0496_reactjs-nextjs-javascript-activity-7320785137766424576-H715):

| Old Pattern | New Pattern | Reason |
|-------------|-------------|--------|
| Redux for everything | React Query + Zustand | Separation of concerns |
| useEffect data fetching | React Query / SWR | Better caching, states |
| Context everywhere | Zustand | Less boilerplate |
| Redux Thunk | Server Actions | Simpler mutations |
| Client mutations | Server Actions | Better security |

### Recommended Combinations

**Simple App:**
- Local state: useState, useReducer
- Server state: fetch in Server Components
- Global: React Context (minimal)

**Medium App:**
- Local state: useState
- Server state: React Query
- Global: Zustand
- Forms: React Hook Form + Zod

**Large App:**
- Local state: useState, useReducer
- Server state: React Query + Server Actions
- Global: Zustand (or Redux Toolkit if team prefers)
- Forms: React Hook Form + Zod
- URL state: nuqs or custom hooks

## Styling Solutions

| Approach | Best For | Performance |
|----------|----------|-------------|
| **Tailwind CSS** | Utility-first, rapid UI | Excellent (purges unused) |
| **CSS Modules** | Component scoping | Excellent (native CSS) |
| **Styled Components** | Dynamic theming | Good (runtime CSS-in-JS) |
| **Emotion** | Similar to styled-components | Good |
| **Panda CSS** | Type-safe, zero-runtime | Excellent |
| **Vanilla Extract** | Type-safe CSS | Excellent (compile time) |

### Tailwind CSS (Recommended)

```tsx
// Modern Tailwind with clsx + tailwind-merge
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<button className={cn(
  "px-4 py-2 rounded-md",
  variant === "primary" && "bg-blue-500 text-white",
  variant === "secondary" && "bg-gray-200 text-gray-800",
  disabled && "opacity-50 cursor-not-allowed"
)}>
  {label}
</button>
```

## Form Libraries

| Library | Best For | Features |
|---------|----------|----------|
| **React Hook Form** | Performance, large forms | Uncontrolled, minimal re-renders |
| **Formik** | Simple forms | Controlled, more re-renders |
| **Zod** | Schema validation | Type inference, runtime validation |
| **Yup** | Schema validation | Older, less TypeScript support |

### React Hook Form + Zod (Recommended)

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      <input {...register('password')} type="password" />
      {errors.password && <span>{errors.password.message}</span>}
      <button type="submit">Login</button>
    </form>
  );
}
```

## Data Fetching Libraries

| Library | Best For | Features |
|---------|----------|----------|
| **React Query** | Complex caching, mutations | Background updates, devtools |
| **SWR** | Simpler caching | Stale-while-revalidate |
| **RTK Query** | Redux ecosystem | Integrated with Redux Toolkit |
| **Apollo Client** | GraphQL | Full GraphQL support |
| **urql** | Lightweight GraphQL | Simpler than Apollo |

## Project Structure

### Small to Medium Projects

```
src/
├── app/                 # Next.js App Router
├── components/
│   ├── ui/             # Basic UI (Button, Input)
│   ├── layout/         # Layout (Header, Footer)
│   └── features/       # Feature components
├── hooks/              # Custom hooks
├── lib/                # Utility functions
├── services/           # API services
├── stores/             # Zustand stores
└── types/              # TypeScript types
```

### Large Projects / Monorepo

```
apps/
├── web/                # Main app (Next.js)
├── admin/              # Admin dashboard
└── docs/               # Documentation site

packages/
├── ui/                 # Shared UI components
├── config/             # Shared config
├── utils/              # Shared utilities
└── types/              # Shared types
```

## TypeScript Configuration

### Recommended tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## AI Integration (2025 Trend)

Emerging patterns for AI-powered features:

```tsx
// Streaming AI responses
import { experimental_streamAction } from 'ai';

export const streamChat = experimental_streamAction(async function* (prompt: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const chunk of response) {
    yield chunk.choices[0]?.delta?.content || '';
  }
});

// Usage with useChat hook
import { useChat } from 'ai/react';

function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <form onSubmit={handleSubmit}>
      {messages.map(m => <p key={m.id}>{m.content}</p>)}
      <input value={input} onChange={handleInputChange} />
    </form>
  );
}
```

## Edge Functions

For low-latency, globally distributed compute:

```tsx
// app/api/edge/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country');

  return Response.json({
    message: `Hello from the edge!`,
    country,
  });
}
```

## Sources

- [React Tech Stack [2025] (Robin Wieruch, 2024)](https://www.robinwieruch.de/react-tech-stack/)
- [Frontend Tech Stack Evolution 2024-2025 (LinkedIn)](https://www.linkedin.com/posts/sanchit0496_reactjs-nextjs-javascript-activity-7320785137766424576-H715)
- [React & Next.js in 2025 (Strapi, 2025)](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices)
