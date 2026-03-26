---
name: core-planning-dimensions
description: "Extracted section: Core Planning Dimensions"
see_also:
  - rd3:pl-javascript
---

# Core Planning Dimensions

### 1. Project Structure Selection

Choose based on project type and scale:

| Project Type | Recommended Structure | Key Directories |
|--------------|----------------------|-----------------|
| **Simple Script/Utility** | Single file or IIFE | `src/` |
| **Node.js CLI Tool** | `bin/` + `lib/` + package.json | `bin/`, `lib/` |
| **Browser Library** | UMD/ESM build with `dist/` | `src/`, `dist/` |
| **Web Application** | `src/` with components, services, utils | `src/` |
| **Node.js Service** | `src/` with routes, controllers, models | `src/`, `tests/` |
| **Monorepo** | Multiple packages with workspace | `packages/*/` |

### 2. Async Pattern Selection

| Pattern | Best For | Complexity | ES Version |
|---------|----------|------------|------------|
| **Promise Chain** | Simple sequential operations | Low | ES2015+ |
| **Async/Await** | Readable sequential code | Low | ES2017+ |
| **Promise.all** | Parallel independent operations | Medium | ES2015+ |
| **Promise.allSettled** | Parallel with fault tolerance | Medium | ES2015+ |
| **Promise.race** | Timeout/cancellation patterns | Medium | ES2015+ |
| **Promise.any** | First resolved only | Medium | ES2021+ |
| **Async Generator** | Streaming data processing | High | ES2018+ |
| **EventEmitter** | Decoupled event-driven systems | High | Node.js |

### 3. Framework/Library Selection

| Purpose | Recommendation | When to Use |
|---------|---------------|-------------|
| **Build Tool** | Vite 6 | Modern web apps, fast dev server |
| **Build Tool** | Bun | Fast runtime, bundling, package management |
| **Bundler** | esbuild | Maximum build speed |
| **Testing** | Vitest 3 | Modern, fast, ESM-first |
| **Testing** | Jest | Broad compatibility |
| **E2E Testing** | Playwright | Modern browsers, cross-browser |
| **E2E Testing** | Cypress | Legacy browser support |
| **State Management** | Zustand | Simple, lightweight state |
| **State Management** | Redux Toolkit | Complex state, time-travel debug |
| **HTTP Client** | Fetch API | Built-in, simple requests |
| **HTTP Client** | ky | Tiny, elegant fetch wrapper |

### 4. Module System Planning

Always specify module system — Different environments require different approaches:

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
