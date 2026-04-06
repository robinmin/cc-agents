import { describe, expect, test } from 'bun:test';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runLlmCheck } from '../../verification-chain/scripts/methods/llm';

// Helper: create a temp mock LLM script that outputs the given text.
function makeMockLlmScript(output: string, includeStderr?: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'llm-check-test-'));
    const scriptPath = join(dir, 'mock-llm.sh');
    // Format: each line becomes `echo "line content"`
    const lines = output.split('\n').filter(Boolean);
    const echoCommands = lines.map((line) => `echo "${line.replace(/"/g, '"')}"`).join('\n');
    const stderrPart = includeStderr ? `\necho "${includeStderr.replace(/"/g, '"')}" >&2` : '';
    writeFileSync(scriptPath, `#!/bin/sh\n${echoCommands}${stderrPart}\n`, 'utf-8');
    return scriptPath;
}

describe('verification-chain llm method', () => {
    test('fails clearly when LLM CLI is not available', async () => {
        const result = await runLlmCheck({ checklist: ['one check'] }, undefined, '/nonexistent-binary-xyz');

        expect(result.result).toBe('fail');
        expect(result.error).toBeDefined();
        expect(result.error?.length).toBeGreaterThan(0);
        expect(result.evidence.error).toBeDefined();
    });

    test('fails cleanly when prompt file creation fails', async () => {
        const scriptPath = makeMockLlmScript('[PASS] Requirement captured: looks good');
        try {
            const result = await runLlmCheck(
                { checklist: ['Requirement captured'] },
                {
                    mkdtempSync: () => '/tmp/cannot-write-here',
                    writeFileSync: () => {
                        throw new Error('disk full');
                    },
                    rmSync: () => undefined,
                    // biome-ignore lint/suspicious/noExplicitAny: test mock via object literal
                } as any,
                scriptPath,
            );

            expect(result.result).toBe('fail');
            expect(result.error).toContain('Failed to write prompt to temp file');
            expect(result.evidence.error).toContain('disk full');
        } finally {
            rmSync(scriptPath, { force: true });
        }
    });

    test('returns pass when all checklist items pass', async () => {
        const scriptPath = makeMockLlmScript(
            '[PASS] Requirement captured: looks good\n[PASS] Scope is clear: no ambiguity',
        );
        try {
            const result = await runLlmCheck(
                { checklist: ['Requirement captured', 'Scope is clear'] },
                undefined, // default fileOps
                scriptPath,
            );

            expect(result.result).toBe('pass');
            expect(result.error).toBeUndefined();
            expect(result.evidence.llm_results).toEqual([
                { item: 'Requirement captured', passed: true, reason: 'looks good' },
                { item: 'Scope is clear', passed: true, reason: 'no ambiguity' },
            ]);
        } finally {
            rmSync(scriptPath, { force: true });
        }
    });

    test('records stderr output without changing a passing result', async () => {
        const scriptPath = makeMockLlmScript('[PASS] Requirement captured: looks good', 'warning: model near limit');
        try {
            const result = await runLlmCheck({ checklist: ['Requirement captured'] }, undefined, scriptPath);

            expect(result.result).toBe('pass');
            expect(result.evidence.llm_results).toEqual([
                { item: 'Requirement captured', passed: true, reason: 'looks good' },
            ]);
        } finally {
            rmSync(scriptPath, { force: true });
        }
    });

    test('fails closed when output is malformed or incomplete', async () => {
        const scriptPath = makeMockLlmScript('[PASS] Requirement captured: looks good\nnot a parsable line');
        try {
            const result = await runLlmCheck(
                { checklist: ['Requirement captured', 'Scope is clear'] },
                undefined,
                scriptPath,
            );

            expect(result.result).toBe('fail');
            expect(result.error).toContain('Failed checklist items');
            expect(result.evidence.result).toBe('fail');
        } finally {
            rmSync(scriptPath, { force: true });
        }
    });

    test('returns explicit failed checklist items when the model emits FAIL lines', async () => {
        const scriptPath = makeMockLlmScript(
            '[PASS] Requirement captured: looks good\n[FAIL] Scope is clear: missing acceptance criteria',
        );
        try {
            const result = await runLlmCheck(
                { checklist: ['Requirement captured', 'Scope is clear'] },
                undefined,
                scriptPath,
            );

            expect(result.result).toBe('fail');
            expect(result.error).toContain('Scope is clear');
            expect(result.evidence.llm_results).toEqual([
                { item: 'Requirement captured', passed: true, reason: 'looks good' },
                { item: 'Scope is clear', passed: false, reason: 'missing acceptance criteria' },
            ]);
        } finally {
            rmSync(scriptPath, { force: true });
        }
    });

    test('surfaces spawn errors as failed checks', async () => {
        const result = await runLlmCheck(
            { checklist: ['Requirement captured'] },
            undefined,
            '/nonexistent-llm-binary-spawn-test',
        );

        expect(result.result).toBe('fail');
        expect(result.error).toBeDefined();
        expect(result.error?.length).toBeGreaterThan(0);
        expect(result.evidence.error).toBeDefined();
    });
});
