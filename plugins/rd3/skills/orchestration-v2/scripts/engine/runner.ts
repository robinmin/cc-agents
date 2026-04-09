/**
 * orchestration-v2 — Pipeline Runner
 *
 * Orchestrates FSM + DAG + executors + state into a running pipeline.
 * Main loop: evaluate DAG → execute ready phases → check gates → rework or advance.
 */

import type {
    RunOptions,
    ResumeOptions,
    RunRecord,
    FSMState,
    PipelineDefinition,
    PhaseDefinition,
    ExecutionRequest,
    GateConfig,
    GateResult,
    ChainState,
    OrchestratorEvent,
    PhaseEvidence,
    VerificationDriver,
    ChainManifest,
} from '../model';
import { EXIT_INVALID_ARGS } from '../model';
import { FSMEngine } from './fsm';
import { DAGScheduler, validatePhaseSubset } from './dag';
import { HookRegistry } from './hooks';
import { ExecutorPool } from '../executors/pool';
import type { StateManager } from '../state/manager';
import { EventStore } from '../state/events';
import { EventBus } from '../observability/event-bus';
import { DefaultCoVDriver } from '../verification/cov-driver';
import { logger } from '../../../../scripts/logger';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseYamlString } from '../config/parser';
import { getSubtasks, extractWbsFromPath } from '../utils/subtasks';

const DEFAULT_AUTO_GATE_PROMPT_TEMPLATE = `You are a verification checker. For each item in the checklist, determine if it PASSES or FAILS.

Checklist:
{items}

For each item, output exactly one line in this format:
[PASS] criterion: reason
[FAIL] criterion: reason

Be strict in your evaluation.`;

export interface PipelineRunResult {
    readonly runId: string;
    readonly status: FSMState;
    readonly exitCode: number;
    readonly durationMs: number;
}

export class PipelineRunner {
    private readonly fsm: FSMEngine;
    private readonly dag: DAGScheduler;
    private readonly hooks: HookRegistry;
    private readonly pool: ExecutorPool;
    private readonly state: StateManager;
    private readonly eventBus: EventBus;
    private readonly verificationDriver: VerificationDriver;

    constructor(
        stateManager: StateManager,
        executorPool?: ExecutorPool,
        hookRegistry?: HookRegistry,
        eventBus?: EventBus,
        verificationDriver?: VerificationDriver,
    ) {
        this.fsm = new FSMEngine();
        this.dag = new DAGScheduler();
        this.hooks = hookRegistry ?? new HookRegistry();
        this.pool = executorPool ?? new ExecutorPool();
        this.state = stateManager;
        this.eventBus = eventBus ?? new EventBus();
        this.verificationDriver = verificationDriver ?? new DefaultCoVDriver();

        // Wire EventBus → EventStore for event persistence (§8.2)
        const eventStore = new EventStore(stateManager.getDb());
        this.eventBus.subscribeAll((event) => {
            eventStore.append(event).catch((err) => {
                logger.warn('[runner] Event persistence failed', err);
            });
        });
    }

    async run(options: RunOptions, pipeline?: PipelineDefinition): Promise<PipelineRunResult> {
        const startTime = Date.now();

        if (!pipeline) {
            throw new Error('Pipeline definition required');
        }

        this.initializePipeline(pipeline);
        const requestedPhases = this.getRequestedPhases(options, pipeline);

        // Validate that requested phases form a valid subgraph (ss3.2)
        // Skip validation if --skip-deps is set (useful for standalone verification)
        if (requestedPhases && !options.skipDeps) {
            const completedPhases = await this.getCompletedPhasesForTask(options.taskRef);
            const validation = validatePhaseSubset(requestedPhases, pipeline.phases, completedPhases);
            if (!validation.valid) {
                const details = validation.missingDeps
                    .map(
                        (d) =>
                            `Phase '${d.phase}' requires '${d.missingDependency}' which is not in the requested phases and has no completed run.`,
                    )
                    .join('\n');
                logger.error(`Invalid phase subset:\n${details}`);
                return {
                    runId: '',
                    status: 'FAILED',
                    exitCode: EXIT_INVALID_ARGS,
                    durationMs: Date.now() - startTime,
                };
            }
        }

        if (options.dryRun) {
            return {
                runId: this.generateRunId(),
                status: 'COMPLETED',
                exitCode: 0,
                durationMs: Date.now() - startTime,
            };
        }

        // Create run record
        const runId = this.generateRunId();
        await this.state.createRun({
            id: runId,
            task_ref: options.taskRef,
            ...(options.preset && { preset: options.preset }),
            phases_requested: requestedPhases ? [...requestedPhases].join(',') : Object.keys(pipeline.phases).join(','),
            status: 'RUNNING',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: pipeline.name,
        });

        // Transition FSM to RUNNING
        this.fsm.transition('run');

        // Create phase records
        for (const [name, def] of Object.entries(pipeline.phases)) {
            if (requestedPhases && !requestedPhases.has(name)) {
                continue;
            }
            await this.state.createPhase({
                run_id: runId,
                name,
                status: 'pending',
                skill: def.skill,
                rework_iteration: 0,
            });
        }

        // Emit run.created event
        await this.emitEvent(runId, 'run.created', {
            task_ref: options.taskRef,
            pipeline: pipeline.name,
        });

        return this.executeRunLoop(runId, pipeline, options, requestedPhases, startTime);
    }

