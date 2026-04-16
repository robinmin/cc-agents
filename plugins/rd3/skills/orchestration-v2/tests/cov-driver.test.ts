import { afterEach, beforeAll, describe, expect, spyOn, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { DefaultCoVDriver } from '../scripts/verification/cov-driver';
import type { ChainManifest } from '../scripts/model';
import { setGlobalSilent } from '../../../scripts/logger';

let spawnSpy: ReturnType<typeof spyOn> | null = null;

beforeAll(() => {
    setGlobalSilent(true);
});

afterEach(() => {
    spawnSpy?.mockRestore();
    spawnSpy = null;
});

function makeSpawnResult(stdout: string, exitCode = 0, stderr = ''): ReturnType<typeof Bun.spawn> {
    return {
        exited: Promise.resolve(exitCode),
        stdout: new Response(stdout).body,
        stderr: new Response(stderr).body,
    } as unknown as ReturnType<typeof Bun.spawn>;
}

describe('DefaultCoVDriver', () => {
    test('runChain delegates execution to the verification-chain CLI', async () => {
        spawnSpy = spyOn(Bun, 'spawn').mockImplementation((_argv) => {
            return makeSpawnResult(
                JSON.stringify({
                    ok: true,
                    state: {
                        chain_id: 'run-1',
                        task_wbs: 'phase-test',
                        chain_name: 'run-1:phase-test',
                        status: 'completed',
                        current_node: 'echo-check',
                        created_at: '2026-04-14T00:00:00.000Z',
                        updated_at: '2026-04-14T00:00:01.000Z',
                        nodes: [
                            {
                                name: 'echo-check',
                                type: 'single',
                                status: 'completed',
                                maker_status: 'completed',
                                checker_status: 'completed',
                                checker_result: 'pass',
                                evidence: [
                                    {
                                        method: 'cli',
                                        result: 'pass',
                                        timestamp: '2026-04-14T00:00:01.000Z',
                                        cli_exit_code: 0,
                                        cli_output: 'ok',
                                    },
                                ],
                            },
                        ],
                    },
                }),
            );
        });

        const driver = new DefaultCoVDriver();
        const manifest: ChainManifest = {
            run_id: 'run-1',
            phase_name: 'phase-test',
            checks: [
                {
                    name: 'echo-check',
                    method: 'cli',
                    params: { command: 'echo ok' },
                },
            ],
        };

        const result = await driver.runChain(manifest);

        expect(result.status).toBe('pass');
        expect(result.results).toHaveLength(1);
        expect(result.results[0]).toMatchObject({
            run_id: 'run-1',
            phase_name: 'phase-test',
            step_name: 'echo-check',
            checker_method: 'cli',
            passed: true,
        });

        expect(spawnSpy).toHaveBeenCalledTimes(1);
        const argv = spawnSpy.mock.calls[0]?.[0] as string[];
        expect(argv[0]).toBe('bun');
        expect(argv[1]).toBe('run');
        expect(argv[2]).toContain('verification-chain/scripts/cli.ts');
        expect(argv[3]).toBe('run');

        const manifestPath = argv[4];
        expect(existsSync(manifestPath)).toBe(true);

        const cliManifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
        expect(cliManifest).toMatchObject({
            chain_id: 'run-1',
            task_wbs: 'phase-test',
            chain_name: 'run-1:phase-test',
        });
        expect(Array.isArray(cliManifest.nodes)).toBe(true);
        expect((cliManifest.nodes as Array<Record<string, unknown>>)[0]).toMatchObject({
            name: 'echo-check',
            type: 'single',
        });
    });

    test('resumeChain delegates paused-chain continuation to the verification-chain CLI', async () => {
        spawnSpy = spyOn(Bun, 'spawn').mockImplementation((argv) => {
            const command = argv as string[];
            const subcommand = command[3];

            if (subcommand === 'list') {
                return makeSpawnResult(
                    JSON.stringify({
                        ok: true,
                        count: 1,
                        chains: [
                            {
                                chain_id: 'run-1',
                                task_wbs: 'phase-test',
                                chain_name: 'run-1:phase-test',
                                status: 'paused',
                                current_node: 'human-review',
                                updated_at: '2026-04-14T00:00:00.000Z',
                                paused_node: 'human-review',
                            },
                        ],
                    }),
                );
            }

            if (subcommand === 'resume') {
                return makeSpawnResult(
                    JSON.stringify({
                        ok: true,
                        state: {
                            chain_id: 'run-1',
                            task_wbs: 'phase-test',
                            chain_name: 'run-1:phase-test',
                            status: 'completed',
                            current_node: 'human-review',
                            created_at: '2026-04-14T00:00:00.000Z',
                            updated_at: '2026-04-14T00:00:01.000Z',
                            nodes: [
                                {
                                    name: 'human-review',
                                    type: 'single',
                                    status: 'completed',
                                    maker_status: 'completed',
                                    checker_status: 'completed',
                                    checker_result: 'pass',
                                    evidence: [
                                        {
                                            method: 'human',
                                            result: 'pass',
                                            timestamp: '2026-04-14T00:00:01.000Z',
                                            human_response: 'approve',
                                        },
                                    ],
                                },
                            ],
                        },
                    }),
                );
            }

            return makeSpawnResult(JSON.stringify({ ok: false, error: `unexpected command: ${subcommand}` }), 1);
        });

        const driver = new DefaultCoVDriver();
        const result = await driver.resumeChain('/tmp/cov-state', 'approve');

        expect(result.status).toBe('pass');
        expect(result.results).toHaveLength(1);
        expect(result.results[0]).toMatchObject({
            step_name: 'human-review',
            checker_method: 'human',
            passed: true,
        });

        expect(spawnSpy).toHaveBeenCalledTimes(2);
        const listArgs = spawnSpy.mock.calls[0]?.[0] as string[];
        expect(listArgs[3]).toBe('list');
        const resumeArgs = spawnSpy.mock.calls[1]?.[0] as string[];
        expect(resumeArgs[3]).toBe('resume');
        expect(resumeArgs[4]).toBe('run-1');
        expect(resumeArgs).toContain('--task');
        expect(resumeArgs).toContain('phase-test');
        expect(resumeArgs).toContain('--response');
        expect(resumeArgs).toContain('approve');
    });
});
