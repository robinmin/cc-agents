/**
 * Tests for playwright.ts
 */
import { describe, it, expect, vi } from 'bun:test';
import * as path from 'node:path';
import * as os from 'node:os';
// Import functions to test
import { pwSleep, getFreePort, getDefaultProfileDir, retry, generateLaunchScript, generateLoginDetectionScript, generateElementHelpersScript, generateContentInsertionScript, generateI18NSelectorsScript, generateRetryScript, generatePublishingScript, } from '../src/playwright';
describe('pwSleep', () => {
    it('should resolve after specified ms', async () => {
        const start = Date.now();
        await pwSleep(50);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeGreaterThanOrEqual(45);
        expect(elapsed).toBeLessThan(100);
    });
});
describe('getFreePort', () => {
    it('should return a valid port number', async () => {
        const port = await getFreePort();
        expect(typeof port).toBe('number');
        expect(port).toBeGreaterThan(0);
        expect(port).toBeLessThanOrEqual(65535);
    });
    it('should return different ports for multiple calls', async () => {
        const port1 = await getFreePort();
        const port2 = await getFreePort();
        expect(port1).not.toBe(port2);
    });
});
describe('getDefaultProfileDir', () => {
    it('should return a path in XDG_DATA_HOME when set', () => {
        const original = process.env.XDG_DATA_HOME;
        try {
            process.env.XDG_DATA_HOME = '/custom/data';
            const dir = getDefaultProfileDir('test');
            expect(dir).toBe('/custom/data/test-profile');
        }
        finally {
            if (original !== undefined) {
                process.env.XDG_DATA_HOME = original;
            }
            else {
                delete process.env.XDG_DATA_HOME;
            }
        }
    });
    it('should return a path in homedir/.local/share when XDG_DATA_HOME not set', () => {
        const original = process.env.XDG_DATA_HOME;
        delete process.env.XDG_DATA_HOME;
        try {
            const dir = getDefaultProfileDir('myapp');
            const expected = path.join(os.homedir(), '.local', 'share', 'myapp-profile');
            expect(dir).toBe(expected);
        }
        finally {
            if (original !== undefined) {
                process.env.XDG_DATA_HOME = original;
            }
        }
    });
    it('should use default platform name when not specified', () => {
        const original = process.env.XDG_DATA_HOME;
        delete process.env.XDG_DATA_HOME;
        try {
            const dir = getDefaultProfileDir();
            expect(dir.endsWith('wt-browser-profile')).toBe(true);
        }
        finally {
            if (original !== undefined) {
                process.env.XDG_DATA_HOME = original;
            }
        }
    });
});
describe('retry', () => {
    it('should succeed on first attempt', async () => {
        let callCount = 0;
        const fn = vi.fn(async () => {
            callCount++;
            return 'success';
        });
        const result = await retry(fn, { maxAttempts: 3 });
        expect(result).toBe('success');
        expect(callCount).toBe(1);
    });
    it('should retry on failure and succeed', async () => {
        let callCount = 0;
        const fn = vi.fn(async () => {
            callCount++;
            if (callCount < 3) {
                throw new Error('temporary failure');
            }
            return 'success';
        });
        const result = await retry(fn, { maxAttempts: 5, delayMs: 10, verbose: false });
        expect(result).toBe('success');
        expect(callCount).toBe(3);
    });
    it('should throw after all attempts fail', async () => {
        const fn = vi.fn(async () => {
            throw new Error('always fails');
        });
        await expect(retry(fn, { maxAttempts: 3, delayMs: 10 })).rejects.toThrow('always fails');
        expect(fn).toHaveBeenCalledTimes(3);
    });
    it('should respect shouldRetry option', async () => {
        let callCount = 0;
        const fn = vi.fn(async () => {
            callCount++;
            throw new Error('retryable');
        });
        await expect(retry(fn, {
            maxAttempts: 5,
            delayMs: 10,
            shouldRetry: () => false,
        })).rejects.toThrow('retryable');
        expect(callCount).toBe(1);
    });
    it('should use exponential backoff', async () => {
        const delays = [];
        let callCount = 0;
        const fn = vi.fn(async () => {
            callCount++;
            if (callCount < 4) {
                const start = Date.now();
                await pwSleep(10);
                delays.push(Date.now() - start);
                throw new Error('retry');
            }
            return 'success';
        });
        await retry(fn, { maxAttempts: 4, delayMs: 20, backoffMultiplier: 2, verbose: false });
        // Subsequent delays should be longer or equal (allow some timing variance)
        expect(delays.length).toBe(3);
        // Use a small tolerance for timing tests
        expect(Math.abs(delays[1] - delays[0])).toBeLessThan(20);
        expect(Math.abs(delays[2] - delays[1])).toBeLessThan(20);
    });
});
describe('generateLaunchScript', () => {
    it('should generate valid JavaScript', () => {
        const script = generateLaunchScript({
            profileDir: '/test/profile',
            headless: true,
            slowMo: 50,
            url: 'https://example.com',
            verbose: true,
        });
        expect(script).toContain("require('playwright')");
        expect(script).toContain('/test/profile');
        expect(script).toContain('https://example.com');
        expect(script).toContain('HEADLESS = true');
        expect(script).toContain("global.__PW_CONTEXT__");
    });
    it('should use default values when not provided', () => {
        const script = generateLaunchScript({
            profileDir: '/test/profile',
        });
        expect(script).toContain('HEADLESS = false');
        expect(script).toContain('SLOW_MO = 100');
        expect(script).toContain('viewport');
        expect(script).toContain('1280');
        expect(script).toContain('900');
    });
    it('should handle empty args array', () => {
        const script = generateLaunchScript({
            profileDir: '/test/profile',
            args: [],
        });
        expect(script).toContain('ARGS = []');
    });
});
describe('generateLoginDetectionScript', () => {
    it('should generate valid JavaScript with login URLs', () => {
        const script = generateLoginDetectionScript({
            loginUrls: ['/login', '/i/flow/login'],
            authenticatedUrls: ['/home', '/compose/articles'],
            timeoutMs: 60000,
            verbose: true,
        });
        expect(script).toContain('/login');
        expect(script).toContain('/home');
        expect(script).toContain('TIMEOUT_MS = 60000');
        expect(script).toContain('waitForLogin');
        expect(script).toContain('isLoggedIn');
    });
    it('should use custom nav selector', () => {
        const script = generateLoginDetectionScript({
            loginUrls: [],
            authenticatedUrls: [],
            navSelector: '[data-testid="nav"]',
        });
        expect(script).toContain('[data-testid=\\"nav\\"]');
    });
    it('should include login required message', () => {
        const script = generateLoginDetectionScript({
            loginUrls: [],
            authenticatedUrls: [],
        });
        expect(script).toContain('LOGIN REQUIRED');
    });
});
describe('generateElementHelpersScript', () => {
    it('should generate valid JavaScript with selectors', () => {
        const selectors = {
            button: ['[data-testid="btn"]', '.btn'],
            input: ['input[name="test"]'],
        };
        const script = generateElementHelpersScript({ selectors, verbose: true });
        expect(script).toContain('trySelectors');
        expect(script).toContain('clickElement');
        expect(script).toContain('typeText');
        expect(script).toContain('fillContent');
        expect(script).toContain('uploadFiles');
        expect(script).toContain('[data-testid=\\"btn\\"]');
        expect(script).toContain("global.__PW_CLICK__");
    });
    it('should handle empty selectors', () => {
        const script = generateElementHelpersScript({});
        expect(script).toContain('trySelectors');
        expect(script).toContain('SELECTORS = {}');
    });
});
describe('generateContentInsertionScript', () => {
    it('should generate valid JavaScript', () => {
        const script = generateContentInsertionScript({ verbose: true });
        expect(script).toContain('insertHtmlViaPaste');
        expect(script).toContain('insertHtmlViaExec');
        expect(script).toContain('insertHtml');
        expect(script).toContain('insertHtmlFromFile');
    });
    it('should include clipboard event handling', () => {
        const script = generateContentInsertionScript({});
        expect(script).toContain('DataTransfer');
        expect(script).toContain('ClipboardEvent');
    });
    it('should have execCommand fallback', () => {
        const script = generateContentInsertionScript({});
        expect(script).toContain('execCommand');
    });
});
describe('generateI18NSelectorsScript', () => {
    it('should generate valid JavaScript with selectors', () => {
        const selectors = {
            writeButton: ['[data-testid="write"]', 'button:has-text("Write")'],
            titleInput: ['textarea[placeholder="Add a title"]'],
        };
        const script = generateI18NSelectorsScript(selectors);
        expect(script).toContain('getI18NSelectors');
        expect(script).toContain('getFirstVisibleSelector');
        expect(script).toContain('hasI18NSelectors');
        expect(script).toContain('writeButton');
        expect(script).toContain('titleInput');
    });
    it('should export helper functions globally', () => {
        const script = generateI18NSelectorsScript({});
        expect(script).toContain("global.__PW_I18N_GET__");
        expect(script).toContain("global.__PW_I18N_FIRST__");
        expect(script).toContain("global.__PW_I18N_HAS__");
    });
});
describe('generateRetryScript', () => {
    it('should generate valid JavaScript', () => {
        const script = generateRetryScript({ maxAttempts: 5, verbose: true });
        expect(script).toContain('retry');
        expect(script).toContain('MAX_ATTEMPTS');
        expect(script).toContain('DELAY_MS');
    });
    it('should use custom options', () => {
        const script = generateRetryScript({
            maxAttempts: 10,
            delayMs: 500,
            backoffMultiplier: 3,
        });
        expect(script).toContain('MAX_ATTEMPTS = 10');
        expect(script).toContain('DELAY_MS = 500');
        expect(script).toContain('BACKOFF_MULTIPLIER = 3');
    });
});
describe('generatePublishingScript', () => {
    const baseOptions = {
        profileDir: '/test/profile',
        url: 'https://x.com/compose/articles',
        selectors: {
            writeButton: ['[data-testid="empty_state_button_text"]'],
            editorBody: ['.DraftEditor-editorContainer [contenteditable="true"]'],
            publishButton: ['[data-testid="publishButton"]'],
        },
        submit: false,
        verbose: true,
    };
    it('should generate valid JavaScript', () => {
        const script = generatePublishingScript(baseOptions);
        expect(script).toContain("require('playwright')");
        expect(script).toContain('chromium.launchPersistentContext');
        expect(script).toContain('/test/profile');
    });
    it('should include login handling', () => {
        const script = generatePublishingScript(baseOptions);
        expect(script).toContain('LOGIN REQUIRED');
        expect(script).toContain('waitForURL');
    });
    it('should include content insertion', () => {
        const script = generatePublishingScript({
            ...baseOptions,
            htmlContent: '<p>Test content</p>',
        });
        expect(script).toContain('DataTransfer');
        expect(script).toContain('ClipboardEvent');
        expect(script).toContain('Test content');
    });
    it('should handle file-based content', () => {
        const script = generatePublishingScript({
            ...baseOptions,
            htmlFilePath: '/tmp/content.html',
        });
        expect(script).toContain('fs.readFileSync');
        expect(script).toContain('/tmp/content.html');
    });
    it('should include title filling', () => {
        const script = generatePublishingScript({
            ...baseOptions,
            title: 'Test Title',
        });
        expect(script).toContain('Test Title');
        expect(script).toContain('titleInput');
    });
    it('should include cover image upload', () => {
        const script = generatePublishingScript({
            ...baseOptions,
            coverImage: '/tmp/cover.png',
        });
        expect(script).toContain('cover image');
        expect(script).toContain('/tmp/cover.png');
    });
    it('should handle content images', () => {
        const script = generatePublishingScript({
            ...baseOptions,
            contentImages: [
                { placeholder: '![img1]', localPath: '/tmp/img1.png', blockIndex: 0 },
                { placeholder: '![img2]', localPath: '/tmp/img2.png', blockIndex: 1 },
            ],
        });
        expect(script).toContain('contentImages');
        expect(script).toContain('![img1]');
        expect(script).toContain('/tmp/img1.png');
    });
    it('should handle submit mode', () => {
        const draftScript = generatePublishingScript({ ...baseOptions, submit: false });
        const publishScript = generatePublishingScript({ ...baseOptions, submit: true });
        expect(draftScript).toContain('Article composed (draft mode)');
        expect(publishScript).toContain('Article published');
    });
    it('should include preview button handling', () => {
        const script = generatePublishingScript(baseOptions);
        expect(script).toContain('previewButton');
        expect(script).toContain('Opening preview');
    });
    it('should include error handling and screenshot', () => {
        const script = generatePublishingScript(baseOptions);
        expect(script).toContain('Error:');
        expect(script).toContain('screenshot');
        expect(script).toContain('/tmp/pw-error.png');
    });
    it('should clean up browser context', () => {
        const script = generatePublishingScript(baseOptions);
        expect(script).toContain('context.close()');
        expect(script).toContain('finally');
    });
});
describe('Script generation - integration', () => {
    it('should generate scripts that can be parsed as valid JS', () => {
        const scripts = [
            generateLaunchScript({ profileDir: '/test' }),
            generateLoginDetectionScript({ loginUrls: [], authenticatedUrls: [] }),
            generateElementHelpersScript({}),
            generateContentInsertionScript({}),
            generateI18NSelectorsScript({}),
            generateRetryScript({}),
            generatePublishingScript({
                profileDir: '/test',
                url: 'https://example.com',
                selectors: {},
                submit: false,
            }),
        ];
        for (const script of scripts) {
            expect(() => new Function(script)).not.toThrow();
        }
    });
});
//# sourceMappingURL=playwright.test.js.map