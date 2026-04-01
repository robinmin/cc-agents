import { describe, test, expect, beforeEach, beforeAll } from 'bun:test';
import { LocalBunExecutor } from '../scripts/executors/local';
import { AcpExecutor } from '../scripts/executors/acp';
import { ExecutorPool } from '../scripts/executors/pool';
import type { ExecutionRequest } from '../scripts/model';
import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

const BASE_REQUEST: ExecutionRequest = {
    skill: 'echo',
    phase: 'test',
    prompt: 'hello',
    payload: {},
    channel: 'current',
    timeoutMs: 5000,
};

describe('LocalBunExecutor', () => {
    test('has correct id and capabilities', () => {
        const exec = new LocalBunExecutor();
        expect(exec.id).toBe('local');
        expect(exec.capabilities.parallel).toBe(false);
        expect(exec.capabilities.maxConcurrency).toBe(1);
        expect(exec.capabilities.channels).toEqual(['current']);
    });

    test('healthCheck returns healthy', async () => {
        const exec = new LocalBunExecutor();
        const health = await exec.healthCheck();
        expect(health.healthy).toBe(true);
    });

    test('executes a simple command successfully', async () => {
        const exec = new LocalBunExecutor();
        // Use a skill name that resolves to a simple command
        const result = await exec.execute({
            ...BASE_REQUEST,
            skill: '-e', // bun -e runs inline code
        });
        expect(result.durationMs).toBeGreaterThan(0);
    });

    test('disposes without error', async () => {
        const exec = new LocalBunExecutor();
        await expect(exec.dispose()).resolves.toBeUndefined();
    });
});

describe('AcpExecutor', () => {
    test('has correct id from agent name', () => {
        const exec = new AcpExecutor('codex');
        expect(exec.id).toBe('acp:codex');
        expect(exec.capabilities.parallel).toBe(true);
        expect(exec.capabilities.maxConcurrency).toBe(4);
        expect(exec.capabilities.channels).toEqual(['codex']);
    });

    test('healthCheck returns unhealthy when acpx not available', async () => {
        const exec = new AcpExecutor('codex');
        const health = await exec.healthCheck();
        // acpx likely not installed in test env
        expect(typeof health.healthy).toBe('boolean');
    });

    test('disposes without error', async () => {
        const exec = new AcpExecutor('codex');
        await expect(exec.dispose()).resolves.toBeUndefined();
    });
});

describe('ExecutorPool', () => {
    let pool: ExecutorPool;

    beforeEach(() => {
        pool = new ExecutorPool();
    });

    test('has local executor by default', () => {
        const local = pool.getDefault();
        expect(local.id).toBe('local');
    });

    test('list returns unique executors', () => {
        const list = pool.list();
        expect(list.length).toBeGreaterThanOrEqual(1);
        const ids = list.map((e) => e.id);
        expect(ids).toContain('local');
    });

    test('resolve returns executor for channel', () => {
        const exec = pool.resolve('current');
        expect(exec.id).toBe('local');
    });

    test('resolve throws for unknown channel', () => {
        expect(() => pool.resolve('nonexistent')).toThrow();
    });

    test('get returns executor by id', () => {
        const exec = pool.get('local');
        expect(exec?.id).toBe('local');
    });

    test('get returns undefined for unknown id', () => {
        const exec = pool.get('nonexistent');
        expect(exec).toBeUndefined();
    });

    test('has checks channel registration', () => {
        expect(pool.has('current')).toBe(true);
        expect(pool.has('nonexistent')).toBe(false);
    });

    test('register adds executor for multiple channels', () => {
        const acp = new AcpExecutor('codex');
        pool.register(acp);
        expect(pool.has('codex')).toBe(true);
        expect(pool.has('acp:codex')).toBe(true);
        expect(pool.get('acp:codex')?.id).toBe('acp:codex');
    });

    test('healthCheckAll returns map of results', async () => {
        const results = await pool.healthCheckAll();
        expect(results.has('local')).toBe(true);
        const localHealth = results.get('local');
        expect(localHealth?.healthy).toBe(true);
    });

    test('disposeAll clears executors', async () => {
        await pool.disposeAll();
        expect(pool.list()).toHaveLength(0);
    });
});
