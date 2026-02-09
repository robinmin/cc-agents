# Web-Automation Library Enhancements

## Summary

The `@wt/web-automation` common library has been enhanced with two new modules to support the migration of `publish-to-*` skills from CDP to Playwright.

## New Modules

### 1. `config.ts` - Configuration Utilities

**Location**: `plugins/wt/scripts/web-automation/src/config.ts`

**Features**:
- JSONC (JSON with Comments) parsing
- Trailing comma support
- Environment variable fallback
- Per-platform configuration
- Config caching with TTL
- Config validation with rules

**Key Functions**:
- `getPlatformConfig()` - Get platform-specific configuration
- `getConfigValue()` - Get config value with default fallback
- `getStringConfig()`, `getBooleanConfig()`, `getNumberConfig()`, `getArrayConfig()` - Typed getters
- `validateConfig()` - Validate config against rules
- `parseJsonc()` - Parse JSONC content
- `readJsoncFile()` - Read and parse JSONC file

**Usage Example**:
```typescript
import { getPlatformConfig, getStringConfig } from '@wt/web-automation/config';

const config = getPlatformConfig({
  platform: 'publish-to-wechatmp',
  envVar: 'WECHATMP_CONFIG',
});

const author = getStringConfig('author', 'Default Author', { platform: 'publish-to-wechatmp' });
```

### 2. `selectors.ts` - Selector Utilities

**Location**: `plugins/wt/scripts/web-automation/src/selectors.ts`

**Features**:
- Multi-selector fallback (try multiple selectors)
- Element finding by text, label, attributes
- DOM relationship helpers (parent, child, sibling)
- Element state utilities (visible, enabled, exists)
- Selector builder for complex selectors
- I18N selector support

**Key Functions**:
- `trySelectors()` - Try multiple selectors, return first match
- `findByText()` - Find element by text content
- `findByLabel()` - Find input by associated label
- `waitForAnySelector()` - Wait for any selector to match
- `findSibling()`, `findParent()`, `findChild()` - DOM navigation
- `exists()`, `isVisible()`, `isEnabled()` - State checks
- `buildSelector()` - Build CSS selector from options
- `buildSelectorVariants()` - Build multiple selector variants
- `buildButtonSelectors()`, `buildInputSelectors()`, `buildEditorSelectors()` - Pre-built patterns

**Usage Example**:
```typescript
import { trySelectors, buildInputSelectors } from '@wt/web-automation/selectors';

const titleSelectors = buildInputSelectors({
  placeholder: 'Enter title',
  name: 'title',
});

const result = await trySelectors(page, titleSelectors, { timeout: 5000 });
if (result.found) {
  await result.locator.type('My Article Title');
}
```

## Package Exports

Updated `package.json` exports:
```json
{
  "exports": {
    "./config": "./dist/config.js",
    "./selectors": "./dist/selectors.js",
    // ... existing exports
  }
}
```

## Import Paths

Skills can now import from the enhanced library:

```typescript
// Config utilities
import { getPlatformConfig, parseJsonc } from '@wt/web-automation/config';

// Selector utilities
import { trySelectors, buildSelector } from '@wt/web-automation/selectors';

// Playwright utilities (existing)
import { pwSleep, handleLogin } from '@wt/web-automation/playwright';
```

## Next Steps

With these enhancements, the `publish-to-*` skills can now:
1. Parse configuration files with trailing commas and comments
2. Use robust multi-selector fallback patterns
3. Build platform-specific selectors with common patterns
4. Validate configuration before use

This provides a solid foundation for migrating the remaining CDP-based skills to Playwright.
