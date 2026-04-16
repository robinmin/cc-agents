/**
 * orchestration-v2 — CoV Driver
 *
 * Delegates gate execution to the verification-chain CLI/runtime so
 * orchestration-v2 does not duplicate checker logic.
 */

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CheckMethod, ChainCheck, ChainManifest, ChainState, GateResult, VerificationDriver } from '../model';
import type {
    ChainManifest as VerificationChainManifest,
    ChainState as VerificationRuntimeState,
    CheckerEvidence,
    CheckerMethod,
    SingleNode,
} from '../../../verification-chain/scripts/types';

interface CliSuccessPayload {
    ok: true;
    state?: VerificationRuntimeState;
    chains?: Array<{
        chain_id: string;
        chain_name: string;
        task_wbs: string;
        status: string;
        current_node: string;
        updated_at: string;
        paused_node?: string | null;
    }>;
    count?: number;
}

interface CliErrorPayload {
    ok: false;
    error: string;
    details?: unknown;
    state?: VerificationRuntimeState;
}

type CliPayload = CliSuccessPayload | CliErrorPayload;

interface DefaultCoVDriverOptions {
    stateDir?: string;
    cliPath?: string;
}

const CLI_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../../verification-chain/scripts/cli.ts');

export class DefaultCoVDriver implements VerificationDriver {
    private readonly stateDir: string;
    private readonly cliPath: string;

    constructor(options: DefaultCoVDriverOptions = {}) {
        this.stateDir = options.stateDir ?? process.env.COV_STATE_DIR ?? process.cwd();
        this.cliPath = options.cliPath ?? CLI_PATH;
    }

    async runChain(manifest: ChainManifest): Promise<ChainState> {
        const verificationManifest = this.toVerificationManifest(manifest);
        const manifestPath = this.writeManifestFile(verificationManifest);
        const payload = await this.runCovCli(['run', manifestPath]);

        if (!payload.state) {
            const cliError = this.payloadError(payload);
            return {
                status: 'fail',
                results: [
                    {
                        run_id: manifest.run_id,
                        phase_name: manifest.phase_name,
                        step_name: 'verification-chain',
                        checker_method: 'cov-cli',
                        passed: false,
                        evidence: {
                            error: cliError.error,
                            ...(cliError.details !== undefined ? { details: cliError.details } : {}),
                        },
                        created_at: new Date(),
                    },
                ],
            };
        }

        return this.toDriverState(manifest, payload.state);
    }

    async resumeChain(stateDir: string, action?: 'approve' | 'reject'): Promise<ChainState> {
        const payload = await this.runCovCli(['list'], stateDir);

        if (!payload.ok) {
            const cliError = this.payloadError(payload);
            return {
                status: 'fail',
                results: [
                    {
                        run_id: '',
                        phase_name: '',
                        step_name: 'verification-chain',
                        checker_method: 'cov-cli',
                        passed: false,
                        evidence: {
                            error: cliError.error,
                            ...(cliError.details !== undefined ? { details: cliError.details } : {}),
                        },
                        created_at: new Date(),
                    },
                ],
            };
        }

        const pausedChains = (payload.chains ?? []).filter((chain) => chain.status === 'paused');
        if (pausedChains.length === 0) {
            return {
                status: 'pending',
                results: [],
            };
        }

        if (pausedChains.length > 1) {
            return {
                status: 'fail',
                results: [
                    {
                        run_id: '',
                        phase_name: '',
                        step_name: 'verification-chain',
                        checker_method: 'cov-cli',
                        passed: false,
                        evidence: {
                            error: 'Multiple paused verification chains found; resume is ambiguous.',
                        },
                        created_at: new Date(),
                    },
                ],
            };
        }

        const pausedChain = pausedChains[0];
        const resumeArgs = ['resume', pausedChain.chain_id, '--task', pausedChain.task_wbs];
        if (action) {
            resumeArgs.push('--response', action);
        }

        const resumePayload = await this.runCovCli(resumeArgs, stateDir);
        if (!resumePayload.state) {
            const cliError = this.payloadError(resumePayload);
            return {
                status: 'fail',
                results: [
                    {
                        run_id: pausedChain.chain_id,
                        phase_name: pausedChain.task_wbs,
                        step_name: pausedChain.paused_node ?? pausedChain.current_node,
                        checker_method: 'cov-cli',
                        passed: false,
                        evidence: {
                            error: cliError.error,
                            ...(cliError.details !== undefined ? { details: cliError.details } : {}),
                        },
                        created_at: new Date(),
                    },
                ],
            };
        }

        return this.toDriverState(
            {
                run_id: pausedChain.chain_id,
                phase_name: pausedChain.task_wbs,
                checks: resumePayload.state.nodes.map((node) => ({
                    name: node.name,
                    method: (node.evidence.at(-1)?.method ?? 'human') as CheckMethod,
                })),
            },
            resumePayload.state,
        );
    }

