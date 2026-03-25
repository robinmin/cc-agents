---
name: state-management
description: "State management patterns: React Query for server state, Zustand for global client state, React Hook Form with Zod, and Server Actions."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
tags: [frontend, state-management, react-query, zustand, forms, server-actions]
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

# State Management Patterns

Comprehensive guide to state management in modern React applications.

## State Categories

| Category | Solution | When to Use |
|----------|----------|-------------|
| **Local UI state** | useState, useReducer | Component-specific, temporary |
| **Server state** | React Query, SWR | API data, needs caching |
| **Global state** | Zustand, Jotai | Cross-component, persistent |
| **Form state** | React Hook Form + Zod | User input, validation |
| **URL state** | URLSearchParams, nuqs | Shareable, bookmarkable |
| **WebSocket state** | Custom hooks | Real-time data |

## React Query (Server State)

```typescript
// Basic usage
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Query
function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes
  })
}

// Mutation
function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateUserDto) => updateUser(data),
    onSuccess: (updatedUser) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['user', updatedUser.id] })
      // Or update directly (optimistic)
      queryClient.setQueryData(['user', updatedUser.id], updatedUser)
    },
    onError: (error) => {
      console.error('Update failed:', error)
    }
  })
}

// Optimistic update
function useToggleTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (todo: Todo) => toggleTodo(todo.id),
    onMutate: async (todo) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] })
      const previous = queryClient.getQueryData(['todos'])

      queryClient.setQueryData(['todos'], (old: Todo[]) =>
        old.map(t => t.id === todo.id ? { ...t, completed: !t.completed } : t)
      )

      return { previous }
    },
    onError: (err, todo, context) => {
      queryClient.setQueryData(['todos'], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }
  })
}
```

### Query Options

```typescript
// Pagination
function useUsers(page: number) {
  return useQuery({
    queryKey: ['users', { page }],
    queryFn: () => fetchUsers({ page, pageSize: 10 }),
    keepPreviousData: true,  // Don't flash loading state
  })
}

// Infinite scroll
function useInfinitePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam = 0 }) => fetchPosts({ cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
  })
}

// Dependent queries
function useUserPosts(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId,  // Won't run if userId is null
  })
}
```

## Zustand (Global Client State)

```typescript
// Store definition
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserStore {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
  updatePreferences: (prefs: Partial<UserPreferences>) => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (user) => set({
        user,
        isAuthenticated: true
      }),

      logout: () => set({
        user: null,
        isAuthenticated: false
      }),

      updatePreferences: (prefs) => set((state) => ({
        user: state.user
          ? { ...state.user, preferences: { ...state.user.preferences, ...prefs } }
          : null
      })),
    }),
    {
      name: 'user-storage',  // localStorage key
      partialize: (state) => ({ user: state.user }),  // Only persist user
    }
  )
)

// Usage in component
function ProfileButton() {
  const { user, logout } = useUserStore()

  if (!user) return <LoginButton />
  return (
    <button onClick={logout}>
      {user.name}
    </button>
  )
}
```

### Store Slices Pattern

```typescript
// Slice-based store for larger apps
interface CartItem {
  id: string
  quantity: number
  price: number
}

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clearCart: () => void
  total: () => number
}

interface UIState {
  isCartOpen: boolean
  toggleCart: () => void
}

interface StoreState extends CartState, UIState {}

export const useStore = create<StoreState>()((set, get) => ({
  // Cart slice
  items: [],

  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),

  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),

  clearCart: () => set({ items: [] }),

  total: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

  // UI slice
  isCartOpen: false,

  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
}))
```

## React Hook Form + Zod

