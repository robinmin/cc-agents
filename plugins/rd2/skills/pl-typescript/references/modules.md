# TypeScript Modules Reference

Complete guide to TypeScript module systems including ESM, CommonJS, dual packages, and monorepo setup.

## Table of Contents

1. [Module Systems](#module-systems)
2. [ESM (ECMAScript Modules)](#esm-ecmascript-modules)
3. [CommonJS Modules](#commonjs-modules)
4. [Dual Packages](#dual-packages)
5. [Monorepo Modules](#monorepo-modules)
6. [Module Resolution](#module-resolution)
7. [Path Aliases](#path-aliases)

---

## Module Systems

### System Comparison

| System | Syntax | Environment | Use Case |
|--------|--------|-------------|----------|
| **ESM** | `import`/`export` | Modern browsers, Node.js 13+ | New projects, libraries |
| **CommonJS** | `require`/`module.exports` | Legacy Node.js | Legacy projects |
| **Dual Package** | Both | Any | Library distribution |
| **UMD** | Universal | Browser + Node.js | Legacy libraries |

---

## ESM (ECMAScript Modules)

### Basic Syntax

```typescript
// Named exports
export const PI = 3.14159;
export function add(a: number, b: number): number {
  return a + b;
}
export class Calculator {
  // ...
}

// Named imports
import { PI, add, Calculator } from './math';

// Default export
export default class UserService {
  // ...
}

// Default import
import UserService from './UserService';

// Mixed exports
export { add, subtract };
export default multiply;

// Mixed imports
import multiply, { add, subtract } from './math';

// Namespace import
import * as math from './math';
math.add(1, 2);
```

### Re-exports

```typescript
// Re-export named exports
export { add, subtract } from './math';

// Re-export as renamed
export { add as sum, subtract as diff } from './math';

// Re-export default as named
export { default as Calculator } from './Calculator';

// Re-export everything
export * from './utils';
```

### Dynamic Imports

```typescript
// Dynamic import (returns Promise)
async function loadModule() {
  const { add } = await import('./math');
  return add(1, 2);
}

// Dynamic import with type
async function loadModule() {
  const module = await import<typeof import('./math')>('./math');
  return module.add(1, 2);
}

// Lazy loading
const loadCalculator = () => import('./Calculator').then(m => m.Calculator);
```

### Top-Level Await (ES2022)

```typescript
// Requires ES2022 target
// tsconfig.json: { "target": "ES2022" }

const data = await fetch('/api/data');
const config = await import('./config.json');
```

---

## CommonJS Modules

### Basic Syntax

```typescript
// Named exports
exports.PI = 3.14159;
exports.add = function(a: number, b: number): number {
  return a + b;
};

// Or using module.exports
module.exports = {
  PI: 3.14159,
  add: function(a: number, b: number): number {
    return a + b;
  }
};

// Default export
module.exports = class UserService {
  // ...
};

// Require
const math = require('./math');
const { add, PI } = require('./math');
const UserService = require('./UserService');
```

### Type Definitions

```typescript
// For CommonJS modules
declare module 'my-library' {
  export function foo(): string;
  export const bar: number;
}

// For CommonJS with default
declare module 'my-library' {
  const lib: {
    foo(): string;
    bar: number;
  };
  export = lib;
}
```

---

## Dual Packages

### Package Configuration

```json
// package.json
{
  "name": "my-lib",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils.js",
      "require": "./dist/utils.cjs",
      "types": "./dist/utils.d.ts"
    }
  },
  "types": "./dist/index.d.ts"
}
```

### Conditional Exports

```json
{
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  }
}
```

### Build Setup

```json
// tsconfig.json
{
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"]
}
```

```javascript
// build script (using tsup or esbuild)
// build.cjs
import esbuild from 'esbuild';

async function build() {
  // ESM build
  await esbuild.build({
    entryPoints: ['src/index.ts'],
    format: 'esm',
    outfile: 'dist/index.js',
    platform: 'neutral'
  });

  // CommonJS build
  await esbuild.build({
    entryPoints: ['src/index.ts'],
    format: 'cjs',
    outfile: 'dist/index.cjs',
    platform: 'neutral'
  });
}

build();
```

---

## Monorepo Modules

### Project References

```json
// tsconfig.json (root)
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/server" },
    { "path": "./packages/client" }
  ]
}
```

```json
// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist"
  }
}
```

```json
// packages/server/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist"
  },
  "references": [
    { "path": "../shared" }
  ]
}
```

### Workspace Import

```typescript
// packages/shared/index.ts
export const API_URL = 'https://api.example.com';
export function fetchData(): Promise<Data> { /* ... */ }

// packages/server/index.ts
import { API_URL, fetchData } from '@myapp/shared';
```

### package.json Workspace

```json
// package.json (root)
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ]
}
```

```json
// packages/shared/package.json
{
  "name": "@myapp/shared",
  "version": "1.0.0",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

---

## Module Resolution

### Resolution Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `classic` | TypeScript 1.6 resolution | Legacy projects |
| `node` | Node.js CommonJS resolution | Node.js < 13 |
| `node16` | Node.js ES modules | Node.js 16+ |
| `nodenext` | Latest Node.js resolution | Node.js 18+ |
| `bundler` | Bundler-friendly | Vite, webpack, esbuild |

### Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    // For frontend with bundler
    "moduleResolution": "bundler",
    "module": "ESNext",

    // For Node.js ESM
    "moduleResolution": "nodenext",
    "module": "NodeNext",

    // For Node.js CommonJS
    "moduleResolution": "node",
    "module": "CommonJS"
  }
}
```

### Module Resolution Order

**ESM with `bundler` strategy:**
1. Check package.json `exports`
2. Check package.json `browser`
3. Check package.json `main`/`module`
4. Look for `index.ts`, `index.tsx`

**Node.js with `nodenext` strategy:**
1. Check package.json `exports` (with conditions)
2. Check package.json `main`
3. Look for file extensions: `.mts`, `.mjs`, `.ts`, `.js`
4. Try `index.mjs`, `index.js`

---

## Path Aliases

### Basic Path Mapping

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@components/*": ["components/*"],
      "@utils/*": ["utils/*"],
      "@types/*": ["types/*"],
      "@api/*": ["api/*"]
    }
  }
}
```

### Usage

```typescript
// Instead of:
import { Button } from '../../../components/Button';
import { format } from '../../../utils/format';

// Use:
import { Button } from '@components/Button';
import { format } from '@/utils/format';
```

### Bundler Configuration

**Vite:**
```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils')
    }
  }
});
```

**webpack:**
```javascript
// webpack.config.js
module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils')
    }
  }
};
```

**Jest:**
```javascript
// jest.config.js
module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1'
  }
};
```

---

## Module Best Practices

### 1. Use ESM for New Projects

```json
{
  "type": "module"
}
```

### 2. Use Explicit File Extensions (for Node.js)

```typescript
// Good
import { foo } from './foo.js';
import { bar } from '../bar/index.js';

// Avoid (works in bundlers but not Node.js)
import { foo } from './foo';
```

### 3. Use Barrel Exports for Clean APIs

```typescript
// src/index.ts
export * from './utils';
export * from './types';
export { default } from './App';
```

### 4. Use Type-Only Imports

```typescript
// Type-only import (erased at compile time)
import type { User } from './types';

// Mixed type and value import
import { UserService, type UserConfig } from './UserService';
```

### 5. Use Dynamic Imports for Code Splitting

```typescript
// Lazy load routes
const routes = {
  home: () => import('./routes/home'),
  about: () => import('./routes/about')
};

// Conditional imports
if (process.env.NODE_ENV === 'development') {
  const { devTools } = await import('./dev-tools');
  devTools.init();
}
```

---

## Common Patterns

### Singleton Pattern with Modules

```typescript
// config.ts
const config = {
  apiUrl: process.env.API_URL || 'https://api.example.com',
  debug: process.env.DEBUG === 'true'
};

export default config;
```

### Module Augmentation

```typescript
// Extend existing module
declare module 'express' {
  interface Request {
    user?: User;
  }
}
```

### Conditional Exports for Environments

```json
{
  "exports": {
    ".": {
      "node": "./dist/node.js",
      "default": "./dist/web.js"
    },
    "./react": {
      "import": "./dist/react.js",
      "types": "./dist/react.d.ts"
    }
  }
}
```

---

## Module Troubleshooting

### Common Errors

**Error: Cannot find module './foo'**
- Check file extension (use `.js` for Node.js ESM)
- Verify `baseUrl` and `paths` configuration
- Check file exists relative to importing file

**Error: Module parse failed: Unexpected token 'export'**
- Check `module` setting in tsconfig.json
- Verify `type: "module"` in package.json for Node.js
- Ensure build tool supports ESM

**Error: Can't resolve @/components**
- Configure bundler path aliases
- Verify tsconfig `baseUrl` and `paths`
- Check Jest/Vite/webpack configuration

### Debug Module Resolution

```bash
# Use TypeScript trace resolution
tsc --traceResolution --listFiles

# Check module resolution
tsc --noEmit
```
