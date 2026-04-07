---
name: patterns
description: "Decomposition patterns: layer-based, feature-based, phase-based, and risk-based approaches with dependency structures and use-case guidance."
see_also:
  - rd3:task-decomposition
  - rd3:tasks
  - estimation
---

# Decomposition Patterns

This document provides detailed patterns for decomposing tasks based on different architectural and organizational approaches.

These patterns assume business analysis and system analysis have already produced the
requirements, architecture constraints, and component boundaries needed for decomposition.
If those inputs are still missing, record them as prerequisites or open questions instead of
resolving them inside task decomposition.

## Table of Contents

- [Layer-Based Decomposition](#layer-based-decomposition)
- [Feature-Based Decomposition](#feature-based-decomposition)
- [Phase-Based Decomposition](#phase-based-decomposition)
- [Risk-Based Decomposition](#risk-based-decomposition)
- [Dependency Types](#dependency-types)

---

## Layer-Based Decomposition

**Best for:** Full-stack features with distinct architectural layers already defined

### Pattern Structure

```
Feature: "Add user authentication"

1. Database Layer
   |-- Create users table with schema
   |-- Add indexes for email/username
   +-- Create migration scripts

2. Backend Layer
   |-- Implement authentication service
   |-- Add JWT token generation
   +-- Create auth middleware

3. API Layer
   |-- POST /api/auth/register
   |-- POST /api/auth/login
   +-- POST /api/auth/refresh

4. Frontend Layer
   |-- Create login form component
   |-- Implement auth context
   +-- Add protected route wrapper
```

### Dependency Diagram

```
+-------------+
|  Database   |
|    Layer    |
+------+------+
       |
       v
+-------------+
|  Backend    |
|   Service   |
+------+------+
       |
       v
+-------------+
|  API Layer  |
+------+------+
       |
       v
+-------------+
|  Frontend   |
|    Layer    |
+-------------+
```

### Dependencies

- **Sequential:** Database -> Backend -> API (strict ordering required)
- **Parallel opportunities:** Frontend can proceed in parallel with backend once API contract defined
- **Gatekeeper tasks:** Database schema must stabilize before backend integration

---

## Feature-Based Decomposition

**Best for:** User-facing features with clear functionality boundaries

### Pattern Structure

```
Feature: "Shopping cart system"

1. Core Cart Functionality
   |-- Add item to cart
   |-- Remove item from cart
   |-- Update item quantity
   +-- Persist cart state

2. Cart Management
   |-- View cart contents
   |-- Calculate totals
   |-- Apply discounts
   +-- Clear cart

3. Checkout Integration
   |-- Connect to payment processor
   |-- Handle checkout flow
   |-- Process payment
   +-- Generate order confirmation
```

### Dependency Diagram

```
+------------------+
|   Core Cart      |
|  Functionality   |
+---------+--------+
          |
          v
+------------------+     +--------------+
| Cart Management  |---->|   Checkout   |
+------------------+     |  Integration |
                         +--------------+
```

### Dependencies

- **Management depends on:** Core Cart Functionality
- **Checkout depends on:** Both Core and Management
- **Parallel opportunities:** Multiple cart operations can be implemented in parallel

---

## Phase-Based Decomposition

> ⚠️ **Important:** Phase-Based is for multi-phase **projects** (Design → Build → Deploy), NOT for breaking down a single feature's implementation lifecycle. If you find yourself creating subtasks named "investigation", "design", "implementation", "testing", you are misusing this pattern.

### Correct Use of Phase-Based

```yaml
# Good: Multi-phase project decomposition
Project: "Migrate from REST to GraphQL"

Phase 1: Assessment & Planning
  |-- Audit existing REST endpoints
  |-- Define GraphQL schema
  |-- Plan migration strategy

Phase 2: Backend Implementation
  |-- Implement GraphQL resolvers
  |-- Add schema stitching
  |-- Implement subscriptions

Phase 3: Client Migration
  |-- Migrate mobile app
  |-- Migrate web frontend
  |-- Deprecate REST endpoints
```

### Incorrect Use (Anti-Pattern)

```yaml
# Bad: Breaking feature implementation into phases
Feature: "Add Antigravity adapter"

Task 1: Investigate agy CLI    ← NOT a feature deliverable
Task 2: Design adapter         ← NOT a feature deliverable
Task 3: Implement adapter      ← This IS the feature
Task 4: Integrate backend      ← This IS part of the feature
Task 5: Add unit tests         ← Tests are PART of implementation, not separate task
```

**Why this is wrong:**
- Tasks 1-2, 5 are **activities**, not **deliverables**
- They should be in the **Plan** section of the main task, not separate task files
- They fragment the implementation unnecessarily
- The test task was marked "Done" but implementation was actually in another task

### Correct Feature Decomposition

```yaml
# Good: Feature complexity decomposition
Feature: "Add Antigravity adapter to acpx-query.ts"

Task 1: Implement Antigravity adapter
  |-- Add buildAgyChatArgs() function
  |-- Add execAgyChat() function
  |-- Add queryLlmAgy() wrapper
  |-- Add checkAgyHealth() function
  |-- Handle unsupported features gracefully

Task 2: Integrate with backend selection
  |-- Add BACKEND env var support
  |-- Wire into queryLlm()
  |-- Add documentation
```

**Better yet — don't decompose at all if it fits in one task:**

```yaml
# If the feature is < 8 hours, keep it as ONE task
Feature: "Add Antigravity adapter to acpx-query.ts"

### Plan

1. Research: Run `agy --help`, understand capabilities
2. Design: Document adapter interface in task Design section
3. Implement: Add functions to acpx-query.ts
4. Integrate: Add BACKEND env var selection
5. Test: Add unit tests
6. Verify: `bun run check`
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
   |-- Research payment processor APIs
   |-- Validate compliance requirements
   +-- Prototype critical path

2. Core Implementation
   |-- Implement payment service
   |-- Add transaction logging
   +-- Create error handling

3. Security & Compliance
   |-- Add PCI-DSS compliance
   |-- Implement fraud detection
   +-- Add audit logging

4. Testing & Rollout
   |-- Create mock payment mode
   |-- Test with sandbox environment
   +-- Gradual rollout to production
```

### Dependency Diagram

```
+--------------+
| Spike/Valid  |
+------+-------+
       | (Validation gate)
       v
+--------------+
|    Core      |
+------+-------+
       |
       v
+--------------+
|   Security   |
+------+-------+
       |
       v
+--------------+
| Testing &    |
|   Rollout    |
+--------------+
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
| **Sequential** | A -> B | A must complete before B | 0001 -> 0002 |
| **Parallel** | A \|\| B | Can run simultaneously | 0003 \|\| 0004 |
| **Blocked** | A X B | Waiting on external factor | 0005 X API approval |
| **Gatekeeper** | A <-> B | Multiple tasks depend on A | 0001 <-> (0002, 0003) |
| **Critical Path** | * | Timeline-determining tasks | * 0001 -> 0004 -> 0007 |

### Dependency Symbols in Markdown

```
Sequential:    Task A -> Task B
Parallel:      Task A || Task B
Blocked:       Task A X Task B
Gatekeeper:    Task A <-> Task B
Critical Path: * Task A -> Task B -> Task C
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
X Circular Dependency:
   Task A -> Task B -> Task A
   (Invalid! Break the cycle by redefining tasks)

X Missing Dependency:
   Task B (depends on A's output) but not documented
   (Add explicit dependency documentation)

X Over-Constraint:
   Task C -> Task D (unnecessary blocking)
   (Validate whether dependency is real or perceived)

X Phase-Based Decomposition:
   Task 0352: Add Antigravity adapter
     ├── 0356: investigate agy CLI      ← Phase!
     ├── 0357: design adapter            ← Phase!
     ├── 0358: implement adapter         ← Feature, not phase
   (See anti-patterns.md for full case study)
```

> **Important:** See [anti-patterns.md](anti-patterns.md) for detailed examples of decomposition mistakes and how to avoid them.
