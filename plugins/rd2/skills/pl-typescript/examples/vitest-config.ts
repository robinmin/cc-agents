// Vitest Configuration Examples
// Demonstrates various Vitest configuration patterns for TypeScript projects

// ============================================
// Basic Vitest Configuration
// ============================================

// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist']
  }
});

// ============================================
// Browser Environment Configuration
// ============================================

// vitest.config.ts (for frontend code)
// import { defineConfig } from 'vitest/config';
//
// export default defineConfig({
//   test: {
//     globals: true,
//     environment: 'jsdom', // or 'happy-dom' for faster browser simulation
//     include: ['src/**/*.{test,spec}.{ts,tsx}'],
//     exclude: ['node_modules', 'dist'],
//     setupFiles: ['./test/setup.ts']
//   }
// });

// ============================================
// Coverage Configuration
// ============================================

// vitest.config.ts (with coverage)
// import { defineConfig } from 'vitest/config';
//
// export default defineConfig({
//   test: {
//     globals: true,
//     environment: 'node',
//     include: ['src/**/*.{test,spec}.{ts,tsx}'],
//     coverage: {
//       provider: 'v8', // or 'istanbul'
//       reporter: ['text', 'json', 'html', 'lcov'],
//       include: ['src/**/*.ts', 'src/**/*.tsx'],
//       exclude: [
//         'node_modules/',
//         'dist/',
//         'test/',
//         '**/*.test.ts',
//         '**/*.spec.ts',
//         '**/*.d.ts'
//       ],
//       thresholds: {
//         statements: 80,
//         branches: 80,
//         functions: 80,
//         lines: 80
//       },
//       all: true,
//       cleanOnRerun: true
//     }
//   }
// });

// ============================================
// Path Aliases Configuration
// ============================================

// vitest.config.ts (with path aliases)
// import { defineConfig } from 'vitest/config';
// import path from 'path';
//
// export default defineConfig({
//   resolve: {
//     alias: {
//       '@': path.resolve(__dirname, './src'),
//       '@components': path.resolve(__dirname, './src/components'),
//       '@utils': path.resolve(__dirname, './src/utils'),
//       '@types': path.resolve(__dirname, './src/types')
//     }
//   },
//   test: {
//     globals: true,
//     environment: 'node'
//   }
// });

// ============================================
// TypeScript Configuration Integration
// ============================================

// vitest.config.ts (with TypeScript)
// import { defineConfig } from 'vitest/config';
//
// export default defineConfig({
//   test: {
//     globals: true,
//     environment: 'node',
//     typecheck: {
//       enabled: true,
//       include: ['src/**/*.test.ts', 'src/**/*.test-d.ts'],
//       exclude: ['node_modules', 'dist']
//     }
//   }
// });

// ============================================
// ESM Configuration
// ============================================

// vitest.config.ts (for ESM projects)
// import { defineConfig } from 'vitest/config';
//
// export default defineConfig({
//   test: {
//     globals: true,
//     environment: 'node',
//     include: ['src/**/*.{test,spec}.{ts,tsx}']
//   }
// });

// ============================================
// Setup Files Configuration
// ============================================

// test/setup.ts
// import { vi, beforeEach, afterEach } from 'vitest';
//
// // Global test setup
// beforeEach(() => {
//   // Reset mocks before each test
//   vi.clearAllMocks();
// });
//
// afterEach(() => {
//   // Cleanup after each test
//   vi.restoreAllMocks();
// });
//
// // Mock global fetch
// global.fetch = vi.fn();
//
// // Extend Vitest's expect with custom matchers
// import { install } from '@vitest/expect';
// install();
//
// // Type testing setup
// import { expectType } from 'vitest';

// ============================================
// Multi-Environment Configuration
// ============================================

// vitest.config.ts (multiple environments)
// import { defineConfig } from 'vitest/config';
//
// export default defineConfig({
//   test: {
//     include: ['src/**/*.{test,spec}.{ts,tsx}'],
//     exclude: ['node_modules', 'dist'],
//     workspace: [
//       {
//         test: {
//           name: 'unit',
//           environment: 'node',
//           include: ['src/**/*.unit.test.ts']
//         }
//       },
//       {
//         test: {
//           name: 'integration',
//           environment: 'node',
//           include: ['src/**/*.integration.test.ts']
//         }
//       },
//       {
//         test: {
//           name: 'browser',
//           environment: 'jsdom',
//           include: ['src/**/*.browser.test.tsx']
//         }
//       }
//     ]
//   }
// });

// ============================================
// Benchmark Configuration
// ============================================

