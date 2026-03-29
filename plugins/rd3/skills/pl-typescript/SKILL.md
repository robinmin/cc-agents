---
name: pl-typescript
description: "TypeScript project planning skill: architectural guidance, type system design, tsconfig configuration, and best practices for TypeScript 5.x. Trigger when: planning a TypeScript project, designing TypeScript architecture, structuring type systems, or selecting configuration strategies."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
type: technique
tags: [typescript, planning, architecture, type-system, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - knowledge-only
see_also:
  - rd3:sys-developing
  - rd3:sys-debugging
---

# rd3:pl-typescript — TypeScript Project Planning

Comprehensive TypeScript planning skill for designing project structures, planning type systems, and selecting appropriate architecture patterns.

## When to Use

Invoke this skill when:
- Planning a new TypeScript project from scratch
- Designing TypeScript architecture for an existing codebase
- Structuring type systems for a new project or module
- Selecting tsconfig configuration strategies
- Planning TypeScript API design and type-safe contracts
- Evaluating TypeScript best practices for a team or codebase
- Migrating from JavaScript to TypeScript
- Setting up a TypeScript monorepo with project references

## Quick Start

```
1. ANALYZE — Understand project requirements, constraints, scale
2. SELECT STRUCTURE — Choose appropriate project layout
3. DESIGN TYPE SYSTEM — Select patterns (generics, discriminated unions, utility types)
4. PLAN CONFIGURATION — Set up tsconfig, build tools, strictness level
5. RECOMMEND TOOLS — Suggest frameworks, libraries, testing setup
6. SPECIFY VERSION — Identify TypeScript version requirements
```

For detailed patterns, examples, and best practices, see `references/`.

## Core Planning Dimensions

### 1. Project Structure Selection

Choose based on project type and scale:

| Project Type | Recommended Structure | Key Directories |
|--------------|----------------------|-----------------|
| **Simple Utility Library** | `src/` + single entry point | `src/index.ts` |
| **Component Library** | `src/components/`, `src/utils/`, `src/types/` | `src/`, `tests/` |
| **Frontend Application** | `src/` with components, services, hooks, utils | `src/`, `public/` |
| **Node.js Service** | `src/` with routes, controllers, models, services | `src/`, `tests/` |
| **Full-Stack App** | `packages/` for frontend, backend, shared types | `packages/*/` |
| **Monorepo** | `packages/` with project references, workspaces | `packages/*/`, `tools/` |

### 2. Type System Pattern Selection

| Pattern | Best For | Complexity |
|---------|----------|------------|
| **Basic Generics** | Reusable components, utilities | Low |
| **Generic Constraints** | Constrained type parameters | Medium |
| **Utility Types** | Type transformations, API DTOs | Low |
| **Discriminated Unions** | State management, error handling | Medium |
| **Branded Types** | Type safety for primitives | Medium |
| **Conditional Types** | Advanced type manipulation | High |
| **Template Literal Types** | String-based type systems | High |
| **Recursive Types** | JSON, tree structures | High |

### 3. TypeScript Version Planning

Always specify TypeScript version requirements — Many features require specific versions:

| Feature | TS Version | Planning Note |
|---------|-----------|---------------|
| Const Type Parameters | 5.0+ | Precise literal type inference |
| Standard Decorators | 5.0+ | Class and method decorators |
| `satisfies` Operator | 4.9+ | Validate without changing type |
| `using` / `await using` | 5.2+ | Resource management |
| `noUncheckedIndexedAccess` | 4.1+ | Safer array/object access |
| Tuple Labels | 4.0+ | Named tuple elements |
| Template Literal Types | 4.1+ | String type transformations |
| `NoInfer<T>` | 5.4+ | Control type inference locations |
| Regular Expression Syntax Checking | 5.4+ | Validate regex patterns at compile time |
| `exactOptionalPropertyTypes` | 5.4+ | Distinguish optional `T` vs `T \| undefined` |
| `isolatedDeclarations` | 5.5+ | Faster declaration file generation |
| `infer` in `extends` Constraints | 5.6+ | Better type narrowing with `infer` in generics |
| `throws` Type | 5.6+ | Type functions that throw reliably |
| Import Attribute Assertions | 5.6+ | `import foo from "./foo" assert { type: "json" }` |
| **`import attributes` (`with` clause)** | 5.6+ | Standardized `import ... with { type: "json" }` syntax |
| **`NoInfer<T>` in utility types** | 5.7+ | Control inference in conditional types |
| **`--maxNodeModuleJsDepth` removal** | 5.7+ | Simplified module resolution |

**Version Decision Matrix:**

| Scenario | Recommended Version | Key Features |
|----------|-------------------|--------------|
| **New frontend project (Vite)** | 5.3+ | Decorators, const params, using, import attributes |
| **New Node.js service** | 5.2+ | Resource management (using/await using) |
| **Library with broad compatibility** | 4.9+ | satisfies, noUncheckedIndexedAccess |
| **Maximum type safety** | 5.4+ | NoInfer, closure narrowing, regex checking |

### 4. Module System Planning

Always specify module system — Different environments require different approaches:

| Environment | Module System | Planning Note |
|-------------|---------------|---------------|
| **Modern Frontend** | ESM (`import`/`export`) | Use with bundlers (Vite, webpack) |
| **Modern Node.js** | ESM (`import`/`export`) | Set `"type": "module"` in package.json |
| **Legacy Node.js** | CommonJS (`require`) | Default before Node 13 |
| **Library Distribution** | Dual package | Export both ESM and CJS |
| **Bundler Projects** | ESM source | Bundler handles output format |

### 5. tsconfig Configuration Strategy

| Project Type | Strictness Level | Key Options |
|--------------|-----------------|-------------|
| **Application** | Strict | `strict: true`, `noUncheckedIndexedAccess: true` |
| **Library** | Very Strict | All strict options + `declaration: true` |
| **Legacy Migration** | Medium | Incremental strictness, `allowJs: true` |
| **Monorepo** | Composite | `composite: true`, project references |

**Recommended Base Configuration (TS 5.4+):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noUnnecessaryTypeAssertion": true,
    "isolatedDeclarations": true
  }
}
```

**SOTA tsconfig options (TypeScript 5.4+):**
- `exactOptionalPropertyTypes` — Distinguish `T` vs `T | undefined` for optional properties
- `noUnnecessaryTypeAssertion` — Catch redundant type assertions
- `isolatedDeclarations` — Faster incremental compilation for large codebases

### 6. Build Tool Selection

| Purpose | Recommendation | When to Use |
|---------|---------------|-------------|
| **Build Tool** | Vite | Modern web apps, fast dev server |
| **Build Tool** | esbuild | Maximum build speed |
| **Build Tool** | tsup | Node.js libraries |
| **Testing** | Vitest | Modern, fast, ESM-first |
| **Testing** | Jest | Broad compatibility |
| **Type Checking** | tsc --noEmit | Fast type checking without build |

## Workflows

### Phase 1: Requirements Analysis

1. **Understand the Goal** - What problem does this solve? Who are the users?
2. **Identify Constraints** - TypeScript version, target environment, strictness level
3. **Map Dependencies** - External services, frameworks, build tools

### Phase 2: Type System Design

1. **Select Type System Patterns** - Choose based on complexity vs. type safety trade-offs
2. **Design Type Hierarchy** - Identify shared types, plan for generic types
3. **Plan Module Structure** - Use ESM for new projects, consider dual package for libraries

### Phase 3: Configuration Planning

1. **tsconfig Strategy** - Start with `strict: true`, configure `moduleResolution`
2. **Build Tool Setup** - Choose Vite for frontend, tsup for libraries
3. **Testing Configuration** - Choose Vitest for modern projects

### Phase 4: Risk Assessment

| Risk Category | Indicators | Mitigation |
|---------------|------------|------------|
| **Type Complexity** | Deeply nested generics | Simplify with intermediate types |
| **Compilation Performance** | Large codebase | Use project references, incremental compilation |
| **Migration Path** | Converting from JavaScript | Incremental migration with `allowJs` |

## Best Practices

### Always Do

- Enable `strict` mode in tsconfig.json
- Use explicit type annotations for function signatures
- Prefer `interface` for object shapes that can be extended
- Prefer `type` for unions, intersections, and utility types
- Use literal types for precise values (`'success' | 'error'`)
- Leverage discriminated unions for state management
- Use type guards instead of assertions when possible
- Enable `noUncheckedIndexedAccess` for safer array access
- Use `readonly` for immutable data
- Document complex types with JSDoc comments
- Use branded types for validated primitives (IDs, emails)
- Use `satisfies` operator for validation
- Configure path aliases for clean imports

### Never Do

- Use `any` without documented rationale
- Ignore TypeScript errors with `@ts-ignore` without investigation
- Use type assertions (`as`) when type guards are possible
- Skip `strict` mode for convenience
- Use loose types (`object`, `Function`) without constraints
- Suppress `strictNullChecks` — handle null/undefined explicitly
- Use `unknown` without proper type narrowing
- Use `console.log` in production code — use proper logging libraries
- Create overly complex generic types without documentation
- Forget to generate declaration files for libraries
- Use nested conditional types without intermediate types

## SOTA Patterns (TypeScript 5.x — 2024–2026)

### Variance Annotations (Covariance / Contravariance)

Control how generic types allow substitution.

```typescript
// Covariant — output positions only
type Covariant<out T> = () => T;

