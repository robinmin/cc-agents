---
name: accessibility-testing
description: "Complete accessibility testing guide: WCAG 2.2 compliance, keyboard navigation, screen reader support, color contrast, target size, reduced motion, and ARIA testing."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-23
updated_at: 2026-03-25
tags: [testing, accessibility, wcag, wcag-2.2, aria, screen-reader, target-size, reduced-motion]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: qa-depth
  interactions:
    - knowledge-only
see_also:
  - rd3:advanced-testing
  - rd3:ui-ux-design/references/accessibility
---

# Accessibility Testing Reference

**Load this reference when:** Testing UI components for accessibility compliance, ensuring keyboard navigation, or validating WCAG standards.

## Overview

Accessibility testing ensures your UI is usable by everyone, including people with disabilities who use assistive technologies.

**Core principle:** Test user-visible accessibility behavior, not just ARIA attributes.

## WCAG Compliance Levels

| Level | Description | Target |
|-------|-------------|--------|
| **A** | Minimum accessibility | Basic compliance |
| **AA** | Recommended standard | **Target for most projects** |
| **AAA** | Highest level | Rarely required |

**This guide focuses on WCAG AA compliance.**

## Key Accessibility Categories

### 1. Keyboard Navigation

**Requirement:** All functionality must be accessible via keyboard alone.

**Test manually:**

```
1. Unplug mouse / use Tab-only navigation
2. Verify all interactive elements receive focus
3. Verify logical tab order (left-to-right, top-to-bottom)
4. Verify Enter/Space activate focused elements
5. Verify Escape closes modals/dropdowns
6. Verify arrow keys work in lists/menus
```

**Test with Playwright:**

```typescript
test('keyboard navigation', async ({ page }) => {
  await page.goto('/dashboard');

  // Tab to next element
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBe('BUTTON');

  // Verify focus visible
  const hasFocus = await page.evaluate(el => {
    const styles = window.getComputedStyle(el);
    return styles.outline !== 'none' || styles.boxShadow !== 'none';
  }, await page.evaluate(() => document.activeElement));
  expect(hasFocus).toBe(true);

  // Activate with Enter
  await page.keyboard.press('Enter');
  // Verify action occurred
});
```

**Automated with Jest:**

```typescript
test('all interactive elements are focusable', () => {
  const { container } = render(<MyComponent />);

  const interactives = container.querySelectorAll(
    'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  interactives.forEach(el => {
    expect(el).toHaveAttribute('tabIndex');
  });
});
```

### 2. Screen Reader Support

**Requirement:** Content must be consumable via screen reader (NVDA, JAWS, VoiceOver).

**Key elements:**
- **ARIA labels:** Provide text alternatives for icons/images
- **Semantic HTML:** Use proper heading hierarchy, landmarks
- **Live regions:** Announce dynamic content changes

