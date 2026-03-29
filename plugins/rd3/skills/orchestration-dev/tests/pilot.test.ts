import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setGlobalSilent } from '../../../scripts/logger';
import { generateExecutionPlan } from '../scripts/plan';
import { createPilotDelegateRunner, createPilotPhaseRunner } from '../scripts/pilot';
import { loadVerificationProfile } from '../scripts/verification-profiles';

beforeAll(() => {
    setGlobalSilent(true);
});

const tempDirs: string[] = [];

afterEach(() => {
    while (tempDirs.length > 0) {
        rmSync(tempDirs.pop() as string, { recursive: true, force: true });
    }
});

function createTempDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
}

describe('verification profile loader', () => {
    test('loads the TypeScript + Bun + Biome profile', () => {
        const profile = loadVerificationProfile('typescript-bun-biome');
        expect(profile.id).toBe('typescript-bun-biome');
        expect(profile.phase6.steps.map((step) => step.name)).toEqual(['typecheck', 'lint-rd3', 'test-rd3']);
    });
});

describe('pilot delegate runner', () => {
    test('uses the local executor for current-channel delegated work', async () => {
        const runner = createPilotDelegateRunner('current', {
            local: {
                runCommand: (cmd) => ({
                    status: 'completed',
                    backend: 'local-child',
                    normalized_channel: 'current',
                    stdout: `ran:${cmd}`,
                }),
            },
        });

        const result = await runner({
            skill: 'rd3:sys-testing',
            args: { command: 'bun run typecheck' },
            cwd: '/tmp/example',
            timeout_ms: 1000,
        });

        expect(result.status).toBe('completed');
        expect(result.output).toBe('ran:bun run typecheck');
    });
});

