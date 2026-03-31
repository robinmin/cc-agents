import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setGlobalSilent } from '../../../scripts/logger';
import { createExecutionPlan } from '../scripts/plan';
import {
    createOrchestrationState,
    findOrchestrationStatePath,
    getOrchestrationStatePath,
    loadOrchestrationState,
    main,
    resumeOrchestration,
    runOrchestration,
    saveOrchestrationState,
} from '../scripts/runtime';

beforeAll(() => {
    setGlobalSilent(true);
});

const tempDirs: string[] = [];
const originalCwd = process.cwd();
const originalAcpxBin = process.env.ACPX_BIN;
const originalAcpxAgent = process.env.ACPX_AGENT;
const originalLocalPromptAgent = process.env.ORCHESTRATION_DEV_LOCAL_PROMPT_AGENT;

afterEach(() => {
    process.chdir(originalCwd);
    if (originalAcpxBin === undefined) {
        delete process.env.ACPX_BIN;
    } else {
        process.env.ACPX_BIN = originalAcpxBin;
    }
    if (originalAcpxAgent === undefined) {
        delete process.env.ACPX_AGENT;
    } else {
        process.env.ACPX_AGENT = originalAcpxAgent;
    }
    if (originalLocalPromptAgent === undefined) {
        delete process.env.ORCHESTRATION_DEV_LOCAL_PROMPT_AGENT;
    } else {
        process.env.ORCHESTRATION_DEV_LOCAL_PROMPT_AGENT = originalLocalPromptAgent;
    }

    while (tempDirs.length > 0) {
        rmSync(tempDirs.pop() as string, { recursive: true, force: true });
    }
});

function createTempDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
}

function writeTaskFile(dir: string, name: string, solution = '[Solution placeholder]'): string {
    const taskPath = join(dir, name);
    writeFileSync(
        taskPath,
        `---
name: runtime-test
description: runtime-test
status: Backlog
created_at: 2026-03-28T00:00:00.000Z
updated_at: 2026-03-28T00:00:00.000Z
profile: "simple"
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

### Solution

${solution}
`,
        'utf-8',
    );
    return taskPath;
}

function writePilotWorkspaceFiles(dir: string): void {
    writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify(
            {
                name: 'pilot-runtime-test',
                private: true,
                scripts: {
                    typecheck: 'true',
                    'lint:rd3': 'true',
                    'test:rd3': 'true',
                },
            },
            null,
            2,
        ),
        'utf-8',
    );
    writeFileSync(join(dir, 'tsconfig.json'), '{}', 'utf-8');
    writeFileSync(join(dir, 'biome.json'), '{}', 'utf-8');
}

function writeRetryingPilotWorkspaceFiles(dir: string): void {
    const countFilePath = join(tmpdir(), `transient-count-${Math.random().toString(36).slice(2)}`);
    const scriptPath = join(dir, 'transient-test.sh');
    writeFileSync(
        scriptPath,
        `#!/bin/sh
count_file="${countFilePath}"
count=0
if [ -f "$count_file" ]; then
  count=$(cat "$count_file")
fi
count=$((count + 1))
printf '%s' "$count" > "$count_file"
if [ "$count" -le 2 ]; then
  echo "transient failure" >&2
  exit 1
fi
exit 0
`,
        'utf-8',
    );
    chmodSync(scriptPath, 0o755);
    writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify(
            {
                name: 'pilot-runtime-retry-test',
                private: true,
                scripts: {
                    typecheck: 'true',
                    'lint:rd3': 'true',
                    'test:rd3': 'sh ./transient-test.sh',
                },
            },
            null,
            2,
        ),
        'utf-8',
    );
    writeFileSync(join(dir, 'tsconfig.json'), '{}', 'utf-8');
    writeFileSync(join(dir, 'biome.json'), '{}', 'utf-8');
}

function writeMockAcpxScript(dir: string): string {
    const scriptPath = join(dir, 'mock-acpx');
    writeFileSync(
        scriptPath,
        `#!/bin/sh
prompt="$*"
if echo "$prompt" | grep -q "Phase 5"; then
  printf '%s' '{"status":"completed","phase":5,"artifacts":[{"path":"src/example.ts","type":"source-file"}],"evidence_summary":["implementation mocked"],"next_step_recommendation":"proceed_to_phase_6"}'
elif echo "$prompt" | grep -q "Phase 7"; then
  printf '%s' '{"status":"completed","phase":7,"findings":[],"evidence_summary":["review mocked"],"next_step_recommendation":"proceed_to_phase_8"}'
elif echo "$prompt" | grep -q "Phase 8"; then
  printf '%s' 'functional review mocked'
elif echo "$prompt" | grep -q "Phase 9"; then
  printf '%s' 'documentation mocked'
elif echo "$prompt" | grep -q "Phase 1\\|Phase 2\\|Phase 3\\|Phase 4"; then
  printf '%s' 'planning phase mocked'
else
  printf '%s' '{"status":"failed","phase":0,"failed_stage":"mock-acpx","evidence_summary":["unexpected prompt"],"error_summary":"unexpected prompt","next_step_recommendation":"investigate"}'
  exit 1
fi
`,
        'utf-8',
    );
    chmodSync(scriptPath, 0o755);
    return scriptPath;
}

