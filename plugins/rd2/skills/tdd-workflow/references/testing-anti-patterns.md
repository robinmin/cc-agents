# Testing Anti-Patterns

Comprehensive guide to testing anti-patterns, adapted from the reference implementation with additional insights from 2025 research.

## Overview

Tests must verify real behavior, not mock behavior. Mocks are a means to isolate, not the thing being tested.

**Core principle:** Test what the code does, not what the mocks do.

**Following strict TDD prevents these anti-patterns.**

## The Iron Laws

```
1. NEVER test mock behavior
2. NEVER add test-only methods to production classes
3. NEVER mock without understanding dependencies
```

## Anti-Pattern 1: Testing Mock Behavior

**The violation:**
```typescript
// BAD: Testing that the mock exists
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
});
```

**Why this is wrong:**
- You're verifying the mock works, not that the component works
- Test passes when mock is present, fails when it's not
- Tells you nothing about real behavior

**The fix:**
```typescript
// GOOD: Test real component or don't mock it
test('renders sidebar', () => {
  render(<Page />);  // Don't mock sidebar
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});
```

### Gate Function

```
BEFORE asserting on any mock element:
  Ask: "Am I testing real component behavior or just mock existence?"

  IF testing mock existence:
    STOP - Delete the assertion or unmock the component

  Test real behavior instead
```

## Anti-Pattern 2: Test-Only Methods in Production

**The violation:**
```typescript
// BAD: destroy() only used in tests
class Session {
  async destroy() {
    await this._workspaceManager?.destroyWorkspace(this.id);
    // ... cleanup
  }
}
```

**Why this is wrong:**
- Production class polluted with test-only code
- Dangerous if accidentally called in production
- Violates YAGNI and separation of concerns

**The fix:**
```typescript
// GOOD: Test utilities handle test cleanup
// Session has no destroy() - it's stateless in production

// In test-utils/
export async function cleanupSession(session: Session) {
  const workspace = session.getWorkspaceInfo();
  if (workspace) {
    await workspaceManager.destroyWorkspace(workspace.id);
  }
}
```

### Gate Function

```
BEFORE adding any method to production class:
  Ask: "Is this only used by tests?"

  IF yes:
    STOP - Don't add it
    Put it in test utilities instead
```

## Anti-Pattern 3: Mocking Without Understanding

**The violation:**
```typescript
// BAD: Mock breaks test logic
test('detects duplicate server', () => {
  // Mock prevents config write that test depends on!
  vi.mock('ToolCatalog', () => ({
    discoverAndCacheTools: vi.fn().mockResolvedValue(undefined)
  }));

  await addServer(config);
  await addServer(config);  // Should throw - but won't!
});
```

**Why this is wrong:**
- Mocked method had side effect test depended on
- Over-mocking to "be safe" breaks actual behavior

**The fix:**
```typescript
// GOOD: Mock at correct level
test('detects duplicate server', () => {
  // Mock the slow part, preserve behavior test needs
  vi.mock('MCPServerManager');

  await addServer(config);  // Config written
  await addServer(config);  // Duplicate detected
});
```

### Gate Function

```
BEFORE mocking any method:
  STOP - Don't mock yet

  1. Ask: "What side effects does the real method have?"
  2. Ask: "Does this test depend on any of those side effects?"
  3. Ask: "Do I fully understand what this test needs?"

  IF depends on side effects:
    Mock at lower level (the actual slow/external operation)
```

## Anti-Pattern 4: Incomplete Mocks

**The violation:**
```typescript
// BAD: Partial mock - only fields you think you need
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' }
  // Missing: metadata that downstream code uses
};
```

**Why this is wrong:**
- Partial mocks hide structural assumptions
- Downstream code may depend on fields you didn't include
- Tests pass but integration fails

**The fix:**
```typescript
// GOOD: Mirror real API completeness
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' },
  metadata: { requestId: 'req-789', timestamp: 1234567890 }
};
```

### Gate Function

```
BEFORE creating mock responses:
  Check: "What fields does the real API response contain?"

  Actions:
    1. Examine actual API response from docs/examples
    2. Include ALL fields system might consume downstream
```

## Anti-Pattern 5: Testing Implementation Details

**The violation:**
```typescript
// BAD: Testing internal state
expect(component.state.count).toBe(5)

// BAD: Testing private methods
expect(component._internalMethod()).toBeTruthy()
```

**Why this is wrong:**
- Tests break when implementation changes (even if behavior is same)
- Brittle tests that don't verify user-visible behavior
- Makes refactoring dangerous

**The fix:**
```typescript
// GOOD: Test user-visible behavior
expect(screen.getByText('Count: 5')).toBeInTheDocument()
expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled()
```

