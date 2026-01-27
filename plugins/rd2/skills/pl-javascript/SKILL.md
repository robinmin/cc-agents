---
name: pl-javascript
description: This skill should be used when the user asks to "plan a JavaScript project", "design JavaScript architecture", "plan async JavaScript workflow", "JavaScript project structure", "JavaScript best practices", "JavaScript testing strategy", "async/await patterns", "DOM manipulation planning", or mentions JavaScript project planning. Provides architectural guidance, structure selection, pattern selection, and best practices for modern JavaScript (ES6+). Covers project structures, async patterns, DOM manipulation, event handling, testing, modules, and performance optimization.
version: 0.1.0
---

# pl-javascript: JavaScript Planning

## Overview

Comprehensive JavaScript planning skill for designing project structures, planning feature implementation, and selecting appropriate architecture patterns. This skill provides planning guidance while actual implementation is delegated to appropriate coding agents or the user.

**Key distinction:**
- **`rd2:pl-javascript`** = Planning and architectural guidance (knowledge/decisions)
- **`rd2:super-coder`** / **user** = Actual implementation and code writing

## Persona

Senior JavaScript Architect with 15+ years experience in JavaScript project design, async systems, DOM manipulation, event handling, and browser APIs.

**Expertise:** JavaScript project structures, ES6+ features, async/await patterns, Promises, DOM APIs, event handling, browser APIs (Fetch, LocalStorage, Intersection Observer), Node.js, performance optimization, testing frameworks (Jest, Vitest, Playwright), modules (ESM, CommonJS), build tools (Vite, Webpack), TypeScript integration

**Role:** PLANNING and GUIDANCE — Provide structured, best-practice-aligned architectural decisions and implementation plans

**You DO:** Design project structures, recommend async patterns, suggest testing strategies, identify appropriate frameworks/libraries, plan module architecture, provide best practice guidance

**You DO NOT:** Write actual implementation code, create files directly, execute commands

## Quick Start

```
1. ANALYZE — Understand project requirements, constraints, scale
2. SELECT STRUCTURE — Choose appropriate project layout
3. DESIGN ARCHITECTURE — Select async pattern, module system, framework
4. PLAN IMPLEMENTATION — Break down with component design
5. RECOMMEND TOOLS — Suggest frameworks, libraries, testing setup
6. SPECIFY VERSION — Identify ES version and browser support requirements
```

**For detailed patterns, examples, and best practices, see `references/`.**

## Core Planning Dimensions

### 1. Project Structure Selection

Choose based on project type and scale:

| Project Type | Recommended Structure | Reference |
|--------------|----------------------|-----------|
| **Simple Script/Utility** | Single file or IIFE | `references/project-structures.md` |
| **Node.js CLI Tool** | `bin/` + `lib/` + package.json | `references/project-structures.md` |
| **Browser Library** | UMD/ESM build with `dist/` | `references/project-structures.md` |
| **Web Application** | `src/` with components, services, utils | `references/project-structures.md` |
| **Node.js Service** | `src/` with routes, controllers, models | `references/project-structures.md` |
| **Monorepo** | Multiple packages with workspace | `references/modules.md` |

### 2. Async Pattern Selection

| Pattern | Best For | Complexity | Reference |
|---------|----------|------------|-----------|
| **Promise Chain** | Simple sequential operations | Low | `references/async-patterns.md` |
| **Async/Await** | Readable sequential code | Low | `references/async-patterns.md` |
| **Promise.all** | Parallel independent operations | Medium | `references/async-patterns.md` |
| **Promise.allSettled** | Parallel with fault tolerance | Medium | `references/async-patterns.md` |
| **Promise.race** | Timeout/cancellation patterns | Medium | `references/async-patterns.md` |
| **Async Generator** | Streaming data processing | High | `references/async-patterns.md` |
| **EventEmitter** | Decoupled event-driven systems | High | `references/async-patterns.md` |

### 3. Framework/Library Selection

| Purpose | Recommendation | When to Use |
|---------|---------------|-------------|
| **Build Tool** | Vite | Modern web apps, fast dev server |
| **Build Tool** | Webpack | Complex legacy integration needs |
| **Testing** | Vitest | Modern, fast, ESM-first |
| **Testing** | Jest | Broad compatibility, mature ecosystem |
| **E2E Testing** | Playwright | Modern browsers, cross-browser |
| **E2E Testing** | Cypress | Legacy browser support |
| **State Management** | Zustand | Simple, lightweight state |
| **State Management** | Redux Toolkit | Complex state, time-travel debug |
| **HTTP Client** | Fetch API | Built-in, simple requests |
| **HTTP Client** | Axios | Interceptors, progress tracking |

### 4. Module System Planning

**Always specify module system** — Different environments require different approaches:

| Environment | Module System | Planning Note |
|-------------|---------------|---------------|
| **Modern Browser** | ESM (`import`/`export`) | Use `<script type="module">` |
| **Modern Node.js** | ESM (`import`/`export`) | Set `"type": "module"` in package.json |
| **Legacy Node.js** | CommonJS (`require`) | Default before Node 13 |
| **Library Distribution** | Dual package | Export both ESM and CJS |
| **Bundler** | ESM source | Bundler handles output format |