    async resume(options: ResumeOptions): Promise<PipelineRunResult> {
        const startTime = Date.now();

        // Find the run for this task ref
        const run = await this.state.getRunByTaskRef(options.taskRef);
        if (!run) {
            throw new Error(`No run found for task ref: ${options.taskRef}`);
        }

        if (run.status !== 'PAUSED') {
            throw new Error(`Run ${run.id} is not paused (status: ${run.status})`);
        }

        const pipeline = run.config_snapshot as unknown as PipelineDefinition;
        this.initializePipeline(pipeline);

        const requestedPhases = this.getRequestedPhasesFromRun(run);
        await this.rehydrateDag(run.id, requestedPhases);

        if (options.reject) {
            this.fsm.transition('resume-reject');
            await this.rejectPausedPhases(run.id);
            await this.failPausedRun(run.id, 'Resume rejected at human gate', startTime);
            return {
                runId: run.id,
                status: 'FAILED',
                exitCode: 1,
                durationMs: Date.now() - startTime,
            };
        }

        this.fsm.transition('resume-approve');
        await this.approvePausedPhases(run.id);
        await this.state.updateRunStatus(run.id, 'RUNNING');
        await this.hooks.execute('on-resume', {
            task_ref: options.taskRef,
            run_id: run.id,
        });
        await this.emitEvent(run.id, 'run.resumed', {});

        return this.executeRunLoop(
            run.id,
            pipeline,
            {
                taskRef: options.taskRef,
                ...(options.auto && { auto: true }),
            },
            requestedPhases,
            startTime,
        );
    }

    async undo(
        runId: string,
        phaseName: string,
        options: { force?: boolean; dryRun?: boolean } = {},
    ): Promise<{ success: boolean; error?: string; exitCode: number }> {
        // Load the rollback snapshot for the given phase
        const snapshot = await this.state.getRollbackSnapshot(runId, phaseName);
        if (!snapshot || !snapshot.files_before) {
            return {
                success: false,
                error: `STATE_CORRUPT: No rollback snapshot found for phase "${phaseName}"`,
                exitCode: 13,
            };
        }

        // Check for uncommitted changes unless --force
        if (!options.force) {
            const hasUncommitted = await this.hasUncommittedChanges();
            if (hasUncommitted) {
                return {
                    success: false,
                    error: 'UNDO_UNCOMMITTED_CHANGES: Working tree has uncommitted changes. Use --force to bypass.',
                    exitCode: 1,
                };
            }
        }

        // Find downstream phases (phases that depend on this phase or its descendants)
        const downstreamPhases = this.findDownstreamPhases(phaseName);

        if (options.dryRun) {
            const filesBefore = snapshot.files_before as Record<string, string>;
            const filesAfter = (snapshot.files_after as Record<string, string> | undefined) ?? {};
            const createdFiles = Object.keys(filesAfter).filter((f) => !filesBefore[f]);
            const modifiedFiles = Object.keys(filesBefore);

            logger.info('[dry-run] Undo plan:');
            logger.info(`  Files to restore: ${modifiedFiles.join(', ') || 'none'}`);
            logger.info(`  Files to delete (created by phase): ${createdFiles.join(', ') || 'none'}`);
            logger.info(`  Downstream phases to clear: ${downstreamPhases.join(', ') || 'none'}`);
            return { success: true, exitCode: 0 };
        }

        // Restore files via git checkout
        const filesBefore = snapshot.files_before as Record<string, string>;
        for (const [file, hash] of Object.entries(filesBefore)) {
            try {
                const proc = Bun.spawnSync(['git', 'checkout', String(hash), '--', file], {
                    cwd: process.cwd(),
                    stderr: 'pipe',
                });
                if (proc.exitCode !== 0) {
                    logger.warn(`[undo] Could not restore ${file}: ${new TextDecoder().decode(proc.stderr).trim()}`);
                }
            } catch {
                logger.warn(`[undo] Could not restore ${file}`);
            }
        }

        // Delete files created during the phase
        const filesAfter = (snapshot.files_after as Record<string, string> | undefined) ?? {};
        const createdFiles = Object.keys(filesAfter).filter((f) => !filesBefore[f]);
        for (const file of createdFiles) {
            try {
                const proc = Bun.spawnSync(['git', 'rm', '-f', '--', file], {
                    cwd: process.cwd(),
                    stderr: 'pipe',
                });
                if (proc.exitCode !== 0) {
                    logger.warn(`[undo] Could not delete ${file}`);
                }
            } catch {
                logger.warn(`[undo] Could not delete ${file}`);
            }
        }

        // Clear downstream phase records (reset to pending)
        for (const dp of downstreamPhases) {
            await this.state.updatePhase(runId, dp, 'pending');
        }

        // Reset the undone phase back to pending
        await this.state.updatePhase(runId, phaseName, 'pending');

        // Set run status to PAUSED
        await this.state.updateRunStatus(runId, 'PAUSED');

        await this.emitEvent(runId, 'phase.undo', { phase: phaseName, downstream: downstreamPhases });

        logger.info(`[undo] Phase "${phaseName}" undone. ${downstreamPhases.length} downstream phase(s) reset.`);
        return { success: true, exitCode: 0 };
    }

