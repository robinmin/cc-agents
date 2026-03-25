---
name: tsconfig-guide
description: "tsconfig.json configuration guide: compiler options, strict mode, module resolution, type checking, output options, and build configurations."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [typescript, tsconfig, configuration, compiler-options, architecture-design]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
---

# TypeScript Configuration Guide (tsconfig.json)

Complete guide to TypeScript compiler configuration options and best practices.

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

## Compiler Options

### Target Options

| Option | Description | Use Case |
|--------|-------------|----------|
| `ES3` | ECMAScript 3 | Legacy browsers |
| `ES5` | ECMAScript 5 | Older browsers |
| `ES2022` | ECMAScript 2022 | Modern browsers |
| `ESNext` | Latest ECMAScript | Cutting edge features |

### Module Options

| Option | Description | Use Case |
|--------|-------------|----------|
| `CommonJS` | Node.js default | Legacy Node.js |
| `ESNext` | ES modules | Modern projects |
| `NodeNext` | Node.js ESM/CJS | Node.js 16+ |

## Strict Mode Options

### Individual Strict Flags

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### Recommended Strict Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Module Resolution

### Resolution Strategies

| Strategy | Use Case |
|----------|----------|
| `node` | Node.js CommonJS |
| `node16` | Node.js 16+ ESM |
| `nodenext` | Latest Node.js |
| `bundler` | Vite, webpack, esbuild |
| `classic` | Legacy |

### Recommended for Modern Projects

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolvePackageJsonExports": true,
    "resolvePackageJsonImports": true
  }
}
```

## Type Checking Options

### Important Type Checking Flags

```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

## Output Options

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

## Build Options

### Project References

```json
{
  "references": [
    { "path": "../shared-types" },
    { "path": "../utils" }
  ],
  "compilerOptions": {
    "composite": true,
    "declaration": true
  }
}
```
