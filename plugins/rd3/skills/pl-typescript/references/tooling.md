---
name: tooling
description: "TypeScript tooling guide: build tools (Vite, esbuild, tsup), Bun and Biome defaults, testing tools, package managers, and CI/CD integration."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [typescript, tooling, vite, esbuild, vitest, biome, bun, webpack, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions:
    - knowledge-only
see_also:
---

# TypeScript Tooling Guide

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

### Biome

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always"
    }
  }
}
```

### Bun Scripts

```json
// package.json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "biome lint .",
    "format": "biome format --write .",
    "test": "vitest run"
  }
}
```

### ESLint / Prettier Alternatives

```json
// Use these only when Biome is not a fit for the project.
{
  "linting": "ESLint + @typescript-eslint",
  "formatting": "Prettier"
}
```

## Package Managers

### Bun

```bash
# Fast package manager, runtime, and script runner
bun install
bun add -d typescript vitest @biomejs/biome
bun run typecheck
```

### npm / pnpm / Yarn

```bash
# Viable alternatives when Bun is not available
npm install
pnpm install
yarn install
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

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun run lint
      - run: bun run test
      - run: bun run build
```

## Tool Selection Guide

| Use Case | Recommended Tool | Alternative |
|----------|-----------------|-------------|
| **Web App Build** | Vite | esbuild, webpack |
| **Node.js Library** | tsup | esbuild |
| **Monorepo** | Turbopack, Nx | Lerna |
| **Testing** | Vitest | Jest |
| **Linting** | Biome | ESLint + @typescript-eslint |
| **Formatting** | Biome | Prettier |
| **Package Manager** | Bun | pnpm, npm, Yarn |
| **CI/CD** | GitHub Actions | GitLab CI, CircleCI |

## Best Practices

1. **Use modern tools** - Vite, Vitest, Bun, and Biome for fast feedback
2. **Consistent tooling** - Same tools across projects
3. **Type check in CI** - Don't skip type checking
4. **Lock files** - Commit lock files for reproducibility
5. **Cache dependencies** - Speed up CI builds
6. **Separate configs** - Different configs for dev/prod
7. **Workspace support** - Use monorepo tools for multi-package projects
8. **Automated releases** - semantic-release, changesets
