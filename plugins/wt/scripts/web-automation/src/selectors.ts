/**
 * Selector utilities for browser automation
 *
 * This module provides enhanced selector utilities for finding and interacting
 * with DOM elements across different platforms and UI frameworks.
 *
 * @packageDocumentation
 */

import type { Page, Locator, ElementHandle } from 'playwright';

// ============================================================================
// Selector Types
// ============================================================================

export type Selector = string | string[];
export type SelectorFunction = (page: Page) => Locator;

export interface FindOptions {
  timeout?: number;
  visible?: boolean;
  attached?: boolean;
}

export interface FindResult {
  found: boolean;
  selector: string | null;
  locator: Locator | null;
  element?: ElementHandle | null;
}

// ============================================================================
// Multi-Selector Utilities
// ============================================================================

/**
 * Try multiple selectors and return the first match
 *
 * @param page - Playwright Page object
 * @param selectors - Array of selectors to try
 * @param options - Find options
 * @returns Find result with first matching selector
 */
export async function trySelectors(
  page: Page,
  selectors: Selector[],
  options: FindOptions = {}
): Promise<FindResult> {
  const { timeout = 5000, visible = true, attached = true } = options;

  for (const selector of selectors) {
    const selectorArray = Array.isArray(selector) ? selector : [selector];

    for (const sel of selectorArray) {
      try {
        const locator = page.locator(sel).first();

        // Check if element is attached
        if (attached) {
          const isAttached = await locator.count() > 0;
          if (!isAttached) continue;
        }

        // Check if element is visible
        if (visible) {
          const isVisible = await locator.isVisible({ timeout: Math.min(timeout, 2000) }).catch(() => false);
          if (!isVisible) continue;
        }

        return { found: true, selector: sel, locator };
      } catch {
        // Try next selector
      }
    }
  }

  return { found: false, selector: null, locator: null };
}

/**
 * Find element by text content
 *
 * @param page - Playwright Page object
 * @param text - Text to search for
 * @param options - Find options
 * @returns Find result with matching element
 */
export async function findByText(
  page: Page,
  text: string,
  options: FindOptions & { exact?: boolean } = {}
): Promise<FindResult> {
  const { timeout = 5000, exact = false } = options;

  try {
    const selector = exact ? `text="${text}"` : `text=${text}`;
    const locator = page.locator(selector).first();

    // Wait for element
    await locator.waitFor({ state: 'attached', timeout });

    return { found: true, selector, locator };
  } catch {
    return { found: false, selector: null, locator: null };
  }
}

/**
 * Find element by label text (for form inputs)
 *
 * @param page - Playwright Page object
 * @param labelText - Label text to search for
 * @param options - Find options
 * @returns Find result with matching input element
 */
export async function findByLabel(
  page: Page,
  labelText: string,
  options: FindOptions = {}
): Promise<FindResult> {
  // Common label-to-input selector patterns
  const selectorPatterns = [
    `label:text-is("${labelText}") >> input`,
    `label:has-text("${labelText}") >> input`,
    `label:has-text("${labelText}") >> textarea`,
    `[aria-label="${labelText}"]`,
    `[placeholder="${labelText}"]`,
    `input[name="${labelText}"]`,
    `textarea[name="${labelText}"]`,
  ];

  return trySelectors(page, selectorPatterns, options);
}

// ============================================================================
// Selector Wait Utilities
// ============================================================================

/**
 * Wait for any of the selectors to match
 *
 * @param page - Playwright Page object
 * @param selectors - Array of selectors to wait for
 * @param options - Wait options
 * @returns The first matching selector
 */
export async function waitForAnySelector(
  page: Page,
  selectors: string[],
  options: FindOptions = {}
): Promise<string | null> {
  const { timeout = 30000 } = options;

  const result = await trySelectors(page, selectors, { ...options, timeout });
  return result.selector;
}

/**
 * Wait for element to be hidden
 *
 * @param page - Playwright Page object
 * @param selector - Selector to wait for
 * @param options - Wait options
 */
export async function waitForHidden(
  page: Page,
  selector: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 30000 } = options;

  await page.locator(selector).waitFor({ state: 'hidden', timeout });
}

// ============================================================================
// DOM Relationship Selectors
// ============================================================================

/**
 * Find sibling element (next/previous)
 *
 * @param page - Playwright Page object
 * @param baseSelector - Base element selector
 * @param direction - 'next' or 'previous'
 * @param options - Find options
 * @returns Find result with sibling element
 */
