import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setGlobalSilent } from '../../../scripts/logger';
import { generateExecutionPlan } from '../scripts/plan';
import { buildWorkerPrompt, createPilotDelegateRunner, createPilotPhaseRunner } from '../scripts/pilot';
import { PHASE_WORKER_CONTRACTS, PHASE_WORKER_CONTRACT_VERSION } from '../scripts/contracts';
import { loadVerificationProfile } from '../scripts/verification-profiles';
import type { OrchestrationState } from '../scripts/runtime';

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
        writeFileSync(
            join(dir, 'package.json'),
            JSON.stringify({ scripts: { typecheck: 'true', 'lint:rd3': 'true', 'test:rd3': 'true' } }),
        );
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

    test('delegates phase 5 worker execution through the phase executor on ACP channels', async () => {
        const plan = generateExecutionPlan('0276', 'simple');
        plan.execution_channel = 'codex';
        const phase = plan.phases[0];
        const commands: string[][] = [];
        const runner = createPilotPhaseRunner({
            acp: {
                acpxExec: (command) => {
                    commands.push(command);
                    return {
                        ok: true,
                        stdout: JSON.stringify({
                            status: 'completed',
                            phase: 5,
                            artifacts: [{ path: 'src/example.ts', type: 'source-file' }],
                            evidence_summary: ['typecheck clean', 'tests pass'],
                            next_step_recommendation: 'proceed_to_phase_6',
                        }),
                        stderr: '',
                        exitCode: 0,
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
            stateDir: process.cwd(),
            projectRoot: process.cwd(),
        });

        expect(result.status).toBe('completed');
        expect(commands).toHaveLength(1);
        expect(commands[0][3]).toBe('codex');
        expect(commands[0][5]).toContain('Run rd3 worker agent `rd3:super-coder` in worker mode for Phase 5');
        expect(commands[0][5]).toContain('Canonical backbone: rd3:code-implement-common');
        expect(result.evidence?.some((entry) => entry.detail.includes('delegated phase 5 to rd3:super-coder'))).toBe(
            true,
        );
        expect(result.result).toMatchObject({
            status: 'completed',
            phase: 5,
            next_step_recommendation: 'proceed_to_phase_6',
        });
    });

    test('delegates phase 6 verification steps through the phase executor on ACP channels', async () => {
        const dir = createTempDir('orchestration-pilot-acp-phase6-');
        writeFileSync(
            join(dir, 'package.json'),
            JSON.stringify({ scripts: { typecheck: 'true', 'lint:rd3': 'true', 'test:rd3': 'true' } }),
        );
        writeFileSync(join(dir, 'tsconfig.json'), '{}');
        writeFileSync(join(dir, 'biome.json'), '{}');

        const plan = generateExecutionPlan('0276', 'unit');
        plan.execution_channel = 'codex';
        const phase = plan.phases[0];
        const commands: string[][] = [];
        const runner = createPilotPhaseRunner({
            acp: {
                acpxExec: (command) => {
                    commands.push(command);
                    return {
                        ok: true,
                        stdout: 'verification step completed',
                        stderr: '',
                        exitCode: 0,
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
        expect(commands).toHaveLength(3);
        expect(commands[0][3]).toBe('codex');
        expect(commands[0][5]).toContain('delegated rd3 worker activity via `rd3:super-tester`');
        expect(commands[0][5]).toContain('Canonical downstream skill: `rd3:sys-testing`.');
    });

    test('surfaces a paused delegated verification step', async () => {
        const dir = createTempDir('orchestration-pilot-pause-');
        writeFileSync(
            join(dir, 'package.json'),
            JSON.stringify({ scripts: { typecheck: 'true', 'lint:rd3': 'true', 'test:rd3': 'true' } }),
        );
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
        writeFileSync(
            join(dir, 'package.json'),
            JSON.stringify({ scripts: { typecheck: 'true', 'lint:rd3': 'true', 'test:rd3': 'true' } }),
        );
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
        writeFileSync(
            join(dir, 'package.json'),
            JSON.stringify({ scripts: { typecheck: 'true', 'lint:rd3': 'true', 'test:rd3': 'true' } }),
        );
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

    test('pauses current-channel worker phases that do not have a local worker runner yet', async () => {
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

        expect(result.status).toBe('paused');
        expect(result.error).toContain('requires an ACP worker channel');
        expect(result.evidence?.some((entry) => entry.kind === 'worker-handoff-required')).toBe(true);
    });

    test('fails worker-agent execution when the ACP worker does not return a valid JSON envelope', async () => {
        const plan = generateExecutionPlan('0276', 'review');
        plan.execution_channel = 'codex';
        const runner = createPilotPhaseRunner({
            acp: {
                acpxExec: () => ({
                    ok: true,
                    stdout: 'phase 7 completed',
                    stderr: '',
                    exitCode: 0,
                }),
            },
        });

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
        expect(result.error).toContain('expected a JSON worker envelope');
        expect(result.evidence?.some((entry) => entry.kind === 'worker-dispatch')).toBe(true);
    });

    test('returns failed when delegate runner receives no command and no prompt', async () => {
        const runner = createPilotDelegateRunner('current', {
            local: {
                runCommand: () => ({
                    status: 'completed',
                    backend: 'local-child',
                    normalized_channel: 'current',
                    stdout: 'should not run',
                }),
            },
        });

        const result = await runner({
            skill: 'rd3:sys-testing',
            args: {},
            cwd: '/tmp/example',
            timeout_ms: 1000,
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('No executable payload');
    });

    test('fails unsupported direct-skill phases in the pilot runner', async () => {
        const runner = createPilotPhaseRunner();
        const plan = generateExecutionPlan('0276', 'complex');
        const phase = plan.phases.find((entry) => entry.number === 8);
        if (!phase) {
            throw new Error('Expected phase 8 to exist');
        }
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
            stateDir: process.cwd(),
            projectRoot: process.cwd(),
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('does not yet support phase 8');
    });
});

function createMinimalState(plan: ReturnType<typeof generateExecutionPlan>): OrchestrationState {
    return {
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
    };
}

describe('buildWorkerPrompt', () => {
    test('includes anti-recursion rules for phase 5', () => {
        const plan = generateExecutionPlan('0276', 'simple');
        plan.execution_channel = 'codex';
        const phase = plan.phases[0];
        const prompt = buildWorkerPrompt(phase, {
            plan,
            state: createMinimalState(plan),
            stateDir: process.cwd(),
            projectRoot: process.cwd(),
        });

        for (const rule of PHASE_WORKER_CONTRACTS[5].anti_recursion_rules) {
            expect(prompt).toContain(rule);
        }
    });

    test('includes anti-recursion rules for phase 7', () => {
        const plan = generateExecutionPlan('0276', 'review');
        plan.execution_channel = 'codex';
        const phase = plan.phases[0];
        const prompt = buildWorkerPrompt(phase, {
            plan,
            state: createMinimalState(plan),
            stateDir: process.cwd(),
            projectRoot: process.cwd(),
        });

        for (const rule of PHASE_WORKER_CONTRACTS[7].anti_recursion_rules) {
            expect(prompt).toContain(rule);
        }
    });

    test('includes worker contract version string', () => {
        const plan = generateExecutionPlan('0276', 'simple');
        plan.execution_channel = 'codex';
        const phase = plan.phases[0];
        const prompt = buildWorkerPrompt(phase, {
            plan,
            state: createMinimalState(plan),
            stateDir: process.cwd(),
            projectRoot: process.cwd(),
        });

        expect(prompt).toContain(PHASE_WORKER_CONTRACT_VERSION);
    });

    test('includes canonical backbone from worker contract', () => {
        const plan = generateExecutionPlan('0276', 'simple');
        plan.execution_channel = 'codex';
        const phase = plan.phases[0];
        const prompt = buildWorkerPrompt(phase, {
            plan,
            state: createMinimalState(plan),
            stateDir: process.cwd(),
            projectRoot: process.cwd(),
        });

        expect(prompt).toContain(PHASE_WORKER_CONTRACTS[5].canonical_backbone.join(', '));
    });

    test('includes output contract keys', () => {
        const plan = generateExecutionPlan('0276', 'simple');
        plan.execution_channel = 'codex';
        const phase = plan.phases[0];
        const prompt = buildWorkerPrompt(phase, {
            plan,
            state: createMinimalState(plan),
            stateDir: process.cwd(),
            projectRoot: process.cwd(),
        });

        expect(prompt).toContain(PHASE_WORKER_CONTRACTS[5].output_keys.join(', '));
    });

    test('includes well-formed JSON phase context', () => {
        const plan = generateExecutionPlan('0276', 'review');
        plan.execution_channel = 'codex';
        const phase = plan.phases[0];
        const prompt = buildWorkerPrompt(phase, {
            plan,
            state: createMinimalState(plan),
            stateDir: process.cwd(),
            projectRoot: process.cwd(),
        });

        const jsonMatch = prompt.match(/Phase context:\n([\s\S]*?)\nReturn/);
        expect(jsonMatch).not.toBeNull();
        const parsed = JSON.parse((jsonMatch as RegExpMatchArray)[1]);
        expect(parsed.phase).toBe(7);
        expect(parsed.phase_name).toBe('Code Review');
        expect(parsed.profile).toBe('review');
    });
});
