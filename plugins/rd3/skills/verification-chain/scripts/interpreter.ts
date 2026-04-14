/**
 * verification-chain - Chain of Verification (CoV) interpreter
 *
 * Orchestrates chain execution: runs makers, dispatches checkers,
 * handles retry logic, manages pause/resume for human checks,
 * persists state to the SQLite-backed CoV store while keeping
 * JSON snapshots under <stateDir>/cov/<chain_id>-<wbs>-cov-state.json
 * for compatibility and inspection.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import type {
    ChainManifest,
    ChainState,
    ChainNode,
    SingleNode,
    ParallelGroupNode,
    ParallelChildNode,
    NodeExecutionState,
    MethodResult,
    CheckerMethod,
    NodeStatus,
    MakerStatus,
    CheckerStatus,
    DelegateRunner,
} from './types';
import { runCliCheck } from './methods/cli';
import { runFileExistsCheck } from './methods/file_exists';
import { runContentMatchCheck } from './methods/content_match';
import { runLlmCheck } from './methods/llm';
import { runHumanCheck } from './methods/human';
import { runCompoundCheck } from './methods/compound';
import { loadChain, saveChain } from './store';
import { logger } from '../../../scripts/logger';

// ----------------------------------------------------------------
// State persistence
// ----------------------------------------------------------------

function loadState(statePath: string): ChainState | null {
    try {
        const raw = readFileSync(statePath, 'utf-8');
        return JSON.parse(raw) as ChainState;
    } catch {
        return null;
    }
}

function stateDirFromPath(statePath: string): string {
    return dirname(dirname(statePath));
}

function loadPersistedState(statePath: string, chainId: string, taskWbs: string): ChainState | null {
    return loadChain(stateDirFromPath(statePath), chainId, taskWbs) ?? loadState(statePath);
}

function saveState(state: ChainState, statePath: string, manifest?: ChainManifest): void {
    try {
        mkdirSync(dirname(statePath), { recursive: true });
        writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
        saveChain(stateDirFromPath(statePath), state, manifest);
        logger.debug(`Saved chain state to ${statePath}`);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to save chain state: ${message}`);
        throw new Error(`Failed to persist chain state to disk/store: ${message}`);
    }
}

// ----------------------------------------------------------------
// Checker dispatch
// ----------------------------------------------------------------

async function runChecker(
    method: CheckerMethod,
    config: unknown,
    cwd: string,
    humanResponse?: string,
): Promise<MethodResult> {
    switch (method) {
        case 'cli':
            return runCliCheck(config as Parameters<typeof runCliCheck>[0], cwd);
        case 'file-exists':
            return runFileExistsCheck(config as Parameters<typeof runFileExistsCheck>[0], cwd);
        case 'content-match':
            return runContentMatchCheck(config as Parameters<typeof runContentMatchCheck>[0], cwd);
        case 'llm':
            return runLlmCheck(config as Parameters<typeof runLlmCheck>[0]);
        case 'human':
            return runHumanCheck(config as Parameters<typeof runHumanCheck>[0], humanResponse);
        case 'compound':
            return runCompoundCheck(config as Parameters<typeof runCompoundCheck>[0], cwd);
        default: {
            const errorMsg = `Unknown checker method: ${method}`;
            logger.error(errorMsg);
            return {
                result: 'fail',
                evidence: {
                    method,
                    result: 'fail',
                    timestamp: new Date().toISOString(),
                    error: errorMsg,
                },
                error: errorMsg,
            };
        }
    }
}

// ----------------------------------------------------------------
// Node execution
// ----------------------------------------------------------------

function createNodeExecutionState(node: ChainNode): NodeExecutionState {
    const base = {
        name: node.name,
        type: node.type,
        status: 'pending' as NodeStatus,
        maker_status: 'pending' as MakerStatus,
        checker_status: 'pending' as CheckerStatus,
        evidence: [] as MethodResult['evidence'][],
    };
    if (node.type === 'parallel-group') {
        return {
            ...base,
            parallel_children: Object.fromEntries(
                (node as ParallelGroupNode).children.map((c) => [c.name, { maker_status: 'pending' as MakerStatus }]),
            ),
        };
    }
    return base;
}

async function runMaker(
    maker: SingleNode['maker'] | ParallelChildNode['maker'],
    cwd: string,
    delegateRunner?: DelegateRunner,
): Promise<{ status: 'completed' | 'failed' | 'paused'; output?: string; error?: string }> {
    if (maker.delegate_to) {
        if (!delegateRunner) {
            if (maker.command) {
                logger.warn(
                    `delegate_to "${maker.delegate_to}" has no delegate runner — falling back to maker.command`,
                );
            } else {
                return {
                    status: 'failed',
                    error: `delegate_to "${maker.delegate_to}" requires a configured delegate runner`,
                };
            }
        }

        if (delegateRunner) {
            const delegatedResult = await delegateRunner({
                skill: maker.delegate_to,
                cwd: maker.cwd ?? cwd,
                timeout_ms: (maker.timeout ?? 3600) * 1000,
                ...(maker.task_ref ? { task_ref: maker.task_ref } : {}),
                ...(maker.args ? { args: maker.args } : {}),
                ...(maker.execution_channel ? { execution_channel: maker.execution_channel } : {}),
            });

            if (delegatedResult.status === 'completed') {
                const output =
                    delegatedResult.output ??
                    (delegatedResult.structured_output ? JSON.stringify(delegatedResult.structured_output) : undefined);
                return {
                    status: 'completed',
                    ...(output ? { output } : {}),
                };
            }

            if (delegatedResult.status === 'paused') {
                const output =
                    delegatedResult.output ??
                    (delegatedResult.structured_output ? JSON.stringify(delegatedResult.structured_output) : undefined);
                return {
                    status: 'paused',
                    ...(output ? { output } : {}),
                    ...(delegatedResult.error ? { error: delegatedResult.error } : {}),
                };
            }

            return {
                status: 'failed',
                error:
                    delegatedResult.error ??
                    `Delegated maker "${maker.delegate_to}" returned ${delegatedResult.status}`,
            };
        }
    }

    if (maker.command) {
        const cmd = maker.command;
        const timeout = (maker.timeout ?? 3600) * 1000;
        return new Promise((resolve) => {
            let stdout = '';
            let stderr = '';
            const child = spawn(cmd, [], {
                shell: true,
                cwd: maker.cwd ?? cwd,
                timeout,
            });

            child.stdout?.on('data', (data: unknown) => {
                stdout += String(data);
            });

            child.stderr?.on('data', (data: unknown) => {
                stderr += String(data);
            });

            child.on('error', (err: Error) => {
                resolve({ status: 'failed', error: err.message });
            });

            child.on('close', (code: number | null) => {
                if (code === 0) {
                    resolve({ status: 'completed', output: stdout });
                } else {
                    resolve({
                        status: 'failed',
                        error: `Exit ${code}: ${stderr || stdout}`.slice(0, 500),
                    });
                }
            });
        });
    }

    // No maker defined - checker runs standalone
    return { status: 'completed' };
}

async function executeSingleNode(
    node: SingleNode,
    state: NodeExecutionState,
    manifest: ChainManifest,
    chainState: ChainState,
    stateDir: string,
    delegateRunner?: DelegateRunner,
    cwd?: string,
): Promise<{ halted: boolean; reason?: string }> {
    const resolvedCwd = cwd ?? stateDir;

    // --- Run maker (skip if already completed from a previous run) ---
    state.status = 'running';
    state.started_at ??= new Date().toISOString();

    if (state.maker_status === 'completed') {
        // Global retry: maker already succeeded, skip to checker
        logger.debug(`Skipping maker for node ${node.name} — already completed`);
    }

    const makerResult =
        state.maker_status === 'completed'
            ? ({ status: 'completed', output: state.maker_output } as const)
            : await (async () => {
                  state.maker_status = 'running';
                  return runMaker(node.maker, resolvedCwd, delegateRunner);
              })();

    if (makerResult.status === 'paused') {
        state.maker_status = 'paused';
        state.status = 'running';
        if (makerResult.output) {
            state.maker_output = makerResult.output;
        }
        if (makerResult.error) {
            state.maker_error = makerResult.error;
        }
        chainState.status = 'paused';
        chainState.paused_node = node.name;
        chainState.paused_at = new Date().toISOString();
        return { halted: true, reason: 'paused' };
    }

    if (makerResult.status === 'failed') {
        state.maker_status = 'failed';
        state.status = 'failed';
        state.completed_at = new Date().toISOString();
        if (makerResult.error) {
            state.maker_error = makerResult.error;
        }
        logger.error(`Maker failed for node ${node.name}: ${makerResult.error}`);

        // Check on_fail policy
        const onFail = node.checker.on_fail ?? manifest.on_node_fail ?? 'halt';
        if (onFail === 'skip') {
            state.status = 'skipped';
            return { halted: false };
        } else if (onFail === 'continue') {
            state.status = 'failed';
            return { halted: false };
        } else {
            return { halted: true, reason: `Maker failed: ${makerResult.error}` };
        }
    }

    state.maker_status = 'completed';
    if (makerResult.output) {
        state.maker_output = makerResult.output;
    }

    // --- Run checker ---
    state.checker_status = 'running';

    let checkerResult: MethodResult | null = null;
    let attempts = 0;
    const maxAttempts = (node.checker.retry ?? 0) + 1;

    while (attempts < maxAttempts) {
        attempts++;
        logger.debug(`Running checker for node ${node.name} (attempt ${attempts}/${maxAttempts})`);

        checkerResult = await runChecker(
            node.checker.method,
            node.checker.config,
            resolvedCwd,
            chainState.paused_response,
        );

        if (checkerResult.result !== 'fail') {
            break;
        }

        if (attempts < maxAttempts) {
            logger.debug(`Checker failed for node ${node.name}, retrying (${attempts}/${maxAttempts})`);
        }
    }

    // checkerResult is guaranteed non-null after the loop (at least 1 iteration runs)
    if (!checkerResult) {
        return { halted: true, reason: 'Checker returned no result' };
    }
    const cr = checkerResult;

    state.checker_status = cr.result === 'paused' ? 'paused' : 'completed';
    state.checker_result = cr.result;
    state.evidence.push(cr.evidence);

    if (cr.result === 'fail') {
        state.status = 'failed';
        state.completed_at = new Date().toISOString();

        const onFail = node.checker.on_fail ?? manifest.on_node_fail ?? 'halt';
        if (onFail === 'skip') {
            state.status = 'skipped';
            return { halted: false };
        } else if (onFail === 'continue') {
            return { halted: false };
        } else {
            return {
                halted: true,
                reason: cr.error ?? `Checker failed for ${node.name}`,
            };
        }
    }

    if (cr.result === 'paused') {
        state.status = 'running'; // Still running, waiting for human
        chainState.status = 'paused';
        chainState.paused_node = node.name;
        chainState.paused_at = new Date().toISOString();
        return { halted: true, reason: 'paused' };
    }

    // Pass
    state.status = 'completed';
    state.checker_status = 'completed';
    state.completed_at = new Date().toISOString();
    return { halted: false };
}

async function executeParallelGroupNode(
    node: ParallelGroupNode,
    state: NodeExecutionState,
    manifest: ChainManifest,
    chainState: ChainState,
    stateDir: string,
    delegateRunner?: DelegateRunner,
    cwd?: string,
): Promise<{ halted: boolean; reason?: string }> {
    const resolvedCwd = cwd ?? stateDir;

    state.status = 'running';
    state.started_at = new Date().toISOString();

    // Ensure parallel_children is initialized
    if (!state.parallel_children) {
        state.parallel_children = Object.fromEntries(
            node.children.map((c) => [c.name, { maker_status: 'pending' as MakerStatus }]),
        );
    }
    const parallelChildren = state.parallel_children;

    // Run all child makers concurrently
    const childPromises = node.children.map(async (child) => {
        parallelChildren[child.name].maker_status = 'running';

        const result = await runMaker(child.maker, resolvedCwd, delegateRunner);

        if (result.status === 'failed') {
            const err = result.error;
            parallelChildren[child.name] = {
                maker_status: 'failed',
                maker_result: 'fail',
                ...(err ? { error: err } : {}),
            };
        } else if (result.status === 'paused') {
            parallelChildren[child.name] = {
                maker_status: 'paused',
                ...(result.error ? { error: result.error } : {}),
            };
        } else {
            parallelChildren[child.name] = {
                maker_status: 'completed',
                maker_result: 'pass',
            };
        }

        return { childName: child.name, status: result.status };
    });

    const childOutcomes = await Promise.all(childPromises);

    const pausedChild = childOutcomes.find((outcome) => outcome.status === 'paused');
    if (pausedChild) {
        state.maker_status = 'paused';
        chainState.status = 'paused';
        chainState.paused_node = node.name;
        chainState.paused_at = new Date().toISOString();
        return { halted: true, reason: 'paused' };
    }

    // Check convergence
    const childResults = Object.values(state.parallel_children ?? {}).map((c) => c.maker_result ?? 'fail');
    const passCount = childResults.filter((r) => r === 'pass').length;
    const totalCount = childResults.length;

    let converged = false;
    switch (node.convergence) {
        case 'all':
            converged = passCount === totalCount;
            break;
        case 'any':
            converged = passCount >= 1;
            break;
        case 'quorum': {
            const quorumCount = node.quorum_count ?? Math.ceil(totalCount / 2);
            converged = passCount >= quorumCount;
            break;
        }
        case 'best-effort':
            converged = passCount > 0;
            break;
    }

    if (!converged) {
        state.status = 'failed';
        state.completed_at = new Date().toISOString();
        const onFail = manifest.on_node_fail ?? 'halt';
        if (onFail === 'skip') {
            state.status = 'skipped';
            return { halted: false };
        } else if (onFail === 'continue') {
            return { halted: false };
        }
        return { halted: true, reason: 'Parallel group convergence failed' };
    }

    // Convergence achieved - run the group's checker
    state.maker_status = 'completed';
    state.checker_status = 'running';

    const checkerResult = await runChecker(
        node.checker.method,
        node.checker.config,
        resolvedCwd,
        chainState.paused_response,
    );

    state.checker_status = checkerResult.result === 'paused' ? 'paused' : 'completed';
    state.checker_result = checkerResult.result;
    state.evidence.push(checkerResult.evidence);

    if (checkerResult.result === 'fail') {
        state.status = 'failed';
        state.completed_at = new Date().toISOString();
        const onFail = node.checker.on_fail ?? manifest.on_node_fail ?? 'halt';
        if (onFail === 'skip') {
            state.status = 'skipped';
            return { halted: false };
        } else if (onFail === 'continue') {
            return { halted: false };
        }
        return {
            halted: true,
            reason: checkerResult.error ?? 'Parallel group checker failed',
        };
    }

    if (checkerResult.result === 'paused') {
        state.status = 'running';
        chainState.status = 'paused';
        chainState.paused_node = node.name;
        chainState.paused_at = new Date().toISOString();
        return { halted: true, reason: 'paused' };
    }

    state.status = 'completed';
    state.checker_status = 'completed';
    state.completed_at = new Date().toISOString();
    return { halted: false };
}

// ----------------------------------------------------------------
// Chain state helpers
// ----------------------------------------------------------------

function getDefaultState(manifest: ChainManifest): ChainState {
    const state: ChainState = {
        chain_id: manifest.chain_id,
        task_wbs: manifest.task_wbs,
        chain_name: manifest.chain_name,
        status: 'running',
        current_node: '',
        nodes: manifest.nodes.map(createNodeExecutionState),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    if (manifest.global_retry) {
        state.global_retry = manifest.global_retry;
    }
    return state;
}

function nodeState(state: ChainState, name: string): NodeExecutionState | undefined {
    return state.nodes.find((n) => n.name === name);
}

// ----------------------------------------------------------------
// Main interpreter
// ----------------------------------------------------------------

export interface RunChainOptions {
    manifest: ChainManifest;
    stateDir?: string;
    cwd?: string | undefined;
    onNodeStart?: (node: ChainNode) => void;
    onNodeComplete?: (node: ChainNode, state: NodeExecutionState) => void;
    onChainPause?: (state: ChainState) => void;
    onChainComplete?: (state: ChainState) => void;
    onChainFail?: (state: ChainState, reason: string) => void;
    delegateRunner?: DelegateRunner;
}

export async function runChain(options: RunChainOptions): Promise<ChainState> {
    const {
        manifest,
        stateDir = '.',
        cwd,
        onNodeStart,
        onNodeComplete,
        onChainPause,
        onChainComplete,
        onChainFail,
        delegateRunner,
    } = options;

    const statePath = join(stateDir, 'cov', `${manifest.chain_id}-${manifest.task_wbs}-cov-state.json`);

    // Load existing state or create new
    let _state = loadPersistedState(statePath, manifest.chain_id, manifest.task_wbs);
    if (!_state) {
        _state = getDefaultState(manifest);
    } else {
        // Ensure every manifest node has a state entry (handles new nodes added to manifest)
        for (const manifestNode of manifest.nodes) {
            const existing = _state.nodes.find((n) => n.name === manifestNode.name);
            if (!existing) {
                _state.nodes.push(createNodeExecutionState(manifestNode));
            }
        }
    }
    // state is guaranteed non-null after above block
    const state = _state;
    saveState(state, statePath, manifest);

    logger.log(`Starting chain ${manifest.chain_name} (${manifest.chain_id})`);

    // Global retry loop
    let globalRetryRemaining = state.global_retry?.remaining ?? 0;
    const globalRetryTotal = state.global_retry?.total ?? 0;

    while (true) {
        // Find next pending or running node
        // When chain is paused, current_node is 'running' - we need to resume it
        const nextNode = manifest.nodes.find((n) => {
            const ns = nodeState(state, n.name);
            return ns === undefined || ns.status === 'pending' || ns.status === 'running';
        });

        if (!nextNode) {
            // All nodes processed - check if we need to retry globally
            const hasFailed = state?.nodes.some((n) => n.status === 'failed');

            if (hasFailed && globalRetryRemaining > 0) {
                globalRetryRemaining--;
                state.global_retry = {
                    remaining: globalRetryRemaining,
                    total: globalRetryTotal,
                };
                logger.log(`Global retry: ${globalRetryRemaining}/${globalRetryTotal} remaining`);

                // Reset failed/skipped nodes to pending for retry
                for (const ns of state.nodes) {
                    if (ns.status === 'failed' || ns.status === 'skipped') {
                        ns.status = 'pending';
                        ns.checker_status = 'pending';
                        delete (ns as Partial<NodeExecutionState>).checker_result;
                        if (ns.maker_status !== 'completed') {
                            // Maker failed — re-run the entire node
                            ns.maker_status = 'pending';
                        }
                        // Maker succeeded — keep maker_output, re-run checker only
                    }
                }
                saveState(state, statePath, manifest);
                continue;
            }

            if (hasFailed) {
                state.status = 'failed';
                state.updated_at = new Date().toISOString();
                saveState(state, statePath, manifest);
                const failedNodes = state.nodes.filter((n) => n.status === 'failed').map((n) => n.name);
                const reason = `Failed nodes: ${failedNodes.join(', ')}`;
                logger.error(`Chain failed: ${reason}`);
                onChainFail?.(state, reason);
                return state;
            }

            // All completed successfully
            state.status = 'completed';
            state.updated_at = new Date().toISOString();
            saveState(state, statePath, manifest);
            logger.success(`Chain ${manifest.chain_name} completed successfully`);
            onChainComplete?.(state);
            return state;
        }

        // Execute next node
        state.current_node = nextNode.name;
        state.updated_at = new Date().toISOString();
        saveState(state, statePath, manifest);

        logger.log(`Executing node: ${nextNode.name} (${nextNode.type})`);
        onNodeStart?.(nextNode);

        let halted = false;
        let haltReason: string | undefined;

        if (nextNode.type === 'single') {
            const ns = nodeState(state, nextNode.name);
            if (!ns) continue;
            ({ halted, reason: haltReason } = await executeSingleNode(
                nextNode as SingleNode,
                ns,
                manifest,
                state,
                stateDir,
                delegateRunner,
                cwd,
            ));
        } else if (nextNode.type === 'parallel-group') {
            const ns = nodeState(state, nextNode.name);
            if (!ns) continue;
            ({ halted, reason: haltReason } = await executeParallelGroupNode(
                nextNode as ParallelGroupNode,
                ns,
                manifest,
                state,
                stateDir,
                delegateRunner,
                cwd,
            ));
        }

        state.updated_at = new Date().toISOString();
        saveState(state, statePath);

        const ns = nodeState(state, nextNode.name);
        if (ns) onNodeComplete?.(nextNode, ns);

        if (halted) {
            if (state.status === 'paused' || haltReason === 'paused') {
                logger.log(`Chain paused at node ${nextNode.name}, awaiting human input`);
                onChainPause?.(state);
            } else {
                logger.error(`Chain halted at node ${nextNode.name}: ${haltReason}`);
                state.status = 'failed';
                state.updated_at = new Date().toISOString();
                saveState(state, statePath, manifest);
                onChainFail?.(state, haltReason ?? 'unknown');
            }
            return state;
        }
    }
}

// ----------------------------------------------------------------
// Resume a paused chain
// ----------------------------------------------------------------

export interface ResumeChainOptions {
    manifest: ChainManifest;
    stateDir?: string;
    cwd?: string | undefined;
    humanResponse?: string;
    onNodeStart?: (node: ChainNode) => void;
    onNodeComplete?: (node: ChainNode, state: NodeExecutionState) => void;
    onChainComplete?: (state: ChainState) => void;
    onChainFail?: (state: ChainState, reason: string) => void;
    delegateRunner?: DelegateRunner;
}

/**
 * Resume a paused chain. If humanResponse is provided, it is stored as
 * the human check's response and the chain continues.
 */
