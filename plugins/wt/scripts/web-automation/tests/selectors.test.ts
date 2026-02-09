/**
 * Tests for selectors module
 *
 * Tests selector utilities for browser automation
 *
 * Note: These tests use mocking for Page/Locator objects since
 * Playwright requires a full browser setup.
 */

import { describe, it, expect } from 'bun:test';
import {
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
  SelectorBuilder,
  I18NSelectorMap,
  FindResult,
} from '../src/selectors.js';

// Mock Page and Locator
class MockLocator {
  private _visible = false;
  private _count = 0;
  private _text = '';
  private _attr: Record<string, string> = {};
  private _enabled = true;

  constructor(private options: { visible?: boolean; count?: number; text?: string; enabled?: boolean } = {}) {
    this._visible = options.visible ?? true;
    this._count = options.count ?? 1;
    this._text = options.text ?? '';
    this._enabled = options.enabled ?? true;
  }

  async count(): Promise<number> {
    return this._count;
  }

  first() {
    return this;
  }

  async isVisible(): Promise<boolean> {
    // Element is not visible if it doesn't exist (count is 0)
    return this._count > 0 && this._visible;
  }

  async waitFor(options?: { state?: string; timeout?: number }): Promise<void> {
    // If no options, simple wait check
    if (!options || options.state === undefined) {
      if (this._count === 0) throw new Error('Not found');
      return;
    }

    // Handle specific states
    if (options.state === 'hidden') {
      // For 'hidden' state, succeed if element is not visible or doesn't exist
      if (this._count > 0 && this._visible) {
        throw new Error('Element is still visible');
      }
      // Element is hidden or doesn't exist - success
      return;
    } else if (options.state === 'attached') {
      if (this._count === 0) throw new Error('Element not attached');
    }
    // For other states, just resolve
    return;
  }

  async textContent(): Promise<string> {
    return this._text;
  }

  async getAttribute(name: string): Promise<string | null> {
    return this._attr[name] || null;
  }

  async isEnabled(): Promise<boolean> {
    // Element is not enabled if it doesn't exist (count is 0)
    return this._count > 0 && this._enabled;
  }

  setAttribute(name: string, value: string) {
    this._attr[name] = value;
  }

  setText(text: string) {
    this._text = text;
  }

  setEnabled(enabled: boolean) {
    this._enabled = enabled;
  }

  setVisible(visible: boolean) {
    this._visible = visible;
  }

  setCount(count: number) {
    this._count = count;
  }
}

class MockPage {
  private elements = new Map<string, MockLocator>();

  locator(selector: string) {
    return this.elements.get(selector) || new MockLocator({ count: 0 });
  }

  addElement(selector: string, options: { visible?: boolean; count?: number; text?: string; enabled?: boolean } = {}) {
    const locator = new MockLocator(options);
    this.elements.set(selector, locator);
    return locator as MockLocator;
  }

  removeElement(selector: string) {
    this.elements.delete(selector);
  }
}

