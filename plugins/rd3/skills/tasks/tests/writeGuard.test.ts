import { beforeEach, afterEach, describe, expect, test, spyOn, type Mock } from 'bun:test';
import {
    buildPatterns,
    checkWriteGuard,
    resetCachedPatterns,
    runMain,
    runWriteGuardStdin,
} from '../scripts/commands/writeGuard';
import { logger, setGlobalSilent } from '../../../scripts/logger';
import { resetConfigCache } from '../scripts/lib/config';
import * as fs from 'node:fs';
import { resolve, join } from 'node:path';

describe('buildPatterns', () => {
    test('builds protected and exempt patterns for single folder', () => {
        const { protected: prot, exempt: exc } = buildPatterns(['custom/folder']);

        expect(prot).toHaveLength(1);
        // Protected blocks direct .md files under the folder
        expect(prot[0].test('custom/folder/file.md')).toBe(true);

        expect(exc).toHaveLength(1);
        // Exempt allows WBS subdirectories
        expect(exc[0].test('custom/folder/0001/file.md')).toBe(true);
        expect(exc[0].test('custom/folder/file.md')).toBe(false);
    });

    test('escapes regex special characters in folder names', () => {
        const { protected: prot } = buildPatterns(['docs/tasks.v2']);

        expect(prot).toHaveLength(1);
        // The dot should be escaped, so it matches literally
        expect(prot[0].test('docs/tasks.v2/file.md')).toBe(true);
        // Should not match docs/tasksXv2
        expect(prot[0].test('docs/tasksXv2/file.md')).toBe(false);
    });

    test('builds patterns for multiple folders', () => {
        const folders = ['docs/tasks', 'docs/archive'];
        const { protected: prot, exempt: exc } = buildPatterns(folders);

        expect(prot).toHaveLength(2);
        expect(exc).toHaveLength(2);
    });

    test('protected pattern matches direct .md files', () => {
        const { protected: prot } = buildPatterns(['docs/tasks']);
        expect(prot[0].test('docs/tasks/file.md')).toBe(true);
        expect(prot[0].test('docs/tasks/test.MD')).toBe(false); // case-sensitive
        // Note: the pattern uses .+ which matches 0001, but this is fine since
        // exempt patterns are checked first in checkWriteGuard
        expect(prot[0].test('docs/tasks/0001/file.md')).toBe(true); // .+ matches any chars
    });

    test('exempt pattern matches WBS subdirectories', () => {
        const { exempt: exc } = buildPatterns(['docs/tasks']);
        expect(exc[0].test('docs/tasks/0001/file.md')).toBe(true);
        expect(exc[0].test('docs/tasks/9999/file.ts')).toBe(true);
        expect(exc[0].test('docs/tasks/0001/0002/file.md')).toBe(true);
        expect(exc[0].test('docs/tasks/file.md')).toBe(false); // no WBS
        expect(exc[0].test('docs/tasks/001/file.md')).toBe(false); // 3 digits
    });
});

