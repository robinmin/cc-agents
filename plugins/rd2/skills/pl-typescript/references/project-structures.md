# TypeScript Project Structures Reference

Complete guide to TypeScript project structures for different application types and scales.

## Table of Contents

1. [Structure Selection Guide](#structure-selection-guide)
2. [Simple Utility Library](#simple-utility-library)
3. [Component Library](#component-library)
4. [Frontend Application](#frontend-application)
5. [Node.js Service](#nodejs-service)
6. [Full-Stack Application](#full-stack-application)
7. [Monorepo Structure](#monorepo-structure)

---

## Structure Selection Guide

| Project Type | Recommended Structure | Complexity |
|--------------|----------------------|------------|
| **Simple Utility Library** | Single package with `src/` | Low |
| **Component Library** | `src/components/`, `src/utils/`, `src/types/` | Medium |
| **Frontend Application** | Feature-based with routing | Medium-High |
| **Node.js Service** | Layered architecture (routes, services, models) | Medium |
| **Full-Stack App** | Monorepo with shared types | High |
| **Microservices** | Monorepo with independent services | High |

---

## Simple Utility Library

### Structure

```
my-util-lib/
├── src/
│   ├── index.ts          # Main entry point (barrel export)
│   ├── core.ts           # Core utilities
│   ├── helpers.ts        # Helper functions
│   └── types.ts          # Shared types
├── tests/
│   ├── core.test.ts
│   ├── helpers.test.ts
│   └── types.test.ts
├── examples/
│   └── usage.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Entry Point

```typescript
// src/index.ts
export * from './core';
export * from './helpers';
export * from './types';
```

---

## Component Library

### Structure

```
my-component-lib/
├── src/
│   ├── index.ts              # Main entry point
│   ├── components/           # UI components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   │   ├── Input.tsx
│   │   │   ├── Input.test.tsx
│   │   │   ├── Input.stories.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── utils/                # Utility functions
│   │   ├── cn.ts             # Classname utilities
│   │   ├── format.ts
│   │   └── index.ts
│   ├── hooks/                # Custom React hooks
│   │   ├── useTheme.ts
│   │   ├── useMediaQuery.ts
│   │   └── index.ts
│   ├── types/                # Shared types
│   │   ├── component.ts
│   │   ├── theme.ts
│   │   └── index.ts
│   └── styles/               # Global styles
│       ├── global.css
│       └── theme.css
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

### Component Structure

```typescript
// src/components/Button/Button.tsx
import { forwardRef } from 'react';
import type { ButtonProps } from '../../types';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`btn btn-${variant} btn-${size}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

// src/components/Button/index.ts
export { Button } from './Button';
export type { ButtonProps } from '../../types';
```

---

## Frontend Application

### Feature-Based Structure

```
my-frontend-app/
├── src/
│   ├── App.tsx               # Root component
│   ├── main.tsx              # Entry point
│   ├── index.css             # Global styles
│   ├── routes/               # Route configuration
│   │   ├── index.ts
│   │   ├── home.tsx
│   │   └── protected.tsx
│   ├── pages/                # Page components
│   │   ├── HomePage/
│   │   │   ├── HomePage.tsx
│   │   │   ├── HomePage.test.tsx
│   │   │   └── index.ts
│   │   ├── DashboardPage/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── DashboardPage.test.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── features/            # Feature modules
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   └── users/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── services/
│   │       ├── types/
│   │       └── index.ts
│   ├── components/          # Shared components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── index.ts
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── hooks/               # Shared hooks
│   │   ├── useAuth.ts
│   │   ├── useLocalStorage.ts
│   │   └── index.ts
│   ├── services/            # API services
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   └── index.ts
│   ├── store/               # State management
│   │   ├── slices/
│   │   │   ├── auth.slice.ts
│   │   │   └── user.slice.ts
│   │   └── index.ts
│   ├── utils/               # Utilities
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── index.ts
│   ├── types/               # Shared types
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── index.ts
│   └── assets/              # Static assets
│       ├── images/
│       └── fonts/
├── public/                  # Public static files
├── tests/                   # E2E tests
│   └── e2e/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Route Configuration

```typescript
// src/routes/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
]);
```

---

## Node.js Service

### Layered Architecture

```
my-node-service/
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Express app setup
│   ├── routes/               # Route definitions
│   │   ├── index.ts
│   │   ├── health.routes.ts
│   │   ├── users.routes.ts
│   │   └── auth.routes.ts
│   ├── controllers/          # Route controllers
│   │   ├── users.controller.ts
│   │   ├── auth.controller.ts
│   │   └── index.ts
│   ├── services/             # Business logic
│   │   ├── users.service.ts
│   │   ├── auth.service.ts
│   │   └── index.ts
│   ├── repositories/         # Data access
│   │   ├── users.repository.ts
│   │   ├── database.ts
│   │   └── index.ts
│   ├── models/               # Domain models
│   │   ├── user.model.ts
│   │   └── index.ts
│   ├── middleware/           # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── index.ts
│   ├── dto/                  # Data transfer objects
│   │   ├── users.dto.ts
│   │   ├── auth.dto.ts
│   │   └── index.ts
│   ├── types/                # Shared types
│   │   ├── express.ts
│   │   ├── api.ts
│   │   └── index.ts
│   ├── utils/                # Utilities
│   │   ├── logger.ts
│   │   ├── config.ts
│   │   ├── validation.ts
│   │   └── index.ts
│   └── config/               # Configuration
│       ├── database.config.ts
│       └── index.ts
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── repositories/
│   ├── integration/
│   │   └── routes/
│   └── e2e/
├── package.json
├── tsconfig.json
└── README.md
```

### Controller Pattern

```typescript
// src/controllers/users.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UsersService } from '../services/users.service';
import { CreateUserDto, UpdateUserDto } from '../dto/users.dto';

export class UsersController {
  constructor(private usersService: UsersService) {}

  async findAll(req: Request, res: Response, next: NextFunction) {
    const users = await this.usersService.findAll();
    res.json(users);
  }

  async findOne(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const user = await this.usersService.findOne(id);
    res.json(user);
  }

  async create(req: Request, res: Response, next: NextFunction) {
    const dto: CreateUserDto = req.body;
    const user = await this.usersService.create(dto);
    res.status(201).json(user);
  }

  async update(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const dto: UpdateUserDto = req.body;
    const user = await this.usersService.update(id, dto);
    res.json(user);
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    await this.usersService.delete(id);
    res.status(204).send();
  }
}
```

---

## Full-Stack Application

### Monorepo Structure

```
my-fullstack-app/
├── packages/
│   ├── shared/               # Shared code
│   │   ├── src/
│   │   │   ├── types/        # Shared types
│   │   │   │   ├── api.ts
│   │   │   │   ├── models.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/        # Shared utilities
│   │   │   │   ├── validation.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── backend/              # Node.js API
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── middleware/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── frontend/             # React frontend
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── features/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── admin/                # Admin panel
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   └── ...
│       ├── package.json
│       └── tsconfig.json
├── package.json              # Root package.json
├── pnpm-workspace.yaml
├── turbo.json                # Turbo config
└── tsconfig.json             # Root tsconfig
```

### Root tsconfig.json

```json
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/backend" },
    { "path": "./packages/frontend" },
    { "path": "./packages/admin" }
  ]
}
```

### Shared Package

```json
// packages/shared/package.json
{
  "name": "@myapp/shared",
  "version": "1.0.0",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}
```

### Importing Shared Code

```typescript
// packages/backend/src/routes/users.routes.ts
import type { CreateUserDto, UserDto } from '@myapp/shared';

// packages/frontend/src/services/users.service.ts
import type { UserDto, CreateUserDto } from '@myapp/shared';
```

---

## Monorepo Structure

### Large-Scale Monorepo

```
my-monorepo/
├── packages/
│   ├── ui/                   # UI component library
│   ├── shared/               # Shared utilities and types
│   ├── web/                  # Web application
│   ├── admin/                # Admin panel
│   ├── api/                  # Backend API
│   ├── worker/               # Background worker
│   └── mobile/               # Mobile app
├── tools/                    # Build tools
│   ├── eslint-config/
│   ├── tsconfig/
│   └── scripts/
├── .github/
│   └── workflows/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── nx.json                   # Or turbo.json
└── README.md
```

### Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'tools/*'
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    }
  }
}
```

---

## Structure Best Practices

### 1. Keep Entry Points Clean

```typescript
// Good - barrel exports
export * from './components';
export * from './utils';
export * from './types';

// Avoid - mixed exports
export { foo } from './foo';
export default baz;
```

### 2. Use Index Files

```typescript
// components/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Select } from './Select';

// Import from barrel
import { Button, Input, Select } from '@/components';
```

### 3. Separate Concerns

```
src/
├── components/    # Presentational only
├── services/      # Business logic
├── store/         # State management
└── utils/         # Pure functions
```

### 4. Use Feature Modules

```
src/features/auth/
├── components/    # Auth-specific components
├── hooks/         # Auth-specific hooks
├── services/      # Auth API calls
├── types/         # Auth types
└── index.ts
```

### 5. Test Co-Location

```
src/
├── utils/
│   ├── format.ts
│   └── format.test.ts
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx
```

---

## Configuration Examples

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@features': path.resolve(__dirname, './src/features'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### Vitest Configuration

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
      exclude: ['node_modules/', 'tests/'],
    },
  },
});
```

### ESLint Configuration

```javascript
// eslint.config.js
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
    },
  },
];
```