export async function findSibling(
  page: Page,
  baseSelector: string,
  direction: 'next' | 'previous' = 'next',
  options: FindOptions = {}
): Promise<FindResult> {
  const xpath = direction === 'next'
    ? `${baseSelector}/following-sibling::*[1]`
    : `${baseSelector}/preceding-sibling::*[1]`;

  return trySelectors(page, [`xpath=${xpath}`], options);
}

/**
 * Find parent element
 *
 * @param page - Playwright Page object
 * @param selector - Child element selector
 * @param options - Find options
 * @returns Find result with parent element
 */
export async function findParent(
  page: Page,
  selector: string,
  options: FindOptions = {}
): Promise<FindResult> {
  return trySelectors(page, [`${selector} >> ..`], options);
}

/**
 * Find child element by selector
 *
 * @param page - Playwright Page object
 * @param parentSelector - Parent element selector
 * @param childSelector - Child element selector
 * @param options - Find options
 * @returns Find result with child element
 */
export async function findChild(
  page: Page,
  parentSelector: string,
  childSelector: string,
  options: FindOptions = {}
): Promise<FindResult> {
  return trySelectors(page, [`${parentSelector} >> ${childSelector}`], options);
}

// ============================================================================
// Element State Utilities
// ============================================================================

/**
 * Check if element exists in DOM
 *
 * @param page - Playwright Page object
 * @param selector - Element selector
 * @returns True if element exists
 */
export async function exists(page: Page, selector: string): Promise<boolean> {
  const count = await page.locator(selector).count();
  return count > 0;
}

/**
 * Check if element is visible
 *
 * @param page - Playwright Page object
 * @param selector - Element selector
 * @returns True if element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    return await page.locator(selector).isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Check if element is enabled
 *
 * @param page - Playwright Page object
 * @param selector - Element selector
 * @returns True if element is enabled
 */
