/**
 * verification-chain - Chain of Verification (CoV) orchestration skill
 *
 * This module defines all TypeScript interfaces for the CoV skill,
 * including types for chain manifests, node execution states, checker
 * configurations, and runtime state management.
 */

// Core enums and unions
export type CheckerMethod = 'cli' | 'llm' | 'human' | 'file-exists' | 'content-match' | 'compound';
export type ConvergenceMode = 'all' | 'any' | 'quorum' | 'best-effort';
export type NodeType = 'single' | 'parallel-group';
export type ChainStatus = 'running' | 'paused' | 'completed' | 'failed' | 'halted';
export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type OnFailPolicy = 'halt' | 'skip' | 'continue';
export type MakerStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type CheckerStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

// Maker definition
export interface Maker {
    delegate_to?: string; // skill name to delegate to, e.g. "rd3:code-implement-common"
    task_ref?: string; // path to task file or reference
    command?: string; // raw shell command to execute
    timeout?: number; // seconds, default 3600
}

// Checker config per method (each is a separate interface)
export interface CliCheckerConfig {
    command: string;
    exit_codes?: number[]; // default [0]
    timeout?: number; // seconds
}

export interface LlmCheckerConfig {
    checklist: string[]; // items all must pass
    prompt_template?: string; // optional custom prompt
}

export interface HumanCheckerConfig {
    prompt: string;
    choices?: string[]; // approved choices, default ["approve", "reject", "request_changes"]
}

export interface FileExistsCheckerConfig {
    paths: string[];
}

export interface ContentMatchCheckerConfig {
    file: string;
    pattern: string; // regex pattern
    must_exist: boolean; // true = pattern must be found, false = must NOT be found
}

export interface CompoundCheckerConfig {
    operator: 'and' | 'or' | 'quorum';
    quorum_count?: number; // required for quorum operator
    checks: Checker[];
}

export type CheckerConfig =
    | CliCheckerConfig
    | LlmCheckerConfig
    | HumanCheckerConfig
    | FileExistsCheckerConfig
    | ContentMatchCheckerConfig
    | CompoundCheckerConfig;

// Full checker definition
export interface Checker {
    method: CheckerMethod;
    config: CheckerConfig;
    retry?: number; // node-level retries, default 0
    on_fail?: OnFailPolicy; // default 'halt'
}

// Single node
export interface SingleNode {
    name: string;
    type: 'single';
    maker: Maker;
    checker: Checker;
}

// Parallel group child node (maker-only, no nested checker at child level)
export interface ParallelChildNode {
    name: string;
    maker: Maker;
}

// Parallel group node
export interface ParallelGroupNode {
    name: string;
    type: 'parallel-group';
    convergence: ConvergenceMode;
    quorum_count?: number; // required if convergence is 'quorum'
    children: ParallelChildNode[];
    checker: Checker; // runs after convergence
}

// Union of all node types
export type ChainNode = SingleNode | ParallelGroupNode;

// Chain manifest
export interface ChainManifest {
    chain_id: string;
    chain_name: string;
    task_wbs: string;
    global_retry?: { remaining: number; total: number };
    on_node_fail?: OnFailPolicy; // default 'halt'
    global_timeout?: number; // seconds
    nodes: ChainNode[];
}

// Evidence captured per checker run
export interface CheckerEvidence {
    method: CheckerMethod;
    result: 'pass' | 'fail' | 'paused';
    timestamp: string;
    cli_output?: string;
    cli_exit_code?: number;
    llm_results?: Array<{ item: string; passed: boolean; reason?: string }>;
    human_response?: string;
    file_paths_found?: string[];
    content_match_found?: boolean;
    compound_results?: Array<{ sub_check: string; result: 'pass' | 'fail' | 'paused' }>;
    error?: string;
}

// Per-node execution state
export interface NodeExecutionState {
    name: string;
    type: NodeType;
    status: NodeStatus;
    maker_status: MakerStatus;
    checker_status: CheckerStatus;
    checker_result?: 'pass' | 'fail' | 'paused';
    evidence: CheckerEvidence[];
    started_at?: string;
    completed_at?: string;
    parallel_children?: Record<
        string,
        {
            maker_status: MakerStatus;
            maker_result?: 'pass' | 'fail';
            error?: string;
        }
    >;
}

// Chain state (written to cov-state.json)
export interface ChainState {
    chain_id: string;
    task_wbs: string;
    chain_name: string;
    status: ChainStatus;
    current_node: string;
    global_retry?: { remaining: number; total: number };
    nodes: NodeExecutionState[];
    created_at: string;
    updated_at: string;
    paused_at?: string;
    paused_node?: string;
    paused_response?: string; // human response collected during resume
}

// Verification result returned by method handlers
export interface MethodResult {
    result: 'pass' | 'fail' | 'paused';
    evidence: CheckerEvidence;
    error?: string;
}

// Interpreter options
export interface InterpreterOptions {
    manifest: ChainManifest;
    state_dir?: string;
    on_node_start?: (node: ChainNode) => void;
    on_node_complete?: (node: ChainNode, state: NodeExecutionState) => void;
    on_checker_start?: (node_name: string, method: CheckerMethod) => void;
    on_checker_complete?: (node_name: string, result: MethodResult) => void;
    on_chain_pause?: (state: ChainState) => void;
    on_chain_complete?: (state: ChainState) => void;
    on_chain_fail?: (state: ChainState, reason: string) => void;
}
