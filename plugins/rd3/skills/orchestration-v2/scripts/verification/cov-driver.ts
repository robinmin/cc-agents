/**
 * orchestration-v2 — CoV Driver
 *
 * Adapter over the verification-chain interpreter.
 * Runs chain checks via CLI commands and aggregates results.
 */

import type { VerificationDriver, ChainManifest, ChainState, ChainCheck, GateResult } from '../model';
import { logger } from '../../../../scripts/logger';
import { runLlmCheck } from '../../../verification-chain/scripts/methods/llm';
import type { LlmCheckerConfig } from '../../../verification-chain/scripts/types';

export class DefaultCoVDriver implements VerificationDriver {
    async runChain(manifest: ChainManifest): Promise<ChainState> {
        const results: GateResult[] = [];

        for (const check of manifest.checks) {
            const result = await this.runCheck(manifest.run_id, manifest.phase_name, check);
            results.push(result);
        }

        const allPassed = results.every((r) => r.passed);
        return {
            status: allPassed ? 'pass' : 'fail',
            results,
        };
    }

    async resumeChain(stateDir: string, action?: 'approve' | 'reject'): Promise<ChainState> {
        logger.info(`[cov] Resuming chain from ${stateDir} with action: ${action ?? 'none'}`);

        // For human-approval gates: approve passes, reject fails
        if (action === 'approve') {
            return {
                status: 'pass',
                results: [
                    {
                        run_id: '',
                        phase_name: '',
                        step_name: 'human-approval',
                        checker_method: 'human',
                        passed: true,
                    },
                ],
            };
        }

        if (action === 'reject') {
            return {
                status: 'fail',
                results: [
                    {
                        run_id: '',
                        phase_name: '',
                        step_name: 'human-approval',
                        checker_method: 'human',
                        passed: false,
                    },
                ],
            };
        }

        // Default: re-run the chain from state directory
        try {
            const proc = Bun.spawn(
                [
                    'bun',
                    'run',
                    'plugins/rd3/skills/verification-chain/scripts/interpreter.ts',
                    'resume',
                    '--state-dir',
                    stateDir,
                ],
                {
                    stdout: 'pipe',
                    stderr: 'pipe',
                },
            );

            const exitCode = await proc.exited;
            const stdout = await new Response(proc.stdout).text();

            if (exitCode === 0) {
                const parsed = JSON.parse(stdout) as ChainState;
                return parsed;
            }
        } catch (err) {
            logger.error(`[cov] Resume failed: ${err instanceof Error ? err.message : String(err)}`);
        }

        return {
            status: 'pending',
            results: [],
        };
    }

    private async runCheck(runId: string, phaseName: string, check: ChainCheck): Promise<GateResult> {
        const startTime = Date.now();

        try {
            // Dispatch based on method
            switch (check.method) {
                case 'cli':
                    return await this.runCliCheck(runId, phaseName, check, startTime);
                case 'content_match':
                    return await this.runContentMatchCheck(runId, phaseName, check, startTime);
                case 'llm':
                    return await this.runLlmCheckDriver(runId, phaseName, check, startTime);
                case 'human':
                    return {
                        run_id: runId,
                        phase_name: phaseName,
                        step_name: check.name,
                        checker_method: check.method,
                        passed: false,
                        duration_ms: Date.now() - startTime,
                        created_at: new Date(),
                    };
                default:
                    logger.warn(`[cov] Unknown check method: ${check.method}`);
                    return {
                        run_id: runId,
                        phase_name: phaseName,
                        step_name: check.name,
                        checker_method: check.method,
                        passed: false,
                        duration_ms: Date.now() - startTime,
                        created_at: new Date(),
                    };
            }
        } catch (err) {
            return {
                run_id: runId,
                phase_name: phaseName,
                step_name: check.name,
                checker_method: check.method,
                passed: false,
                evidence: {
                    error: err instanceof Error ? err.message : String(err),
                },
                duration_ms: Date.now() - startTime,
                created_at: new Date(),
            };
        }
    }

    private async runCliCheck(
        runId: string,
        phaseName: string,
        check: ChainCheck,
        startTime: number,
    ): Promise<GateResult> {
        const command = (check.params?.command as string) ?? '';
        if (!command) {
            return {
                run_id: runId,
                phase_name: phaseName,
                step_name: check.name,
                checker_method: check.method,
                passed: false,
                evidence: { error: 'No command specified for CLI check' },
                duration_ms: Date.now() - startTime,
                created_at: new Date(),
            };
        }

        const proc = Bun.spawn(['sh', '-c', command], {
            stdout: 'pipe',
            stderr: 'pipe',
        });
        const exitCode = await proc.exited;
        const stdout = await new Response(proc.stdout).text();
        const durationMs = Date.now() - startTime;

        return {
            run_id: runId,
            phase_name: phaseName,
            step_name: check.name,
            checker_method: check.method,
            passed: exitCode === 0,
            evidence: {
                exitCode,
                ...(stdout.trim().length > 0 && { output: stdout.slice(0, 1000) }),
            },
            duration_ms: durationMs,
            created_at: new Date(),
        };
    }

    private async runContentMatchCheck(
        runId: string,
        phaseName: string,
        check: ChainCheck,
        startTime: number,
    ): Promise<GateResult> {
        const file = (check.params?.file as string) ?? '';
        const pattern = (check.params?.pattern as string) ?? '';

        if (!file || !pattern) {
            return {
                run_id: runId,
                phase_name: phaseName,
                step_name: check.name,
                checker_method: check.method,
                passed: false,
                evidence: { error: 'Missing file or pattern for content_match' },
                duration_ms: Date.now() - startTime,
                created_at: new Date(),
            };
        }

        try {
            const content = await Bun.file(file).text();
            const regex = new RegExp(pattern);
            const matched = regex.test(content);

            return {
                run_id: runId,
                phase_name: phaseName,
                step_name: check.name,
                checker_method: check.method,
                passed: matched,
                evidence: { file, pattern, matched },
                duration_ms: Date.now() - startTime,
                created_at: new Date(),
            };
        } catch (err) {
            return {
                run_id: runId,
                phase_name: phaseName,
                step_name: check.name,
                checker_method: check.method,
                passed: false,
                evidence: {
                    file,
                    error: err instanceof Error ? err.message : String(err),
                },
                duration_ms: Date.now() - startTime,
                created_at: new Date(),
            };
        }
    }

    private async runLlmCheckDriver(
        runId: string,
        phaseName: string,
        check: ChainCheck,
        startTime: number,
    ): Promise<GateResult> {
        const checklist = (check.params?.checklist as string[]) ?? [];
        if (!checklist || checklist.length === 0) {
            return {
                run_id: runId,
                phase_name: phaseName,
                step_name: check.name,
                checker_method: check.method,
                passed: false,
                evidence: { error: 'No checklist specified for LLM check' },
                duration_ms: Date.now() - startTime,
                created_at: new Date(),
            };
        }

        const config: LlmCheckerConfig = {
            checklist,
        };
        if (check.params?.prompt_template) {
            config.prompt_template = check.params.prompt_template as string;
        }

        const result = await runLlmCheck(config);
        const durationMs = Date.now() - startTime;

        const gateEvidence: Record<string, unknown> = {
            checklist: result.evidence.llm_results ?? [],
            llm_raw_output: result.evidence,
            ...(result.error && { error: result.error }),
        };

        return {
            run_id: runId,
            phase_name: phaseName,
            step_name: check.name,
            checker_method: check.method,
            passed: result.result === 'pass',
            evidence: gateEvidence,
            duration_ms: durationMs,
            created_at: new Date(),
        };
    }
}
