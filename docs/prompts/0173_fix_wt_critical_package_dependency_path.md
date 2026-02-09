---
name: Fix WT Critical - Package Dependency Path
description: |
  Fix critical package dependency issue: Using relative 'file:../../' path instead of workspace protocol for @wt/web-automation. Use workspace:* for monorepo consistency.

priority: P0
status: pending
affected_files:
  - plugins/wt/skills/publish-to-wechatmp/package.json
  - plugins/wt/skills/publish-to-juejin/package.json
  - plugins/wt/skills/publish-to-infoq/package.json
  - plugins/wt/skills/publish-to-zenn/package.json
  - plugins/wt/skills/publish-to-xhs/package.json
  - plugins/wt/skills/publish-to-substack/package.json
  - plugins/wt/skills/publish-to-x/package.json
  - plugins/wt/skills/publish-to-qiita/package.json
  - plugins/wt/skills/publish-to-medium/package.json
  - plugins/wt/package.json (root)
estimated_complexity: low
---

# 0173. Fix WT Critical - Package Dependency Path

## Background

Currently, `publish-to-wechatmp` (and potentially other publish-to-* skills) uses a relative `file:../../` path for the `@wt/web-automation` dev dependency:

```json
{
  "devDependencies": {
    "@wt/web-automation": "file:../../scripts/web-automation"
  }
}
```

This approach has several problems:

1. **Breaks Workspace Tools**: pnpm/yarn workspaces use `workspace:*` protocol for dependency management
2. **Path Fragility**: Relative paths break when package structure changes
3. **Hoisting Issues**: Node.js module resolution may fail with local file: paths
4. **Version Inconsistency**: No way to track which version of web-automation is being used
5. **Publishing Problems**: `file:` dependencies are not publishable to npm

## Requirements

**Functional Requirements:**

1. **Use Workspace Protocol**
   - Replace all `file:../../scripts/web-automation` with `workspace:*`
   - Ensure root package.json has proper workspace configuration
   - Add `@wt/web-automation` to workspace packages if not already present

2. **Configure Root Workspace**
   - Update `plugins/wt/package.json` with proper workspace definitions
   - Include both skills/* and scripts/* in workspace patterns
   - Set proper npm client configurations (pnpm/yarn)

3. **Verify All Affected Packages**
   - Scan all `publish-to-*` skill package.json files
   - Replace any `file:` dependencies with `workspace:*`
   - Ensure consistent dependency versioning

4. **Update Build Configuration**
   - Ensure TypeScript can resolve workspace dependencies
   - Update tsconfig.json paths if needed
   - Verify Bun/Node.js can resolve workspace packages

**Non-Functional Requirements:**

- Must maintain backward compatibility during transition
- Must work with both pnpm and yarn (pnpm preferred)
- Must not break existing builds
- Should enable proper dependency hoisting

**Acceptance Criteria:**

- [ ] Root `plugins/wt/package.json` configured with workspaces
- [ ] All skill packages use `workspace:*` for internal dependencies
- [ ] No `file:` dependencies remain in any package.json
- [ ] TypeScript compilation succeeds with workspace dependencies
- [ ] `pnpm install` or `yarn install` works correctly
- [ ] Runtime module resolution works (imports load successfully)
- [ ] Dependencies are properly hoisted to node_modules

## Design

**Root Workspace Configuration:**

```json
// plugins/wt/package.json

{
  "name": "@wt/skills",
  "version": "1.0.0",
  "description": "WT plugin publishing skills",
  "private": true,
  "workspaces": [
    "skills/*",
    "scripts/*"
  ],
  "scripts": {
    "install:all": "pnpm install",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "clean": "pnpm -r clean && rm -rf node_modules"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.3.0"
  },
  "pnpm": {
    "overrides": {
      "@wt/web-automation": "workspace:*"
    }
  }
}
```

**Web Automation Package Configuration:**

```json
// plugins/wt/scripts/web-automation/package.json (new file)

{
  "name": "@wt/web-automation",
  "version": "1.0.0",
  "description": "Shared web automation utilities for WT publishing skills",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./src/cdp": "./src/cdp.ts",
    "./src/config": "./src/config.ts",
    "./src/paste": "./src/paste.ts",
    "./src/playwright": "./src/playwright.ts"
  },
  "dependencies": {
    "playwright": "^1.40.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
```

**Skill Package Configuration (Updated):**

```json
// plugins/wt/skills/publish-to-wechatmp/package.json (updated)

{
  "name": "publish-to-wechatmp",
  "version": "2.0.0",
  "description": "WeChat MP publishing scripts with Playwright",
  "type": "module",
  "dependencies": {
    "fflate": "^0.8.2",
    "front-matter": "^4.0.2",
    "highlight.js": "^11.11.1",
    "marked": "^17.0.1",
    "playwright": "^1.40.0",
    "reading-time": "^1.5.0",
    "@wt/web-automation": "workspace:*"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

**TypeScript Configuration:**

```json
// plugins/wt/tsconfig.json (new or updated)

{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "moduleResolution": "bundler",
    "paths": {
      "@wt/web-automation": ["./scripts/web-automation/src"],
      "@wt/web-automation/*": ["./scripts/web-automation/src/*"]
    }
  },
  "references": [
    { "path": "./scripts/web-automation" },
    { "path": "./skills/publish-to-wechatmp" },
    { "path": "./skills/publish-to-x" }
    // ... other skills
  ]
}
```

## Plan

**Phase 1: Create Web Automation Package**
- [ ] Create `plugins/wt/scripts/web-automation/package.json`
- [ ] Define proper exports map for module resolution
- [ ] Move any existing shared code to this package

**Phase 2: Configure Root Workspace**
- [ ] Update `plugins/wt/package.json` with workspaces configuration
- [ ] Add workspace scripts (install:all, build, clean)
- [ ] Configure pnpm overrides for internal dependencies

**Phase 3: Update All Skill Packages**
- [ ] Scan all `publish-to-*/package.json` files
- [ ] Replace `file:` dependencies with `workspace:*`
- [ ] Move `@wt/web-automation` to dependencies (not devDependencies)

**Phase 4: TypeScript Configuration**
- [ ] Create or update `plugins/wt/tsconfig.json`
- [ ] Add paths mapping for workspace packages
- [ ] Add project references for composite builds

**Phase 5: Testing**
- [ ] Run `pnpm install` to verify workspace setup
- [ ] Verify TypeScript compilation with workspace dependencies
- [ ] Test runtime module resolution
- [ ] Verify all skills still work correctly

**Phase 6: Documentation**
- [ ] Update README with workspace setup instructions
- [ ] Document the workspace structure
- [ ] Add troubleshooting guide for common workspace issues

## Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Root Config | plugins/wt/package.json | This task | 2026-02-07 |
| Web Automation Package | plugins/wt/scripts/web-automation/package.json | This task | 2026-02-07 |
| TypeScript Config | plugins/wt/tsconfig.json | This task | 2026-02-07 |
| Updated Skill Packages | All skills/*/package.json | This task | 2026-02-07 |

## References

- [Task 0171](/docs/prompts/0171_fix_wt_critical_cdp_code_duplication.md) - Related CDP consolidation task
- [pnpm Workspaces](https://pnpm.io/workspaces) - pnpm workspace documentation
- [Yarn Workspaces](https://yarnpkg.com/features/workspaces) - Yarn workspace documentation
- [Node.js Workspace Protocol](https://nodejs.org/api/packages.html#workspace-protocol) - Node.js workspace protocol specification
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html) - TS composite projects guide
