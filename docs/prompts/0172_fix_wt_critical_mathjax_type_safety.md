---
name: Fix WT Critical - MathJax Type Safety
description: |
  Fix critical type safety issue: MathJax global variables accessed without proper type declarations in katex.ts. Add proper global type declarations.

priority: P0
status: pending
affected_files:
  - plugins/wt/skills/publish-to-wechatmp/scripts/md/extensions/katex.ts
  - plugins/wt/skills/publish-to-wechatmp/scripts/md/extensions/katex.d.ts (new)
estimated_complexity: low
---

# 0172. Fix WT Critical - MathJax Type Safety

## Background

The `katex.ts` extension uses `window.MathJax` global variable without proper TypeScript type declarations. Currently, the code uses `@ts-expect-error` comments to suppress type errors:

```typescript
// @ts-expect-error MathJax is a global variable
window.MathJax.texReset()
// @ts-expect-error MathJax is a global variable
const mjxContainer = window.MathJax.tex2svg(token.text, { display })
```

This approach has several problems:

1. **Type Safety Loss**: No compile-time checking for MathJax API usage
2. **Poor Developer Experience**: No autocomplete or IntelliSense for MathJax methods
3. **Maintenance Risk**: Typos in API calls go undetected until runtime
4. **Documentation Gap**: No inline documentation for MathJax types

## Requirements

**Functional Requirements:**

1. **Create MathJax Type Declarations**
   - Create `katex.d.ts` with proper MathJax global type definitions
   - Define `MathJax` interface with `texReset()` and `tex2svg()` methods
   - Define return types for MathJax API calls
   - Define SVG element types returned by `tex2svg()`

2. **Remove @ts-expect-error Comments**
   - Replace type suppressions with proper type usage
   - Ensure all MathJax API calls are type-safe

3. **Add JSDoc Documentation**
   - Document MathJax global interface
   - Include usage examples in comments

**Non-Functional Requirements:**

- Must not break existing functionality
- Must work with TypeScript strict mode
- Must provide accurate type information for IDE support

**Acceptance Criteria:**

- [ ] `katex.d.ts` created with proper MathJax type definitions
- [ ] `@ts-expect-error` comments removed from `katex.ts`
- [ ] No TypeScript compilation errors
- [ ] IDE autocomplete works for `window.MathJax` API
- [ ] Existing MathJax rendering functionality preserved
- [ ] Type definitions include proper JSDoc comments

## Design

**Type Declaration File:**

```typescript
// plugins/wt/skills/publish-to-wechatmp/scripts/md/extensions/katex.d.ts

/**
 * MathJax Global Type Declarations
 *
 * This file provides TypeScript type definitions for the MathJax library
 * when loaded as a global script in the browser context.
 *
 * MathJax is expected to be loaded via script tag before this code runs:
 * <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
 */

declare global {
  interface Window {
    /**
     * MathJax global object loaded from external script
     *
     * Provides methods for converting LaTeX to SVG for mathematical notation.
     */
    MathJax: MathJaxGlobal;
  }
}

/**
 * MathJax global interface
 *
 * Provides access to MathJax's TeX-to-SVG conversion functionality.
 */
interface MathJaxGlobal {
  /**
   * Reset the TeX input processor
   *
   * Clears any cached TeX state to ensure fresh processing.
   */
  texReset(): void;

  /**
   * Convert TeX/LaTeX string to SVG element
   *
   * @param tex - The LaTeX string to convert
   * @param options - Conversion options
   * @returns SVG element container with the rendered math
   *
   * @example
   * const container = window.MathJax.tex2svg('E = mc^2', { display: true });
   * const svg = container.firstChild;
   */
  tex2svg(tex: string, options?: MathJaxTeXOptions): MathJaxContainer;
}

/**
 * Options for TeX to SVG conversion
 */
interface MathJaxTeXOptions {
  /**
   * Display mode: true for block (display) math, false for inline
   *
   * - `true`: Render as display math (centered, larger)
   * - `false`: Render as inline math (flows with text)
   */
  display?: boolean;

  /**
   * Additional MathJax configuration options
   */
  [key: string]: any;
}

/**
 * MathJax SVG container element
 *
 * The return value from tex2svg() is a container element
 * that holds the SVG representation of the rendered math.
 */
interface MathJaxContainer extends HTMLElement {
  /**
   * First child is the actual SVG element
   */
  firstChild: MathJaxSVGElement;
}

/**
 * SVG element returned by MathJax
 *
 * Contains the rendered mathematical notation as SVG graphics.
 */
interface MathJaxSVGElement extends SVGSVGElement {
  /**
   * Style attribute with min-width or width setting
   */
  style: CSSStyleDeclaration & {
    'min-width'?: string;
  };

  /**
   * Get the width attribute value
   *
   * @returns Width value as string or null
   */
  getAttribute(name: 'width'): string | null;

  /**
   * Remove an attribute
   *
   * @param name - Attribute name to remove
   */
  removeAttribute(name: 'width'): void;

  /**
   * Get outer HTML representation
   *
   * @returns HTML string of the element and its children
   */
  outerHTML: string;
}

// Export empty type to ensure this file is treated as a module
export {};
```