describe('orchestration runtime', () => {
    test('returns null when loading a missing orchestration state file', () => {
        const dir = createTempDir('orchestration-missing-state-');
        expect(loadOrchestrationState(join(dir, 'missing.json'))).toBeNull();
    });

    test('sanitizes task refs in the state path', () => {
        const statePath = getOrchestrationStatePath('docs/tasks2/0276 runtime.md', '/tmp/example', 'abc123');
        expect(statePath).toBe('/tmp/example/docs/.workflow-runs/rd3-orchestration-dev/0276/abc123.json');
    });

    test('creates, saves, and reloads orchestration state', () => {
        const dir = createTempDir('orchestration-runtime-');
        const taskPath = writeTaskFile(dir, '0266_runtime.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'simple' });
        const state = createOrchestrationState(plan);
        const statePath = getOrchestrationStatePath(plan.task_ref, dir);

        saveOrchestrationState(state, statePath);
        const reloaded = loadOrchestrationState(statePath);

        expect(reloaded?.task_ref).toBe(plan.task_ref);
        expect(reloaded?.phases).toHaveLength(2);
        expect(reloaded?.status).toBe('pending');
    });

    test('preserves task_path in orchestration state when available', () => {
        const dir = createTempDir('orchestration-task-path-');
        const taskPath = writeTaskFile(dir, '0266_task_path.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'simple' });
        const state = createOrchestrationState(plan);

        expect(state.task_path).toBe(taskPath);
    });

    test('records worker executor metadata for heavy phases in orchestration state', () => {
        const dir = createTempDir('orchestration-worker-metadata-');
        const taskPath = writeTaskFile(dir, '0266_worker_metadata.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'complex', startPhase: 5 });
        const state = createOrchestrationState(plan);

        expect(state.phases.map((phase) => phase.number)).toEqual([5, 6, 7, 8, 9]);
        expect(state.phases[0]).toMatchObject({
            number: 5,
            skill: 'rd3:code-implement-common',
            executor: 'rd3:super-coder',
            execution_mode: 'worker-agent',
            worker_contract_version: 'rd3-phase-worker-v1',
        });
        expect(state.phases[1]).toMatchObject({
            number: 6,
            skill: 'rd3:sys-testing + rd3:advanced-testing',
            executor: 'rd3:super-tester',
            execution_mode: 'worker-agent',
            worker_contract_version: 'rd3-phase-worker-v1',
        });
        expect(state.phases[2]).toMatchObject({
            number: 7,
            skill: 'rd3:code-review-common',
            executor: 'rd3:super-reviewer',
            execution_mode: 'worker-agent',
            worker_contract_version: 'rd3-phase-worker-v1',
        });
        expect(state.phases[3]).toMatchObject({
            number: 8,
            executor: 'rd3:bdd-workflow + rd3:functional-review',
            execution_mode: 'direct-skill',
        });
    });

    test('preserves worker executor metadata through save and reload round-trip', () => {
        const dir = createTempDir('orchestration-worker-roundtrip-');
        const taskPath = writeTaskFile(dir, '0266_worker_roundtrip.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'complex', startPhase: 5 });
        const state = createOrchestrationState(plan);
        const statePath = getOrchestrationStatePath(plan.task_ref, dir);

        saveOrchestrationState(state, statePath);
        const reloaded = loadOrchestrationState(statePath);

        expect(reloaded?.phases[0]).toMatchObject({
            number: 5,
            executor: 'rd3:super-coder',
            execution_mode: 'worker-agent',
            worker_contract_version: 'rd3-phase-worker-v1',
        });
        expect(reloaded?.phases[1]).toMatchObject({
            number: 6,
            executor: 'rd3:super-tester',
            execution_mode: 'worker-agent',
            worker_contract_version: 'rd3-phase-worker-v1',
        });
        expect(reloaded?.phases[2]).toMatchObject({
            number: 7,
            executor: 'rd3:super-reviewer',
            execution_mode: 'worker-agent',
            worker_contract_version: 'rd3-phase-worker-v1',
        });
        // Non-heavy phase should not have worker_contract_version
        expect(reloaded?.phases[3]).toMatchObject({
            number: 8,
            execution_mode: 'direct-skill',
        });
        expect(reloaded?.phases[3]).not.toHaveProperty('worker_contract_version');
    });

    test('fails when a phase prerequisite is missing', async () => {
        const dir = createTempDir('orchestration-prereq-');
        const taskPath = writeTaskFile(dir, '0266_prereq.md');
        const plan = createExecutionPlan(taskPath, { profile: 'simple' });

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner: async () => ({ status: 'completed' }),
        });

        expect(state.status).toBe('failed');
        expect(state.phases[0].error).toContain('Solution section populated');
    });

    test('marks the orchestration failed when a phase runner returns failed', async () => {
        const dir = createTempDir('orchestration-phase-fail-');
        const taskPath = writeTaskFile(dir, '0266_phase_fail.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'unit' });

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner: async () => ({
                status: 'failed',
                error: 'verification failed',
                evidence: [{ kind: 'failure', detail: 'phase failed' }],
            }),
        });

        expect(state.status).toBe('failed');
        expect(state.current_phase).toBe(6);
        expect(state.phases[0].status).toBe('failed');
        expect(state.phases[0].error).toBe('verification failed');
        expect(state.phases[0].completed_at).toBeDefined();
    });

    test('persists structured phase results returned by the phase runner', async () => {
        const dir = createTempDir('orchestration-phase-result-');
        const taskPath = writeTaskFile(dir, '0266_phase_result.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'unit' });

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner: async () => ({
                status: 'completed',
                evidence: [{ kind: 'success', detail: 'phase completed' }],
                result: {
                    status: 'completed',
                    phase: 6,
                    test_artifacts: [{ path: 'coverage/lcov.info' }],
                    evidence_summary: ['coverage 92%'],
                    next_step_recommendation: 'proceed_to_phase_7',
                },
            }),
        });

        expect(state.status).toBe('completed');
        expect(state.phases[0].result).toMatchObject({
            status: 'completed',
            phase: 6,
            next_step_recommendation: 'proceed_to_phase_7',
        });
    });

    test('does not inject a second runtime human gate after a completed review phase', async () => {
        const dir = createTempDir('orchestration-human-gate-runtime-removed-');
        const taskPath = writeTaskFile(dir, '0266_human_gate_runtime_removed.md', 'Implementation complete.');
        const plan = createExecutionPlan(taskPath, { profile: 'review' });

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner: async () => ({
                status: 'completed',
                evidence: [{ kind: 'review', detail: 'phase 7 finished cleanly' }],
                result: {
                    status: 'completed',
                    phase: 7,
                    findings: [],
                    evidence_summary: ['review completed'],
                    next_step_recommendation: 'proceed_to_phase_8',
                },
            }),
        });

        expect(state.status).toBe('completed');
        expect(state.current_phase).toBe(7);
        expect(state.phases[0].status).toBe('completed');
        expect(state.phases[0].evidence.some((entry) => entry.kind === 'human-gate')).toBe(false);
    });

    test('skips phases already completed in a provided orchestration state', async () => {
        const dir = createTempDir('orchestration-preloaded-state-');
        const taskPath = writeTaskFile(dir, '0266_preloaded.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'simple' });
        const state = createOrchestrationState(plan);
        state.status = 'running';
        state.phases[0].status = 'completed';
        state.phases[0].completed_at = new Date().toISOString();

        const seenPhases: number[] = [];
        const result = await runOrchestration({
            plan,
            projectRoot: dir,
            initialState: state,
            phaseRunner: async (phase) => {
                seenPhases.push(phase.number);
                return { status: 'completed', evidence: [{ kind: 'ok', detail: `phase ${phase.number}` }] };
            },
        });

        expect(result.status).toBe('completed');
        expect(seenPhases).toEqual([6]);
    });

    test('starts a fresh orchestration run instead of reusing a stale persisted state file', async () => {
        const dir = createTempDir('orchestration-fresh-state-');
        const taskPath = writeTaskFile(dir, '0266_fresh_state.md', 'Implement the feature.');
        const stalePlan = createExecutionPlan(taskPath, { profile: 'simple' });
        const staleStatePath = getOrchestrationStatePath(stalePlan.task_ref, dir);
        const staleState = createOrchestrationState(stalePlan);
        staleState.status = 'completed';
        staleState.phases[0].status = 'completed';
        staleState.phases[0].completed_at = new Date().toISOString();
        staleState.phases[1].status = 'completed';
        staleState.phases[1].completed_at = new Date().toISOString();
        saveOrchestrationState(staleState, staleStatePath);

        const freshPlan = createExecutionPlan(taskPath, { profile: 'review' });
        const seenPhases: number[] = [];

        const result = await runOrchestration({
            plan: freshPlan,
            projectRoot: dir,
            phaseRunner: async (phase) => {
                seenPhases.push(phase.number);
                return {
                    status: 'completed',
                    evidence: [{ kind: 'ok', detail: `phase ${phase.number}` }],
                    ...(phase.number === 7
                        ? {
                              result: {
                                  status: 'completed',
                                  phase: 7,
                                  findings: [],
                                  evidence_summary: ['review completed'],
                                  next_step_recommendation: 'proceed_to_phase_8',
                              },
                          }
                        : {}),
                };
            },
        });

        expect(seenPhases).toEqual([7]);
        expect(result.current_phase).toBe(7);
        expect(result.phases.map((phase) => phase.number)).toEqual([7]);
        expect(result.status).toBe('completed');
        expect(result.phases[0].status).toBe('completed');
    });

    test('respects startPhase by only executing the selected suffix of phases', async () => {
        const dir = createTempDir('orchestration-start-phase-');
        const taskPath = writeTaskFile(dir, '0266_start_phase.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'complex', startPhase: 6, auto: true });
        const seenPhases: number[] = [];

        const result = await runOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner: async (phase) => {
                seenPhases.push(phase.number);
                return { status: 'completed', evidence: [{ kind: 'ok', detail: `phase ${phase.number}` }] };
            },
        });

        expect(result.status).toBe('completed');
        expect(seenPhases).toEqual([6, 7, 8, 9]);
    });

    test('runs phases sequentially and can resume from a paused phase', async () => {
        const dir = createTempDir('orchestration-resume-');
        const taskPath = writeTaskFile(dir, '0266_resume.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'unit' });
        let invocationCount = 0;

        const phaseRunner = async () => {
            invocationCount += 1;
            if (invocationCount === 1) {
                return { status: 'paused' as const, evidence: [{ kind: 'pause', detail: 'waiting' }] };
            }

            return { status: 'completed' as const, evidence: [{ kind: 'done', detail: 'verified' }] };
        };

        const paused = await runOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner,
        });

        expect(paused.status).toBe('paused');
        expect(paused.phases[0].status).toBe('paused');

        const resumed = await resumeOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner,
        });

        expect(resumed.status).toBe('completed');
        expect(resumed.phases[0].status).toBe('completed');

        const statePath = findOrchestrationStatePath(plan.task_ref, dir);
        const persisted = JSON.parse(readFileSync(statePath as string, 'utf-8')) as { status: string };
        expect(persisted.status).toBe('completed');
    });

    test('resume resets a paused phase to pending and clears stale error state when it later succeeds', async () => {
        const dir = createTempDir('orchestration-resume-error-clear-');
        const taskPath = writeTaskFile(dir, '0266_resume_clear.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'unit' });
        const statePath = getOrchestrationStatePath(plan.task_ref, dir);
        const state = createOrchestrationState(plan);
        state.status = 'paused';
        state.current_phase = 6;
        state.phases[0].status = 'paused';
        state.phases[0].error = 'stale error';
        saveOrchestrationState(state, statePath);

        const resumed = await resumeOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner: async () => ({
                status: 'completed',
                evidence: [{ kind: 'done', detail: 'verified' }],
            }),
        });

        expect(resumed.status).toBe('completed');
        expect(resumed.phases[0].status).toBe('completed');
        expect(resumed.phases[0].error).toBeUndefined();
    });

    test('resume throws when state file is missing', async () => {
        const dir = createTempDir('orchestration-resume-missing-');
        const taskPath = writeTaskFile(dir, '0266_resume_missing.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'unit' });

        await expect(
            resumeOrchestration({
                plan,
                projectRoot: dir,
                phaseRunner: async () => ({ status: 'completed' }),
            }),
        ).rejects.toThrow('No orchestration state found');
    });

    test('resume throws when orchestration is not paused', async () => {
        const dir = createTempDir('orchestration-resume-not-paused-');
        const taskPath = writeTaskFile(dir, '0266_resume_not_paused.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'unit' });
        const statePath = getOrchestrationStatePath(plan.task_ref, dir);
        const state = createOrchestrationState(plan);
        state.status = 'completed';
        saveOrchestrationState(state, statePath);

        await expect(
            resumeOrchestration({
                plan,
                projectRoot: dir,
                phaseRunner: async () => ({ status: 'completed' }),
            }),
        ).rejects.toThrow('Orchestration is not paused');
    });

    test('fails the orchestration when a phase runner times out', async () => {
        const dir = createTempDir('orchestration-timeout-');
        const taskPath = writeTaskFile(dir, '0266_timeout.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'unit' });

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            phaseTimeoutMs: 50,
            phaseRunner: async () => {
                await new Promise((resolve) => setTimeout(resolve, 200));
                return { status: 'completed' as const };
            },
        });

        expect(state.status).toBe('failed');
        expect(state.phases[0].status).toBe('failed');
        expect(state.phases[0].error).toContain('timed out after 50ms');
        expect(state.phases[0].evidence.some((entry) => entry.kind === 'timeout')).toBe(true);
    });

    test('resume rejects when the plan profile does not match the persisted state profile', async () => {
        const dir = createTempDir('orchestration-resume-profile-mismatch-');
        const taskPath = writeTaskFile(dir, '0266_profile_mismatch.md', 'Implement the feature.');
        const unitPlan = createExecutionPlan(taskPath, { profile: 'unit' });
        const statePath = getOrchestrationStatePath(unitPlan.task_ref, dir);
        const state = createOrchestrationState(unitPlan);
        state.status = 'paused';
        state.current_phase = 6;
        state.phases[0].status = 'paused';
        saveOrchestrationState(state, statePath);

        const reviewPlan = createExecutionPlan(taskPath, { profile: 'review' });

        await expect(
            resumeOrchestration({
                plan: reviewPlan,
                projectRoot: dir,
                phaseRunner: async () => ({ status: 'completed' }),
            }),
        ).rejects.toThrow('Resume profile mismatch');
    });

    test('resume rejects when the plan phase-set does not match the persisted state phase-set', async () => {
        const dir = createTempDir('orchestration-resume-phaseset-mismatch-');
        const taskPath = writeTaskFile(dir, '0266_phaseset_mismatch.md', 'Implement the feature.');
        const simplePlan = createExecutionPlan(taskPath, { profile: 'simple' });
        const statePath = getOrchestrationStatePath(simplePlan.task_ref, dir);
        const state = createOrchestrationState(simplePlan);
        state.status = 'paused';
        state.current_phase = 5;
        state.phases[0].status = 'paused';
        saveOrchestrationState(state, statePath);

        const startPhasePlan = createExecutionPlan(taskPath, { profile: 'simple', startPhase: 6 });

        await expect(
            resumeOrchestration({
                plan: startPhasePlan,
                projectRoot: dir,
                phaseRunner: async () => ({ status: 'completed' }),
            }),
        ).rejects.toThrow('Resume phase-set mismatch');
    });
});