    private toVerificationManifest(manifest: ChainManifest): VerificationChainManifest {
        return {
            chain_id: manifest.run_id,
            task_wbs: manifest.phase_name,
            chain_name: `${manifest.run_id}:${manifest.phase_name}`,
            on_node_fail: 'halt',
            nodes: manifest.checks.map((check) => this.toVerificationNode(check)),
        };
    }

    private toVerificationNode(check: ChainCheck): SingleNode {
        return {
            name: check.name,
            type: 'single',
            maker: { command: 'true' },
            checker: {
                method: this.toVerificationMethod(check.method),
                config: this.toVerificationConfig(check),
            },
        };
    }

    private toVerificationMethod(method: CheckMethod): CheckerMethod {
        switch (method) {
            case 'cli':
                return 'cli';
            case 'content-match':
                return 'content-match';
            case 'file-exists':
                return 'file-exists';
            case 'llm':
                return 'llm';
            case 'human':
                return 'human';
            case 'compound':
                return 'compound';
        }
    }

    private toVerificationConfig(check: ChainCheck): SingleNode['checker']['config'] {
        const params = check.params ?? {};

        switch (check.method) {
            case 'cli':
                return {
                    command: params.command,
                    ...(Array.isArray(params.exit_codes) ? { exit_codes: params.exit_codes } : {}),
                    ...(typeof params.timeout === 'number' ? { timeout: params.timeout } : {}),
                } as SingleNode['checker']['config'];
            case 'content-match':
                return {
                    file: params.file,
                    pattern: params.pattern,
                    must_exist: typeof params.must_exist === 'boolean' ? params.must_exist : true,
                } as SingleNode['checker']['config'];
            case 'llm':
                return {
                    checklist: params.checklist,
                    ...(typeof params.prompt_template === 'string' ? { prompt_template: params.prompt_template } : {}),
                } as SingleNode['checker']['config'];
            case 'human':
                return {
                    prompt: (params.prompt as string | undefined) ?? check.name,
                    ...(Array.isArray(params.choices) ? { choices: params.choices } : {}),
                } as SingleNode['checker']['config'];
            default:
                return params as unknown as SingleNode['checker']['config'];
        }
    }

    private writeManifestFile(manifest: VerificationChainManifest): string {
        const tempDir = mkdtempSync(join(tmpdir(), 'orchestration-cov-driver-'));
        mkdirSync(tempDir, { recursive: true });
        const manifestPath = join(tempDir, `${manifest.chain_id}-${manifest.task_wbs}-cov-manifest.json`);
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
        return manifestPath;
    }

    private async runCovCli(args: string[], stateDir = this.stateDir): Promise<CliPayload> {
        const proc = Bun.spawn(['bun', 'run', this.cliPath, ...args], {
            cwd: process.cwd(),
            env: {
                ...process.env,
                COV_STATE_DIR: stateDir,
            },
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const exitCode = await proc.exited;
        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const payload = this.parseCliPayload(stdout, stderr);

        if (exitCode !== 0 && payload.ok) {
            return {
                ok: false,
                error: 'verification-chain CLI exited non-zero without an error payload',
                details: stderr || stdout,
            };
        }

        return payload;
    }

    private parseCliPayload(stdout: string, stderr: string): CliPayload {
        const trimmed = stdout.trim();
        if (!trimmed) {
            return {
                ok: false,
                error: 'verification-chain CLI returned no JSON payload',
                details: stderr,
            };
        }

        try {
            return JSON.parse(trimmed) as CliPayload;
        } catch (err) {
            return {
                ok: false,
                error: 'verification-chain CLI returned invalid JSON',
                details: err instanceof Error ? err.message : `${stderr}\n${trimmed}`,
            };
        }
    }

    private payloadError(payload: CliPayload): { error: string; details?: unknown } {
        if ('error' in payload) {
            return {
                error: payload.error,
                ...(payload.details !== undefined ? { details: payload.details } : {}),
            };
        }

        return {
            error: 'verification-chain CLI did not return a runtime state',
        };
    }

    private toDriverState(manifest: ChainManifest, runtimeState: VerificationRuntimeState): ChainState {
        const results: GateResult[] = manifest.checks.map((check, index) => {
            const node = runtimeState.nodes[index];
            const evidence = node?.evidence.at(-1);

            return {
                run_id: manifest.run_id,
                phase_name: manifest.phase_name,
                step_name: check.name,
                checker_method: typeof check.method === 'string' ? check.method : `${check.method}`,
                passed: node?.status === 'completed' && evidence?.result !== 'fail',
                ...(evidence ? { evidence: this.toGateEvidence(evidence) } : {}),
                ...(evidence?.timestamp ? { created_at: new Date(evidence.timestamp) } : {}),
            };
        });

        return {
            status: this.toDriverStatus(runtimeState.status),
            results,
        };
    }

    private toDriverStatus(status: VerificationRuntimeState['status']): ChainState['status'] {
        switch (status) {
            case 'completed':
                return 'pass';
            case 'paused':
                return 'pending';
            default:
                return 'fail';
        }
    }

    private toGateEvidence(evidence: CheckerEvidence): Record<string, unknown> {
        return {
            ...evidence,
        };
    }
}
