# Tests for publish-to-xhs

This directory contains unit tests for the publish-to-xhs skill.

## Running Tests

### Run all tests
```bash
cd /Users/robin/projects/cc-agents/plugins/wt/skills/publish-to-xhs
bun test
```

### Run with coverage
```bash
bun test --coverage
```

### Run specific test file
```bash
bun test xhs-utils.test.ts
```

### Run via Makefile (from project root)
```bash
make test-one2 DIR=plugins/wt/skills/publish-to-xhs
```

## Test Structure

```
tests/
├── fixtures/          # Test data files
│   └── markdown-samples.md
├── utils/             # Shared test utilities (to be added)
├── xhs-utils.test.ts  # Tests for xhs-utils.ts
├── cdp.test.ts        # Tests for cdp.ts
├── xhs-article.test.ts # Tests for xhs-article.ts
├── bun.config.ts      # Bun test configuration
└── README.md          # This file
```

## Coverage Goals

- Target: 85%+ coverage
- All utility functions tested
- Error paths tested
- Edge cases covered

## Test Patterns

1. **Unit Tests**: Test individual functions in isolation
2. **Mocking**: Use bun's built-in mock functions for external dependencies
3. **Fixtures**: Use test fixtures for consistent test data
4. **AAA Pattern**: Arrange-Act-Assert for clear test structure

## Common Issues

### WebSocket Mocking
The CDP tests mock the WebSocket class. In bun, we use:
```typescript
global.WebSocket = MockWebSocket;
```

### File System Mocking
Use `mock.module()` to mock imports:
```typescript
mock.module('../scripts/xhs-utils.js', () => ({
  someFunction: mock(() => {}),
}));
```

## Adding New Tests

When adding new tests:

1. Create a new `*.test.ts` file
2. Use descriptive test names
3. Follow the AAA pattern
4. Mock external dependencies
5. Test both success and error paths
6. Run tests before committing
