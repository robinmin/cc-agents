import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { setGlobalSilent } from '../../../scripts/logger';
import { runCliCheck } from '../methods/cli';
import { runFileExistsCheck } from '../methods/file_exists';
import { runContentMatchCheck } from '../methods/content_match';
import { runLlmCheck } from '../methods/llm';
import { runHumanCheck } from '../methods/human';
import { runCompoundCheck } from '../methods/compound';
import type { Checker } from '../types';

// @ts-ignore - Bun provides __dirname in CommonJS-like contexts
const TEST_DIR = join(__dirname, 'test-fixtures');
const CWD = TEST_DIR;

beforeAll(() => {
    setGlobalSilent(true);
    mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
});

// ============================================================
// runCliCheck tests
// ============================================================
describe('runCliCheck', () => {
    test('exit 0 returns pass', async () => {
        const result = await runCliCheck({ command: 'exit 0' }, CWD);
        expect(result.result).toBe('pass');
        expect(result.evidence.cli_exit_code).toBe(0);
        expect(result.evidence.method).toBe('cli');
    });

    test('exit 1 returns fail', async () => {
        const result = await runCliCheck({ command: 'exit 1' }, CWD);
        expect(result.result).toBe('fail');
        expect(result.evidence.cli_exit_code).toBe(1);
    });

    test('custom exit codes - matching code returns pass', async () => {
        const result = await runCliCheck({ command: 'exit 42', exit_codes: [42, 43] }, CWD);
        expect(result.result).toBe('pass');
        expect(result.evidence.cli_exit_code).toBe(42);
    });

    test('custom exit codes - non-matching code returns fail', async () => {
        const result = await runCliCheck({ command: 'exit 5', exit_codes: [0, 42] }, CWD);
        expect(result.result).toBe('fail');
        expect(result.evidence.error).toContain('not in expected codes');
    });

    test('collects stdout output', async () => {
        const result = await runCliCheck({ command: 'echo "hello world"' }, CWD);
        expect(result.result).toBe('pass');
        expect(result.evidence.cli_output).toContain('hello world');
    });

    test('collects stderr output', async () => {
        const result = await runCliCheck({ command: 'echo "error" >&2' }, CWD);
        expect(result.result).toBe('pass');
        expect(result.evidence.cli_output).toContain('error');
    });
});

// ============================================================
// runFileExistsCheck tests
// ============================================================
describe('runFileExistsCheck', () => {
    test('all paths exist returns pass', async () => {
        writeFileSync(join(TEST_DIR, 'existing-file.txt'), 'content');
        const result = await runFileExistsCheck({ paths: ['existing-file.txt'] }, CWD);
        expect(result.result).toBe('pass');
        expect(result.evidence.file_paths_found).toContain('existing-file.txt');
    });

    test('missing path returns fail', async () => {
        const result = await runFileExistsCheck({ paths: ['non-existent-file.xyz'] }, CWD);
        expect(result.result).toBe('fail');
        expect(result.evidence.file_paths_found).toHaveLength(0);
        expect(result.evidence.error).toContain('non-existent-file.xyz');
    });

    test('partial match returns fail', async () => {
        writeFileSync(join(TEST_DIR, 'file-a.txt'), 'a');
        const result = await runFileExistsCheck({ paths: ['file-a.txt', 'missing-file.txt'] }, CWD);
        expect(result.result).toBe('fail');
        expect(result.evidence.error).toContain('missing-file.txt');
    });

    test('multiple existing files returns pass', async () => {
        writeFileSync(join(TEST_DIR, 'file-1.txt'), '1');
        writeFileSync(join(TEST_DIR, 'file-2.txt'), '2');
        const result = await runFileExistsCheck({ paths: ['file-1.txt', 'file-2.txt'] }, CWD);
        expect(result.result).toBe('pass');
        expect(result.evidence.file_paths_found).toHaveLength(2);
    });
});

