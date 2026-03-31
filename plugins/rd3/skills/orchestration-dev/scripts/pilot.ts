import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import type { DelegateRunner, ChainManifest, ChainState, CheckerConfig } from '../../verification-chain/scripts/types';
import { resumeChain, runChain } from '../../verification-chain/scripts/interpreter';
import { DOWNSTREAM_EVIDENCE_CONTRACTS, PHASE_WORKER_CONTRACTS } from './contracts';
import { buildPhaseManifest, GATE_PROFILES, type GateProfileDef } from './gates';
import { buildDirectSkillPrompt, isDirectSkillPhase } from './direct-skill-runner';
import { createExecutorForChannel, type ExecutionResult } from './executors';
import type { Phase } from './model';
import type { PhaseEvidence, PhaseRunner, PhaseRunnerResult } from './runtime';
import { getOrchestrationArtifactsRootFromStatePath } from './state-paths';
import { loadVerificationProfile } from './verification-profiles';

const DEFAULT_VERIFICATION_PROMPT = (cwd: string, command: string) =>
    `In ${cwd}, run this verification command and report only the result:\n${command}`;

function writeGateEvidenceFile(cwd: string, path: string, payload: Record<string, unknown>): void {
    const resolvedPath = isAbsolute(path) ? path : join(cwd, path);
    mkdirSync(dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, JSON.stringify(payload, null, 2), 'utf-8');
}

function getChainStatePath(artifactRoot: string, manifest: ChainManifest): string {
    return join(artifactRoot, 'cov', `${manifest.chain_id}-${manifest.task_wbs}-cov-state.json`);
}

function resolveRuntimeArtifactsRoot(context: Parameters<PhaseRunner>[1]): string {
    if (!context.statePath) {
        return context.projectRoot;
    }

    return getOrchestrationArtifactsRootFromStatePath(context.statePath);
}

function mapExecutionResult(result: ExecutionResult) {
    return {
        status: result.status,
        ...(result.stdout ? { output: result.stdout } : {}),
        ...(result.error ? { error: result.error } : {}),
        ...(result.exit_code !== undefined || result.normalized_channel
            ? {
                  structured_output: {
                      backend: result.backend,
                      normalized_channel: result.normalized_channel,
                      ...(result.prompt_agent ? { prompt_agent: result.prompt_agent } : {}),
                      ...(result.exit_code !== undefined ? { exit_code: result.exit_code } : {}),
                  },
              }
            : {}),
    } as const;
}

function buildDelegatedWorkerPrompt(skill: string, prompt: string, args?: Record<string, unknown>): string {
    const phase = typeof args?.phase === 'number' ? args.phase : undefined;
    const step = typeof args?.step === 'string' ? args.step : undefined;
    const downstreamSkill = typeof args?.downstream_skill === 'string' ? args.downstream_skill : undefined;

    return [
        `You are executing delegated rd3 worker activity via \`${skill}\`.`,
        phase ? `Phase: ${phase}` : undefined,
        step ? `Step: ${step}` : undefined,
        downstreamSkill ? `Canonical downstream skill: \`${downstreamSkill}\`.` : undefined,
        'Stay within the delegated worker scope and return only the execution result.',
        '',
        prompt,
    ]
        .filter((line): line is string => Boolean(line))
        .join('\n');
}

function buildDelegatedPrompt(skill: string, prompt: string, args?: Record<string, unknown>): string {
    return args?.expect_worker_envelope === true ? buildDelegatedWorkerPrompt(skill, prompt, args) : prompt;
}

function buildPhase6Manifest(phase: Phase, taskRef: string, profileId: string): ChainManifest {
    const profile = loadVerificationProfile(profileId);

    return {
        chain_id: `phase6-${profile.id}`,
        chain_name: `Phase 6 Verification (${profile.label})`,
        task_wbs: taskRef,
        on_node_fail: 'continue',
        global_retry: {
            remaining: 1,
            total: 1,
        },
        nodes: [
            {
                name: 'profile-required-files',
                type: 'single',
                maker: {},
                checker: {
                    method: 'file-exists',
                    config: { paths: profile.phase6.required_files },
                },
            },
            ...profile.phase6.steps.map((step) => ({
                name: step.name,
                type: 'single' as const,
                maker: {
                    delegate_to: phase.executor,
                    args: {
                        phase: phase.number,
                        command: step.command,
                        prompt: step.prompt,
                        step: step.name,
                        downstream_skill: step.skill,
                    },
                    timeout: step.timeout_seconds ?? 3600,
                },
                checker: step.checker
                    ? {
                          method: step.checker.method as 'cli' | 'file-exists',
                          config: step.checker.config as unknown as CheckerConfig,
                      }
                    : {
                          method: 'cli' as const,
                          config: { command: 'true', exit_codes: [0] },
                      },
            })),
        ],
    };
}

