import type { DownstreamEvidenceEnvelope, Phase, PhaseNumber, Profile, TaskProfile } from './model';

export const PHASE_MATRIX: Record<Profile, PhaseNumber[]> = {
    simple: [5, 6],
    standard: [1, 4, 5, 6, 7, 8, 9],
    complex: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    research: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    refine: [1],
    plan: [2, 3, 4],
    unit: [6],
    review: [7],
    docs: [9],
};

const PROFILE_COVERAGE_THRESHOLDS: Record<TaskProfile, number> = {
    simple: 60,
    standard: 80,
    complex: 80,
    research: 60,
};

const PHASE_PROFILE_COVERAGE_THRESHOLDS: Partial<Record<Exclude<Profile, TaskProfile>, number>> = {
    unit: 90,
};

const PHASE_NAMES: Record<PhaseNumber, string> = {
    1: 'Request Intake',
    2: 'Architecture',
    3: 'Design',
    4: 'Task Decomposition',
    5: 'Implementation',
    6: 'Unit Testing',
    7: 'Code Review',
    8: 'Functional Review',
    9: 'Documentation',
};

function isTaskProfile(profile: Profile): profile is TaskProfile {
    return profile === 'simple' || profile === 'standard' || profile === 'complex' || profile === 'research';
}

export function getCoverageThreshold(profile: Profile, coverageOverride?: number): number {
    if (coverageOverride !== undefined) {
        return coverageOverride;
    }

    if (isTaskProfile(profile)) {
        return PROFILE_COVERAGE_THRESHOLDS[profile];
    }

    return PHASE_PROFILE_COVERAGE_THRESHOLDS[profile] ?? PROFILE_COVERAGE_THRESHOLDS.standard;
}

export function validateSkipPhases(profile: Profile, skipPhases: PhaseNumber[]): void {
    validateSkipPhasesForSequence(PHASE_MATRIX[profile], profile, skipPhases);
}

export function validateStartPhase(profile: Profile, startPhase?: PhaseNumber): void {
    if (!startPhase) {
        return;
    }

    if (!PHASE_MATRIX[profile].includes(startPhase)) {
        throw new Error(`Invalid start-phase ${startPhase} for profile "${profile}"`);
    }
}

export function resolvePhaseSequence(
    profile: Profile,
    startPhase?: PhaseNumber,
    skipPhases: PhaseNumber[] = [],
): PhaseNumber[] {
    validateStartPhase(profile, startPhase);
    const basePhases = PHASE_MATRIX[profile];
    const selectedPhases = startPhase ? basePhases.slice(basePhases.indexOf(startPhase)) : [...basePhases];
    validateSkipPhasesForSequence(selectedPhases, profile, skipPhases);
    return selectedPhases.filter((phase) => !skipPhases.includes(phase));
}

function validateSkipPhasesForSequence(basePhases: PhaseNumber[], profile: Profile, skipPhases: PhaseNumber[]): void {
    if (skipPhases.length === 0) {
        return;
    }
    let sawSkippedPhase = false;

    for (const phase of basePhases) {
        if (skipPhases.includes(phase)) {
            sawSkippedPhase = true;
            continue;
        }

        if (sawSkippedPhase) {
            throw new Error(
                `Invalid skip-phases for profile "${profile}": skipping phase ${basePhases[basePhases.indexOf(phase) - 1]} requires skipping downstream phase ${phase} as well.`,
            );
        }
    }
}

function getTestingGateCriteria(profile: Profile, coverageThreshold: number): string {
    if (profile === 'unit') {
        return `Per-file coverage >= ${coverageThreshold}%, 100% tests pass`;
    }

    return `Coverage >= ${coverageThreshold}%, 100% tests pass`;
}