// Contravariant — input positions only
type Contravariant<in T> = (param: T) => void;

// Bivariant — both directions (default for function parameters)
type Bivariant<T> = (param: T) => T;

// Use in utility types for precise variance control
type ReadonlyMap<K, out V> = {
  get(key: K): V;  // V is covariant
  forEach(callback: (value: V, key: K) => void): void;  // V is contravariant in callback
};
```

### Exact Types (`exactOptionalPropertyTypes`)

Distinguish between "property is absent" vs "property is `undefined`":

```typescript
// With exactOptionalPropertyTypes: true
type Config = {
  name?: string;           // undefined only if absent — NOT "string | undefined"
  port?: number;
};

// This is valid — property is absent
const a: Config = {};

// This is also valid — property is explicitly undefined
const b: Config = { name: undefined };

// This is INVALID — name must be string if present
// const c: Config = { name: "test" }; // Wait, this is valid actually
// The distinction is:
// const d: Config = { name: undefined }; // Now properly typed
```

### Discriminated Union Exhaustiveness with `never`

```typescript
type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };

function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

function unwrap<T, E>(result: Result<T, E>): T {
  if (result.success) return result.value;
  return assertNever(result); // Compile-time check
}
```

### Branded Types for Domain Modeling

```typescript
// Branded types prevent primitive substitution
type Brand<T, B> = T & { readonly __brand: B };