### Gate Function

```
BEFORE writing an assertion:
  Ask: "Would a user care about this?"

  IF no (internal state, private method):
    STOP - Test the user-visible behavior instead
```

## Anti-Pattern 6: Overmocking

**The violation:**
```typescript
// BAD: Mocking everything "to be safe"
vi.mock('database');
vi.mock('cache');
vi.mock('logger');
vi.mock('validator');
vi.mock('utils');

test('creates user', () => {
  // What are we actually testing?
});
```

**Why this is wrong:**
- Mocking is a code smell indicating tight coupling
- Tests test situations guaranteed to pass due to perfect mocks
- Doesn't verify real integration behavior

**The fix:**
```typescript
// GOOD: Mock only external dependencies
vi.mock('database');  // Slow, external

test('creates user', () => {
  // Test verifies real logic, dependencies are isolated
});
```

## Anti-Pattern 7: Brittle Selectors

**The violation:**
```typescript
// BAD: CSS class selectors break easily
await page.click('.css-class-xyz');
expect(page.locator('.container .item')).toHaveCount(5);

// BAD: Implementation details
expect(page.locator('div > div > span')).toBeVisible();
```

**Why this is wrong:**
- Breaks when CSS changes
- Dependent on DOM structure
- Hard to maintain

**The fix:**
```typescript
// GOOD: Semantic selectors
await page.click('button:has-text("Submit")');
await page.click('[data-testid="submit-button"]');
await page.click('role=button[name="Submit"]');
```

## Anti-Pattern 8: No Test Isolation

**The violation:**
```typescript
// BAD: Tests depend on each other
test('creates user', () => {
  const user = createUser({ name: 'Alice' });
  // User saved to shared state
});

test('updates user', () => {
  // Depends on previous test creating user
  const user = getUserByName('Alice');
  user.name = 'Bob';
  updateUser(user);
});
```

**Why this is wrong:**
- Tests can't run independently
- Order-dependent tests
- Hard to debug failures

**The fix:**
```typescript
// GOOD: Each test sets up its own data
test('creates user', () => {
  const user = createUser({ name: 'Alice' });
  expect(user.name).toBe('Alice');
});

test('updates user', () => {
  // Setup own data
  const user = createUser({ name: 'Charlie' });
  user.name = 'Bob';
  updateUser(user);
  expect(user.name).toBe('Bob');
});
```

## Anti-Pattern 9: Tests That Pass Immediately

**The violation:**
```typescript
// Write test after code
test('calculates sum', () => {
  expect(sum(2, 3)).toBe(5);  // Passes immediately
});
```

**Why this is wrong:**
- Passing immediately proves nothing
- Might test wrong thing
- Never saw test catch the bug

**The fix:**
```typescript
// Write test FIRST, watch it fail
test('calculates sum', () => {
  expect(sum(2, 3)).toBe(5);  // Fails: sum doesn't exist yet
});

// Implement after seeing failure
function sum(a, b) { return a + b; }
```

## Anti-Pattern 10: Tests As Afterthought

**The violation:**
```
Implementation complete
No tests written
"Ready for testing"
```

**Why this is wrong:**
- Testing is part of implementation, not optional follow-up
- TDD would have caught this

**The fix:**
```
TDD cycle:
1. Write failing test
2. Implement to pass
3. Refactor
4. THEN claim complete
```

## Red Flags Checklist

Stop and re-evaluate if you see:
- [ ] Assertion checks for `*-mock` test IDs
- [ ] Methods only called in test files
- [ ] Mock setup is >50% of test
- [ ] Test fails when you remove mock
- [ ] Can't explain why mock is needed
- [ ] Mocking "just to be safe"
- [ ] Testing internal state or private methods
- [ ] CSS class-based selectors in E2E tests
- [ ] Tests depend on execution order
- [ ] Tests pass immediately on first run

## Quick Reference

| Anti-Pattern | Fix |
|--------------|-----|
| Assert on mock elements | Test real component or unmock it |
| Test-only methods in production | Move to test utilities |
| Mock without understanding | Understand dependencies first |
| Incomplete mocks | Mirror real API completely |
| Testing implementation | Test user-visible behavior |
| Overmocking | Mock only external dependencies |
| Brittle selectors | Use semantic selectors |
| No test isolation | Each test sets up its own data |
| Tests pass immediately | Write test first, watch it fail |
| Tests as afterthought | TDD - tests first |

## The Bottom Line

**Mocks are tools to isolate, not things to test.**

If TDD reveals you're testing mock behavior, you've gone wrong.

Fix: Test real behavior or question why you're mocking at all.

---

For more details on TDD best practices, see: `references/research-consolidation-2025.md`
