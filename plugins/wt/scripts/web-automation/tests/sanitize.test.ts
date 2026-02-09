/**
 * Tests for sanitize module
 *
 * Tests XSS protection and input sanitization utilities
 */

import { describe, it, expect } from 'bun:test';
import {
  escapeHtml,
  escapeHtmlAttribute,
  isValidTheme,
  sanitizeTheme,
  validateTheme,
  getValidTheme,
  sanitizeUrl,
  stripHtml,
  truncate,
} from '../src/sanitize.js';

describe('sanitize', () => {
  describe('escapeHtml', () => {
    it('should escape ampersand', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('should escape less than', () => {
      expect(escapeHtml('a < b')).toBe('a &lt; b');
    });

    it('should escape greater than', () => {
      expect(escapeHtml('a > b')).toBe('a &gt; b');
    });

    it('should escape double quotes', () => {
      expect(escapeHtml('a "b"')).toBe('a &quot;b&quot;');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("a 'b'")).toBe('a &#039;b&#039;');
    });

    it('should escape multiple special characters', () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('should escape all special characters in order', () => {
      // The function applies escapes in order: &, <, >, ", '
      expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#039;');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle string without special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('should convert non-string to string', () => {
      expect(escapeHtml(123 as unknown as string)).toBe('123');
    });
  });

  describe('escapeHtmlAttribute', () => {
    it('should escape for attribute context', () => {
      expect(escapeHtmlAttribute('a "b"')).toBe('a &quot;b&quot;');
    });

    it('should handle ampersand first', () => {
      expect(escapeHtmlAttribute('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#039;');
    });

    it('should handle empty attribute', () => {
      expect(escapeHtmlAttribute('')).toBe('');
    });
  });

  describe('isValidTheme', () => {
    it('should return true for valid theme "default"', () => {
      expect(isValidTheme('default')).toBe(true);
    });

    it('should return true for valid theme "grace"', () => {
      expect(isValidTheme('grace')).toBe(true);
    });

    it('should return true for valid theme "simple"', () => {
      expect(isValidTheme('simple')).toBe(true);
    });

    it('should return false for invalid theme', () => {
      expect(isValidTheme('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidTheme('')).toBe(false);
    });

    it('should return false for malicious input', () => {
      expect(isValidTheme('default; rm -rf /')).toBe(false);
      expect(isValidTheme('<script>alert(1)</script>')).toBe(false);
    });
  });

  describe('sanitizeTheme', () => {
    it('should return valid theme unchanged', () => {
      expect(sanitizeTheme('default')).toBe('default');
      expect(sanitizeTheme('grace')).toBe('grace');
      expect(sanitizeTheme('simple')).toBe('simple');
    });

    it('should throw error for invalid theme', () => {
      expect(() => sanitizeTheme('invalid')).toThrow('Invalid theme: invalid. Valid themes: default, grace, simple');
    });

    it('should throw error for empty string', () => {
      expect(() => sanitizeTheme('')).toThrow('Invalid theme');
    });

    it('should throw error for command injection attempt', () => {
      expect(() => sanitizeTheme('default; rm -rf /')).toThrow();
    });

    it('should throw error for path traversal attempt', () => {
      expect(() => sanitizeTheme('../../../etc/passwd')).toThrow();
    });

    it('should throw error for XSS attempt', () => {
      expect(() => sanitizeTheme('<script>alert(1)</script>')).toThrow();
    });
  });

  describe('validateTheme', () => {
    it('should be alias for sanitizeTheme', () => {
      expect(validateTheme).toBe(sanitizeTheme);
    });

    it('should work the same as sanitizeTheme', () => {
      expect(validateTheme('default')).toBe('default');
      expect(() => validateTheme('invalid')).toThrow();
    });
  });

  describe('getValidTheme', () => {
    it('should return fallback when theme is undefined', () => {
      expect(getValidTheme(undefined, 'default')).toBe('default');
      expect(getValidTheme(undefined, 'grace')).toBe('grace');
    });

    it('should return fallback when theme is empty string', () => {
      expect(getValidTheme('', 'default')).toBe('default');
    });

    it('should validate and return valid theme', () => {
      expect(getValidTheme('simple', 'default')).toBe('simple');
    });

    it('should throw for invalid theme even with fallback', () => {
      expect(() => getValidTheme('invalid', 'default')).toThrow();
    });

    it('should use "default" as default fallback', () => {
      expect(getValidTheme(undefined)).toBe('default');
    });
  });

  describe('sanitizeUrl', () => {
    it('should return safe URL for http protocol', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should return safe URL for https protocol', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should return safe URL for mailto protocol', () => {
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    });

    it('should return safe URL for tel protocol', () => {
      expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
    });

    it('should return javascript:void(0) for javascript protocol', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('javascript:void(0)');
    });

    it('should return javascript:void(0) for data protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('javascript:void(0)');
    });

    it('should return javascript:void(0) for invalid URL', () => {
      expect(sanitizeUrl('not-a-url')).toBe('javascript:void(0)');
    });

    it('should return javascript:void(0) for file protocol', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBe('javascript:void(0)');
    });
  });

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(stripHtml('<p>Hello</p>')).toBe('Hello');
    });

    it('should remove multiple tags', () => {
      expect(stripHtml('<div><p>Hello</p><span>World</span></div>')).toBe('HelloWorld');
    });

    it('should remove self-closing tags', () => {
      expect(stripHtml('<br/><img src="x"/>')).toBe('');
    });

    it('should handle nested tags', () => {
      expect(stripHtml('<div><div><p>Text</p></div></div>')).toBe('Text');
    });

    it('should handle text without tags', () => {
      expect(stripHtml('Plain text')).toBe('Plain text');
    });

    it('should handle empty string', () => {
      expect(stripHtml('')).toBe('');
    });

    it('should preserve content between tags', () => {
      expect(stripHtml('<a href="url">Link text</a>')).toBe('Link text');
    });
  });

  describe('truncate', () => {
    it('should return string unchanged if under max length', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should truncate with default suffix', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('should truncate with custom suffix', () => {
      expect(truncate('Hello World', 10, '…')).toBe('Hello Wor…');
    });

    it('should return exact string at max length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('should handle suffix longer than max length', () => {
      expect(truncate('Hello World', 5, '...more')).toBe('...more');
    });

    it('should return only suffix if max length equals suffix length', () => {
      expect(truncate('Long text', 3, '...')).toBe('...');
    });
  });

  describe('Security: Command Injection Prevention', () => {
    it('should escape shell metacharacters in HTML', () => {
      expect(escapeHtml('$(whoami)')).toBe('$(whoami)');
      expect(escapeHtml('`whoami`')).toBe('`whoami`');
      expect(escapeHtml('; rm -rf /')).toBe('; rm -rf /');
    });

    it('should not allow command execution through theme', () => {
      expect(() => sanitizeTheme('default; cat /etc/passwd')).toThrow();
      expect(() => sanitizeTheme('default && malicious')).toThrow();
      expect(() => sanitizeTheme('default|malicious')).toThrow();
    });

    it('should sanitize dangerous URLs', () => {
      expect(sanitizeUrl('javascript:document.cookie')).toBe('javascript:void(0)');
      expect(sanitizeUrl('data:text/html,<script>alert(document.cookie)</script>')).toBe('javascript:void(0)');
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('javascript:void(0)');
    });
  });
});
