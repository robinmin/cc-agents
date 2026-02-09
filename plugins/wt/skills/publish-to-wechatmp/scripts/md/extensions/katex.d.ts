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