    async getStatus(runId: string): Promise<RunRecord | null> {
        return this.state.getRun(runId);
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private async executeRunLoop(
        runId: string,
        pipeline: PipelineDefinition,
        options: RunOptions,
        requestedPhases: Set<string> | null,
        startTime: number,
    ): Promise<PipelineRunResult> {
        try {
            let maxIterations = 100; // Safety valve
            while (maxIterations-- > 0) {
                const eval_ = this.dag.evaluate();

                // No more ready phases
                if (eval_.ready.length === 0) {
                    // Check if all phases are completed
                    const allDone = [...this.dag.getNodes().values()].every(
                        (n) => n.state === 'completed' || n.state === 'skipped',
                    );
                    if (allDone) break;

                    // Check if any phase is paused (human gate)
                    const hasPaused = [...this.dag.getNodes().values()].some((n) => n.state === 'paused');
                    if (hasPaused) {
                        this.fsm.transition('human-gate');
                        await this.state.updateRunStatus(runId, 'PAUSED');
                        await this.emitEvent(runId, 'run.paused', {});
                        return {
                            runId,
                            status: 'PAUSED',
                            exitCode: 0,
                            durationMs: Date.now() - startTime,
                        };
                    }

                    await this.failPausedRun(
                        runId,
                        'Pipeline made no progress; dependency graph is blocked or circular',
                        startTime,
                    );
                    return {
                        runId,
                        status: 'FAILED',
                        exitCode: 1,
                        durationMs: Date.now() - startTime,
                    };
                }

                // Execute ready phases
                for (const phaseName of eval_.ready) {
                    if (requestedPhases && !requestedPhases.has(phaseName)) {
                        this.dag.markCompleted(phaseName);
                        continue;
                    }

                    const phaseDef = pipeline.phases[phaseName];
                    if (!phaseDef) continue;

                    // Mark as running
                    this.dag.markRunning(phaseName);
                    await this.state.updatePhaseStatus(runId, phaseName, 'running');

                    // Capture snapshot before phase execution
                    await this.captureSnapshot(runId, phaseName);

                    await this.emitEvent(runId, 'phase.started', { phase: phaseName });

                    await this.hooks.execute('on-phase-start', {
                        phase: phaseName,
                        task_ref: options.taskRef,
                        run_id: runId,
                    });

                    // Execute with rework loop
                    const phaseResult = await this.executePhaseWithRework(runId, phaseName, phaseDef, options);

                    if (!phaseResult.success) {
                        if (phaseDef.gate?.type === 'human' && phaseDef.gate.rework?.escalation === 'pause') {
                            this.dag.markPaused(phaseName);
                            await this.state.updatePhaseStatus(runId, phaseName, 'paused');
                            await this.hooks.execute('on-phase-failure', {
                                phase: phaseName,
                                task_ref: options.taskRef,
                                run_id: runId,
                                ...(phaseResult.errorMessage && { error: phaseResult.errorMessage }),
                            });
                            await this.hooks.execute('on-pause', {
                                phase: phaseName,
                                task_ref: options.taskRef,
                                run_id: runId,
                            });
                            this.fsm.transition('human-gate');
                            await this.state.updateRunStatus(runId, 'PAUSED');
                            await this.emitEvent(runId, 'run.paused', {
                                phase: phaseName,
                                error: phaseResult.errorMessage,
                            });
                            return {
                                runId,
                                status: 'PAUSED',
                                exitCode: 0,
                                durationMs: Date.now() - startTime,
                            };
                        }

                        // Phase failed
                        this.dag.markFailed(phaseName);
                        await this.state.updatePhaseStatus(
                            runId,
                            phaseName,
                            'failed',
                            phaseResult.errorCode,
                            phaseResult.errorMessage,
                        );
                        await this.hooks.execute('on-phase-failure', {
                            phase: phaseName,
                            task_ref: options.taskRef,
                            run_id: runId,
                            ...(phaseResult.errorMessage && { error: phaseResult.errorMessage }),
                        });
                        await this.failPausedRun(
                            runId,
                            phaseResult.errorMessage ?? `Phase ${phaseName} failed`,
                            startTime,
                            {
                                phase: phaseName,
                            },
                        );

                        return {
                            runId,
                            status: 'FAILED',
                            exitCode: 1,
                            durationMs: Date.now() - startTime,
                        };
                    }

                    // Phase succeeded — run gate check
                    let gateResult = await this.checkGate(
                        runId,
                        phaseName,
                        phaseDef.gate,
                        options.taskRef,
                        phaseResult.evidence,
                        phaseDef.skill,
                        options.auto,
                    );

                    while (gateResult.status === 'fail') {
                        const reworkResult = await this.handleRework(runId, phaseName, phaseDef, gateResult, options);

                        if (reworkResult.status === 'reworked') {
                            gateResult = await this.checkGate(
                                runId,
                                phaseName,
                                phaseDef.gate,
                                options.taskRef,
                                reworkResult.evidence,
                                phaseDef.skill,
                                options.auto,
                            );
                            continue;
                        }

                        if (reworkResult.status === 'pause') {
                            return this.pauseRunAtPhase(runId, phaseName, options.taskRef, startTime, true, {
                                error: this.getGateFailureMessage(phaseName, gateResult),
                            });
                        }

                        this.dag.markFailed(phaseName);
                        await this.state.updatePhaseStatus(runId, phaseName, 'failed');
                        await this.failPausedRun(runId, this.getGateFailureMessage(phaseName, gateResult), startTime, {
                            phase: phaseName,
                        });
                        return {
                            runId,
                            status: 'FAILED',
                            exitCode: 1,
                            durationMs: Date.now() - startTime,
                        };
                    }

                    if (gateResult.status === 'pending') {
                        return this.pauseRunAtPhase(runId, phaseName, options.taskRef, startTime);
                    }

                    // Gate passed — mark completed
                    this.dag.markCompleted(phaseName);
                    await this.state.updatePhaseStatus(runId, phaseName, 'completed');

                    // Finalize snapshot after phase completion
                    await this.finalizeSnapshot(runId, phaseName);

                    await this.hooks.execute('on-phase-complete', {
                        phase: phaseName,
                        task_ref: options.taskRef,
                        run_id: runId,
                    });

                    await this.emitEvent(runId, 'phase.completed', {
                        phase: phaseName,
                    });
                }
            }

            // All phases completed
            this.fsm.transition('all-phases-done');
            await this.state.updateRunStatus(runId, 'COMPLETED');
            await this.emitEvent(runId, 'run.completed', {});

            return {
                runId,
                status: 'COMPLETED',
                exitCode: 0,
                durationMs: Date.now() - startTime,
            };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`[runner] Pipeline failed: ${msg}`);

            await this.failPausedRun(runId, msg, startTime);

            return {
                runId,
                status: 'FAILED',
                exitCode: 1,
                durationMs: Date.now() - startTime,
            };
        }
    }

    private initializePipeline(pipeline: PipelineDefinition): void {
        this.dag.buildFromPhases(pipeline.phases);
        this.hooks.loadFromPipeline(pipeline.hooks);
    }

    private getRequestedPhases(
        options: Pick<RunOptions, 'phases' | 'preset'>,
        pipeline: PipelineDefinition,
    ): Set<string> | null {
        const presetPhases = options.preset ? pipeline.presets?.[options.preset]?.phases : undefined;
        return options.phases ? new Set(options.phases) : presetPhases ? new Set(presetPhases) : null;
    }

