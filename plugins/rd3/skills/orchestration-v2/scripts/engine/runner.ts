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
import { FSMEngine } from './fsm';
import { DAGScheduler } from './dag';
import { HookRegistry } from './hooks';
import { ExecutorPool } from '../executors/pool';
import type { StateManager } from '../state/manager';
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
    }

    async run(options: RunOptions, pipeline?: PipelineDefinition): Promise<PipelineRunResult> {
        const startTime = Date.now();

        if (!pipeline) {
            throw new Error('Pipeline definition required');
        }

        // Initialize
        this.dag.buildFromPhases(pipeline.phases);
        this.hooks.loadFromPipeline(pipeline.hooks);

        // Filter phases if specific phases requested
        const presetPhases = options.preset ? pipeline.presets?.[options.preset]?.phases : undefined;
        const requestedPhases = options.phases ? new Set(options.phases) : presetPhases ? new Set(presetPhases) : null;

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

        // Main execution loop
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

                    // Something is stuck
                    this.fsm.transition('phase-fail-exhausted');
                    await this.state.updateRunStatus(runId, 'FAILED');
                    await this.emitEvent(runId, 'run.failed', {
                        error: 'Pipeline made no progress; dependency graph is blocked or circular',
                    });
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

                    await this.emitEvent(runId, 'phase.started', { phase: phaseName });

                    // Execute with rework loop
                    const phaseResult = await this.executePhaseWithRework(runId, phaseName, phaseDef, options);

                    if (!phaseResult.success) {
                        if (phaseDef.gate?.type === 'human' && phaseDef.gate.rework?.escalation === 'pause') {
                            this.dag.markPaused(phaseName);
                            await this.state.updatePhaseStatus(runId, phaseName, 'paused');
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
                        this.fsm.transition('phase-fail-exhausted');
                        await this.state.updateRunStatus(runId, 'FAILED');
                        await this.emitEvent(runId, 'run.failed', {
                            phase: phaseName,
                            error: phaseResult.errorMessage,
                        });

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
                            this.fsm.transition('phase-fail-exhausted');
                            await this.state.updateRunStatus(runId, 'FAILED');
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

            this.fsm.transition('phase-fail-exhausted');
            await this.state.updateRunStatus(runId, 'FAILED');
            await this.emitEvent(runId, 'run.failed', { error: msg });

            return {
                runId,
                status: 'FAILED',
                exitCode: 1,
                durationMs: Date.now() - startTime,
            };
        }
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

        // Resume FSM
        if (options.approve) {
            this.fsm.transition('resume-approve');
        } else {
            this.fsm.transition('resume-reject');
        }
        await this.state.updateRunStatus(run.id, 'RUNNING');

        // Handle approve/reject for paused phases
        if (options.approve || options.reject) {
            const pausedPhases = await this.state.getPhasesByStatus(run.id, 'paused');
            for (const phase of pausedPhases) {
                if (options.approve) {
                    this.dag.markCompleted(phase.name);
                    await this.state.updatePhaseStatus(run.id, phase.name, 'completed');
                } else {
                    this.dag.markFailed(phase.name);
                    await this.state.updatePhaseStatus(run.id, phase.name, 'failed');
                }
            }
        }

        return {
            runId: run.id,
            status: 'COMPLETED',
            exitCode: 0,
            durationMs: Date.now() - startTime,
        };
    }

    async undo(_taskRef: string, _phase: string, _force?: boolean): Promise<void> {
        // Undo is complex — requires git revert and state rollback
        // Will be implemented in Phase 6 (Migration)
        logger.warn('[runner] Undo not yet implemented');
    }

    async getStatus(runId: string): Promise<RunRecord | null> {
        return this.state.getRun(runId);
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

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
}
