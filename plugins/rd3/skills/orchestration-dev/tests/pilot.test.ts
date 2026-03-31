import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { setGlobalSilent } from '../../../scripts/logger';
import { generateExecutionPlan } from '../scripts/plan';
import { buildWorkerPrompt, createPilotDelegateRunner, createPilotPhaseRunner } from '../scripts/pilot';
import { PHASE_WORKER_CONTRACTS, PHASE_WORKER_CONTRACT_VERSION } from '../scripts/contracts';
import { getVerificationProfilePath, loadVerificationProfile } from '../scripts/verification-profiles';
import { getOrchestrationStatePath } from '../scripts/runtime';
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

function writeVerificationProfile(profileId: string, profile: object): void {
    const profilePath = getVerificationProfilePath(profileId);
    const profileDir = dirname(profilePath);
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf-8');
    tempDirs.push(profileDir);
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

    test('uses the default checker when a phase 6 verification step omits checker config', async () => {
        const dir = createTempDir('orchestration-pilot-profile-no-checker-');
        writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { typecheck: 'true' } }));
        writeFileSync(join(dir, 'tsconfig.json'), '{}');
        writeFileSync(join(dir, 'biome.json'), '{}');
        writeVerificationProfile('test-no-checker', {
            id: 'test-no-checker',
            label: 'Test No Checker',
            phase6: {
                required_files: ['package.json'],
                steps: [
                    {
                        name: 'typecheck-no-checker',
                        skill: 'rd3:sys-testing',
                        command: 'bun run typecheck',
                        prompt: 'Run typecheck without an explicit checker',
                    },
                ],
            },
        });

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
            state: createMinimalState(plan),
            stateDir: dir,
            projectRoot: dir,
            stackProfile: 'test-no-checker',
        });

        expect(result.status).toBe('completed');
        expect(result.evidence?.some((entry) => entry.detail.includes('typecheck-no-checker: completed'))).toBe(true);
    });

    test('delegates phase 5 worker execution through the phase executor on ACP channels', async () => {
        const dir = createTempDir('orchestration-pilot-phase5-acp-');
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
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('completed');
        expect(commands).toHaveLength(1);
        expect(commands[0][3]).toBe('codex');
        expect(commands[0][5]).toContain('Run rd3 worker agent `rd3:super-coder` in worker mode for Phase 5');
        expect(commands[0][5]).toContain('Canonical backbone: rd3:code-implement-common');
        expect(result.evidence?.some((entry) => entry.detail.includes('validate-artifacts: completed'))).toBe(true);
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
        expect(commands[0][5]).toContain('Run `bun run typecheck` in the repo root.');
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
        expect(result.error).toContain('tests failed');
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

    test('runs phase 5 worker execution locally on the current channel', async () => {
        const dir = createTempDir('orchestration-pilot-phase5-current-');
        const prompts: string[] = [];
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: (prompt) => {
                    prompts.push(prompt);
                    return {
                        status: 'completed',
                        backend: 'local-child',
                        normalized_channel: 'current',
                        stdout: JSON.stringify({
                            status: 'completed',
                            phase: 5,
                            artifacts: [{ path: 'src/example.ts', type: 'source-file' }],
                            evidence_summary: ['implementation applied locally'],
                            next_step_recommendation: 'proceed_to_phase_6',
                        }),
                    };
                },
            },
        });
        const plan = generateExecutionPlan('0276', 'simple');
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
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('completed');
        expect(prompts).toHaveLength(1);
        expect(prompts[0]).toContain('Run rd3 worker agent `rd3:super-coder` in worker mode for Phase 5');
        expect(result.evidence?.some((entry) => entry.detail.includes('validate-artifacts: completed'))).toBe(true);
        expect(result.result).toMatchObject({
            status: 'completed',
            phase: 5,
            next_step_recommendation: 'proceed_to_phase_6',
        });
    });

    test('runs phase 7 worker execution locally on the current channel', async () => {
        const dir = createTempDir('orchestration-pilot-phase7-current-');
        const prompts: string[] = [];
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: (prompt) => {
                    prompts.push(prompt);
                    return {
                        status: 'completed',
                        backend: 'local-child',
                        normalized_channel: 'current',
                        stdout: JSON.stringify({
                            status: 'completed',
                            phase: 7,
                            findings: [],
                            evidence_summary: ['review completed locally'],
                            next_step_recommendation: 'proceed_to_phase_8',
                        }),
                    };
                },
            },
        });
        const plan = generateExecutionPlan('0276', 'review');
        const result = await runner(plan.phases[0], {
            plan,
            state: {
                ...createMinimalState(plan),
                auto_approve_human_gates: true,
            },
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('completed');
        expect(prompts).toHaveLength(1);
        expect(prompts[0]).toContain('Run rd3 worker agent `rd3:super-reviewer` in worker mode for Phase 7');
        expect(result.evidence?.some((entry) => entry.detail.includes('validate-review: completed'))).toBe(true);
        expect(result.result).toMatchObject({
            status: 'completed',
            phase: 7,
            next_step_recommendation: 'proceed_to_phase_8',
        });
    });

    test('pins direct-skill phases to the current channel even when the plan channel is remote', async () => {
        const dir = createTempDir('orchestration-pilot-phase1-remote-plan-');
        const prompts: string[] = [];
        const acpCommands: string[][] = [];
        const plan = generateExecutionPlan('0276', 'complex');
        plan.execution_channel = 'codex';
        const phase = plan.phases[0];
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: (prompt) => {
                    prompts.push(prompt);
                    return {
                        status: 'completed',
                        backend: 'local-child',
                        normalized_channel: 'current',
                        stdout: 'phase 1 completed locally',
                    };
                },
            },
            acp: {
                acpxExec: (command) => {
                    acpCommands.push(command);
                    return {
                        ok: true,
                        stdout: 'unexpected ACP dispatch',
                        stderr: '',
                        exitCode: 0,
                    };
                },
            },
        });

        const result = await runner(phase, {
            plan,
            state: createMinimalState(plan),
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('completed');
        expect(prompts).toHaveLength(1);
        expect(acpCommands).toHaveLength(0);
        expect(result.evidence?.some((entry) => entry.detail.includes('validate-requirements: completed'))).toBe(true);
    });

    test('pauses review phases inside CoV human approval nodes', async () => {
        const dir = createTempDir('orchestration-pilot-phase7-human-pause-');
        const plan = generateExecutionPlan('0276', 'review');
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: () => ({
                    status: 'completed',
                    backend: 'local-child',
                    normalized_channel: 'current',
                    stdout: JSON.stringify({
                        status: 'completed',
                        phase: 7,
                        findings: [],
                        evidence_summary: ['review completed locally'],
                        next_step_recommendation: 'proceed_to_phase_8',
                    }),
                }),
            },
        });

        const result = await runner(plan.phases[0], {
            plan,
            state: createMinimalState(plan),
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('paused');
        expect(result.evidence?.some((entry) => entry.detail.includes('human-approval'))).toBe(true);
    });

    test('auto-approves CoV human nodes when orchestration auto mode is enabled', async () => {
        const dir = createTempDir('orchestration-pilot-phase7-human-auto-');
        const plan = generateExecutionPlan('0276', 'review');
        const state = createMinimalState(plan);
        state.auto_approve_human_gates = true;
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: () => ({
                    status: 'completed',
                    backend: 'local-child',
                    normalized_channel: 'current',
                    stdout: JSON.stringify({
                        status: 'completed',
                        phase: 7,
                        findings: [],
                        evidence_summary: ['review completed locally'],
                        next_step_recommendation: 'proceed_to_phase_8',
                    }),
                }),
            },
        });

        const result = await runner(plan.phases[0], {
            plan,
            state,
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('completed');
        expect(result.evidence?.some((entry) => entry.detail.includes('human-approval'))).toBe(false);
    });

    test('fails worker-agent execution when the ACP worker does not return a valid JSON envelope', async () => {
        const dir = createTempDir('orchestration-pilot-invalid-acp-envelope-');
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
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('expected a JSON worker envelope');
        expect(result.evidence?.some((entry) => entry.detail.includes('validate-review: failed'))).toBe(true);
    });

    test('fails worker-agent execution when the worker returns no stdout envelope', async () => {
        const dir = createTempDir('orchestration-pilot-no-stdout-envelope-');
        const plan = generateExecutionPlan('0276', 'simple');
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: () => ({
                    status: 'completed',
                    backend: 'local-child',
                    normalized_channel: 'current',
                    stderr: 'worker produced no stdout',
                }),
            },
        });

        const result = await runner(plan.phases[0], {
            plan,
            state: createMinimalState(plan),
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('returned no stdout envelope');
        expect(result.evidence).toHaveLength(2);
    });

    test('fails worker-agent execution when the worker returns blank stdout', async () => {
        const dir = createTempDir('orchestration-pilot-blank-envelope-');
        const plan = generateExecutionPlan('0276', 'review');
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: () => ({
                    status: 'completed',
                    backend: 'local-child',
                    normalized_channel: 'current',
                    stdout: '   \n',
                }),
            },
        });

        const result = await runner(plan.phases[0], {
            plan,
            state: createMinimalState(plan),
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('empty stdout');
        expect(result.evidence?.some((entry) => entry.detail.includes('validate-review: failed'))).toBe(true);
    });

    test('fails worker-agent execution when the worker returns a non-object JSON envelope', async () => {
        const dir = createTempDir('orchestration-pilot-array-envelope-');
        const plan = generateExecutionPlan('0276', 'review');
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: () => ({
                    status: 'completed',
                    backend: 'local-child',
                    normalized_channel: 'current',
                    stdout: '[]',
                }),
            },
        });

        const result = await runner(plan.phases[0], {
            plan,
            state: createMinimalState(plan),
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('JSON object');
        expect(result.evidence?.some((entry) => entry.detail.includes('validate-review: failed'))).toBe(true);
    });

    test('fails worker-agent execution when no downstream evidence contract exists', async () => {
        const dir = createTempDir('orchestration-pilot-missing-contract-');
        const plan = generateExecutionPlan('0276', 'review');
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: () => ({
                    status: 'completed',
                    backend: 'local-child',
                    normalized_channel: 'current',
                    stdout: JSON.stringify({
                        status: 'completed',
                        phase: 7,
                        findings: [],
                        evidence_summary: ['review completed'],
                        next_step_recommendation: 'proceed_to_phase_8',
                    }),
                }),
            },
        });

        const result = await runner(
            {
                ...plan.phases[0],
                executor: 'rd3:missing-worker-contract',
            },
            {
                plan,
                state: createMinimalState(plan),
                stateDir: dir,
                projectRoot: dir,
            },
        );

        expect(result.status).toBe('failed');
        expect(result.error).toContain('No downstream evidence contract registered');
        expect(result.evidence?.some((entry) => entry.detail.includes('validate-review: failed'))).toBe(true);
    });

    test('fails worker-agent execution when the worker envelope violates the contract', async () => {
        const dir = createTempDir('orchestration-pilot-contract-violation-');
        const plan = generateExecutionPlan('0276', 'review');
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: () => ({
                    status: 'completed',
                    backend: 'local-child',
                    normalized_channel: 'current',
                    stdout: JSON.stringify({
                        status: 'failed',
                        phase: 6,
                        evidence_summary: ['review failed'],
                    }),
                }),
            },
        });

        const result = await runner(plan.phases[0], {
            plan,
            state: createMinimalState(plan),
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('Missing required worker field: findings');
        expect(result.error).toContain('phase mismatch');
        expect(result.error).toContain('must include failed_stage');
        expect(result.error).toContain('next_step_recommendation');
    });

    test('fails worker-agent execution when the worker envelope status is invalid', async () => {
        const dir = createTempDir('orchestration-pilot-invalid-status-');
        const plan = generateExecutionPlan('0276', 'review');
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: () => ({
                    status: 'completed',
                    backend: 'local-child',
                    normalized_channel: 'current',
                    stdout: JSON.stringify({
                        status: 'unknown',
                        phase: 7,
                        findings: [],
                        evidence_summary: ['review drifted'],
                        next_step_recommendation: 'investigate',
                    }),
                }),
            },
        });

        const result = await runner(plan.phases[0], {
            plan,
            state: createMinimalState(plan),
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('status must be one of completed, failed, paused');
    });

    test('surfaces the default paused-envelope error when no error summary is provided', async () => {
        const dir = createTempDir('orchestration-pilot-paused-envelope-');
        const plan = generateExecutionPlan('0276', 'review');
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: () => ({
                    status: 'completed',
                    backend: 'local-child',
                    normalized_channel: 'current',
                    stdout: JSON.stringify({
                        status: 'paused',
                        phase: 7,
                        findings: [],
                        evidence_summary: ['awaiting reviewer input'],
                        next_step_recommendation: 'await_human_review',
                    }),
                }),
            },
        });

        const result = await runner(plan.phases[0], {
            plan,
            state: createMinimalState(plan),
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('paused');
        expect(result.error).toContain('Worker envelope returned status paused for phase 7');
        expect(result.result).toMatchObject({
            status: 'paused',
            phase: 7,
        });
    });

    test('fails worker-agent execution when the worker envelope has contradictory completed status with failed_stage', async () => {
        const dir = createTempDir('orchestration-pilot-contradictory-envelope-');
        const plan = generateExecutionPlan('0276', 'review');
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: () => ({
                    status: 'completed',
                    backend: 'local-child',
                    normalized_channel: 'current',
                    stdout: JSON.stringify({
                        status: 'completed',
                        phase: 7,
                        findings: [],
                        evidence_summary: ['review completed'],
                        next_step_recommendation: 'proceed_to_phase_8',
                        failed_stage: 'code-review',
                    }),
                }),
            },
        });

        const result = await runner(plan.phases[0], {
            plan,
            state: createMinimalState(plan),
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('contradictory');
        expect(result.evidence?.some((entry) => entry.detail.includes('validate-review: failed'))).toBe(true);
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

    test('runs direct-skill phases through the CoV gate runner', async () => {
        const dir = createTempDir('orchestration-pilot-direct-cov-');
        const prompts: string[] = [];
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: (prompt) => {
                    prompts.push(prompt);
                    return {
                        status: 'completed',
                        backend: 'local-child',
                        normalized_channel: 'current',
                        stdout: 'bdd completed',
                    };
                },
            },
        });
        const plan = generateExecutionPlan('0276', 'complex');
        const phase = plan.phases.find((entry) => entry.number === 8);
        if (!phase) {
            throw new Error('Expected phase 8 to exist');
        }
        const result = await runner(phase, {
            plan,
            state: {
                ...createMinimalState(plan),
                auto_approve_human_gates: true,
            },
            stateDir: dir,
            projectRoot: dir,
        });

        expect(result.status).toBe('completed');
        expect(prompts).toHaveLength(1);
        expect(prompts[0]).toContain('Execute Phase 8');
        expect(result.evidence?.some((entry) => entry.detail.includes('validate-functional: completed'))).toBe(true);
    });

    test('stores CoV state and gate evidence under the canonical run artifact directory', async () => {
        const dir = createTempDir('orchestration-pilot-run-artifacts-');
        const statePath = getOrchestrationStatePath('0276', dir, 'run-123');
        const runner = createPilotPhaseRunner({
            local: {
                runPrompt: () => ({
                    status: 'completed',
                    backend: 'local-child',
                    normalized_channel: 'current',
                    stdout: 'functional review mocked',
                }),
            },
        });
        const plan = generateExecutionPlan('0276', 'complex');
        const phase = plan.phases.find((entry) => entry.number === 8);
        if (!phase) {
            throw new Error('Expected phase 8 to exist');
        }

        const result = await runner(phase, {
            plan,
            state: {
                ...createMinimalState(plan),
                auto_approve_human_gates: true,
            },
            stateDir: dir,
            projectRoot: dir,
            statePath,
        });

        expect(result.status).toBe('completed');

        const covPath = join(
            dir,
            'docs',
            '.workflow-runs',
            'rd3-orchestration-dev',
            '0276',
            'run-123',
            'cov',
            'phase8-functional-review-0276-0276-cov-state.json',
        );
        const gatePath = join(
            dir,
            'docs',
            '.workflow-runs',
            'rd3-orchestration-dev',
            '0276',
            'run-123',
            'gates',
            'phase-8-validate-functional.json',
        );

        expect(existsSync(covPath)).toBe(true);
        expect(existsSync(gatePath)).toBe(true);
        expect(readFileSync(gatePath, 'utf-8')).toContain('"status": "completed"');
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
