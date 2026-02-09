---
name: Fix WT Security - Command Injection
description: |
  Fix security vulnerability: Command injection risk in md-to-wechat.ts theme parameter. Theme parameter is not sanitized before being used in command execution.

priority: P0
status: completed
affected_files:
  - plugins/wt/skills/publish-to-wechatmp/scripts/md-to-wechat.ts
  - plugins/wt/skills/publish-to-wechatmp/scripts/wechat-article-playwright.ts
estimated_complexity: low
---

# 0176. Fix WT Security - Command Injection

## Background

The `md-to-wechat.ts` script has a potential command injection vulnerability. The `theme` parameter passed from command line or configuration is not sanitized before being used in various operations. While the current implementation may not directly execute shell commands with the theme parameter, failing to validate user input creates a security risk and violates the principle of defense in depth.

**Security Risk:**

If the theme parameter were to be used in:
- Command execution (child_process.spawn, exec)
- File path operations (fs operations)
- HTML injection (DOM manipulation)
- URL construction

An attacker could inject malicious commands or paths.

**Example Attack Vectors:**

```bash
# If theme is used in file operations
--theme "../../../etc/passwd"

# If theme is used in command execution
--theme "default; rm -rf /"

# If theme is used in HTML
--theme "<script>alert('XSS')</script>"
```

## Requirements

**Functional Requirements:**

1. **Theme Whitelist Validation**
   - Define allowed themes: `default`, `grace`, `simple`
   - Validate theme parameter against whitelist
   - Reject invalid themes with clear error message
   - Apply whitelist at input boundary (CLI argument parsing)

2. **Input Sanitization**
   - Sanitize theme parameter before any use
   - Remove any shell metacharacters
   - Validate theme format (alphanumeric and hyphens only)
   - Escape theme for HTML context if used in DOM

3. **Error Handling**
   - Throw descriptive error for invalid themes
   - Include list of valid themes in error message
   - Log validation failures for security monitoring

4. **Security Testing**
   - Add test cases for injection attempts
   - Verify whitelist enforcement
   - Test with malformed input

**Non-Functional Requirements:**

- Must not break existing functionality
- Must provide clear error messages
- Must log security events

**Acceptance Criteria:**

- [ ] Theme whitelist defined and enforced
- [ ] Invalid themes rejected with descriptive error
- [ ] Input sanitization implemented
- [ ] Security tests added and passing
- [ ] No command injection possible
- [ ] Error handling tested with malicious input

## Design

### 1. Theme Validation Module

```typescript
// plugins/wt/scripts/web-automation/src/sanitize.ts (enhanced)

/**
 * Valid theme options for WeChat MP articles
 */
export const VALID_THEMES = ['default', 'grace', 'simple'] as const;

/**
 * Valid theme type
 */
export type ValidTheme = typeof VALID_THEMES[number];

/**
 * Theme validation result
 */
interface ThemeValidationResult {
  valid: boolean;
  theme?: ValidTheme;
  error?: string;
}

/**
 * Check if a string is a valid theme name
 *
 * @param theme - Theme name to validate
 * @returns true if theme is valid
 */
export function isValidTheme(theme: string): theme is ValidTheme {
  return VALID_THEMES.includes(theme as ValidTheme);
}

/**
 * Validate and sanitize theme parameter
 *
 * Performs strict whitelist validation to prevent command injection.
 *
 * @param theme - Theme parameter from user input
 * @returns Validated theme name
 * @throws {ValidationError} If theme is invalid
 *
 * @example
 * ```typescript
 * const theme = validateTheme('default'); // Returns 'default'
 * const theme = validateTheme('malicious; rm -rf /'); // Throws ValidationError
 * ```
 */
export function validateTheme(theme: string): ValidTheme {
  // Trim whitespace
  const sanitized = theme.trim();

  // Check against whitelist
  if (!isValidTheme(sanitized)) {
    throw new ValidationError(
      `Invalid theme: "${sanitized}". Valid themes: ${VALID_THEMES.join(', ')}`,
      'theme',
      { provided: theme, valid: VALID_THEMES }
    );
  }

  return sanitized;
}

/**
 * Safely get theme with fallback
 *
 * @param theme - Theme parameter (may be undefined)
 * @param fallback - Default theme if parameter is undefined
 * @returns Valid theme name
 */
export function getValidTheme(theme: string | undefined, fallback: ValidTheme = 'default'): ValidTheme {
  if (!theme) {
    return fallback;
  }
  return validateTheme(theme);
}
```

### 2. Updated md-to-wechat.ts

```typescript
// plugins/wt/skills/publish-to-wechatmp/scripts/md-to-wechat.ts

import { validateTheme, getValidTheme } from '@wt/web-automation/src/sanitize.js';

// ... existing code ...

export async function convertMarkdown(
  markdownPath: string,
  options?: { title?: string; theme?: string }
): Promise<ParsedResult> {
  const baseDir = path.dirname(markdownPath);
  const content = fs.readFileSync(markdownPath, 'utf-8');

  // Validate theme parameter before use
  // This throws ValidationError for invalid themes
  const theme = getValidTheme(options?.theme, 'default');

  const { frontmatter, body } = parseFrontmatter(content);

  // ... rest of implementation using validated theme ...

  return {
    title,
    author,
    summary,
    coverImage,
    htmlPath,
    contentImages,
  };
}

// CLI argument parsing with validation
async function main() {
  const args = process.argv.slice(2);
  // ... parsing logic ...

  // Validate theme from command line
  let themeArg: string | undefined;
  // ... extract theme from args ...

  const validTheme = getValidTheme(themeArg);
  // ... use validTheme ...
}
```

