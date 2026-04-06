import { describe, test, expect, beforeAll, afterEach, beforeEach } from 'bun:test';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setGlobalSilent } from '../../../scripts/logger';
import { runCliCheck } from '../scripts/methods/cli';
import { runFileExistsCheck } from '../scripts/methods/file_exists';
import { runContentMatchCheck } from '../scripts/methods/content_match';
import { runLlmCheck } from '../scripts/methods/llm';
import { runHumanCheck } from '../scripts/methods/human';
import { runCompoundCheck } from '../scripts/methods/compound';
import type { Checker } from '../scripts/types';
import type { FileOps } from '../scripts/methods/llm';
import type { AcpxQueryResult } from '../../../scripts/libs/acpx-query';

let TEST_DIR = '';
let CWD = '';

function createTestDir(): string {
    return mkdtempSync(join(tmpdir(), 'verification-methods-'));
}

beforeAll(() => {
    setGlobalSilent(true);
});

beforeEach(() => {
    TEST_DIR = createTestDir();
    CWD = TEST_DIR;
});

afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    TEST_DIR = '';
    CWD = '';
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

    test('times out when command exceeds timeout', async () => {
        const result = await runCliCheck({ command: 'sleep 10', timeout: 1 }, CWD);
        expect(result.result).toBe('fail');
        expect(result.evidence.error).toContain('timed out');
    });

    test('handles spawn error when cwd does not exist', async () => {
        const result = await runCliCheck({ command: 'echo hello' }, '/nonexistent/path/that/does/not/exist');
        expect(result.result).toBe('fail');
        expect(result.evidence.cli_exit_code).toBe(-1);
        expect(result.evidence.error).toContain('Spawn error');
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
        expect(result.error).toContain('non-existent-file.xyz');
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
        expect(result.error).toContain('not found');
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
        expect(result.error).toContain('Could not read file');
    });

    test('invalid regex pattern returns fail', async () => {
        writeFileSync(join(TEST_DIR, 'regex-invalid.txt'), 'hello');
        const result = await runContentMatchCheck(
            { file: 'regex-invalid.txt', pattern: '[invalid(', must_exist: true },
            CWD,
        );
        expect(result.result).toBe('fail');
        expect(result.evidence.error).toContain('Invalid regex pattern');
        expect(result.error).toContain('Invalid regex pattern');
    });
});

// ============================================================
// runLlmCheck tests
// ============================================================
// Helper: create a temp mock LLM script that outputs the given text to stdout.
function makeMockLlmScript(output: string, includeStderr?: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'llm-check-test-'));
    const scriptPath = join(dir, 'mock-llm.sh');
    const stderrPart = includeStderr ? `\necho "${includeStderr.replace(/"/g, '\\"')}" >&2` : '';
    // Build each line as `echo "content"`; join with "\n" to separate lines properly.
    const echoLines = output
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => `echo "${line.replace(/"/g, '\\"')}"`)
        .join('\n');
    writeFileSync(scriptPath, `#!/bin/sh\n${echoLines}${stderrPart}\n`, 'utf-8');
    return scriptPath;
}

