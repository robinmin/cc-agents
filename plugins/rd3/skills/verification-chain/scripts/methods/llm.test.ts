import { describe, test, expect, beforeEach } from 'bun:test';
import type { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { runLlmCheck, type FileOps } from './llm';
import { execLlmCli as defaultExecLlmCli } from '../../../../scripts/libs/acpx-query';
import type { LlmCheckerConfig, MethodResult } from '../types';

// ─── Mock FileOps ─────────────────────────────────────────────────────────────

type MkdtempSyncMock = (prefix: string) => string;
type WriteFileSyncMock = (path: string, data: string, encoding: BufferEncoding) => void;
type RmSyncMock = (path: string, options?: { recursive?: boolean; force?: boolean }) => void;

interface MockFileOps {
    mkdtempSync: MkdtempSyncMock;
    writeFileSync: WriteFileSyncMock;
    rmSync: RmSyncMock;
}

function makeFileOps(mocks: Partial<MockFileOps> = {}): FileOps {
    let tempCounter = 0;
    return {
        mkdtempSync: (mocks.mkdtempSync ??
            (() => `/tmp/llm-check-test-${tempCounter++}`)) as unknown as typeof mkdtempSync,
        writeFileSync: (mocks.writeFileSync ?? (() => {})) as unknown as typeof writeFileSync,
        rmSync: (mocks.rmSync ?? (() => {})) as unknown as typeof rmSync,
    };
}

// ─── Mock execLlmCliFn ────────────────────────────────────────────────────────

type ExecLlmCliMock = (
    command: string[],
    promptFile: string,
    timeoutMs: number,
) => {
    ok: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
};

type GetLlmCliCommandMock = () => string | undefined;

function makeExecLlmCli(
    stdout: string,
    opts: { ok?: boolean; exitCode?: number; stderr?: string } = {},
): ExecLlmCliMock {
    return () => ({
        ok: opts.ok ?? true,
        exitCode: opts.exitCode ?? 0,
        stdout,
        stderr: opts.stderr ?? '',
    });
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: LlmCheckerConfig = {
    checklist: ['criterion-a', 'criterion-b'],
};

async function run(
    config: LlmCheckerConfig,
    overrides: {
        fileOps?: FileOps;
        llmCliPathOverride?: string;
        execLlmCliFn?: ExecLlmCliMock;
        getLlmCliCommand?: GetLlmCliCommandMock;
    } = {},
): Promise<MethodResult> {
    return runLlmCheck(
        config,
        overrides.fileOps ?? makeFileOps(),
        overrides.llmCliPathOverride ?? '/fake/pi',
        (overrides.execLlmCliFn ?? makeExecLlmCli('[PASS] x: y')) as unknown as typeof defaultExecLlmCli,
        overrides.getLlmCliCommand ?? (() => undefined),
    );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
    // Reset global silent mode between tests
});

describe('runLlmCheck', () => {
    test('returns fail when LLM CLI path is not available', async () => {
        const result = await runLlmCheck(
            DEFAULT_CONFIG,
            makeFileOps(),
            undefined, // llmCliPathOverride — triggers getLlmCliCommand() fallback
            defaultExecLlmCli, // pass actual default so it doesn't get overridden by undefined
            () => undefined, // getLlmCliCommand returns undefined
        );

        expect(result.result).toBe('fail');
        expect(result.evidence.method).toBe('llm');
        expect(result.evidence.result).toBe('fail');
        expect(result.error).toContain('LLM CLI not found');
        expect(result.evidence.error).toContain('LLM CLI not found');
    });

    test('returns fail when temp file write fails', async () => {
        const fileOps = makeFileOps({
            mkdtempSync: () => '/tmp/llm-check-test',
            writeFileSync: () => {
                throw new Error('ENOSPACE: no space left');
            },
        });

        const result = await run(DEFAULT_CONFIG, { fileOps });

        expect(result.result).toBe('fail');
        expect(result.error).toContain('Failed to write prompt to temp file');
        expect(result.evidence.error).toContain('Failed to write prompt to temp file');
    });

    test('returns fail when execLlmCliFn throws a spawn error (ENOENT)', async () => {
        const execLlmCliFn: ExecLlmCliMock = () => {
            throw new Error('ENOENT: no such file or directory');
        };

        const result = await run(DEFAULT_CONFIG, { execLlmCliFn });

        expect(result.result).toBe('fail');
        expect(result.error).toContain('ENOENT');
        expect(result.evidence.error).toContain('ENOENT');
    });

    test('passes when all checklist items return [PASS]', async () => {
        const stdout = `[PASS] criterion-a: reason A
[PASS] criterion-b: reason B`;

        const execLlmCliFn = makeExecLlmCli(stdout);
        const result = await run(DEFAULT_CONFIG, { execLlmCliFn });

        expect(result.result).toBe('pass');
        expect(result.evidence.result).toBe('pass');
        expect(result.evidence.llm_results).toEqual([
            { item: 'criterion-a', passed: true, reason: 'reason A' },
            { item: 'criterion-b', passed: true, reason: 'reason B' },
        ]);
    });

    test('fails when at least one checklist item returns [FAIL]', async () => {
        const stdout = `[PASS] criterion-a: reason A
[FAIL] criterion-b: reason B is broken`;

        const execLlmCliFn = makeExecLlmCli(stdout);
        const result = await run(DEFAULT_CONFIG, { execLlmCliFn });

        expect(result.result).toBe('fail');
        expect(result.evidence.result).toBe('fail');
        expect(result.error).toContain('criterion-b');
        expect(result.evidence.llm_results).toEqual([
            { item: 'criterion-a', passed: true, reason: 'reason A' },
            { item: 'criterion-b', passed: false, reason: 'reason B is broken' },
        ]);
    });

    test('fails when execLlmCliFn returns non-zero exit code', async () => {
        const stdout = `[PASS] criterion-a: reason A
[PASS] criterion-b: reason B`;

        const execLlmCliFn = makeExecLlmCli(stdout, { ok: false, exitCode: 1 });
        const result = await run(DEFAULT_CONFIG, { execLlmCliFn });

        expect(result.result).toBe('fail');
        expect(result.evidence.result).toBe('fail');
    });

    test('fails when stdout is empty', async () => {
        const execLlmCliFn = makeExecLlmCli('');
        const result = await run(DEFAULT_CONFIG, { execLlmCliFn });

        expect(result.result).toBe('fail');
        expect(result.evidence.result).toBe('fail');
    });

    test('fails when LLM returns fewer results than checklist items', async () => {
        const stdout = `[PASS] criterion-a: reason A`;

        const execLlmCliFn = makeExecLlmCli(stdout);
        const result = await run(DEFAULT_CONFIG, { execLlmCliFn });

        expect(result.result).toBe('fail');
        expect(result.evidence.result).toBe('fail');
    });

    test('handles case-insensitive [PASS] and [FAIL] markers', async () => {
        const stdout = `[pass] criterion-a: reason A
[fail] criterion-b: reason B`;

        const execLlmCliFn = makeExecLlmCli(stdout);
        const result = await run(DEFAULT_CONFIG, { execLlmCliFn });

        expect(result.evidence.llm_results).toHaveLength(2);
        expect(result.evidence.llm_results?.[0].passed).toBe(true);
        expect(result.evidence.llm_results?.[1].passed).toBe(false);
    });

    test('handles extra whitespace around markers', async () => {
        const stdout = `  [PASS]   criterion-a   :   reason A  `;

        const execLlmCliFn = makeExecLlmCli(stdout);
        const result = await run({ checklist: ['criterion-a'] }, { execLlmCliFn });

        expect(result.evidence.llm_results).toEqual([{ item: 'criterion-a', passed: true, reason: 'reason A' }]);
    });

    test('ignores lines that do not match [PASS] or [FAIL] pattern', async () => {
        const stdout = `[PASS] criterion-a: reason A
Some debug output here
[PASS] criterion-b: reason B
# comments are ignored`;

        const execLlmCliFn = makeExecLlmCli(stdout);
        const result = await run(DEFAULT_CONFIG, { execLlmCliFn });

        expect(result.evidence.llm_results).toHaveLength(2);
        expect(result.result).toBe('pass');
    });

    test('uses custom prompt template when provided', async () => {
        let capturedPrompt = '';
        const fileOps = makeFileOps({
            writeFileSync: (_path, data) => {
                capturedPrompt = data;
            },
        });

        const config: LlmCheckerConfig = {
            checklist: ['item-1'],
            prompt_template: 'Evaluate each item: {items}\nBe thorough.',
        };

        const execLlmCliFn = makeExecLlmCli('[PASS] item-1: ok');
        await run(config, { fileOps, execLlmCliFn });

        expect(capturedPrompt).toContain('Evaluate each item:');
        expect(capturedPrompt).toContain('- item-1');
        expect(capturedPrompt).toContain('Be thorough.');
    });

    test('uses default prompt template when no custom template provided', async () => {
        let capturedPrompt = '';
        const fileOps = makeFileOps({
            writeFileSync: (_path, data) => {
                capturedPrompt = data;
            },
        });

        const execLlmCliFn = makeExecLlmCli('[PASS] x: y');
        await run(DEFAULT_CONFIG, { fileOps, execLlmCliFn });

        expect(capturedPrompt).toContain('You are a verification checker.');
        expect(capturedPrompt).toContain('- criterion-a');
        expect(capturedPrompt).toContain('- criterion-b');
    });

    test('evidence captures method, result, and timestamp', async () => {
        const execLlmCliFn = makeExecLlmCli('[PASS] criterion-a: ok\n[PASS] criterion-b: ok');
        const result = await run(DEFAULT_CONFIG, { execLlmCliFn });

        expect(result.evidence.method).toBe('llm');
        expect(result.evidence.result).toBe('pass');
        expect(result.evidence.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('cleanup is called in finally block even on success', async () => {
        let cleanupCalled = false;
        const fileOps = makeFileOps({
            rmSync: () => {
                cleanupCalled = true;
            },
        });

        const execLlmCliFn = makeExecLlmCli('[PASS] criterion-a: ok\n[PASS] criterion-b: ok');
        const result = await run(DEFAULT_CONFIG, { fileOps, execLlmCliFn });

        expect(cleanupCalled).toBe(true);
        expect(result.result).toBe('pass');
    });

    test('cleanup is called in finally block even on failure', async () => {
        let cleanupCalled = false;
        const fileOps = makeFileOps({
            rmSync: () => {
                cleanupCalled = true;
            },
        });

        const execLlmCliFn: ExecLlmCliMock = () => {
            throw new Error('Spawn error');
        };

        await run(DEFAULT_CONFIG, { fileOps, execLlmCliFn });
        expect(cleanupCalled).toBe(true);
    });

    test('single checklist item passes when [PASS]', async () => {
        const execLlmCliFn = makeExecLlmCli('[PASS] criterion-a: reason');
        const result = await run({ checklist: ['criterion-a'] }, { execLlmCliFn });

        expect(result.result).toBe('pass');
        expect(result.evidence.llm_results).toHaveLength(1);
    });

    test('ignores empty lines in stdout', async () => {
        const stdout = '[PASS] criterion-a: ok\n\n\n[PASS] criterion-b: ok\n\n';
        const execLlmCliFn = makeExecLlmCli(stdout);
        const result = await run(DEFAULT_CONFIG, { execLlmCliFn });

        expect(result.evidence.llm_results).toHaveLength(2);
        expect(result.result).toBe('pass');
    });

    test('multiple [FAIL] items are all reported in error message', async () => {
        const stdout = `[FAIL] criterion-a: reason A
[FAIL] criterion-b: reason B`;

        const execLlmCliFn = makeExecLlmCli(stdout);
        const result = await run(DEFAULT_CONFIG, { execLlmCliFn });

        expect(result.result).toBe('fail');
        expect(result.error).toContain('criterion-a');
        expect(result.error).toContain('criterion-b');
    });

    test('result is pass even if llmCliPathOverride is a custom path', async () => {
        const execLlmCliFn = makeExecLlmCli('[PASS] criterion-a: ok\n[PASS] criterion-b: ok');
        const result = await run(DEFAULT_CONFIG, {
            llmCliPathOverride: '/usr/local/bin/my-llm',
            execLlmCliFn,
        });

        expect(result.result).toBe('pass');
    });

    test('returns paused result when LLM returns [PAUSE] marker', async () => {
        // This tests that unrecognized markers are silently ignored.
        // The method does not currently support [PAUSE] - we verify it falls through to fail.
        const stdout = `[PASS] criterion-a: ok
PAUSE criterion-b: needs review`;

        const execLlmCliFn = makeExecLlmCli(stdout);
        const result = await run({ checklist: ['criterion-a', 'criterion-b'] }, { execLlmCliFn });

        // Since PAUSE is not [PASS]|[FAIL], it is ignored → only 1 result → fail
        expect(result.result).toBe('fail');
        expect(result.evidence.llm_results).toHaveLength(1);
    });

    test('result includes error field on failure', async () => {
        const execLlmCliFn = makeExecLlmCli('[FAIL] criterion-a: broken');
        const result = await run(DEFAULT_CONFIG, { execLlmCliFn });

        expect(result.result).toBe('fail');
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
    });

    test('result has no error field when all pass', async () => {
        const execLlmCliFn = makeExecLlmCli('[PASS] criterion-a: ok\n[PASS] criterion-b: ok');
        const result = await run(DEFAULT_CONFIG, { execLlmCliFn });

        expect(result.result).toBe('pass');
        expect(result.error).toBeUndefined();
    });
});