**Test with jest-axe:**

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('has no ARIA violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Manual testing checklist:**
- [ ] Images have `alt` text or `aria-label`
- [ ] Icons have `aria-label` or `aria-labelledby`
- [ ] Form inputs have associated `<label>`
- [ ] Error messages are announced (`role="alert"`)
- [ ] Modals trap focus inside
- [ ] Landmarks (banner, main, nav) are defined

### 3. Color Contrast

**Requirement:** WCAG AA requires 4.5:1 contrast for normal text, 3:1 for large text.

**Test with axe-core:**

```typescript
test('color contrast compliance', async ({ page }) => {
  await page.goto('/page');

  const violations = await page.accessibility.snapshot({
    interestingOnly: false
  });

  const contrastIssues = violations.filter(v =>
    v.impact === 'serious' && v.tags.includes('wcag2aa')
  );

  expect(contrastIssues).toHaveLength(0);
});
```

**Manual testing:**
- Use Chrome DevTools Lighthouse audit
- Use axe DevTools browser extension
- Test with high contrast mode (Windows)

**Quick reference:**

| Element | Ratio |
|---------|-------|
| Normal text | 4.5:1 |
| Large text (18pt+) | 3:1 |
| UI components | 3:1 |
| Graphical objects | 3:1 |

### 4. Focus Management

**Requirement:** Focus must be visible and programmatically manageable.

**Test focus indicators:**

```typescript
test('focus indicators are visible', async ({ page }) => {
  await page.goto('/form');

  const button = page.locator('button[type="submit"]');

  // Focus element
  await button.focus();

  // Check focus styles
  const outline = await button.evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      outline: styles.outline,
      boxShadow: styles.boxShadow,
      outlineOffset: styles.outlineOffset
    };
  });

  // At least one focus indicator must be visible
  const hasIndicator =
    (outline.outline !== 'none' && outline.outline !== '') ||
    (outline.boxShadow !== 'none' && outline.boxShadow !== 'none') ||
    parseInt(outline.outlineOffset || '0') > 0;

  expect(hasIndicator).toBe(true);
});
```

**Test focus trapping in modals:**

```typescript
test('modal traps focus', async ({ page }) => {
  await page.goto('/');

  // Open modal
  await page.click('button[data-open="modal"]');

  // Get all focusable elements
  const focusable = await page.locator(
    '#modal button, #modal a, #modal input, #modal [tabindex]'
  ).all();

  // Tab through all elements
  for (let i = 0; i < focusable.length + 2; i++) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => document.activeElement);
    const insideModal = await page.evaluate(el =>
      el?.closest('#modal'), active
    );
    expect(insideModal).toBeTruthy();
  }
});
```

### 5. Semantic HTML

**Requirement:** Use proper HTML elements for their intended purpose.

**Heading hierarchy:**

```typescript
test('proper heading hierarchy', async ({ page }) => {
  await page.goto('/article');

  const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
  let previousLevel = 0;

  for (const heading of headings) {
    const level = parseInt(await heading.evaluate(el =>
      el.tagName.substring(1)
    ));

    // Headings should not skip levels (h1 -> h3 is bad)
    expect(level - previousLevel).toBeLessThanOrEqual(1);
    previousLevel = level;
  }

  // Should have exactly one h1
  const h1Count = await page.locator('h1').count();
  expect(h1Count).toBe(1);
});
```

**Landmark regions:**

```typescript
test('has landmark regions', () => {
  const { container } = render(<App />);

  // Should have main landmark
  expect(container.querySelector('main')).toBeTruthy();

  // Should have navigation
  expect(container.querySelector('nav')).toBeTruthy();

  // Should have banner/header
  expect(container.querySelector('header')).toBeTruthy();
});
```

### 6. Form Accessibility

**Requirement:** Forms must be operable and understandable.

**Labels:**

```typescript
test('form inputs have labels', () => {
  const { container } = render(<LoginForm />);

  const inputs = container.querySelectorAll('input, select, textarea');

  inputs.forEach(input => {
    const hasLabel =
      input.labels?.length > 0 ||
      input.hasAttribute('aria-label') ||
      input.hasAttribute('aria-labelledby') ||
      input.closest('label');

    expect(hasLabel).toBe(true);
  });
});
```

**Error announcements:**

```typescript
test('form errors are announced', async ({ page }) => {
  await page.goto('/form');

  // Submit invalid form
  await page.click('button[type="submit"]');

  // Wait for error to appear
  await page.waitForSelector('[role="alert"]');

  // Verify error is in DOM and visible to screen readers
  const error = page.locator('[role="alert"]');
  await expect(error).toBeVisible();
  await expect(error).toContainText('Email is required');
});
```

**Required field indicators:**

```typescript
test('required fields are indicated', () => {
  const { container } = render(<Form />);

  const requiredInputs = container.querySelectorAll('[required]');

  requiredInputs.forEach(input => {
    const hasAriaRequired = input.getAttribute('aria-required') === 'true';
    const hasRequiredAttr = input.hasAttribute('required');

    expect(hasAriaRequired || hasRequiredAttr).toBe(true);
  });
});
```

### 7. ARIA Attributes

**Common ARIA attributes:**

```tsx
// Button icons need labels
<button aria-label="Close modal" onClick={onClose}>
  <XIcon />
</button>

// Live regions announce dynamic content
<div role="status" aria-live="polite">
  {statusMessage}
</div>

// Alerts announce immediately
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>

// Expanded state for menus/disclosures
<button aria-expanded={isOpen} aria-controls="menu">
  Menu
</button>

// Hidden content from screen readers
<span className="icon" aria-hidden="true">★</span>
```

**Test ARIA attributes:**

```typescript
test('buttons have accessible names', () => {
  const { container } = render(<Toolbar />);

  const buttons = container.querySelectorAll('button, [role="button"]');

  buttons.forEach(button => {
    const name = button.getAttribute('aria-label') ||
                 button.textContent?.trim() ||
                 button.getAttribute('title');

    expect(name).toBeTruthy();
    expect(name?.length).toBeGreaterThan(0);
  });
});
```

## Tools and Libraries

### Jest + jest-axe

```bash
npm install --save-dev jest-axe
```

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<App />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Playwright Accessibility API

```typescript
// Full accessibility tree
const snapshot = await page.accessibility.snapshot();

// Check specific element
const button = page.locator('button');
const accessibleName = await button.accessibleName();
const role = await button.accessibilityRole();

// Verify
expect(accessibleName).toBe('Submit');
expect(role).toBe('button');
```

### React Testing Library

```typescript
import { render, screen } from '@testing-library/react';

// Accessible queries
screen.getByRole('button', { name: 'Submit' });
screen.getByLabelText('Email address');
screen.getByPlaceholderText('Enter email');

// These queries enforce accessibility
// If element isn't accessible, test fails
```

### Pa11y (CLI)

```bash
npm install -g pa11y
pa11y https://example.com
```

### axe DevTools Browser Extension

- Chrome/Firefox extension
- Visual accessibility audit
- Shows WCAG violations with fixes

## Testing Strategy

### Manual Testing

1. **Keyboard navigation** - Unplug mouse, use Tab only
2. **Screen reader** - Test with NVDA (Windows) or VoiceOver (Mac)
3. **Zoom** - Test at 200% zoom level
4. **High contrast** - Enable high contrast mode

### Automated Testing

1. **Jest + jest-axe** - Component-level a11y tests
2. **Playwright + axe** - E2E a11y tests
3. **Lighthouse CI** - Run in CI pipeline
4. **Pa11y CI** - Automated regression testing

### CI/CD Integration

```yaml
# GitHub Actions
- name: Run accessibility tests
  run: npm run test:a11y

- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v9
  with:
    urls: |
      https://staging.example.com
    uploadArtifacts: true
```

## Common Violations

| Issue | Fix |
|-------|-----|
| Images without alt | Add `alt=""` for decorative, `alt="description"` for meaningful |
| Low contrast | Increase contrast to 4.5:1 minimum |
| Empty links | Add meaningful text or `aria-label` |
| Missing form labels | Add `<label>` or `aria-label` |
| Keyboard trap | Ensure Escape closes, focus returns |
| No skip links | Add "skip to content" link |
| Invalid HTML | Use semantic elements (`<nav>`, `<main>`) |

## Quick Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Logical tab order
- [ ] Visible focus indicators
- [ ] Images have alt text
- [ ] Form inputs have labels
- [ ] Color contrast meets WCAG AA
- [ ] Proper heading hierarchy (h1-h6)
- [ ] Landmark regions defined
- [ ] ARIA labels on icon-only buttons
- [ ] Error messages are announced
- [ ] Modals trap focus
- [ ] Skip links available

## SOTA Enhancements (WCAG 2.2 / 2024+)

### 1. Focus Appearance (WCAG 2.2)

WCAG 2.2 introduces stricter focus visibility requirements:

| Criterion | Requirement |
|-----------|--------------|
| 2.4.11 Focus Not Obscured (Minimum) | Focus indicator must not be fully hidden |
| 2.4.12 Focus Not Obscured (Enhanced) | No part of focus indicator is hidden |
| 2.4.13 Focus Appearance | Minimum 3:1 contrast against adjacent colors |

**Test focus appearance:**

```typescript
test('focus indicator meets WCAG 2.2 requirements', async ({ page }) => {
  await page.goto('/page');

  // Get all focusable elements
  const focusable = await page.locator(
    'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ).all();

  for (const el of focusable) {
    await el.focus();

    // Check focus is not obscured
    const boundingBox = await el.boundingBox();
    expect(boundingBox).not.toBeNull();

    // Get computed outline
    const styles = await el.evaluate((elem: Element) => {
      const computed = window.getComputedStyle(elem as HTMLElement);
      return {
        outline: computed.outline,
        outlineWidth: computed.outlineWidth,
        outlineOffset: computed.outlineOffset,
        boxShadow: computed.boxShadow
      };
    });

    // Must have visible focus indicator
    const hasIndicator =
      styles.outlineWidth !== '0px' ||
      (styles.boxShadow !== 'none' && styles.boxShadow !== '');

    expect(hasIndicator).toBe(true);
  }
});
```

### 2. Target Size (WCAG 2.2 - 2.5.8)

**Minimum target size:** 24x24 CSS pixels (excluding spacing)

```typescript
test('touch targets meet minimum size', async ({ page }) => {
  await page.goto('/mobile-page');

  const targets = await page.locator(
    'button, a, input[type="checkbox"], input[type="radio"], select'
  ).all();

  for (const target of targets) {
    const box = await target.boundingBox();

    if (box) {
      // Target size must be at least 24x24
      const meetsMinimum = box.width >= 24 && box.height >= 24;

      // If smaller, must have at least 24x24 touch area with padding
      const padding = await target.evaluate((el: Element) => {
        const style = window.getComputedStyle(el as HTMLElement);
        return {
          paddingTop: parseInt(style.paddingTop) || 0,
          paddingBottom: parseInt(style.paddingBottom) || 0,
          paddingLeft: parseInt(style.paddingLeft) || 0,
          paddingRight: parseInt(style.paddingRight) || 0
        };
      });

      const effectiveWidth = box.width + padding.paddingLeft + padding.paddingRight;
      const effectiveHeight = box.height + padding.paddingTop + padding.paddingBottom;

      const hasAdequateTouchTarget =
        meetsMinimum || (effectiveWidth >= 24 && effectiveHeight >= 24);

      expect(hasAdequateTouchTarget).toBe(true);
    }
  }
});
```

### 3. Reduced Motion (WCAG 2.2 - 2.3.3)

Respect `prefers-reduced-motion` for users with vestibular disorders:

```typescript
test('animations respect reduced motion preference', async ({ page }) => {
  // Emulate reduced motion preference
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/animated-page');

  // Check that animations are disabled or minimal
  const animations = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    let hasLongAnimations = 0;
    let hasMotion = 0;

    elements.forEach(el => {
      const style = window.getComputedStyle(el);
      const duration = parseFloat(style.animationDuration) || 0;
      const transitionDuration = parseFloat(style.transitionDuration) || 0;

      if (duration > 0.1 || transitionDuration > 0.1) {
        hasMotion++;
      }
      if (duration > 1 || transitionDuration > 1) {
        hasLongAnimations++;
      }
    });

    return { hasMotion, hasLongAnimations };
  });

  // With reduced motion, expect minimal or no animation
  expect(animations.hasLongAnimations).toBe(0);
});
```

### 4. Cognitive Accessibility

**Draggable items with keyboard support:**

```typescript
test('draggable items are keyboard accessible', async ({ page }) => {
  await page.goto('/sortable-list');

  const items = page.locator('[role="listitem"]');

  // Get first item
  const firstItem = items.first();

  // Focus it
  await firstItem.focus();

  // Press Space to pick up
  await page.keyboard.press('Space');

  // Should have aria-grabbed="true"
  await expect(firstItem).toHaveAttribute('aria-grabbed', 'true');

  // Press ArrowDown to move
  await page.keyboard.press('ArrowDown');

  // Press Space to drop
  await page.keyboard.press('Space');

  // aria-grabbed should be removed
  await expect(firstItem).toHaveAttribute('aria-grabbed', null);
});
```

### 5. Status Message Patterns (WCAG 2.1 - 4.1.3)

Use `role="status"` with `aria-live` for dynamic content:

```typescript
// Status messages that should be announced
test('status messages use correct ARIA', async ({ page }) => {
  await page.goto('/page-with-status');

  // Submit a form
  await page.click('button[type="submit"]');

  // Wait for status message
  const status = page.locator('[role="status"]');

  await expect(status).toBeVisible();

  // Should have polite live region
  const ariaLive = await status.getAttribute('aria-live');
  expect(['polite', 'assertive']).toContain(ariaLive);
});
```

### 6.Help Information Patterns

Provide help mechanisms for complex interactions:

```tsx
// Help text linked with aria-describedby
<div>
  <label htmlFor="password">
    Password
    <span aria-hidden="true">*</span>
  </label>
  <input
    id="password"
    type="password"
    aria-describedby="password-requirements"
    aria-required="true"
  />
  <p id="password-requirements" role="note">
    Must be at least 8 characters with one uppercase, one lowercase, and one number.
  </p>
</div>
```

### 7. Error Identification (WCAG 2.1 - 3.3.1)

Error messages must be programmatically determinable:

```typescript
test('form errors are programmatically identified', async ({ page }) => {
  await page.goto('/form');
  await page.click('button[type="submit"]');

  // Wait for errors
  const errors = page.locator('[role="alert"], [aria-live]');

  const errorCount = await errors.count();
  expect(errorCount).toBeGreaterThan(0);

  // Each error should describe the problem and how to fix it
  for (const error of await errors.all()) {
    const text = await error.textContent();
    expect(text?.length).toBeGreaterThan(10); // Meaningful error text

    // Should be associated with input via aria-describedby or aria-labelledby
    const describedBy = await error.getAttribute('aria-describedby');
    const labelledBy = await error.getAttribute('aria-labelledby');
    expect(describedBy || labelledBy).toBeTruthy();
  }
});
```