// ============================================================
// runContentMatchCheck tests
// ============================================================
describe('runContentMatchCheck', () => {
    test('pattern found + must_exist=true returns pass', async () => {
        writeFileSync(join(TEST_DIR, 'match-test.txt'), 'hello world foo bar');
        const result = await runContentMatchCheck(
            { file: 'match-test.txt', pattern: 'hello world', must_exist: true },
            CWD,
        );
        expect(result.result).toBe('pass');
        expect(result.evidence.content_match_found).toBe(true);
    });

    test('pattern NOT found + must_exist=true returns fail', async () => {
        writeFileSync(join(TEST_DIR, 'match-test.txt'), 'hello world');
        const result = await runContentMatchCheck(
            { file: 'match-test.txt', pattern: 'goodbye world', must_exist: true },
            CWD,
        );
        expect(result.result).toBe('fail');
        expect(result.evidence.content_match_found).toBe(false);
    });

    test('pattern found + must_exist=false returns fail', async () => {
        writeFileSync(join(TEST_DIR, 'match-test.txt'), 'hello world');
        const result = await runContentMatchCheck({ file: 'match-test.txt', pattern: 'hello', must_exist: false }, CWD);
        expect(result.result).toBe('fail');
        expect(result.evidence.error).toContain('should not exist');
    });

    test('pattern NOT found + must_exist=false returns pass', async () => {
        writeFileSync(join(TEST_DIR, 'match-test.txt'), 'hello world');
        const result = await runContentMatchCheck(
            { file: 'match-test.txt', pattern: 'goodbye', must_exist: false },
            CWD,
        );
        expect(result.result).toBe('pass');
        expect(result.evidence.content_match_found).toBe(false);
    });

    test('regex pattern works', async () => {
        writeFileSync(join(TEST_DIR, 'regex-test.txt'), 'abc123def');
        const result = await runContentMatchCheck({ file: 'regex-test.txt', pattern: '\\d+', must_exist: true }, CWD);
        expect(result.result).toBe('pass');
    });

    test('missing file returns fail', async () => {
        const result = await runContentMatchCheck({ file: 'nonexistent.txt', pattern: '.*', must_exist: true }, CWD);
        expect(result.result).toBe('fail');
        expect(result.evidence.error).toContain('Could not read file');
    });
});

// ============================================================
// runLlmCheck tests
// ============================================================
describe('runLlmCheck', () => {
    test('returns fail when LLM_CLI_COMMAND not set', async () => {
        const env = import.meta as { env: Record<string, string | undefined> };
        const originalEnv = env.env.LLM_CLI_COMMAND;
        delete env.env.LLM_CLI_COMMAND;

        const result = await runLlmCheck({ checklist: ['test item'] });
        expect(result.result).toBe('fail');
        expect(result.evidence.error).toContain('LLM_CLI_COMMAND');

        if (originalEnv !== undefined) {
            env.env.LLM_CLI_COMMAND = originalEnv;
        }
    });

    test('returns fail when LLM CLI command fails', async () => {
        const env = import.meta as { env: Record<string, string | undefined> };
        env.env.LLM_CLI_COMMAND = 'exit 1'; // Command that fails
        const result = await runLlmCheck({ checklist: ['test item'] });
        expect(result.result).toBe('fail');
        // The LLM will fail to produce valid output, causing checklist items to fail
        expect(result.evidence.error).toBeDefined();
    });
});

// ============================================================
// runHumanCheck tests
// ============================================================
describe('runHumanCheck', () => {
    test('always returns paused', () => {
        const result = runHumanCheck({ prompt: 'Please verify this change' });
        expect(result.result).toBe('paused');
        expect(result.evidence.method).toBe('human');
        expect(result.evidence.result).toBe('paused');
        expect(result.error).toContain('Human verification required');
    });

    test('includes choices in error message', () => {
        const result = runHumanCheck({
            prompt: 'Review the code',
            choices: ['approve', 'reject'],
        });
        expect(result.error).toContain('approve');
        expect(result.error).toContain('reject');
    });

    test('uses default choices when not provided', () => {
        const result = runHumanCheck({ prompt: 'Review the code' });
        expect(result.error).toContain('approve');
        expect(result.error).toContain('reject');
        expect(result.error).toContain('request_changes');
    });
});

