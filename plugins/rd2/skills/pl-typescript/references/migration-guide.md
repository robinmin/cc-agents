# TypeScript Migration Guide

Comprehensive guide for migrating JavaScript to TypeScript and upgrading TypeScript versions.

## Table of Contents

1. [JavaScript to TypeScript Migration](#javascript-to-typescript-migration)
2. [Version Upgrade Paths](#version-upgrade-paths)
3. [Common Migration Patterns](#common-migration-patterns)
4. [Incremental Migration Strategy](#incremental-migration-strategy)
5. [Monorepo Migration](#monorepo-migration)
6. [Troubleshooting](#troubleshooting)

---

## JavaScript to TypeScript Migration

### Phase 1: Preparation

**1. Enable TypeScript incrementally:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false,
    "noEmit": true,
    "strict": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**2. Add TypeScript to project:**

```bash
npm install --save-dev typescript @types/node @types/jest
```

**3. Rename files gradually:**

```
src/
├── utils.js        # Start with JavaScript files
├── utils.ts        # Rename as you migrate
└── components/
    ├── Button.js   # Migrate one at a time
    └── Button.tsx  # Rename when ready
```

---

### Phase 2: Add Type Annotations

**Start with entry points and work outward:**

```typescript
// Before (JavaScript)
function fetchData(url) {
  return fetch(url).then(r => r.json());
}

// After (TypeScript - step 1: add return type)
async function fetchData(url: string): Promise<unknown> {
  return fetch(url).then(r => r.json());
}

// After (TypeScript - step 2: add proper types)
interface User {
  id: string;
  name: string;
}

async function fetchData(url: string): Promise<User> {
  const response = await fetch(url);
  return response.json();
}
```

---

### Phase 3: Enable Strict Mode

**Incremental strictness approach:**

```json
// tsconfig.json - Step 1
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true
  }
}

// Step 2: Add more strict options
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}

// Step 3: Full strict mode
{
  "compilerOptions": {
    "strict": true
  }
}
```

---

## Version Upgrade Paths

### Upgrading to TypeScript 5.0+

**Prerequisites:**
- Node.js 16.14+ (for using decorators)
- ESM-based project or `"type": "module"` in package.json

**Step 1: Update TypeScript version:**

```bash
npm install typescript@5.3
```

**Step 2: Update tsconfig.json:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "experimentalDecorators": false
  }
}
```

**Step 3: Update decorators (if using):**

Before (legacy):
```typescript
function sealed(constructor: Function) {
  Object.seal(constructor);
}

@sealed
class MyClass {}
```

After (standard):
```typescript
function sealed(
  target: any,
  context: ClassDecoratorContext
) {
  // Standard decorator implementation
}

@sealed
class MyClass {}
```

---

### Upgrading from 4.x to 5.x

**Breaking changes to address:**

1. **Decorator changes:**
   - Legacy: `experimentalDecorators: true`
   - Standard: `experimentalDecorators: false`, `target: ES2022+`

2. **Module resolution:**
   - Old: `moduleResolution: "node"`
   - New: `moduleResolution: "bundler"` (frontend) or `"nodenext"` (Node.js)

3. **Enum behavior:**
   - All enums are now union enums
   - May affect numeric enum comparisons

4. **lib options:**
   - More specific library requirements
   - Add `DOM.Iterable` explicitly if needed

---

## Common Migration Patterns

### Pattern 1: JSDoc Type Annotations

**Add types to JavaScript files without converting:**

```javascript
// utils.js
/**
 * @param {string} name
 * @param {number} age
 * @returns {User}
 */
function createUser(name, age) {
  return { id: crypto.randomUUID(), name, age };
}
```

Enable with:
```json
{
  "compilerOptions": {
    "checkJs": true
  }
}
```

---

### Pattern 2: Declaration Files

**Create type definitions for existing JavaScript:**

```typescript
// types.d.ts
interface User {
  id: string;
  name: string;
  age: number;
}

declare function createUser(name: string, age: number): User;
```

---

### Pattern 3: Type Assertions Migration

**Replace `@ts-ignore` with proper types:**

```typescript
// Before
// @ts-ignore
const user = JSON.parse(data);

// After - step 1
const user = JSON.parse(data) as unknown;

// After - step 2 (type guard)
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  );
}

const user = JSON.parse(data);
if (isUser(user)) {
  console.log(user.name); // Safe
}
```

---

### Pattern 4: Module Migration

**CommonJS to ESM:**

```typescript
// Before (CommonJS)
const express = require('express');
const app = express();

module.exports = app;

// After (ESM)
import express from 'express';
const app = express();

export default app;
```

Update package.json:
```json
{
  "type": "module"
}
```

---

## Incremental Migration Strategy

### Strategy 1: File-by-File

**Migrate one file at a time:**

```
src/
├── utils/
│   ├── format.js     # Not migrated
│   ├── format.ts     # Migrated
│   └── validate.ts   # Migrated
└── services/
    └── api.js        # Not migrated
```

**tsconfig.json for mixed project:**
```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false  // Only check .ts files
  }
}
```

---

### Strategy 2: Layer-by-Layer

**Migrate from outside in:**

```
Phase 1: Entry points
├── index.ts
├── server.ts

