---
name: modules
description: "TypeScript module systems: ESM, CommonJS, dual packages, monorepo setup, module resolution, and path aliases."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [typescript, modules, esm, commonjs, monorepo, architecture-design]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:pl-typescript
  - rd3:pl-typescript/references/tsconfig-guide
  - rd3:pl-typescript/references/monorepo-patterns
---

# TypeScript Modules Reference

Complete guide to TypeScript module systems including ESM, CommonJS, dual packages, and monorepo setup.

## Module Systems

### System Comparison

| System | Syntax | Environment | Use Case |
|--------|--------|-------------|----------|
| **ESM** | `import`/`export` | Modern browsers, Node.js 13+ | New projects, libraries |
| **CommonJS** | `require`/`module.exports` | Legacy Node.js | Legacy projects |
| **Dual Package** | Both | Any | Library distribution |
| **UMD** | Universal | Browser + Node.js | Legacy libraries |

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

## Module Best Practices

1. Use ESM for new projects
2. Use explicit file extensions for Node.js
3. Use barrel exports for clean APIs
4. Use type-only imports to avoid runtime overhead
5. Use dynamic imports for code splitting
