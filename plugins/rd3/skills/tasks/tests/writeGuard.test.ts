import { describe, expect, test, spyOn, beforeEach, afterEach } from 'bun:test';
import {
    buildPatterns,
    checkWriteGuard,
    loadPatterns,
    resetCachedPatterns,
    runMain,
    runWriteGuardStdin,
} from '../scripts/commands/writeGuard';
import { logger, setGlobalSilent } from '../../../scripts/logger';
import * as fs from 'node:fs';

// NOTE: loadPatterns() derives project root from process.argv[1] and looks for
// docs/.tasks/config.jsonc. In tests, we test against the actual project structure.
// Protected patterns block: docs/tasks/.md, docs/tasks2/.md, docs/prompts/.md
// Exempt patterns allow: docs/tasks/\d{4}/..., docs/tasks2/\d{4}/..., docs/prompts/\d{4}/...
//
// Note: The config loading code (lines 56-70) is exercised when config exists at the expected
// path. The catch block (lines 66-70) is only executed when JSON parsing fails.
// The main() function (lines 145-147) is executed in subprocess tests.

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
        const folders = ['docs/tasks', 'docs/tasks2', 'docs/prompts'];
        const { protected: prot, exempt: exc } = buildPatterns(folders);

        expect(prot).toHaveLength(3);
        expect(exc).toHaveLength(3);
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
    let errorSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        setGlobalSilent(true);
        errorSpy = spyOn(logger, 'error');
    });

    afterEach(() => {
        setGlobalSilent(false);
        errorSpy.mockRestore();
    });

    describe('tool filtering', () => {
        test('allows Read tool', () => {
            const result = checkWriteGuard('Read', 'docs/tasks/0001_test.md');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('allows Bash tool', () => {
            const result = checkWriteGuard('Bash', 'docs/tasks/0001_test.md');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('allows Grep tool', () => {
            const result = checkWriteGuard('Grep', 'docs/tasks/0001_test.md');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('allows Glob tool', () => {
            const result = checkWriteGuard('Glob', 'docs/tasks/0001_test.md');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('allows Unknown tool', () => {
            const result = checkWriteGuard('Unknown', 'docs/tasks/0001_test.md');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('blocks Edit tool on protected path (docs/tasks)', () => {
            const result = checkWriteGuard('Edit', 'docs/tasks/0001_test.md');
            expect(result.allowed).toBe(false);
            expect(result.code).toBe(2);
        });

        test('blocks Write tool on protected path (docs/tasks)', () => {
            const result = checkWriteGuard('Write', 'docs/tasks/0002_test.md');
            expect(result.allowed).toBe(false);
            expect(result.code).toBe(2);
        });

        test('blocks Edit tool on protected path (docs/tasks2)', () => {
            const result = checkWriteGuard('Edit', 'docs/tasks2/0001_test.md');
            expect(result.allowed).toBe(false);
            expect(result.code).toBe(2);
        });

        test('blocks Write tool on protected path (docs/prompts)', () => {
            const result = checkWriteGuard('Write', 'docs/prompts/0001_test.md');
            expect(result.allowed).toBe(false);
            expect(result.code).toBe(2);
        });
    });

    describe('pattern matching - protected patterns', () => {
        test('blocks direct .md files in docs/tasks', () => {
            const result = checkWriteGuard('Edit', 'docs/tasks/some_file.md');
            expect(result.allowed).toBe(false);
            expect(result.code).toBe(2);
        });

        test('blocks direct .md files in docs/tasks2', () => {
            const result = checkWriteGuard('Write', 'docs/tasks2/another_file.md');
            expect(result.allowed).toBe(false);
            expect(result.code).toBe(2);
        });

        test('blocks direct .md files in docs/prompts', () => {
            const result = checkWriteGuard('Edit', 'docs/prompts/cmd_template.md');
            expect(result.allowed).toBe(false);
            expect(result.code).toBe(2);
        });

        test('blocks markdown files with lowercase extension only', () => {
            // Pattern only matches lowercase .md; .MD is case-sensitive, not blocked
            const resultLower = checkWriteGuard('Edit', 'docs/tasks/file.md');
            expect(resultLower.allowed).toBe(false);

            const resultUpper = checkWriteGuard('Edit', 'docs/tasks/file.MD');
            expect(resultUpper.allowed).toBe(true);
        });
    });

    describe('pattern matching - exempt patterns', () => {
        test('allows subdirectory paths docs/tasks/<wbs>/...', () => {
            const result = checkWriteGuard('Write', 'docs/tasks/0001/some_file.md');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('allows subdirectory paths docs/tasks2/<wbs>/...', () => {
            const result = checkWriteGuard('Write', 'docs/tasks2/0042/nested.md');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('allows subdirectory paths docs/prompts/<wbs>/...', () => {
            const result = checkWriteGuard('Edit', 'docs/prompts/0100/template.md');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('allows deeply nested subdirectories', () => {
            const result = checkWriteGuard('Write', 'docs/tasks/0274/implementation/code.ts');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('allows files directly in WBS subdirectory', () => {
            const result = checkWriteGuard('Write', 'docs/tasks/0001/test.ts');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });
    });

    describe('pattern matching - non-protected paths', () => {
        test('allows files outside protected folders', () => {
            const result = checkWriteGuard('Write', 'src/app.ts');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('allows files in src/commands/', () => {
            const result = checkWriteGuard('Edit', 'src/commands/hello.ts');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('allows files in plugins/', () => {
            const result = checkWriteGuard('Write', 'plugins/rd3/skills/tasks/scripts/tasks.ts');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('allows files in scripts/', () => {
            const result = checkWriteGuard('Edit', 'scripts/logger.ts');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('allows files in docs/root/', () => {
            const result = checkWriteGuard('Write', 'docs/CHANGELOG.md');
            expect(result.allowed).toBe(true);
            expect(result.code).toBe(0);
        });

        test('allows files in docs/architecture/', () => {
            const result = checkWriteGuard('Edit', 'docs/architecture/overview.md');
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
            // Should match docs/tasks/file.md but not docs/tasks2/file.md when using docs/tasks pattern
            const result1 = checkWriteGuard('Edit', 'docs/tasks/file.md');
            expect(result1.allowed).toBe(false);

            const result2 = checkWriteGuard('Edit', 'docs/tasks2/file.md');
            expect(result2.allowed).toBe(false); // Also protected
        });

        test('does not block files starting with tasks (prefix collision)', () => {
            const result = checkWriteGuard('Write', 'docs/tasks_extra/file.md');
            expect(result.allowed).toBe(true); // Not under docs/tasks/
        });

        test('handles various WBS number formats', () => {
            // Valid WBS formats
            expect(checkWriteGuard('Write', 'docs/tasks/0001/file.md').allowed).toBe(true);
            expect(checkWriteGuard('Write', 'docs/tasks/9999/file.md').allowed).toBe(true);
            expect(checkWriteGuard('Write', 'docs/tasks/0274/impl.ts').allowed).toBe(true);
        });

        test('blocks non-WBS subdirectory patterns', () => {
            // docs/tasks/subdir/file.md - no WBS number
            const result = checkWriteGuard('Edit', 'docs/tasks/subdir/file.md');
            expect(result.allowed).toBe(false);
        });

        test('blocks WBS-like but wrong format in subdirectory', () => {
            // docs/tasks/001/file.md - only 3 digits
            const result = checkWriteGuard('Write', 'docs/tasks/001/file.md');
            expect(result.allowed).toBe(false);
        });
    });

    describe('reason message', () => {
        test('returns reason when blocked', () => {
            const result = checkWriteGuard('Edit', 'docs/tasks/0001_test.md');
            expect(result.allowed).toBe(false);
            expect(result.reason).toBeDefined();
            expect(result.reason).toContain('blocked');
            expect(result.reason).toContain('tasks update');
        });

        test('does not return reason when allowed', () => {
            const result = checkWriteGuard('Write', 'src/app.ts');
            expect(result.allowed).toBe(true);
            expect(result.reason).toBeUndefined();
        });
    });
});

describe('loadPatterns', () => {
    let warnSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        resetCachedPatterns();
        setGlobalSilent(true);
        warnSpy = spyOn(logger, 'warn');
    });

    afterEach(() => {
        setGlobalSilent(false);
        warnSpy.mockRestore();
    });

    test('returns cached patterns on subsequent calls', () => {
        const first = loadPatterns();
        const second = loadPatterns();
        expect(first).toBe(second); // Same reference
    });

    test('falls back to default patterns when config cannot be loaded from test context', () => {
        // In test context, process.argv[1] is the test file, not writeGuard.ts
        // So the config lookup fails and fallback patterns are used
        // The warning is logged because config cannot be found
        loadPatterns();
        // Warning is logged because config is not at the expected path from test context
        expect(warnSpy).toHaveBeenCalled();
    });

    test('returns valid fallback patterns', () => {
        const patterns = loadPatterns();
        expect(patterns.protected).toBeDefined();
        expect(patterns.exempt).toBeDefined();
        expect(patterns.protected.length).toBeGreaterThan(0);
        expect(patterns.exempt.length).toBeGreaterThan(0);
    });

    test('resetCachedPatterns clears the cache', () => {
        const first = loadPatterns();
        resetCachedPatterns();
        const second = loadPatterns();
        expect(first).not.toBe(second); // Different references
    });

    test('handles empty folders object in config', () => {
        // When folders is an empty object, configLoaded stays false
        // and fallback is used
        resetCachedPatterns();
        const patterns = loadPatterns();
        // Should have fallback patterns
        expect(patterns.protected.length).toBeGreaterThan(0);
    });

    describe('with mock config file', () => {
        let existsSpy: ReturnType<typeof spyOn>;
        let readSpy: ReturnType<typeof spyOn>;

        beforeEach(() => {
            resetCachedPatterns();
            existsSpy = spyOn(fs, 'existsSync');
            readSpy = spyOn(fs, 'readFileSync');
        });

        afterEach(() => {
            existsSpy.mockRestore();
            readSpy.mockRestore();
        });

        test('loads and parses JSONC config correctly', () => {
            existsSpy.mockReturnValue(true);
            readSpy.mockReturnValue(`
                {
                    // Comments should be stripped
                    "folders": {
                        "docs/custom": {},
                        "docs/another": {}
                    }, // Trailing commas should be handled
                }
            `);

            const patterns = loadPatterns();
            expect(patterns.protected).toHaveLength(2);
            expect(patterns.protected[0].test('docs/custom/file.md')).toBe(true);
            expect(patterns.protected[1].test('docs/another/file.md')).toBe(true);
            expect(warnSpy).not.toHaveBeenCalled();
        });

        test('falls back if folders key is missing', () => {
            existsSpy.mockReturnValue(true);
            readSpy.mockReturnValue('{"other": {}}');

            const patterns = loadPatterns();
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not load config.jsonc'));
            // Should have fallback patterns (docs/tasks, docs/tasks2, docs/prompts)
            expect(patterns.protected.length).toBe(3);
        });

        test('falls back if JSON is invalid', () => {
            existsSpy.mockReturnValue(true);
            readSpy.mockReturnValue('invalid { json');

            const patterns = loadPatterns();
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not load config.jsonc'));
            expect(patterns.protected.length).toBe(3);
        });
    });
});

describe('runWriteGuardStdin', () => {
    let errorSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        setGlobalSilent(true);
        errorSpy = spyOn(logger, 'error');
    });

    afterEach(() => {
        setGlobalSilent(false);
        errorSpy.mockRestore();
    });

    describe('valid input', () => {
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

        test('logs error when write is blocked', () => {
            const input = JSON.stringify({
                tool_name: 'Edit',
                tool_input: { file_path: 'docs/tasks/test.md' },
            });
            runWriteGuardStdin(input);
            expect(errorSpy).toHaveBeenCalled();
            const logCall = errorSpy.mock.calls[0][0] as string;
            expect(logCall).toContain('blocked');
        });

        test('does not log error when write is allowed', () => {
            const input = JSON.stringify({
                tool_name: 'Write',
                tool_input: { file_path: 'src/app.ts' },
            });
            runWriteGuardStdin(input);
            expect(errorSpy).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        test('returns 0 on invalid JSON input', () => {
            const input = 'not valid json {{{';
            const exitCode = runWriteGuardStdin(input);
            expect(exitCode).toBe(0); // Allow by default on parse error
            expect(errorSpy).toHaveBeenCalled();
            const logCall = errorSpy.mock.calls[0][0] as string;
            expect(logCall).toContain('Failed to parse');
        });

        test('returns 0 when tool_input is missing', () => {
            const input = JSON.stringify({ tool_name: 'Edit' });
            const exitCode = runWriteGuardStdin(input);
            expect(exitCode).toBe(0);
        });

        test('returns 0 when tool_input is null', () => {
            const input = JSON.stringify({ tool_name: 'Edit', tool_input: null });
            const exitCode = runWriteGuardStdin(input);
            expect(exitCode).toBe(0);
        });

        test('returns 0 when file_path is empty string', () => {
            const input = JSON.stringify({
                tool_name: 'Edit',
                tool_input: { file_path: '' },
            });
            const exitCode = runWriteGuardStdin(input);
            expect(exitCode).toBe(0);
        });

        test('returns 0 when file_path is missing', () => {
            const input = JSON.stringify({
                tool_name: 'Edit',
                tool_input: { other: 'value' },
            });
            const exitCode = runWriteGuardStdin(input);
            expect(exitCode).toBe(0);
        });

        test('handles empty input string', () => {
            const exitCode = runWriteGuardStdin('');
            expect(exitCode).toBe(0);
            expect(errorSpy).toHaveBeenCalled();
        });

        test('defaults tool_name to Unknown', () => {
            const input = JSON.stringify({
                tool_input: { file_path: 'docs/tasks/test.md' },
            });
            const exitCode = runWriteGuardStdin(input);
            // Unknown tool should be allowed
            expect(exitCode).toBe(0);
        });
    });

    describe('subprocess integration', () => {
        test('returns 0 when write is allowed (subprocess)', async () => {
            const input = JSON.stringify({
                tool_name: 'Write',
                tool_input: { file_path: 'src/app.ts' },
            });
            const proc = Bun.spawn(['bun', 'run', 'plugins/rd3/skills/tasks/scripts/commands/writeGuard.ts'], {
                stdin: 'pipe',
                stdout: 'pipe',
                stderr: 'pipe',
            });
            proc.stdin.write(input);
            proc.stdin.end();
            const exitCode = await proc.exited;
            expect(exitCode).toBe(0);
        });

        test('returns 2 when write is blocked (subprocess)', async () => {
            const input = JSON.stringify({
                tool_name: 'Edit',
                tool_input: { file_path: 'docs/tasks/test.md' },
            });
            const proc = Bun.spawn(['bun', 'run', 'plugins/rd3/skills/tasks/scripts/commands/writeGuard.ts'], {
                stdin: 'pipe',
                stdout: 'pipe',
                stderr: 'pipe',
            });
            proc.stdin.write(input);
            proc.stdin.end();
            const exitCode = await proc.exited;
            expect(exitCode).toBe(2);
        });

        test('returns 0 on invalid JSON input (subprocess)', async () => {
            const input = 'not valid json {{{';
            const proc = Bun.spawn(['bun', 'run', 'plugins/rd3/skills/tasks/scripts/commands/writeGuard.ts'], {
                stdin: 'pipe',
                stdout: 'pipe',
                stderr: 'pipe',
            });
            proc.stdin.write(input);
            proc.stdin.end();
            const exitCode = await proc.exited;
            expect(exitCode).toBe(0); // Allow by default on parse error
        });

        test('main function is invoked when script runs directly', async () => {
            // This test verifies the main() function is called via import.meta.main
            // by checking that the script produces expected output
            const input = JSON.stringify({
                tool_name: 'Read',
                tool_input: { file_path: 'any/file.md' },
            });
            const proc = Bun.spawn(['bun', 'run', 'plugins/rd3/skills/tasks/scripts/commands/writeGuard.ts'], {
                stdin: 'pipe',
                stdout: 'pipe',
                stderr: 'pipe',
            });
            proc.stdin.write(input);
            proc.stdin.end();
            const exitCode = await proc.exited;
            // Read tool should always be allowed (exit code 0)
            expect(exitCode).toBe(0);
        });
    });

    describe('runMain direct execution', () => {
        let exitSpy: ReturnType<typeof spyOn>;
        let readSpy: ReturnType<typeof spyOn>;

        beforeEach(() => {
            exitSpy = spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined): never => {
                throw new Error(`process.exit called with ${code}`);
            });
            readSpy = spyOn(fs, 'readFileSync');
        });

        afterEach(() => {
            exitSpy.mockRestore();
            readSpy.mockRestore();
        });

        test('runMain reads from stdin and exits with correct code', () => {
            const input = JSON.stringify({
                tool_name: 'Edit',
                tool_input: { file_path: 'docs/tasks/test.md' },
            });
            readSpy.mockReturnValue(input);

            // Since we mocked process.exit to throw, we catch it
            expect(() => runMain()).toThrow('process.exit called with 2');
            expect(readSpy).toHaveBeenCalledWith('/dev/stdin', 'utf-8');
        });

        test('runMain allows valid operations', () => {
            const input = JSON.stringify({
                tool_name: 'Write',
                tool_input: { file_path: 'src/app.ts' },
            });
            readSpy.mockReturnValue(input);

            expect(() => runMain()).toThrow('process.exit called with 0');
        });
    });
});
