---
name: sys-debugging-common-patterns
description: "Common bug patterns: null/undefined handling, race conditions, async issues, memory leaks, and type errors with root cause indicators."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-24
tags: [debugging, common-patterns, null-checks, race-conditions, async]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions:
    - knowledge-only
see_also:
  - rd3:sys-debugging
  - rd3:sys-debugging/references/examples
  - rd3:sys-debugging/references/techniques
---

# Common Bug Patterns

Recognizable patterns with their root causes and detection methods.

## Null/Undefined Handling

### Silent None Propagation

**Symptom:** `TypeError: 'NoneType' object is not subscriptable`

**Root Cause Pattern:**
```python
# Function returns None for edge case
def get_user(user_id):
    user = db.query(user_id)
    return user  # Returns None if not found

# Caller uses result directly
name = get_user(123)["name"]  # Crashes if user is None
```

**Fix Pattern:**
```python
# Return explicit value or raise exception
def get_user(user_id):
    user = db.query(user_id)
    if user is None:
        raise UserNotFoundError(user_id)
    return user

# Or return sentinel with clear meaning
def get_user(user_id):
    user = db.query(user_id)
    return user  # Caller checks for None explicitly
```

**Detection:**
- Static analysis: `mypy --strict` catches many cases
- Runtime: Add null checks at boundary entry points

### Optional Chaining Blindness

**Symptom:** `Cannot read property 'x' of undefined`

**Root Cause Pattern:**
```typescript
// Assuming nested property exists
const city = user.profile.address.city;

// Fails if any intermediate is undefined
```

**Fix Pattern:**
```typescript
// Optional chaining with fallback
const city = user?.profile?.address?.city ?? "Unknown";

// Or explicit check
const city = user.profile && user.profile.address
  ? user.profile.address.city
  : "Unknown";
```

## Race Conditions

### Async Ordering

**Symptom:** Test passes sometimes, fails others — "flaky"

**Root Cause Pattern:**
```typescript
// Test doesn't wait for async operation
it("creates order", async () => {
  await createOrder(orderData);
  const status = getOrderStatus(orderId);  // Might not be updated yet
  expect(status).toBe("created");
});
```

**Fix Pattern:**
```typescript
// Wait for actual completion
it("creates order", async () => {
  await createOrder(orderData);
  await waitForOrderStatus(orderId, "created");  // Poll until ready
  const status = getOrderStatus(orderId);
  expect(status).toBe("created");
});
```

**Detection:**
- Run tests multiple times: `npm test -- --count=5`
- Use `--detectOpenHandles` in Jest
- Add logging to identify timing issues

### Shared Mutable State

**Symptom:** Test A fails when run after Test B

**Root Cause Pattern:**
```javascript
// Global state shared between tests
let currentUser;

beforeEach(() => {
  currentUser = createDefaultUser();  // Mutates global
});
```

**Fix Pattern:**
```javascript
// Isolate state per test
beforeEach(() => {
  // Fresh state for each test
  currentUser = createDefaultUser();
});

afterEach(() => {
  // Clean up
  currentUser = null;
});
```

## Async/Await Issues

### Unhandled Promise Rejection

**Symptom:** Process crashes with "UnhandledPromiseRejectionWarning"

**Root Cause Pattern:**
```javascript
// Fire and forget without error handling
async function sendEmail(user) {
  await emailService.send(user.email);  // If this throws, unhandled
}

// Or
somePromise.catch(() => {});  // Silent swallow
```

**Fix Pattern:**
```javascript
// Always handle rejections
async function sendEmail(user) {
  try {
    await emailService.send(user.email);
  } catch (error) {
    logger.error("Failed to send email", { user: user.id, error });
    // Decide: retry, queue for retry, or alert
  }
}

// If intentionally fire-and-forget, document it
async function sendEmailFireForget(user) {
  emailService.send(user.email).catch(err =>
    logger.error("Email failed (non-critical)", { err })
  );
}
```

**Detection:**
```bash
# Node: Catch unhandled rejections
node --unhandled-rejections=strict script.js
```

### Promise vs Callback Mixing

**Symptom:** Code runs but results are wrong — "works but..."

