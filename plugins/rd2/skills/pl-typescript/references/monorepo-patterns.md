# TypeScript Monorepo Patterns Guide

Complete guide to setting up and managing TypeScript in monorepo environments using project references, workspaces, and composite projects.

## Table of Contents

1. [Monorepo Architecture](#monorepo-architecture)
2. [Project References](#project-references)
3. [Workspace Configuration](#workspace-configuration)
4. [Shared Packages](#shared-packages)
5. [Build Orchestration](#build-orchestration)
6. [Path Mapping](#path-mapping)
7. [Type Checking](#type-checking)
8. [Common Patterns](#common-patterns)

---

## Monorepo Architecture

### Typical Monorepo Structure

```
my-monorepo/
├── packages/
│   ├── types/              # Shared type definitions
│   ├── utils/              # Shared utilities
│   ├── ui/                 # UI component library
│   ├── server/             # Backend service
│   └── client/             # Frontend application
├── apps/
│   ├── web/                # Web application
│   └── admin/              # Admin dashboard
├── tsconfig.json           # Root tsconfig
├── package.json            # Root package.json
└── pnpm-workspace.yaml     # Workspace config
```

---

### Package Categories

| Category | Purpose | Dependencies |
|----------|---------|--------------|
| **types** | Shared type definitions | None |
| **utils** | Shared utilities | types |
| **ui** | UI components | types, utils |
| **server** | Backend services | types, utils |
| **client** | Frontend apps | types, utils, ui |

---

## Project References

### Root tsconfig.json

```json
{
  "files": [],
  "references": [
    { "path": "./packages/types" },
    { "path": "./packages/utils" },
    { "path": "./packages/ui" },
    { "path": "./packages/server" },
    { "path": "./packages/client" },
    { "path": "./apps/web" },
    { "path": "./apps/admin" }
  ]
}
```

**Key points:**
- `"files": []` — Root config only references, doesn't compile
- Order matters — dependencies before dependents
- `references` array — All packages in the monorepo

---

### Package tsconfig.json

**Leaf package (no dependencies):**

```json
// packages/types/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**Package with dependencies:**

```json
// packages/ui/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../types" },
    { "path": "../utils" }
  ],
  "include": ["src/**/*"]
}
```

**Application package:**

```json
// apps/web/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@types/*": ["../../packages/types/src/*"],
      "@utils/*": ["../../packages/utils/src/*"],
      "@ui/*": ["../../packages/ui/src/*"]
    }
  },
  "references": [
    { "path": "../../packages/types" },
    { "path": "../../packages/utils" },
    { "path": "../../packages/ui" }
  ],
  "include": ["src/**/*"]
}
```

---

## Workspace Configuration

### pnpm Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

**package.json (root):**

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules/.cache"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "turbo": "^1.11.0"
  }
}
```

---

### npm/yarn Workspaces

```json
// package.json (root)
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "dev": "npm run dev --workspaces"
  }
}
```

---

## Shared Packages

### Shared Types Package

```
packages/types/
├── src/
│   ├── user.types.ts
│   ├── api.types.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

```typescript
// packages/types/src/user.types.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

// packages/types/src/index.ts
export * from './user.types';
export * from './api.types';
```

```json
// packages/types/package.json
{
  "name": "@myapp/types",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  }
}
```

---

### Shared Utils Package

```
packages/utils/
├── src/
│   ├── format.ts
│   ├── validate.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

```typescript
// packages/utils/src/format.ts
export function formatDate(date: Date): string {
  return date.toISOString();
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// packages/utils/src/index.ts
export * from './format';
export * from './validate';
```

```json
// packages/utils/package.json
{
  "name": "@myapp/utils",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "dependencies": {
    "@myapp/types": "workspace:*"
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  }
}
```

```json
// packages/utils/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../types" }
  ]
}
```

---

### Shared UI Package

```
packages/ui/
├── src/
│   ├── Button.tsx
│   ├── Input.tsx
│   └── index.ts
├── package.json
└── tsconfig.json
```

```typescript
// packages/ui/src/Button.tsx
import { ButtonProps } from '@myapp/types';

export function Button({ children, onClick }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// packages/ui/src/index.ts
export * from './Button';
export * from './Input';
```

```json
// packages/ui/package.json
{
  "name": "@myapp/ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "dependencies": {
    "@myapp/types": "workspace:*",
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0"
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  }
}
```

```json
// packages/ui/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../types" }
  ]
}
```

---

## Build Orchestration

### Turbo Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

**Pipeline explanation:**
- `"^build"` — Wait for dependencies to build first
- `outputs` — Cache these directories
- `cache` — Enable/disable caching
- `persistent` — Keep process running (dev servers)

---

### nx Configuration

```json
// nx.json
{
  "extends": "nx/presets/npm.json",
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "lint", "test", "typecheck"]
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

---

### Lerna Configuration

```json
// lerna.json
{
  "version": "independent",
  "npmClient": "pnpm",
  "useWorkspaces": true,
  "packages": [
    "packages/*",
    "apps/*"
  ],
  "command": {
    "publish": {
      "conventionalCommits": true
    },
    "bootstrap": {
      "ignore": "component-*",
      "npmClientArgs": ["--no-lockfile"]
    }
  }
}
```

---

## Path Mapping

### Workspace Path Aliases

```json
// apps/web/tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@types/*": ["../../packages/types/src/*"],
      "@utils/*": ["../../packages/utils/src/*"],
      "@ui/*": ["../../packages/ui/src/*"],
      "@server/*": ["../../packages/server/src/*"]
    }
  }
}
```

**Usage in code:**

```typescript
// apps/web/src/App.tsx
import { Button } from '@ui/Button';
import { capitalize } from '@utils/format';
import type { User } from '@types/user.types';
```

---

### Bundler Configuration

**Vite:**

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@types': path.resolve(__dirname, '../../packages/types/src'),
      '@utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@ui': path.resolve(__dirname, '../../packages/ui/src')
    }
  }
});
```

