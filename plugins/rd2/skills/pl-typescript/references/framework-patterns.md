# Framework Patterns: React, Vue, Angular

## Overview

TypeScript integrates deeply with modern frontend frameworks. This reference covers framework-specific patterns, typing strategies, and best practices for React, Vue, and Angular.

## React TypeScript Patterns

### Component Props Typing

```typescript
// Functional Component Props
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

function Button({ label, onClick, disabled, variant = 'primary' }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {label}
    </button>
  );
}
```

### Generic Components

```typescript
// Generic List Component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

// Usage
interface User {
  id: string;
  name: string;
}

function UserList({ users }: { users: User[] }) {
  return (
    <List
      items={users}
      keyExtractor={(user) => user.id}
      renderItem={(user) => <span>{user.name}</span>}
    />
  );
}
```

### Custom Hooks Typing

```typescript
// Typed Custom Hook
interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useApi<T>(url: string): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(url);
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url]);

  return { data, loading, error, refetch: fetchData };
}

// Usage
interface User {
  id: string;
  name: string;
}

function UserProfile({ userId }: { userId: string }) {
  const { data: user, loading, error } = useApi<User>(`/api/users/${userId}`);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return null;

  return <div>{user.name}</div>;
}
```

### Context Typing

```typescript
// Typed Context
interface AuthContextValue {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (credentials: Credentials) => {
    const user = await api.login(credentials);
    setUser(user);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Form Handling

```typescript
// Typed Form State
interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
}

interface LoginForm {
  email: string;
  password: string;
}

function LoginForm() {
  const [state, setState] = useState<FormState<LoginForm>>({
    values: { email: '', password: '' },
    errors: {},
    touched: {}
  });

  const handleChange = (field: keyof LoginForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setState(prev => ({
      ...prev,
      values: { ...prev.values, [field]: e.target.value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Submit logic
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={state.values.email}
        onChange={handleChange('email')}
      />
      <input
        type="password"
        value={state.values.password}
        onChange={handleChange('password')}
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

## Vue TypeScript Patterns

### Component Props Typing

```typescript
// defineProps with TypeScript
<script setup lang="ts">
interface Props {
  title: string;
  count?: number;
  items: string[];
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  items: () => []
});
</script>
```

### Generic Components

```typescript
// Generic List Component
<script setup lang="ts" generic="T">
interface Props {
  items: T[];
  keyField: keyof T;
}

const props = defineProps<Props>();
</script>

<template>
  <ul>
    <li v-for="(item, index) in items" :key="String(item[keyField])">
      <slot :item="item" :index="index" />
    </li>
  </ul>
</template>
```

### Composables Typing

```typescript
// Typed Composable
interface UseAsyncResult<T> {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  execute: () => Promise<void>;
}

export function useAsync<T>(fn: () => Promise<T>): UseAsyncResult<T> {
  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const execute = async () => {
    loading.value = true;
    try {
      data.value = await fn();
    } catch (err) {
      error.value = err as Error;
    } finally {
      loading.value = false;
    }
  };

  return { data, loading, error, execute };
}

// Usage
const { data, loading, error, execute } = useAsync(async () => {
  const response = await fetch('/api/users');
  return response.json();
});
```

### Store Typing (Pinia)

```typescript
// Typed Pinia Store
interface UserState {
  currentUser: User | null;
  users: User[];
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    currentUser: null,
    users: []
  }),

  getters: {
    isLoggedIn(): boolean {
      return this.currentUser !== null;
    },

    userById: (state) => {
      return (id: string) => state.users.find(u => u.id === id);
    }
  },

  actions: {
    async fetchUsers() {
      const response = await fetch('/api/users');
      this.users = await response.json();
    },

    setCurrentUser(user: User) {
      this.currentUser = user;
    }
  }
});
```

## Angular TypeScript Patterns

### Service Typing

```typescript
// Typed Service
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`/api/users/${id}`);
  }

  createUser(user: CreateUserDto): Observable<User> {
    return this.http.post<User>('/api/users', user);
  }
}
```

### Component Typing

```typescript
@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  standalone: true
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  loading = false;
  error: string | null = null;

  private userService = inject(UserService);

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }
}
```

### Signals (Angular 16+)

```typescript
@Component({
  selector: 'app-counter',
  template: `
    <p>Count: {{ count() }}</p>
    <button (click)="increment()">Increment</button>
  `,
  standalone: true
})
export class CounterComponent {
  count = signal(0);
  doubled = computed(() => this.count() * 2);

  increment(): void {
    this.count.update(v => v + 1);
  }
}
```

### Typed Reactive Forms

```typescript
interface LoginForm {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  template: `
    <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
      <input formControlName="email" type="email" />
      <input formControlName="password" type="password" />
      <button type="submit">Login</button>
    </form>
  `,
  standalone: true
})
export class LoginComponent {
  loginForm: FormGroup<FormControl<LoginForm[keyof LoginForm]>>;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value as LoginForm);
    }
  }
}
```

## Cross-Framework Patterns

### State Management

```typescript
// Type-safe state management pattern
type StateListener<T> = (state: T) => void;

class Store<T> {
  private state: T;
  private listeners: Set<StateListener<T>> = new Set();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState(): T {
    return this.state;
  }

  setState(partial: Partial<T>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  subscribe(listener: StateListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// Usage
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
}

const store = new Store<AppState>({
  user: null,
  theme: 'light'
});

store.subscribe((state) => {
  console.log('State changed:', state);
});
```

### API Client Pattern

```typescript
// Generic API Client
class ApiClient {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return response.json();
  }

  async post<T, U>(url: string, data: U): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async put<T, U>(url: string, data: U): Promise<T> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async delete(url: string): Promise<void> {
    await fetch(url, { method: 'DELETE' });
  }
}

// Usage
const api = new ApiClient();

interface User {
  id: string;
  name: string;
}

const users = await api.get<User[]>('/api/users');
const user = await api.post<User, { name: string }>('/api/users', {
  name: 'John'
});
```

## Best Practices

### React
- Use functional components with hooks
- Type props with interfaces
- Use generic components for reusable logic
- Type custom hooks explicitly
- Use discriminated unions for variant props

### Vue
- Use `<script setup lang="ts">`
- Type props with interfaces
- Use generics for reusable components
- Type composables explicitly
- Use Pinia for state management

### Angular
- Use strict mode in tsconfig
- Type services explicitly
- Use signals for reactive state
- Type forms with FormGroup
- Use dependency injection

## Related References

- `type-system.md` - Generics for components
- `async-patterns.md` - Async data fetching
- `testing-strategy.md` - Testing framework code