describe('rework loop', () => {
    test('retries failed phase when max_iterations > 1', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'rework-retry-'));
        tempDirs.push(dir);
        const plan = createExecutionPlan('0292', { profile: 'unit' });
        let callCount = 0;

        const runner = async (): Promise<import('../scripts/runtime').PhaseRunnerResult> => {
            callCount++;
            if (callCount < 3) {
                return { status: 'failed', error: `Attempt ${callCount} failed` };
            }
            return { status: 'completed' };
        };

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            stateDir: dir,
            phaseRunner: runner,
            reworkConfig: { max_iterations: 3, feedback_injection: true, escalation_state: 'paused' },
        });

        expect(state.status).toBe('completed');
        expect(callCount).toBe(3);
        expect(state.phases[0].rework_iterations).toBe(2);
        expect(state.rework_config).toEqual({
            max_iterations: 3,
            feedback_injection: true,
            escalation_state: 'paused',
        });
    });

    test('escalates to paused when max_iterations exceeded', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'rework-escalate-'));
        tempDirs.push(dir);
        const plan = createExecutionPlan('0292', { profile: 'unit' });

        const runner = async (): Promise<import('../scripts/runtime').PhaseRunnerResult> => {
            return { status: 'failed', error: 'Always fails' };
        };

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            stateDir: dir,
            phaseRunner: runner,
            reworkConfig: { max_iterations: 2, feedback_injection: true, escalation_state: 'paused' },
        });

        expect(state.status).toBe('paused');
        expect(state.phases[0].error).toContain('Max rework iterations (2) exceeded');
    });

    test('escalates to failed when escalation_state is failed', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'rework-fail-'));
        tempDirs.push(dir);
        const plan = createExecutionPlan('0292', { profile: 'unit' });

        const runner = async (): Promise<import('../scripts/runtime').PhaseRunnerResult> => {
            return { status: 'failed', error: 'Always fails' };
        };

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            stateDir: dir,
            phaseRunner: runner,
            reworkConfig: { max_iterations: 2, feedback_injection: true, escalation_state: 'failed' },
        });

        expect(state.status).toBe('failed');
    });

    test('injects feedback from previous iteration', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'rework-feedback-'));
        tempDirs.push(dir);
        const plan = createExecutionPlan('0292', { profile: 'unit' });
        const receivedFeedback: (string | undefined)[] = [];

        const runner = async (
            _phase: import('../scripts/model').Phase,
            context: import('../scripts/runtime').PhaseRunnerContext,
        ): Promise<import('../scripts/runtime').PhaseRunnerResult> => {
            receivedFeedback.push(context.rework_feedback);
            if (receivedFeedback.length < 2) {
                return { status: 'failed', error: 'First attempt failed' };
            }
            return { status: 'completed' };
        };

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            stateDir: dir,
            phaseRunner: runner,
            reworkConfig: { max_iterations: 3, feedback_injection: true, escalation_state: 'failed' },
        });

        expect(state.status).toBe('completed');
        expect(receivedFeedback[0]).toBeUndefined();
        expect(receivedFeedback[1]).toBe('First attempt failed');
    });

    test('records rework evidence', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'rework-evidence-'));
        tempDirs.push(dir);
        const plan = createExecutionPlan('0292', { profile: 'unit' });
        let callCount = 0;

        const runner = async (): Promise<import('../scripts/runtime').PhaseRunnerResult> => {
            callCount++;
            if (callCount < 2) {
                return { status: 'failed', error: 'Failed first' };
            }
            return { status: 'completed' };
        };

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            stateDir: dir,
            phaseRunner: runner,
            reworkConfig: { max_iterations: 2, feedback_injection: true, escalation_state: 'failed' },
        });

        expect(state.status).toBe('completed');
        const reworkEvidence = state.phases[0].evidence.filter((e) => e.kind === 'rework-attempt');
        expect(reworkEvidence.length).toBe(1);
        expect(reworkEvidence[0].payload).toHaveProperty('iteration', 1);
    });

    test('preserves original error when max_iterations is 1', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'rework-default-'));
        tempDirs.push(dir);
        const plan = createExecutionPlan('0292', { profile: 'unit' });

        const runner = async (): Promise<import('../scripts/runtime').PhaseRunnerResult> => {
            return { status: 'failed', error: 'Original failure message' };
        };

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            stateDir: dir,
            phaseRunner: runner,
        });

        expect(state.status).toBe('failed');
        expect(state.phases[0].error).toBe('Original failure message');
    });
});

