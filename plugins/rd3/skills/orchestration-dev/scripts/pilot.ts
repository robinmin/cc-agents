import type { DelegateRunner, ChainManifest, ChainState, CheckerConfig } from '../../verification-chain/scripts/types';
import { runChain } from '../../verification-chain/scripts/interpreter';
import type { Phase } from './model';
import type { PhaseEvidence, PhaseRunner, PhaseRunnerResult } from './runtime';
import { createExecutorForChannel, type ExecutionResult } from './executors';
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

function buildPhase6Manifest(taskRef: string, profileId: string): ChainManifest {
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
                    delegate_to: step.skill,
                    args: {
                        command: step.command,
                        prompt: step.prompt,
                        step: step.name,
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
                ? request.args.prompt
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
        error: `Pilot runner does not yet support phase ${phase.number} (${phase.name})`,
    };
}

export function createPilotPhaseRunner(
    executorOptions: Parameters<typeof createExecutorForChannel>[1] = {},
): PhaseRunner {
    return async (phase, context) => {
        if (phase.number !== 6) {
            return unsupportedPhaseResult(phase);
        }

        const profileId = context.stackProfile ?? 'typescript-bun-biome';
        const manifest = buildPhase6Manifest(context.plan.task_ref, profileId);
        const state = await runChain({
            manifest,
            stateDir: context.projectRoot,
            delegateRunner: createPilotDelegateRunner(context.plan.execution_channel, executorOptions),
        });

        return {
            status: state.status === 'completed' ? 'completed' : state.status === 'paused' ? 'paused' : 'failed',
            evidence: buildPhaseEvidence(state),
            ...(state.status === 'completed' ? {} : { error: `Phase verification ended with status ${state.status}` }),
        };
    };
}
