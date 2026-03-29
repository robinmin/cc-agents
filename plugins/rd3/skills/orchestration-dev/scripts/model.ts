export type TaskProfile = 'simple' | 'standard' | 'complex' | 'research';
export type PhaseProfile = 'refine' | 'plan' | 'unit' | 'review' | 'docs';
export type Profile = TaskProfile | PhaseProfile;
export type PhaseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type PhaseGate = 'auto' | 'human' | 'auto/human';

export interface Phase {
    number: PhaseNumber;
    name: string;
    skill: string;
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

export interface DownstreamEvidenceEnvelope {
    kind: string;
    summary: string;
    required_fields: string[];
    optional_fields?: string[];
}