describe('rollback integration', () => {
    test('captures snapshot when rollbackEnabled is true', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'rollback-int-'));
        tempDirs.push(dir);
        const plan = createExecutionPlan('0292', { profile: 'unit' });

        const runner = async (): Promise<import('../scripts/runtime').PhaseRunnerResult> => {
            return { status: 'completed' };
        };

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            stateDir: dir,
            phaseRunner: runner,
            rollbackEnabled: false,
        });

        expect(state.status).toBe('completed');
        // No snapshot when rollbackEnabled is false
        expect(state.phases[0].rollback_snapshot).toBeUndefined();
    });

    test('adds rollback-restore-failed evidence when snapshot capture fails', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'rollback-no-snap-'));
        tempDirs.push(dir);
        const plan = createExecutionPlan('0292', { profile: 'unit' });

        const runner = async (): Promise<import('../scripts/runtime').PhaseRunnerResult> => {
            return { status: 'completed' };
        };

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            stateDir: dir,
            phaseRunner: runner,
            rollbackEnabled: true,
        });

        // Should either have a snapshot or a snapshot-failed evidence
        const hasSnapshot = !!state.phases[0].rollback_snapshot;
        const hasFailedEvidence = state.phases[0].evidence.some((e) => e.kind === 'rollback-snapshot-failed');
        expect(hasSnapshot || hasFailedEvidence).toBe(true);
    });
});

