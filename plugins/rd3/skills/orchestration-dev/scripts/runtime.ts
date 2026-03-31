#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { logger } from '../../../scripts/logger';
import { parseSection } from '../../tasks/scripts/lib/taskFile';
import { normalizeExecutionChannel } from './executors';
import { createExecutionPlan, validateProfile } from './plan';
import { createPilotPhaseRunner } from './pilot';
import {
    DEFAULT_PHASE_TIMEOUT_MS,
    parseOrchestrationArgs,
    type ExecutionPlan,
    type Phase,
    type Profile,
    type ReworkConfig,
    type RollbackSnapshot,
} from './model';
import { captureSnapshot, executeUndo, finalizeSnapshot, restoreSnapshot } from './rollback';
import {
    findOrchestrationStatePath as findOrchestrationStatePathInternal,
    getOrchestrationRunDir,
    getWorkflowRunsRoot,
} from './state-paths';

export const CURRENT_SCHEMA_VERSION = 1;

export type OrchestrationStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';
export type PhaseExecutionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'skipped';

export interface PhaseEvidence {
    kind: string;
    detail: string;
    payload?: Record<string, unknown>;
}

export interface PhaseExecutionRecord {
    number: Phase['number'];
    name: string;
    skill: string;
    executor: string;
    execution_mode: Phase['execution_mode'];
    worker_contract_version?: string;
    gate: Phase['gate'];
    gateCriteria?: string;
    prerequisites?: string[];
    status: PhaseExecutionStatus;
    started_at?: string;
    completed_at?: string;
    evidence: PhaseEvidence[];
    result?: Record<string, unknown>;
    error?: string;
    rework_iterations?: number;
    rollback_snapshot?: RollbackSnapshot;
}

export interface OrchestrationState {
    task_ref: string;
    task_path?: string;
    profile: Profile;
    execution_channel: string;
    coverage_threshold: number;
    status: OrchestrationStatus;
    current_phase?: Phase['number'];
    auto_approve_human_gates: boolean;
    rework_config?: ReworkConfig;
    refine_mode: boolean;
    dry_run: boolean;
    created_at: string;
    updated_at: string;
    schema_version?: number;
    phases: PhaseExecutionRecord[];
}

export interface PhaseRunnerResult {
    status: Extract<PhaseExecutionStatus, 'completed' | 'paused' | 'failed' | 'skipped'>;
    evidence?: PhaseEvidence[];
    result?: Record<string, unknown>;
    error?: string;
}

export interface PhaseRunnerContext {
    plan: ExecutionPlan;
    state: OrchestrationState;
    stateDir: string;
    projectRoot: string;
    statePath?: string;
    stackProfile?: string;
    rework_feedback?: string;
}

export type PhaseRunner = (phase: Phase, context: PhaseRunnerContext) => Promise<PhaseRunnerResult>;

export interface RunOrchestrationOptions {
    plan: ExecutionPlan;
    projectRoot: string;
    stateDir?: string;
    phaseRunner: PhaseRunner;
    stackProfile?: string;
    initialState?: OrchestrationState;
    phaseTimeoutMs?: number;
    runId?: string;
    statePathOverride?: string;
    reworkConfig?: ReworkConfig;
    rollbackEnabled?: boolean;
}

function now(): string {
    return new Date().toISOString();
}

function deleteOptionalField<T extends object>(obj: T, key: keyof T): void {
    delete (obj as Partial<T>)[key];
}

function generateRunId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function getOrchestrationStatePath(taskRef: string, stateDir = '.', runId?: string): string {
    const id = runId ?? generateRunId();
    return join(getOrchestrationRunDir(taskRef, stateDir), `${id}.json`);
}

export function findOrchestrationStatePath(taskRef: string, stateDir = '.'): string | null {
    return findOrchestrationStatePathInternal(taskRef, stateDir);
}

