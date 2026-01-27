# TypeScript Tooling Guide

## Overview

TypeScript projects require various tools for building, testing, linting, and bundling. This reference covers modern tooling choices and configuration patterns.

## Build Tools

### Vite

**Recommended for:** Modern web applications, SPAs, component libraries

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lodash', 'axios']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
```

### esbuild

**Recommended for:** Maximum build speed, CLI tools

```typescript
// esbuild.config.ts
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  sourcemap: true,
  minify: true,
  target: 'es2020',
  format: 'esm',
  external: ['react', 'react-dom']
});
```

### tsup

**Recommended for:** Node.js libraries, dual packages

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2020'
});
```

### webpack

**Recommended for:** Complex legacy integrations, custom build needs

```typescript
// webpack.config.ts
import type { Configuration } from 'webpack';
import path from 'path';

const config: Configuration = {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: {
      type: 'module'
    }
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  }
};

export default config;
```

## Development Tools

### TypeScript Compiler

```json
// tsconfig.json
{
  "compilerOptions": {
    // Target
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],

    // Modules
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,

    // Emit
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "removeComments": true,

    // Interop Constraints
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,

    // Type Checking
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,

    // Path Mapping
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### ESLint

```javascript
// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**']
  }
];
```

### Prettier

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

## Package Managers

### npm

```bash
# Modern npm features
npm workspaces
npm exec
npm pkg
```

### pnpm

```bash
# Fast, disk space efficient
pnpm install
pnpm workspace
pnpm --filter <package> add <dependency>
```

### Yarn

```bash
# Yarn Berry (Yarn 2+)
yarn set version berry
yarn workspaces
```

## Testing Tools

### Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/']
    },
    setupFiles: ['./test/setup.ts']
  }
});
```

### Jest

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Playwright

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  }
});
```

## CI/CD Tools

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm run type-check
      - run: pnpm run lint
      - run: pnpm run test
      - run: pnpm run build
```

## Tool Selection Guide

| Use Case | Recommended Tool | Alternative |
|----------|-----------------|-------------|
| **Web App Build** | Vite | esbuild, webpack |
| **Node.js Library** | tsup | esbuild |
| **Monorepo** | Turbopack, Nx | Lerna |
| **Testing** | Vitest | Jest |
| **Linting** | ESLint + @typescript-eslint | Biome |
| **Formatting** | Prettier | Biome |
| **Package Manager** | pnpm | npm, Yarn |
| **CI/CD** | GitHub Actions | GitLab CI, CircleCI |

## Best Practices

1. **Use modern tools** - Vite, Vitest, pnpm for speed
2. **Consistent tooling** - Same tools across projects
3. **Type check in CI** - Don't skip type checking
4. **Lock files** - Commit lock files for reproducibility
5. **Cache dependencies** - Speed up CI builds
6. **Separate configs** - Different configs for dev/prod
7. **Workspace support** - Use monorepo tools for multi-package projects
8. **Automated releases** - semantic-release, changesets

## Related References

- `tsconfig-guide.md` - TypeScript configuration
- `testing-strategy.md` - Testing tool configuration
- `project-structures.md` - Tooling by project type