    private async getCompletedPhasesForTask(taskRef: string): Promise<Set<string>> {
        const completed = new Set<string>();
        try {
            const run = await this.state.getRunByTaskRef(taskRef);
            if (!run) return completed;
            const phases = await this.state.getPhases(run.id);
            for (const phase of phases) {
                if (phase.status === 'completed') {
                    completed.add(phase.name);
                }
            }
        } catch {
            // No previous runs or state not initialized — treat as empty
        }
        return completed;
    }

    private getRequestedPhasesFromRun(run: RunRecord): Set<string> | null {
        if (!run.phases_requested) {
            return null;
        }

        const phases = run.phases_requested
            .split(',')
            .map((phase) => phase.trim())
            .filter((phase) => phase.length > 0);

        return phases.length > 0 ? new Set(phases) : null;
    }

    private async rehydrateDag(runId: string, requestedPhases: Set<string> | null): Promise<void> {
        const phases = await this.state.getPhases(runId);
        const phaseMap = new Map(phases.map((phase) => [phase.name, phase]));

        for (const [name] of this.dag.getNodes()) {
            if (requestedPhases && !requestedPhases.has(name)) {
                this.dag.markCompleted(name);
                continue;
            }

            const phase = phaseMap.get(name);
            switch (phase?.status) {
                case 'completed':
                    this.dag.markCompleted(name);
                    break;
                case 'failed':
                    this.dag.markFailed(name);
                    break;
                case 'paused':
                    this.dag.markPaused(name);
                    break;
                case 'running':
                    await this.state.updatePhaseStatus(runId, name, 'pending');
                    break;
                default:
                    break;
            }
        }
    }

    private async failPausedRun(
        runId: string,
        error: string,
        _startTime: number,
        payload?: Record<string, unknown>,
    ): Promise<void> {
        this.fsm.transition('phase-fail-exhausted');
        await this.state.updateRunStatus(runId, 'FAILED');
        await this.emitEvent(runId, 'run.failed', {
            error,
            ...(payload ?? {}),
        });
    }

    private async approvePausedPhases(runId: string): Promise<void> {
        const pausedPhases = await this.state.getPhasesByStatus(runId, 'paused');
        for (const phase of pausedPhases) {
            this.dag.markCompleted(phase.name);
            await this.state.updatePhaseStatus(runId, phase.name, 'completed');
            await this.emitEvent(runId, 'phase.completed', {
                phase: phase.name,
                resumed: true,
            });
        }
    }

    private async rejectPausedPhases(runId: string): Promise<void> {
        const pausedPhases = await this.state.getPhasesByStatus(runId, 'paused');
        for (const phase of pausedPhases) {
            this.dag.markFailed(phase.name);
            await this.state.updatePhaseStatus(runId, phase.name, 'failed');
        }
    }

    private async pauseRunAtPhase(
        runId: string,
        phaseName: string,
        taskRef: string,
        startTime: number,
        notifyFailure = false,
        payload?: Record<string, unknown>,
    ): Promise<PipelineRunResult> {
        this.dag.markPaused(phaseName);
        await this.state.updatePhaseStatus(runId, phaseName, 'paused');

        if (notifyFailure) {
            await this.hooks.execute('on-phase-failure', {
                phase: phaseName,
                task_ref: taskRef,
                run_id: runId,
                ...(typeof payload?.error === 'string' && { error: payload.error }),
            });
        }

        await this.hooks.execute('on-pause', {
            phase: phaseName,
            task_ref: taskRef,
            run_id: runId,
        });
        this.fsm.transition('human-gate');
        await this.state.updateRunStatus(runId, 'PAUSED');
        await this.emitEvent(runId, 'run.paused', {
            phase: phaseName,
            ...(payload ?? {}),
        });
        return {
            runId,
            status: 'PAUSED',
            exitCode: 0,
            durationMs: Date.now() - startTime,
        };
    }

    private async executePhaseWithRework(
        runId: string,
        phaseName: string,
        phaseDef: PhaseDefinition,
        options: RunOptions,
    ): Promise<
        { success: true; evidence: PhaseEvidence } | { success: false; errorCode?: string; errorMessage?: string }
    > {
        // Subtask-aware implement phase
        // For implement phase, detect and iterate over subtask files
        if (phaseName === 'implement') {
            return this.executeSubtasksWithRework(runId, phaseName, phaseDef, options);
        }

        return this.executeSinglePhaseWithRework(runId, phaseName, phaseDef, options);
    }

    /**
     * Execute subtasks sequentially for the implement phase.
     *
     * Detects subtask files based on parent task's WBS prefix and iterates
     * over each subtask, running the implement skill on each one.
     */
    private async executeSubtasksWithRework(
        runId: string,
        phaseName: string,
        phaseDef: PhaseDefinition,
        options: RunOptions,
    ): Promise<
        { success: true; evidence: PhaseEvidence } | { success: false; errorCode?: string; errorMessage?: string }
    > {
        const parentWbs = extractWbsFromPath(options.taskRef);
        if (!parentWbs) {
            logger.warn('[runner] Could not extract WBS from task path, falling back to single phase');
            return this.executeSinglePhaseWithRework(runId, phaseName, phaseDef, options);
        }

        const subtasks = getSubtasks(parentWbs);

        if (subtasks.length === 0) {
            // No subtasks - fall back to current behavior (execute on parent task)
            logger.info(`[runner] No subtasks found for WBS ${parentWbs}, executing on parent task`);
            return this.executeSinglePhaseWithRework(runId, phaseName, phaseDef, options);
        }

        logger.info(
            `[runner] Found ${subtasks.length} subtask(s) for WBS ${parentWbs}: ${subtasks.map((s) => s.wbs).join(', ')}`,
        );

        const allEvidence: PhaseEvidence[] = [];

        // Execute each subtask sequentially
        for (const subtask of subtasks) {
            logger.info(`[runner] Executing subtask ${subtask.wbs}: ${subtask.path}`);

            const subtaskOptions: RunOptions = {
                ...options,
                taskRef: subtask.path,
            };

            const subtaskResult = await this.executeSinglePhaseWithRework(
                runId,
                `${phaseName}:${subtask.wbs}`,
                phaseDef,
                subtaskOptions,
            );

            if (!subtaskResult.success) {
                logger.error(`[runner] Subtask ${subtask.wbs} failed: ${subtaskResult.errorMessage}`);
                return subtaskResult;
            }

            allEvidence.push(subtaskResult.evidence);

            // Update subtask status to Done via tasks CLI
            await this.updateTaskStatus(subtask.wbs, 'done');

            logger.info(`[runner] Subtask ${subtask.wbs} completed successfully`);
        }

        // Update parent task status to Done
        await this.updateTaskStatus(parentWbs, 'done');

        // Return combined evidence from all subtasks
        const combinedEvidence: PhaseEvidence = {
            success: true,
            exitCode: 0,
            duration_ms: allEvidence.reduce((sum, e) => sum + e.duration_ms, 0),
            files_changed: [...new Set(allEvidence.flatMap((e) => [...e.files_changed]))],
            files_added: [...new Set(allEvidence.flatMap((e) => [...e.files_added]))],
            task_ref: options.taskRef,
            phase_name: phaseName,
            run_id: runId,
            rework_iteration: 0,
        };

        return {
            success: true,
            evidence: combinedEvidence,
        };
    }