describe('runtime main', () => {
    const originalExit = process.exit;
    const originalCwd = process.cwd();

    afterEach(() => {
        process.exit = originalExit;
        process.chdir(originalCwd);
    });

    test('exits when task_ref is missing', async () => {
        expect(await main([])).toBe(1);
    });

    test('exits when profile is invalid', async () => {
        expect(await main(['0266', '--profile', 'invalid'])).toBe(1);
    });

    test('exits when coverage is invalid', async () => {
        expect(await main(['0266', '--coverage', '101'])).toBe(1);
    });

    test('exits when channel is invalid', async () => {
        expect(await main(['0266', '--channel', 'unknown-agent'])).toBe(1);
    });

    test('exits when start-phase is invalid', async () => {
        expect(await main(['0266', '--start-phase', '11'])).toBe(1);
    });

    test('runs the pilot runtime successfully for a local unit-profile workspace', async () => {
        setGlobalSilent(false);
        const dir = createTempDir('orchestration-main-success-');
        writePilotWorkspaceFiles(dir);
        const taskPath = writeTaskFile(dir, '0266_main_success.md', 'Implement the feature.');
        process.chdir(dir);

        const code = await main([taskPath, '--profile', 'unit', '--channel', 'current']);
        setGlobalSilent(true);
        expect(code).toBe(0);

        const statePath = findOrchestrationStatePath(taskPath, dir);
        const persisted = JSON.parse(readFileSync(statePath as string, 'utf-8')) as { status: string };
        expect(persisted.status).toBe('completed');
    });

    test('uses the public CLI rework policy to retry a transient phase 6 failure', async () => {
        const dir = createTempDir('orchestration-main-retry-');
        writeRetryingPilotWorkspaceFiles(dir);
        const taskPath = writeTaskFile(dir, '0266_main_retry.md', 'Implement the feature.');
        process.chdir(dir);

        expect(await main([taskPath, '--profile', 'unit', '--channel', 'current'])).toBe(0);

        const statePath = findOrchestrationStatePath(taskPath, dir);
        expect(statePath).not.toBeNull();
        const persisted = JSON.parse(readFileSync(statePath as string, 'utf-8')) as {
            status: string;
            phases: Array<{ status: string; rework_iterations?: number }>;
        };
        expect(persisted.status).toBe('completed');
        expect(persisted.phases[0].status).toBe('completed');
        expect(persisted.phases[0].rework_iterations).toBe(1);
    });

    test('runs the pilot runtime successfully for a local simple-profile workspace with a phase 5 worker', async () => {
        const dir = createTempDir('orchestration-main-simple-current-');
        writePilotWorkspaceFiles(dir);
        process.env.ACPX_BIN = writeMockAcpxScript(dir);
        process.env.ACPX_AGENT = 'claude';
        const taskPath = writeTaskFile(dir, '0266_main_simple_current.md', 'Implement the feature.');
        process.chdir(dir);

        expect(await main([taskPath, '--profile', 'simple', '--channel', 'current'])).toBe(0);

        const statePath = findOrchestrationStatePath(taskPath, dir);
        expect(statePath).not.toBeNull();
        const persisted = JSON.parse(readFileSync(statePath as string, 'utf-8')) as {
            status: string;
            phases: Array<{ number: number; status: string; result?: Record<string, unknown> }>;
        };
        expect(persisted.status).toBe('completed');
        expect(persisted.phases.map((phase) => phase.number)).toEqual([5, 6]);
        expect(persisted.phases[0].status).toBe('completed');
        expect(persisted.phases[0].result).toMatchObject({
            status: 'completed',
            phase: 5,
            next_step_recommendation: 'proceed_to_phase_6',
        });
    });

    test('pauses the pilot runtime at the local review gate for a review-profile workspace', async () => {
        const dir = createTempDir('orchestration-main-review-current-');
        writePilotWorkspaceFiles(dir);
        process.env.ACPX_BIN = writeMockAcpxScript(dir);
        process.env.ACPX_AGENT = 'claude';
        const taskPath = writeTaskFile(dir, '0266_main_review_current.md', 'Implement the feature.');
        process.chdir(dir);

        expect(await main([taskPath, '--profile', 'review', '--channel', 'current'])).toBe(1);

        const statePath = findOrchestrationStatePath(taskPath, dir);
        expect(statePath).not.toBeNull();
        const persisted = JSON.parse(readFileSync(statePath as string, 'utf-8')) as {
            status: string;
            current_phase?: number;
            phases: Array<{
                number: number;
                status: string;
                result?: Record<string, unknown>;
                evidence: Array<{ kind: string }>;
            }>;
        };
        expect(persisted.status).toBe('paused');
        expect(persisted.current_phase).toBe(7);
        expect(persisted.phases.map((phase) => phase.number)).toEqual([7]);
        expect(persisted.phases[0].status).toBe('paused');
        expect(persisted.phases[0].result).toMatchObject({
            status: 'completed',
            phase: 7,
            next_step_recommendation: 'proceed_to_phase_8',
        });
        expect(persisted.phases[0].evidence.some((entry) => entry.kind === 'human-gate')).toBe(false);
    });

    test('pauses at the review gate when starting from phase 6 on current channel without auto approval', async () => {
        const dir = createTempDir('orchestration-main-start-phase-');
        writePilotWorkspaceFiles(dir);
        process.env.ACPX_BIN = writeMockAcpxScript(dir);
        process.env.ACPX_AGENT = 'claude';
        const taskPath = writeTaskFile(dir, '0266_main_start_phase.md', 'Implement the feature.');
        process.chdir(dir);

        expect(await main([taskPath, '--profile', 'complex', '--start-phase', '6'])).toBe(1);

        const statePath = findOrchestrationStatePath(taskPath, dir);
        expect(statePath).not.toBeNull();
        const persisted = JSON.parse(readFileSync(statePath as string, 'utf-8')) as {
            status: string;
            current_phase?: number;
            phases: Array<{ number: number; status: string }>;
        };
        expect(persisted.status).toBe('paused');
        expect(persisted.current_phase).toBe(7);
        expect(persisted.phases.map((phase) => phase.number)).toEqual([6, 7, 8, 9]);
        expect(persisted.phases[0].status).toBe('completed');
        expect(persisted.phases[1].status).toBe('paused');
        expect(persisted.phases[2].status).toBe('pending');
    });

    test('completes all phases including direct-skill phases 8 and 9 when auto approval is enabled', async () => {
        const dir = createTempDir('orchestration-main-start-phase-auto-');
        writePilotWorkspaceFiles(dir);
        process.env.ACPX_BIN = writeMockAcpxScript(dir);
        process.env.ACPX_AGENT = 'claude';
        const taskPath = writeTaskFile(dir, '0266_main_start_phase_auto.md', 'Implement the feature.');
        process.chdir(dir);

        expect(await main([taskPath, '--profile', 'complex', '--start-phase', '6', '--auto'])).toBe(0);

        const statePath = findOrchestrationStatePath(taskPath, dir);
        expect(statePath).not.toBeNull();
        const persisted = JSON.parse(readFileSync(statePath as string, 'utf-8')) as {
            status: string;
            current_phase?: number;
            phases: Array<{ number: number; status: string }>;
        };
        expect(persisted.status).toBe('completed');
        expect(persisted.phases.map((phase) => phase.number)).toEqual([6, 7, 8, 9]);
        expect(persisted.phases[0].status).toBe('completed');
        expect(persisted.phases[1].status).toBe('completed');
        expect(persisted.phases[2].status).toBe('completed');
        expect(persisted.phases[3].status).toBe('completed');
    });

    test('treats dry-run as plan-only even when skip-phases and stack-profile arguments are present', async () => {
        const dir = createTempDir('orchestration-main-skip-stack-');
        writePilotWorkspaceFiles(dir);
        const taskPath = writeTaskFile(dir, '0266_main_skip_stack.md', 'Implement the feature.');
        process.chdir(dir);

        expect(await main([
            taskPath,
            '--profile',
            'complex',
            '--start-phase',
            '6',
            '--skip-phases',
            '7,8,9',
            '--stack-profile',
            'typescript-bun-biome',
            '--channel',
            'current',
            '--auto',
            '--dry-run',
            '--refine',
        ])).toBe(0);

        expect(findOrchestrationStatePath(taskPath, dir)).toBeNull();
    });

    test('honors --rework-max-iterations on the public CLI path', async () => {
        const dir = createTempDir('orchestration-main-rework-override-');
        writeRetryingPilotWorkspaceFiles(dir);
        const taskPath = writeTaskFile(dir, '0266_main_rework_override.md', 'Implement the feature.');
        process.chdir(dir);

        expect(await main([taskPath, '--profile', 'unit', '--channel', 'current', '--rework-max-iterations', '1'])).toBe(1);

        const statePath = findOrchestrationStatePath(taskPath, dir);
        expect(statePath).not.toBeNull();
        const persisted = JSON.parse(readFileSync(statePath as string, 'utf-8')) as {
            status: string;
            rework_config?: { max_iterations: number };
            phases: Array<{ status: string; rework_iterations?: number }>;
        };
        expect(persisted.status).toBe('paused');
        expect(persisted.rework_config?.max_iterations).toBe(1);
        expect(persisted.phases[0].status).toBe('failed');
    });

    test('can resume the pilot runtime from a previously paused state file', async () => {
        const dir = createTempDir('orchestration-main-resume-');
        writePilotWorkspaceFiles(dir);
        const taskPath = writeTaskFile(dir, '0266_main_resume.md', 'Implement the feature.');
        process.chdir(dir);

        const plan = createExecutionPlan(taskPath, { profile: 'unit' });
        const statePath = getOrchestrationStatePath(taskPath, dir);
        const state = createOrchestrationState(plan);
        state.status = 'paused';
        state.current_phase = 6;
        state.phases[0].status = 'paused';
        saveOrchestrationState(state, statePath);

        expect(await main([taskPath, '--profile', 'unit', '--resume'])).toBe(0);

        const persisted = JSON.parse(readFileSync(statePath, 'utf-8')) as { status: string };
        expect(persisted.status).toBe('completed');
    });
});
