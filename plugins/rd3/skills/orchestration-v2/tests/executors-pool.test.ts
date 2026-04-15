import { describe, test, expect } from 'bun:test';
import { InlineExecutor } from '../scripts/executors/inline';
import { ExecutorPool } from '../scripts/executors/pool';
import { MockExecutor } from '../scripts/executors/mock';
import type { ExecutionRequest } from '../scripts/model';
import { setGlobalSilent } from '../../../scripts/logger';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

setGlobalSilent(true);

function makeRequest(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
    return {
        skill: 'rd3:orchestration-v2',
        phase: 'test',
        prompt: 'hello',
        payload: {},
        channel: 'inline',
        timeoutMs: 5000,
        ...overrides,
    };
}

// ── InlineExecutor ────────────────────────────────────────────────────────────

describe('InlineExecutor', () => {
    test('has id "inline" and registers the inline channel', () => {
        const exec = new InlineExecutor('/tmp/does-not-matter');
        expect(exec.id).toBe('inline');
        expect(exec.channels).toEqual(['inline']);
    });

    test('fails clearly when a skill has no local entrypoint', async () => {
        const exec = new InlineExecutor('/tmp/does-not-matter');
        const result = await exec.execute(makeRequest({ skill: 'rd3:missing-skill' }));

        expect(result.success).toBe(false);
        expect(result.stderr).toContain('does not expose a local in-process entrypoint');
    });

    test('runs a dedicated scripts/run.ts entrypoint in-process', async () => {
        const rootDir = mkdtempSync(join(tmpdir(), 'orch-v2-inline-'));
        const skillDir = join(rootDir, 'demo-skill', 'scripts');
        mkdirSync(skillDir, { recursive: true });
        writeFileSync(join(skillDir, 'run.ts'), '// dummy\n');

        try {
            // Use mock module loader to avoid V8 coverage leak from temp .ts imports
            const mockLoader = async (_entryPath: string) => ({
                runLocalPhase: async (req: ExecutionRequest) => ({
                    success: true,
                    exitCode: 0,
                    stdout: `ok:${req.phase}`,
                    durationMs: 3,
                    timedOut: false,
                }),
            });
            const exec = new InlineExecutor(rootDir, mockLoader);
            const result = await exec.execute(makeRequest({ skill: 'rd3:demo-skill', phase: 'implement' }));
            expect(result.success).toBe(true);
            expect(result.stdout).toBe('ok:implement');
        } finally {
            rmSync(rootDir, { recursive: true, force: true });
        }
    });
});

// ── ExecutorPool ───────────────────────────────────────────────────────────────

/**
 * Tests that depend only on inline and the default executor.
 * These tests do NOT read the real config file and are fully isolated.
 */
describe('ExecutorPool (config-independent)', () => {
    test('getDefault returns inline executor', () => {
        const pool = new ExecutorPool();
        expect(pool.getDefault().id).toBe('inline');
    });

    test('resolve("inline") returns inline executor', () => {
        const pool = new ExecutorPool();
        expect(pool.resolve('inline').id).toBe('inline');
    });

    test('resolve("local") returns inline executor via legacy alias', () => {
        const pool = new ExecutorPool();
        expect(pool.resolve('local').id).toBe('inline');
    });

    test('resolve("auto") returns inline executor via legacy alias', () => {
        const pool = new ExecutorPool();
        expect(pool.resolve('auto').id).toBe('inline');
    });

    test('resolve("current") returns inline executor via legacy alias', () => {
        const pool = new ExecutorPool();
        expect(pool.resolve('current').id).toBe('inline');
    });

    test('resolve("subprocess") returns subprocess executor', () => {
        const pool = new ExecutorPool();
        expect(pool.resolve('subprocess').id).toBe('subprocess');
    });

    test('resolve("direct") returns subprocess executor via legacy alias', () => {
        const pool = new ExecutorPool();
        expect(pool.resolve('direct').id).toBe('subprocess');
    });

    test('resolve throws for unknown channel', () => {
        const pool = new ExecutorPool();
        expect(() => pool.resolve('unknown-channel')).toThrow();
    });

    test('has returns true for registered channels', () => {
        const pool = new ExecutorPool();
        expect(pool.has('inline')).toBe(true);
        expect(pool.has('subprocess')).toBe(true);
    });

    test('has returns true for legacy aliases', () => {
        const pool = new ExecutorPool();
        expect(pool.has('local')).toBe(true);
        expect(pool.has('direct')).toBe(true);
        expect(pool.has('auto')).toBe(true);
        expect(pool.has('current')).toBe(true);
    });

    test('has returns false for unknown channels', () => {
        const pool = new ExecutorPool();
        expect(pool.has('nonexistent')).toBe(false);
    });

    test('disposeAll clears executors', async () => {
        const pool = new ExecutorPool();
        await pool.disposeAll();
        expect(pool.list()).toHaveLength(0);
    });
});

/**
 * Tests for manually registered executors — isolated from the pool's config-driven
 * registration.
 */
describe('ExecutorPool (manual registration)', () => {
    test('register adds executor for channel alias', () => {
        const pool = new ExecutorPool();
        const mock = new MockExecutor({ channels: ['custom'] });
        pool.register(mock);
        expect(pool.has('custom')).toBe(true);
        expect(pool.get('mock')?.id).toBe('mock');
    });

    test('execute dispatches to manually registered executor', async () => {
        const mock = new MockExecutor();
        mock.setResponses([{ result: { success: true, exitCode: 0, durationMs: 7, timedOut: false } }]);
        const pool = new ExecutorPool();
        pool.register(mock);

        const result = await pool.execute(makeRequest(), 'mock');

        expect(result.durationMs).toBe(7);
        expect(mock.getCallLog()).toHaveLength(1);
    });

    test('healthCheckAll returns map with all executors', async () => {
        const pool = new ExecutorPool();
        const results = await pool.healthCheckAll();
        expect(results.has('inline')).toBe(true);
        expect(results.has('subprocess')).toBe(true);
    });
});
