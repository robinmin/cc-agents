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
import { buildPhaseDefinitions, getCoverageThreshold, PHASE_MATRIX, resolvePhaseSequence } from './contracts';
import {
    PHASE_DURATIONS,
    type CreateExecutionPlanOptions,
    type ExecutionPlan,
    type PhaseNumber,
    type Profile,
    VALID_PROFILES,
} from './model';

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

/**
 * Generate execution plan based on profile
 */
export function generateExecutionPlan(
    taskRef: string,
    profile: Profile,
    startPhase?: PhaseNumber,
    skipPhases: PhaseNumber[] = [],
    coverageOverride?: number,
    executionChannel = 'current',
): ExecutionPlan {
    const coverageThreshold = getCoverageThreshold(profile, coverageOverride);
    const selectedPhases = resolvePhaseSequence(profile, startPhase, skipPhases);
    const phases = buildPhaseDefinitions(profile, coverageThreshold).filter((phase) =>
        selectedPhases.includes(phase.number),
    );
    const estimatedDuration = phases.reduce((sum, phase) => sum + PHASE_DURATIONS[phase.number], 0);
    const humanGateCount = phases.filter((phase) => phase.gate === 'human' || phase.gate === 'auto/human').length;

    return {
        task_ref: taskRef,
        profile,
        execution_channel: executionChannel,
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

    const plan = generateExecutionPlan(
        taskRef,
        profile,
        options.startPhase,
        options.skipPhases ?? [],
        options.coverageOverride,
    );
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
        execution_channel: options.executionChannel ?? 'current',
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
            'Usage: plan.ts <task_ref> [--profile <profile>] [--start-phase <n>] [--skip-phases <phases>] [--coverage <n>] [--channel <agent|current>] [--auto] [--dry-run] [--refine]',
        );
        logger.error(
            'Example: plan.ts 0266 --profile standard --start-phase 5 --skip-phases 8,9 --coverage 90 --channel codex --auto',
        );
        process.exit(1);
    }

    const taskRef = args[0];
    let profile: Profile | undefined;
    let startPhase: PhaseNumber | undefined;
    const skipPhases: PhaseNumber[] = [];
    let coverageOverride: number | undefined;
    let executionChannel = 'current';
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
        } else if (args[i] === '--start-phase' && i + 1 < args.length) {
            const parsed = parseInt(args[++i], 10);
            if (parsed >= 1 && parsed <= 9) {
                startPhase = parsed as PhaseNumber;
            } else {
                logger.error(`Invalid start-phase: ${parsed}. Must be 1-9.`);
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
        } else if (args[i] === '--channel' && i + 1 < args.length) {
            executionChannel = args[++i];
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
            ...(startPhase ? { startPhase } : {}),
            skipPhases,
            auto,
            dryRun,
            refine,
            ...(profile ? { profile } : {}),
            ...(coverageOverride !== undefined ? { coverageOverride } : {}),
            executionChannel,
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
