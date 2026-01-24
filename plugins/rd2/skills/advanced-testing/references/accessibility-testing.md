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
```javascript
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
```javascript
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
```javascript
test('has landmark regions', () => {
  const { container } = render(<App />);

  // Should have main landmark
  expect(container.querySelector('main')).toBeTruthy();
  // OR expect(container.querySelector('[role="main"]')).toBeTruthy();

  // Should have navigation
  expect(container.querySelector('nav')).toBeTruthy();

  // Should have banner/header
  expect(container.querySelector('header')).toBeTruthy();
});
```

### 6. Form Accessibility

**Requirement:** Forms must be operable and understandable.

**Labels:**
```javascript
test('form inputs have labels', () => {
  const { container } = render(<LoginForm />);

  const inputs = container.querySelectorAll('input, select, textarea');

  inputs.forEach(input => {
    // Each input should have:
    // 1. Associated label via `for` attribute
    // 2. OR aria-label
    // 3. OR aria-labelledby
    // 4. OR be wrapped in label

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
```javascript
test('required fields are indicated', () => {
  const { container } = render(<Form />);

  const requiredInputs = container.querySelectorAll('[required]');

  requiredInputs.forEach(input => {
    // Check if "required" is indicated in one of these ways:
    // 1. aria-required="true" attribute
    // 2. Required indicator in associated label
    // 3. Required attribute (handled by browser)

    const hasAriaRequired = input.getAttribute('aria-required') === 'true';
    const hasRequiredAttr = input.hasAttribute('required');

    expect(hasAriaRequired || hasRequiredAttr).toBe(true);

    // Check if label has visual indicator (*, "required", etc.)
    if (input.labels) {
      const label = input.labels[0];
      const labelText = label?.textContent?.toLowerCase() || '';
      const hasVisualIndicator =
        labelText.includes('required') ||
        labelText.includes('*') ||
        label?.querySelector('.required, .asterisk, .required-indicator');

      // Visual indicator should exist
      expect(hasVisualIndicator || hasRequiredAttr).toBe(true);
    }
  });
});
```

### 7. ARIA Attributes

**Common ARIA attributes:**
```javascript
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
```javascript
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

```javascript
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
```javascript
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

---

For TDD fundamentals, see: `SKILL.md`
For more testing patterns, see: `references/mock-patterns.md`
