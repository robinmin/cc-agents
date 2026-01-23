# Decomposition Patterns

This document provides detailed patterns for decomposing tasks based on different architectural and organizational approaches.

## Table of Contents

- [Layer-Based Decomposition](#layer-based-decomposition)
- [Feature-Based Decomposition](#feature-based-decomposition)
- [Phase-Based Decomposition](#phase-based-decomposition)
- [Risk-Based Decomposition](#risk-based-decomposition)
- [Dependency Types](#dependency-types)

---

## Layer-Based Decomposition

**Best for:** Full-stack features with distinct architectural layers

### Pattern Structure

```
Feature: "Add user authentication"

1. Database Layer
   ├── Create users table with schema
   ├── Add indexes for email/username
   └── Create migration scripts

2. Backend Layer
   ├── Implement authentication service
   ├── Add JWT token generation
   └── Create auth middleware

3. API Layer
   ├── POST /api/auth/register
   ├── POST /api/auth/login
   └── POST /api/auth/refresh

4. Frontend Layer
   ├── Create login form component
   ├── Implement auth context
   └── Add protected route wrapper
```

### Dependency Diagram

```
┌─────────────┐
│  Database   │
│    Layer    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Backend    │
│   Service   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  API Layer  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Frontend   │
│    Layer    │
└─────────────┘
```

### Dependencies

- **Sequential:** API → Backend → Database (strict ordering required)
- **Parallel opportunities:** Frontend can proceed in parallel with backend once API contract defined
- **Gatekeeper tasks:** Database schema must stabilize before backend integration

---

## Feature-Based Decomposition

**Best for:** User-facing features with clear functionality boundaries

### Pattern Structure

```
Feature: "Shopping cart system"

1. Core Cart Functionality
   ├── Add item to cart
   ├── Remove item from cart
   ├── Update item quantity
   └── Persist cart state

2. Cart Management
   ├── View cart contents
   ├── Calculate totals
   ├── Apply discounts
   └── Clear cart

3. Checkout Integration
   ├── Connect to payment processor
   ├── Handle checkout flow
   ├── Process payment
   └── Generate order confirmation
```

### Dependency Diagram

```
┌──────────────────┐
│   Core Cart      │
│  Functionality   │
└─────────┬────────┘
          │
          ▼
┌──────────────────┐     ┌──────────────┐
│ Cart Management  │────►│   Checkout   │
└──────────────────┘     │  Integration │
                         └──────────────┘
```

### Dependencies

- **Management depends on:** Core Cart Functionality
- **Checkout depends on:** Both Core and Management
- **Parallel opportunities:** Multiple cart operations can be implemented in parallel

---

## Phase-Based Decomposition

**Best for:** Multi-phase projects with sequential milestones

### Pattern Structure

```
Project: "Launch API v2"

Phase 1: Design & Planning
   ├── Design API specification
   ├── Document endpoint contracts
   └── Plan migration strategy

Phase 2: Backend Implementation
   ├── Implement new endpoints
   ├── Add data migrations
   └── Update authentication

Phase 3: Frontend Integration
   ├── Update API client
   ├── Migrate to new endpoints
   └── Update error handling

Phase 4: Testing & Deployment
   ├── Write integration tests
   ├── Perform load testing
   └── Deploy to production
```

### Dependency Diagram

```
Phase 1    Phase 2    Phase 3    Phase 4
  ───►      ───►      ───►      ───►
Design    Backend   Frontend   Testing
                     (Sequential gates between phases)
```

### Dependencies

- **Strict sequential ordering:** Phase N must complete before Phase N+1 begins
- **Gatekeeper approach:** Each phase has exit criteria before proceeding
- **Buffer zones:** Add time between phases for validation and adjustment

---

## Risk-Based Decomposition

**Best for:** High-risk features requiring validation before full commitment

### Pattern Structure

```
Feature: "Payment processing integration"

1. Spike/Validation
   ├── Research payment processor APIs
   ├── Validate compliance requirements
   └── Prototype critical path

2. Core Implementation
   ├── Implement payment service
   ├── Add transaction logging
   └── Create error handling

3. Security & Compliance
   ├── Add PCI-DSS compliance
   ├── Implement fraud detection
   └── Add audit logging

4. Testing & Rollout
   ├── Create mock payment mode
   ├── Test with sandbox environment
   └── Gradual rollout to production
```

### Dependency Diagram

```
┌──────────────┐
│ Spike/Valid  │
└──────┬───────┘
       │ (Validation gate)
       ▼
┌──────────────┐
│    Core      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Security   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Testing &    │
│   Rollout    │
└──────────────┘
```

### Dependencies

- **Each phase validates before next begins** (strict gates)
- **Spike must confirm viability** before committing to implementation
- **Security must be validated** before testing with real data
- **Gradual rollout** reduces risk exposure

---

## Dependency Types Reference

| Type | Symbol | Description | Example |
|------|--------|-------------|---------|
| **Sequential** | A → B | A must complete before B | 0001 → 0002 |
| **Parallel** | A \|\| B | Can run simultaneously | 0003 \|\| 0004 |
| **Blocked** | A ⧖ B | Waiting on external factor | 0005 ⧖ API approval |
| **Gatekeeper** | A ⟷ B | Multiple tasks depend on A | 0001 ⟷ (0002, 0003) |
| **Critical Path** | ⊣ | Timeline-determining tasks | ⊣ 0001 → 0004 → 0007 |

### Dependency Symbols in Markdown

```
Sequential:    Task A → Task B
Parallel:      Task A || Task B
Blocked:       Task A ⧖ Task B
Gatekeeper:    Task A ⟷ Task B
Critical Path: ⊣ Task A → Task B → Task C
```

### Mapping Dependencies

When creating task breakdowns:

1. **Identify blocking dependencies first** - What MUST happen before this task?
2. **Look for parallel opportunities** - What can proceed independently?
3. **Note external blocks** - What's waiting on third parties?
4. **Find gatekeepers** - What tasks do multiple other tasks depend on?
5. **Mark critical path** - Which sequence determines the timeline?

### Anti-Patterns to Avoid

```
❌ Circular Dependency:
   Task A → Task B → Task A
   (Invalid! Break the cycle by redefining tasks)

❌ Missing Dependency:
   Task B (depends on A's output) but not documented
   (Add explicit dependency documentation)

❌ Over-Constraint:
   Task C → Task D (unnecessary blocking)
   (Validate whether dependency is real or perceived)
```
