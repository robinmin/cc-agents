#!/usr/bin/env bun
/**
 * rd3:task-runner — Dry-Run Output Emitter
 *
 * Emits a standardized JSON describing the resolved task-runner workflow.
 * Consumed by CI, schedulers, and observability tooling.
 *
 * Usage (programmatic):
 *   import { renderDryRunOutput } from './dry-run-output';
 *   const output = renderDryRunOutput(input);
 *
 * Usage (CLI):
 *   bun dry-run-output.ts --input <path-to-json>
 *   echo '{"task_ref":"0387",...}' | bun dry-run-output.ts --stdin
 *
 * See references/dry-run-schema.md for the schema contract.
 */

export type Preset = 'simple' | 'standard' | 'complex' | 'research';
export type Stage = 'all' | 'plan-only' | 'implement-only';
export type ExpectedStatus = 'Todo' | 'WIP' | 'Testing' | 'Done' | 'Blocked';
export type DelegationStage = 'plan' | 'implement' | 'verify';

export interface DryRunInput {
    task_ref: string;
    task_file: string;
    preset: Preset;
    stage?: Stage;
    channel?: string;
    auto?: boolean;
    preflight_verify?: boolean;
    postflight_verify?: boolean;
    coverage?: number | null;
    max_loop_iterations?: number;
    refine_enabled?: boolean;
    refine_skipped_reason?: string;
    plan_enabled?: boolean;
    plan_skipped_reason?: string;
    delegation_targets?: Array<{ stage: DelegationStage; channel: string }>;
}

export interface DryRunStageToggle {
    enabled: boolean;
    skipped_reason?: string;
}

export interface DryRunLoopToggle {
    enabled: boolean;
    max_iterations: number;
}

export interface DryRunWorkflow {
    preflight: { enabled: true };
    preflight_verify: DryRunStageToggle;
    refine: DryRunStageToggle;
    plan: DryRunStageToggle;
    implement_test_loop: DryRunLoopToggle;
    verify: DryRunStageToggle;
    postflight_verify: DryRunStageToggle;
}

export interface DryRunStatusTransition {
    from: string;
    to: string;
    trigger: string;
    guards: string[];
}

export interface DryRunDelegation {
    stage: DelegationStage;
    channel: string;
    prompt_contract: DelegationStage;
}

export interface DryRunExitConditions {
    early_exit_at_stage?: 'plan-only' | 'implement-only';
    expected_final_status: ExpectedStatus;
}

export interface DryRunOutput {
    schema_version: 1;
    task_ref: string;
    task_file: string;
    preset: Preset;
    stage: Stage;
    channel: string;
    flags: {
        auto: boolean;
        preflight_verify: boolean;
        postflight_verify: boolean;
        coverage: number | null;
        max_loop_iterations: number;
    };
    workflow: DryRunWorkflow;
    status_transitions_planned: DryRunStatusTransition[];
    delegation_plan: DryRunDelegation[];
    exit_conditions: DryRunExitConditions;
}

const DEFAULT_MAX_LOOP_ITERATIONS = 3;

function resolveStage(input: DryRunInput): Stage {
    return input.stage ?? 'all';
}

function resolveChannel(input: DryRunInput): string {
    return input.channel ?? 'current';
}

function planEnabled(input: DryRunInput): boolean {
    if (input.plan_enabled !== undefined) return input.plan_enabled;
    if (input.stage === 'implement-only') return false;
    return input.preset === 'complex' || input.preset === 'research';
}

function refineEnabled(input: DryRunInput): boolean {
    if (input.refine_enabled !== undefined) return input.refine_enabled;
    if (input.stage === 'implement-only') return false;
    return input.preset === 'complex' || input.preset === 'research';
}

function implementTestLoopEnabled(input: DryRunInput): boolean {
    return resolveStage(input) !== 'plan-only';
}

function verifyEnabled(input: DryRunInput): boolean {
    return resolveStage(input) !== 'plan-only';
}

function postflightVerifyEnabled(input: DryRunInput): boolean {
    // Default-on as of v1.1: only false when input.postflight_verify === false (i.e. --no-postflight-verify).
    const requested = input.postflight_verify !== false;
    return requested && resolveStage(input) !== 'plan-only';
}

function buildWorkflow(input: DryRunInput): DryRunWorkflow {
    const loopEnabled = implementTestLoopEnabled(input);
    const refine: DryRunStageToggle = { enabled: refineEnabled(input) };
    if (!refine.enabled && input.refine_skipped_reason) {
        refine.skipped_reason = input.refine_skipped_reason;
    } else if (!refine.enabled && input.stage === 'implement-only') {
        refine.skipped_reason = 'stage=implement-only skips refine';
    }

    const plan: DryRunStageToggle = { enabled: planEnabled(input) };
    if (!plan.enabled && input.plan_skipped_reason) {
        plan.skipped_reason = input.plan_skipped_reason;
    } else if (!plan.enabled && input.stage === 'implement-only') {
        plan.skipped_reason = 'stage=implement-only skips plan';
    }

    return {
        preflight: { enabled: true },
        preflight_verify: { enabled: Boolean(input.preflight_verify) },
        refine,
        plan,
        implement_test_loop: {
            enabled: loopEnabled,
            max_iterations: input.max_loop_iterations ?? DEFAULT_MAX_LOOP_ITERATIONS,
        },
        verify: { enabled: verifyEnabled(input) },
        postflight_verify: { enabled: postflightVerifyEnabled(input) },
    };
}