    /**
     * Execute a single phase with rework loop.
     * This is the original executePhaseWithRework logic extracted for reuse.
     */
    private async executeSinglePhaseWithRework(
        runId: string,
        phaseName: string,
        phaseDef: PhaseDefinition,
        options: RunOptions,
    ): Promise<
        { success: true; evidence: PhaseEvidence } | { success: false; errorCode?: string; errorMessage?: string }
    > {
        const maxRework = phaseDef.gate?.rework?.max_iterations ?? 0;
        let iteration = 0;
        let feedback: string | undefined;

        while (iteration <= maxRework) {
            const req: ExecutionRequest = {
                skill: phaseDef.skill,
                phase: phaseName,
                prompt: `Execute ${phaseName} for ${options.taskRef}`,
                payload: {
                    task_ref: options.taskRef,
                    phase: phaseName,
                    ...(feedback && { feedback }),
                    ...(iteration > 0 && { rework_iteration: iteration }),
                },
                channel: options.channel ?? 'auto',
                taskRef: options.taskRef,
                timeoutMs: this.parseTimeout(phaseDef.timeout),
                ...(feedback && { feedback }),

                ...(iteration > 0 && { reworkIteration: iteration }),
                ...(maxRework > 0 && { reworkMax: maxRework }),
                ...(options.dryRun && { outputSchema: { dryRun: true } }),
                // NOTE: Session fields are passed through for backward compatibility.
                // By default, runner uses stateless ACP execution (acpx <agent> exec).
                // Session mode is opt-in via --session flag or routing policy.
                // See integrations/acp/sessions.ts for session lifecycle management.
                ...(options.session && { session: options.session }),
                ...(options.sessionTtlSeconds !== undefined && { sessionTtlSeconds: options.sessionTtlSeconds }),
            };

            const result = await this.pool.execute(req);

            if (result.success) {
                const evidence = await this.buildPhaseEvidence(
                    runId,
                    phaseName,
                    options.taskRef,
                    iteration,
                    result,
                    feedback,
                );
                await this.state.savePhaseEvidence({
                    run_id: runId,
                    phase_name: phaseName,
                    rework_iteration: evidence.rework_iteration,
                    evidence,
                });
                return {
                    success: true,
                    evidence,
                };
            }

            iteration++;
            feedback = result.stderr ?? 'Phase execution failed';

            if (iteration > maxRework) {
                return {
                    success: false,
                    errorCode: 'EXECUTION_FAILED',
                    errorMessage: feedback,
                };
            }

            await this.hooks.execute('on-rework', {
                phase: phaseName,
                task_ref: options.taskRef,
                run_id: runId,
                iteration,
                error: feedback,
            });
        }

        return { success: false, errorCode: 'MAX_REWORK_EXCEEDED' };
    }

    /**
     * Update task status via tasks CLI.
     */
    private async updateTaskStatus(wbs: string, status: 'done' | 'wip' | 'pending'): Promise<void> {
        try {
            const proc = Bun.spawnSync(['tasks', 'update', wbs, status], {
                cwd: process.cwd(),
                stdout: 'pipe',
                stderr: 'pipe',
            });
            if (proc.exitCode !== 0) {
                logger.warn(
                    `[runner] Failed to update task ${wbs} status: ${new TextDecoder().decode(proc.stderr).trim()}`,
                );
            }
        } catch (err) {
            logger.warn(`[runner] Error updating task ${wbs} status:`, err);
        }
    }

    private async checkGate(
        runId: string,
        phaseName: string,
        gate?: GateConfig,
        taskRef?: string,
        phaseEvidence?: PhaseEvidence,
        phaseSkill?: string,
        auto?: boolean,
    ): Promise<ChainState> {
        if (!gate) {
            return { status: 'pass', results: [] };
        }

        let result: ChainState;
        if (gate.type === 'command') {
            result = await this.checkCommandGate(runId, phaseName, gate, taskRef);
        } else if (gate.type === 'auto') {
            result = await this.checkAutoGate(runId, phaseName, gate, phaseEvidence, phaseSkill);
        } else if (gate.type === 'human') {
            result = this.checkHumanGate(runId, phaseName, gate, phaseEvidence, auto);
        } else {
            return { status: 'pass', results: [] };
        }

        for (const gateResult of result.results) {
            await this.state.saveGateResult(gateResult);
        }

        if (result.results.length > 0) {
            await this.emitEvent(runId, 'gate.evaluated', {
                phase: phaseName,
                gate_type: gate.type,
                passed: result.status === 'pass',
                duration_ms: result.results.reduce((total, item) => total + (item.duration_ms ?? 0), 0),
            });
        }

        return result;
    }

