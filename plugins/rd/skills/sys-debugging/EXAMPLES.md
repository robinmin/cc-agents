# Debugging Examples

Real-world debugging walkthroughs demonstrating the four-phase methodology.

## Example 1: TypeError in Python API

### The Error

```
TypeError: 'NoneType' object is not subscriptable
  File "api/handlers.py", line 45, in get_user_profile
    return {"name": user["name"], "email": user["email"]}
```

### Phase 1: Root Cause Investigation

**❌ Wrong approach (symptom-focused):**
```python
# Adding a null check where the error appears
def get_user_profile(user_id):
    user = db.get_user(user_id)
    if user is None:  # Patch at symptom location
        return {"error": "User not found"}
    return {"name": user["name"], "email": user["email"]}
```

**✅ Right approach (trace to origin):**

```
1. Symptom: TypeError at line 45
2. Immediate cause: `user` is None
3. What called this? → db.get_user(user_id)
4. Trace up: Where does user_id come from?
5. Original trigger: user_id extracted from JWT was invalid
```

```python
# Found: JWT parsing silently returns None for expired tokens
def extract_user_id(token):
    try:
        payload = jwt.decode(token, SECRET)
        return payload.get("user_id")  # Returns None if key missing!
    except jwt.ExpiredSignatureError:
        return None  # Silent failure - THE ROOT CAUSE
```

### Phase 2: Pattern Analysis

Compare with working authentication flow:
```python
# Working pattern in admin module
def extract_admin_id(token):
    try:
        payload = jwt.decode(token, SECRET)
        if "admin_id" not in payload:
            raise AuthenticationError("Invalid token payload")
        return payload["admin_id"]
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token expired")
```

**Difference identified:** Admin flow raises exceptions, user flow silently returns None.

### Phase 3: Hypothesis and Testing

**Hypothesis:** "The error occurs because expired/invalid tokens return None instead of raising an exception, allowing invalid user_ids to propagate."

**Test:**
```python
def test_expired_token_raises_exception():
    expired_token = create_token(user_id=123, expired=True)
    with pytest.raises(AuthenticationError):
        extract_user_id(expired_token)
```

**Result:** Test fails (confirms hypothesis) - function returns None instead of raising.

### Phase 4: Implementation

```python
# Fix at the source
def extract_user_id(token):
    try:
        payload = jwt.decode(token, SECRET)
        if "user_id" not in payload:
            raise AuthenticationError("Invalid token: missing user_id")
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token expired")
    except jwt.InvalidTokenError as e:
        raise AuthenticationError(f"Invalid token: {e}")
```

**Verification:**
- ✅ New test passes
- ✅ Existing tests pass
- ✅ Root cause addressed (not symptom)

---

## Example 2: Flaky Integration Test (TypeScript)

### The Error

```
FAIL tests/integration/checkout.test.ts
  ✕ should complete checkout flow (1523ms)

    Expected: "confirmed"
    Received: "pending"
```

Test passes ~70% of the time, fails ~30%.

### Phase 1: Root Cause Investigation

**Intermittent failure checklist:**
1. ✅ Race condition suspected
2. ✅ Async operation ordering
3. ✅ Timing dependencies

```typescript
// The test
it('should complete checkout flow', async () => {
  await createOrder(orderId);
  await processPayment(orderId);

  const status = await getOrderStatus(orderId);
  expect(status).toBe('confirmed');  // Sometimes 'pending'
});
```

**Trace the data flow:**
```
1. createOrder → inserts order with status='pending'
2. processPayment → calls external API, updates status on webhook
3. getOrderStatus → reads current status
```

**Found:** `processPayment` returns after sending request, not after webhook completes.

### Phase 2: Pattern Analysis

```typescript
// Working pattern in refund flow
it('should process refund', async () => {
  await processRefund(orderId);
  await waitForWebhook('refund.completed', orderId);  // Waits for event!

  const status = await getOrderStatus(orderId);
  expect(status).toBe('refunded');
});
```

**Difference:** Refund test waits for webhook; checkout test doesn't.

### Phase 3: Hypothesis and Testing

**Hypothesis:** "Test fails because it reads order status before payment webhook updates it."

**Diagnostic test:**
```typescript
it('diagnostic: check timing', async () => {
  await createOrder(orderId);
  await processPayment(orderId);

  // Add delay to confirm hypothesis
  await new Promise(r => setTimeout(r, 2000));

  const status = await getOrderStatus(orderId);
  expect(status).toBe('confirmed');
});
```

