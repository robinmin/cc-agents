#!/usr/bin/env bun
/**
 * plan.ts — Generate execution plan from task profile
 *
 * Reads task frontmatter, applies phase matrix based on profile,
 * and outputs JSON execution plan.
 */

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { logger } from '../../../scripts/logger';
import { getProjectRoot, loadConfig } from '../../tasks/scripts/lib/config';
import { findTaskByWbs } from '../../tasks/scripts/lib/wbs';

export type TaskProfile = 'simple' | 'standard' | 'complex' | 'research';
export type PhaseProfile = 'refine' | 'plan' | 'unit' | 'review' | 'docs';
export type Profile = TaskProfile | PhaseProfile;
export type PhaseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Phase {
    number: PhaseNumber;
    name: string;
    skill: string;
    inputs: string[];
    outputs: string[];
    gate: 'auto' | 'human' | 'auto/human';
    gateCriteria?: string;
}

export interface ExecutionPlan {
    task_ref: string;
    task_path?: string;
    profile: Profile;
    phases: Phase[];
    estimated_duration_hours: number;
    total_gates: number;
    human_gates: number;
    coverage_threshold: number;
    auto_approve_human_gates: boolean;
    refine_mode: boolean;
    dry_run: boolean;
}

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

const PHASE_SKILLS: Record<PhaseNumber, string> = {
    1: 'rd3:request-intake',
    2: 'rd3:backend-architect', // or frontend-architect
    3: 'rd3:backend-design', // or frontend-design or ui-ux-design
    4: 'rd3:task-decomposition',
    5: 'rd3:code-implement-common',
    6: 'rd3:sys-testing + rd3:advanced-testing',
    7: 'rd3:code-review-common',
    8: 'rd3:bdd-workflow + rd3:functional-review',
    9: 'rd3:code-docs',
};

const PHASE_OUTPUTS: Record<PhaseNumber, string[]> = {
    1: ['Background', 'Requirements', 'Constraints', 'Profile'],
    2: ['Architecture Document'],
    3: ['Design Specs'],
    4: ['Subtask WBS list'],
    5: ['Implementation Artifacts'],
    6: ['Test Results', 'Coverage Report'],
    7: ['Review Report'],
    8: ['Functional Verdict'],
    9: ['Refreshed Project Docs'],
};