export async function isEnabled(page: Page, selector: string): Promise<boolean> {
  try {
    return await page.locator(selector).isEnabled({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Get element text content
 *
 * @param page - Playwright Page object
 * @param selector - Element selector
 * @returns Element text content
 */
export async function getText(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector).first();
  return await element.textContent() || '';
}

/**
 * Get element attribute value
 *
 * @param page - Playwright Page object
 * @param selector - Element selector
 * @param attribute - Attribute name
 * @returns Attribute value or null
 */
export async function getAttribute(
  page: Page,
  selector: string,
  attribute: string
): Promise<string | null> {
  const element = page.locator(selector).first();
  return await element.getAttribute(attribute);
}

// ============================================================================
// Selector Builder Utilities
// ============================================================================

/**
 * Build selector with multiple attributes
 */
export interface SelectorBuilder {
  tag?: string;
  id?: string;
  class?: string | string[];
  text?: string;
  textContains?: string;
  attrs?: Record<string, string>;
  role?: string;
  ariaLabel?: string;
  placeholder?: string;
  name?: string;
  testId?: string;
}

/**
 * Build a CSS selector from builder options
 */
export function buildSelector(options: SelectorBuilder): string {
  const parts: string[] = [];

  // Tag name
  if (options.tag) {
    parts.push(options.tag);
  }

  // ID
  if (options.id) {
    parts.push(`#${options.id}`);
  }

  // Classes
  if (options.class) {
    const classes = Array.isArray(options.class) ? options.class : [options.class];
    for (const cls of classes) {
      parts.push(`.${cls.replace(/^\.+/, '')}`);
    }
  }

  // Attributes
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      parts.push(`[${key}="${value}"]`);
    }
  }

  // Text (exact)
  if (options.text) {
    parts.push(`:text("${options.text}")`);
  }

  // Text (contains)
  if (options.textContains) {
    parts.push(`:text-is("${options.textContains}")`);
  }

  // Role
  if (options.role) {
    parts.push(`[role="${options.role}"]`);
  }

  // ARIA label
  if (options.ariaLabel) {
    parts.push(`[aria-label="${options.ariaLabel}"]`);
  }

  // Placeholder
  if (options.placeholder) {
    parts.push(`[placeholder="${options.placeholder}"]`);
  }

  // Name
  if (options.name) {
    parts.push(`[name="${options.name}"]`);
  }

  // Test ID
  if (options.testId) {
    parts.push(`[data-testid="${options.testId}"]`);
  }

  return parts.join('');
}

/**
 * Build multiple selector variants for robustness
 */
export function buildSelectorVariants(baseOptions: SelectorBuilder): string[] {
  const variants: string[] = [];

  // Primary selector with all options
  variants.push(buildSelector(baseOptions));

  // Variant without specific class (more permissive)
  if (baseOptions.class) {
    variants.push(buildSelector({ ...baseOptions, class: undefined }));
  }

  // Variant using test ID only
  if (baseOptions.testId) {
    variants.push(`[data-testid="${baseOptions.testId}"]`);
  }

  // Variant using aria label only
  if (baseOptions.ariaLabel) {
    variants.push(`[aria-label="${baseOptions.ariaLabel}"]`);
  }

  // Variant using placeholder only
  if (baseOptions.placeholder) {
    variants.push(`[placeholder="${baseOptions.placeholder}"]`);
  }

  // Variant using role only
  if (baseOptions.role) {
    variants.push(`[role="${baseOptions.role}"]`);
  }

  // Remove duplicates
  return [...new Set(variants)];
}

// ============================================================================
// Common Selector Patterns
// ============================================================================

/**
 * Build button selectors
 */
export function buildButtonSelectors(options: {
  text?: string;
  ariaLabel?: string;
  testId?: string;
}): string[] {
  const variants: string[] = [];

  if (options.text) {
    variants.push(
      `button:has-text("${options.text}")`,
      `button:text-is("${options.text}")`,
      `input[type="submit"][value="${options.text}"]`
    );
  }

  if (options.ariaLabel) {
    variants.push(`button[aria-label="${options.ariaLabel}"]`);
  }

  if (options.testId) {
    variants.push(`[data-testid="${options.testId}"]`);
  }

  return variants;
}

/**
 * Build input selectors
 */
export function buildInputSelectors(options: {
  type?: string;
  name?: string;
  placeholder?: string;
  ariaLabel?: string;
}): string[] {
  const variants: string[] = [];

  const typePart = options.type ? `[type="${options.type}"]` : '';

  if (options.placeholder) {
    variants.push(`input${typePart}[placeholder="${options.placeholder}"]`);
  }

  if (options.name) {
    variants.push(`input${typePart}[name="${options.name}"]`);
  }

  if (options.ariaLabel) {
    variants.push(`input${typePart}[aria-label="${options.ariaLabel}"]`);
  }

  // Generic input selector
  if (options.type) {
    variants.push(`input[type="${options.type}"]`);
  }

  return variants;
}

/**
 * Build editor selectors (for rich text editors)
 */
export function buildEditorSelectors(options: {
  contentEditable?: boolean;
  className?: string;
  testId?: string;
}): string[] {
  const variants: string[] = [];

  if (options.className) {
    if (options.contentEditable !== false) {
      variants.push(`.${options.className}[contenteditable="true"]`);
    }
    variants.push(`.${options.className}`);
  }

  if (options.testId) {
    variants.push(`[data-testid="${options.testId}"]`);
  }

  // Common rich text editor patterns
  if (options.contentEditable !== false) {
    variants.push(
      '[contenteditable="true"]',
      '.ProseMirror',
      '.editor-content',
      '[data-editor="true"]'
    );
  }

  return variants;
}

// ============================================================================
// I18N Selector Utilities
// ============================================================================

export interface I18NSelectorMap {
  [locale: string]: string[];
}

/**
 * Get selectors for locale with fallbacks
 */
export function getI18NSelectors(
  map: I18NSelectorMap,
  primaryLocale: string = 'en'
): string[] {
  const selectors: string[] = [];

  // Add primary locale selectors
  if (map[primaryLocale]) {
    selectors.push(...map[primaryLocale]);
  }

  // Add fallback locales (e.g., 'en', 'zh', 'ja')
  const fallbackLocales = Object.keys(map).filter(
    (locale) => locale !== primaryLocale
  );

  for (const locale of fallbackLocales) {
    selectors.push(...map[locale]!);
  }

  return selectors;
}

// ============================================================================
// Export default
// ============================================================================

export default {
  trySelectors,
  findByText,
  findByLabel,
  waitForAnySelector,
  waitForHidden,
  findSibling,
  findParent,
  findChild,
  exists,
  isVisible,
  isEnabled,
  getText,
  getAttribute,
  buildSelector,
  buildSelectorVariants,
  buildButtonSelectors,
  buildInputSelectors,
  buildEditorSelectors,
  getI18NSelectors,
};