Phase 2: Services
├── services/
│   ├── api.ts
│   └── auth.ts

Phase 3: Utilities
├── utils/
│   ├── format.ts
│   └── validate.ts

Phase 4: Models
├── models/
│   └── user.ts
```

---

### Strategy 3: Feature-by-Feature

**Migrate by feature:**

```
Phase 1: User feature
├── models/user.ts
├── services/userService.ts
├── routes/userRoutes.ts

Phase 2: Auth feature
├── models/auth.ts
├── services/authService.ts
├── routes/authRoutes.ts
```

---

## Monorepo Migration

### Strategy 1: Package-by-Package

**Migrate one package at a time:**

```
packages/
├── shared/          # Phase 1: Start here
│   ├── tsconfig.json
│   └── src/
├── utils/           # Phase 2
│   ├── tsconfig.json
│   └── src/
├── server/          # Phase 3
│   ├── tsconfig.json
│   └── src/
└── client/          # Phase 4
    ├── tsconfig.json
    └── src/
```

---

### Strategy 2: Shared Types Package

**Create shared types first:**

```
packages/
├── types/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── user.types.ts
│       └── api.types.ts
├── server/
│   ├── package.json
│   └── tsconfig.json  # References @myapp/types
└── client/
    ├── package.json
    └── tsconfig.json  # References @myapp/types
```

**tsconfig.json with project references:**
```json
// packages/types/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true
  }
}

// packages/server/tsconfig.json
{
  "compilerOptions": {
    "composite": true
  },
  "references": [
    { "path": "../types" }
  ]
}
```

---

### Monorepo Migration Checklist

- [ ] Create shared types package
- [ ] Set up project references
- [ ] Migrate leaf packages first (no dependencies)
- [ ] Update build scripts
- [ ] Configure path aliases
- [ ] Update IDE settings
- [ ] Run type check across all packages
- [ ] Set up CI type checking

---

## Troubleshooting

### Common Issues

**Issue: "Cannot find module"**

```typescript
// Before
import { foo } from './foo';

// After (add extension for Node.js ESM)
import { foo } from './foo.js';
```

---

**Issue: Type errors in dependencies**

```json
// tsconfig.json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

---

**Issue: Implicit any errors**

```typescript
// Before
function processData(data) {
  return data.map(x => x * 2);
}

// After - step 1
function processData(data: any[]): any[] {
  return data.map(x => x * 2);
}

// After - step 2 (proper types)
function processData(data: number[]): number[] {
  return data.map(x => x * 2);
}
```

---

**Issue: `this` type errors**

```typescript
// Before
class MyClass {
  method() {
    setTimeout(function() {
      this.doSomething(); // Error
    }, 100);
  }
}

// After - step 1 (arrow function)
class MyClass {
  method() {
    setTimeout(() => {
      this.doSomething(); // OK
    }, 100);
  }
}

// After - step 2 (type annotation)
class MyClass {
  method(this: MyClass) {
    setTimeout(() => {
      this.doSomething(); // OK
    }, 100);
  }
}
```

---

## Migration Best Practices

### Do's

- **Enable strict mode incrementally** — Start with `noImplicitAny`
- **Use allowJs** — Keep JavaScript files during migration
- **Migrate critical paths first** — High-traffic code
- **Create shared types** — Establish type contracts early
- **Run type checking in CI** — Catch regressions
- **Use Zod or IoTS** — Runtime validation for untyped data
- **Document migration decisions** — Team alignment

### Don'ts

- **Don't use `any` excessively** — Defeats type safety
- **Don't ignore errors** — Fix before continuing
- **Don't migrate everything at once** — Risk of merge conflicts
- **Don't skip testing** — Verify behavior after migration
- **Don't forget declaration files** — For third-party modules
- **Don't use `@ts-ignore`** — Use proper type guards

---

## Quick Reference

### Migration Commands

```bash
# Add TypeScript
npm install --save-dev typescript

# Check types
npx tsc --noEmit

# Incremental type check
npx tsc --noEmit --watch

# Generate declaration files
npx tsc --declaration

# Update TypeScript version
npm install typescript@latest
```

### tsconfig.json Migration Profiles

**Profile 1: Gradual Migration**
```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false,
    "noEmit": true,
    "strict": false,
    "noImplicitAny": true
  }
}
```

**Profile 2: Strict Migration**
```json
{
  "compilerOptions": {
    "allowJs": false,
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**Profile 3: Library Migration**
```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```