    /**
     * Resolve checklist for auto gate using precedence:
     * 1. Pipeline YAML explicit checklist
     * 2. Engine defaults
     */
    private resolveAutoChecklist(
        gate: GateConfig,
        skillRef?: string,
    ): { checklist: string[]; source: 'yaml' | 'skill' | 'engine' } {
        if (gate.checklist && gate.checklist.length > 0) {
            return { checklist: [...gate.checklist], source: 'yaml' };
        }

        const skillDefaults = skillRef ? this.loadSkillAutoGateDefaults(skillRef) : null;
        if (skillDefaults?.checklist && skillDefaults.checklist.length > 0) {
            return { checklist: [...skillDefaults.checklist], source: 'skill' };
        }
        return {
            checklist: ['Phase completed successfully without errors', 'Output is consistent with task requirements'],
            source: 'engine',
        };
    }

    /**
     * Real auto gate: uses verification-chain llm checker.
     * Builds LlmCheckerConfig from gate config + evidence, runs LLM check,
     * normalizes results into orchestration-v2 ChainState.
     */
    private async checkAutoGate(
        runId: string,
        phaseName: string,
        gate: GateConfig,
        phaseEvidence?: PhaseEvidence,
        skillRef?: string,
    ): Promise<ChainState> {
        const resolvedChecklist = this.resolveAutoChecklist(gate, skillRef);

        const severity = gate.severity ?? 'blocking';
        const promptTemplate = this.buildAutoGatePromptTemplate(
            gate.prompt_template ?? this.loadSkillAutoGateDefaults(skillRef ?? '')?.prompt_template,
            phaseEvidence,
        );

        const manifest: ChainManifest = {
            run_id: runId,
            phase_name: phaseName,
            checks: [
                {
                    name: 'auto-gate',
                    method: 'llm',
                    params: {
                        checklist: resolvedChecklist.checklist,
                        ...(promptTemplate && { prompt_template: promptTemplate }),
                    },
                },
            ],
        };

        const chainState = await this.verificationDriver.runChain(manifest);
        const driverResult = chainState.results[0];

        // Construct new gate evidence with runner-specific context
        const gateEvidence: Record<string, unknown> = {
            ...(driverResult.evidence ?? {}),
            severity,
            source: resolvedChecklist.source,
        };
        if (phaseEvidence) {
            gateEvidence.phase_evidence = phaseEvidence;
        }

        const passed = driverResult.passed;
        const isAdvisory = !passed && severity === 'advisory';

        const gateResult: GateResult = {
            ...driverResult,
            evidence: gateEvidence,
            ...(isAdvisory && { advisory: true }),
        };

        let status = chainState.status;
        if (isAdvisory) {
            logger.warn(
                `[gate] Advisory failure for phase ${phaseName}: ${driverResult.evidence?.error ?? 'checklist items failed'}`,
            );
            await this.emitEvent(runId, 'gate.advisory_fail', {
                phase: phaseName,
                checklist_failures: ((driverResult.evidence?.checklist as { item: string; passed: boolean }[]) ?? [])
                    .filter((r) => !r.passed)
                    .map((r) => r.item),
            });
            // Advisory failure still counts as pass for pipeline flow
            status = 'pass';
        }

        return {
            status,
            results: [gateResult],
        };
    }

    /**
     * Check human gate with blocking/advisory logic.
     *
     * Human gates with `blocking: true` MUST pause pipeline regardless of --auto flag.
     * Human gates with `blocking: false` (default) can be bypassed by --auto flag.
     *
     * Design decision: Human gates are blocking by default (safer defaults).
     * Explicit `blocking: false` is needed for advisory gates where LLM review suffices.
     */
    private checkHumanGate(
        runId: string,
        phaseName: string,
        gate: GateConfig,
        phaseEvidence?: PhaseEvidence,
        auto?: boolean,
    ): ChainState {
        // Blocking human gates ALWAYS pause regardless of --auto flag
        // Use case: PR review gate where human approval is mandatory
        if (gate.blocking === true) {
            return {
                status: 'pending',
                results: [
                    {
                        run_id: runId,
                        phase_name: phaseName,
                        step_name: 'human-gate',
                        checker_method: 'human',
                        passed: false,
                        evidence: {
                            blocking: true,
                            prompt: gate.prompt ?? `Approval required for phase ${phaseName}`,
                            ...(phaseEvidence ? { phase_evidence: phaseEvidence } : {}),
                        },
                        duration_ms: 0,
                        created_at: new Date(),
                    },
                ],
            };
        }

        // Advisory human gates: bypass if --auto is set
        // Use case: Optional review where LLM review is sufficient
        if (auto === true) {
            logger.info(`[gate] Human gate for phase ${phaseName} bypassed (advisory, --auto set)`);
            return {
                status: 'pass',
                results: [
                    {
                        run_id: runId,
                        phase_name: phaseName,
                        step_name: 'human-gate',
                        checker_method: 'human',
                        passed: true,
                        advisory: true,
                        evidence: {
                            blocking: false,
                            auto_bypassed: true,
                            prompt: gate.prompt ?? `Approval required for phase ${phaseName}`,
                            ...(phaseEvidence ? { phase_evidence: phaseEvidence } : {}),
                        },
                        duration_ms: 0,
                        created_at: new Date(),
                    },
                ],
            };
        }

        // Non-blocking gate without --auto: pause for human approval
        return {
            status: 'pending',
            results: [
                {
                    run_id: runId,
                    phase_name: phaseName,
                    step_name: 'human-gate',
                    checker_method: 'human',
                    passed: false,
                    evidence: {
                        blocking: false,
                        prompt: gate.prompt ?? `Approval required for phase ${phaseName}`,
                        ...(phaseEvidence ? { phase_evidence: phaseEvidence } : {}),
                    },
                    duration_ms: 0,
                    created_at: new Date(),
                },
            ],
        };
    }