describe('pilot phase runner', () => {
    test('runs the phase 6 pilot workflow through verification-chain', async () => {
        const dir = createTempDir('orchestration-pilot-');
        writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { typecheck: 'true', 'lint:rd3': 'true', 'test:rd3': 'true' } }));
        writeFileSync(join(dir, 'tsconfig.json'), '{}');
        writeFileSync(join(dir, 'biome.json'), '{}');

        const plan = generateExecutionPlan('0276', 'unit');
        const phase = plan.phases[0];
        const runner = createPilotPhaseRunner({
            local: {
                runCommand: (cmd) => ({
                    status: 'completed',
                    backend: 'local-child',
                    normalized_channel: 'current',
                    stdout: `ok:${cmd}`,
                }),
            },
        });

        const result = await runner(phase, {
            plan,
            state: {
                task_ref: plan.task_ref,
                profile: plan.profile,
                execution_channel: plan.execution_channel,
                coverage_threshold: plan.coverage_threshold,
                status: 'running',
                auto_approve_human_gates: false,
                refine_mode: false,
                dry_run: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                phases: [],
            },
            stateDir: dir,
            projectRoot: dir,
            stackProfile: 'typescript-bun-biome',
        });

        expect(result.status).toBe('completed');
        expect(result.evidence?.some((entry) => entry.detail.includes('typecheck: completed'))).toBe(true);
        expect(result.evidence?.some((entry) => entry.detail.includes('test-rd3: completed'))).toBe(true);
    });

    test('surfaces a paused delegated verification step', async () => {
        const dir = createTempDir('orchestration-pilot-pause-');
        writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { typecheck: 'true', 'lint:rd3': 'true', 'test:rd3': 'true' } }));
        writeFileSync(join(dir, 'tsconfig.json'), '{}');
        writeFileSync(join(dir, 'biome.json'), '{}');

        const plan = generateExecutionPlan('0276', 'unit');
        const phase = plan.phases[0];
        let calls = 0;
        const runner = createPilotPhaseRunner({
            local: {
                runCommand: (cmd) => {
                    if (cmd === 'bun run typecheck' && calls++ === 0) {
                        return {
                            status: 'paused',
                            backend: 'local-child',
                            normalized_channel: 'current',
                            stdout: 'waiting for verification input',
                        };
                    }

                    return {
                        status: 'completed',
                        backend: 'local-child',
                        normalized_channel: 'current',
                        stdout: `ok:${cmd}`,
                    };
                },
            },
        });

        const result = await runner(phase, {
            plan,
            state: {
                task_ref: plan.task_ref,
                profile: plan.profile,
                execution_channel: plan.execution_channel,
                coverage_threshold: plan.coverage_threshold,
                status: 'running',
                auto_approve_human_gates: false,
                refine_mode: false,
                dry_run: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                phases: [],
            },
            stateDir: dir,
            projectRoot: dir,
            stackProfile: 'typescript-bun-biome',
        });

        expect(result.status).toBe('paused');
        expect(result.error).toContain('status paused');
        expect(result.evidence?.some((entry) => entry.detail.includes('typecheck: running'))).toBe(true);
    });

    test('fails the pilot workflow when a delegated verification step keeps failing after retry', async () => {
        const dir = createTempDir('orchestration-pilot-fail-');
        writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { typecheck: 'true', 'lint:rd3': 'true', 'test:rd3': 'true' } }));
        writeFileSync(join(dir, 'tsconfig.json'), '{}');
        writeFileSync(join(dir, 'biome.json'), '{}');

        const plan = generateExecutionPlan('0276', 'unit');
        const phase = plan.phases[0];
        const attempts: Record<string, number> = {};
        const runner = createPilotPhaseRunner({
            local: {
                runCommand: (cmd) => {
                    attempts[cmd] = (attempts[cmd] ?? 0) + 1;
                    if (cmd === 'bun run test:rd3') {
                        return {
                            status: 'failed',
                            backend: 'local-child',
                            normalized_channel: 'current',
                            stdout: '',
                            stderr: 'tests failed',
                            error: 'tests failed',
                            exit_code: 1,
                        };
                    }

                    return {
                        status: 'completed',
                        backend: 'local-child',
                        normalized_channel: 'current',
                        stdout: `ok:${cmd}`,
                    };
                },
            },
        });

        const result = await runner(phase, {
            plan,
            state: {
                task_ref: plan.task_ref,
                profile: plan.profile,
                execution_channel: plan.execution_channel,
                coverage_threshold: plan.coverage_threshold,
                status: 'running',
                auto_approve_human_gates: false,
                refine_mode: false,
                dry_run: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                phases: [],
            },
            stateDir: dir,
            projectRoot: dir,
            stackProfile: 'typescript-bun-biome',
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('status failed');
        expect(attempts['bun run test:rd3']).toBe(2);
        expect(result.evidence?.some((entry) => entry.detail.includes('test-rd3: failed'))).toBe(true);
    });

    test('retries a transient delegated verification failure and then completes', async () => {
        const dir = createTempDir('orchestration-pilot-retry-');
        writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { typecheck: 'true', 'lint:rd3': 'true', 'test:rd3': 'true' } }));
        writeFileSync(join(dir, 'tsconfig.json'), '{}');
        writeFileSync(join(dir, 'biome.json'), '{}');

        const plan = generateExecutionPlan('0276', 'unit');
        const phase = plan.phases[0];
        const attempts: Record<string, number> = {};
        const runner = createPilotPhaseRunner({
            local: {
                runCommand: (cmd) => {
                    attempts[cmd] = (attempts[cmd] ?? 0) + 1;
                    if (cmd === 'bun run test:rd3' && attempts[cmd] === 1) {
                        return {
                            status: 'failed',
                            backend: 'local-child',
                            normalized_channel: 'current',
                            stdout: '',
                            stderr: 'transient failure',
                            error: 'transient failure',
                            exit_code: 1,
                        };
                    }

                    return {
                        status: 'completed',
                        backend: 'local-child',
                        normalized_channel: 'current',
                        stdout: `ok:${cmd}`,
                    };
                },
            },
        });

        const result = await runner(phase, {
            plan,
            state: {
                task_ref: plan.task_ref,
                profile: plan.profile,
                execution_channel: plan.execution_channel,
                coverage_threshold: plan.coverage_threshold,
                status: 'running',
                auto_approve_human_gates: false,
                refine_mode: false,
                dry_run: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                phases: [],
            },
            stateDir: dir,
            projectRoot: dir,
            stackProfile: 'typescript-bun-biome',
        });

        expect(result.status).toBe('completed');
        expect(attempts['bun run test:rd3']).toBe(2);
        expect(result.evidence?.some((entry) => entry.detail.includes('test-rd3: completed'))).toBe(true);
    });

    test('fails unsupported phases in the pilot runner', async () => {
        const runner = createPilotPhaseRunner();
        const plan = generateExecutionPlan('0276', 'review');
        const result = await runner(plan.phases[0], {
            plan,
            state: {
                task_ref: plan.task_ref,
                profile: plan.profile,
                execution_channel: plan.execution_channel,
                coverage_threshold: plan.coverage_threshold,
                status: 'running',
                auto_approve_human_gates: false,
                refine_mode: false,
                dry_run: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                phases: [],
            },
            stateDir: process.cwd(),
            projectRoot: process.cwd(),
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('does not yet support phase 7');
    });
});