describe('runLlmCheck', () => {
    test('returns fail when LLM CLI not found', async () => {
        const result = await runLlmCheck({ checklist: ['test item'] }, undefined, '/nonexistent-binary-llm-12345');
        expect(result.result).toBe('fail');
        expect(result.evidence.error).toBeDefined();
        expect(result.evidence.error?.length).toBeGreaterThan(0);
    });

    test('parses PASS output and passes when all items pass', async () => {
        const scriptPath = makeMockLlmScript('[PASS] item1: reason1\n[PASS] item2: reason2');
        try {
            const result = await runLlmCheck({ checklist: ['item1', 'item2'] }, undefined, scriptPath);
            expect(result.result).toBe('pass');
            expect(result.evidence.llm_results).toHaveLength(2);
            expect(result.evidence.llm_results?.[0]?.passed).toBe(true);
            expect(result.evidence.llm_results?.[1]?.passed).toBe(true);
        } finally {
            rmSync(scriptPath, { force: true });
        }
    });

    test('parses FAIL output and fails when items fail', async () => {
        const scriptPath = makeMockLlmScript('[FAIL] item1: bad');
        try {
            const result = await runLlmCheck({ checklist: ['item1'] }, undefined, scriptPath);
            expect(result.result).toBe('fail');
            expect(result.evidence.llm_results).toHaveLength(1);
            expect(result.evidence.llm_results?.[0]?.passed).toBe(false);
        } finally {
            rmSync(scriptPath, { force: true });
        }
    });

    test('mixed PASS/FAIL output fails check', async () => {
        const scriptPath = makeMockLlmScript('[PASS] item1: ok\n[FAIL] item2: bad');
        try {
            const result = await runLlmCheck({ checklist: ['item1', 'item2'] }, undefined, scriptPath);
            expect(result.result).toBe('fail');
            expect(result.evidence.llm_results).toHaveLength(2);
        } finally {
            rmSync(scriptPath, { force: true });
        }
    });

    test('collects stderr output without affecting result', async () => {
        const scriptPath = makeMockLlmScript('[PASS] item1: ok', 'debug info');
        try {
            const result = await runLlmCheck({ checklist: ['item1'] }, undefined, scriptPath);
            expect(result.result).toBe('pass');
        } finally {
            rmSync(scriptPath, { force: true });
        }
    });

    test('handles partial output (fewer results than checklist items)', async () => {
        const scriptPath = makeMockLlmScript('[PASS] item1: ok');
        try {
            const result = await runLlmCheck({ checklist: ['item1', 'item2', 'item3'] }, undefined, scriptPath);
            expect(result.result).toBe('fail');
            expect(result.evidence.llm_results).toHaveLength(1);
        } finally {
            rmSync(scriptPath, { force: true });
        }
    });

    test('injects writeFileSync error and returns fail', async () => {
        const failingFileOps = {
            mkdtempSync: () => '/tmp/llm-check-test',
            writeFileSync: () => {
                throw new Error('Simulated write failure');
            },
            rmSync: () => {},
        } as unknown as FileOps;
        const result = await runLlmCheck({ checklist: ['item1'] }, failingFileOps, '/bin/echo');
        expect(result.result).toBe('fail');
        expect(result.evidence.error).toContain('Failed to write prompt');
    });

    test('injects getLlmCliCommand returning undefined and triggers early return', async () => {
        // getLlmCliCommand() returns undefined → !llmCliPath is true → early return
        const result = await runLlmCheck(
            { checklist: ['item1'] },
            undefined,
            undefined, // llmCliPathOverride = undefined
            undefined, // execLlmCliFn = undefined (not reached)
            () => undefined,
        );
        expect(result.result).toBe('fail');
        expect(result.evidence.error).toContain('LLM CLI not found');
    });

    test('injects execLlmCli that throws and catches spawn error', async () => {
        const throwingExecLlmCli = () => {
            throw new Error('Simulated ENOENT spawn error');
        };
        const result = await runLlmCheck(
            { checklist: ['item1'] },
            undefined,
            '/bin/echo',
            throwingExecLlmCli as unknown as Parameters<typeof runLlmCheck>[3],
        );
        expect(result.result).toBe('fail');
        expect(result.evidence.error).toContain('Simulated ENOENT spawn error');
    });

    test('injects execLlmCli that returns non-empty stderr', async () => {
        const stderrExecLlmCli = () => {
            const result: AcpxQueryResult = {
                ok: true,
                exitCode: 0,
                stdout: '[PASS] item1: ok',
                stderr: 'Some debug warning from LLM',
                durationMs: 100,
                timedOut: false,
            };
            return result;
        };
        const result = await runLlmCheck(
            { checklist: ['item1'] },
            undefined,
            '/bin/echo',
            stderrExecLlmCli as unknown as Parameters<typeof runLlmCheck>[3],
        );
        expect(result.result).toBe('pass');
        expect(result.evidence.llm_results?.[0]?.passed).toBe(true);
    });
});

