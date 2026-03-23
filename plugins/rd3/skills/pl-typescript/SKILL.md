---
name: pl-typescript
description: "TypeScript project planning skill: architectural guidance, type system design, tsconfig configuration, and best practices for TypeScript 5.x. Trigger when: planning a TypeScript project, designing TypeScript architecture, structuring type systems, or selecting configuration strategies."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
type: technique
tags: [typescript, planning, architecture, type-system, tsconfig, engineering-core]
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

**Recommended Base Configuration:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 6. Build Tool Selection

| Purpose | Recommendation | When to Use |
|---------|---------------|-------------|
| **Build Tool** | Vite | Modern web apps, fast dev server |
| **Build Tool** | esbuild | Maximum build speed |
| **Build Tool** | tsup | Node.js libraries |
| **Testing** | Vitest | Modern, fast, ESM-first |
| **Testing** | Jest | Broad compatibility |
| **Type Checking** | tsc --noEmit | Fast type checking without build |

## Planning Workflow

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
- Create overly complex generic types without documentation
- Forget to generate declaration files for libraries
- Use nested conditional types without intermediate types

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
| Runtime | Node.js / Browser | - | {rationale} |
| TypeScript | TypeScript | 5.4+ | Strong 5.x baseline with stable modern features |
| Build Tool | Vite / esbuild | latest | Fast builds, HMR |
| Testing | Vitest | latest | Fast, ESM-first |
| Type Testing | tsd / expect-type | latest | Type contract validation |
| Tooling | Bun + Biome | latest | Fast package management, scripts, linting, and formatting |

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

- **[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)** — Official TypeScript documentation
- **[TypeScript 5.9 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)** — Latest stable 5.x features and changes
- **[Biome](https://biomejs.dev/)** — Integrated formatting and linting for TypeScript projects
- **[Vitest](https://vitest.dev/)** — Fast ESM-native test runner
- **[tsup](https://tsup.egoist.dev/)** — Zero-config TypeScript build tool
- **[Zod](https://zod.dev/)** — Runtime validation with TypeScript inference
