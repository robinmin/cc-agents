---
name: project-structures
description: "Guide to JavaScript project organization: from simple scripts to monorepos, with examples for CLI tools, libraries, web apps, and services."
see_also:
  - rd3:pl-javascript
---

# JavaScript Project Structures Reference

Comprehensive guide to JavaScript project organization and layout patterns.

## Table of Contents

- [Project Structure Overview](#project-structure-overview)
- [Simple Script/Utility](#simple-scriptutility)
- [Node.js CLI Tool](#nodejs-cli-tool)
- [Browser Library](#browser-library)
- [Web Application](#web-application)
- [Node.js Service](#nodejs-service)
- [Monorepo](#monorepo)
- [Choosing a Structure](#choosing-a-structure)

---

## Project Structure Overview

Choose a project structure based on:

| Factor | Considerations |
|--------|----------------|
| **Project Type** | CLI, library, app, service |
| **Scale** | Single file vs. multi-module |
| **Environment** | Browser, Node.js, or both |
| **Build Process** | No build, bundler, or transpiler |
| **Team Size** | Solo vs. multi-person collaboration |

---

## Simple Script/Utility

For single-purpose scripts and utilities:

### Structure

```
utility.js
```

### Example

```javascript
// utility.js
export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US').format(date);
}

export function generateId() {
  return Math.random().toString(36).substring(2);
}
```

### When to Use

- Utility functions
- Single-purpose scripts
- Browser polyfills
- Configuration files

---

## Node.js CLI Tool

For command-line interface tools:

### Structure

```
cli-tool/
├── bin/
│   └── cli.js              # CLI entry point
├── lib/
│   ├── commands/           # Command implementations
│   │   ├── init.js
│   │   └── build.js
│   ├── utils/              # Shared utilities
│   │   └── logger.js
│   └── index.js            # Main library
├── test/
│   └── cli.test.js
├── package.json
├── README.md
└── LICENSE
```

### package.json

```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "my-cli": "./bin/cli.js"
  },
  "exports": "./lib/index.js",
  "scripts": {
    "test": "vitest",
    "lint": "eslint lib/"
  }
}
```

### CLI Entry Point

```javascript
// bin/cli.js
#!/usr/bin/env node

import { program } from 'commander';
import { init } from '../lib/commands/init.js';
import { build } from '../lib/commands/build.js';

program
  .name('my-cli')
  .description('My CLI tool')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize project')
  .action(init);

program
  .command('build')
  .description('Build project')
  .action(build);

program.parse();
```

### When to Use

- Command-line tools
- Build scripts
- Development utilities
- Automation scripts

---

## Browser Library

For reusable browser libraries:

### Structure

```
browser-lib/
├── src/
│   ├── index.js            # Main entry point
│   ├── core/               # Core functionality
│   │   ├── lib.js
│   │   └── utils.js
│   └── plugins/            # Optional plugins
│       └── plugin.js
├── dist/                   # Build output
│   ├── index.js            # ESM build
│   ├── index.umd.cjs       # UMD build
│   └── index.min.js        # Minified build
├── test/
│   ├── lib.test.js
│   └── browser.test.js     # Browser-specific tests
├── examples/               # Usage examples
│   └── basic.html
├── package.json
├── vite.config.js          # Build configuration
└── README.md
```

### package.json

```json
{
  "name": "my-browser-lib",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.umd.cjs",
  "module": "./dist/index.js",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.umd.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "vite build",
    "test": "vitest",
    "test:browser": "playwright test"
  }
}
```

### Entry Point

```javascript
// src/index.js
export { version } from './core/version.js';
export { MyLib } from './core/lib.js';
export { default as init } from './core/init.js';

// Default export for UMD
export default function MyLib(options) {
  // Library initialization
}
```

### When to Use

- Reusable UI components
- Utility libraries
- Browser APIs
- Framework plugins

---

## Web Application

For modern web applications:

### Component-Based Structure

```
web-app/
├── src/
│   ├── main.js             # Application entry
│   ├── App.vue             # Root component (or App.jsx)
│   ├── assets/             # Static assets
│   │   ├── images/
│   │   └── styles/
│   ├── components/         # Reusable components
│   │   ├── common/         # Generic components
│   │   │   ├── Button.vue
│   │   │   └── Input.vue
│   │   └── features/       # Feature-specific
│   │       ├── UserList.vue
│   │       └── PostCard.vue
│   ├── composables/        # Composables (Vue) or hooks (React)
│   │   ├── useAuth.js
│   │   └── useApi.js
│   ├── services/           # API/external services
│   │   ├── api.js
│   │   └── auth.js
│   ├── stores/             # State management
│   │   ├── user.js
│   │   └── posts.js
│   ├── utils/              # Utility functions
│   │   ├── format.js
│   │   └── validate.js
│   ├── router/             # Route configuration
│   │   └── index.js
│   └── views/              # Page-level components
│       ├── Home.vue
│       ├── About.vue
│       └── Profile.vue
├── public/                 # Static files
│   ├── favicon.ico
│   └── index.html
├── test/
│   ├── unit/               # Unit tests
│   └── e2e/                # E2E tests
├── package.json
├── vite.config.js
└── README.md
```

### Feature-Based Structure (Alternative)

```
web-app/
├── src/
│   ├── main.js
│   ├── shared/             # Shared code
│   │   ├── components/
│   │   ├── utils/
│   │   └── services/
│   └── features/           # Feature modules
│       ├── auth/
│       │   ├── components/
│       │   ├── services/
│       │   ├── stores/
│       │   └── routes.js
│       ├── posts/
│       │   ├── components/
│       │   ├── services/
│       │   └── routes.js
│       └── users/
│           ├── components/
│           ├── services/
│           └── routes.js
```

### When to Use

- Single-page applications
- Progressive web apps
- Dashboards
- Complex UI applications

---

## Node.js Service

For backend services and APIs:

### Structure

```
node-service/
├── src/
│   ├── server.js           # Server entry point
│   ├── app.js              # Express app setup
│   ├── routes/             # Route definitions
│   │   ├── index.js
│   │   ├── users.js
│   │   └── posts.js
│   ├── controllers/        # Request handlers
│   │   ├── user.controller.js
│   │   └── post.controller.js
│   ├── services/           # Business logic
│   │   ├── user.service.js
│   │   └── post.service.js
│   ├── models/             # Data models
│   │   ├── user.model.js
│   │   └── post.model.js
│   ├── middleware/         # Express middleware
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── error.js
│   ├── utils/              # Utility functions
│   │   ├── logger.js
│   │   └── validator.js
│   ├── config/             # Configuration
│   │   ├── database.js
│   │   └── env.js
│   └── db/                 # Database setup
│       ├── connection.js
│       └── migrations/
├── test/
│   ├── unit/
│   └── integration/
├── package.json
├── .env.example
└── README.md
```

### Server Entry

```javascript
// src/server.js
import app from './app.js';
import { config } from './config/env.js';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### App Setup

```javascript
// src/app.js
import express from 'express';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.use(errorHandler);

export default app;
```

### When to Use

- REST APIs
- GraphQL services
- Microservices
- Webhooks handlers

---

## Monorepo

For managing multiple related packages:

### Structure

```
monorepo/
├── packages/
│   ├── shared/             # Shared utilities
│   │   ├── src/
│   │   ├── package.json
│   │   └── README.md
│   ├── web-app/            # Web application
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.js
│   ├── api-service/        # Backend service
│   │   ├── src/
│   │   ├── package.json
│   │   └── README.md
│   └── cli-tool/           # CLI tool
│       ├── bin/
│       ├── lib/
│       └── package.json
├── package.json            # Root package.json
├── pnpm-workspace.yaml     # Workspace config
└── turbo.json              # Build orchestration
```

### Root package.json

```json
{
  "name": "my-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^1.10.0"
  }
}
```

### Workspace Config

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

### Turbo Config

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

### When to Use

- Multiple related packages
- Shared dependencies
- Unified version management
- Coordinated releases

---

## Choosing a Structure

### Decision Matrix

| Project Type | Recommended Structure | Complexity |
|--------------|----------------------|------------|
| **Utility Script** | Single file | Low |
| **CLI Tool** | `bin/` + `lib/` | Low |
| **Browser Library** | `src/` + `dist/` | Medium |
| **Web App (Small)** | Component-based | Medium |
| **Web App (Large)** | Feature-based | High |
| **Node.js Service** | Layered (MVC) | Medium |
| **Microservices** | Monorepo | High |

### Growth Path

Start simple, evolve as needed:

```
Single File
    ↓ (grows beyond ~200 lines)
Simple Directory
    ↓ (multiple features)
Organized Structure
    ↓ (team collaboration)
Monorepo (if needed)
```

### Key Principles

1. **Separation of Concerns** - Group by responsibility
2. **Scalability** - Plan for growth
3. **Testability** - Co-locate tests
4. **Maintainability** - Clear organization
5. **Team Size** - Match structure to team

---

## Best Practices

### Always Do

- Separate source from build output
- Co-locate tests with source
- Use meaningful directory names
- Plan for project growth
- Document structure in README
- Use consistent naming conventions

### Never Do

- Put everything in root directory
- Mix source and build files
- Use deep nesting (3+ levels)
- Create ambiguous directories (`stuff/`, `misc/`)
- Ignore test organization
