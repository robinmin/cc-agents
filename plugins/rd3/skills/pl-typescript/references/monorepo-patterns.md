---
name: monorepo-patterns
description: "TypeScript monorepo patterns: project references, workspace configuration, shared packages, build orchestration, and path mapping."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [typescript, monorepo, project-references, workspaces, architecture-design]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:pl-typescript
  - rd3:pl-typescript/references/modules
  - rd3:pl-typescript/references/tsconfig-guide
---

# TypeScript Monorepo Patterns Guide

Complete guide to setting up and managing TypeScript in monorepo environments using project references, workspaces, and composite projects.

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
    { "path": "./packages/client" }
  ]
}
```

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

## Workspace Configuration

### pnpm Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

## Build Orchestration

### Turbo Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

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
      "@ui/*": ["../../packages/ui/src/*"]
    }
  }
}
```

## Monorepo Best Practices

1. **Dependency direction** — Always point inward (apps → packages)
2. **No circular dependencies** — Enforce with tooling
3. **Leaf packages first** — Types, then utils, then features
4. **Enable composite mode** — All packages must be composite
5. **Use turbo or nx** — Efficient build orchestration
6. **Cache aggressively** — Reuse unchanged builds