function buildPhaseExecutorEvidence(phase: Phase): PhaseEvidence {
    return {
        kind: 'phase-executor',
        detail: `phase ${phase.number} executor: ${phase.executor} (${phase.execution_mode})`,
        payload: {
            executor: phase.executor,
            execution_mode: phase.execution_mode,
            ...(phase.worker_contract_version ? { worker_contract_version: phase.worker_contract_version } : {}),
        },
    };
}

function stripMarkdownCodeFence(value: string): string {
    const trimmed = value.trim();
    const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    return match ? match[1].trim() : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseWorkerEnvelope(
    stdout: string,
): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
    const candidate = stripMarkdownCodeFence(stdout);
    if (!candidate) {
        return { ok: false, error: 'Worker returned empty stdout; expected a JSON worker envelope' };
    }

    try {
        const payload = JSON.parse(candidate) as unknown;
        if (!isRecord(payload)) {
            return { ok: false, error: 'Worker envelope must be a JSON object' };
        }

        return { ok: true, payload };
    } catch (error) {
        return {
            ok: false,
            error: `Worker returned non-JSON stdout; expected a JSON worker envelope (${error instanceof Error ? error.message : String(error)})`,
        };
    }
}

function validateWorkerEnvelope(phase: Phase, payload: Record<string, unknown>): string[] {
    const errors: string[] = [];
    const contract = DOWNSTREAM_EVIDENCE_CONTRACTS[phase.executor];

    if (!contract) {
        errors.push(`No downstream evidence contract registered for ${phase.executor}`);
        return errors;
    }

    for (const field of contract.required_fields) {
        if (!(field in payload)) {
            errors.push(`Missing required worker field: ${field}`);
        }
    }

    if (payload.phase !== phase.number) {
        errors.push(`Worker envelope phase mismatch: expected ${phase.number}, received ${String(payload.phase)}`);
    }

    if (!['completed', 'failed', 'paused'].includes(String(payload.status))) {
        errors.push(
            `Worker envelope status must be one of completed, failed, paused; received ${String(payload.status)}`,
        );
    }

    if (payload.status === 'failed' && typeof payload.failed_stage !== 'string') {
        errors.push('Worker envelope with status=failed must include failed_stage');
    }

    if (payload.status === 'completed' && 'failed_stage' in payload) {
        errors.push('Worker envelope with status=completed must not include failed_stage (contradictory)');
    }

    if (typeof payload.next_step_recommendation !== 'string') {
        errors.push('Worker envelope must include a string next_step_recommendation');
    }

    return errors;
}

function buildGenericGateProfile(phase: Phase, context: Parameters<PhaseRunner>[1]): GateProfileDef {
    const baseProfile = GATE_PROFILES[phase.number];
    const steps = baseProfile.steps.map((step, index) => {
        if (index !== 0) {
            return step;
        }

        if (phase.execution_mode === 'worker-agent') {
            return {
                ...step,
                prompt: buildWorkerPrompt(phase, context),
                skill: phase.skill,
                expect_worker_envelope: true,
                timeout_seconds: step.timeout_seconds ?? 3600,
                ...(step.checker ? { checker: step.checker } : {}),
            };
        }

        if (isDirectSkillPhase(phase.number)) {
            return {
                ...step,
                prompt: buildDirectSkillPrompt(phase, context),
                skill: phase.skill,
                execution_channel: 'current',
                timeout_seconds: step.timeout_seconds ?? 3600,
                ...(step.checker ? { checker: step.checker } : {}),
            };
        }

        return step;
    });

    return {
        ...baseProfile,
        steps,
    };
}

function parsePhaseResultFromChain(phase: Phase, state: ChainState): Record<string, unknown> | undefined {
    const makerOutput = state.nodes.find((node) => typeof node.maker_output === 'string')?.maker_output?.trim();
    if (!makerOutput) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(makerOutput) as unknown;
        if (isRecord(parsed)) {
            return parsed;
        }
    } catch {
        // Direct-skill phases may emit plain text. Preserve a compact summary.
    }

    return {
        phase: phase.number,
        status: state.status,
        output: makerOutput,
    };
}

function buildPhaseErrorFromChain(state: ChainState): string {
    const pausedNode = state.nodes.find(
        (node) => node.status === 'running' || node.status === 'pending' || node.checker_result === 'paused',
    );
    const failedNode = state.nodes.find((node) => node.status === 'failed');
    const relevantNode = failedNode ?? pausedNode;

    if (relevantNode?.maker_error) {
        return relevantNode.maker_error;
    }

    const checkerError = relevantNode?.evidence.find((entry) => entry.error)?.error;
    if (checkerError) {
        return checkerError;
    }

    return `Phase verification ended with status ${state.status}`;
}

