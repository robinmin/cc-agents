# State Management

Modern state management patterns for React applications (2024-2025).

## State Management Strategy

Based on [Frontend Tech Stack Evolution 2024-2025](https://www.linkedin.com/posts/sanchit0496_reactjs-nextjs-javascript-activity-7320785137766424576-H715):

| State Type | Solution | Example | Notes |
|------------|----------|---------|-------|
| **Local UI state** | useState, useReducer | Form inputs, toggles | Client Components only |
| **Server state** | React Query, SWR | API data, caching | Replaces Redux for server data |
| **Global state** | Zustand, Jotai | User session, theme | Simpler than Redux |
| **Form state** | React Hook Form, Zod | Complex forms | Type-safe validation |
| **URL state** | URLSearchParams | Search params, filters | Native browser API |
| **Server state** | Server Actions | Mutations, revalidation | Next.js 14+ |

## React Query for Server State (Recommended)

React Query (TanStack Query) is the recommended solution for server state management. It handles caching, background updates, and stale data automatically.

### Basic Query

```tsx
import { useQuery } from '@tanstack/react-query';

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <ProfileCard user={data} />;
}
```

### Mutation with Invalidation

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function UpdateUserForm({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: UpdateUserData) => updateUser(userId, data),
    onSuccess: () => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      mutation.mutate(formData);
    }}>
      {/* form fields */}
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### Optimistic Updates

```tsx
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['todos'] });

    // Snapshot previous value
    const previousTodos = queryClient.getQueryData(['todos']);

    // Optimistically update
    queryClient.setQueryData(['todos'], (old: Todo[]) => [...old, newTodo]);

    // Return context with snapshot
    return { previousTodos };
  },
  onError: (err, newTodo, context) => {
    // Rollback on error
    queryClient.setQueryData(['todos'], context.previousTodos);
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

## Zustand for Global State (Recommended)

Zustand is a lightweight state management solution that's simpler than Redux.

### Basic Store

```ts
import { create } from 'zustand';

interface UserStore {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));

// Usage in component
function Header() {
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);

  return (
    <header>
      <span>{user?.name}</span>
      <button onClick={clearUser}>Logout</button>
    </header>
  );
}
```

### Persistent Store

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
      })),
    }),
    {
      name: 'theme-storage', // localStorage key
    }
  )
);
```

### Store with Actions and Selectors

```ts
import { create } from 'zustand';

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter((i) => i.id !== id)
  })),
  clearCart: () => set({ items: [] }),
  total: () => get().items.reduce((sum, item) => sum + item.price, 0),
}));
```

## Server Actions (Next.js 14+)

Server Actions allow mutations to run on the server, integrated with Next.js caching.

### Basic Server Action

```tsx
// app/actions.ts
"use server";

import { revalidatePath } from 'next/cache';

export async function updateUser(userId: string, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  const updated = await db.user.update({
    where: { id: userId },
    data: { name, email },
  });

  revalidatePath('/users');
  return updated;
}
```

### Usage in Client Component

```tsx
// components/UserForm.tsx
"use client";

import { updateUser } from './actions';

export function UserForm({ userId }: { userId: string }) {
  const handleSubmit = async (formData: FormData) => {
    await updateUser(userId, formData);
  };

  return (
    <form action={handleSubmit}>
      <input name="name" placeholder="Name" />
      <input name="email" type="email" placeholder="Email" />
      <button type="submit">Update</button>
    </form>
  );
}
```

### With useFormStatus

```tsx
"use client";

import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save'}
    </button>
  );
}

export function UserForm({ userId }: { userId: string }) {
  return (
    <form action={updateUser.bind(null, userId)}>
      <input name="name" />
      <SubmitButton />
    </form>
  );
}
```

## Form State with React Hook Form + Zod

Type-safe form handling with validation.

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(18, 'Must be at least 18'),
});

type FormData = z.infer<typeof schema>;

function UserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await saveUser(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}

      <input {...register('email')} type="email" />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register('age', { valueAsNumber: true })} type="number" />
      {errors.age && <span>{errors.age.message}</span>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

## State Evolution Trends (2024-2025)

Based on community consensus:

| Old Pattern | New Pattern | Reason |
|-------------|-------------|--------|
| Redux for everything | React Query + Zustand | Separation of server vs client state |
| useEffect for data fetching | React Query / SWR | Better caching, loading states |
| Context for global state | Zustand | Less boilerplate, better performance |
| Prop drilling | useContext or Zustand | Cleaner component hierarchy |
| Client-side mutations | Server Actions | Better security, simpler code |

## Sources

- [React Tech Stack [2025] (Robin Wieruch, 2024)](https://www.robinwieruch.de/react-tech-stack/)
- [Frontend Tech Stack Evolution 2024-2025 (LinkedIn)](https://www.linkedin.com/posts/sanchit0496_reactjs-nextjs-javascript-activity-7320785137766424576-H715)
- [Mastering Next.js and React Features for 2025 (Dev.to, 2024)](https://dev.to/golsaesk/mastering-the-most-useful-nextjs-and-react-features-for-2025-4g60)