function getBasePhase(profile: Profile, phase: PhaseNumber, coverageThreshold: number): Phase {
    switch (phase) {
        case 1:
            return {
                number: 1,
                name: PHASE_NAMES[1],
                skill: 'rd3:request-intake',
                inputs: ['task_ref', 'description?', 'domain_hints?'],
                outputs: ['Background', 'Requirements', 'Constraints', 'Profile'],
                gate: 'auto',
                gateCriteria: 'Background 100+ chars, Requirements numbered, Profile assigned',
            };
        case 2:
            return {
                number: 2,
                name: PHASE_NAMES[2],
                skill: 'rd3:backend-architect',
                inputs: ['task_ref', 'requirements', 'constraints'],
                outputs: ['Architecture Document'],
                gate: 'auto',
                gateCriteria: 'Architecture document exists',
            };
        case 3:
            return {
                number: 3,
                name: PHASE_NAMES[3],
                skill: 'rd3:backend-design',
                inputs: ['task_ref', 'architecture', 'requirements'],
                outputs: ['Design Specs'],
                gate: 'human',
                gateCriteria: 'Design specs complete',
            };
        case 4:
            return {
                number: 4,
                name: PHASE_NAMES[4],
                skill: 'rd3:task-decomposition',
                inputs: ['task_ref', 'requirements', 'design?'],
                outputs: ['Subtask WBS list'],
                gate: 'auto',
                gateCriteria: 'Subtask list generated',
            };
        case 5:
            return {
                number: 5,
                name: PHASE_NAMES[5],
                skill: 'rd3:code-implement-common',
                inputs: ['task_ref', 'solution', 'design?'],
                outputs: ['Implementation Artifacts'],
                gate: 'auto',
                gateCriteria: 'Implementation artifacts exist',
                prerequisites: ['Solution section populated'],
            };
        case 6:
            return {
                number: 6,
                name: PHASE_NAMES[6],
                skill: 'rd3:sys-testing + rd3:advanced-testing',
                inputs: ['task_ref', 'source_paths', 'coverage_threshold'],
                outputs: ['Test Results', 'Coverage Report'],
                gate: 'auto',
                gateCriteria: getTestingGateCriteria(profile, coverageThreshold),
            };
        case 7:
            return {
                number: 7,
                name: PHASE_NAMES[7],
                skill: 'rd3:code-review-common',
                inputs: ['task_ref', 'source_paths', 'review_depth?'],
                outputs: ['Review Report'],
                gate: 'human',
                gateCriteria: 'No blocking issues, human approval',
            };
        case 8:
            if (profile === 'standard') {
                return {
                    number: 8,
                    name: PHASE_NAMES[8],
                    skill: 'rd3:bdd-workflow',
                    inputs: ['task_ref', 'mode=full', 'source_paths?'],
                    outputs: ['BDD Report'],
                    gate: 'auto',
                    gateCriteria: 'BDD scenarios generated and executed',
                };
            }

            return {
                number: 8,
                name: PHASE_NAMES[8],
                skill: 'rd3:bdd-workflow + rd3:functional-review',
                inputs: ['task_ref', 'mode=full', 'source_paths?', 'bdd_report'],
                outputs: ['Functional Verdict'],
                gate: 'auto/human',
                gateCriteria: 'Verdict pass or partial with approval',
            };
        case 9:
            return {
                number: 9,
                name: PHASE_NAMES[9],
                skill: 'rd3:code-docs',
                inputs: ['task_ref', 'source_paths?', 'target_docs?', 'change_summary?'],
                outputs: ['Refreshed Project Docs'],
                gate: 'auto',
                gateCriteria: 'Relevant project docs refreshed',
            };
    }
}

export function buildPhaseDefinitions(profile: Profile, coverageThreshold: number): Phase[] {
    return PHASE_MATRIX[profile].map((phaseNumber) => getBasePhase(profile, phaseNumber, coverageThreshold));
}

export const DOWNSTREAM_EVIDENCE_CONTRACTS: Record<string, DownstreamEvidenceEnvelope> = {
    'rd3:request-intake': {
        kind: 'request-intake-result',
        summary: 'Requirements enrichment envelope returned by Phase 1',
        required_fields: ['background', 'requirements', 'constraints', 'profile'],
        optional_fields: ['domain_hints', 'assumptions'],
    },
    'rd3:bdd-workflow': {
        kind: 'bdd-execution-report',
        summary: 'BDD execution envelope consumed by functional review and orchestration',
        required_fields: ['scenarios', 'passed', 'failed', 'execution_mode'],
        optional_fields: ['report_path', 'feature_paths', 'notes'],
    },
    'rd3:functional-review': {
        kind: 'functional-verdict',
        summary: 'Requirements traceability verdict consumed by orchestration gates',
        required_fields: ['verdict', 'covered_requirements', 'missing_requirements'],
        optional_fields: ['severity', 'recommendations', 'report_path'],
    },
};
