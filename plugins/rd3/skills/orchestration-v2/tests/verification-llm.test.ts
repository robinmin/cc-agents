import { afterEach, describe, expect, test } from 'bun:test';
import { EventEmitter } from 'node:events';
import { runLlmCheck } from '../../verification-chain/scripts/methods/llm';

type SpawnLike = (
    command: string,
    args: string[],
    options: { shell: boolean },
) => EventEmitter & {
    stdout?: EventEmitter;
    stderr?: EventEmitter;
};

function createSpawnMock({
    stdout = '',
    stderr = '',
    closeCode = 0,
    emitError,
}: {
    stdout?: string;
    stderr?: string;
    closeCode?: number | null;
    emitError?: Error;
}): SpawnLike {
    return ((command: string, args: string[], options: { shell: boolean }) => {
        expect(command).toContain('mock-llm');
        expect(args).toEqual([]);
        expect(options.shell).toBe(true);

        const child = new EventEmitter() as EventEmitter & { stdout?: EventEmitter; stderr?: EventEmitter };
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();

        queueMicrotask(() => {
            if (emitError) {
                child.emit('error', emitError);
                return;
            }

            if (stdout) {
                child.stdout?.emit('data', stdout);
            }
            if (stderr) {
                child.stderr?.emit('data', stderr);
            }
            child.emit('close', closeCode);
        });

        return child;
    }) as SpawnLike;
}

describe('verification-chain llm method', () => {
    const env = import.meta.env as Record<string, string | undefined>;
    const originalCommand = env.LLM_CLI_COMMAND;

    afterEach(() => {
        env.LLM_CLI_COMMAND = originalCommand;
    });

    test('fails clearly when LLM_CLI_COMMAND is missing', async () => {
        env.LLM_CLI_COMMAND = undefined;

        const result = await runLlmCheck({ checklist: ['one check'] });

        expect(result.result).toBe('fail');
        expect(result.error).toContain('LLM_CLI_COMMAND');
        expect(result.evidence.error).toContain('LLM_CLI_COMMAND');
    });

    test('fails cleanly when prompt file creation fails', async () => {
        env.LLM_CLI_COMMAND = 'mock-llm';

        const result = await runLlmCheck({ checklist: ['Requirement captured'] }, createSpawnMock({}) as never, {
            mkdtempSync: (() => '/tmp/mock-llm-check') as unknown as typeof import('node:fs').mkdtempSync,
            writeFileSync: () => {
                throw new Error('disk full');
            },
            rmSync: () => undefined,
        });

        expect(result.result).toBe('fail');
        expect(result.error).toContain('Failed to write prompt to temp file');
        expect(result.evidence.error).toContain('disk full');
    });

    test('returns pass when all checklist items pass', async () => {
        env.LLM_CLI_COMMAND = 'mock-llm';

        const result = await runLlmCheck(
            { checklist: ['Requirement captured', 'Scope is clear'] },
            createSpawnMock({
                stdout: `[PASS] Requirement captured: looks good\n[PASS] Scope is clear: no ambiguity\n`,
            }) as never,
        );

        expect(result.result).toBe('pass');
        expect(result.error).toBeUndefined();
        expect(result.evidence.llm_results).toEqual([
            { item: 'Requirement captured', passed: true, reason: 'looks good' },
            { item: 'Scope is clear', passed: true, reason: 'no ambiguity' },
        ]);
    });

    test('records stderr output without changing a passing result', async () => {
        env.LLM_CLI_COMMAND = 'mock-llm';

        const result = await runLlmCheck(
            { checklist: ['Requirement captured'] },
            createSpawnMock({
                stdout: `[PASS] Requirement captured: looks good\n`,
                stderr: 'warning: model near limit\n',
            }) as never,
        );

        expect(result.result).toBe('pass');
        expect(result.evidence.llm_results).toEqual([
            { item: 'Requirement captured', passed: true, reason: 'looks good' },
        ]);
    });

    test('fails closed when output is malformed or incomplete', async () => {
        env.LLM_CLI_COMMAND = 'mock-llm';

        const result = await runLlmCheck(
            { checklist: ['Requirement captured', 'Scope is clear'] },
            createSpawnMock({
                stdout: `[PASS] Requirement captured: looks good\nnot a parsable line\n`,
            }) as never,
        );

        expect(result.result).toBe('fail');
        expect(result.error).toContain('Failed checklist items');
        expect(result.evidence.result).toBe('fail');
    });

    test('returns explicit failed checklist items when the model emits FAIL lines', async () => {
        env.LLM_CLI_COMMAND = 'mock-llm';

        const result = await runLlmCheck(
            { checklist: ['Requirement captured', 'Scope is clear'] },
            createSpawnMock({
                stdout: `[PASS] Requirement captured: looks good\n[FAIL] Scope is clear: missing acceptance criteria\n`,
            }) as never,
        );

        expect(result.result).toBe('fail');
        expect(result.error).toContain('Scope is clear');
        expect(result.evidence.llm_results).toEqual([
            { item: 'Requirement captured', passed: true, reason: 'looks good' },
            { item: 'Scope is clear', passed: false, reason: 'missing acceptance criteria' },
        ]);
    });

    test('surfaces spawn errors as failed checks', async () => {
        env.LLM_CLI_COMMAND = 'mock-llm';

        const result = await runLlmCheck(
            { checklist: ['Requirement captured'] },
            createSpawnMock({
                emitError: new Error('spawn failed'),
            }) as never,
        );

        expect(result.result).toBe('fail');
        expect(result.error).toContain('spawn failed');
        expect(result.evidence.error).toContain('spawn failed');
    });
});
