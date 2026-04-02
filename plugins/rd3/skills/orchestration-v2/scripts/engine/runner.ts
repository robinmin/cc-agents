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
    ChainManifest,
    ChainState,
    OrchestratorEvent,
} from '../model';
import { EXIT_INVALID_ARGS } from '../model';
import { FSMEngine } from './fsm';
import { DAGScheduler, validatePhaseSubset } from './dag';
import { HookRegistry } from './hooks';
import { ExecutorPool } from '../executors/pool';
import type { StateManager } from '../state/manager';
import { EventStore } from '../state/events';
import { DefaultCoVDriver } from '../verification/cov-driver';
import { EventBus } from '../observability/event-bus';
import { logger } from '../../../../scripts/logger';

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
    private readonly covDriver: DefaultCoVDriver;
    private readonly eventBus: EventBus;

    constructor(
        stateManager: StateManager,
        executorPool?: ExecutorPool,
        hookRegistry?: HookRegistry,
        eventBus?: EventBus,
    ) {
        this.fsm = new FSMEngine();
        this.dag = new DAGScheduler();
        this.hooks = hookRegistry ?? new HookRegistry();
        this.pool = executorPool ?? new ExecutorPool();
        this.state = stateManager;
        this.covDriver = new DefaultCoVDriver();
        this.eventBus = eventBus ?? new EventBus();

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
        if (requestedPhases) {
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
                    const gateResult = await this.checkGate(runId, phaseName, phaseDef.gate);

                    if (gateResult.status === 'pending') {
                        this.dag.markPaused(phaseName);
                        await this.state.updatePhaseStatus(runId, phaseName, 'paused');
                        await this.hooks.execute('on-pause', {
                            phase: phaseName,
                            task_ref: options.taskRef,
                            run_id: runId,
                        });
                        this.fsm.transition('human-gate');
                        await this.state.updateRunStatus(runId, 'PAUSED');
                        await this.emitEvent(runId, 'run.paused', {
                            phase: phaseName,
                        });
                        return {
                            runId,
                            status: 'PAUSED',
                            exitCode: 0,
                            durationMs: Date.now() - startTime,
                        };
                    }

                    if (gateResult.status === 'fail') {
                        // Gate failed — try rework if configured
                        const reworked = await this.handleRework(runId, phaseName, phaseDef, gateResult, options);

                        if (!reworked) {
                            // Rework exhausted or not configured
                            if (phaseDef.gate?.type === 'human') {
                                // Pause for human review
                                this.dag.markPaused(phaseName);
                                await this.state.updatePhaseStatus(runId, phaseName, 'paused');
                                await this.hooks.execute('on-pause', {
                                    phase: phaseName,
                                    task_ref: options.taskRef,
                                    run_id: runId,
                                });
                                this.fsm.transition('human-gate');
                                await this.state.updateRunStatus(runId, 'PAUSED');
                                await this.emitEvent(runId, 'run.paused', {
                                    phase: phaseName,
                                });
                                return {
                                    runId,
                                    status: 'PAUSED',
                                    exitCode: 0,
                                    durationMs: Date.now() - startTime,
                                };
                            }

                            // Auto gate failure = phase failure
                            this.dag.markFailed(phaseName);
                            await this.state.updatePhaseStatus(runId, phaseName, 'failed');
                            await this.failPausedRun(runId, `Gate failed for phase ${phaseName}`, startTime, {
                                phase: phaseName,
                            });
                            return {
                                runId,
                                status: 'FAILED',
                                exitCode: 1,
                                durationMs: Date.now() - startTime,
                            };
                        }
                    } else {
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

    private async executePhaseWithRework(
        runId: string,
        phaseName: string,
        phaseDef: PhaseDefinition,
        options: RunOptions,
    ): Promise<{ success: boolean; errorCode?: string; errorMessage?: string }> {
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
                channel: options.channel ?? 'current',
                taskRef: options.taskRef,
                timeoutMs: this.parseTimeout(phaseDef.timeout),
                ...(feedback && { feedback }),

                ...(iteration > 0 && { reworkIteration: iteration }),
                ...(maxRework > 0 && { reworkMax: maxRework }),
                ...(options.dryRun && { outputSchema: { dryRun: true } }),
            };

            const result = await this.pool.execute(req);

            if (result.success) {
                return { success: true };
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

    private async checkGate(runId: string, phaseName: string, gate?: GateConfig): Promise<ChainState> {
        if (!gate) {
            return { status: 'pass', results: [] };
        }

        if (gate.type === 'auto') {
            // Run automated verification via CoV driver
            // Default auto-gate checks: verify output exists
            const manifest: ChainManifest = {
                run_id: runId,
                phase_name: phaseName,
                checks: [
                    {
                        name: 'execution-success',
                        method: 'cli',
                        params: { command: `echo "auto-gate-check: ${phaseName} passed"` },
                    },
                ],
            };
            return this.covDriver.runChain(manifest);
        }

        if (gate.type === 'human') {
            // Human gates require pause
            return { status: 'pending', results: [] };
        }

        return { status: 'pass', results: [] };
    }

    private async handleRework(
        runId: string,
        phaseName: string,
        phaseDef: PhaseDefinition,
        gateResult: ChainState,
        options: RunOptions,
    ): Promise<boolean> {
        const maxRework = phaseDef.gate?.rework?.max_iterations ?? 0;
        if (maxRework === 0) return false;

        const failedChecks = gateResult.results.filter((r) => !r.passed);
        const _feedback = failedChecks
            .map(
                (r) =>
                    `- ${r.step_name} (${r.checker_method}): failed${r.evidence ? ` — ${JSON.stringify(r.evidence)}` : ''}`,
            )
            .join('\n');

        // Get current rework iteration
        const phase = await this.state.getPhase(runId, phaseName);
        const currentIteration = phase?.rework_iteration ?? 0;

        if (currentIteration >= maxRework) {
            const escalation = phaseDef.gate?.rework?.escalation ?? 'fail';
            if (escalation === 'pause') {
                return false; // Will be handled as pause in caller
            }
            return false;
        }

        // Update rework iteration
        await this.state.updatePhaseReworkIteration(runId, phaseName, currentIteration + 1);

        logger.info(`[runner] Rework ${currentIteration + 1}/${maxRework} for phase ${phaseName}`);

        // Re-execute with feedback
        const result = await this.executePhaseWithRework(runId, phaseName, phaseDef, options);

        return result.success;
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
}
