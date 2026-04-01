import { describe, test, expect, beforeAll } from 'bun:test';
import { DefaultCoVDriver } from '../scripts/verification/cov-driver';
import type { ChainManifest } from '../scripts/model';
import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('DefaultCoVDriver', () => {
    test('runChain passes with no checks', async () => {
        const driver = new DefaultCoVDriver();
        const manifest: ChainManifest = {
            run_id: 'run-1',
            phase_name: 'test',
            checks: [],
        };
        const result = await driver.runChain(manifest);
        expect(result.status).toBe('pass');
        expect(result.results).toHaveLength(0);
    });

    test('runChain passes with successful CLI check', async () => {
        const driver = new DefaultCoVDriver();
        const manifest: ChainManifest = {
            run_id: 'run-1',
            phase_name: 'test',
            checks: [
                {
                    name: 'echo-check',
                    method: 'cli',
                    params: { command: 'true' },
                },
            ],
        };
        const result = await driver.runChain(manifest);
        expect(result.status).toBe('pass');
        expect(result.results).toHaveLength(1);
        expect(result.results[0].passed).toBe(true);
    });

    test('runChain fails with failing CLI check', async () => {
        const driver = new DefaultCoVDriver();
        const manifest: ChainManifest = {
            run_id: 'run-1',
            phase_name: 'test',
            checks: [
                {
                    name: 'fail-check',
                    method: 'cli',
                    params: { command: 'false' },
                },
            ],
        };
        const result = await driver.runChain(manifest);
        expect(result.status).toBe('fail');
        expect(result.results).toHaveLength(1);
        expect(result.results[0].passed).toBe(false);
    });

    test('runChain handles mixed pass/fail checks', async () => {
        const driver = new DefaultCoVDriver();
        const manifest: ChainManifest = {
            run_id: 'run-1',
            phase_name: 'test',
            checks: [
                { name: 'pass', method: 'cli', params: { command: 'true' } },
                { name: 'fail', method: 'cli', params: { command: 'false' } },
            ],
        };
        const result = await driver.runChain(manifest);
        expect(result.status).toBe('fail');
        expect(result.results).toHaveLength(2);
    });

    test('runChain handles unknown method', async () => {
        const driver = new DefaultCoVDriver();
        const manifest: ChainManifest = {
            run_id: 'run-1',
            phase_name: 'test',
            checks: [{ name: 'unknown', method: 'invalid_method' }],
        };
        const result = await driver.runChain(manifest);
        expect(result.status).toBe('fail');
        expect(result.results[0].passed).toBe(false);
    });

    test('runChain handles CLI check with no command', async () => {
        const driver = new DefaultCoVDriver();
        const manifest: ChainManifest = {
            run_id: 'run-1',
            phase_name: 'test',
            checks: [{ name: 'no-cmd', method: 'cli' }],
        };
        const result = await driver.runChain(manifest);
        expect(result.status).toBe('fail');
        expect(result.results[0].passed).toBe(false);
    });

    test('runChain handles content_match check with missing file', async () => {
        const driver = new DefaultCoVDriver();
        const manifest: ChainManifest = {
            run_id: 'run-1',
            phase_name: 'test',
            checks: [
                {
                    name: 'missing-file',
                    method: 'content_match',
                    params: { file: '/nonexistent/file.txt', pattern: 'hello' },
                },
            ],
        };
        const result = await driver.runChain(manifest);
        expect(result.status).toBe('fail');
        expect(result.results[0].passed).toBe(false);
    });

    test('runChain handles content_match check with missing params', async () => {
        const driver = new DefaultCoVDriver();
        const manifest: ChainManifest = {
            run_id: 'run-1',
            phase_name: 'test',
            checks: [{ name: 'no-params', method: 'content_match' }],
        };
        const result = await driver.runChain(manifest);
        expect(result.status).toBe('fail');
        expect(result.results[0].passed).toBe(false);
    });

    test('runChain handles human check as not passed', async () => {
        const driver = new DefaultCoVDriver();
        const manifest: ChainManifest = {
            run_id: 'run-1',
            phase_name: 'test',
            checks: [{ name: 'human-review', method: 'human' }],
        };
        const result = await driver.runChain(manifest);
        expect(result.status).toBe('fail');
        expect(result.results[0].passed).toBe(false);
    });

    test('resumeChain with approve returns pass', async () => {
        const driver = new DefaultCoVDriver();
        const result = await driver.resumeChain('/tmp/test-state', 'approve');
        expect(result.status).toBe('pass');
        expect(result.results[0].passed).toBe(true);
    });

    test('resumeChain with reject returns fail', async () => {
        const driver = new DefaultCoVDriver();
        const result = await driver.resumeChain('/tmp/test-state', 'reject');
        expect(result.status).toBe('fail');
        expect(result.results[0].passed).toBe(false);
    });

    test('resumeChain without action returns pending', async () => {
        const driver = new DefaultCoVDriver();
        const result = await driver.resumeChain('/nonexistent/path');
        expect(result.status).toBe('pending');
    });
});
