export type TaskProfile = 'simple' | 'standard' | 'complex' | 'research';
export type PhaseProfile = 'refine' | 'plan' | 'unit' | 'review' | 'docs';
export type Profile = TaskProfile | PhaseProfile;
export type PhaseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type PhaseGate = 'auto' | 'human' | 'auto/human';
export type PhaseExecutionMode = 'direct-skill' | 'worker-agent';

export interface Phase {
    number: PhaseNumber;
    name: string;
    skill: string;
    executor: string;
    execution_mode: PhaseExecutionMode;
    worker_contract_version?: string;
    inputs: string[];
    outputs: string[];
    gate: PhaseGate;
    gateCriteria?: string;
    prerequisites?: string[];
}

export interface ExecutionPlan {
    task_ref: string;
    task_path?: string;
    profile: Profile;
    execution_channel: string;
    phases: Phase[];
    estimated_duration_hours: number;
    total_gates: number;
    human_gates: number;
    coverage_threshold: number;
    auto_approve_human_gates: boolean;
    refine_mode: boolean;
    dry_run: boolean;
}

export interface CreateExecutionPlanOptions {
    profile?: Profile;
    startPhase?: PhaseNumber;
    skipPhases?: PhaseNumber[];
    coverageOverride?: number;
    executionChannel?: string;
    auto?: boolean;
    dryRun?: boolean;
    refine?: boolean;
}

export const DEFAULT_PHASE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

export const VALID_PROFILES = [
    'simple',
    'standard',
    'complex',
    'research',
    'refine',
    'plan',
    'unit',
    'review',
    'docs',
] as const;

export const PHASE_DURATIONS: Record<PhaseNumber, number> = {
    1: 1,
    2: 2,
    3: 3,
    4: 1,
    5: 4,
    6: 2,
    7: 1,
    8: 2,
    9: 1,
};

export interface ParsedOrchestrationArgs {
    taskRef: string;
    profile?: Profile;
    startPhase?: PhaseNumber;
    skipPhases: PhaseNumber[];
    coverageOverride?: number;
    executionChannel: string;
    auto: boolean;
    dryRun: boolean;
    refine: boolean;
    stackProfile: string;
    resume: boolean;
}

export function parseOrchestrationArgs(
    args: string[],
    validateProfileFn: (p: string) => p is Profile,
): ParsedOrchestrationArgs | null {
    if (args.length < 1) {
        return null;
    }

    const result: ParsedOrchestrationArgs = {
        taskRef: args[0],
        skipPhases: [],
        executionChannel: 'current',
        auto: false,
        dryRun: false,
        refine: false,
        stackProfile: 'typescript-bun-biome',
        resume: false,
    };

    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--profile' && i + 1 < args.length) {
            const value = args[++i];
            if (!validateProfileFn(value)) {
                throw new Error(`Invalid profile: ${value}`);
            }
            result.profile = value;
        } else if (args[i] === '--start-phase' && i + 1 < args.length) {
            const parsed = Number.parseInt(args[++i], 10);
            if (parsed < 1 || parsed > 9) {
                throw new Error(`Invalid start-phase: ${parsed}. Must be 1-9.`);
            }
            result.startPhase = parsed as PhaseNumber;
        } else if ((args[i] === '--skip' || args[i] === '--skip-phases') && i + 1 < args.length) {
            const parsed = args[++i]
                .split(',')
                .map((value) => Number.parseInt(value.trim(), 10))
                .filter((value): value is PhaseNumber => value >= 1 && value <= 9);
            result.skipPhases.push(...parsed);
        } else if (args[i] === '--coverage' && i + 1 < args.length) {
            const parsed = Number.parseInt(args[++i], 10);
            if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
                throw new Error(`Invalid coverage: ${parsed}. Must be 1-100.`);
            }
            result.coverageOverride = parsed;
        } else if (args[i] === '--channel' && i + 1 < args.length) {
            result.executionChannel = args[++i];
        } else if (args[i] === '--auto') {
            result.auto = true;
        } else if (args[i] === '--dry-run') {
            result.dryRun = true;
        } else if (args[i] === '--refine') {
            result.refine = true;
        } else if (args[i] === '--stack-profile' && i + 1 < args.length) {
            result.stackProfile = args[++i];
        } else if (args[i] === '--resume') {
            result.resume = true;
        }
    }

    return result;
}

export interface DownstreamEvidenceEnvelope {
    kind: string;
    summary: string;
    required_fields: string[];
    optional_fields?: string[];
}