### 3. Updated wechat-article-playwright.ts

```typescript
// plugins/wt/skills/publish-to-wechatmp/scripts/wechat-article-playwright.ts

import { validateTheme, getValidTheme } from '@wt/web-automation/src/sanitize.js';

// ... existing code ...

export async function publishArticle(options: ArticleOptions): Promise<PublishResult> {
  // Validate theme at entry point
  const theme = getValidTheme(options.theme, config.defaultTheme ?? 'default');

  // ... rest of implementation using validated theme ...
}
```

### 4. Security Tests

```typescript
// plugins/wt/skills/publish-to-wechatmp/tests/sanitize.test.ts

import { describe, it, expect } from 'bun:test';
import { validateTheme, getValidTheme, VALID_THEMES } from '../scripts/web-automation/src/sanitize.js';

describe('Theme Validation', () => {
  describe('validateTheme', () => {
    it('should accept valid themes', () => {
      expect(validateTheme('default')).toBe('default');
      expect(validateTheme('grace')).toBe('grace');
      expect(validateTheme('simple')).toBe('simple');
    });

    it('should reject invalid themes', () => {
      expect(() => validateTheme('malicious')).toThrow();
      expect(() => validateTheme('')).toThrow();
      expect(() => validateTheme('   ')).toThrow();
    });

    it('should reject command injection attempts', () => {
      const injections = [
        'default; rm -rf /',
        'default && cat /etc/passwd',
        '../../../etc/passwd',
        '<script>alert("XSS")</script>',
        "$(whoami)",
        "`whoami`",
        'default\\x00malicious',
      ];

      for (const injection of injections) {
        expect(() => validateTheme(injection)).toThrow();
      }
    });

    it('should trim whitespace', () => {
      expect(validateTheme('  default  ')).toBe('default');
    });
  });

  describe('getValidTheme', () => {
    it('should use fallback when theme is undefined', () => {
      expect(getValidTheme(undefined, 'default')).toBe('default');
      expect(getValidTheme(undefined, 'grace')).toBe('grace');
    });

    it('should validate theme when provided', () => {
      expect(getValidTheme('simple', 'default')).toBe('simple');
    });

    it('should throw for invalid theme even with fallback', () => {
      expect(() => getValidTheme('invalid', 'default')).toThrow();
    });
  });
});
```

## Security Analysis

**Current Vulnerability Assessment:**

| Component | Vulnerability | Risk Level | Mitigation |
|-----------|--------------|------------|------------|
| Theme parameter | Insufficient input validation | Medium | Whitelist validation |
| File path handling | Path traversal (if used in paths) | Medium | Path sanitization |
| HTML rendering | XSS (if used in HTML) | Low | HTML escaping |

**Attack Scenarios Prevented:**

1. **Command Injection**: `--theme "default; malicious command"`
   - Prevented by: Whitelist validation

2. **Path Traversal**: `--theme "../../../etc/passwd"`
   - Prevented by: Whitelist validation

3. **XSS**: `--theme "<script>alert(1)</script>"`
   - Prevented by: Whitelist validation, no HTML usage

## Plan

**Phase 1: Implement Validation**
- [ ] Create sanitize.ts module in @wt/web-automation
- [ ] Implement validateTheme() function
- [ ] Implement getValidTheme() function
- [ ] Define VALID_THEMES constant
- [ ] Add JSDoc documentation

**Phase 2: Update Affected Files**
- [ ] Update md-to-wechat.ts with validation
- [ ] Update wechat-article-playwright.ts with validation
- [ ] Add validation at CLI argument parsing
- [ ] Add validation at config loading

**Phase 3: Error Handling**
- [ ] Use ValidationError for invalid themes
- [ ] Include list of valid themes in error message
- [ ] Log validation failures

**Phase 4: Security Testing**
- [ ] Create test file for theme validation
- [ ] Add tests for all valid themes
- [ ] Add tests for injection attempts
- [ ] Add tests for edge cases

**Phase 5: Documentation**
- [ ] Update SKILL.md with security notes
- [ ] Document theme validation behavior
- [ ] Add security section to documentation

**Phase 6: Verification**
- [ ] Run security tests
- [ ] Manual testing with malicious input
- [ ] Code review for other injection points

## Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Sanitize Module | plugins/wt/scripts/web-automation/src/sanitize.ts | This task | 2026-02-07 |
| Security Tests | plugins/wt/skills/publish-to-wechatmp/tests/sanitize.test.ts | This task | 2026-02-07 |
| Updated Files | md-to-wechat.ts, wechat-article-playwright.ts | This task | 2026-02-07 |

## References

- [OWASP Command Injection](https://owasp.org/www-community/attacks/Command_Injection) - Command injection prevention
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) - Input validation guidelines
- [Node.js Security Best Practices](https://github.com/lirantal/nodejs-security-best-practices) - Security guidelines
- [Task 0174](/docs/prompts/0174_fix_wt_high_priority_issues.md) - Related XSS protection work