    private async checkCommandGate(
        runId: string,
        phaseName: string,
        gate: GateConfig,
        taskRef?: string,
    ): Promise<ChainState> {
        const rawCommand = gate.command ?? '';
        if (!rawCommand) {
            return {
                status: 'fail',
                results: [
                    {
                        run_id: runId,
                        phase_name: phaseName,
                        step_name: 'command-gate',
                        checker_method: 'command',
                        passed: false,
                        evidence: { error: 'No command specified for command gate' },
                        duration_ms: 0,
                        created_at: new Date(),
                    },
                ],
            };
        }

        const command = this.substituteTemplate(rawCommand, {
            task_ref: taskRef ?? '',
            phase: phaseName,
            run_id: runId,
        });

        const startTime = Date.now();
        try {
            const proc = Bun.spawn(['sh', '-c', command], {
                stdout: 'pipe',
                stderr: 'pipe',
            });
            const exitCode = await proc.exited;
            const stdout = await new Response(proc.stdout).text();
            const stderr = await new Response(proc.stderr).text();
            const durationMs = Date.now() - startTime;

            const result: GateResult = {
                run_id: runId,
                phase_name: phaseName,
                step_name: 'command-gate',
                checker_method: 'command',
                passed: exitCode === 0,
                evidence: {
                    command,
                    exitCode,
                    ...(stdout.trim().length > 0 && { stdout: stdout.slice(0, 1000) }),
                    ...(stderr.trim().length > 0 && { stderr: stderr.slice(0, 1000) }),
                },
                duration_ms: durationMs,
                created_at: new Date(),
            };

            return {
                status: exitCode === 0 ? 'pass' : 'fail',
                results: [result],
            };
        } catch (err) {
            return {
                status: 'fail',
                results: [
                    {
                        run_id: runId,
                        phase_name: phaseName,
                        step_name: 'command-gate',
                        checker_method: 'command',
                        passed: false,
                        evidence: {
                            command,
                            error: err instanceof Error ? err.message : String(err),
                        },
                        duration_ms: Date.now() - startTime,
                        created_at: new Date(),
                    },
                ],
            };
        }
    }

    private substituteTemplate(template: string, vars: Record<string, string>): string {
        let result = template;
        for (const [key, value] of Object.entries(vars)) {
            result = result.replaceAll(`{{${key}}}`, value);
        }
        return result;
    }

    private async handleRework(
        runId: string,
        phaseName: string,
        phaseDef: PhaseDefinition,
        _gateResult: ChainState,
        options: RunOptions,
    ): Promise<{ status: 'reworked'; evidence: PhaseEvidence } | { status: 'pause' } | { status: 'failed' }> {
        const maxRework = phaseDef.gate?.rework?.max_iterations ?? 0;
        if (maxRework === 0) {
            return phaseDef.gate?.rework?.escalation === 'pause' ? { status: 'pause' } : { status: 'failed' };
        }

        // Get current rework iteration
        const phase = await this.state.getPhase(runId, phaseName);
        const currentIteration = phase?.rework_iteration ?? 0;

        if (currentIteration >= maxRework) {
            const escalation = phaseDef.gate?.rework?.escalation ?? 'fail';
            if (escalation === 'pause') {
                return { status: 'pause' };
            }
            return { status: 'failed' };
        }

        // Update rework iteration
        await this.state.updatePhaseReworkIteration(runId, phaseName, currentIteration + 1);

        logger.info(`[runner] Rework ${currentIteration + 1}/${maxRework} for phase ${phaseName}`);

        // Re-execute with feedback
        const result = await this.executePhaseWithRework(runId, phaseName, phaseDef, options);

        if (result.success) {
            return { status: 'reworked', evidence: result.evidence };
        }

        return { status: 'failed' };
    }

    private buildAutoGatePromptTemplate(
        promptTemplate: string | undefined,
        phaseEvidence?: PhaseEvidence,
    ): string | undefined {
        if (!phaseEvidence) {
            return promptTemplate;
        }

        const baseTemplate = promptTemplate ?? DEFAULT_AUTO_GATE_PROMPT_TEMPLATE;
        const evidenceJson = JSON.stringify(phaseEvidence, null, 2);

        if (baseTemplate.includes('{evidence}')) {
            return baseTemplate.replaceAll('{evidence}', evidenceJson);
        }

        return `${baseTemplate}

Phase execution evidence:
${evidenceJson}

Evaluate each checklist item against the evidence above.`;
    }

    private async buildPhaseEvidence(
        runId: string,
        phaseName: string,
        taskRef: string,
        reworkIteration: number,
        result: {
            exitCode: number;
            stdout?: string;
            stderr?: string;
            structured?: Record<string, unknown>;
            durationMs: number;
        },
        reworkFeedback?: string,
    ): Promise<PhaseEvidence> {
        const diffSummary = await this.getChangedFileSummary();
        return {
            success: true,
            exitCode: result.exitCode,
            ...(result.stdout && { stdout: result.stdout.slice(0, 4096) }),
            ...(result.stderr && { stderr: result.stderr.slice(0, 4096) }),
            ...(result.structured && { structured: result.structured }),
            duration_ms: result.durationMs,
            files_changed: diffSummary.changed,
            files_added: diffSummary.added,
            task_ref: taskRef,
            phase_name: phaseName,
            run_id: runId,
            rework_iteration: reworkIteration,
            ...(reworkFeedback && { rework_feedback: reworkFeedback }),
        };
    }

    private getGateFailureMessage(phaseName: string, gateResult: ChainState): string {
        const firstResult = gateResult.results[0];
        const error =
            typeof firstResult?.evidence?.error === 'string'
                ? firstResult.evidence.error
                : typeof firstResult?.evidence?.stderr === 'string'
                  ? firstResult.evidence.stderr
                  : undefined;
        return error ? `Gate failed for phase ${phaseName}: ${error}` : `Gate failed for phase ${phaseName}`;
    }

    private async emitEvent(
        runId: string,
        eventType: OrchestratorEvent['event_type'],
        payload: Record<string, unknown>,
    ): Promise<void> {
        this.eventBus.emit({
            run_id: runId,
            event_type: eventType,
            payload,
            timestamp: new Date(),
        });
    }

