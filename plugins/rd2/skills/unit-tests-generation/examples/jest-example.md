# Jest Setup Example

## Project Structure

```
project/
├── src/
│   └── auth.ts
├── tests/
│   ├── setup.ts
│   └── auth.test.ts
├── package.json
└── jest.config.js
```

## Configuration

### package.json

```json
{
  "name": "my-project",
  "version": "0.1.0",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.0.0"
  }
}
```

### jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: { branches: 85, functions: 85, lines: 85, statements: 85 }
  },
  coverageReporters: ['text', 'text-summary', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

### tests/setup.ts

```typescript
import { expect, afterEach } from '@jest/globals';

// Global mocks
global.console = { ...console, log: jest.fn(), debug: jest.fn() };

// Mock environment variables
process.env.DATABASE_URL = 'sqlite:///:memory:';
process.env.SECRET_KEY = 'test-secret-key';
process.env.NODE_ENV = 'test';
```

## Example Test File

### tests/auth.test.ts

```typescript
import { AuthService, InvalidCredentialsError, TokenExpiredError } from '../src/auth';

jest.mock('../src/user');

describe('AuthService', () => {
  let authService: AuthService;
  let mockRepo: jest.Mocked<UserRepository>;
  const sampleUser = { id: 1, username: 'testuser', email: 'test@example.com', isActive: true };

  beforeEach(() => {
    mockRepo = { findByUsername: jest.fn(), findById: jest.fn(), save: jest.fn() } as any;
    authService = new AuthService(mockRepo);
  });

  // Happy Path
  it('should login successfully', async () => {
    mockRepo.findByUsername.mockResolvedValue(sampleUser);
    const result = await authService.login('testuser', 'password');
    expect(result.token).toBeDefined();
  });

  // Edge Cases (parameterized)
  it.each([
    ['', 'password'],
    ['user', ''],
    [null, 'password'],
  ])('should reject empty credentials', async (username, password) => {
    await expect(authService.login(username, password)).rejects.toThrow(InvalidCredentialsError);
  });

  // Error Paths
  it('should reject wrong password', async () => {
    mockRepo.findByUsername.mockResolvedValue(sampleUser);
    await expect(authService.login('testuser', 'wrong_password')).rejects.toThrow(InvalidCredentialsError);
  });

  // Mock-Based Tests
  it('should verify external token', async () => {
    const mockFetch = jest.fn();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ verified: true }) });
    const result = await authService.verifyExternalToken('token');
    expect(result).toBe(true);
  });
});
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test
npm test -t "should login successfully"
```

### Expected Output

```
PASS  tests/auth.test.ts
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Time:        1.234s

--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   92.31 |    87.5  |     90  |   92.31 |
 auth.ts            |   94.44 |    85.71 |   88.88 |   94.44 |
--------------------|---------|----------|---------|---------|
```

## Common Issues

### Tests Not Found

**Fix:** Ensure files match pattern in jest.config.js: `testMatch: ['**/?(*.)+(spec|test).ts']`

### Type Errors

**Fix:** Add `preset: 'ts-jest'` and `transform: { '^.+\\.ts$': 'ts-jest' }`

### Module Not Found (Path Aliases)

**Fix:** Configure `moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }`

### Coverage Not Measured

**Fix:** Configure `collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts']`
