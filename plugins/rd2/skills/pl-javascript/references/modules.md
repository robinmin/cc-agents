# JavaScript Modules Reference

Comprehensive guide to JavaScript module systems and patterns.

## Table of Contents

- [Module Systems Overview](#module-systems-overview)
- [ES Modules (ESM)](#es-modules-esm)
- [CommonJS](#commonjs)
- [Choosing a Module System](#choosing-a-module-system)
- [Dual Package Strategy](#dual-package-strategy)
- [Module Patterns](#module-patterns)
- [Build Tools and Bundlers](#build-tools-and-bundlers)

---

## Module Systems Overview

JavaScript has two primary module systems:

| Module System | Environment | Syntax | Status |
|---------------|-------------|--------|--------|
| **ES Modules (ESM)** | Modern browsers, Node.js 13+ | `import`/`export` | Standard (ES2015+) |
| **CommonJS** | Node.js (legacy) | `require`/`module.exports` | Node.js default (before 13) |

**Recommendation:** Use ESM for all new projects.

---

## ES Modules (ESM)

### Basic Syntax

```javascript
// Named exports
export const PI = 3.14159;
export function add(a, b) {
  return a + b;
}
export class Calculator {}

// Default export
export default class UserService {}

// Re-exporting
export { UserService as default } from './user.service.js';
export * from './utils.js';
```

### Import Syntax

```javascript
// Default import
import UserService from './user.service.js';

// Named imports
import { add, PI } from './utils.js';

// Namespace import
import * as utils from './utils.js';

// Mixed import
import UserService, { logger } from './user.service.js';

// Side-effect import
import './polyfills.js';
```

### Dynamic Import

```javascript
// Dynamic import (returns Promise)
const module = await import('./utils.js');
const { add } = module;

// Lazy loading
button.addEventListener('click', async () => {
  const { heavyComponent } = await import('./heavy.js');
  heavyComponent.render();
});
```

### Browser Usage

```html
<!-- Inline module -->
<script type="module">
  import { greet } from './greet.js';
  greet('World');
</script>

<!-- External module -->
<script type="module" src="./app.js"></script>

<!-- Import maps (for bare specifiers) -->
<script type="importmap">
{
  "imports": {
    "lodash": "https://cdn.skypack.dev/lodash-es",
    "utils/": "./src/utils/"
  }
}
</script>
```

### Node.js Usage

```javascript
// package.json
{
  "type": "module"
}

// Now you can use ESM
import { readFile } from 'fs/promises';
import express from 'express';
```

---

## CommonJS

### Basic Syntax

```javascript
// Exporting
module.exports.add = function(a, b) {
  return a + b;
};

module.exports.PI = 3.14159;

// Or using exports shortcut
exports.add = function(a, b) {
  return a + b;
};

// Default export
module.exports = class Calculator {};
```

### Require Syntax

```javascript
// Importing
const { add, PI } = require('./utils');
const Calculator = require('./calculator');

// Built-in modules
const fs = require('fs');
const path = require('path');

// Third-party packages
const express = require('express');
```

### Dynamic Require

```javascript
// Dynamic require
const module = require('./utils.js');

// Conditional require
if (needsFeature) {
  const feature = require('./feature');
  feature.init();
}
```

---

## Choosing a Module System

### Decision Matrix

| Scenario | Recommended System | Reason |
|----------|-------------------|--------|
| **New browser project** | ESM | Native browser support, tree-shaking |
| **New Node.js project** | ESM | Modern standard, top-level await |
| **Legacy Node.js** | CommonJS | Compatibility with existing ecosystem |
| **Library distribution** | Dual package | Support both ESM and CJS consumers |
| **Bundled application** | ESM source | Bundler handles output format |

### ESM Benefits

- **Native browser support** - No build step required
- **Tree-shaking** - Dead code elimination
- **Static analysis** - Better tooling support
- **Top-level await** - Async at module level
- **Dynamic import** - Lazy loading built-in

### CommonJS Benefits

- **Legacy compatibility** - Works everywhere
- **Synchronous loading** - Predictable resolution
- **Mature ecosystem** - All npm packages support it

---

## Dual Package Strategy

For libraries that need to support both ESM and CommonJS:

### Package Structure

```
my-lib/
├── package.json
├── src/
│   └── index.js
├── dist/
│   ├── index.js       # ESM build
│   └── index.cjs      # CommonJS build
```

### package.json Configuration

```json
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
      "default": "./dist/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist"]
}
```

### Conditional Exports

```json
{
  "exports": {
    ".": {
      "node": "./dist/node.js",
      "browser": "./dist/browser.js",
      "default": "./dist/index.js"
    },
    "./utils": {
      "import": "./dist/utils.js",
      "require": "./dist/utils.cjs"
    }
  }
}
```

### Build Configuration

```javascript
// esbuild.config.js
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.js'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'neutral',
  format: 'esm',
});

await esbuild.build({
  entryPoints: ['src/index.js'],
  outfile: 'dist/index.cjs',
  bundle: true,
  platform: 'neutral',
  format: 'cjs',
});
```

---

## Module Patterns

### Namespace Pattern

```javascript
// utils/math.js
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;
export const multiply = (a, b) => a * b;
export const divide = (a, b) => a / b;

// Usage
import * as math from './utils/math.js';
math.add(1, 2);
```

### Re-export Pattern

```javascript
// barrel.js
export { UserService } from './user.service.js';
export { PostService } from './post.service.js';
export { CommentService } from './comment.service.js';

// Usage
import { UserService, PostService } from './barrel.js';
```

### Lazy Load Pattern

```javascript
// router.js
const routes = {
  home: () => import('./pages/home.js'),
  about: () => import('./pages/about.js'),
  admin: () => import('./pages/admin.js'),
};

async function loadPage(route) {
  const module = await routes[route]();
  return module.default;
}
```

### Module Shimming

```javascript
// For packages without ESM support
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const legacyPackage = require('legacy-package');
```

---

## Build Tools and Bundlers

### Vite (Recommended)

```javascript
// vite.config.js
export default {
  build: {
    target: 'es2020',
    outDir: 'dist',
    lib: {
      entry: 'src/index.js',
      name: 'MyLib',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
        },
      },
    },
  },
};
```

### Webpack

```javascript
// webpack.config.js
module.exports = {
  output: {
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
};
```

### esbuild

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.js'],
  outfile: 'dist/index.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
});
```

### Rollup

```javascript
// rollup.config.js
export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/index.js',
      format: 'esm',
    },
    {
      file: 'dist/index.cjs',
      format: 'cjs',
    },
  ],
};
```

---

## Best Practices

### Always Do

- Use ESM for new projects
- Use `.js` extension in import paths
- Export named exports for better tree-shaking
- Use `package.json` exports field for libraries
- Lazy load heavy modules with dynamic import
- Use import maps for bare specifiers in browser

### Never Do

- Mix ESM and CommonJS in same file
- Use `.js` extension for CommonJS files
- Forget to specify extension in import paths
- Use `require()` in ESM modules (use `createRequire`)
- Export mutable objects (makes tree-shaking difficult)

---

## Troubleshooting

### Import Errors

```javascript
// Error: Cannot use import statement outside a module
// Solution: Add "type": "module" to package.json or use .mjs extension

// Error: Unknown file extension ".js"
// Solution: Add .js extension to import paths
```

### Circular Dependencies

```javascript
// Avoid circular dependencies
// Instead, use dependency injection or event system

// Bad: Circular
// a.js imports b.js, b.js imports a.js

// Good: Use events
// a.js emits events, b.js listens
```

### Dual Package Hazards

```javascript
// Avoid dual package hazard
// Don't import both ESM and CJS versions

// Bad
import { foo } from 'pkg';
const { bar } = require('pkg');

// Good
import { foo, bar } from 'pkg';
```