**Root Cause Pattern:**
```javascript
// Mixing callbacks and promises
function getData(callback) {
  return fetch("/api/data")  // Returns promise
    .then(res => res.json())
    .then(data => callback(data));  // But also calls callback
}

// Caller uses promise
const result = await getData();
result.then ? /* promise handling */ : /* callback handling */;
```

**Fix Pattern:**
```javascript
// Choose one pattern consistently
async function getData() {
  const res = await fetch("/api/data");
  return res.json();
}

// Or use callbacks consistently
function getData(callback) {
  fetch("/api/data")
    .then(res => res.json())
    .then(data => callback(null, data))
    .catch(err => callback(err));
}
```

## Memory Leaks

### Event Listener Accumulation

**Symptom:** Memory grows over time and the application becomes progressively slower

**Root Cause Pattern:**
```javascript
// Adding listeners without removal
class Component {
  constructor() {
    eventBus.on("data", this.handleData);  // Added every mount
  }

  // If no unmount cleanup:
  // - Multiple mounts = duplicate listeners
  // - Old listeners hold references to old component instances
}
```

**Fix Pattern:**
```javascript
class Component {
  constructor() {
    this.handleData = this.handleData.bind(this);
    eventBus.on("data", this.handleData);
  }

  destroy() {
    eventBus.off("data", this.handleData);  // Clean up
  }
}

// React pattern
useEffect(() => {
  eventBus.on("data", handleData);
  return () => eventBus.off("data", handleData);  // Cleanup on unmount
}, []);
```

**Detection:**
```bash
# Chrome DevTools
# 1. Take heap snapshot
# 2. Perform action (e.g., navigate, open/close modal)
# 3. Take another snapshot
# 4. Compare - look for detached DOM nodes or accumulated listeners
```

### Closure Memory Retention

**Symptom:** Large data structures never freed

**Root Cause Pattern:**
```javascript
function processData(data) {
  // Closure captures large data
  return function transform() {
    return data.map(x => x * 2);  // 'data' retained as long as transform exists
  };
}

const transformer = processData(hugeArray);
// hugeArray can't be garbage collected as long as transformer exists
```

**Fix Pattern:**
```javascript
function processData(data) {
  // Extract only what you need
  const processed = data.map(x => x * 2);
  return function transform() {
    return processed;  // Only keeps processed result
  };
}

// Or process immediately if transformation not needed later
function processData(data) {
  const result = data.map(x => x * 2);
  return result;  // Original data can be GC'd
}
```

## Type Errors

### Type Assertion Blindness

**Symptom:** `as` casting "works" but causes runtime errors

**Root Cause Pattern:**
```typescript
// Blindly casting without validation
const user = response.data as User;
console.log(user.profile.name);  // Crashes if profile is null
```

**Fix Pattern:**
```typescript
// Validate after assertion or use type guard
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "profile" in obj &&
    typeof (obj as any).profile === "object"
  );
}

if (isUser(response.data)) {
  console.log(response.data.profile.name);
}
```

### Missing Union Null Case

**Symptom:** `Unhandled case undefined` or wrong behavior

**Root Cause Pattern:**
```typescript
type Status = "pending" | "approved" | "rejected";

// Only handling known cases
switch (status) {
  case "pending": return "Waiting...";
  case "approved": return "Success!";
  case "rejected": return "Denied";
  // What if status is undefined?
}
```

**Fix Pattern:**
```typescript
// Handle all cases including unknown
switch (status) {
  case "pending": return "Waiting...";
  case "approved": return "Success!";
  case "rejected": return "Denied";
  default: {
    const exhaustive: never = status;
    throw new Error(`Unknown status: ${exhaustive}`);
  }
}
```

## Configuration Bugs

### Environment Variable Confusion

**Symptom:** Works locally, fails in production

**Root Cause Pattern:**
```javascript
// Using wrong env var name
const apiKey = process.env.API_KEY;  // Local: "dev-key"
// Production: "prod-key-12345" but var is "PROD_API_KEY"
```

**Fix Pattern:**
```javascript
// Check for presence and validate
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable is required");
}

// Or provide fallback
const apiKey = process.env.API_KEY ?? "default-dev-key";
```