// Phase matrix: which phases to execute per profile
const PHASE_MATRIX: Record<Profile, PhaseNumber[]> = {
    // Task profiles
    simple: [5, 6],
    standard: [1, 4, 5, 6, 7, 8, 9],
    complex: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    research: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    // Phase profiles (single-phase shortcuts)
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

// Human gate phases (Phase 8 is auto/human hybrid — auto for pass, human for partial)
const HUMAN_GATES: PhaseNumber[] = [3, 7, 8]; // Design review, Code review, Functional review (partial)

const VALID_PROFILES = [
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

interface CreateExecutionPlanOptions {
    profile?: Profile;
    skipPhases?: PhaseNumber[];
    coverageOverride?: number;
    auto?: boolean;
    dryRun?: boolean;
    refine?: boolean;
}

function isTaskProfile(profile: Profile): profile is TaskProfile {
    return profile === 'simple' || profile === 'standard' || profile === 'complex' || profile === 'research';
}

function getCoverageThreshold(profile: Profile, coverageOverride?: number): number {
    if (coverageOverride !== undefined) {
        return coverageOverride;
    }

    if (isTaskProfile(profile)) {
        return PROFILE_COVERAGE_THRESHOLDS[profile];
    }

    return PROFILE_COVERAGE_THRESHOLDS.standard;
}

function resolveTaskPath(taskRef: string): string | undefined {
    if (taskRef.endsWith('.md')) {
        const taskPath = isAbsolute(taskRef) ? taskRef : resolve(getProjectRoot(), taskRef);
        return existsSync(taskPath) ? taskPath : undefined;
    }

    const projectRoot = getProjectRoot();
    const config = loadConfig(projectRoot);
    const taskPath = findTaskByWbs(taskRef, config, projectRoot);

    return taskPath ?? undefined;
}

function resolveProfileFromTask(taskPath: string | undefined): Profile | undefined {
    if (!taskPath) {
        return undefined;
    }

    try {
        const content = readFileSync(taskPath, 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
            return undefined;
        }

        const profileMatch = frontmatterMatch[1].match(/^profile:\s*"?([a-z-]+)"?\s*$/m);
        if (!profileMatch) {
            return undefined;
        }

        const profile = profileMatch[1];
        return validateProfile(profile) ? profile : undefined;
    } catch {
        return undefined;
    }
}

function validateSkipPhases(profile: Profile, skipPhases: PhaseNumber[]): void {
    if (skipPhases.length === 0) {
        return;
    }

    const basePhases = PHASE_MATRIX[profile];
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

// Auto gate criteria
function getAutoGateCriteria(coverageThreshold: number): Record<PhaseNumber, string> {
    return {
        1: 'Background 100+ chars, Requirements numbered, Profile assigned',
        2: 'Architecture document exists',
        3: 'Design specs complete',
        4: 'Subtask list generated',
        5: 'Implementation artifacts exist',
        6: `Coverage >= ${coverageThreshold}%`,
        7: 'No blocking issues, human approval',
        8: 'Verdict pass or partial with approval',
        9: 'Relevant project docs refreshed',
    };
}

function getPhaseSkill(profile: Profile, phase: PhaseNumber): string {
    if (phase === 8 && profile === 'standard') {
        return 'rd3:bdd-workflow';
    }

    return PHASE_SKILLS[phase];
}

function getPhaseOutputs(profile: Profile, phase: PhaseNumber): string[] {
    if (phase === 8 && profile === 'standard') {
        return ['BDD Report'];
    }

    return PHASE_OUTPUTS[phase];
}

function getPhaseGateCriteria(
    profile: Profile,
    phase: PhaseNumber,
    autoGateCriteria: Record<PhaseNumber, string>,
): string {
    if (phase === 8 && profile === 'standard') {
        return 'BDD scenarios generated and executed';
    }

    return autoGateCriteria[phase];
}

/**
 * Generate execution plan based on profile
 */
export function generateExecutionPlan(
    taskRef: string,
    profile: Profile,
    skipPhases: PhaseNumber[] = [],
    coverageOverride?: number,
): ExecutionPlan {
    validateSkipPhases(profile, skipPhases);
    const coverageThreshold = getCoverageThreshold(profile, coverageOverride);

    // Get phases to execute based on profile
    const phasesToExecute = PHASE_MATRIX[profile].filter((p) => !skipPhases.includes(p));

    // Build phase objects
    const autoGateCriteria = getAutoGateCriteria(coverageThreshold);
    const phases: Phase[] = phasesToExecute.map((num, index) => {
        const previousPhase = phasesToExecute[index - 1];

        return {
            number: num,
            name: PHASE_NAMES[num],
            skill: getPhaseSkill(profile, num),
            inputs: previousPhase ? [`Phase ${previousPhase} outputs`] : ['task_ref', 'description?'],
            outputs: getPhaseOutputs(profile, num),
            gate: num === 8 ? 'auto/human' : HUMAN_GATES.includes(num) ? 'human' : 'auto',
            gateCriteria: getPhaseGateCriteria(profile, num, autoGateCriteria),
        };
    });

    // Calculate estimated duration (hours per phase)
    const PHASE_DURATIONS: Record<PhaseNumber, number> = {
        1: 1, // Intake: 1 hour
        2: 2, // Architecture: 2 hours
        3: 3, // Design: 3 hours
        4: 1, // Decomposition: 1 hour
        5: 4, // Implementation: 4 hours
        6: 2, // Testing: 2 hours
        7: 1, // Review: 1 hour
        8: 2, // Functional Review: 2 hours
        9: 1, // Documentation: 1 hour
    };

    const estimatedDuration = phasesToExecute.reduce((sum, num) => sum + PHASE_DURATIONS[num], 0);

    const humanGateCount = phases.filter((p) => p.gate === 'human' || p.gate === 'auto/human').length;

    return {
        task_ref: taskRef,
        profile,
        phases,
        estimated_duration_hours: estimatedDuration,
        total_gates: phases.length,
        human_gates: humanGateCount,
        coverage_threshold: coverageThreshold,
        auto_approve_human_gates: false,
        refine_mode: false,
        dry_run: false,
    };
}

export function createExecutionPlan(taskRef: string, options: CreateExecutionPlanOptions = {}): ExecutionPlan {
    const taskPath = resolveTaskPath(taskRef);
    const profile = options.profile ?? resolveProfileFromTask(taskPath) ?? 'standard';
    const refineMode = options.refine ?? false;

    if (refineMode && !PHASE_MATRIX[profile].includes(1)) {
        throw new Error(
            `Refine mode requires phase 1 to be in the execution plan. Profile "${profile}" does not include phase 1.`,
        );
    }

    const plan = generateExecutionPlan(taskRef, profile, options.skipPhases ?? [], options.coverageOverride);
    const phases = plan.phases.map((phase) => {
        if (phase.number !== 1 || !refineMode) {
            return phase;
        }

        return {
            ...phase,
            inputs: [...phase.inputs, 'mode=refine'],
        };
    });

    return {
        ...plan,
        phases,
        auto_approve_human_gates: options.auto ?? false,
        refine_mode: refineMode,
        dry_run: options.dryRun ?? false,
        ...(taskPath ? { task_path: taskPath } : {}),
    };
}

/**
 * Validate task profile
 */
export function validateProfile(profile: string): profile is Profile {
    return VALID_PROFILES.includes(profile as (typeof VALID_PROFILES)[number]);
}

export function main(args = process.argv.slice(2)): void {
    if (args.length < 1) {
        logger.error(
            'Usage: plan.ts <task_ref> [--profile <profile>] [--skip-phases <phases>] [--coverage <n>] [--auto] [--dry-run] [--refine]',
        );
        logger.error('Example: plan.ts 0266 --profile standard --skip-phases 8,9 --coverage 90 --auto');
        process.exit(1);
    }

    const taskRef = args[0];
    let profile: Profile | undefined;
    const skipPhases: PhaseNumber[] = [];
    let coverageOverride: number | undefined;
    let dryRun = false;
    let auto = false;
    let refine = false;

    // Parse args
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--profile' && i + 1 < args.length) {
            const p = args[++i];
            if (validateProfile(p)) {
                profile = p;
            } else {
                logger.error(`Invalid profile: ${p}`);
                logger.error(`Valid profiles: ${VALID_PROFILES.join(', ')}`);
                process.exit(1);
            }
        } else if ((args[i] === '--skip' || args[i] === '--skip-phases') && i + 1 < args.length) {
            const skipStr = args[++i];
            const skipNums = skipStr.split(',').map((s) => parseInt(s.trim(), 10));
            skipPhases.push(...(skipNums.filter((n) => n >= 1 && n <= 9) as PhaseNumber[]));
        } else if (args[i] === '--coverage' && i + 1 < args.length) {
            const cov = parseInt(args[++i], 10);
            if (cov > 0 && cov <= 100) {
                coverageOverride = cov;
            } else {
                logger.error(`Invalid coverage: ${cov}. Must be 1-100.`);
                process.exit(1);
            }
        } else if (args[i] === '--dry-run') {
            dryRun = true;
        } else if (args[i] === '--auto') {
            auto = true;
        } else if (args[i] === '--refine') {
            refine = true;
        }
    }

    try {
        const options: CreateExecutionPlanOptions = {
            skipPhases,
            auto,
            dryRun,
            refine,
            ...(profile ? { profile } : {}),
            ...(coverageOverride !== undefined ? { coverageOverride } : {}),
        };
        const plan = createExecutionPlan(taskRef, options);
        logger.log(JSON.stringify(plan, null, 2));
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

// CLI entry point
if (import.meta.main) {
    main();
}
