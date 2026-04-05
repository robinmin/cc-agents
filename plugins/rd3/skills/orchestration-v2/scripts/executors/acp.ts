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

import type {
    Executor,
    ExecutionRequest,
    ExecutionResult,
    ExecutorCapabilities,
    ExecutorHealth,
    ResourceMetrics,
} from '../model';
import { logger } from '../../../../scripts/logger';

/** Tools the pi agent is allowed to use during skill execution. */
export const ALLOWED_TOOLS = 'Skill,Read,Bash,Edit,Write,Glob,grep,WebSearch,WebFetch';

export class AcpExecutor implements Executor {
    readonly id: string;
    readonly capabilities: ExecutorCapabilities;
    private readonly agentName: string;

    constructor(agentName = 'pi') {
        this.agentName = agentName;
        this.id = `acp:${agentName}`;
        this.capabilities = {
            parallel: true,
            streaming: true,
            structuredOutput: true,
            channels: [agentName, 'acp'],
            maxConcurrency: 4,
        };
    }

    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), req.timeoutMs);

        try {
            const args = this.buildArgs(req);
            logger.info(`[acp:${this.agentName}] acpx ${args.join(' ')}`);

            const proc = Bun.spawn(['acpx', ...args], {
                stdout: 'pipe',
                stderr: 'pipe',
                cwd: process.cwd(),
                signal: controller.signal,
                env: this.buildEnv(req),
            });

            const exitCode = await proc.exited;
            clearTimeout(timeoutId);

            const stdout = await new Response(proc.stdout).text();
            const stderr = await new Response(proc.stderr).text();
            const durationMs = Date.now() - startTime;
            const timedOut = controller.signal.aborted;

            if (exitCode !== 0 && !timedOut) {
                logger.error(
                    `[acp:${this.agentName}] Phase ${req.phase} failed (exit ${exitCode}): ${stderr.slice(0, 300)}`,
                );
            }

            const { structured, resources } = this.parseOutput(stdout);

            return {
                success: exitCode === 0,
                exitCode,
                stdout: stdout.slice(0, 50_000),
                stderr: stderr.slice(0, 10_000),
                ...(structured !== undefined && { structured }),
                durationMs,
                timedOut,
                ...(resources.length > 0 && { resources }),
            };
        } catch (err) {
            clearTimeout(timeoutId);
            const durationMs = Date.now() - startTime;

            if (controller.signal.aborted) {
                return {
                    success: false,
                    exitCode: 1,
                    stderr: `Phase ${req.phase} timed out after ${req.timeoutMs}ms`,
                    durationMs,
                    timedOut: true,
                };
            }

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
        try {
            const proc = Bun.spawn(['acpx', '--version'], {
                stdout: 'pipe',
                stderr: 'pipe',
            });
            const exitCode = await proc.exited;
            return {
                healthy: exitCode === 0,
                ...(exitCode !== 0 && { message: 'acpx not found or not working' }),
                lastChecked: new Date(),
            };
        } catch {
            return {
                healthy: false,
                message: 'acpx not available',
                lastChecked: new Date(),
            };
        }
    }

    async dispose(): Promise<void> {
        // Nothing to clean up
    }

    private buildEnv(req: ExecutionRequest): NodeJS.ProcessEnv {
        return {
            ...process.env,
            ORCH_PHASE: req.phase,
            ORCH_CHANNEL: req.channel,
            ...(req.taskRef && { ORCH_TASK_REF: req.taskRef }),
        };
    }

    /**
     * Build acpx command-line arguments.
     *
     * Uses `exec` subcommand for one-shot execution. Tool invocation is enabled
     * via --allowed-tools so the pi agent can call Skill() directly.
     *
     * Argument ordering:
     *   acpx [global options] <agent> exec [agent options] [prompt]
     *
     * Global options (positioned before the agent):
     *   --format json, --allowed-tools, --timeout, --non-interactive-permissions
     *
     * Agent subcommand and prompt (positioned after the agent):
     *   pi exec <prompt>
     *
     * Note: --timeout and --non-interactive-permissions are global options in
     * acpx (v0.1.x). If acpx future-releases move them to agent-specific
     * options they must be repositioned to after "pi exec".
     */
    private buildArgs(req: ExecutionRequest): string[] {
        const args: string[] = [];

        // Global options — always positioned before the agent subcommand
        args.push('--format', 'json');
        args.push('--allowed-tools', ALLOWED_TOOLS);
        args.push('--timeout', String(Math.max(1, Math.ceil(req.timeoutMs / 1000))));
        args.push('--non-interactive-permissions', 'deny');

        // Agent subcommand and prompt
        args.push(this.agentName, 'exec');
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

    /**
     * Parse acpx --format json output for structured results and resource metrics.
     *
     * acpx emits NDJSON — one JSON object per line:
     *   { "type": "usage",   "usage": { "model_id": "...", ... } }
     *   { "type": "text",    "content": "..." }
     *   { "type": "tool",    "name": "Skill", "status": "done" }
     *   { "type": "done" }
     *
     * Non-NDJSON lines (plain text or embedded JSON) are also possible and are
     * handled gracefully — they may contain the skill's structured output.
     */
    private parseOutput(
        output: string,
    ): { structured: Record<string, unknown> | undefined; resources: ResourceMetrics[] } {
        let structured: Record<string, unknown> | undefined;
        const resources: ResourceMetrics[] = [];

        // 1. First pass: extract NDJSON events (usage metrics, structured data)
        for (const line of output.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
                const event = JSON.parse(trimmed) as Record<string, unknown>;

                if (event.type === 'usage' && typeof event.usage === 'object' && event.usage) {
                    const usage = event.usage as Record<string, unknown>;
                    resources.push({
                        model_id: String(usage.model_id ?? ''),
                        model_provider: String(usage.model_provider ?? ''),
                        input_tokens: Math.floor(Number(usage.input_tokens ?? 0)) || 0,
                        output_tokens: Math.floor(Number(usage.output_tokens ?? 0)) || 0,
                        wall_clock_ms: Math.floor(Number(usage.wall_clock_ms ?? 0)) || 0,
                        execution_ms: Math.floor(Number(usage.execution_ms ?? 0)) || 0,
                        ...(usage.cache_read_tokens != null && {
                            cache_read_tokens: Math.floor(Number(usage.cache_read_tokens)) || 0,
                        }),
                        ...(usage.cache_creation_tokens != null && {
                            cache_creation_tokens: Math.floor(Number(usage.cache_creation_tokens)) || 0,
                        }),
                        ...(usage.first_token_ms != null && {
                            first_token_ms: Math.floor(Number(usage.first_token_ms)) || 0,
                        }),
                    });
                } else if (event.type === 'structured' && typeof event.data === 'object') {
                    structured = event.data as Record<string, unknown>;
                }
                // Skip other event types (text, tool, done, etc.)
            } catch {
                // Not valid JSON on this line — try markdown JSON block extraction below
            }
        }

        // 2. Second pass: extract JSON from markdown code blocks in full output
        //    Uses a multi-line search so fences on separate lines are handled.
        if (structured === undefined) {
            structured = this.extractFromJsonBlock(output);
        }

        return { structured, resources };
    }

    /**
     * Extract the first complete JSON object from a markdown ```json code block.
     *
     * Handles:
     *   - Single-line blocks:     ```json\n{"a":1}\n```  (fence on its own line)
     *   - Multi-line blocks:      ```json\n{"a":{"b":1}}\n```
     *   - Nested objects:         ```json\n{"a":{"b":{"c":1}},"d":2}\n```
     *   - Blank line before fence: ```json\n{"a":1}\n\n```  (common AI output format)
     *   - No newline before fence: ```json\n{"x":1}``` (fence immediately after JSON)
     *   - Multiple blocks: only the first is considered
     *   - Partial JSON: returns undefined rather than a truncated object
     */
    private extractFromJsonBlock(output: string): Record<string, unknown> | undefined {
        const fenceOpen = '```json';
        const fenceClose = '```';

        const openIdx = output.indexOf(fenceOpen);
        if (openIdx === -1) return undefined;

        const contentStart = openIdx + fenceOpen.length;
        const closeIdx = output.indexOf(fenceClose, contentStart);
        if (closeIdx === -1) return undefined;

        const raw = output.slice(contentStart, closeIdx);
        const candidate = this.extractFirstBalancedJsonObject(raw);

        if (!candidate.startsWith('{') || !candidate.endsWith('}')) {
            return undefined;
        }

        // Validate JSON is complete (balanced braces).
        // Scan forward — if we never reach depth 0 by the end of candidate,
        // the object was truncated mid-parsing.
        let depth = 0;
        let inString = false;
        let escaped = false;
        for (let i = 0; i < candidate.length; i++) {
            const ch = candidate[i] as string;
            if (escaped) { escaped = false; continue; }
            if (ch === '\\') { escaped = true; continue; }
            if (ch === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (ch === '{' || ch === '[') depth++;
            if (ch === '}' || ch === ']') depth--;
        }
        if (depth !== 0) return undefined; // truncated

        try {
            const parsed = JSON.parse(candidate) as Record<string, unknown>;
            if (Object.keys(parsed).length > 0) return parsed;
        } catch {
            // Not valid JSON
        }
        return undefined;
    }

    /**
     * Extract the first balanced JSON object from a string by scanning forward.
     * This correctly handles escapes inside quoted strings.
     */
    private extractFirstBalancedJsonObject(s: string): string {
        const trimmed = s.trimStart();
        const start = trimmed.indexOf('{');
        if (start === -1) {
            return '';
        }

        let depth = 0;
        let inString = false;
        let escaped = false;

        for (let i = start; i < trimmed.length; i++) {
            const ch = trimmed[i] as string;
            if (escaped) { escaped = false; continue; }
            if (ch === '\\') { escaped = true; continue; }
            if (ch === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (ch === '{' || ch === '[') {
                depth++;
            } else if (ch === '}' || ch === ']') {
                depth--;
                if (depth === 0) {
                    return trimmed.slice(start, i + 1);
                }
            }
        }

        return '';
    }
}