type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;

function createUserId(id: string): UserId {
  // Validate format before branding
  if (!/^[a-z0-9-]{36}$/.test(id)) throw new Error("Invalid UUID");
  return id as UserId;
}

// This prevents mixing up IDs at the type level
function getUser(id: UserId): User { /* ... */ }
function getOrder(id: OrderId): Order { /* ... */ }

const userId = createUserId("...");
const orderId = createUserId("...");

getUser(userId);    // OK
getUser(orderId);    // Compile error: OrderId is not assignable to UserId
```

### `infer` in Constrained Positions (TS 5.6+)

```typescript
// Extract type from class constructor
type ConstructorArgs<T extends abstract new (...args: any[]) => any> =
  T extends abstract new (...args: infer Args) => any ? Args : never;

// Extract non-promise value from async function return
type Awaited<T> = T extends Promise<infer U> ? U : T;

// Better: constrain infer to specific patterns
type ExtractStringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];
```

### `using` Declarations for Resource Management (TS 5.2+)

```typescript
// Automatic cleanup with Symbol.dispose
class DatabaseConnection {
  [Symbol.dispose]() {
    this.close();
  }
}

function query() {
  using db = new DatabaseConnection(connectionString);
  // db is automatically disposed when scope exits
  return db.execute("SELECT * FROM users");
}

