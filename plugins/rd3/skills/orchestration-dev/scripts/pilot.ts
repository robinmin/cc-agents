import type { DelegateRunner, ChainManifest, ChainState, CheckerConfig } from '../../verification-chain/scripts/types';
import { runChain } from '../../verification-chain/scripts/interpreter';
import { DOWNSTREAM_EVIDENCE_CONTRACTS, PHASE_WORKER_CONTRACTS } from './contracts';
import { createExecutorForChannel, normalizeExecutionChannel, type ExecutionResult } from './executors';
import type { Phase } from './model';
import type { PhaseEvidence, PhaseRunner, PhaseRunnerResult } from './runtime';
import { loadVerificationProfile } from './verification-profiles';

const DEFAULT_VERIFICATION_PROMPT = (cwd: string, command: string) =>
    `In ${cwd}, run this verification command and report only the result:\n${command}`;

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

function parseWorkerEnvelope(stdout: string): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
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
        errors.push(`Worker envelope status must be one of completed, failed, paused; received ${String(payload.status)}`);
    }

    if (payload.status === 'failed' && typeof payload.failed_stage !== 'string') {
        errors.push('Worker envelope with status=failed must include failed_stage');
    }

    if (typeof payload.next_step_recommendation !== 'string') {
        errors.push('Worker envelope must include a string next_step_recommendation');
    }

    return errors;
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

function createLocalWorkerChannelPauseResult(phase: Phase): PhaseRunnerResult {
    return {
        status: 'paused',
        evidence: [
            buildPhaseExecutorEvidence(phase),
            {
                kind: 'worker-handoff-required',
                detail: `phase ${phase.number} requires worker-agent execution and no current-channel local worker runner is available yet`,
                payload: {
                    executor: phase.executor,
                    canonical_backbone: phase.skill,
                },
            },
        ],
        error: `Phase ${phase.number} (${phase.name}) requires an ACP worker channel until a current-channel worker runner exists`,
    };
}

async function runWorkerAgentPhase(
    phase: Phase,
    context: Parameters<PhaseRunner>[1],
    executorOptions: Parameters<typeof createExecutorForChannel>[1],
): Promise<PhaseRunnerResult> {
    if (normalizeExecutionChannel(context.plan.execution_channel) === 'current') {
        return createLocalWorkerChannelPauseResult(phase);
    }

    const executor = createExecutorForChannel(context.plan.execution_channel, executorOptions);
    const prompt = buildWorkerPrompt(phase, context);
    const result = await executor.execute({
        channel: context.plan.execution_channel,
        cwd: context.projectRoot,
        timeout_ms: 60 * 60 * 1000,
        prompt,
        metadata: {
            skill: phase.executor,
            task_ref: context.plan.task_ref,
            phase: phase.number,
        },
    });

    const baseEvidence: PhaseEvidence[] = [
        buildPhaseExecutorEvidence(phase),
        {
            kind: 'worker-dispatch',
            detail: `delegated phase ${phase.number} to ${phase.executor} via ${result.backend}`,
            payload: {
                backend: result.backend,
                normalized_channel: result.normalized_channel,
                ...(result.command ? { command: result.command } : {}),
            },
        },
    ];

    if (!result.stdout) {
        return {
            status: 'failed',
            evidence: baseEvidence,
            error: result.error ?? `Worker execution for phase ${phase.number} returned no stdout envelope`,
        };
    }

    const parsedEnvelope = parseWorkerEnvelope(result.stdout);
    if (!parsedEnvelope.ok) {
        return {
            status: 'failed',
            evidence: [
                ...baseEvidence,
                {
                    kind: 'worker-output',
                    detail: result.stdout.slice(0, 200),
                },
            ],
            error: parsedEnvelope.error,
        };
    }

    const validationErrors = validateWorkerEnvelope(phase, parsedEnvelope.payload);
    if (validationErrors.length > 0) {
        return {
            status: 'failed',
            evidence: [
                ...baseEvidence,
                {
                    kind: 'worker-envelope-invalid',
                    detail: validationErrors.join('; '),
                    payload: parsedEnvelope.payload,
                },
            ],
            result: parsedEnvelope.payload,
            error: `Invalid worker envelope for phase ${phase.number}: ${validationErrors.join('; ')}`,
        };
    }

    const envelopeStatus = parsedEnvelope.payload.status as PhaseRunnerResult['status'];
    const errorSummary =
        typeof parsedEnvelope.payload.error_summary === 'string'
            ? parsedEnvelope.payload.error_summary
            : result.error;

    return {
        status: envelopeStatus,
        evidence: [
            ...baseEvidence,
            {
                kind: 'worker-envelope',
                detail: `validated ${phase.executor} worker envelope for phase ${phase.number} with status ${envelopeStatus}`,
                payload: parsedEnvelope.payload,
            },
        ],
        result: parsedEnvelope.payload,
        ...(envelopeStatus === 'completed'
            ? {}
            : {
                  error:
                      errorSummary ??
                      `Worker envelope returned status ${envelopeStatus} for phase ${phase.number}`,
              }),
    };
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
    const executor = createExecutorForChannel(channel, options);

    return async (request) => {
        const command = typeof request.args?.command === 'string' ? request.args.command : undefined;
        const prompt =
            typeof request.args?.prompt === 'string'
                ? buildDelegatedWorkerPrompt(request.skill, request.args.prompt, request.args)
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
            channel: request.execution_channel ?? channel,
            cwd: request.cwd,
            timeout_ms: request.timeout_ms,
            ...(command ? { command } : {}),
            ...(prompt ? { prompt } : {}),
            metadata: {
                skill: request.skill,
                ...(request.task_ref ? { task_ref: request.task_ref } : {}),
            },
        });

        return mapExecutionResult(result);
    };
}

function unsupportedPhaseResult(phase: Phase): PhaseRunnerResult {
    return {
        status: 'failed',
        error: `Pilot runner does not yet support phase ${phase.number} (${phase.name}) via ${phase.executor}`,
    };
}

export function createPilotPhaseRunner(
    executorOptions: Parameters<typeof createExecutorForChannel>[1] = {},
): PhaseRunner {
    return async (phase, context) => {
        if (phase.execution_mode === 'worker-agent' && phase.number !== 6) {
            return runWorkerAgentPhase(phase, context, executorOptions);
        }

        if (phase.number !== 6) {
            return unsupportedPhaseResult(phase);
        }

        const profileId = context.stackProfile ?? 'typescript-bun-biome';
        const manifest = buildPhase6Manifest(phase, context.plan.task_ref, profileId);
        const state = await runChain({
            manifest,
            stateDir: context.projectRoot,
            delegateRunner: createPilotDelegateRunner(context.plan.execution_channel, executorOptions),
        });

        return {
            status: state.status === 'completed' ? 'completed' : state.status === 'paused' ? 'paused' : 'failed',
            evidence: [buildPhaseExecutorEvidence(phase), ...buildPhaseEvidence(state)],
            ...(state.status === 'completed' ? {} : { error: `Phase verification ended with status ${state.status}` }),
        };
    };
}
