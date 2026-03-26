---
name: pl-javascript
description: "JavaScript project planning skill: architectural guidance, ES2024+ features, async patterns, DOM manipulation, module systems, and best practices for modern JavaScript. Trigger when: planning a JavaScript project, designing JavaScript architecture, selecting async patterns, or structuring JavaScript applications."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-25
updated_at: 2026-03-25
type: technique
tags: [javascript, planning, architecture, es2024, async-patterns, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: architecture-design
  interactions:
    - tool-wrapper
    - generator
  trigger_keywords:
    - javascript project
    - javascript architecture
    - javascript planning
    - es2024
    - es2022
    - async patterns
    - dom manipulation
    - javascript modules
    - javascript testing strategy
    - javascript project structure
see_also:
  - rd3:pl-typescript
  - rd3:sys-developing
  - rd3:sys-debugging
---

# rd3:pl-javascript — JavaScript Project Planning

Comprehensive JavaScript planning skill for designing project structures, planning feature implementation, and selecting appropriate architecture patterns for modern JavaScript (ES2024+).

## When to Use

Invoke this skill when:
- Planning a new JavaScript project from scratch
- Designing JavaScript architecture for an existing codebase
- Selecting async patterns and error handling strategies
- Planning DOM manipulation or browser API usage
- Structuring module systems (ESM, CommonJS, dual packages)
- Planning JavaScript testing strategies
- Evaluating JavaScript best practices for a team or codebase
- Migrating from legacy JavaScript (ES5) to modern JavaScript
- Planning JavaScript monorepo structures

## Quick Start

```
1. ANALYZE — Understand project requirements, constraints, scale
2. SELECT STRUCTURE — Choose appropriate project layout
3. DESIGN ARCHITECTURE — Select async pattern, module system, framework
4. PLAN IMPLEMENTATION — Break down with component design
5. RECOMMEND TOOLS — Suggest frameworks, libraries, testing setup
6. SPECIFY VERSION — Identify ES version and browser support requirements
```

For detailed patterns, examples, and best practices, see `references/`.
## SOTA JavaScript Features (ES2022-2026)

### Top-Level Await (ES2022)

```javascript
// In ESM modules only - no async wrapper needed
const data = await fetch('/api/data').then(r => r.json());
const config = await import('./config.js');
```

### Array Grouping (ES2023)

```javascript
// Group by a key
const inventory = [
  { name: 'asparagus', type: 'vegetables' },
  { name: 'bananas', type: 'fruit' },
  { name: 'goat', type: 'meat' },
];

const grouped = Object.groupBy(inventory, item => item.type);
// { vegetables: [...], fruit: [...], meat: [...] }
```

### Hashbang Grammar (ES2023)

```javascript
#!/usr/bin/env node
// Recognized as comment by JS engines, allows Unix shebang
```

### Iterator Helpers (ES2024)

```javascript
// Transform iterators without consuming them
function* generateNumbers() {
  yield* [1, 2, 3, 4, 5];
}

const squared = generateNumbers().map(x => x * x);
console.log([...squared]); // [1, 4, 9, 16, 25]

// Filter
const evens = generateNumbers().filter(x => x % 2 === 0);

// Take/drop
const firstTwo = generateNumbers().take(2);
const rest = generateNumbers().drop(2);
```

### Promise.withResolvers (ES2024)

```javascript
const { promise, resolve, reject } = Promise.withResolvers();
// More ergonomic than new Promise((resolve, reject) => ...)
```

### Math.sumPrecise (ES2024)

```javascript
// Precise floating-point sum for financial calculations
const total = Math.sumPrecise([0.1, 0.2, 0.3]); // 0.6 exactly
```

### ArrayBuffer Transfer (ES2024)

```javascript
const buffer = new ArrayBuffer(1024);
// Transfer ownership without copying
const transferred = buffer.transfer(newBuffer);
```

## Planning Workflow

### Phase 1: Requirements Analysis

1. **Understand the Goal**
   - What problem does this solve?
   - Who are the users?
   - What are success criteria?

2. **Identify Constraints**
   - Browser support requirements (ES version, legacy browsers)
   - Performance requirements (load time, interactivity)
   - Scale expectations (page views, data volume)
   - Deployment environment (browser only, Node.js, hybrid)

3. **Map Dependencies**
   - External services (APIs, CDNs)
   - Build tool requirements
   - Framework/library constraints
   - Platform constraints (browser vs. Node.js)

### Phase 2: Structure and Architecture

1. **Select Project Structure**
   - Use `references/project-structures.md` to choose layout
   - Consider growth path (start simple, evolve as needed)
   - Plan for module system (ESM vs. CommonJS)

2. **Choose Architecture Pattern**
   - Match pattern to problem complexity
   - Consider team familiarity
   - Plan for testability

3. **Define Component Hierarchy**
   - Identify key components/modules
   - Plan component boundaries
   - Define data flow patterns

### Phase 3: Implementation Planning

1. **Break Down into Phases**
   - Phase 1: Core functionality (MVP)
   - Phase 2: Integration and testing
   - Phase 3: Polish and optimization

2. **Identify Key Technologies**
   - Framework: React, Vue, Svelte, or vanilla
   - Build tool: Vite, Bun, esbuild
   - Testing: Vitest, Jest, Playwright
   - State management: Zustand, Redux, Context API

3. **Plan Async Strategy**
   - Data fetching patterns (Promises, async/await)
   - Error handling strategy
   - Loading states and fallbacks

### Phase 4: Risk Assessment

| Risk Category | Indicators | Mitigation |
|---------------|------------|------------|
| **Async Errors** | Promise rejection, uncaught exceptions | Global error handlers, try-catch boundaries |
| **Memory Leaks** | Long-running apps, DOM manipulation | Event listener cleanup, WeakMap usage |
| **Performance** | Large DOM, frequent updates | Virtual DOM, debouncing, lazy loading |
| **Browser Support** | Legacy browser requirements | Polyfills, transpilation, feature detection |
| **State Management** | Complex data flow | Centralized state, immutability patterns |

## Best Practices

### Always Do

- Use `const` by default, `let` when reassignment is needed
- Use strict equality (`===`) over loose equality (`==`)
- Use arrow functions for callbacks (preserves `this`)
- Use template literals for string concatenation
- Use destructuring for object/array access
- Use async/await for asynchronous code (readability)
- Handle errors with try-catch blocks at async boundaries
- Remove event listeners when done (memory management)
- Use meaningful variable names (self-documenting code)
- Plan for error boundaries in component architecture
- Design for progressive enhancement
- Use modern ES6+ features (unless legacy support required)
- Consider browser support before using new APIs
- Use ESM for new projects
- Enable type safety with JSDoc or TypeScript

### Never Do

- Use `var` (use `let`/`const` for block scoping)
- Ignore promise rejections (always handle errors)
- Mix `await` and `.then()` unnecessarily (choose one style)
- Use `eval()` or `Function()` constructor (security risk)
- Rely on type coercion (use explicit conversion)
- Create global variables unnecessarily (pollutes global scope)
- Forget to clean up resources (event listeners, timers)
- Use `==` instead of `===` (avoids coercion bugs)
- Create deeply nested callback chains (use async/await)
- Manipulate DOM excessively without batching (performance)
- Hardcode configuration values (use environment variables)
- Skip error handling in async functions
- Use synchronous operations for I/O (blocks event loop)

## Output Format

### JavaScript Project Plan Output

When providing JavaScript project planning guidance, use this format:

```markdown
# JavaScript Project Plan: {Project Name}

## Overview

**Goal**: {What we're building}
**Project Type**: {Web App/Node.js Service/Library/CLI}
**Environment**: {Browser/Node.js/Hybrid}
**Scale**: {Small/Medium/Large}
**Estimated Phases**: {count}
**ES Version**: {ES2022+ recommended}

## Project Structure

**Layout**: {simple / component-based / monorepo}
{directory structure}

**Rationale**: {Why this structure}

## Architecture Pattern

**Pattern**: {Component-Based/Event-Driven/Service-Oriented}

**Module Structure**:
- `src/components/` - {UI components}
- `src/services/` - {API/external services}
- `src/utils/` - {utility functions}
- `src/state/` - {state management}

## Implementation Plan

### Phase 1: Foundation
- [ ] {Task 1}
- [ ] {Task 2}
- [ ] {Task 3}

### Phase 2: Core Features
- [ ] {Task 1}
- [ ] {Task 2}

### Phase 3: Integration & Testing
- [ ] {Task 1}
- [ ] {Task 2}

## Technology Stack

| Purpose | Technology | Version | Reason |
|---------|-----------|---------|--------|
| Runtime | Node.js 20+ / Bun 1.x | latest | ESM-first, fast startup |
| Build Tool | Vite 6 | latest | Fast HMR, optimized builds |
| Testing | Vitest 3 | latest | Fast, ESM-native |
| HTTP | Fetch / ky | native | Built-in, lightweight |
| State | Zustand | latest | Simple, lightweight |

## Async Strategy

**Pattern**: {Async/Await / Promise Chain / EventEmitter}

**Error Handling**:
- Try-catch at async boundaries
- Global error handlers
- Error boundary components (if React)

**Data Flow**:
```javascript
// Example async pattern
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    logger.error('User fetch failed', { userId, error });
    throw error;
  }
}
```

## Testing Strategy

**Target Coverage**: 85%+

**Test Layers**:
- Unit tests for utilities and services
- Component tests for UI
- E2E tests for critical flows

**Testing Tools**: Vitest (unit), Playwright (E2E)

## Performance Considerations

**Optimization Strategy**:
- Code splitting for lazy loading
- Tree shaking for unused code
- Image optimization and lazy loading
- Debounce/throttle for event handlers

**Budget Targets**:
- Initial bundle: <200KB gzipped
- Time to Interactive: <3s
- Lighthouse Score: 90+

## Browser Support

**Target Browsers**: {Chrome 120+, Firefox 121+, Safari 17+}

**Polyfills**: {whatwg-fetch, core-js}

**Build Transpilation**: ES2022 target

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| {Risk 1} | High/Low | {Mitigation strategy} |
| {Risk 2} | High/Low | {Mitigation strategy} |

## Next Steps

1. Review and approve architecture
2. Initialize project with build tool
3. Set up project structure
4. Begin Phase 1 implementation
```