    private parseTimeout(timeout?: string): number {
        if (!timeout) return 30 * 60 * 1000; // Default 30 minutes
        const match = timeout.match(/^(\d+)(m|h|s)?$/);
        if (!match) return 30 * 60 * 1000;
        const value = Number.parseInt(match[1], 10);
        const unit = match[2] ?? 'm';
        switch (unit) {
            case 'h':
                return value * 60 * 60 * 1000;
            case 'm':
                return value * 60 * 1000;
            case 's':
                return value * 1000;
            default:
                return value * 60 * 1000;
        }
    }

    private generateRunId(): string {
        return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    private async hasUncommittedChanges(): Promise<boolean> {
        try {
            const proc = Bun.spawnSync(['git', 'status', '--porcelain'], {
                cwd: process.cwd(),
                stdout: 'pipe',
            });
            const output = new TextDecoder().decode(proc.stdout).trim();
            return output.length > 0;
        } catch {
            return false;
        }
    }

    private findDownstreamPhases(phaseName: string): string[] {
        // BFS to find all phases that transitively depend on phaseName
        const downstream: string[] = [];
        const visited = new Set<string>();
        const queue = [phaseName];
        visited.add(phaseName);

        while (queue.length > 0) {
            const current = queue.shift();
            if (current === undefined) break;
            for (const [name, node] of this.dag.getNodes()) {
                if (visited.has(name)) continue;
                if (node.dependencies.includes(current)) {
                    downstream.push(name);
                    visited.add(name);
                    queue.push(name);
                }
            }
        }

        return downstream;
    }

    private async captureSnapshot(runId: string, phaseName: string): Promise<void> {
        const gitHead = await this.getGitHead();
        const files = await this.getChangedFiles();
        await this.state.saveRollbackSnapshot({
            run_id: runId,
            phase_name: phaseName,
            git_head: gitHead,
            files_before: files,
        });
    }

    private async finalizeSnapshot(runId: string, phaseName: string): Promise<void> {
        const existing = await this.state.getRollbackSnapshot(runId, phaseName);
        const files = await this.getChangedFiles();
        await this.state.saveRollbackSnapshot({
            run_id: runId,
            phase_name: phaseName,
            ...(existing?.git_head && { git_head: existing.git_head }),
            ...(existing?.files_before && { files_before: existing.files_before }),
            files_after: files,
        });
    }

    private async getGitHead(): Promise<string> {
        try {
            const proc = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], {
                cwd: process.cwd(),
                stdout: 'pipe',
            });
            return new TextDecoder().decode(proc.stdout).trim();
        } catch {
            return '';
        }
    }

    private async getChangedFiles(): Promise<Record<string, string>> {
        try {
            const proc = Bun.spawnSync(['git', 'diff', '--name-only', 'HEAD'], {
                cwd: process.cwd(),
                stdout: 'pipe',
            });
            const output = new TextDecoder().decode(proc.stdout).trim();
            if (!output) return {};
            const files: Record<string, string> = {};
            for (const line of output.split('\n')) {
                const trimmed = line.trim();
                if (trimmed) files[trimmed] = 'modified';
            }
            return files;
        } catch {
            return {};
        }
    }

    private async getChangedFileSummary(): Promise<{ changed: string[]; added: string[] }> {
        const changed = new Set<string>();
        const added = new Set<string>();

        try {
            const diffProc = Bun.spawnSync(['git', 'diff', '--name-status', '--find-renames', 'HEAD'], {
                cwd: process.cwd(),
                stdout: 'pipe',
            });
            const diffOutput = new TextDecoder().decode(diffProc.stdout).trim();
            if (diffOutput) {
                for (const line of diffOutput.split('\n')) {
                    const [status, ...rest] = line.trim().split(/\s+/);
                    const file = rest[rest.length - 1];
                    if (!file) continue;
                    if (status?.startsWith('A')) {
                        added.add(file);
                    } else {
                        changed.add(file);
                    }
                }
            }

            const untrackedProc = Bun.spawnSync(['git', 'ls-files', '--others', '--exclude-standard'], {
                cwd: process.cwd(),
                stdout: 'pipe',
            });
            const untrackedOutput = new TextDecoder().decode(untrackedProc.stdout).trim();
            if (untrackedOutput) {
                for (const file of untrackedOutput
                    .split('\n')
                    .map((entry) => entry.trim())
                    .filter(Boolean)) {
                    added.add(file);
                }
            }
        } catch {
            return { changed: [], added: [] };
        }

        return {
            changed: [...changed].slice(0, 100),
            added: [...added].slice(0, 100),
        };
    }

    private loadSkillAutoGateDefaults(skillRef: string): { checklist?: string[]; prompt_template?: string } | null {
        const skillPath = this.resolveSkillDefinitionPath(skillRef);
        if (!skillPath || !existsSync(skillPath)) {
            return null;
        }

        try {
            const content = readFileSync(skillPath, 'utf-8');
            const match = content.match(/^---\n([\s\S]*?)\n---/);
            if (!match || !match[1]) {
                return null;
            }

            const frontmatter = parseYamlString(match[1]);
            const metadata = frontmatter.metadata as Record<string, unknown> | undefined;
            const gateDefaults = metadata?.gate_defaults as Record<string, unknown> | undefined;
            const autoDefaults = gateDefaults?.auto as Record<string, unknown> | undefined;
            if (!autoDefaults) {
                return null;
            }

            const checklist = Array.isArray(autoDefaults.checklist)
                ? autoDefaults.checklist.filter(
                      (item): item is string => typeof item === 'string' && item.trim().length > 0,
                  )
                : undefined;
            const promptTemplate =
                typeof autoDefaults.prompt_template === 'string' ? autoDefaults.prompt_template : undefined;

            return {
                ...(checklist && checklist.length > 0 ? { checklist } : {}),
                ...(promptTemplate ? { prompt_template: promptTemplate } : {}),
            };
        } catch {
            return null;
        }
    }

    private resolveSkillDefinitionPath(skillRef: string): string | null {
        const [plugin, skillName] = skillRef.split(':');
        if (!plugin || !skillName) {
            return null;
        }
        return resolve(process.cwd(), 'plugins', plugin, 'skills', skillName, 'SKILL.md');
    }
}
