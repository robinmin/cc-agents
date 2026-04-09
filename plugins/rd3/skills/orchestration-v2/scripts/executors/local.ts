/**
 * orchestration-v2 — Local Executor
 *
 * True in-process execution for skills that expose a dedicated local entrypoint.
 * This keeps execution inside the current Bun process and fails clearly when a
 * skill package does not support safe in-process execution.
 */

import type { ExecutionRequest, ExecutionResult, ExecutorCapabilities } from '../model';
import type { ExecutorHealth, PhaseExecutorAdapter } from './adapter';
import { logger } from '../../../../scripts/logger';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

type LocalEntryModule = {
    default?: (req: ExecutionRequest) => Promise<ExecutionResult> | ExecutionResult;
    executeLocal?: (req: ExecutionRequest) => Promise<ExecutionResult> | ExecutionResult;
    runLocalPhase?: (req: ExecutionRequest) => Promise<ExecutionResult> | ExecutionResult;
};

export class LocalExecutor implements PhaseExecutorAdapter {
    readonly id = 'local';
    readonly name = 'Local Executor (in-process)';
    readonly executionMode: 'stateless' = 'stateless';
    readonly channels = ['local'] as const;
    readonly capabilities: ExecutorCapabilities = {
        parallel: false,
        streaming: true,
        structuredOutput: true,
        channels: ['local'],
        maxConcurrency: 1,
    };

    private readonly skillBaseDir: string;

    constructor(skillBaseDir?: string) {
        this.skillBaseDir = skillBaseDir ?? resolve(process.cwd(), 'plugins', 'rd3', 'skills');
    }

    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();

        try {
            const entryPath = this.resolveLocalEntrypoint(req.skill);
            if (!entryPath) {
                return {
                    success: false,
                    exitCode: 1,
                    stderr:
                        `Skill ${req.skill} does not expose a local in-process entrypoint. ` +
                        `Use executor.mode: direct or an explicit external channel/adapter for this phase.`,
                    durationMs: Date.now() - startTime,
                    timedOut: false,
                };
            }

            const module = (await import(`${pathToFileURL(entryPath).href}?t=${Date.now()}`)) as LocalEntryModule;
            const handler = module.runLocalPhase ?? module.executeLocal ?? module.default;

            if (typeof handler !== 'function') {
                return {
                    success: false,
                    exitCode: 1,
                    stderr:
                        `Local entrypoint ${entryPath} for ${req.skill} must export ` +
                        '`runLocalPhase(req)`, `executeLocal(req)`, or a default function.',
                    durationMs: Date.now() - startTime,
                    timedOut: false,
                };
            }

            const result = await handler(req);
            return {
                ...result,
                durationMs: result.durationMs ?? Date.now() - startTime,
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`[local] Execution failed for ${req.skill}: ${message}`);
            return {
                success: false,
                exitCode: 1,
                stderr: message,
                durationMs: Date.now() - startTime,
                timedOut: false,
            };
        }
    }

    async healthCheck(): Promise<ExecutorHealth> {
        return {
            healthy: true,
            lastChecked: new Date(),
        };
    }

    async dispose(): Promise<void> {
        // Nothing to clean up for in-process local execution.
    }

    readonly resolveLocalEntrypoint = (skillRef: string): string | null => {
        const [plugin, skillName] = skillRef.split(':');
        if (!plugin || !skillName) {
            logger.warn(`[local] Invalid skill ref format: ${skillRef}`);
            return null;
        }

        const candidates = [
            resolve(this.skillBaseDir, plugin, skillName, 'scripts', 'local.ts'),
            resolve(this.skillBaseDir, plugin, skillName, 'local.ts'),
            resolve(this.skillBaseDir, plugin, skillName, 'index.ts'),
        ];

        for (const candidate of candidates) {
            if (existsSync(candidate)) {
                return candidate;
            }
        }

        return null;
    };
}