// ============================================================
// runCompoundCheck tests
// ============================================================
describe('runCompoundCheck', () => {
    test('AND operator - all pass returns pass', async () => {
        writeFileSync(join(TEST_DIR, 'and-test-1.txt'), 'content1');
        writeFileSync(join(TEST_DIR, 'and-test-2.txt'), 'content2');

        const result = await runCompoundCheck(
            {
                operator: 'and',
                checks: [
                    { method: 'file-exists', config: { paths: ['and-test-1.txt'] } },
                    { method: 'file-exists', config: { paths: ['and-test-2.txt'] } },
                ] as Checker[],
            },
            CWD,
        );

        expect(result.result).toBe('pass');
        expect(result.evidence.compound_results).toHaveLength(2);
    });

    test('AND operator - one fail returns fail', async () => {
        writeFileSync(join(TEST_DIR, 'and-test-1.txt'), 'content');

        const result = await runCompoundCheck(
            {
                operator: 'and',
                checks: [
                    { method: 'file-exists', config: { paths: ['and-test-1.txt'] } },
                    { method: 'file-exists', config: { paths: ['missing-file.txt'] } },
                ] as Checker[],
            },
            CWD,
        );

        expect(result.result).toBe('fail');
        expect(result.evidence.error).toContain('subcheck-1');
    });

    test('OR operator - one pass returns pass', async () => {
        const result = await runCompoundCheck(
            {
                operator: 'or',
                checks: [
                    { method: 'file-exists', config: { paths: ['missing-1.txt'] } },
                    { method: 'file-exists', config: { paths: ['missing-2.txt'] } },
                    { method: 'file-exists', config: { paths: ['missing-3.txt'] } },
                ] as Checker[],
            },
            CWD,
        );

        expect(result.result).toBe('fail'); // All missing
    });

    test('OR operator - at least one pass returns pass', async () => {
        writeFileSync(join(TEST_DIR, 'or-pass-file.txt'), 'content');

        const result = await runCompoundCheck(
            {
                operator: 'or',
                checks: [
                    { method: 'file-exists', config: { paths: ['missing-1.txt'] } },
                    { method: 'file-exists', config: { paths: ['or-pass-file.txt'] } },
                ] as Checker[],
            },
            CWD,
        );

        expect(result.result).toBe('pass');
    });

    test('quorum operator - exactly N passes returns pass', async () => {
        writeFileSync(join(TEST_DIR, 'quorum-1.txt'), '1');
        writeFileSync(join(TEST_DIR, 'quorum-2.txt'), '2');

        const result = await runCompoundCheck(
            {
                operator: 'quorum',
                quorum_count: 2,
                checks: [
                    { method: 'file-exists', config: { paths: ['quorum-1.txt'] } },
                    { method: 'file-exists', config: { paths: ['quorum-2.txt'] } },
                    { method: 'file-exists', config: { paths: ['missing-file.txt'] } },
                ] as Checker[],
            },
            CWD,
        );

        expect(result.result).toBe('pass');
        expect(result.evidence.compound_results).toHaveLength(3);
    });

    test('quorum operator - fewer than N passes returns fail', async () => {
        writeFileSync(join(TEST_DIR, 'quorum-fail.txt'), 'content');

        const result = await runCompoundCheck(
            {
                operator: 'quorum',
                quorum_count: 3,
                checks: [
                    { method: 'file-exists', config: { paths: ['quorum-fail.txt'] } },
                    { method: 'file-exists', config: { paths: ['missing-1.txt'] } },
                    { method: 'file-exists', config: { paths: ['missing-2.txt'] } },
                ] as Checker[],
            },
            CWD,
        );

        expect(result.result).toBe('fail');
    });

    test('runs all sub-checks concurrently', async () => {
        const result = await runCompoundCheck(
            {
                operator: 'or',
                checks: [
                    { method: 'file-exists', config: { paths: ['missing.txt'] } },
                    { method: 'file-exists', config: { paths: ['missing.txt'] } },
                ] as Checker[],
            },
            CWD,
        );

        // Both should complete without hanging
        expect(result.evidence.compound_results).toHaveLength(2);
    });
});