```typescript
// Schema definition
import { z } from 'zod'

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(18, 'Must be at least 18').optional(),
  role: z.enum(['admin', 'user', 'guest']),
  preferences: z.object({
    newsletter: z.boolean(),
    notifications: z.boolean(),
  }),
})

type UserFormData = z.infer<typeof userSchema>

// Form component
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

export function UserForm({ defaultValues, onSubmit }: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues,
    mode: 'onBlur',  // Validate on blur
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Name</label>
        <input {...register('name')} />
        {errors.name && <span>{errors.name.message}</span>}
      </div>

      <div>
        <label>Email</label>
        <input {...register('email')} />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      <div>
        <label>Role</label>
        <select {...register('role')}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="guest">Guest</option>
        </select>
      </div>

      <div>
        <label>
          <input type="checkbox" {...register('preferences.newsletter')} />
          Subscribe to newsletter
        </label>
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  )
}
```

### Form Arrays

```typescript
// Dynamic form arrays
const schema = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().min(1),
  })).min(1)
})

function OrderForm() {
  const { register, control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ name: '', quantity: 1 }] }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  })

  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`items.${index}.name`)} />
          <input type="number" {...register(`items.${index}.quantity`)} />
          <button type="button" onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ name: '', quantity: 1 })}>
        Add Item
      </button>
    </form>
  )
}
```

## Server Actions

```typescript
// app/actions.ts
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string

  // Validate
  if (!name || !email) {
    return { error: 'Name and email are required' }
  }

  // Create in database
  const user = await db.users.create({ name, email })

  // Revalidate caches
  revalidatePath('/users')
  revalidateTag('user-count')

  return { success: true, user }
}

export async function updateUser(id: string, data: UpdateUserDto) {
  const user = await db.users.update(id, data)

  revalidatePath(`/users/${id}`)
  revalidatePath('/users')

  return { success: true, user }
}

export async function deleteUser(id: string) {
  await db.users.delete(id)

  revalidatePath('/users')
  redirect('/users')  // Redirect after delete
}

// Optimistic update with Server Action
'use client'

import { useOptimistic, startTransition } from 'react'
import { deleteUser } from './actions'

function UserList({ users, onDelete }: { users: User[], onDelete: (id: string) => void }) {
  const [optimisticUsers, addOptimisticUser] = useOptimistic(
    users,
    (state, deleteId: string) => state.filter(u => u.id !== deleteId)
  )

  async function handleDelete(id: string) {
    addOptimisticUser(id)
    startTransition(() => {
      onDelete(id)
    })
  }

  return (
    <ul>
      {optimisticUsers.map(user => (
        <li key={user.id}>
          {user.name}
          <button onClick={() => handleDelete(user.id)}>Delete</button>
        </li>
      ))}
    </ul>
  )
}
```

## URL State

```typescript
// URL search params
function useSearchParams() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const query = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const status = searchParams.get('status')

  function updateSearch(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }

    router.push(`/search?${params.toString()}`)
  }

  return { query, page, status, updateSearch }
}

// With nuqs library (typed search params)
import { useQueryState } from 'nuqs'

function useFilters() {
  const [status, setStatus] = useQueryState('status', {
    defaultValue: 'all',
    serializer: (v) => v === 'all' ? '' : v,
    parser: (v) => v || 'all',
  })

  const [minPrice, setMinPrice] = useQueryState('minPrice', {
    parser: (v) => v ? parseInt(v, 10) : null,
    serializer: (v) => v?.toString() || '',
  })

  return { status, setStatus, minPrice, setMinPrice }
}
```

## State Colocation

```typescript
// BAD - Global state for everything
const useGlobalStore = create((set) => ({
  isModalOpen: false,  // Should be local
  modalContent: null,   // Should be local
  setModal: (content) => set({ isModalOpen: true, modalContent: content }),
  closeModal: () => set({ isModalOpen: false, modalContent: null }),
}))

// GOOD - Colocate state where it's needed
function App() {
  return (
    <>
      <Header />
      <ModalProvider>
        <PageContent />
      </ModalProvider>
    </>
  )
}

// Modal context for truly global modals
const ModalContext = createContext<{
  open: (content: ReactNode) => void
  close: () => void
} | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null)

  return (
    <ModalContext.Provider value={{
      open: setContent,
      close: () => setContent(null)
    }}>
      {children}
      {content && (
        <Modal onClose={() => setContent(null)}>
          {content}
        </Modal>
      )}
    </ModalContext.Provider>
  )
}
```