export function createOrchestrationState(plan: ExecutionPlan, reworkConfig?: ReworkConfig): OrchestrationState {
    const timestamp = now();
    return {
        task_ref: plan.task_ref,
        ...(plan.task_path ? { task_path: plan.task_path } : {}),
        profile: plan.profile,
        execution_channel: plan.execution_channel,
        coverage_threshold: plan.coverage_threshold,
        status: 'pending',
        auto_approve_human_gates: plan.auto_approve_human_gates,
        ...(reworkConfig ? { rework_config: reworkConfig } : {}),
        refine_mode: plan.refine_mode,
        dry_run: plan.dry_run,
        created_at: timestamp,
        updated_at: timestamp,
        schema_version: CURRENT_SCHEMA_VERSION,
        phases: plan.phases.map((phase) => ({
            number: phase.number,
            name: phase.name,
            skill: phase.skill,
            executor: phase.executor,
            execution_mode: phase.execution_mode,
            ...(phase.worker_contract_version ? { worker_contract_version: phase.worker_contract_version } : {}),
            gate: phase.gate,
            ...(phase.gateCriteria ? { gateCriteria: phase.gateCriteria } : {}),
            ...(phase.prerequisites ? { prerequisites: phase.prerequisites } : {}),
            status: 'pending',
            evidence: [],
        })),
    };
}

export function loadOrchestrationState(path: string): OrchestrationState | null {
    let state: OrchestrationState | null = null;
    try {
        state = JSON.parse(readFileSync(path, 'utf-8')) as OrchestrationState;
    } catch {
        return null;
    }
    if (state.schema_version !== undefined && state.schema_version > CURRENT_SCHEMA_VERSION) {
        throw new Error(
            `Cannot load orchestration state: schema_version ${state.schema_version} is newer than supported version ${CURRENT_SCHEMA_VERSION}. Please update the orchestration tool.`,
        );
    }
    return state;
}

export function saveOrchestrationState(state: OrchestrationState, path: string): void {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(state, null, 2), 'utf-8');
}

const KNOWN_PREREQUISITES = new Set(['Solution section populated']);

function checkPrerequisite(taskPath: string, prerequisite: string): string | null {
    if (!KNOWN_PREREQUISITES.has(prerequisite)) {
        logger.warn(`Unknown prerequisite "${prerequisite}" — treating as unmet to be safe`);
        return prerequisite;
    }

    if (prerequisite === 'Solution section populated') {
        const content = readFileSync(taskPath, 'utf-8');
        const solution = parseSection(content, 'Solution');
        if (!solution || solution.startsWith('[')) {
            return prerequisite;
        }
    }

    return null;
}

function validatePhasePrerequisites(plan: ExecutionPlan, phase: Phase): string[] {
    if (!plan.task_path || !phase.prerequisites || phase.prerequisites.length === 0) {
        return [];
    }

    return phase.prerequisites
        .map((prerequisite) => checkPrerequisite(plan.task_path as string, prerequisite))
        .filter((value): value is string => value !== null);
}

const DEFAULT_REWORK_CONFIG: ReworkConfig = {
    max_iterations: 1,
    feedback_injection: true,
    escalation_state: 'failed',
};