export async function resumeChain(options: ResumeChainOptions): Promise<ChainState> {
    const {
        manifest,
        stateDir = '.',
        cwd,
        humanResponse,
        onNodeStart,
        onNodeComplete,
        onChainComplete,
        onChainFail,
        delegateRunner,
    } = options;

    const statePath = join(stateDir, 'cov', `${manifest.chain_id}-${manifest.task_wbs}-cov-state.json`);
    const state = loadPersistedState(statePath, manifest.chain_id, manifest.task_wbs);

    if (!state) {
        throw new Error(`No chain state found at ${statePath}`);
    }

    if (state.status !== 'paused') {
        throw new Error(`Chain is not paused (status: ${state.status})`);
    }

    // Store human response so the checker can use it when re-run
    if (humanResponse !== undefined) {
        state.paused_response = humanResponse;
        logger.debug(`Stored human response: ${humanResponse}`);
    }

    // Clear pause state and continue
    state.status = 'running';
    // Use delete to properly remove optional properties per exactOptionalPropertyTypes
    if ('paused_node' in state) delete (state as Partial<ChainState>).paused_node;
    if ('paused_at' in state) delete (state as Partial<ChainState>).paused_at;
    state.updated_at = new Date().toISOString();
    saveState(state, statePath, manifest);

    logger.log(`Chain resumed from node ${state.current_node}`);

    // Continue from where we paused
    return runChain({
        manifest,
        stateDir,
        cwd,
        onNodeStart: onNodeStart ?? (() => {}),
        onNodeComplete: onNodeComplete ?? (() => {}),
        onChainComplete: onChainComplete ?? (() => {}),
        onChainFail: onChainFail ?? (() => {}),
        ...(delegateRunner ? { delegateRunner } : {}),
    });
}
