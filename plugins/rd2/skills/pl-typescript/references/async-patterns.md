# Async Patterns in TypeScript

## Overview

TypeScript's type system provides excellent support for async patterns including Promises, async/await, and event handling. This reference covers common async patterns with proper typing.

## Promise Basics

### Promise Return Types

TypeScript infers Promise return types correctly:

```typescript
// Type inferred: Promise<number>
async function fetchUserId(): Promise<number> {
  const response = await fetch('/api/user');
  const data = await response.json();
  return data.id;
}
```

### Generic Promise Types

```typescript
function fetchWithTimeout<T>(
  url: string,
  timeout: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);

    fetch(url)
      .then(response => response.json())
      .then(data => {
        clearTimeout(timer);
        resolve(data);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
```

## Async/Await Patterns

### Sequential Async Operations

```typescript
async function processUserData(userId: string): Promise<void> {
  // Sequential execution
  const user = await fetchUser(userId);
  const posts = await fetchUserPosts(userId);
  const comments = await fetchUserComments(userId);

  // Process data
  const enriched = enrichUserData(user, posts, comments);
  await saveEnrichedData(enriched);
}
```

### Parallel Async Operations

```typescript
async function processUserDataParallel(userId: string): Promise<void> {
  // Parallel execution with Promise.all
  const [user, posts, comments] = await Promise.all([
    fetchUser(userId),
    fetchUserPosts(userId),
    fetchUserComments(userId)
  ]);

  const enriched = enrichUserData(user, posts, comments);
  await saveEnrichedData(enriched);
}
```

### Parallel with Error Isolation

```typescript
async function fetchMultipleData(): Promise<{
  users: User[] | null;
  posts: Post[] | null;
  comments: Comment[] | null;
}> {
  const results = await Promise.allSettled([
    fetchUsers(),
    fetchPosts(),
    fetchComments()
  ]);

  return {
    users: results[0].status === 'fulfilled' ? results[0].value : null,
    posts: results[1].status === 'fulfilled' ? results[1].value : null,
    comments: results[2].status === 'fulfilled' ? results[2].value : null
  };
}
```

## Race Patterns

### Timeout with Promise.race

```typescript
async function fetchWithRace<T>(
  url: string,
  timeout: number
): Promise<T> {
  const fetchPromise = fetch(url).then(r => r.json());

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeout);
  });

  return Promise.race([fetchPromise, timeoutPromise]);
}
```

## Retry Patterns

### Generic Retry Function

```typescript
async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const waitTime = backoff ? delay * attempt : delay;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}

// Usage
const data = await retry(
  () => fetch('/api/data').then(r => r.json()),
  { maxAttempts: 5, delay: 1000, backoff: true }
);
```

## Error Handling Patterns

### Typed Error Results

```typescript
type AsyncResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function safeAsync<T>(
  fn: () => Promise<T>
): Promise<AsyncResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

// Usage
const result = await safeAsync(() => fetchUser('123'));

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

## Async Iterators

### Async Generator Functions

```typescript
async function* fetchPaginatedData(url: string) {
  let nextUrl: string | null = url;

  while (nextUrl) {
    const response = await fetch(nextUrl);
    const data = await response.json();

    yield data.items;

    nextUrl = data.nextUrl || null;
  }
}

// Usage
for await (const page of fetchPaginatedData('/api/items')) {
  console.log('Page:', page);
}
```

## Event Handling

### Typed Event Emitter

```typescript
type EventMap = Record<string, any>;

type EventKey<T extends EventMap> = string & keyof T;

type EventListener<T> = (payload: T) => void;

class TypedEventEmitter<TEvents extends EventMap> {
  private listeners: Map<keyof TEvents, Set<EventListener<any>>> = new Map();

  on<K extends EventKey<TEvents>>(
    event: K,
    listener: EventListener<TEvents[K]>
  ): void {
    const existing = this.listeners.get(event) || new Set();
    existing.add(listener);
    this.listeners.set(event, existing);
  }

  off<K extends EventKey<TEvents>>(
    event: K,
    listener: EventListener<TEvents[K]>
  ): void {
    const existing = this.listeners.get(event);
    if (existing) {
      existing.delete(listener);
    }
  }

  emit<K extends EventKey<TEvents>>(
    event: K,
    payload: TEvents[K]
  ): void {
    const existing = this.listeners.get(event);
    if (existing) {
      existing.forEach(listener => listener(payload));
    }
  }
}

// Usage
type AppEvents = {
  userLoggedIn: { userId: string; timestamp: number };
  dataLoaded: { data: string[] };
};

const emitter = new TypedEventEmitter<AppEvents>();

emitter.on('userLoggedIn', (payload) => {
  // payload is typed as { userId: string; timestamp: number }
  console.log(`User ${payload.userId} logged in`);
});
```

## Observable-like Patterns

### Simple Async Observable

```typescript
type Unsubscribe = () => void;

type Observer<T> = {
  next?: (value: T) => void;
  error?: (error: Error) => void;
  complete?: () => void;
};

class Observable<T> {
  constructor(
    private subscribe: (
      observer: Observer<T>
    ) => Unsubscribe
  ) {}

  subscribe(observer: Observer<T>): Unsubscribe {
    return this.subscribe(observer);
  }

  pipe<R>(operator: (source: Observable<T>) => Observable<R>): Observable<R> {
    return operator(this);
  }
}

// Usage
const numbers$ = new Observable<number>(observer => {
  let i = 0;
  const interval = setInterval(() => {
    observer.next?.(i++);
  }, 1000);

  return () => clearInterval(interval);
});
```

## Queue Patterns

### Async Queue

```typescript
class AsyncQueue<T> {
  private queue: T[] = [];
  private pendingPromise: Promise<void> | null = null;

  async enqueue(item: T): Promise<void> {
    this.queue.push(item);

    if (!this.pendingPromise) {
      this.pendingPromise = this.process();
    }

    return this.pendingPromise;
  }

  private async process(): Promise<void> {
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        await this.processItem(item);
      }
    }

    this.pendingPromise = null;
  }

  private async processItem(item: T): Promise<void> {
    // Process item
  }
}
```

## Best Practices

1. **Always type Promise return values** for public APIs
2. **Use Promise.all** for parallel operations
3. **Use Promise.allSettled** when you need all results, even failures
4. **Use Promise.race** for timeout patterns
5. **Type error results** for better error handling
6. **Use async generators** for streaming data
7. **Type event payloads** for event emitters

## Related References

- `type-system.md` - Generic types for async functions
- `api-design.md` - Async API design patterns
- `testing-strategy.md` - Testing async code