export function buildWorkerPrompt(phase: Phase, context: Parameters<PhaseRunner>[1]): string {
    const workerContract = PHASE_WORKER_CONTRACTS[phase.number as 5 | 6 | 7];
    const phaseContext = {
        phase: phase.number,
        phase_name: phase.name,
        profile: context.plan.profile,
        canonical_backbone: phase.skill,
        gate: phase.gate,
        gate_criteria: phase.gateCriteria,
        outputs: phase.outputs,
        ...(phase.prerequisites ? { prerequisites: phase.prerequisites } : {}),
        ...(phase.number === 6 ? { coverage_threshold: context.plan.coverage_threshold } : {}),
    };

    return [
        `Run rd3 worker agent \`${phase.executor}\` in worker mode for Phase ${phase.number}: ${phase.name}.`,
        `Task ref: ${context.plan.task_ref}`,
        `Execution channel: ${context.plan.execution_channel}`,
        `Worker contract: ${phase.worker_contract_version ?? 'none'}`,
        `Canonical backbone: ${workerContract?.canonical_backbone.join(', ') ?? phase.skill}`,
        workerContract ? `Output contract: ${workerContract.output_keys.join(', ')}` : undefined,
        workerContract ? `Anti-recursion: ${workerContract.anti_recursion_rules.join(' ')}` : undefined,
        '',
        'Phase context:',
        JSON.stringify(phaseContext, null, 2),
        '',
        'Return a concise worker-mode result with status, phase, evidence summary, and next-step recommendation.',
    ]
        .filter((line): line is string => Boolean(line))
        .join('\n');
}

function buildPhaseEvidence(state: ChainState): PhaseEvidence[] {
    return state.nodes.map((node) => ({
        kind: 'cov-node',
        detail: `${node.name}: ${node.status}`,
        payload: {
            node: node.name,
            status: node.status,
            maker_status: node.maker_status,
            checker_status: node.checker_status,
            checker_result: node.checker_result,
        },
    }));
}

export function createPilotDelegateRunner(
    channel: string,
    options: Parameters<typeof createExecutorForChannel>[1] = {},
): DelegateRunner {
    return async (request) => {
        const requestedChannel = request.execution_channel ?? channel;
        const executor = createExecutorForChannel(requestedChannel, options);
        const command = typeof request.args?.command === 'string' ? request.args.command : undefined;
        const prompt =
            typeof request.args?.prompt === 'string'
                ? buildDelegatedPrompt(request.skill, request.args.prompt, request.args)
                : command
                  ? DEFAULT_VERIFICATION_PROMPT(request.cwd, command)
                  : undefined;

        if (!command && !prompt) {
            return {
                status: 'failed',
                error: `No executable payload provided for delegated skill ${request.skill}`,
            };
        }

        const result = await executor.execute({
            channel: requestedChannel,
            cwd: request.cwd,
            timeout_ms: request.timeout_ms,
            ...(command ? { command } : {}),
            ...(prompt ? { prompt } : {}),
            metadata: {
                skill: request.skill,
                ...(request.task_ref ? { task_ref: request.task_ref } : {}),
            },
        });
        const evidenceOutputPath =
            typeof request.args?.evidence_output_path === 'string' ? request.args.evidence_output_path : undefined;

        const phaseNumber =
            typeof request.args?.phase === 'number' ? (request.args.phase as Phase['number']) : undefined;
        const expectsWorkerEnvelope = request.args?.expect_worker_envelope === true;

        if (expectsWorkerEnvelope && phaseNumber !== undefined) {
            const phaseForValidation: Phase = {
                number: phaseNumber,
                name: `Phase ${phaseNumber}`,
                skill:
                    typeof request.args?.downstream_skill === 'string' ? request.args.downstream_skill : request.skill,
                executor: request.skill,
                execution_mode: 'worker-agent',
                inputs: [],
                outputs: [],
                gate: 'auto',
            };

            if (!result.stdout) {
                return {
                    status: 'failed',
                    error: `Worker execution for phase ${phaseNumber} returned no stdout envelope`,
                };
            }

            const parsedEnvelope = parseWorkerEnvelope(result.stdout);
            if (!parsedEnvelope.ok) {
                return {
                    status: 'failed',
                    error: parsedEnvelope.error,
                    output: result.stdout,
                };
            }

            const validationErrors = validateWorkerEnvelope(phaseForValidation, parsedEnvelope.payload);
            if (validationErrors.length > 0) {
                return {
                    status: 'failed',
                    error: `Invalid worker envelope for phase ${phaseNumber}: ${validationErrors.join('; ')}`,
                    output: result.stdout,
                    structured_output: parsedEnvelope.payload,
                };
            }

            const envelopeStatus = parsedEnvelope.payload.status as Extract<
                PhaseRunnerResult['status'],
                'completed' | 'failed' | 'paused'
            >;
            const errorSummary =
                typeof parsedEnvelope.payload.error_summary === 'string'
                    ? parsedEnvelope.payload.error_summary
                    : (result.error ?? `Worker envelope returned status ${envelopeStatus} for phase ${phaseNumber}`);

            if (evidenceOutputPath) {
                writeGateEvidenceFile(request.cwd, evidenceOutputPath, {
                    phase: phaseNumber,
                    step: request.args?.step,
                    skill: request.skill,
                    requested_execution_channel: requestedChannel,
                    normalized_channel: result.normalized_channel,
                    backend: result.backend,
                    status: envelopeStatus,
                    has_output: Boolean(result.stdout?.trim()),
                    has_structured_output: true,
                    raw_output: result.stdout ?? '',
                    structured_output: parsedEnvelope.payload,
                    ...(errorSummary ? { error: errorSummary } : {}),
                });
            }

            return {
                status: envelopeStatus,
                output: result.stdout,
                structured_output: parsedEnvelope.payload,
                ...(envelopeStatus === 'completed' ? {} : { error: errorSummary }),
            };
        }

        if (evidenceOutputPath) {
            writeGateEvidenceFile(request.cwd, evidenceOutputPath, {
                phase: phaseNumber ?? null,
                step: request.args?.step,
                skill: request.skill,
                requested_execution_channel: requestedChannel,
                normalized_channel: result.normalized_channel,
                backend: result.backend,
                status: result.status,
                has_output: Boolean(result.stdout?.trim()),
                has_structured_output: Boolean(result.structured_output),
                raw_output: result.stdout ?? '',
                ...(result.structured_output ? { structured_output: result.structured_output } : {}),
                ...(result.error ? { error: result.error } : {}),
            });
        }

        return mapExecutionResult(result);
    };
}