**Detection:**
```bash
# Compare env vars between environments
diff <(env | sort) <(ssh prod 'env | sort')
```

### Default Override Bug

**Symptom:** Default value never applies

**Root Cause Pattern:**
```python
# Default value can never be used
def connect(host="localhost", port=5432):
    if host != None:  # Always true when called with default
        host = f"{host}.db.example.com"  # Transforms even defaults
```

**Fix Pattern:**
```python
# Apply transformation unconditionally
def connect(host="localhost", port=5432):
    actual_host = f"{host}.db.example.com"  # Always transform
    # ...
```

## Performance Bugs

### N+1 Queries

**Symptom:** Slow request, many database queries logged

**Root Cause Pattern:**
```python
# Query in loop
users = db.query("SELECT * FROM users")
for user in users:
    user.posts = db.query("SELECT * FROM posts WHERE user_id = ?", user.id)
# 1 query + N queries = N+1 problem
```

**Fix Pattern:**
```python
# Batch query
users = db.query("SELECT * FROM users")
user_ids = [u.id for u in users]
posts = db.query("SELECT * FROM posts WHERE user_id IN ?", user_ids)
posts_by_user = group_by(posts, "user_id")

for user in users:
    user.posts = posts_by_user.get(user.id, [])
```

**Detection:**
```python
# Django: django-debug-toolbar
# Rails: bullet gem
# SQL: Enable query logging and count queries per request
```

### Missing Index

**Symptom:** Slow query on large table, CPU spikes

**Root Cause Pattern:**
```sql
-- Query works on small data, slow on production
SELECT * FROM orders WHERE user_email = 'test@example.com'
-- No index on user_email column
```

**Fix Pattern:**
```sql
-- Add index for frequently queried columns
CREATE INDEX idx_orders_user_email ON orders(user_email);

-- Or composite index for multi-column queries
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

**Detection:**
```sql
-- Explain query plan
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_email = 'test@example.com';
-- Look for "Seq Scan" on large tables = missing index
```

## Connection & Resource Leaks

### Database Connection Leaking

**Symptom:** Database connections exhausted, new requests fail

**Root Cause Pattern:**
```go
func ProcessRequest(ctx context.Context) error {
    conn, err := db.Acquire(ctx)
    if err != nil {
        return err
    }
    // Missing conn.Release() on early returns

    if req.Amount > limit {
        return errors.New("amount too large")  // Connection leaked!
    }

    conn.Release()  // Only reached if no early return
    return nil
}
```

**Fix Pattern:**
```go
func ProcessRequest(ctx context.Context) error {
    conn, err := db.Acquire(ctx)
    if err != nil {
        return err
    }
    defer conn.Release()  // Always release on function exit

    if req.Amount > limit {
        return errors.New("amount too large")  // Connection released via defer
    }

    return nil
}
```

### HTTP Client Connection Pool Exhaustion

**Symptom:** HTTP requests hang, timeout errors

**Root Cause Pattern:**
```go
// Creating new client per request
func handler(w http.ResponseWriter, r *http.Request) {
    client := &http.Client{}  // New client each time, no connection reuse
    resp, err := client.Get("https://api.example.com/data")
    // ...
}
```

**Fix Pattern:**
```go
// Reuse HTTP client at package level
var client = &http.Client{
    Timeout: 30 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
        IdleConnTimeout:     90 * time.Second,
    },
}

func handler(w http.ResponseWriter, r *http.Request) {
    resp, err := client.Get("https://api.example.com/data")
    // ...
}
```

## Quick Pattern Detection Checklist

When debugging, check for these common patterns:

- [ ] Null/undefined not handled at boundary
- [ ] Async operations without proper waiting
- [ ] Shared mutable state between tests/requests
- [ ] Event listeners not cleaned up
- [ ] Promise rejections silently swallowed
- [ ] Type assertions without validation
- [ ] Configuration differs between environments
- [ ] Queries in loops (N+1)
- [ ] Missing database indexes
- [ ] Memory retained by closures
- [ ] Connections released on all code paths
- [ ] Error handling missing on early returns