function buildStatusTransitions(input: DryRunInput): DryRunStatusTransition[] {
    const stage = resolveStage(input);
    const transitions: DryRunStatusTransition[] = [];

    if (stage === 'plan-only') {
        if (refineEnabled(input) || planEnabled(input)) {
            transitions.push({
                from: 'Todo',
                to: 'WIP',
                trigger: 'stage:refine-start',
                guards: ['pre-implementation'],
            });
        }
        return transitions;
    }

    transitions.push({
        from: 'Todo',
        to: 'WIP',
        trigger: 'stage:implement-start',
        guards: ['pre-implementation'],
    });
    transitions.push({
        from: 'WIP',
        to: 'Testing',
        trigger: 'stage:testing-start',
        guards: ['pre-testing'],
    });
    transitions.push({
        from: 'Testing',
        to: 'Done',
        trigger: 'verify:PASS',
        guards: ['completion'],
    });

    return transitions;
}

function buildDelegationPlan(input: DryRunInput): DryRunDelegation[] {
    if (!input.delegation_targets || input.delegation_targets.length === 0) {
        return [];
    }
    return input.delegation_targets.map((target) => ({
        stage: target.stage,
        channel: target.channel,
        prompt_contract: target.stage,
    }));
}

function buildExitConditions(input: DryRunInput): DryRunExitConditions {
    const stage = resolveStage(input);

    if (stage === 'plan-only') {
        const hasActiveStages = refineEnabled(input) || planEnabled(input);
        return {
            early_exit_at_stage: 'plan-only',
            expected_final_status: hasActiveStages ? 'WIP' : 'Todo',
        };
    }

    if (stage === 'implement-only') {
        return {
            early_exit_at_stage: 'implement-only',
            expected_final_status: 'Done',
        };
    }

    return {
        expected_final_status: 'Done',
    };
}

export function renderDryRunOutput(input: DryRunInput): DryRunOutput {
    validateInput(input);
    return {
        schema_version: 1,
        task_ref: input.task_ref,
        task_file: input.task_file,
        preset: input.preset,
        stage: resolveStage(input),
        channel: resolveChannel(input),
        flags: {
            auto: Boolean(input.auto),
            preflight_verify: Boolean(input.preflight_verify),
            postflight_verify: input.postflight_verify !== false,
            coverage: input.coverage ?? null,
            max_loop_iterations: input.max_loop_iterations ?? DEFAULT_MAX_LOOP_ITERATIONS,
        },
        workflow: buildWorkflow(input),
        status_transitions_planned: buildStatusTransitions(input),
        delegation_plan: buildDelegationPlan(input),
        exit_conditions: buildExitConditions(input),
    };
}

function validateInput(input: DryRunInput): void {
    if (!input.task_ref || typeof input.task_ref !== 'string') {
        throw new Error('dry-run-output: task_ref is required');
    }
    if (!input.task_file || typeof input.task_file !== 'string') {
        throw new Error('dry-run-output: task_file is required');
    }
    const validPresets: Preset[] = ['simple', 'standard', 'complex', 'research'];
    if (!validPresets.includes(input.preset)) {
        throw new Error(`dry-run-output: invalid preset "${input.preset}"; expected one of ${validPresets.join(', ')}`);
    }
    if (input.stage !== undefined) {
        const validStages: Stage[] = ['all', 'plan-only', 'implement-only'];
        if (!validStages.includes(input.stage)) {
            throw new Error(
                `dry-run-output: invalid stage "${input.stage}"; expected one of ${validStages.join(', ')}`,
            );
        }
    }
    if (input.max_loop_iterations !== undefined) {
        if (!Number.isInteger(input.max_loop_iterations) || input.max_loop_iterations < 1) {
            throw new Error('dry-run-output: max_loop_iterations must be a positive integer');
        }
    }
    if (input.coverage !== undefined && input.coverage !== null) {
        if (typeof input.coverage !== 'number' || input.coverage < 0 || input.coverage > 100) {
            throw new Error('dry-run-output: coverage must be a number between 0 and 100');
        }
    }
}

export interface CliIo {
    readInputFile: (path: string) => Promise<string>;
    readStdin: () => Promise<string>;
    writeStdout: (text: string) => void;
    writeStderr: (text: string) => void;
}

export async function runCli(argv: string[], io: CliIo): Promise<number> {
    const args = argv.slice(2);
    let inputJson: string;

    if (args.includes('--stdin')) {
        inputJson = await io.readStdin();
    } else {
        const inputIdx = args.indexOf('--input');
        const path = inputIdx === -1 ? '' : (args[inputIdx + 1] ?? '');
        if (!path) {
            io.writeStderr('Usage: bun dry-run-output.ts --input <path> | --stdin\n');
            return 2;
        }
        inputJson = await io.readInputFile(path);
    }

    let input: DryRunInput;
    try {
        input = JSON.parse(inputJson) as DryRunInput;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        io.writeStderr(`dry-run-output: invalid JSON input: ${msg}\n`);
        return 2;
    }

    let output: DryRunOutput;
    try {
        output = renderDryRunOutput(input);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        io.writeStderr(`dry-run-output: ${msg}\n`);
        return 2;
    }

    io.writeStdout(`${JSON.stringify(output, null, 2)}\n`);
    return 0;
}

async function readStdinLive(): Promise<string> {
    const reader = Bun.stdin.stream().getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(decoder.decode(value));
        }
    } finally {
        reader.releaseLock();
    }
    return chunks.join('');
}

export const liveIo: CliIo = {
    readInputFile: (path) => Bun.file(path).text(),
    readStdin: readStdinLive,
    writeStdout: (text) => process.stdout.write(text),
    writeStderr: (text) => process.stderr.write(text),
};

if (import.meta.main) {
    runCli(process.argv, liveIo).then((code) => {
        process.exit(code);
    });
}