export function createPilotPhaseRunner(
    executorOptions: Parameters<typeof createExecutorForChannel>[1] = {},
): PhaseRunner {
    return async (phase, context) => {
        const runtimeArtifactsRoot = resolveRuntimeArtifactsRoot(context);
        const manifest =
            phase.number === 6
                ? buildPhase6Manifest(phase, context.plan.task_ref, context.stackProfile ?? 'typescript-bun-biome')
                : buildPhaseManifest(
                      phase,
                      context.plan.task_ref,
                      {
                          project_root: context.projectRoot,
                          auto_approve_human_gates: context.state.auto_approve_human_gates,
                          run_artifact_root: runtimeArtifactsRoot,
                          ...(context.plan.task_path ? { task_path: context.plan.task_path } : {}),
                      },
                      buildGenericGateProfile(phase, context),
                  );
        const delegateRunner = createPilotDelegateRunner(context.plan.execution_channel, executorOptions);
        const chainStatePath = getChainStatePath(runtimeArtifactsRoot, manifest);
        let state: ChainState;

        try {
            if (context.rework_feedback) {
                // Force a fresh run by deleting existing state
                if (existsSync(runtimeArtifactsRoot)) {
                    rmSync(runtimeArtifactsRoot, { recursive: true, force: true });
                }
            }
            const existing = JSON.parse(readFileSync(chainStatePath, 'utf-8')) as { status?: string };
            state =
                existing.status === 'paused'
                    ? await resumeChain({
                          manifest,
                          stateDir: runtimeArtifactsRoot,
                          cwd: context.projectRoot,
                          humanResponse: 'approve',
                          delegateRunner,
                      })
                    : await runChain({
                          manifest,
                          stateDir: runtimeArtifactsRoot,
                          cwd: context.projectRoot,
                          delegateRunner,
                      });
        } catch {
            state = await runChain({
                manifest,
                stateDir: runtimeArtifactsRoot,
                cwd: context.projectRoot,
                delegateRunner,
            });
        }

        const result = parsePhaseResultFromChain(phase, state);
        return {
            status: state.status === 'completed' ? 'completed' : state.status === 'paused' ? 'paused' : 'failed',
            evidence: [buildPhaseExecutorEvidence(phase), ...buildPhaseEvidence(state)],
            ...(result ? { result } : {}),
            ...(state.status === 'completed' ? {} : { error: buildPhaseErrorFromChain(state) }),
        };
    };
}
