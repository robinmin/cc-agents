#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { logger } from '../../../scripts/logger';
import { parseSection } from '../../tasks/scripts/lib/taskFile';
import { createExecutionPlan, validateProfile } from './plan';
import { createPilotPhaseRunner } from './pilot';
import type { ExecutionPlan, Phase, Profile } from './model';

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
    gate: Phase['gate'];
    gateCriteria?: string;
    prerequisites?: string[];
    status: PhaseExecutionStatus;
    started_at?: string;
    completed_at?: string;
    evidence: PhaseEvidence[];
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
}

function now(): string {
    return new Date().toISOString();
}

function deleteOptionalField<T extends object>(obj: T, key: keyof T): void {
    delete (obj as Partial<T>)[key];
}

function sanitizeTaskRef(taskRef: string): string {
    return taskRef.replace(/[^\w.-]+/g, '_');
}

export function getOrchestrationStatePath(taskRef: string, stateDir = '.'): string {
    return join(stateDir, 'orchestration', `${sanitizeTaskRef(taskRef)}-state.json`);
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

export async function runOrchestration(options: RunOrchestrationOptions): Promise<OrchestrationState> {
    const { plan, projectRoot, stateDir = projectRoot, phaseRunner, stackProfile } = options;
    const statePath = getOrchestrationStatePath(plan.task_ref, stateDir);
    const state = loadOrchestrationState(statePath) ?? createOrchestrationState(plan);

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

        const result = await phaseRunner(phase, {
            plan,
            state,
            stateDir,
            projectRoot,
            ...(stackProfile ? { stackProfile } : {}),
        });

        phaseState.status = result.status;
        if (result.status === 'paused') {
            if ('completed_at' in phaseState) {
                deleteOptionalField(phaseState, 'completed_at');
            }
        } else {
            phaseState.completed_at = now();
        }
        phaseState.evidence.push(...(result.evidence ?? []));
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

        state.updated_at = now();
        saveOrchestrationState(state, statePath);
    }

    state.status = 'completed';
    state.updated_at = now();
    saveOrchestrationState(state, statePath);
    return state;
}

export async function resumeOrchestration(options: RunOrchestrationOptions): Promise<OrchestrationState> {
    const { plan, projectRoot, stateDir = projectRoot } = options;
    const statePath = getOrchestrationStatePath(plan.task_ref, stateDir);
    const state = loadOrchestrationState(statePath);

    if (!state) {
        throw new Error(`No orchestration state found at ${statePath}`);
    }

    if (state.status !== 'paused') {
        throw new Error(`Orchestration is not paused (status: ${state.status})`);
    }

    const pausedPhase = state.phases.find((phase) => phase.status === 'paused');
    if (pausedPhase) {
        pausedPhase.status = 'pending';
    }

    state.status = 'running';
    state.updated_at = now();
    saveOrchestrationState(state, statePath);

    return runOrchestration(options);
}

export async function main(args = process.argv.slice(2)): Promise<void> {
    if (args.length < 1) {
        logger.error(
            'Usage: runtime.ts <task_ref> [--profile <profile>] [--start-phase <n>] [--skip-phases <phases>] [--coverage <n>] [--channel <agent|current>] [--auto] [--dry-run] [--refine] [--stack-profile <id>] [--resume]',
        );
        process.exit(1);
    }

    const taskRef = args[0];
    let startPhase: Phase['number'] | undefined;
    const skipPhases: Phase['number'][] = [];
    let profile: Profile | undefined;
    let coverageOverride: number | undefined;
    let executionChannel = 'current';
    let auto = false;
    let dryRun = false;
    let refine = false;
    let stackProfile = 'typescript-bun-biome';
    let resume = false;

    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--profile' && i + 1 < args.length) {
            const value = args[++i];
            if (!validateProfile(value)) {
                logger.error(`Invalid profile: ${value}`);
                process.exit(1);
            }
            profile = value;
        } else if (args[i] === '--start-phase' && i + 1 < args.length) {
            const parsed = Number.parseInt(args[++i], 10);
            if (parsed >= 1 && parsed <= 9) {
                startPhase = parsed as Phase['number'];
            } else {
                logger.error(`Invalid start-phase: ${parsed}. Must be 1-9.`);
                process.exit(1);
            }
        } else if ((args[i] === '--skip' || args[i] === '--skip-phases') && i + 1 < args.length) {
            const parsed = args[++i]
                .split(',')
                .map((value) => Number.parseInt(value.trim(), 10))
                .filter((value): value is Phase['number'] => value >= 1 && value <= 9);
            skipPhases.push(...parsed);
        } else if (args[i] === '--coverage' && i + 1 < args.length) {
            const parsed = Number.parseInt(args[++i], 10);
            if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
                logger.error(`Invalid coverage: ${parsed}. Must be 1-100.`);
                process.exit(1);
            }
            coverageOverride = parsed;
        } else if (args[i] === '--channel' && i + 1 < args.length) {
            executionChannel = args[++i];
        } else if (args[i] === '--auto') {
            auto = true;
        } else if (args[i] === '--dry-run') {
            dryRun = true;
        } else if (args[i] === '--refine') {
            refine = true;
        } else if (args[i] === '--stack-profile' && i + 1 < args.length) {
            stackProfile = args[++i];
        } else if (args[i] === '--resume') {
            resume = true;
        }
    }

    const plan = createExecutionPlan(taskRef, {
        ...(profile ? { profile } : {}),
        ...(startPhase ? { startPhase } : {}),
        ...(skipPhases.length > 0 ? { skipPhases } : {}),
        ...(coverageOverride !== undefined ? { coverageOverride } : {}),
        executionChannel,
        auto,
        dryRun,
        refine,
    });

    const runner = createPilotPhaseRunner();
    const state = resume
        ? await resumeOrchestration({
              plan,
              projectRoot: process.cwd(),
              phaseRunner: runner,
              stackProfile,
          })
        : await runOrchestration({
              plan,
              projectRoot: process.cwd(),
              phaseRunner: runner,
              stackProfile,
          });

    logger.log(JSON.stringify(state, null, 2));
}

if (import.meta.main) {
    void main();
}