## Workflows

### JavaScript Project Planning Workflow

Invoke this skill when starting a new JavaScript project or planning significant changes to an existing codebase.

**When to invoke:**
1. User asks to plan a JavaScript project
2. User asks about JavaScript architecture or project structure
3. User asks about ES version migration or upgrades
4. User asks about async patterns or error handling strategies

**Workflow steps:**
1. **Analyze requirements** — Understand project goals, scale, and constraints
2. **Select structure** — Choose appropriate project layout from `references/project-structures.md`
3. **Design architecture** — Select async patterns, module system, and framework
4. **Plan implementation** — Break down into phases with clear milestones
5. **Recommend tools** — Suggest build tools, testing frameworks, and dependencies
6. **Output plan** — Generate structured markdown plan using the Output Format

**Output format:**
The skill produces a structured project plan with:
- Overview (goal, type, scale, ES version)
- Project structure with directory layout
- Architecture pattern selection
- Implementation phases with tasks
- Technology stack recommendations
- Async strategy with code examples
- Testing strategy with coverage targets
- Performance budgets
- Risk assessment

## Additional Resources

| Resource | Description |
|----------|-------------|
| [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) | Official JavaScript documentation |
| [ES2024 Specification](https://tc39.es/ecma262/) | ECMA-262 ECMAScript 2024 specification |
| [Vite.js](https://vitejs.dev/) | Next-generation frontend build tool |
| [Vitest](https://vitest.dev/) | Blazing fast unit test framework |
| [Node.js ESM Guide](https://nodejs.org/api/esm.html) | Node.js ESM implementation details |
| [Web Performance](https://developer.mozilla.org/en-US/docs/Web/Performance) | MDN web performance guide |

## Reference Files

| Reference | Purpose |
|-----------|---------|
| `references/es6-features.md` | Complete ES6+ feature guide |
| `references/async-patterns.md` | Promises, async/await, error handling |
| `references/dom-apis.md` | DOM manipulation, event handling |
| `references/performance.md` | Performance optimization techniques |
| `references/common-pitfalls.md` | Common JavaScript mistakes |
| `references/browser-apis.md` | Fetch, LocalStorage, Intersection Observer |
| `references/modules.md` | ESM, CommonJS, dual packages |
| `references/project-structures.md` | Project layout patterns |
| `references/testing.md` | Testing frameworks and strategies |

See [Core Planning Dimensions](references/core-planning-dimensions.md) for detailed content.