describe('selectors', () => {
  describe('trySelectors', () => {
    it('should return first matching selector', async () => {
      const page = new MockPage();
      page.addElement('#first', { visible: true });
      page.addElement('#second', { visible: true });

      const result = await trySelectors(page, ['#first', '#second']);
      expect(result.found).toBe(true);
      expect(result.selector).toBe('#first');
      expect(result.locator).toBeTruthy();
    });

    it('should try selectors in order', async () => {
      const page = new MockPage();
      page.addElement('#second', { visible: true });

      const result = await trySelectors(page, ['#first', '#second']);
      expect(result.found).toBe(true);
      expect(result.selector).toBe('#second');
    });

    it('should return not found when no match', async () => {
      const page = new MockPage();

      const result = await trySelectors(page, ['#first', '#second']);
      expect(result.found).toBe(false);
      expect(result.selector).toBeNull();
      expect(result.locator).toBeNull();
    });

    it('should respect visible option', async () => {
      const page = new MockPage();
      page.addElement('#hidden', { visible: false });

      const result = await trySelectors(page, ['#hidden'], { visible: true });
      expect(result.found).toBe(false);
    });

    it('should find invisible element when visible is false', async () => {
      const page = new MockPage();
      page.addElement('#hidden', { visible: false });

      const result = await trySelectors(page, ['#hidden'], { visible: false });
      expect(result.found).toBe(true);
    });

    it('should handle array of selectors', async () => {
      const page = new MockPage();
      page.addElement('#third', { visible: true });

      const result = await trySelectors(page, [['#first', '#second'], ['#third']]);
      expect(result.found).toBe(true);
      expect(result.selector).toBe('#third');
    });
  });

  describe('findByText', () => {
    it('should find element with exact text', async () => {
      const page = new MockPage();
      page.addElement('text="Submit"', { visible: true });

      const result = await findByText(page, 'Submit', { exact: true });
      expect(result.found).toBe(true);
    });

    it('should find element with containing text', async () => {
      const page = new MockPage();
      // Add element with both exact and partial text selectors for the mock
      page.addElement('text="Submit"', { visible: true, text: 'Submit' });
      page.addElement('text=Sub', { visible: true, text: 'Submit' });

      const result = await findByText(page, 'Sub');
      expect(result.found).toBe(true);
    });

    it('should return not found for non-matching text', async () => {
      const page = new MockPage();

      const result = await findByText(page, 'NonExistent');
      expect(result.found).toBe(false);
    });
  });

  describe('findByLabel', () => {
    it('should find input by label', async () => {
      const page = new MockPage();
      page.addElement('label:text-is("Email") >> input', { visible: true });

      const result = await findByLabel(page, 'Email');
      expect(result.found).toBe(true);
    });

    it('should try multiple label patterns', async () => {
      const page = new MockPage();
      page.addElement('[placeholder="Email"]', { visible: true });

      const result = await findByLabel(page, 'Email');
      expect(result.found).toBe(true);
    });
  });

  describe('waitForAnySelector', () => {
    it('should wait for first matching selector', async () => {
      const page = new MockPage();
      page.addElement('#first', { visible: true });

      const selector = await waitForAnySelector(page, ['#first', '#second']);
      expect(selector).toBe('#first');
    });

    it('should return null when timeout', async () => {
      const page = new MockPage();

      const selector = await waitForAnySelector(page, ['#first', '#second'], { timeout: 1 });
      expect(selector).toBeNull();
    });
  });

  describe('waitForHidden', () => {
    it('should wait for element to be hidden (mocked)', async () => {
      const page = new MockPage();
      // This is a simplified test - real implementation would wait for state change
      // Element doesn't exist, so it should be considered hidden
      await waitForHidden(page, '#element', { timeout: 1 });
      // If we get here without throwing, the test passes
      expect(true).toBe(true);
    });
  });

  describe('findSibling', () => {
    it('should find next sibling (using xpath)', async () => {
      const page = new MockPage();
      page.addElement('xpath=#base/following-sibling::*[1]', { visible: true });

      const result = await findSibling(page, '#base', 'next');
      expect(result.found).toBe(true);
    });

    it('should find previous sibling (using xpath)', async () => {
      const page = new MockPage();
      page.addElement('xpath=#base/preceding-sibling::*[1]', { visible: true });

      const result = await findSibling(page, '#base', 'previous');
      expect(result.found).toBe(true);
    });
  });

  describe('findParent', () => {
    it('should find parent element', async () => {
      const page = new MockPage();
      page.addElement('#child >> ..', { visible: true });

      const result = await findParent(page, '#child');
      expect(result.found).toBe(true);
    });
  });

  describe('findChild', () => {
    it('should find child element', async () => {
      const page = new MockPage();
      page.addElement('#parent >> #child', { visible: true });

      const result = await findChild(page, '#parent', '#child');
      expect(result.found).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return true when element exists', async () => {
      const page = new MockPage();
      page.addElement('#exists', { count: 1 });

      const result = await exists(page, '#exists');
      expect(result).toBe(true);
    });

    it('should return true when multiple elements exist', async () => {
      const page = new MockPage();
      page.addElement('.multiple', { count: 5 });

      const result = await exists(page, '.multiple');
      expect(result).toBe(true);
    });

    it('should return false when element does not exist', async () => {
      const page = new MockPage();

      const result = await exists(page, '#nonexistent');
      expect(result).toBe(false);
    });

    it('should return false for zero count', async () => {
      const page = new MockPage();
      page.addElement('#empty', { count: 0 });

      const result = await exists(page, '#empty');
      expect(result).toBe(false);
    });
  });

  describe('isVisible', () => {
    it('should return true for visible element', async () => {
      const page = new MockPage();
      page.addElement('#visible', { visible: true });

      const result = await isVisible(page, '#visible');
      expect(result).toBe(true);
    });

    it('should return false for hidden element', async () => {
      const page = new MockPage();
      page.addElement('#hidden', { visible: false });

      const result = await isVisible(page, '#hidden');
      expect(result).toBe(false);
    });

    it('should return false for non-existent element', async () => {
      const page = new MockPage();

      const result = await isVisible(page, '#nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('should return true for enabled element', async () => {
      const page = new MockPage();
      page.addElement('#enabled', { enabled: true });

      const result = await isEnabled(page, '#enabled');
      expect(result).toBe(true);
    });

    it('should return false for disabled element', async () => {
      const page = new MockPage();
      page.addElement('#disabled', { enabled: false });

      const result = await isEnabled(page, '#disabled');
      expect(result).toBe(false);
    });

    it('should return false for non-existent element', async () => {
      const page = new MockPage();

      const result = await isEnabled(page, '#nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getText', () => {
    it('should get element text content', async () => {
      const page = new MockPage();
      const locator = page.addElement('#text', { text: 'Hello World' });

      const result = await getText(page, '#text');
      expect(result).toBe('Hello World');
    });

    it('should return empty string for element without text', async () => {
      const page = new MockPage();
      page.addElement('#empty');

      const result = await getText(page, '#empty');
      expect(result).toBe('');
    });
  });

  describe('getAttribute', () => {
    it('should get attribute value', async () => {
      const page = new MockPage();
      const locator = page.addElement('#element');
      locator.setAttribute('href', 'https://example.com');

      const result = await getAttribute(page, '#element', 'href');
      expect(result).toBe('https://example.com');
    });

    it('should return null for missing attribute', async () => {
      const page = new MockPage();
      page.addElement('#element');

      const result = await getAttribute(page, '#element', 'missing');
      expect(result).toBeNull();
    });
  });

  describe('buildSelector', () => {
    it('should build selector with tag', () => {
      const options: SelectorBuilder = { tag: 'button' };
      expect(buildSelector(options)).toBe('button');
    });

    it('should build selector with id', () => {
      const options: SelectorBuilder = { tag: 'div', id: 'my-id' };
      expect(buildSelector(options)).toBe('div#my-id');
    });

    it('should build selector with class', () => {
      const options: SelectorBuilder = { tag: 'div', class: 'my-class' };
      expect(buildSelector(options)).toBe('div.my-class');
    });

    it('should build selector with multiple classes', () => {
      const options: SelectorBuilder = { tag: 'div', class: ['class1', 'class2'] };
      expect(buildSelector(options)).toBe('div.class1.class2');
    });

    it('should build selector with attributes', () => {
      const options: SelectorBuilder = {
        tag: 'input',
        attrs: { type: 'text', name: 'username' }
      };
      expect(buildSelector(options)).toBe('input[type="text"][name="username"]');
    });

    it('should build selector with text', () => {
      const options: SelectorBuilder = { tag: 'button', text: 'Submit' };
      expect(buildSelector(options)).toBe('button:text("Submit")');
    });

    it('should build selector with role', () => {
      const options: SelectorBuilder = { role: 'button' };
      expect(buildSelector(options)).toBe('[role="button"]');
    });

    it('should build selector with aria-label', () => {
      const options: SelectorBuilder = { ariaLabel: 'Close' };
      expect(buildSelector(options)).toBe('[aria-label="Close"]');
    });

    it('should build selector with test ID', () => {
      const options: SelectorBuilder = { testId: 'submit-button' };
      expect(buildSelector(options)).toBe('[data-testid="submit-button"]');
    });

    it('should build complex selector', () => {
      const options: SelectorBuilder = {
        tag: 'button',
        class: 'btn-primary',
        id: 'submit',
        attrs: { disabled: 'true' },
        testId: 'submit-btn',
      };
      const result = buildSelector(options);
      expect(result).toContain('button');
      expect(result).toContain('.btn-primary');
      expect(result).toContain('#submit');
      expect(result).toContain('[disabled="true"]');
      expect(result).toContain('[data-testid="submit-btn"]');
    });
  });

  describe('buildSelectorVariants', () => {
    it('should build variants with class fallback', () => {
      const options: SelectorBuilder = {
        tag: 'div',
        class: 'primary',
        id: 'my-id',
      };
      const variants = buildSelectorVariants(options);

      expect(variants).toContain('div#my-id.primary');
      expect(variants).toContain('div#my-id');
    });

    it('should build variants with test ID fallback', () => {
      const options: SelectorBuilder = {
        tag: 'button',
        class: 'btn',
        testId: 'submit-btn',
      };
      const variants = buildSelectorVariants(options);

      expect(variants).toContain('button.btn[data-testid="submit-btn"]');
      expect(variants).toContain('[data-testid="submit-btn"]');
    });

    it('should remove duplicates', () => {
      const options: SelectorBuilder = {
        testId: 'test',
        ariaLabel: 'test',
      };
      const variants = buildSelectorVariants(options);

      expect(variants).toContain('[data-testid="test"]');
      expect(variants).toContain('[aria-label="test"]');
      // No duplicates
      expect(variants.length).toBe(new Set(variants).size);
    });
  });

  describe('buildButtonSelectors', () => {
    it('should build selectors with text', () => {
      const selectors = buildButtonSelectors({ text: 'Submit' });
      expect(selectors).toContain('button:has-text("Submit")');
      expect(selectors).toContain('button:text-is("Submit")');
    });

    it('should build selectors with aria label', () => {
      const selectors = buildButtonSelectors({ ariaLabel: 'Close' });
      expect(selectors).toContain('button[aria-label="Close"]');
    });

    it('should build selectors with test ID', () => {
      const selectors = buildButtonSelectors({ testId: 'submit-btn' });
      expect(selectors).toContain('[data-testid="submit-btn"]');
    });

    it('should build input submit selector', () => {
      const selectors = buildButtonSelectors({ text: 'Submit' });
      expect(selectors).toContain('input[type="submit"][value="Submit"]');
    });
  });

  describe('buildInputSelectors', () => {
    it('should build selectors with type', () => {
      const selectors = buildInputSelectors({ type: 'text' });
      expect(selectors).toContain('input[type="text"]');
    });

    it('should build selectors with placeholder', () => {
      const selectors = buildInputSelectors({ placeholder: 'Enter text' });
      expect(selectors).toContain('input[placeholder="Enter text"]');
    });

    it('should build selectors with name', () => {
      const selectors = buildInputSelectors({ name: 'username' });
      expect(selectors).toContain('input[name="username"]');
    });

    it('should build selectors with aria label', () => {
      const selectors = buildInputSelectors({ ariaLabel: 'Email address' });
      expect(selectors).toContain('input[aria-label="Email address"]');
    });

    it('should combine type and placeholder', () => {
      const selectors = buildInputSelectors({
        type: 'email',
        placeholder: 'user@example.com',
      });
      expect(selectors).toContain('input[type="email"][placeholder="user@example.com"]');
    });
  });

  describe('buildEditorSelectors', () => {
    it('should build selectors with className', () => {
      const selectors = buildEditorSelectors({ className: 'editor' });
      expect(selectors).toContain('.editor[contenteditable="true"]');
      expect(selectors).toContain('.editor');
    });

    it('should build selectors with test ID', () => {
      const selectors = buildEditorSelectors({ testId: 'rich-editor' });
      expect(selectors).toContain('[data-testid="rich-editor"]');
    });

    it('should include common editor patterns', () => {
      const selectors = buildEditorSelectors({});
      expect(selectors).toContain('[contenteditable="true"]');
      expect(selectors).toContain('.ProseMirror');
      expect(selectors).toContain('.editor-content');
    });
  });

  describe('getI18NSelectors', () => {
    it('should get selectors for primary locale', () => {
      const map: I18NSelectorMap = {
        en: ['#submit-en'],
        zh: ['#submit-zh'],
      };
      const selectors = getI18NSelectors(map, 'en');

      expect(selectors).toContain('#submit-en');
    });

    it('should include fallback locales', () => {
      const map: I18NSelectorMap = {
        en: ['#submit-en'],
        zh: ['#submit-zh'],
        ja: ['#submit-ja'],
      };
      const selectors = getI18NSelectors(map, 'zh');

      expect(selectors).toContain('#submit-zh');
      expect(selectors.length).toBeGreaterThan(1);
    });

    it('should handle empty map', () => {
      const map: I18NSelectorMap = {};
      const selectors = getI18NSelectors(map, 'en');

      expect(selectors).toEqual([]);
    });
  });
});
