#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
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
} from './model';

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
    refine_mode: boolean;
    dry_run: boolean;
    created_at: string;
    updated_at: string;
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
    stackProfile?: string;
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
}

function now(): string {
    return new Date().toISOString();
}

function requiresHumanApproval(gate: Phase['gate']): boolean {
    return gate === 'human' || gate === 'auto/human';
}

function deleteOptionalField<T extends object>(obj: T, key: keyof T): void {
    delete (obj as Partial<T>)[key];
}

function sanitizeTaskRef(taskRef: string): string {
    return taskRef.replace(/[^\w.-]+/g, '_');
}

function generateRunId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function getOrchestrationStatePath(taskRef: string, stateDir = '.', runId?: string): string {
    const id = runId ?? generateRunId();
    return join(stateDir, 'orchestration', `${sanitizeTaskRef(taskRef)}-${id}-state.json`);
}

export function findOrchestrationStatePath(taskRef: string, stateDir = '.'): string | null {
    const orchestrationDir = join(stateDir, 'orchestration');
    if (!existsSync(orchestrationDir)) {
        return null;
    }
    const prefix = sanitizeTaskRef(taskRef);
    const candidates = readdirSync(orchestrationDir)
        .filter((name) => name.startsWith(`${prefix}-`) && name.endsWith('-state.json'))
        .sort();
    return candidates.length > 0 ? join(orchestrationDir, candidates[candidates.length - 1]) : null;
}

export function createOrchestrationState(plan: ExecutionPlan): OrchestrationState {
    const timestamp = now();
    return {
        task_ref: plan.task_ref,
        ...(plan.task_path ? { task_path: plan.task_path } : {}),
        profile: plan.profile,
        execution_channel: plan.execution_channel,
        coverage_threshold: plan.coverage_threshold,
        status: 'pending',
        auto_approve_human_gates: plan.auto_approve_human_gates,
        refine_mode: plan.refine_mode,
        dry_run: plan.dry_run,
        created_at: timestamp,
        updated_at: timestamp,
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
    try {
        return JSON.parse(readFileSync(path, 'utf-8')) as OrchestrationState;
    } catch {
        return null;
    }
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Phase runner timed out after ${timeoutMs}ms: ${label}`)), timeoutMs);
        }),
    ]);
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
    } = options;
    const statePath = statePathOverride ?? getOrchestrationStatePath(plan.task_ref, stateDir, runId);
    const state = initialState ?? createOrchestrationState(plan);

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

        const timeoutMs = phaseTimeoutMs ?? DEFAULT_PHASE_TIMEOUT_MS;
        let result: PhaseRunnerResult;
        try {
            result = await withTimeout(
                phaseRunner(phase, {
                    plan,
                    state,
                    stateDir,
                    projectRoot,
                    ...(stackProfile ? { stackProfile } : {}),
                }),
                timeoutMs,
                `phase ${phase.number} (${phase.name})`,
            );
        } catch (error) {
            result = {
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
                evidence: [
                    {
                        kind: 'timeout',
                        detail: `Phase ${phase.number} (${phase.name}) timed out after ${timeoutMs}ms`,
                    },
                ],
            };
        }

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

        if (result.status === 'paused') {
            state.status = 'paused';
            state.updated_at = now();
            saveOrchestrationState(state, statePath);
            return state;
        }

        if (result.status === 'failed') {
            state.status = 'failed';
            state.updated_at = now();
            saveOrchestrationState(state, statePath);
            return state;
        }

        if (result.status === 'completed' && requiresHumanApproval(phase.gate) && !state.auto_approve_human_gates) {
            phaseState.evidence.push({
                kind: 'human-gate',
                detail: `Phase ${phase.number} completed and is awaiting human approval`,
                payload: {
                    phase: phase.number,
                    gate: phase.gate,
                },
            });
            state.status = 'paused';
            state.updated_at = now();
            saveOrchestrationState(state, statePath);
            return state;
        }

        state.updated_at = now();
        saveOrchestrationState(state, statePath);
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
        throw new Error(
            `No orchestration state found for task "${plan.task_ref}" in ${join(stateDir, 'orchestration')}`,
        );
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

export async function main(args = process.argv.slice(2)): Promise<void> {
    let parsed: ReturnType<typeof parseOrchestrationArgs>;
    try {
        parsed = parseOrchestrationArgs(args, validateProfile);
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }

    if (!parsed) {
        logger.error(
            'Usage: runtime.ts <task_ref> [--profile <profile>] [--start-phase <n>] [--skip-phases <phases>] [--coverage <n>] [--channel <agent|current>] [--auto] [--dry-run] [--refine] [--stack-profile <id>] [--resume]',
        );
        process.exit(1);
    }

    try {
        normalizeExecutionChannel(parsed.executionChannel);
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
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
            return;
        }

        const runner = createPilotPhaseRunner();
        const state = parsed.resume
            ? await resumeOrchestration({
                  plan,
                  projectRoot: process.cwd(),
                  phaseRunner: runner,
                  stackProfile: parsed.stackProfile,
              })
            : await runOrchestration({
                  plan,
                  projectRoot: process.cwd(),
                  phaseRunner: runner,
                  stackProfile: parsed.stackProfile,
              });

        logger.log(JSON.stringify(state, null, 2));
        if (state.status !== 'completed') {
            process.exit(1);
        }
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

if (import.meta.main) {
    void main();
}