describe('checkWriteGuard', () => {
    let warnSpy: Mock<(message: string, ...args: unknown[]) => void>;
    let errorSpy: Mock<(message: string, ...args: unknown[]) => void>;

    beforeEach(() => {
        setGlobalSilent(true);
        resetConfigCache();
        resetCachedPatterns();
        warnSpy = spyOn(logger, 'warn').mockImplementation(() => {});
        errorSpy = spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        warnSpy.mockRestore();
        errorSpy.mockRestore();
    });

    describe('tool filtering', () => {
        const testDirTool = resolve(import.meta.dir, 'temp-writeguard-tool');

        beforeEach(() => {
            fs.rmSync(testDirTool, { recursive: true, force: true });
            fs.mkdirSync(join(testDirTool, 'docs/tasks'), { recursive: true });
        });

        afterEach(() => {
            fs.rmSync(testDirTool, { recursive: true, force: true });
        });

        test('allows Read tool', () => {
            const result = checkWriteGuard('Read', 'docs/tasks/0001_test.md', testDirTool);
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('blocks Edit tool on protected path (docs/tasks)', () => {
            const result = checkWriteGuard('Edit', 'docs/tasks/file.md', testDirTool);
            expect(result.allowed).toBe(false);
            expect(result.code).toBe(2);
        });
    });

    describe('pattern matching - protected patterns', () => {
        const testDirProt = resolve(import.meta.dir, 'temp-writeguard-protected');

        beforeEach(() => {
            fs.rmSync(testDirProt, { recursive: true, force: true });
            fs.mkdirSync(join(testDirProt, 'docs/tasks'), { recursive: true });
        });

        afterEach(() => {
            fs.rmSync(testDirProt, { recursive: true, force: true });
        });

        test('blocks direct .md files in docs/tasks', () => {
            const result = checkWriteGuard('Write', 'docs/tasks/another_file.md', testDirProt);
            expect(result.allowed).toBe(false);
            expect(result.code).toBe(2);
        });
    });

    describe('pattern matching - exempt patterns', () => {
        const testDirExempt = resolve(import.meta.dir, 'temp-writeguard-exempt');

        beforeEach(() => {
            fs.rmSync(testDirExempt, { recursive: true, force: true });
            fs.mkdirSync(join(testDirExempt, 'docs/tasks'), { recursive: true });
        });

        afterEach(() => {
            fs.rmSync(testDirExempt, { recursive: true, force: true });
        });

        test('allows subdirectory paths docs/tasks/<wbs>/...', () => {
            const result = checkWriteGuard('Write', 'docs/tasks/0001/some_file.md', testDirExempt);
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });
    });

    describe('pattern matching - edge cases', () => {
        test('allows empty file path', () => {
            const result = checkWriteGuard('Edit', '');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('blocks partial matches at folder boundary', () => {
            const testDirBoundary = resolve(import.meta.dir, 'temp-writeguard-boundary');
            fs.rmSync(testDirBoundary, { recursive: true, force: true });
            fs.mkdirSync(testDirBoundary, { recursive: true });

            // Handlers should only match docs/tasks/ strictly
            const result1 = checkWriteGuard('Edit', 'docs/tasks/file.md', testDirBoundary);
            expect(result1.allowed).toBe(false);

            fs.rmSync(testDirBoundary, { recursive: true, force: true });
        });

        test('does not block files starting with tasks (prefix collision)', () => {
            const result = checkWriteGuard('Write', 'docs/tasks_extra/file.md');
            expect(result.allowed).toBe(true); // Not under docs/tasks/
        });
    });

    describe('reason message', () => {
        test('returns reason when blocked', () => {
            const result = checkWriteGuard('Edit', 'docs/tasks/0001_test.md');
            expect(result.allowed).toBe(false);
            expect(result.reason).toBeDefined();
            expect(result.reason).toContain('blocked');
        });
    });
});

describe('runWriteGuardStdin', () => {
    let errorSpy: Mock<(message: string, ...args: unknown[]) => void>;

    beforeEach(() => {
        setGlobalSilent(true);
        errorSpy = spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
    });

    test('returns 0 when write is allowed', () => {
        const input = JSON.stringify({
            tool_name: 'Write',
            tool_input: { file_path: 'src/app.ts' },
        });
        const exitCode = runWriteGuardStdin(input);
        expect(exitCode).toBe(0);
    });

    test('returns 2 when write is blocked', () => {
        const input = JSON.stringify({
            tool_name: 'Edit',
            tool_input: { file_path: 'docs/tasks/test.md' },
        });
        const exitCode = runWriteGuardStdin(input);
        expect(exitCode).toBe(2);
    });
});

describe('runMain direct execution', () => {
    let exitSpy: Mock<(code: number) => never>;
    let readSpy: Mock<(path: string | number | URL, encoding?: BufferEncoding) => string | Buffer>;

    beforeEach(() => {
        exitSpy = spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('exit');
        });
        readSpy = spyOn(fs, 'readFileSync');
    });

    afterEach(() => {
        exitSpy.mockRestore();
        readSpy.mockRestore();
    });

    test('runMain reads from stdin and exits', () => {
        const input = JSON.stringify({
            tool_name: 'Edit',
            tool_input: { file_path: 'docs/tasks/test.md' },
        });
        readSpy.mockReturnValue(input);

        expect(() => runMain()).toThrow('exit');
        expect(readSpy).toHaveBeenCalledWith('/dev/stdin', 'utf-8');
    });
});