**Result:** With delay, test passes 100% of the time. Hypothesis confirmed.

### Phase 4: Implementation

```typescript
// Proper fix: wait for the webhook event
it('should complete checkout flow', async () => {
  await createOrder(orderId);
  await processPayment(orderId);
  await waitForWebhook('payment.completed', orderId, { timeout: 5000 });

  const status = await getOrderStatus(orderId);
  expect(status).toBe('confirmed');
});
```

**Not acceptable fixes:**
- ❌ Adding arbitrary `setTimeout` delays
- ❌ Retrying the assertion in a loop
- ❌ Marking test as "flaky" and ignoring

---

## Example 3: "It Worked Before" (Go)

### The Error

After merging PR #847, users report:
```
error: failed to parse config: unexpected end of JSON input
```

### Phase 1: Root Cause Investigation

**Use git bisect:**
```bash
git bisect start
git bisect bad HEAD
git bisect good v2.3.0

# After bisect completes:
# First bad commit: a1b2c3d "refactor: simplify config loading"
```

**Examine the breaking commit:**
```diff
// Before (working)
- data, err := ioutil.ReadFile(configPath)
- if err != nil {
-     return nil, fmt.Errorf("read config: %w", err)
- }

// After (broken)
+ data, _ := ioutil.ReadFile(configPath)  // Error ignored!
```

**Root cause:** Error from `ReadFile` is silently ignored, causing empty `data` to be parsed.

### Phase 2: Pattern Analysis

Every other file read in codebase handles errors:
```go
// Consistent pattern elsewhere
data, err := os.ReadFile(path)
if err != nil {
    return nil, fmt.Errorf("failed to read %s: %w", path, err)
}
```

### Phase 3: Hypothesis and Testing

**Hypothesis:** "Config parsing fails because file read errors are ignored, resulting in empty byte slice being parsed as JSON."

**Reproduce:**
```go
func TestConfigLoadWithMissingFile(t *testing.T) {
    _, err := LoadConfig("/nonexistent/path")
    if err == nil {
        t.Fatal("expected error for missing file")
    }
}
```

**Result:** Test fails - no error returned. Hypothesis confirmed.

### Phase 4: Implementation

```go
func LoadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read config file: %w", err)
    }

    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("parse config: %w", err)
    }

    return &cfg, nil
}
```

---

## Anti-Pattern Examples

### ❌ Symptom-Focused Fix

```python
# Bug: users see "undefined" in greeting
def greet(user):
    return f"Hello, {user.name}!"

# BAD: Fix where error appears
def greet(user):
    name = user.name if user.name else "Guest"  # Masks the real problem
    return f"Hello, {name}!"

# The actual bug is in user creation:
def create_user(data):
    return User(
        name=data["username"],  # Wrong key! Should be "name"
        email=data["email"]
    )
```

### ❌ "One More Try" Loop

```
Attempt 1: Add null check → New error in different location
Attempt 2: Add another null check → Third error appears
Attempt 3: Wrap in try/catch → Tests pass but behavior wrong
Attempt 4: ...

STOP! Three failures = architectural problem.
Step back and analyze the design.
```

### ❌ Magic Number Fix

```javascript
// Bug: API timeout errors
// BAD: Random timeout increase
fetch(url, { timeout: 30000 })  // Why 30 seconds?

// GOOD: Investigate why timeouts occur
// Found: downstream service cold starts take 8-12 seconds
// Fix: Add retry with backoff OR implement connection pooling
```

---

## Quick Reference: Debugging Commands

### Python
```bash
# Run with debugger
python -m pdb script.py

# Post-mortem debugging
python -m pdb -c continue script.py

# Verbose test output
pytest -v --tb=long tests/
```

### TypeScript/Node
```bash
# Debug with Chrome DevTools
node --inspect-brk dist/index.js

# Verbose Jest output
npx jest --verbose --detectOpenHandles

# Debug specific test
npx jest --runInBand --testNamePattern="checkout"
```

### Go
```bash
# Run with delve debugger
dlv debug ./cmd/app

# Verbose test output
go test -v ./...

# Run specific test with debugging
dlv test ./pkg/config -- -test.run TestConfigLoad
```

### Git Bisect
```bash
# Find breaking commit
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>
# Test each commit, mark good/bad
git bisect good  # or git bisect bad
# When done
git bisect reset
```