// Async resource management
class FileHandle {
  async [Symbol.asyncDispose]() {
    await this.close();
  }
}

async function processFile() {
  await using file = new FileHandle("data.txt");
  // Cleaned up automatically after scope
}
```

### Type-Safe Event Emitters with Generics

```typescript
type EventMap = Record<string, unknown>;

class TypedEmitter<T extends EventMap> {
  private listeners = new Map<keyof T, Set<(...args: any[]) => void>>();

  on<K extends keyof T>(event: K, handler: (...args: ExtractEventArgs<T[K]>) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as any);
  }

  emit<K extends keyof T>(event: K, ...args: ExtractEventArgs<T[K]>): void {
    this.listeners.get(event)?.forEach(h => h(...args as any));
  }
}

type ExtractEventArgs<T> = T extends (...args: infer Args) => void ? Args : never;

interface AppEvents {
  userLoggedIn: (userId: string, timestamp: number) => void;
  dataLoaded: (data: string[]) => void;
}

const emitter = new TypedEmitter<AppEvents>();
emitter.on("userLoggedIn", (userId, ts) => console.log(userId, ts));
```

### 6. API Type Design Planning

| Pattern | Use Case | Reference |
|---------|----------|-----------|
| **Request/Response Types** | API contracts | `references/api-design.md` |
| **Discriminated Unions** | Type-safe error handling | `references/patterns.md` |
| **Generic API Client** | Reusable API calls | `references/api-design.md` |
| **Branded Types** | IDs, validated strings | `references/type-system.md` |
| **Zod/IoTS Integration** | Runtime validation + types | `references/api-design.md` |

### 7. Testing Strategy Planning

| Test Type | Coverage Goal | Tool Reference |
|-----------|---------------|----------------|
| **Unit Tests** | 80%+ logic coverage | Vitest, Jest |
| **Type Tests** | Critical type contracts | tsd, expect-type |
| **Integration Tests** | API/Service integration | Vitest, Jest |
| **E2E Tests** | Critical user flows | Playwright, Cypress |

**Testing Layout:**
```
project/
├── src/
│   ├── utils/
│   │   ├── format.ts
│   │   └── format.test.ts  # Co-located tests
│   └── types/
│       └── types.test.ts   # Type tests
└── e2e/
    └── user-flows.spec.ts
```

## Output Format

### TypeScript Project Plan Output

When providing TypeScript project planning guidance, use this format:

```markdown
# TypeScript Project Plan: {Project Name}

## Overview

