---
name: backend-design
description: "Backend implementation patterns for Node.js. Use when building Express APIs, designing repository patterns, implementing service layer, adding Zod validation, configuring Sentry monitoring, enforcing layered architecture. Applies to routes, controllers, services, repositories, Prisma, middleware, validation, and backend conventions."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-26
updated_at: 2026-03-26
type: pattern
tags: [backend, api, express, prisma, typescript, nodejs, layered-architecture, zod, sentry, rest, graphql]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: implementation-pattern
  interactions:
    - knowledge-only
see_also:
  - rd3:backend-architect
  - rd3:sys-developing
  - rd3:pl-typescript
  - rd3:tdd-workflow
---

## When to Use

Automatically applies when working on:

* Routes, controllers, services, repositories
* Express middleware
* Prisma database access
* Zod validation
* Sentry error tracking
* Configuration management
* Backend refactors or migrations

**Activate when any of these are true:**

| Situation | Examples |
|----------|---------|
| Building or modifying API endpoints | `POST /users`, `GET /orders/:id`, `router.post(...)` |
| Implementing service layer logic | `UserService`, `OrderService`, business rules |
| Adding repository/data access code | `PrismaService`, `findById`, `create`, transactions |
| Writing Express middleware | Auth middleware, rate limiting, error handling |
| Adding input validation | Zod schemas, `z.object(...)`, `schema.parse(...)` |
| Setting up error tracking | Sentry.captureException, instrument.ts |
| Configuring application settings | unifiedConfig, environment variables |
| Backend refactors or migrations | Layer reorganization, dependency changes |

**Do NOT activate for:** frontend code, pure data analysis, infrastructure provisioning (use respective skills instead).

For detailed patterns and examples, see:
- [references/api-and-patterns.md](references/api-and-patterns.md) — API design, caching, auth, queues, logging
- [references/security-implementation.md](references/security-implementation.md) — Security coding practices
- [references/backend-development-workflow.md](references/backend-development-workflow.md) — Feature development orchestration

## Overview

**(Node.js · Express · TypeScript · Microservices)**

You are a **senior backend engineer** operating production-grade services under strict architectural and reliability constraints.

Your goal is to build **predictable, observable, and maintainable backend systems** using:

* Layered architecture
* Explicit error boundaries
* Strong typing and validation
* Centralized configuration
* First-class observability

This skill defines **how backend code must be written**, not merely suggestions.

---

This skill enforces a layered architecture for Node.js/Express backends:

| Layer | Responsibility | Key Rule |
|-------|---------------|---------|
| **Routes** | HTTP routing only | Zero business logic |
| **Controllers** | Request/response coordination | Extend `BaseController` |
| **Services** | Business logic | Framework-agnostic, unit-testable |
| **Repositories** | Data access | Prisma via repositories only |
| **Config** | All settings | `unifiedConfig` only — no `process.env` |

**Core constraints:** All errors → Sentry · All input → Zod · All config → unifiedConfig

---

## 1. Backend Feasibility & Risk Index (BFRI)

Before implementing or modifying a backend feature, assess feasibility.

### BFRI Dimensions (1–5)

| Dimension                     | Question                                                         |
| ----------------------------- | ---------------------------------------------------------------- |
| **Architectural Fit**         | Does this follow routes → controllers → services → repositories? |
| **Business Logic Complexity** | How complex is the domain logic?                                 |
| **Data Risk**                 | Does this affect critical data paths or transactions?            |
| **Operational Risk**          | Does this impact auth, billing, messaging, or infra?           |
| **Testability**               | Can this be reliably unit + integration tested?                  |

### Score Formula

```
BFRI = (Architectural Fit + Testability) − (Complexity + Data Risk + Operational Risk)
```

**Range:** `-10 → +10`

### Interpretation

| BFRI     | Meaning   | Action                 |
| -------- | --------- | ---------------------- |
| **6–10** | Safe      | Proceed                |
| **3–5**  | Moderate  | Add tests + monitoring |
| **0–2**  | Risky     | Refactor or isolate    |
| **< 0**  | Dangerous | Redesign before coding |

---

## 3. Core Architecture Doctrine (Non-Negotiable)

### 1. Layered Architecture Is Mandatory

```
Routes → Controllers → Services → Repositories → Database
```

* No layer skipping
* No cross-layer leakage
* Each layer has **one responsibility**

---

### 2. Routes Only Route

