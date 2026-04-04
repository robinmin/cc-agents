import { readFileSync } from 'node:fs';
import type { DownstreamEvidenceEnvelope, Phase, PhaseNumber, Profile, TaskProfile } from './model';

type WorkerPhaseNumber = 5 | 6 | 7;

interface PhaseWorkerContract {
    phase: WorkerPhaseNumber;
    worker_agent: string;
    canonical_backbone: string[];
    supporting_skills?: string[];
    input_keys: string[];
    output_keys: string[];
    execution_channel_semantics: string;
    anti_recursion_rules: string[];
    evidence_expectations: string[];
    failure_reporting: string[];
}

export const PHASE_WORKER_CONTRACT_VERSION = 'rd3-phase-worker-v1';

export const PHASE_WORKER_CONTRACTS: Record<WorkerPhaseNumber, PhaseWorkerContract> = {
    5: {
        phase: 5,
        worker_agent: 'rd3:super-coder',
        canonical_backbone: ['rd3:code-implement-common'],
        supporting_skills: ['rd3:tdd-workflow', 'rd3:sys-debugging'],
        input_keys: ['task_ref', 'phase_context', 'execution_channel', 'constraints?', 'implementation_goal?'],
        output_keys: ['status', 'phase', 'artifacts', 'evidence_summary', 'failed_stage?', 'next_step_recommendation'],
        execution_channel_semantics:
            'Orchestration owns channel selection. Worker agents consume the normalized value but must not reinterpret it.',
        anti_recursion_rules: [
            'Worker mode is phase-locked and must not call `rd3:orchestration-dev`.',
            'Worker mode must not change profile, phase ordering, or gate policy.',
            'Delegation is limited to canonical implementation backbones and supporting skills.',
        ],
        evidence_expectations: [
            'Implementation artifacts changed or produced',
            'Verification summary for code/test checks run inside the worker scope',
            'Next-step recommendation for orchestration',
        ],
        failure_reporting: ['status=failed', 'failed_stage', 'error_summary', 'recommended_recovery'],
    },
    6: {
        phase: 6,
        worker_agent: 'rd3:super-tester',
        canonical_backbone: ['rd3:sys-testing', 'rd3:advanced-testing'],
        supporting_skills: ['rd3:sys-debugging'],
        input_keys: ['task_ref', 'phase_context', 'execution_channel', 'constraints?', 'coverage_threshold'],
        output_keys: [
            'status',
            'phase',
            'test_artifacts',
            'evidence_summary',
            'failed_stage?',
            'next_step_recommendation',
        ],
        execution_channel_semantics:
            'Orchestration owns channel selection. Worker agents consume the normalized value but must not reinterpret it.',
        anti_recursion_rules: [
            'Worker mode is phase-locked and must not call `rd3:orchestration-dev`.',
            'Worker mode must not change profile, phase ordering, or gate policy.',
            'Delegation is limited to canonical testing backbones and supporting skills.',
        ],
        evidence_expectations: [
            'Executed test/coverage evidence',
            'Threshold or gap summary suitable for gate evaluation',
            'Next-step recommendation for orchestration',
        ],
        failure_reporting: ['status=failed', 'failed_stage', 'error_summary', 'recommended_recovery'],
    },
    7: {
        phase: 7,
        worker_agent: 'rd3:super-reviewer',
        canonical_backbone: ['rd3:code-review-common'],
        input_keys: ['task_ref', 'phase_context', 'execution_channel', 'constraints?', 'review_depth?'],
        output_keys: ['status', 'phase', 'findings', 'evidence_summary', 'failed_stage?', 'next_step_recommendation'],
        execution_channel_semantics:
            'Orchestration owns channel selection. Worker agents consume the normalized value but must not reinterpret it.',
        anti_recursion_rules: [
            'Worker mode is phase-locked and must not call `rd3:orchestration-dev`.',
            'Worker mode must not change profile, phase ordering, or gate policy.',
            'Delegation is limited to the canonical review backbone.',
        ],
        evidence_expectations: [
            'Structured findings or approval summary',
            'Severity summary aligned with the review gate',
            'Next-step recommendation for orchestration',
        ],
        failure_reporting: ['status=failed', 'failed_stage', 'error_summary', 'recommended_recovery'],
    },
};

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
    let lastSkippedPhase: PhaseNumber | undefined;

    for (const phase of basePhases) {
        if (skipPhases.includes(phase)) {
            lastSkippedPhase = phase;
            continue;
        }

        if (lastSkippedPhase !== undefined) {
            throw new Error(
                `Invalid skip-phases for profile "${profile}": skipping phase ${lastSkippedPhase} requires skipping downstream phase ${phase} as well.`,
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

export function resolveDomain(taskPath?: string): 'backend' | 'frontend' | 'fullstack' {
    if (!taskPath) return 'backend';
    try {
        const content = readFileSync(taskPath, 'utf-8');
        const fm = content.match(/^---\n([\s\S]*?)\n---/);
        if (fm) {
            const domainMatch = fm[1].match(/^domain:\s*"?(\w+)"?\s*$/m);
            if (domainMatch && ['backend', 'frontend', 'fullstack'].includes(domainMatch[1])) {
                return domainMatch[1] as 'backend' | 'frontend' | 'fullstack';
            }
        }
    } catch {
        /* ignore */
    }
    return 'backend';
}

function attachExecutionPolicy(phase: Omit<Phase, 'executor' | 'execution_mode' | 'worker_contract_version'>): Phase {
    const workerContract = PHASE_WORKER_CONTRACTS[phase.number as WorkerPhaseNumber];
    return {
        ...phase,
        executor: workerContract?.worker_agent ?? phase.skill,
        execution_mode: workerContract ? 'worker-agent' : 'direct-skill',
        ...(workerContract ? { worker_contract_version: PHASE_WORKER_CONTRACT_VERSION } : {}),
    };
}

function getBasePhase(profile: Profile, phase: PhaseNumber, coverageThreshold: number, taskPath?: string): Phase {
    switch (phase) {
        case 1:
            return attachExecutionPolicy({
                number: 1,
                name: PHASE_NAMES[1],
                skill: 'rd3:request-intake',
                inputs: ['task_ref', 'description?', 'domain_hints?'],
                outputs: ['Background', 'Requirements', 'Constraints', 'Profile'],
                gate: 'auto',
                gateCriteria: 'Background 100+ chars, Requirements numbered, Profile assigned',
            });
        case 2: {
            const domain = resolveDomain(taskPath);
            const skill = domain === 'frontend' ? 'rd3:frontend-architect' : 'rd3:backend-architect';
            return attachExecutionPolicy({
                number: 2,
                name: PHASE_NAMES[2],
                skill,
                inputs: ['task_ref', 'requirements', 'constraints'],
                outputs: ['Architecture Document'],
                gate: 'auto',
                gateCriteria: 'Architecture document exists',
            });
        }
        case 3: {
            const domain = resolveDomain(taskPath);
            const skill = domain === 'frontend' ? 'rd3:frontend-design' : 'rd3:backend-design';
            return attachExecutionPolicy({
                number: 3,
                name: PHASE_NAMES[3],
                skill,
                inputs: ['task_ref', 'architecture', 'requirements'],
                outputs: ['Design Specs'],
                gate: 'human',
                gateCriteria: 'Design specs complete',
            });
        }
        case 4:
            return attachExecutionPolicy({
                number: 4,
                name: PHASE_NAMES[4],
                skill: 'rd3:task-decomposition',
                inputs: ['task_ref', 'requirements', 'design?'],
                outputs: ['Subtask WBS list'],
                gate: 'auto',
                gateCriteria: 'Subtask list generated',
            });
        case 5:
            return attachExecutionPolicy({
                number: 5,
                name: PHASE_NAMES[5],
                skill: 'rd3:code-implement-common',
                inputs: ['task_ref', 'solution', 'design?'],
                outputs: ['Implementation Artifacts'],
                gate: 'auto',
                gateCriteria: 'Implementation artifacts exist',
                prerequisites: ['Solution section populated'],
            });
        case 6:
            return attachExecutionPolicy({
                number: 6,
                name: PHASE_NAMES[6],
                skill: 'rd3:sys-testing + rd3:advanced-testing',
                inputs: ['task_ref', 'source_paths', 'coverage_threshold'],
                outputs: ['Test Results', 'Coverage Report'],
                gate: 'auto',
                gateCriteria: getTestingGateCriteria(profile, coverageThreshold),
            });
        case 7:
            return attachExecutionPolicy({
                number: 7,
                name: PHASE_NAMES[7],
                skill: 'rd3:code-review-common',
                inputs: ['task_ref', 'source_paths', 'review_depth?'],
                outputs: ['Review Report'],
                gate: 'human',
                gateCriteria: 'No blocking issues, human approval',
            });
        case 8:
            if (profile === 'standard') {
                return attachExecutionPolicy({
                    number: 8,
                    name: PHASE_NAMES[8],
                    skill: 'rd3:bdd-workflow',
                    inputs: ['task_ref', 'mode=full', 'source_paths?'],
                    outputs: ['BDD Report'],
                    gate: 'auto',
                    gateCriteria: 'BDD scenarios generated and executed',
                });
            }

            return attachExecutionPolicy({
                number: 8,
                name: PHASE_NAMES[8],
                skill: 'rd3:bdd-workflow + rd3:functional-review',
                inputs: ['task_ref', 'mode=full', 'source_paths?', 'bdd_report'],
                outputs: ['Functional Verdict'],
                gate: 'auto/human',
                gateCriteria: 'Verdict pass or partial with approval',
            });
        case 9:
            return attachExecutionPolicy({
                number: 9,
                name: PHASE_NAMES[9],
                skill: 'rd3:code-docs',
                inputs: ['task_ref', 'source_paths?', 'target_docs?', 'change_summary?'],
                outputs: ['Refreshed Project Docs'],
                gate: 'auto',
                gateCriteria: 'Relevant project docs refreshed',
            });
    }
}

export function buildPhaseDefinitions(profile: Profile, coverageThreshold: number, taskPath?: string): Phase[] {
    return PHASE_MATRIX[profile].map((phaseNumber) => getBasePhase(profile, phaseNumber, coverageThreshold, taskPath));
}

export const DOWNSTREAM_EVIDENCE_CONTRACTS: Record<string, DownstreamEvidenceEnvelope> = {
    'rd3:request-intake': {
        kind: 'request-intake-result',
        summary: 'Requirements enrichment envelope returned by Phase 1',
        required_fields: ['background', 'requirements', 'constraints', 'profile'],
        optional_fields: ['domain_hints', 'assumptions'],
    },
    'rd3:super-coder': {
        kind: 'worker-phase-result',
        summary: 'Phase 5 implementation worker output envelope',
        required_fields: ['status', 'phase', 'artifacts', 'evidence_summary', 'next_step_recommendation'],
        optional_fields: ['failed_stage'],
    },
    'rd3:super-tester': {
        kind: 'worker-phase-result',
        summary: 'Phase 6 testing worker output envelope',
        required_fields: ['status', 'phase', 'test_artifacts', 'evidence_summary', 'next_step_recommendation'],
        optional_fields: ['failed_stage'],
    },
    'rd3:super-reviewer': {
        kind: 'worker-phase-result',
        summary: 'Phase 7 review worker output envelope',
        required_fields: ['status', 'phase', 'findings', 'evidence_summary', 'next_step_recommendation'],
        optional_fields: ['failed_stage'],
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
