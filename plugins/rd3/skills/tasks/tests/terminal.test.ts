import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { setGlobalSilent } from '../../../scripts/logger';
import { spawnSync as realSpawnSync } from 'node:child_process';

describe('displayMarkdown', () => {
    let loggerSpy: ReturnType<typeof spyOn>;
    let originalIsTTY: boolean | undefined | null;

    const testContent = '# Test Markdown\\n\\nThis is test content.';

    beforeEach(() => {
        setGlobalSilent(true);

        const { logger } = require('../../../scripts/logger');
        loggerSpy = spyOn(logger, 'log');

        originalIsTTY = process.stdout.isTTY;
        Object.defineProperty(process.stdout, 'isTTY', {
            get: () => false,
            configurable: true,
        });
    });

    afterEach(() => {
        setGlobalSilent(false);
        loggerSpy.mockRestore();
        Object.defineProperty(process.stdout, 'isTTY', {
            get: () => originalIsTTY,
            configurable: true,
        });
    });

    describe('when not in TTY environment', () => {
        test('bypasses glow and uses logger directly', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            displayMarkdown(testContent);
            expect(loggerSpy).toHaveBeenCalledWith(testContent);
        });

        test('handles empty content in non-TTY', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            displayMarkdown('');
            expect(loggerSpy).toHaveBeenCalledWith('');
        });

        test('handles special characters in non-TTY', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            const specialContent = '# Non-TTY with émojis 🎯\\n\\nSpecial: éñ中文';
            displayMarkdown(specialContent);
            expect(loggerSpy).toHaveBeenCalledWith(specialContent);
        });

        test('preserves exact content when passed to logger', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            const originalContent = '# Exact Content\\n\\nThis should be preserved exactly.';
            displayMarkdown(originalContent);
            expect(loggerSpy).toHaveBeenCalledWith(originalContent);
        });

        test('handles multiple consecutive calls in non-TTY', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            displayMarkdown('# First call');
            displayMarkdown('# Second call');
            displayMarkdown('# Third call');
            expect(loggerSpy).toHaveBeenCalledTimes(3);
            expect(loggerSpy).toHaveBeenNthCalledWith(1, '# First call');
            expect(loggerSpy).toHaveBeenNthCalledWith(2, '# Second call');
            expect(loggerSpy).toHaveBeenNthCalledWith(3, '# Third call');
        });

        test('handles markdown with code blocks in non-TTY', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            const codeContent = '# Code Example\\n\\n```javascript\\nconst test = "hello";\\nconsole.log(test);\\n```';
            displayMarkdown(codeContent);
            expect(loggerSpy).toHaveBeenCalledWith(codeContent);
        });

        test('handles markdown with tables in non-TTY', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            const tableContent = '# Table\\n\\n| Col1 | Col2 |\\n|------|------|\\n| A    | B    |';
            displayMarkdown(tableContent);
            expect(loggerSpy).toHaveBeenCalledWith(tableContent);
        });

        test('handles markdown with links in non-TTY', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            const linkContent = '# Links\\n\\n[Example](https://example.com) and ![Image](image.png)';
            displayMarkdown(linkContent);
            expect(loggerSpy).toHaveBeenCalledWith(linkContent);
        });
    });

    describe('edge cases for isTTY handling', () => {
        test('handles undefined isTTY property', async () => {
            Object.defineProperty(process.stdout, 'isTTY', {
                get: () => undefined,
                configurable: true,
            });
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            displayMarkdown(testContent);
            expect(loggerSpy).toHaveBeenCalledWith(testContent);
        });

        test('handles null isTTY property', async () => {
            Object.defineProperty(process.stdout, 'isTTY', {
                get: () => null,
                configurable: true,
            });
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            displayMarkdown(testContent);
            expect(loggerSpy).toHaveBeenCalledWith(testContent);
        });

        test('handles 0 isTTY property', async () => {
            Object.defineProperty(process.stdout, 'isTTY', {
                get: () => 0,
                configurable: true,
            });
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            displayMarkdown(testContent);
            expect(loggerSpy).toHaveBeenCalledWith(testContent);
        });

        test('handles empty string isTTY property', async () => {
            Object.defineProperty(process.stdout, 'isTTY', {
                get: () => '',
                configurable: true,
            });
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            displayMarkdown(testContent);
            expect(loggerSpy).toHaveBeenCalledWith(testContent);
        });
    });

    describe('function behavior', () => {
        test('function exists and is callable', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            expect(typeof displayMarkdown).toBe('function');
        });

        test('function accepts string parameter', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            expect(() => displayMarkdown('test')).not.toThrow();
            expect(loggerSpy).toHaveBeenCalledWith('test');
        });

        test('function handles very long strings', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            const longContent = 'A'.repeat(10000);
            expect(() => displayMarkdown(longContent)).not.toThrow();
            expect(loggerSpy).toHaveBeenCalledWith(longContent);
        });

        test('function handles strings with newlines', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            const multilineContent = 'Line 1\\nLine 2\\nLine 3';
            displayMarkdown(multilineContent);
            expect(loggerSpy).toHaveBeenCalledWith(multilineContent);
        });

        test('function handles strings with unicode', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            const unicodeContent = '🚀 Unicode: éñüñøñé 中文 العربية';
            displayMarkdown(unicodeContent);
            expect(loggerSpy).toHaveBeenCalledWith(unicodeContent);
        });
    });

    describe('logger integration', () => {
        test('respects global silent mode', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            displayMarkdown(testContent);
            expect(loggerSpy).toHaveBeenCalledWith(testContent);
        });

        test('calls logger.log specifically', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            displayMarkdown(testContent);
            expect(loggerSpy).toHaveBeenCalledWith(testContent);
            expect(loggerSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('TTY detection behavior', () => {
        test('uses logger when isTTY is false', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            displayMarkdown(testContent);
            expect(loggerSpy).toHaveBeenCalledWith(testContent);
        });

        test('uses logger for multiple calls', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            displayMarkdown('first');
            displayMarkdown('second');
            expect(loggerSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('when in TTY environment with globalSilent', () => {
        beforeEach(() => {
            Object.defineProperty(process.stdout, 'isTTY', {
                get: () => true,
                configurable: true,
            });
        });

        test('skips glow when globalSilent is true, falls to logger', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            displayMarkdown(testContent);
            expect(loggerSpy).toHaveBeenCalledWith(testContent);
        });

        test('falls to logger for empty content in TTY', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            displayMarkdown('');
            expect(loggerSpy).toHaveBeenCalledWith('');
        });

        test('handles complex content in TTY with globalSilent', async () => {
            const { displayMarkdown } = await import('../scripts/lib/terminal');
            const complexContent =
                '# Complex Markdown\n\n- List item\n- **Bold**\n- _Italic_\n\n```bash\necho "test"\n```';
            displayMarkdown(complexContent);
            expect(loggerSpy).toHaveBeenCalledWith(complexContent);
        });
    });

    describe('glow rendering (TTY + non-silent + non-empty)', () => {
        let terminal: typeof import('../scripts/lib/terminal');

        beforeEach(async () => {
            setGlobalSilent(false);
            Object.defineProperty(process.stdout, 'isTTY', {
                get: () => true,
                configurable: true,
            });
            // Suppress logger output during glow tests (spy calls through by default)
            loggerSpy.mockImplementation(() => {});
            terminal = await import('../scripts/lib/terminal');
        });

        afterEach(() => {
            terminal._spawn.sync = realSpawnSync;
        });

        test('glow success path: logger is NOT called', () => {
            terminal._spawn.sync = () => ({ status: 0, error: null }) as never;
            terminal.displayMarkdown('# Hello');
            expect(loggerSpy).not.toHaveBeenCalled();
        });

        test('falls to logger when glow exits non-zero', () => {
            terminal._spawn.sync = () => ({ status: 1, error: null }) as never;
            terminal.displayMarkdown('# Fail');
            expect(loggerSpy).toHaveBeenCalledWith('# Fail');
        });

        test('falls to logger when glow returns an error', () => {
            terminal._spawn.sync = () => ({ status: 0, error: new Error('not found') }) as never;
            terminal.displayMarkdown('# Err');
            expect(loggerSpy).toHaveBeenCalledWith('# Err');
        });

        test('falls to logger when glow returns null status', () => {
            terminal._spawn.sync = () => ({ status: null, error: null }) as never;
            terminal.displayMarkdown('# NullStatus');
            expect(loggerSpy).toHaveBeenCalledWith('# NullStatus');
        });

        test('empty content skips glow and calls logger', () => {
            terminal.displayMarkdown('');
            expect(loggerSpy).toHaveBeenCalledWith('');
        });
    });
});