```ts
// ❌ NEVER
router.post('/create', async (req, res) => {
  await prisma.user.create(...);
});

// ✅ ALWAYS
router.post('/create', (req, res) =>
  userController.create(req, res)
);
```

Routes must contain **zero business logic**.

---

### 3. Controllers Coordinate, Services Decide

* **Controllers**: Parse request, call services, handle response formatting, handle errors via BaseController
* **Services**: Contain business rules, are framework-agnostic, use DI, are unit-testable

---

### 4. All Controllers Extend `BaseController`

```ts
export class UserController extends BaseController {
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const user = await this.userService.getById(req.params.id);
      this.handleSuccess(res, user);
    } catch (error) {
      this.handleError(error, res, 'getUser');
    }
  }
}
```

No raw `res.json` calls outside BaseController helpers.

---

### 5. All Errors Go to Sentry

```ts
catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

❌ `console.log` · ❌ silent failures · ❌ swallowed errors

---

### 6. unifiedConfig Is the Only Config Source

```ts
// ❌ NEVER
process.env.JWT_SECRET;

// ✅ ALWAYS
import { config } from '@/config/unifiedConfig';
config.auth.jwtSecret;
```

---

### 7. Validate All External Input with Zod

* Request bodies · Query params · Route params · Webhook payloads

```ts
const schema = z.object({
  email: z.string().email(),
});
const input = schema.parse(req.body);
```

No validation = bug.

---

## 4. Directory Structure (Canonical)

```
src/
├── config/              # unifiedConfig
├── controllers/          # BaseController + controllers
├── services/            # Business logic
├── repositories/        # Prisma access
├── routes/              # Express routes
├── middleware/          # Auth, validation, errors
├── validators/          # Zod schemas
├── types/               # Shared types
├── utils/               # Helpers
├── tests/               # Unit + integration tests
├── instrument.ts        # Sentry (FIRST IMPORT)
├── app.ts              # Express app
└── server.ts           # HTTP server
```

---

## 5. Naming Conventions (Strict)

| Layer      | Convention                |
| ---------- | ------------------------- |
| Controller | `PascalCaseController.ts` |
| Service    | `camelCaseService.ts`     |
| Repository | `PascalCaseRepository.ts` |
| Routes     | `camelCaseRoutes.ts`      |
| Validators | `camelCase.schema.ts`     |

---

## 6. Dependency Injection Rules

* Services receive dependencies via constructor
* No importing repositories directly inside controllers
* Enables mocking and testing

```ts
export class UserService {
  constructor(
    private readonly userRepository: UserRepository
  ) {}
}
```

---

## 7. Async & Error Handling

All async route handlers must be wrapped with `asyncErrorWrapper`.

```ts
router.get(
  '/users',
  asyncErrorWrapper((req, res) =>
    controller.list(req, res)
  )
);
```

No unhandled promise rejections.

---

## 8. Observability & Monitoring

**Required:**
* Sentry error tracking
* Sentry performance tracing
* Structured logs (where applicable)

Every critical path must be observable.

---

## 9. Testing Discipline

**Required Tests:**
* **Unit tests** for services
* **Integration tests** for routes
* **Repository tests** for complex queries

No tests → no merge.

---

## 10. Anti-Patterns (Immediate Rejection)

❌ Business logic in routes
❌ Skipping service layer
❌ Direct Prisma in controllers
❌ Missing validation
❌ process.env usage
❌ console.log instead of Sentry
❌ Untested business logic

---

## 11. Integration With Other Skills

* **frontend-dev-guidelines** → API contract alignment
* **error-tracking** → Sentry standards
* **database-verification** → Schema correctness
* **analytics-tracking** → Event pipelines

---

## 12. Operator Validation Checklist

Before finalizing backend work:

* [ ] BFRI ≥ 3
* [ ] Layered architecture respected
* [ ] Input validated
* [ ] Errors captured in Sentry
* [ ] unifiedConfig used
* [ ] Tests written
* [ ] No anti-patterns present

---

## 13. Skill Status

**Status:** Stable · Enforceable · Production-grade
**Intended Use:** Long-lived Node.js microservices with real traffic and real risk

---

## Trigger

Invoke this skill when:

- Building or modifying Express/REST/GraphQL API endpoints
- Implementing service layer or repository patterns
- Adding Prisma database access or transactions
- Writing Express middleware (auth, rate limiting, validation)
- Adding Zod input validation
- Configuring Sentry error tracking
- Enforcing layered architecture conventions