**Jest:**

```javascript
// apps/web/jest.config.js
module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@types/(.*)$': '<rootDir>/../../packages/types/src/$1',
    '^@utils/(.*)$': '<rootDir>/../../packages/utils/src/$1',
    '^@ui/(.*)$': '<rootDir>/../../packages/ui/src/$1'
  }
};
```

---

## Type Checking

### Monorepo Type Checking

```bash
# Check all packages
pnpm typecheck

# Check specific package
pnpm --filter @myapp/ui typecheck

# Check with dependencies
pnpm --filter @myapp/web... typecheck
```

---

### Composite Build Order

TypeScript automatically determines build order based on references:

```
Build order:
1. @myapp/types (no dependencies)
2. @myapp/utils (depends on @myapp/types)
3. @myapp/ui (depends on @myapp/types)
4. @myapp/server (depends on @myapp/types, @myapp/utils)
5. @myapp/web (depends on @myapp/types, @myapp/utils, @myapp/ui)
```

---

### Incremental Type Checking

```json
// tsconfig.json (each package)
{
  "compilerOptions": {
    "composite": true,
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

---

## Common Patterns

### Pattern 1: Type-Only Imports

```typescript
// packages/ui/src/Button.tsx
import type { ButtonProps } from '@myapp/types';
import { classNames } from '@utils/format';

export function Button(props: ButtonProps) {
  return <button className={classNames(props.className)} />;
}
```

---

### Pattern 2: Re-exports

```typescript
// packages/ui/src/index.ts
export * from './Button';
export * from './Input';
export * from './Modal';

// Re-export types
export type { ButtonProps } from './Button';
```

---

### Pattern 3: Conditional Builds

```json
// packages/ui/package.json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "build:prod": "tsc && tsc-alias"
  }
}
```

---

### Pattern 4: Shared Configurations

```json
// tsconfig.base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Default",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "strict": true,
    "moduleResolution": "bundler"
  },
  "exclude": ["node_modules", "dist"]
}
```

```json
// packages/types/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

---

### Pattern 5: Version Management

```json
// packages/types/package.json
{
  "name": "@myapp/types",
  "version": "1.0.0",
  "dependencies": {
    "@myapp/utils": "workspace:*"  // Always latest
  }
}
```

---

## Monorepo Best Practices

### Package Organization

1. **Dependency direction** — Always point inward (apps → packages)
2. **No circular dependencies** — Enforce with tooling
3. **Leaf packages first** — Types, then utils, then features
4. **Clear boundaries** — One concern per package

---

### Type Safety

1. **Enable composite mode** — All packages must be composite
2. **Generate declarations** — For all packages
3. **Use project references** — Enable incremental builds
4. **Strict mode everywhere** — Consistent type checking

---

### Build Performance

1. **Use turbo or nx** — Efficient build orchestration
2. **Cache aggressively** — Reuse unchanged builds
3. **Parallel builds** — Independent packages build simultaneously
4. **Watch mode** — Incremental rebuilds during development

---

### Workspace Management

1. **Use pnpm workspaces** — Efficient disk usage
2. **Workspace protocol** — Use `workspace:*` for dependencies
3. **Root scripts** — Orchestrate commands from root
4. **Consistent tooling** — Same TypeScript version across packages

---

## Troubleshooting

### Issue: "Cannot find module" in workspace

**Solution:** Ensure workspace protocol is used:

```json
{
  "dependencies": {
    "@myapp/types": "workspace:*"
  }
}
```

---

### Issue: Type errors in referenced packages

**Solution:** Build dependencies first:

```bash
pnpm --filter @myapp/types build
pnpm --filter @myapp/utils build
```

---

### Issue: Circular dependency detected

**Solution:** Refactor to remove circular dependency:

```
Before:
@myapp/types → @myapp/utils → @myapp/types

After:
@myapp/types (leaf)
@myapp/utils → @myapp/types
@myapp/ui → @myapp/types, @myapp/utils
```

---

### Issue: Build order incorrect

**Solution:** Use turbo or nx for proper orchestration:

```bash
turbo run build --force
```

---

## Quick Reference

### Monorepo Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build specific package
pnpm --filter @myapp/ui build

# Type check all
pnpm typecheck

# Type check with dependencies
pnpm --filter @myapp/web... typecheck

# Run dev servers
pnpm dev

# Clean all
pnpm clean
```

### tsconfig.json Checklist

- [ ] Root tsconfig has `"files": []`
- [ ] All packages have `"composite": true`
- [ ] All packages have `"declaration": true`
- [ ] References are in dependency order
- [ ] Paths are configured for workspace imports
- [ ] Base config extends common settings

### Package Structure Checklist

- [ ] package.json has correct name
- [ ] Dependencies use `workspace:*`
- [ ] tsconfig.json references dependencies
- [ ] Build script outputs to dist/
- [ ] Types field points to declarations
