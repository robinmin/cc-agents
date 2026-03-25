---
name: project-structures
description: "TypeScript project structures for different application types: utility libraries, component libraries, frontend apps, Node.js services, and full-stack monorepos."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
tags: [typescript, project-structure, architecture, frontend, backend, monorepo]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
---

# TypeScript Project Structures Reference

Complete guide to TypeScript project structures for different application types and scales.

## Structure Selection Guide

| Project Type | Recommended Structure | Complexity |
|--------------|----------------------|------------|
| **Simple Utility Library** | Single package with `src/` | Low |
| **Component Library** | `src/components/`, `src/utils/`, `src/types/` | Medium |
| **Frontend Application** | Feature-based with routing | Medium-High |
| **Node.js Service** | Layered architecture (routes, services, models) | Medium |
| **Full-Stack App** | Monorepo with shared types | High |

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
├── package.json
├── tsconfig.json
└── README.md
```

## Component Library

### Structure

```
my-component-lib/
├── src/
│   ├── index.ts              # Main entry point
│   ├── components/           # UI components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   ├── hooks/               # Custom React hooks
│   ├── types/                # Shared types
│   └── styles/               # Global styles
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Frontend Application

### Feature-Based Structure

```
my-frontend-app/
├── src/
│   ├── App.tsx               # Root component
│   ├── main.tsx              # Entry point
│   ├── routes/               # Route configuration
│   ├── pages/                # Page components
│   ├── features/            # Feature modules
│   │   ├── auth/
│   │   └── users/
│   ├── components/          # Shared components
│   ├── hooks/               # Shared hooks
│   ├── services/            # API services
│   ├── store/               # State management
│   ├── utils/               # Utilities
│   ├── types/               # Shared types
│   └── assets/              # Static assets
├── public/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Node.js Service

### Layered Architecture

```
my-node-service/
├── src/
│   ├── index.ts              # Entry point
│   ├── routes/               # Route definitions
│   ├── controllers/          # Route controllers
│   ├── services/             # Business logic
│   ├── repositories/        # Data access
│   ├── models/               # Domain models
│   ├── middleware/          # Express middleware
│   ├── dto/                  # Data transfer objects
│   ├── types/                # Shared types
│   └── utils/               # Utilities
├── tests/
├── package.json
└── tsconfig.json
```

## Structure Best Practices

1. Keep entry points clean with barrel exports
2. Use index files for each module
3. Separate concerns (components/services/store/utils)
4. Use feature modules for large applications
5. Co-locate tests with source files
