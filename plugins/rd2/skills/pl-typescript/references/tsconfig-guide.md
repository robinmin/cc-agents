# TypeScript Configuration Guide (tsconfig.json)

Complete guide to TypeScript compiler configuration options and best practices.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Compiler Options](#compiler-options)
3. [Strict Mode Options](#strict-mode-options)
4. [Module Resolution](#module-resolution)
5. [Type Checking Options](#type-checking-options)
6. [Output Options](#output-options)
7. [Build Options](#build-options)
8. [Recommended Configurations](#recommended-configurations)

---

## Quick Start

### Minimal Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["src/**/*"]
}
```

### Recommended Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Compiler Options

### Target Options

Specify ECMAScript target version.

| Option | Description | Use Case |
|--------|-------------|----------|
| `ES3` | ECMAScript 3 | Legacy browsers |
| `ES5` | ECMAScript 5 | Older browsers |
| `ES2015` | ECMAScript 2015 | Modern browsers with transpilation |
| `ES2016` | ECMAScript 2016 | Modern browsers |
| `ES2017` | ECMAScript 2017 | Async/await support |
| `ES2018` | ECMAScript 2018 | Object rest/spread |
| `ES2019` | ECMAScript 2019 | Array methods |
| `ES2020` | ECMAScript 2020 | Optional chaining |
| `ES2021` | ECMAScript 2021 | Logical operators |
| `ES2022` | ECMAScript 2022 | Class fields, top-level await |
| `ESNext` | Latest ECMAScript | Cutting edge features |

**Recommendation:** Use `ES2022` for most projects, `ESNext` for libraries.

---

### Module Options

Specify module code generation.

| Option | Description | Use Case |
|--------|-------------|----------|
| `CommonJS` | CommonJS | Node.js projects |
| `ESNext` | ES Modules | Modern browsers, bundlers |
| `Node16` / `NodeNext` | Node.js ES modules | Node.js 16+ |
| `None` | No module system | Scripts |

**Recommendation:** Use `ESNext` for frontend, `NodeNext` for Node.js.

---

### Lib Options

Specify library files to include.

```json
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

Available libraries:
- `ES*` - ECMAScript versions
- `DOM` - Browser DOM APIs
- `DOM.Iterable` - Iterable DOM collections
- `WebWorker` - Web Worker APIs
- `ScriptHost` - Windows Script Host
- `Worker` - Worker APIs

**Recommendation:** Include only what you use to reduce compilation time.

---

## Strict Mode Options

Enable all strict type checking options:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

This enables all of the following (can be configured individually):

---

### strictNullChecks

Disables implicit `null` and `undefined`.

```json
{
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

**Effect:**
```typescript
// Without strictNullChecks
let name: string = null; // OK

// With strictNullChecks
let name: string = null; // Error
let name: string | null = null; // OK
```

---

### noImplicitAny

Disallows implicit `any` types.

```json
{
  "compilerOptions": {
    "noImplicitAny": true
  }
}
```

**Effect:**
```typescript
// Without noImplicitAny
function foo(x) { } // x is any

// With noImplicitAny
function foo(x) { } // Error: Parameter 'x' implicitly has 'any' type
function foo(x: number) { } // OK
```

---

### strictFunctionTypes

Enables stricter function type checking.

```json
{
  "compilerOptions": {
    "strictFunctionTypes": true
  }
}
```

**Effect:** Checks parameter contravariance and return type covariance.

---

### strictBindCallApply

Enables stricter checking for `bind`, `call`, and `apply`.

```json
{
  "compilerOptions": {
    "strictBindCallApply": true
  }
}
```

---

### strictPropertyInitialization

Ensures class properties are initialized.

```json
{
  "compilerOptions": {
    "strictPropertyInitialization": true
  }
}
```

**Effect:**
```typescript
// Error: Property 'name' has no initializer
class User {
  name: string;
}

// OK - Using definite assignment assertion
class User {
  name!: string;
  constructor() {
    this.name = 'John';
  }
}

// OK - Optional property
class User {
  name?: string;
}
```

---

### noImplicitThis

Disallows implicit `any` for `this`.

```json
{
  "compilerOptions": {
    "noImplicitThis": true
  }
}
```

---

### alwaysStrict

Ensures strict mode in all files.

```json
{
  "compilerOptions": {
    "alwaysStrict": true
  }
}
```

---

## Module Resolution

### moduleResolution

Specify module resolution strategy.

| Option | Description | Use Case |
|--------|-------------|----------|
| `classic` | TypeScript 1.6 resolution | Legacy projects |
| `node` | Node.js resolution | Node.js/CommonJS |
| `node16` / `nodeNext` | Node.js ES modules | Node.js 16+ |
| `bundler` | Bundler-friendly | Vite, webpack, esbuild |

**Recommendation:** Use `bundler` for frontend, `nodeNext` for Node.js.

---

### Paths and Base URL

Configure path mapping.

```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@components/*": ["components/*"],
      "@utils/*": ["utils/*"]
    }
  }
}
```

**Effect:**
```typescript
// Instead of:
import { Button } from '../../../components/Button';

// Use:
import { Button } from '@components/Button';
```

---

### typeRoots

Specify type definition directories.

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./src/types"]
  }
}
```

---

### types

Specify which type packages to include.

```json
{
  "compilerOptions": {
    "types": ["node", "jest", "react"]
  }
}
```

---

## Type Checking Options

### noUnusedLocals

Report unused local variables.

```json
{
  "compilerOptions": {
    "noUnusedLocals": true
  }
}
```

---

### noUnusedParameters

Report unused parameters.

```json
{
  "compilerOptions": {
    "noUnusedParameters": true
  }
}
```

**Effect:**
```typescript
// Error: 'b' is declared but never used
function foo(a: number, b: number) {
  return a;
}

// OK - Prefix with underscore
function foo(a: number, _b: number) {
  return a;
}
```

---

### noImplicitReturns

Report functions that don't return.

```json
{
  "compilerOptions": {
    "noImplicitReturns": true
  }
}
```

---

### noFallthroughCasesInSwitch

Report fallthrough in switch.

```json
{
  "compilerOptions": {
    "noFallthroughCasesInSwitch": true
  }
}
```

---

### noUncheckedIndexedAccess

Use `undefined` for indexed access.

```json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true
  }
}
```

**Effect:**
```typescript
const arr = ['a', 'b'];
const item = arr[5]; // Type is string | undefined
```

---

### allowUnreachableCode

Report unreachable code.

```json
{
  "compilerOptions": {
    "allowUnreachableCode": false
  }
}
```

---

### allowUnusedLabels

Report unused labels.

```json
{
  "compilerOptions": {
    "allowUnusedLabels": false
  }
}
```

---

## Output Options

### outDir

Output directory for compiled files.

```json
{
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

---

### rootDir

Root directory of source files.

```json
{
  "compilerOptions": {
    "rootDir": "./src"
  }
}
```

---

### declaration

Generate `.d.ts` declaration files.

```json
{
  "compilerOptions": {
    "declaration": true
  }
}
```

---

### declarationMap

Generate sourcemaps for declaration files.

```json
{
  "compilerOptions": {
    "declarationMap": true
  }
}
```

---

### sourceMap

Generate sourcemaps.

```json
{
  "compilerOptions": {
    "sourceMap": true
  }
}
```

---

### removeComments

Remove comments from output.

```json
{
  "compilerOptions": {
    "removeComments": true
  }
}
```

---

### importHelpers

Import helper functions from tslib.

```json
{
  "compilerOptions": {
    "importHelpers": true
  }
}
```

---

## Build Options

### incremental

Enable incremental compilation.

```json
{
  "compilerOptions": {
    "incremental": true
  }
}
```

---

### tsBuildInfoFile

Specify build info file.

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

---

### composite

Enable composite project.

```json
{
  "compilerOptions": {
    "composite": true
  }
}
```

---

### watchOptions

Configure file watching.

```json
{
  "watchOptions": {
    "watchFile": "useFsEvents",
    "watchDirectory": "useFsEvents",
    "synchronousWatchDirectory": true,
    "excludeDirectories": ["**/node_modules", "**/dist"]
  }
}
```

---

## Additional Options

###esModuleInterop

Enable ES module interoperability.

```json
{
  "compilerOptions": {
    "esModuleInterop": true
  }
}
```

**Recommendation:** Always enable for CommonJS/ESM interop.

---

### allowSyntheticDefaultImports

Allow default imports from modules without default export.

```json
{
  "compilerOptions": {
    "allowSyntheticDefaultImports": true
  }
}
```

---

### resolveJsonModule

Import JSON files.

```json
{
  "compilerOptions": {
    "resolveJsonModule": true
  }
}
```

**Effect:**
```typescript
import config from './package.json';
```

---

### skipLibCheck

Skip type checking of declaration files.

```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

**Recommendation:** Enable to speed up compilation.

---

### forceConsistentCasingInFileNames

Enforce consistent file name casing.

```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

**Recommendation:** Always enable for cross-platform compatibility.

---

### jsx

Specify JSX transformation.

| Option | Description | Use Case |
|--------|-------------|----------|
| `preserve` | Preserve JSX | Custom transform |
| `react` | Transform to React.createElement | React |
| `react-jsx` | React 17+ JSX | React 17+ |
| `react-jsxdev` | React 17+ dev JSX | React 17+ dev |
| `react-native` | React Native | React Native |

---

## Recommended Configurations

### Library (Browser)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Frontend Application (Vite)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    },
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Node.js Application (ESM)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Node.js Application (CommonJS)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Monorepo Package

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"],
  "references": [
    { "path": "../shared" },
    { "path": "../utils" }
  ]
}
```

---

## Configuration Best Practices

1. **Always use strict mode** — Catches more errors at compile time
2. **Set appropriate target** — Match your runtime environment
3. **Use correct module resolution** — `bundler` for frontend, `nodeNext` for Node.js
4. **Enable source maps** — For debugging
5. **Skip lib check** — Faster compilation
6. **Force consistent casing** — Cross-platform compatibility
7. **Use paths mapping** — Cleaner imports
8. **Enable declaration files** — For libraries
9. **Use incremental compilation** — Faster rebuilds
10. **Match tsconfig to environment** — Different configs for different targets