**Updated katex.ts:**

```typescript
// plugins/wt/skills/publish-to-wechatmp/scripts/md/extensions/katex.ts

import type { MarkedExtension } from 'marked';

// Type definitions are imported from katex.d.ts
// No @ts-expect-error comments needed

export interface MarkedKatexOptions {
  nonStandard?: boolean;
}

// ... existing regex rules ...

function createRenderer(display: boolean, withStyle: boolean = true) {
  return (token: any) => {
    // Type-safe MathJax access
    window.MathJax.texReset();
    const mjxContainer = window.MathJax.tex2svg(token.text, { display });
    const svg = mjxContainer.firstChild;
    const width = svg.style['min-width'] || svg.getAttribute('width');
    svg.removeAttribute('width');

    if (withStyle) {
      svg.style.display = 'initial';
      svg.style.setProperty('max-width', '300vw', 'important');
      svg.style.flexShrink = '0';
      svg.style.width = width;
    }

    if (!display) {
      return `<span class="katex-inline">${svg.outerHTML}</span>`;
    }

    return `<section class="katex-block">${svg.outerHTML}</section>`;
  };
}

// ... rest of the file ...
```

## Plan

**Phase 1: Create Type Declarations**
- [ ] Create `plugins/wt/skills/publish-to-wechatmp/scripts/md/extensions/katex.d.ts`
- [ ] Define `MathJaxGlobal` interface with proper methods
- [ ] Define `MathJaxTeXOptions` interface for conversion options
- [ ] Define `MathJaxContainer` and `MathJaxSVGElement` interfaces
- [ ] Add JSDoc documentation to all interfaces and methods
- [ ] Export empty type to make file a module

**Phase 2: Update katex.ts**
- [ ] Remove `@ts-expect-error` comments
- [ ] Verify type-safe access to `window.MathJax`
- [ ] Ensure no TypeScript compilation errors

**Phase 3: Testing**
- [ ] Run TypeScript compiler to verify no errors
- [ ] Verify IDE autocomplete works for MathJax API
- [ ] Test MathJax rendering with sample LaTeX
- [ ] Verify both inline and block math rendering

**Phase 4: Documentation**
- [ ] Update SKILL.md to mention type safety improvements
- [ ] Add note about MathJax external dependency

## Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Type Declarations | plugins/wt/skills/publish-to-wechatmp/scripts/md/extensions/katex.d.ts | This task | 2026-02-07 |
| Updated Source | plugins/wt/skills/publish-to-wechatmp/scripts/md/extensions/katex.ts | This task | 2026-02-07 |

## References

- [Task 0170](/docs/prompts/0170_adapt_publish-to-wechatmp_with_playwright.md) - Related WeChat MP publishing task
- [Existing katex.ts](/plugins/wt/skills/publish-to-wechatmp/scripts/md/extensions/katex.ts) - File to be updated
- [MathJax Documentation](https://docs.mathjax.org/) - Official MathJax documentation
- [TypeScript Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html) - Best practices for .d.ts files