const PUBLIC_CLI_REWORK_CONFIG: ReworkConfig = {
    max_iterations: 2,
    feedback_injection: true,
    escalation_state: 'paused',
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Phase runner timed out after ${timeoutMs}ms: ${label}`)), timeoutMs);
        }),
    ]);
}

interface PhaseExecutionOptions {
    phase: Phase;
    plan: ExecutionPlan;
    state: OrchestrationState;
    stateDir: string;
    projectRoot: string;
    statePath: string;
    phaseRunner: PhaseRunner;
    phaseTimeoutMs: number;
    stackProfile?: string;
    feedback?: string;
}

// Allow conditional spreading of stackProfile with exactOptionalPropertyTypes
function buildExecOpts(
    base: Omit<PhaseExecutionOptions, 'stackProfile' | 'feedback'>,
    stackProfile: string | undefined,
    feedback: string | undefined,
): PhaseExecutionOptions {
    const opts: PhaseExecutionOptions = { ...base };
    if (stackProfile !== undefined) {
        opts.stackProfile = stackProfile;
    }
    if (feedback !== undefined) {
        opts.feedback = feedback;
    }
    return opts;
}

function updatePhaseRecord(phaseState: PhaseExecutionRecord, result: PhaseRunnerResult): void {
    phaseState.status = result.status;
    if (result.status === 'paused') {
        if ('completed_at' in phaseState) {
            deleteOptionalField(phaseState, 'completed_at');
        }
    } else {
        phaseState.completed_at = now();
    }
    phaseState.evidence.push(...(result.evidence ?? []));
    if (result.result) {
        phaseState.result = result.result;
    } else if ('result' in phaseState) {
        deleteOptionalField(phaseState, 'result');
    }
    if (result.error) {
        phaseState.error = result.error;
    } else if ('error' in phaseState) {
        deleteOptionalField(phaseState, 'error');
    }
}

async function executePhaseOnce(options: PhaseExecutionOptions): Promise<PhaseRunnerResult> {
    const { phase, plan, state, stateDir, projectRoot, phaseRunner, phaseTimeoutMs, stackProfile, feedback } = options;
    const timeoutMs = phaseTimeoutMs ?? DEFAULT_PHASE_TIMEOUT_MS;

    try {
        const context: PhaseRunnerContext = {
            plan,
            state,
            stateDir,
            projectRoot,
            statePath: options.statePath,
            ...(stackProfile ? { stackProfile } : {}),
        };

        if (feedback) {
            context.rework_feedback = feedback;
        }

        return await withTimeout(phaseRunner(phase, context), timeoutMs, `phase ${phase.number} (${phase.name})`);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const isTimeout = errorMsg.startsWith('Phase runner timed out');
        return {
            status: 'failed',
            error: errorMsg,
            evidence: [
                {
                    kind: isTimeout ? 'timeout' : 'failure',
                    detail: isTimeout
                        ? `Phase ${phase.number} (${phase.name}) timed out after ${timeoutMs}ms`
                        : `Phase ${phase.number} (${phase.name}) failed: ${errorMsg}`,
                },
            ],
        };
    }
}

export async function runOrchestration(options: RunOrchestrationOptions): Promise<OrchestrationState> {
    const {
        plan,
        projectRoot,
        stateDir = projectRoot,
        phaseRunner,
        stackProfile,
        initialState,
        phaseTimeoutMs,
        runId,
        statePathOverride,
        reworkConfig,
    } = options;
    const statePath = statePathOverride ?? getOrchestrationStatePath(plan.task_ref, stateDir, runId);
    const rework = reworkConfig ?? initialState?.rework_config ?? DEFAULT_REWORK_CONFIG;
    const state = initialState ?? createOrchestrationState(plan, rework);
    state.rework_config = rework;

    state.status = 'running';
    state.updated_at = now();
    saveOrchestrationState(state, statePath);

    for (const phase of plan.phases) {
        const phaseState = state.phases.find((item) => item.number === phase.number);
        if (!phaseState || (phaseState.status !== 'pending' && phaseState.status !== 'paused')) {
            continue;
        }

        const missingPrerequisites = validatePhasePrerequisites(plan, phase);
        if (missingPrerequisites.length > 0) {
            phaseState.status = 'failed';
            phaseState.error = `Missing prerequisites: ${missingPrerequisites.join(', ')}`;
            phaseState.completed_at = now();
            state.status = 'failed';
            state.current_phase = phase.number;
            state.updated_at = now();
            saveOrchestrationState(state, statePath);
            return state;
        }

        state.current_phase = phase.number;
        phaseState.status = 'running';
        phaseState.started_at ??= now();
        state.updated_at = now();
        saveOrchestrationState(state, statePath);

        // Capture rollback snapshot if enabled
        let snapshot: RollbackSnapshot | undefined;
        if (options.rollbackEnabled) {
            try {
                snapshot = captureSnapshot(projectRoot, phase.number);
                phaseState.rollback_snapshot = snapshot;
            } catch (error) {
                // Snapshot capture failure is non-fatal — log and continue
                phaseState.evidence.push({
                    kind: 'rollback-snapshot-failed',
                    detail: `Failed to capture rollback snapshot for phase ${phase.number}: ${error instanceof Error ? error.message : String(error)}`,
                });
            }
        }

        let feedback: string | undefined;
        let iterations = 0;

        while (iterations < rework.max_iterations) {
            iterations++;
            const execOpts = buildExecOpts(
                {
                    phase,
                    plan,
                    state,
                    stateDir,
                    projectRoot,
                    statePath,
                    phaseRunner,
                    phaseTimeoutMs: phaseTimeoutMs ?? DEFAULT_PHASE_TIMEOUT_MS,
                },
                stackProfile,
                feedback,
            );

            const result = await executePhaseOnce(execOpts);
            updatePhaseRecord(phaseState, result);

            if (result.status === 'paused') {
                state.status = 'paused';
                state.updated_at = now();
                saveOrchestrationState(state, statePath);
                return state;
            }

            if (result.status === 'completed') {
                state.updated_at = now();

                // Finalize rollback snapshot on success
                if (snapshot && options.rollbackEnabled) {
                    try {
                        const finalized = finalizeSnapshot(projectRoot, snapshot);
                        phaseState.rollback_snapshot = finalized;
                    } catch {
                        // Finalization failure is non-fatal
                    }
                }

                saveOrchestrationState(state, statePath);
                break;
            }

            // result.status === 'failed' — attempt rework
            feedback = result.error;
            phaseState.evidence.push({
                kind: 'rework-attempt',
                detail: `Phase ${phase.number} failed (iteration ${iterations}/${rework.max_iterations}), rework feedback injected`,
                payload: { iteration: iterations, feedback: feedback?.slice(0, 200) },
            });
            phaseState.rework_iterations = iterations;

            // Reset phase state for re-execution
            phaseState.status = 'pending';
            if ('completed_at' in phaseState) {
                deleteOptionalField(phaseState, 'completed_at');
            }
            if ('error' in phaseState) {
                deleteOptionalField(phaseState, 'error');
            }

            state.updated_at = now();
            saveOrchestrationState(state, statePath);

            if (iterations >= rework.max_iterations) {
                phaseState.status = 'failed';
                phaseState.completed_at = now();
                const originalError = feedback ?? 'Unknown error';
                phaseState.error =
                    rework.max_iterations > 1
                        ? `Max rework iterations (${rework.max_iterations}) exceeded for phase ${phase.number}: ${originalError}`
                        : originalError;

                // Auto-restore snapshot on failure with exhausted rework
                if (snapshot && options.rollbackEnabled) {
                    try {
                        const restoreResult = restoreSnapshot(projectRoot, snapshot);
                        phaseState.evidence.push({
                            kind: 'rollback-restore',
                            detail: `Auto-restored ${restoreResult.restored.length} files and removed ${restoreResult.removed.length} new files after phase ${phase.number} failure`,
                            payload: {
                                restored: restoreResult.restored,
                                removed: restoreResult.removed,
                                errors: restoreResult.errors,
                            },
                        });
                    } catch (error) {
                        phaseState.evidence.push({
                            kind: 'rollback-restore-failed',
                            detail: `Auto-restore failed for phase ${phase.number}: ${error instanceof Error ? error.message : String(error)}`,
                        });
                    }
                }

                state.status = rework.escalation_state;
                state.updated_at = now();
                saveOrchestrationState(state, statePath);
                return state;
            }

            phaseState.status = 'running';
            state.updated_at = now();
            saveOrchestrationState(state, statePath);
        }
    }

    state.status = 'completed';
    state.updated_at = now();
    saveOrchestrationState(state, statePath);
    return state;
}

function validateResumeCompatibility(plan: ExecutionPlan, state: OrchestrationState): void {
    if (state.profile !== plan.profile) {
        throw new Error(
            `Resume profile mismatch: state has "${state.profile}" but plan requests "${plan.profile}". ` +
                'Use --resume only with the same profile as the original run, or start a fresh run without --resume.',
        );
    }

    const statePhaseNumbers = state.phases.map((phase) => phase.number);
    const planPhaseNumbers = plan.phases.map((phase) => phase.number);
    const stateKey = statePhaseNumbers.join(',');
    const planKey = planPhaseNumbers.join(',');

    if (stateKey !== planKey) {
        throw new Error(
            `Resume phase-set mismatch: state has phases [${stateKey}] but plan requests [${planKey}]. ` +
                'Use --resume only with the same phase set as the original run.',
        );
    }
}

export async function resumeOrchestration(options: RunOrchestrationOptions): Promise<OrchestrationState> {
    const { plan, projectRoot, stateDir = projectRoot } = options;
    const statePath = findOrchestrationStatePath(plan.task_ref, stateDir);

    if (!statePath) {
        throw new Error(`No orchestration state found for task "${plan.task_ref}" in ${getWorkflowRunsRoot(stateDir)}`);
    }

    const state = loadOrchestrationState(statePath);
    if (!state) {
        throw new Error(`Failed to load orchestration state from ${statePath}`);
    }

    if (state.status !== 'paused') {
        throw new Error(`Orchestration is not paused (status: ${state.status})`);
    }

    validateResumeCompatibility(plan, state);

    const pausedPhase = state.phases.find((phase) => phase.status === 'paused');
    if (pausedPhase) {
        pausedPhase.status = 'pending';
    }

    state.status = 'running';
    state.updated_at = now();
    saveOrchestrationState(state, statePath);

    return runOrchestration({
        ...options,
        initialState: state,
        statePathOverride: statePath,
    });
}

export async function main(args = process.argv.slice(2)): Promise<number> {
    let parsed: ReturnType<typeof parseOrchestrationArgs>;
    try {
        parsed = parseOrchestrationArgs(args, validateProfile);
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        return 1;
    }

    if (!parsed) {
        logger.error(
            'Usage: runtime.ts <task_ref> [--profile <profile>] [--start-phase <n>] [--skip-phases <phases>] [--coverage <n>] [--channel <agent|current>] [--auto] [--dry-run] [--refine] [--stack-profile <id>] [--rework-max-iterations <n>] [--resume]',
        );
        return 1;
    }

    try {
        normalizeExecutionChannel(parsed.executionChannel);
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        return 1;
    }

    // Handle --undo before any phase execution
    if (parsed.undo !== undefined) {
        try {
            const result = executeUndo(
                { task_ref: parsed.taskRef, phase: parsed.undo, dry_run: parsed.undoDryRun },
                process.cwd(),
            );
            logger.log(JSON.stringify(result, null, 2));
            if (result.errors.length > 0) {
                return 1;
            }
            return 0;
        } catch (error) {
            logger.error(error instanceof Error ? error.message : String(error));
            return 1;
        }
    }

    try {
        const plan = createExecutionPlan(parsed.taskRef, {
            ...(parsed.profile ? { profile: parsed.profile } : {}),
            ...(parsed.startPhase ? { startPhase: parsed.startPhase } : {}),
            ...(parsed.skipPhases.length > 0 ? { skipPhases: parsed.skipPhases } : {}),
            ...(parsed.coverageOverride !== undefined ? { coverageOverride: parsed.coverageOverride } : {}),
            executionChannel: parsed.executionChannel,
            auto: parsed.auto,
            dryRun: parsed.dryRun,
            refine: parsed.refine,
        });

        if (plan.dry_run) {
            logger.log(JSON.stringify(plan, null, 2));
            return 0;
        }

        const runner = createPilotPhaseRunner();
        const state = parsed.resume
            ? await resumeOrchestration({
                  plan,
                  projectRoot: process.cwd(),
                  phaseRunner: runner,
                  stackProfile: parsed.stackProfile,
                  reworkConfig: {
                      ...PUBLIC_CLI_REWORK_CONFIG,
                      ...(parsed.reworkMaxIterations !== undefined
                          ? { max_iterations: parsed.reworkMaxIterations }
                          : {}),
                  },
              })
            : await runOrchestration({
                  plan,
                  projectRoot: process.cwd(),
                  phaseRunner: runner,
                  stackProfile: parsed.stackProfile,
                  reworkConfig: {
                      ...PUBLIC_CLI_REWORK_CONFIG,
                      ...(parsed.reworkMaxIterations !== undefined
                          ? { max_iterations: parsed.reworkMaxIterations }
                          : {}),
                  },
              });

        logger.log(JSON.stringify(state, null, 2));
        return state.status === 'completed' ? 0 : 1;
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        return 1;
    }
}

if (import.meta.main) {
    main().then((code) => process.exit(code));
}
