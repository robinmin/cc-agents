/**
 * orchestration-v2 — Hook registry + execution
 *
 * Manages pipeline-level hooks at FSM transition points.
 * Loads from pipeline YAML hook definitions and executes them in order.
 */

import type { HookAction, PipelineHooks } from '../model';
import { logger } from '../../../../scripts/logger';

export interface HookContext {
    readonly phase?: string;
    readonly task_ref: string;
    readonly run_id: string;
    readonly duration?: string;
    readonly iteration?: number;
    readonly error?: string;
}

const HOOK_NAMES = [
    'on-phase-start',
    'on-phase-complete',
    'on-phase-failure',
    'on-rework',
    'on-pause',
    'on-resume',
] as const;

export class HookRegistry {
    private hooks: Map<string, HookAction[]> = new Map();

    loadFromPipeline(pipelineHooks?: PipelineHooks): void {
        if (!pipelineHooks) return;

        for (const hookName of HOOK_NAMES) {
            const actions = pipelineHooks[hookName];
            if (actions && Array.isArray(actions)) {
                for (const action of actions) {
                    this.register(hookName, action);
                }
            }
        }
    }

    register(hookName: string, action: HookAction): void {
        const existing = this.hooks.get(hookName) ?? [];
        existing.push(action);
        this.hooks.set(hookName, existing);
    }

    async execute(hookName: string, context: HookContext): Promise<void> {
        const actions = this.hooks.get(hookName);
        if (!actions || actions.length === 0) return;

        for (const action of actions) {
            if (action.run) {
                await this.executeShellHook(hookName, action.run, context);
            }
            // action.pause / action.fail are handled by the FSM, not here
        }
    }

    private async executeShellHook(hookName: string, template: string, context: HookContext): Promise<void> {
        const command = this.interpolate(template, context);
        logger.info(`[${hookName}] Running: ${command}`);

        try {
            const proc = Bun.spawn(['sh', '-c', command], {
                stdout: 'pipe',
                stderr: 'pipe',
                env: {
                    ...process.env,
                    ORCH_TASK_REF: context.task_ref,
                    ORCH_RUN_ID: context.run_id,
                    ORCH_PHASE: context.phase ?? '',
                },
            });

            const exitCode = await proc.exited;
            if (exitCode !== 0) {
                const stderr = await new Response(proc.stderr).text();
                logger.error(`[${hookName}] Hook failed (exit ${exitCode}): ${stderr.slice(0, 200)}`);
            }
        } catch (err) {
            logger.error(`[${hookName}] Hook error: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    private interpolate(template: string, context: HookContext): string {
        return template
            .replace(/\{\{phase\}\}/g, context.phase ?? '')
            .replace(/\{\{task_ref\}\}/g, context.task_ref)
            .replace(/\{\{run_id\}\}/g, context.run_id)
            .replace(/\{\{duration\}\}/g, context.duration ?? '')
            .replace(/\{\{iteration\}\}/g, String(context.iteration ?? ''))
            .replace(/\{\{error\}\}/g, context.error ?? '');
    }

    /** Get registered hook count (for testing) */
    getHookCount(hookName?: string): number {
        if (hookName) {
            return this.hooks.get(hookName)?.length ?? 0;
        }
        let total = 0;
        for (const actions of this.hooks.values()) {
            total += actions.length;
        }
        return total;
    }

    /** Clear all hooks (for testing) */
    clear(): void {
        this.hooks.clear();
    }
}
