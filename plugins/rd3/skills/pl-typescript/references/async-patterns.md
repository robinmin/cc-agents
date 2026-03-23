---
name: async-patterns
description: "TypeScript async patterns: Promises, async/await, retry, error handling, async iterators, typed event emitters, and observable patterns."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [typescript, async, promises, concurrency, patterns, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions:
    - knowledge-only
see_also:
  - rd3:pl-typescript
  - rd3:pl-typescript/references/type-system
  - rd3:pl-typescript/references/api-design
---

# Async Patterns in TypeScript

TypeScript's type system provides excellent support for async patterns including Promises, async/await, and event handling.

## Promise Basics

### Promise Return Types

```typescript
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
  const user = await fetchUser(userId);
  const posts = await fetchUserPosts(userId);
  const comments = await fetchUserComments(userId);
  const enriched = enrichUserData(user, posts, comments);
  await saveEnrichedData(enriched);
}
```

### Parallel Async Operations

```typescript
async function processUserDataParallel(userId: string): Promise<void> {
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
}> {
  const results = await Promise.allSettled([
    fetchUsers(),
    fetchPosts()
  ]);

  return {
    users: results[0].status === 'fulfilled' ? results[0].value : null,
    posts: results[1].status === 'fulfilled' ? results[1].value : null
  };
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

for await (const page of fetchPaginatedData('/api/items')) {
  console.log('Page:', page);
}
```

## Event Handling

### Typed Event Emitter

```typescript
type EventMap = Record<string, any>;

class TypedEventEmitter<TEvents extends EventMap> {
  private listeners: Map<keyof TEvents, Set<(payload: any) => void>> = new Map();

  on<K extends keyof TEvents>(
    event: K,
    listener: (payload: TEvents[K]) => void
  ): void {
    const existing = this.listeners.get(event) || new Set();
    existing.add(listener);
    this.listeners.set(event, existing);
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const existing = this.listeners.get(event);
    if (existing) {
      existing.forEach(listener => listener(payload));
    }
  }
}
```

## Best Practices

1. Always type Promise return values for public APIs
2. Use Promise.all for parallel operations
3. Use Promise.allSettled when you need all results, even failures
4. Use Promise.race for timeout patterns
5. Type error results for better error handling
6. Use async generators for streaming data
7. Type event payloads for event emitters