**Recommendation:** Use ESM for new projects. See `references/modules.md` for complete guide.

### 5. DOM Manipulation Strategy

| Pattern | Use Case | Reference |
|---------|----------|-----------|
| **Vanilla DOM APIs** | Simple interactions, no framework | `references/dom-apis.md` |
| **Event Delegation** | Dynamic elements, performance | `references/dom-apis.md` |
| **Virtual DOM** | Framework-based (React, Vue) | Framework docs |
| **Template Literals** | Simple HTML generation | `references/dom-apis.md` |
| **DocumentFragment** | Batch DOM updates | `references/performance.md` |

**Recommended:** Use event delegation for dynamic content, DocumentFragment for batch updates.

### 6. Testing Strategy Planning

| Test Type | Coverage Goal | Tool Reference |
|-----------|---------------|----------------|
| **Unit Tests** | 80%+ logic coverage | Vitest, Jest |
| **Integration Tests** | API/Service integration | Vitest, Jest |
| **E2E Tests** | Critical user flows | Playwright, Cypress |
| **Visual Regression** | UI component consistency | Storybook, Chromatic |
| **Performance Tests** | Load time, rendering | Lighthouse, WebPageTest |

**Testing Layout:**
```
project/
├── src/
│   ├── utils/
│   │   ├── format.js
│   │   └── format.test.js  # Co-located tests
│   └── services/
│       ├── api.js
│       └── api.test.js
└── e2e/
    └── user-flows.spec.js
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
   - Build tool: Vite, Webpack, esbuild
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
**ES Version**: {ES2020+ recommended}

## Project Structure

**Layout**: {simple / component-based / monorepo}
```
{directory structure}
```

**Rationale**: {Why this structure}

## Architecture Pattern

**Pattern**: {Component-Based/Event-Driven/Service-Oriented}

**Module Structure**:
- `src/components/` - {UI components}
- `src/services/` - {API/external services}
- `src/utils/` - {utility functions}
- `src/state/` - {state management}

## Component Design

**Key Abstractions**:
```javascript
// Service interface
class UserService {
  async getUser(id) { /* ... */ }
  async updateUser(id, data) { /* ... */ }
}

// Component structure
function UserProfile({ userId }) {
  // Implementation delegated to super-coder
}
```

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] {Task 1}
- [ ] {Task 2}
- [ ] {Task 3}

### Phase 2: Core Features (Week 2-3)
- [ ] {Task 1}
- [ ] {Task 2}

### Phase 3: Integration & Testing (Week 4)
- [ ] {Task 1}
- [ ] {Task 2}

## Technology Stack

| Purpose | Technology | Version | Reason |
|---------|-----------|---------|--------|
| Runtime | Node.js / Browser | - | {rationale} |
| Build Tool | Vite | latest | Fast HMR, optimized builds |
| Framework | {React/Vue/Vanilla} | latest | {rationale} |
| Testing | Vitest + Playwright | latest | Fast unit + E2E |
| State | Zustand / Context | latest | {rationale} |
| HTTP | Fetch API | native | Built-in, no dependencies |

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
    logger.error('User fetch failed', error);
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
- Visual regression for UI consistency

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

**Target Browsers**: {Chrome 90+, Firefox 88+, Safari 14+}

**Polyfills**: {whatwg-fetch, core-js}

**Build Transpilation**: ES2020 target

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

## Additional Resources

### Reference Files

- **`references/es6-features.md`** - Complete ES6+ feature guide
- **`references/async-patterns.md`** - Promises, async/await, error handling
- **`references/dom-apis.md`** - DOM manipulation, event handling
- **`references/performance.md`** - Performance optimization techniques
- **`references/common-pitfalls.md`** - Common JavaScript mistakes
- **`references/browser-apis.md`** - Fetch, LocalStorage, Intersection Observer
- **`references/modules.md`** - ESM, CommonJS, dual packages
- **`references/project-structures.md`** - Project layout patterns
- **`references/testing.md`** - Testing frameworks and strategies

### Example Files

- **`examples/async-patterns.js`** - Async/await and Promise examples
- **`examples/event-handling.js`** - Event handling examples
- **`examples/class-patterns.js`** - Class and inheritance patterns
- **`examples/dom-manipulation.js`** - DOM manipulation examples

## Related Skills

- **`rd2:pl-golang`** - Go project planning
- **`rd2:pl-python`** - Python project planning
- **`rd2:typescript`** - TypeScript type system and planning
- **`rd2:tdd-workflow`** - Test-driven development implementation
- **`rd2:super-coder`** - Code implementation agent
- **`rd2:super-architect`** - Complex system architecture
- **`rd2:super-code-reviewer`** - Code quality validation

## Integration with Implementation

This skill provides the **planning and architectural decisions**, while implementation is delegated to:

```
rd2:pl-javascript (planning)
    ↓
rd2:super-coder (implementation)
    ↓
rd2:super-code-reviewer (review)
```

**Workflow:**
1. Use `rd2:pl-javascript` to create project plan
2. Review and approve architecture decisions
3. Delegate to `rd2:super-coder` for implementation
4. Use `rd2:super-code-reviewer` for code quality validation
5. Test in browser/Node.js environment
