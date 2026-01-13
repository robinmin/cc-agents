# Testing Patterns

## Unit Testing

### Test Structure (AAA Pattern)

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid input', () => {
      // Arrange
      const input = { name: 'John', email: 'john@example.com' };
      const userService = new UserService(mockRepo);

      // Act
      const result = userService.createUser(input);

      // Assert
      expect(result.name).toBe('John');
      expect(result.id).toBeDefined();
    });
  });
});
```

### Naming Convention

```
{methodName}_{scenario}_{expectedResult}

Examples:
- createUser_withValidInput_returnsUser
- createUser_withDuplicateEmail_throwsConflictError
- getUser_withNonExistentId_returnsNull
```

### Isolation Principles

| Principle | Description |
|-----------|-------------|
| Independent | Tests don't depend on each other |
| Isolated | Mock external dependencies |
| Deterministic | Same input = same result |
| Fast | Milliseconds, not seconds |

### Mocking Patterns

```typescript
// Mock function
const mockSave = jest.fn().mockResolvedValue({ id: '123' });

// Mock module
jest.mock('./userRepository', () => ({
  save: jest.fn().mockResolvedValue({ id: '123' }),
}));

// Spy on method
const spy = jest.spyOn(userService, 'validate');

// Mock implementation
mockFn.mockImplementation((x) => x * 2);
```

### What to Unit Test

| Test | Don't Test |
|------|------------|
| Business logic | Framework code |
| Edge cases | Third-party libraries |
| Error handling | Private methods directly |
| Input validation | Database queries |

## Integration Testing

### Database Setup/Teardown

```typescript
describe('UserRepository', () => {
  beforeAll(async () => {
    await database.connect();
    await database.migrate();
  });

  afterAll(async () => {
    await database.disconnect();
  });

  beforeEach(async () => {
    await database.truncate(['users']);
  });

  it('should persist user to database', async () => {
    const user = await repo.save({ name: 'John' });
    const found = await repo.findById(user.id);
    expect(found).toEqual(user);
  });
});
```

### API Testing

```typescript
describe('POST /api/users', () => {
  it('should create user and return 201', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com' })
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.name).toBe('John');
  });

  it('should return 400 for invalid email', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'invalid' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### Test Database Strategies

| Strategy | Pros | Cons |
|----------|------|------|
| In-memory (SQLite) | Fast, no setup | Not production-like |
| Docker containers | Production-like | Slower startup |
| Test schema | Fast, isolated | Schema sync issues |
| Transaction rollback | Fast | Complex with multiple connections |

## E2E Testing

### Page Object Pattern

```typescript
class LoginPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="submit"]');
  }

  async getErrorMessage() {
    return this.page.textContent('[data-testid="error"]');
  }
}

// Usage
const loginPage = new LoginPage(page);
await loginPage.navigate();
await loginPage.login('user@example.com', 'password');
```

### Selector Strategy

| Selector | Maintainability |
|----------|-----------------|
| `data-testid` | Best |
| `role` + `name` | Good (accessibility) |
| CSS class | Fragile |
| XPath | Last resort |

### E2E Test Guidelines

- Test critical user journeys only
- Use stable selectors (data-testid)
- Handle async properly (wait for elements)
- Clean up test data
- Run in isolated environment
- Keep tests independent

## Test Coverage

### Coverage Types

| Type | Measures |
|------|----------|
| Line | % of lines executed |
| Branch | % of branches taken |
| Function | % of functions called |
| Statement | % of statements executed |

### Coverage Guidelines

```
Minimum targets:
- Critical business logic: 90%+
- Service layer: 80%+
- API handlers: 70%+
- Utilities: 60%+
```

**Coverage is not quality** — 100% coverage doesn't mean bug-free.

## Test Data

### Factory Pattern

```typescript
const userFactory = {
  build: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    createdAt: new Date(),
    ...overrides,
  }),

  create: async (overrides = {}) => {
    const user = userFactory.build(overrides);
    return await db.users.create(user);
  },
};

// Usage
const user = userFactory.build({ name: 'Custom Name' });
const savedUser = await userFactory.create({ role: 'admin' });
```

### Fixture Pattern

```typescript
// fixtures/users.ts
export const validUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'ValidP@ss123',
};

export const invalidEmails = [
  'notanemail',
  '@nodomain.com',
  'spaces in@email.com',
];
```

## Test Pyramid

```
        /\
       /  \
      / E2E\     Few, slow, expensive
     /------\
    /  Integ \   Some, medium speed
   /----------\
  / Unit Tests \  Many, fast, cheap
 /==============\
```

| Layer | Quantity | Speed | Cost |
|-------|----------|-------|------|
| Unit | Many (70%) | Fast | Low |
| Integration | Some (20%) | Medium | Medium |
| E2E | Few (10%) | Slow | High |
