---
name: migration-guide
description: "Comprehensive guide for migrating JavaScript to TypeScript and upgrading between TypeScript versions."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [typescript, migration, upgrade, javascript, architecture-design]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
---

# TypeScript Migration Guide

Comprehensive guide for migrating JavaScript to TypeScript and upgrading TypeScript versions.

## JavaScript to TypeScript Migration

### Phase 1: Preparation

Enable TypeScript incrementally:

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

Add TypeScript to project:

```bash
bun add -d typescript @types/node vitest
```

### Phase 2: Add Type Annotations

Start with entry points and work outward:

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

### Phase 3: Enable Strict Mode

Incremental strictness approach:

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

## Version Upgrade Paths

### Upgrading to TypeScript 5.0+

**Prerequisites:**
- Node.js 16.14+ (for using decorators)
- ESM-based project or `"type": "module"` in package.json

**Step 1: Update TypeScript version:**

```bash
bun add -d typescript@5.9
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

## Common Migration Patterns

### Pattern 1: JSDoc Type Annotations

Add types to JavaScript files without converting:

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

### Pattern 2: Declaration Files

Create type definitions for existing JavaScript:

```typescript
// types.d.ts
interface User {
  id: string;
  name: string;
  age: number;
}

declare function createUser(name: string, age: number): User;
```

### Pattern 3: Type Assertions Migration

Replace `@ts-ignore` with proper types:

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

## Incremental Migration Strategy

### Strategy 1: File-by-File

Migrate one file at a time using mixed project config:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false
  }
}
```

### Strategy 2: Layer-by-Layer

Migrate from outside in: entry points → services → utilities → models.

### Strategy 3: Feature-by-Feature

Migrate by feature module: models + services + routes together.

## Monorepo Migration

### Strategy 1: Package-by-Package

Migrate leaf packages first (no dependencies), then dependent packages.

### Strategy 2: Shared Types Package

Create shared types first to establish type contracts across packages.

## Migration Best Practices

### Do's

- Enable strict mode incrementally
- Use allowJs to keep JavaScript files during migration
- Migrate critical paths first
- Create shared types early
- Run type checking in CI
- Use Zod or IoTS for runtime validation

### Don'ts

- Don't use `any` excessively
- Don't ignore errors
- Don't migrate everything at once
- Don't skip testing
- Don't use `@ts-ignore` — use proper type guards