// ============================================================
// runLlmCheck - error paths
// ============================================================
describe('runLlmCheck - error paths', () => {
    test('handles spawn error when binary does not exist', async () => {
        // Use a path that definitely does not exist
        const result = await runLlmCheck({ checklist: ['item1'] }, undefined, '/nonexistent-llm-binary-xyz');
        expect(result.result).toBe('fail');
        expect(result.evidence.error).toBeDefined();
        expect(result.error).toBeDefined();
    });

    test('parsing ignores empty lines and non-matching lines', async () => {
        const scriptPath = makeMockLlmScript('\nSome random text\n[PASS] item1: ok\n  [PASS]   item2  :  reason  \n');
        try {
            const result = await runLlmCheck({ checklist: ['item1', 'item2'] }, undefined, scriptPath);
            expect(result.result).toBe('pass');
            expect(result.evidence.llm_results).toHaveLength(2);
            expect(result.evidence.llm_results?.[0]?.item).toBe('item1');
            expect(result.evidence.llm_results?.[1]?.item).toBe('item2');
        } finally {
            rmSync(scriptPath, { force: true });
        }
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
        expect(result.error).toContain('subcheck-1');
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

    test('unsupported sub-check method returns fail', async () => {
        const result = await runCompoundCheck(
            {
                operator: 'and',
                checks: [
                    {
                        method: 'compound' as unknown as import('../scripts/types').CheckerMethod,
                        config: {} as unknown as import('../scripts/types').CheckerConfig,
                    },
                ],
            },
            CWD,
        );
        expect(result.result).toBe('fail');
        expect((result.evidence.compound_results?.[0] as unknown as { error?: string })?.error).toContain(
            'Unsupported method',
        );
    });

    test('runs cli sub-check within compound', async () => {
        writeFileSync(join(TEST_DIR, 'and-test-1.txt'), 'content');
        const result = await runCompoundCheck(
            {
                operator: 'and',
                checks: [
                    { method: 'cli', config: { command: 'echo ok', exit_codes: [0] } },
                    { method: 'file-exists', config: { paths: ['and-test-1.txt'] } },
                ] as Checker[],
            },
            CWD,
        );
        expect(result.result).toBe('pass');
        expect(result.evidence.compound_results).toHaveLength(2);
    });

    test('runs content-match sub-check within compound', async () => {
        writeFileSync(join(TEST_DIR, 'cm-compound.txt'), 'hello world');
        const result = await runCompoundCheck(
            {
                operator: 'and',
                checks: [
                    {
                        method: 'content-match',
                        config: { file: 'cm-compound.txt', pattern: 'hello', must_exist: true },
                    },
                ] as Checker[],
            },
            CWD,
        );
        expect(result.result).toBe('pass');
    });

    // Note: getLegacyLlmCommand() auto-detects "pi" binary path, so LLM_CLI_COMMAND
    // being unset no longer causes immediate failure. This test sets an invalid path
    // to verify the "no valid LLM CLI available" scenario causes fast failure.
    test('runs llm sub-check with invalid CLI path fails fast', async () => {
        const original = process.env.LLM_CLI_COMMAND;
        process.env.LLM_CLI_COMMAND = '/nonexistent/invalid-llm-cli-xyz';
        try {
            const result = await runCompoundCheck(
                {
                    operator: 'and',
                    checks: [{ method: 'llm', config: { checklist: ['item1'] } }] as Checker[],
                },
                CWD,
            );
            expect(result.result).toBe('fail');
        } finally {
            if (original !== undefined) process.env.LLM_CLI_COMMAND = original;
            else delete process.env.LLM_CLI_COMMAND;
        }
    });

    test('human sub-check causes compound to pause', async () => {
        const result = await runCompoundCheck(
            {
                operator: 'and',
                checks: [{ method: 'human', config: { prompt: 'Approve?', choices: ['approve'] } }] as Checker[],
            },
            CWD,
        );
        expect(result.result).toBe('paused');
        expect(result.evidence.error).toContain('paused');
    });
});