**Goal**: {What we're building}
**Project Type**: {Frontend App/Node.js Service/Library/Full-Stack}
**Environment**: {Browser/Node.js/Hybrid}
**Scale**: {Small/Medium/Large}
**Estimated Phases**: {count}
**TypeScript Version**: {5.0+ recommended}

## Project Structure

**Layout**: {simple / component-based / monorepo}
{directory structure}

**Rationale**: {Why this structure}

## Type System Design

**Type Safety Level**: {Strict/Very Strict/Medium}

**Core Patterns**:
- {Pattern 1}: {rationale}
- {Pattern 2}: {rationale}

**Generic Types**:
```typescript
// Example generic pattern
interface Repository<T> {
  find(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
}
```

**Shared Types Location**:
- `src/types/` - {shared domain types}
- `src/types/api.ts` - {API contract types}

## Configuration Strategy

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@components/*": ["components/*"]
    }
  }
}
```

**Rationale**: {Why these options}

**Build Tool**: {Vite/esbuild/tsup}

**Rationale**: {Why this tool}

## API Type Design

**Request/Response Pattern**:
```typescript
// Example API type design
interface ApiError {
  code: string;
  message: string;
}

type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: ApiError;
    };

interface CreateUserRequest {
  name: string;
  email: string;
}

interface UserResponse {
  id: string;
  name: string;
  email: string;
}
```

**Error Handling Type**: {Discriminated union / Error class}

**Validation Strategy**: {Zod / IoTS / Manual type guards}

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] {Task 1}
- [ ] {Task 2}
- [ ] {Task 3}

### Phase 2: Core Types & Components (Week 2-3)
- [ ] {Task 1}
- [ ] {Task 2}

### Phase 3: Integration & Testing (Week 4)
- [ ] {Task 1}
- [ ] {Task 2}

## Technology Stack

| Purpose | Technology | Version | Reason |
|---------|-----------|---------|--------|
| Runtime | Node.js 20+ / Bun 1.x | latest | ESM-first, fast startup |
| TypeScript | TypeScript | **5.5+** | Baseline for `isolatedDeclarations`, import attributes, `NoInfer<T>` |
| Build Tool | Vite 6 / tsup 8 | latest | Fast builds, HMR, zero-config |
| Testing | Vitest 3 | latest | Fast, ESM-native, Vite integration |
| Type Testing | tsd + expect-type | latest | Type contract validation at compile time |
| API Client | openapi-typescript | latest | Generate types from OpenAPI specs |
| Validation | Zod | latest | Runtime validation with TypeScript inference |
| Tooling | Bun + Biome | latest | Fast package management, formatting, linting |

## Testing Strategy

**Target Coverage**: 85%+

**Test Layers**:
- Unit tests for utilities and services
- Type tests for type contracts
- Component tests for UI (if frontend)
- Integration tests for API/service integration

**Type Testing**: Use tsd/expect-type to verify type contracts

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| {Risk 1} | High/Low | {Mitigation strategy} |
| {Risk 2} | High/Low | {Mitigation strategy} |

## Migration Plan (if applicable)

**Current State**: {JavaScript / Older TypeScript}

**Migration Strategy**:
- Phase 1: {enable strict mode incrementally}
- Phase 2: {migrate critical paths first}
- Phase 3: {refactor with advanced type patterns}

**Backward Compatibility**: {considerations}

**See `references/migration-guide.md`** for comprehensive migration patterns.

## Next Steps

1. Review and approve architecture
2. Initialize TypeScript project
3. Set up tsconfig.json
4. Configure build tool
5. Set up testing framework
6. Begin Phase 1 implementation
```

## Reference Files

| Reference | Purpose |
|-----------|---------|
| `references/type-system.md` | Generics, conditional types, type manipulation |
| `references/utility-types.md` | Built-in utility types with examples |
| `references/patterns.md` | Common TypeScript design patterns |
| `references/tsconfig-guide.md` | tsconfig.json configuration options |
| `references/ts5-features.md` | TypeScript 5.x features |
| `references/api-design.md` | Type-safe API design patterns |
| `references/modules.md` | ESM, CommonJS, dual packages |
| `references/migration-guide.md` | JavaScript to TypeScript migration |
| `references/monorepo-patterns.md` | Monorepo setup with project references |
| `references/project-structures.md` | Project layout patterns |
| `references/async-patterns.md` | Async/await, Promises, event handling |
| `references/architecture-patterns.md` | Layered, hexagonal, clean architecture |
| `references/framework-patterns.md` | React, Vue, Angular patterns |
| `references/backend-patterns.md` | Node.js, Express, NestJS patterns |
| `references/testing-strategy.md` | Vitest-focused testing |
| `references/tooling.md` | Vite, webpack, esbuild configuration |
| `references/vite-config-patterns.md` | Comprehensive Vite configuration |
| `references/security-patterns.md` | TypeScript security best practices |

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/) — Official docs
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) — Language reference
- [TypeScript 5.x Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/overview.html) — Version features
- [Vite Documentation](https://vitejs.dev/) — Build tool
- [Vitest Documentation](https://vitest.dev/) — Testing framework
- [Zod Documentation](https://zod.dev/) — Schema validation
- [Node.js Documentation](https://nodejs.org/docs/latest/api/) — Runtime reference

See [references/external-resources.md](references/external-resources.md) for more links.