// vitest.config.ts (with benchmarks)
// import { defineConfig } from 'vitest/config';
//
// export default defineConfig({
//   test: {
//     include: ['src/**/*.{test,bench}.{ts,tsx}'],
//     benchmark: {
//       include: ['src/**/*.bench.ts'],
//       exclude: ['node_modules']
//     }
//   }
// });

// ============================================
// Example Test File
// ============================================

// src/utils/format.test.ts
// import { describe, it, expect, vi, beforeEach } from 'vitest';
// import { formatCurrency } from './format';
//
// describe('formatCurrency', () => {
//   it('formats USD currency', () => {
//     expect(formatCurrency(1000)).toBe('$1,000.00');
//   });
//
//   it('formats EUR currency', () => {
//     expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00');
//   });
// });

// ============================================
// Example Type Test File
// ============================================

// src/types/api.test-d.ts
// import { assertType, expectTypeOf } from 'vitest';
// import type { User, ApiResponse } from './api';
//
// // Test type structure
// expectTypeOf<User>().toHaveProperty('id');
// expectTypeOf<User>().toHaveProperty('name');
// expectTypeOf<User>().not.toHaveProperty('invalid');
//
// // Test generic types
// expectTypeOf<ApiResponse<User>>().toBeObject();
// expectTypeOf<ApiResponse<User>>().toHaveProperty('data');

// ============================================
// Mock Examples
// ============================================

// src/services/user.service.test.ts
// import { describe, it, expect, vi, beforeEach } from 'vitest';
// import { UserService } from './user.service';
//
// describe('UserService', () => {
//   let service: UserService;
//   let mockRepository: any;
//
//   beforeEach(() => {
//     mockRepository = {
//       findById: vi.fn(),
//       save: vi.fn()
//     };
//     service = new UserService(mockRepository);
//   });
//
//   it('fetches user by ID', async () => {
//     const mockUser = { id: '123', name: 'John' };
//     mockRepository.findById.mockResolvedValue(mockUser);
//
//     const user = await service.findById('123');
//
//     expect(user).toEqual(mockUser);
//     expect(mockRepository.findById).toHaveBeenCalledWith('123');
//   });
//
//   it('handles errors', async () => {
//     mockRepository.findById.mockRejectedValue(new Error('Not found'));
//
//     await expect(service.findById('999')).rejects.toThrow('Not found');
//   });
// });

// ============================================
// Integration Test Example
// ============================================

// test/integration/api.test.ts
// import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// import { app } from '../src/app';
//
// describe('User API Integration', () => {
//   let server: any;
//
//   beforeAll(() => {
//     server = app.listen(3001);
//   });
//
//   afterAll(() => {
//     server.close();
//   });
//
//   it('creates user via API', async () => {
//     const response = await fetch('http://localhost:3001/users', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         name: 'John Doe',
//         email: 'john@example.com'
//       })
//     });
//
//     expect(response.status).toBe(201);
//     const data = await response.json();
//     expect(data).toHaveProperty('id');
//   });
// });

// ============================================
// Complete Production Configuration
// ============================================

// vitest.config.ts
// import { defineConfig } from 'vitest/config';
// import react from '@vitejs/plugin-react';
// import path from 'path';
//
// export default defineConfig({
//   plugins: [react()],
//   resolve: {
//     alias: {
//       '@': path.resolve(__dirname, './src'),
//       '@components': path.resolve(__dirname, './src/components'),
//       '@utils': path.resolve(__dirname, './src/utils'),
//       '@types': path.resolve(__dirname, './src/types')
//     }
//   },
//   test: {
//     globals: true,
//     environment: 'jsdom',
//     include: ['src/**/*.{test,spec}.{ts,tsx}'],
//     exclude: ['node_modules', 'dist'],
//     setupFiles: ['./test/setup.ts'],
//     coverage: {
//       provider: 'v8',
//       reporter: ['text', 'json', 'html', 'lcov'],
//       include: ['src/**/*.ts', 'src/**/*.tsx'],
//       exclude: [
//         'node_modules/',
//         'dist/',
//         'test/',
//         '**/*.test.ts',
//         '**/*.spec.ts',
//         '**/*.d.ts',
//         'src/main.tsx'
//       ],
//       thresholds: {
//         statements: 80,
//         branches: 80,
//         functions: 80,
//         lines: 80
//       },
//       all: true
//     },
//     typecheck: {
//       enabled: true,
//       include: ['src/**/*.test-d.ts']
//     }
//   }
// });

// ============================================
// Example package.json Scripts
// ============================================

/*
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:watch": "vitest --watch",
    "type-check": "vitest --typecheck"
  }
}
*/
