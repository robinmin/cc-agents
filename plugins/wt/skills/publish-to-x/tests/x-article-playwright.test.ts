/**
 * Tests for x-article-playwright.ts
 */

import { describe, test, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

// Setup __dirname equivalent for ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import the module under test
const scriptPath = path.join(__dirname, '../scripts/x-article-playwright.ts');

// Dynamic import to get exports
const xArticlePw = await import(scriptPath);

const { I18N_SELECTORS, parseArgs, generatePlaywrightScript, publishArticlePlaywright } = xArticlePw;

describe('I18N_SELECTORS', () => {
  test('should have all required selector keys', () => {
    expect(I18N_SELECTORS).toHaveProperty('writeButton');
    expect(I18N_SELECTORS).toHaveProperty('titleInput');
    expect(I18N_SELECTORS).toHaveProperty('editorBody');
    expect(I18N_SELECTORS).toHaveProperty('fileInput');
    expect(I18N_SELECTORS).toHaveProperty('applyButton');
    expect(I18N_SELECTORS).toHaveProperty('previewButton');
    expect(I18N_SELECTORS).toHaveProperty('publishButton');
  });

  test('should have selectors for English X interface', () => {
    const selectors = I18N_SELECTORS.writeButton;
    expect(selectors).toContain('[data-testid="empty_state_button_text"]');
    expect(selectors).toContain('[data-testid="btn"]');
  });

  test('should have multi-language title input selectors', () => {
    const selectors = I18N_SELECTORS.titleInput;
    expect(selectors).toContain('textarea[placeholder="Add a title"]');
    expect(selectors).toContain('textarea[placeholder="添加标题"]'); // Chinese
    expect(selectors).toContain('textarea[placeholder="タイトルを追加"]'); // Japanese
    expect(selectors).toContain('textarea[placeholder="제목 추가"]'); // Korean
  });

  test('should have multi-language preview button selectors', () => {
    const selectors = I18N_SELECTORS.previewButton;
    expect(selectors).toContain('button[aria-label*="preview" i]');
    expect(selectors).toContain('button[aria-label*="预览" i]');
  });

  test('should have multi-language publish button selectors', () => {
    const selectors = I18N_SELECTORS.publishButton;
    expect(selectors).toContain('button[aria-label*="publish" i]');
    expect(selectors).toContain('button[aria-label*="发布" i]'); // Chinese
    expect(selectors).toContain('div[role="button"]:has-text("Publish")');
    expect(selectors).toContain('div[role="button"]:has-text("发布")'); // Chinese
  });
});

describe('parseArgs', () => {
  beforeEach(() => {
    // Mock environment
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should return default values when no args provided', () => {
    const result = parseArgs([]);
    // When args.length === 0, showHelp is true
    expect(result.showHelp).toBe(true);
    // Other defaults still apply when checking values
    expect(result.retryAttempts).toBe(3);
  });

  test('should show help when --help is passed', () => {
    const result = parseArgs(['--help']);
    expect(result.showHelp).toBe(true);
  });

  test('should show help when -h is passed', () => {
    const result = parseArgs(['-h']);
    expect(result.showHelp).toBe(true);
  });

  test('should parse markdown file path', () => {
    const result = parseArgs(['article.md']);
    expect(result.markdownPath).toBe('article.md');
  });

  test('should parse --title option', () => {
    const result = parseArgs(['article.md', '--title', 'My Title']);
    expect(result.title).toBe('My Title');
  });

  test('should parse --cover option', () => {
    const result = parseArgs(['article.md', '--cover', 'hero.png']);
    expect(result.coverImage).toBe('hero.png');
  });

  test('should parse --submit option', () => {
    const result = parseArgs(['article.md', '--submit']);
    expect(result.submit).toBe(true);
  });

  test('should parse --no-submit option', () => {
    const result = parseArgs(['article.md', '--no-submit']);
    expect(result.submit).toBe(false);
  });

  test('should parse --profile option', () => {
    const result = parseArgs(['article.md', '--profile', '/custom/path']);
    expect(result.profileDir).toBe('/custom/path');
  });

  test('should parse --retry-attempts option with valid number', () => {
    const result = parseArgs(['article.md', '--retry-attempts', '5']);
    expect(result.retryAttempts).toBe(5);
  });

  test('should default --retry-attempts to 3 for invalid input', () => {
    const result = parseArgs(['article.md', '--retry-attempts', 'invalid']);
    expect(result.retryAttempts).toBe(3);
  });

  test('should use max(1, value) for negative --retry-attempts', () => {
    const result = parseArgs(['article.md', '--retry-attempts', '-1']);
    expect(result.retryAttempts).toBe(1);
  });

  test('should use max(1, value) for zero --retry-attempts', () => {
    const result = parseArgs(['article.md', '--retry-attempts', '0']);
    expect(result.retryAttempts).toBe(1);
  });

  test('should parse --verbose option', () => {
    const result = parseArgs(['article.md', '--verbose']);
    expect(result.verbose).toBe(true);
  });

  test('should handle multiple options', () => {
    const result = parseArgs([
      'article.md',
      '--title', 'My Title',
      '--cover', 'hero.png',
      '--submit',
      '--verbose'
    ]);

    expect(result.markdownPath).toBe('article.md');
    expect(result.title).toBe('My Title');
    expect(result.coverImage).toBe('hero.png');
    expect(result.submit).toBe(true);
    expect(result.verbose).toBe(true);
  });
});

describe('generatePlaywrightScript', () => {
  const baseOptions = {
    htmlFilePath: '/tmp/x-article-pw/content.html',
    title: 'Test Article',
    coverImage: '/tmp/cover.png',
    contentImages: [
      { placeholder: '![img1]', localPath: '/tmp/img1.png', blockIndex: 0 },
    ],
    submit: false,
    verbose: false,
    profileDir: '/tmp/test-profile',
  };

  test('should return a non-empty string', () => {
    const script = generatePlaywrightScript(baseOptions);
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(100);
  });

  test('should use launchPersistentContext for login caching', () => {
    const script = generatePlaywrightScript(baseOptions);
    expect(script).toContain('launchPersistentContext');
    expect(script).toContain('PROFILE_DIR');
  });

  test('should NOT embed HTML content directly (token efficiency)', () => {
    const script = generatePlaywrightScript(baseOptions);
    // Should read from file, not have HTML embedded
    expect(script).toContain('fs.readFileSync');
    expect(script).toContain('content.html');
  });

  test('should include login detection logic', () => {
    const script = generatePlaywrightScript(baseOptions);
    expect(script).toContain('isLoggedIn');
    expect(script).toContain('/login');
    expect(script).toContain('LOGIN REQUIRED');
    expect(script).toContain('waitForURL');
  });

  test('should include I18N selectors', () => {
    const script = generatePlaywrightScript(baseOptions);
    expect(script).toContain('SELECTORS');
    expect(script).toContain('trySelectors');
    // Check for actual selector values
    expect(script).toContain('empty_state_button_text');
    expect(script).toContain('DraftEditor-editorContainer');
  });

  test('should include multiple content insertion methods', () => {
    const script = generatePlaywrightScript(baseOptions);
    // Method 1: paste event
    expect(script).toContain('ClipboardEvent');
    expect(script).toContain('DataTransfer');
  });

  test('should include title when provided', () => {
    const script = generatePlaywrightScript(baseOptions);
    expect(script).toContain('Test Article');
  });

  test('should include cover image when provided', () => {
    const script = generatePlaywrightScript(baseOptions);
    expect(script).toContain('/tmp/cover.png');
    expect(script).toContain('setInputFiles');
  });

  test('should include content images info', () => {
    const opts = {
      ...baseOptions,
      contentImages: [
        { placeholder: 'XIMGPH_1', localPath: '/tmp/img1.png', blockIndex: 3 },
        { placeholder: 'XIMGPH_2', localPath: '/tmp/img2.jpg', blockIndex: 5 },
      ],
    };
    const script = generatePlaywrightScript(opts);
    expect(script).toContain('XIMGPH_1');
    expect(script).toContain('XIMGPH_2');
  });

  test('should set SUBMIT correctly for publish mode', () => {
    const submitScript = generatePlaywrightScript({ ...baseOptions, submit: true });
    expect(submitScript).toContain('SUBMIT = true');
    expect(submitScript).toContain('Publishing...');

    const draftScript = generatePlaywrightScript({ ...baseOptions, submit: false });
    expect(draftScript).toContain('draft mode');
  });

  test('should set VERBOSE correctly', () => {
    const verboseScript = generatePlaywrightScript({ ...baseOptions, verbose: true });
    expect(verboseScript).toContain('VERBOSE = true');

    const quietScript = generatePlaywrightScript({ ...baseOptions, verbose: false });
    expect(quietScript).toContain('VERBOSE = false');
  });

  test('should include error handling with screenshot', () => {
    const script = generatePlaywrightScript(baseOptions);
    expect(script).toContain('screenshot');
    expect(script).toContain('pw-error.png');
    expect(script).toContain('catch');
    expect(script).toContain('finally');
  });

  test('should close context in finally block', () => {
    const script = generatePlaywrightScript(baseOptions);
    expect(script).toContain('context.close()');
  });

  test('should navigate to correct URL', () => {
    const script = generatePlaywrightScript(baseOptions);
    expect(script).toContain('x.com/compose/articles');
  });

  test('should properly escape special characters in profileDir', () => {
    const opts = { ...baseOptions, profileDir: "/path/with 'quotes' and spaces" };
    const script = generatePlaywrightScript(opts);
    // JSON.stringify handles escaping
    expect(script).toContain("with 'quotes' and spaces");
  });

  test('should generate valid JavaScript syntax', () => {
    const script = generatePlaywrightScript(baseOptions);
    expect(() => new Function(script)).not.toThrow();
  });
});

describe('publishArticlePlaywright', () => {
  const tempDir = path.join(os.tmpdir(), 'x-article-pw-test-' + Date.now());

  beforeAll(async () => {
    // Create temp directory
    await fs.promises.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup temp directory
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('should exist and be a function', () => {
    expect(typeof publishArticlePlaywright).toBe('function');
  });
});
