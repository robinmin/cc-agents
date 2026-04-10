/**
 * orchestration-v2 — Inline Executor
 *
 * True in-process execution for skills that expose a dedicated local entrypoint.
 * This keeps execution inside the current Bun process and fails clearly when a
 * skill package does not support safe in-process execution.
 */

import type { ExecutionRequest, ExecutionResult, Executor, ExecutorHealth } from '../model';
import { logger } from '../../../../scripts/logger';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

export type LocalEntryModule = {
    default?: (req: ExecutionRequest) => Promise<ExecutionResult> | ExecutionResult;
    executeLocal?: (req: ExecutionRequest) => Promise<ExecutionResult> | ExecutionResult;
    runLocalPhase?: (req: ExecutionRequest) => Promise<ExecutionResult> | ExecutionResult;
};

type ModuleLoader = (entryPath: string) => Promise<LocalEntryModule>;

/**
 * Default module loader — uses dynamic import with cache-busting query param.
 */
const defaultModuleLoader: ModuleLoader = async (entryPath: string) => {
    return (await import(`${pathToFileURL(entryPath).href}?t=${Date.now()}`)) as LocalEntryModule;
};

/**
 * Inline executor — runs skill phases in the current Bun process.
 *
 * Implements the unified `Executor` interface (not PhaseExecutorAdapter).
 * Resolves a local entrypoint in the skill package and calls it directly.
 */
export class InlineExecutor implements Executor {
    readonly id = 'inline';
    readonly name = 'Inline Executor (in-process)';
    readonly channels = ['inline'] as const;
    readonly maxConcurrency = 1;

    readonly skillBaseDir: string;
    private readonly moduleLoader: ModuleLoader;

    constructor(skillBaseDir?: string, moduleLoader?: ModuleLoader) {
        this.skillBaseDir = skillBaseDir ?? resolve(process.cwd(), 'plugins', 'rd3', 'skills');
        this.moduleLoader = moduleLoader ?? defaultModuleLoader;
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
                        `Use executor.mode: subprocess or an explicit external channel/adapter for this phase.`,
                    durationMs: Date.now() - startTime,
                    timedOut: false,
                };
            }

            const module = await this.moduleLoader(entryPath);
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
            logger.error(`[inline] Execution failed for ${req.skill}: ${message}`);
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
        // Nothing to clean up for in-process inline execution.
    }

    readonly resolveLocalEntrypoint = (skillRef: string): string | null => {
        const [plugin, skillName] = skillRef.split(':');
        if (!plugin || !skillName) {
            logger.warn(`[inline] Invalid skill ref format: ${skillRef}`);
            return null;
        }

        // skillBaseDir already includes the plugin path (e.g. plugins/rd3/skills),
        // so only append skillName to avoid double-nesting: rd3:code-implement-common
        // → plugins/rd3/skills/code-implement-common/scripts/local.ts
        const candidates = [
            resolve(this.skillBaseDir, skillName, 'scripts', 'local.ts'),
            resolve(this.skillBaseDir, skillName, 'local.ts'),
            resolve(this.skillBaseDir, skillName, 'index.ts'),
        ];

        for (const candidate of candidates) {
            if (existsSync(candidate)) {
                return candidate;
            }
        }

        return null;
    };
}

// ─── Factory Exports ──────────────────────────────────────────────────────────

/**
 * Default inline executor instance.
 */
export const DEFAULT_INLINE_EXECUTOR = new InlineExecutor();

/**
 * Create an inline executor for a specific skill base directory.
 */
export function createInlineExecutor(skillBaseDir?: string): Executor {
    return new InlineExecutor(skillBaseDir);
}
