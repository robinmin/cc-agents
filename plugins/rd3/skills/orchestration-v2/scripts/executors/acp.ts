/**
 * orchestration-v2 — AcpExecutor
 *
 * Delegates skill execution to the pi agent via `acpx` CLI with tool invocation
 * enabled. The pi agent uses the Skill() tool to load and execute pipeline skills.
 *
 * Execution model:
 *   acpx [--allowed-tools Skill,...] pi exec "<structured-prompt>"
 *
 * The agent is given a deterministic, tool-first prompt that:
 *   1. Instructs it to invoke the Skill() tool immediately (no reasoning first)
 *   2. Passes the skill name, phase, task ref, and payload
 *   3. Requests structured JSON output from the skill result
 *
 * Output parsing:
 *   - Text output is captured from stdout (skill logs, agent summary)
 *   - Resource metrics are extracted from acpx NDJSON usage events
 *   - Structured results are extracted from JSON code blocks in stdout
 *
 * acpx interface reference:
 *   acpx [--options] <agent> exec [--options] [prompt...]
 *   acpx --allowed-tools Skill,Read,Bash,Edit,Write
 */

import type { Executor, ExecutionRequest, ExecutionResult, ExecutorCapabilities, ExecutorHealth } from '../model';
import { logger } from '../../../../scripts/logger';
import {
    ALLOWED_TOOLS,
    checkAcpxHealth,
    execAcpxSync,
    parseOutput,
    type AcpxQueryResult,
} from '../../../../scripts/libs/acpx-query';

// Re-export ALLOWED_TOOLS for backward compatibility
export { ALLOWED_TOOLS };

export class AcpExecutor implements Executor {
    readonly id: string;
    readonly capabilities: ExecutorCapabilities;
    private readonly agentName: string;
    /** Injectable exec function (defaults to execAcpxSync from acpx-query). Enables test mocking. */
    readonly execFn: (cmd: string[], timeoutMs?: number) => AcpxQueryResult;

    constructor(agentName = 'pi', execFn?: typeof execAcpxSync) {
        this.agentName = agentName;
        this.id = `acp:${agentName}`;
        this.capabilities = {
            parallel: true,
            streaming: true,
            structuredOutput: true,
            channels: [agentName, 'acp'],
            maxConcurrency: 4,
        };
        this.execFn = execFn ?? execAcpxSync;
    }

    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();

        try {
            const args = this.buildArgs(req);
            logger.info(`[acp:${this.agentName}] acpx ${args.join(' ')}`);

            const result = this.execFn(['acpx', ...args], req.timeoutMs);
            const durationMs = Date.now() - startTime;

            if (!result.ok && !result.timedOut) {
                logger.error(
                    `[acp:${this.agentName}] Phase ${req.phase} failed (exit ${result.exitCode}): ${result.stderr.slice(0, 300)}`,
                );
            }

            const { structured, metrics } = parseOutput(result.stdout, true, true);

            return {
                success: result.ok,
                exitCode: result.exitCode,
                stdout: result.stdout.slice(0, 50_000),
                stderr: result.stderr.slice(0, 10_000),
                ...(structured !== undefined && { structured }),
                durationMs,
                timedOut: result.timedOut ?? false,
                ...(metrics && metrics.length > 0 && { resources: metrics }),
            };
        } catch (err) {
            const durationMs = Date.now() - startTime;

            return {
                success: false,
                exitCode: 1,
                stderr: err instanceof Error ? err.message : String(err),
                durationMs,
                timedOut: false,
            };
        }
    }

    async healthCheck(): Promise<ExecutorHealth> {
        const health = checkAcpxHealth('acpx');
        return {
            healthy: health.healthy,
            ...(health.error && { message: health.error }),
            lastChecked: new Date(),
        };
    }

    async dispose(): Promise<void> {
        // Nothing to clean up
    }

    /**
     * Build acpx command-line arguments.
     *
     * Uses `exec` subcommand for one-shot execution by default. If req.session
     * is provided, uses `prompt --session <name>` for session reuse.
     *
     * Tool invocation is enabled via --allowed-tools so the pi agent can call
     * Skill() directly.
     *
     * Argument ordering (exec mode):
     *   acpx [global options] <agent> exec [agent options] [prompt]
     *
     * Argument ordering (session mode):
     *   acpx [global options] <agent> prompt --session <name> [prompt]
     *
     * Global options (positioned before the agent):
     *   --format json, --allowed-tools, --timeout, --non-interactive-permissions
     *
     * Note: --timeout and --non-interactive-permissions are global options in
     * acpx (v0.1.x). If acpx future-releases move them to agent-specific
     * options they must be repositioned to after "pi exec" or "pi prompt".
     */
    private buildArgs(req: ExecutionRequest): string[] {
        const args: string[] = [];

        // Global options — always positioned before the agent subcommand
        args.push('--format', 'json');
        args.push('--allowed-tools', ALLOWED_TOOLS);
        args.push('--timeout', String(Math.max(1, Math.ceil(req.timeoutMs / 1000))));
        args.push('--non-interactive-permissions', 'deny');

        // Agent subcommand and prompt
        if (req.session) {
            // Session mode: use prompt --session for session reuse
            args.push(this.agentName, 'prompt', '--session', req.session);
            if (req.sessionTtlSeconds !== undefined && req.sessionTtlSeconds > 0) {
                args.push('--ttl', String(req.sessionTtlSeconds));
            }
        } else {
            // One-shot mode: use exec
            args.push(this.agentName, 'exec');
        }
        args.push(this.buildPrompt(req));

        return args;
    }

    /**
     * Build the execution prompt for the pi agent.
     *
     * Design goals:
     *   1. Tool-first: the agent must invoke Skill() before doing anything else
     *   2. Deterministic: no ambiguity about what to call or how to pass args
     *   3. Structured: the skill result should be surfaced as JSON
     *
     * The prompt is intentionally terse and imperative. The agent should NOT
     * reason or plan — it should immediately invoke Skill() with the given args.
     */
    private buildPrompt(req: ExecutionRequest): string {
        const skillName = req.skill; // e.g. "rd3:request-intake"
        const parts: string[] = [];

        parts.push(`Skill execution: "${skillName}"`);
        parts.push('');
        parts.push('Context:');
        parts.push(`  phase: ${req.phase}`);
        parts.push(`  task: ${req.taskRef ?? '(none)'}`);
        if (Object.keys(req.payload).length > 0) {
            parts.push(`  payload: ${JSON.stringify(req.payload)}`);
        }
        if (req.feedback) {
            parts.push(`  feedback: ${req.feedback}`);
        }
        if (req.reworkIteration !== undefined) {
            parts.push(`  rework: iteration ${req.reworkIteration}/${req.reworkMax ?? 'unlimited'}`);
        }

        parts.push('');
        parts.push(
            `Invoke Skill("${skillName}") now with phase="${req.phase}" and the above context. ` +
                'After the skill completes, output its final result as ```json\\n{...}\\n```.',
        );

        return parts.join('\n');
    }
}
