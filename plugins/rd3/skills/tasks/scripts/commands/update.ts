// update command — update task status, section, or impl_phase

import { existsSync, readFileSync } from 'node:fs';
import { err, ok, type Result } from '../lib/result';
import { loadConfig } from '../lib/config';
import { findTaskByWbs } from '../lib/wbs';
import { readTaskFile, updateStatus, updateSection, updateImplPhase, validateTaskForTransition } from '../lib/taskFile';
import { logger } from '../../../../scripts/logger';
import type { TaskStatus, ImplPhase } from '../types';
import { VALID_STATUSES } from '../types';

export interface UpdateOptions {
    status?: TaskStatus;
    section?: string;
    fromFile?: string;
    phase?: ImplPhase;
    phaseStatus?: string;
    force?: boolean;
    dryRun?: boolean;
    json?: boolean;
    quiet?: boolean;
}

export interface UpdateResult {
    wbs: string;
    action: 'status' | 'section' | 'phase';
    dryRun: boolean;
    oldValue?: string;
    newValue?: string;
    warnings?: string[];
}

export function updateTask(projectRoot: string, wbs: string, options: UpdateOptions): Result<UpdateResult> {
    const config = loadConfig(projectRoot);
    const taskPath = findTaskByWbs(wbs, config, projectRoot);

    if (!taskPath || !existsSync(taskPath)) {
        return err(`Task ${wbs} not found`);
    }

    const task = readTaskFile(taskPath);
    if (!task) {
        return err(`Task ${wbs} has invalid frontmatter`);
    }

    // Update status
    if (options.status) {
        if (!VALID_STATUSES.includes(options.status)) {
            return err(`Invalid status: ${options.status}`);
        }

        const validation = validateTaskForTransition(task, options.status);

        if (validation.hasErrors) {
            return err(`Cannot transition to ${options.status}: ${validation.errors.map((i) => i.message).join(', ')}`);
        }

        if (validation.hasWarnings && !options.force && !options.dryRun) {
            if (!options.quiet) {
                logger.warn(`Warnings: ${validation.warnings.map((i) => i.message).join(', ')}`);
                logger.log('Use --force to bypass warnings');
            }
            return err('Validation warnings — use --force to override');
        }

        if (options.dryRun) {
            if (!options.quiet) {
                logger.log(`[DRY RUN] Would change status from ${task.status} → ${options.status}`);
                if (validation.warnings.length > 0) {
                    logger.log(`Warnings: ${validation.warnings.map((i) => i.message).join(', ')}`);
                }
            }
            return ok({
                wbs,
                action: 'status',
                dryRun: true,
                oldValue: task.status,
                newValue: options.status,
                warnings: validation.warnings.map((issue) => issue.message),
            });
        }

        const result = updateStatus(taskPath, options.status);
        if (!result.ok) return result;
        if (!options.quiet) {
            logger.success(`Updated ${wbs} status: ${task.status} → ${options.status}`);
        }
        return ok({
            wbs,
            action: 'status',
            dryRun: false,
            oldValue: task.status,
            newValue: options.status,
            warnings: validation.warnings.map((issue) => issue.message),
        });
    }

    // Update section
    if (options.section && options.fromFile) {
        let newContent: string;
        try {
            newContent = readFileSync(options.fromFile, 'utf-8');
        } catch (e) {
            return err(`Cannot read from file ${options.fromFile}: ${e}`);
        }

        if (options.dryRun) {
            if (!options.quiet) {
                logger.log(`[DRY RUN] Would update section '${options.section}' in ${wbs}`);
            }
            return ok({ wbs, action: 'section', dryRun: true, newValue: options.section });
        }

        const result = updateSection(taskPath, options.section, newContent);
        if (!result.ok) return result;
        if (!options.quiet) {
            logger.success(`Updated section '${options.section}' in ${wbs}`);
        }
        return ok({ wbs, action: 'section', dryRun: false, newValue: options.section });
    }

    // Update impl_phase
    if (options.phase && options.phaseStatus) {
        if (options.dryRun) {
            if (!options.quiet) {
                logger.log(`[DRY RUN] Would update impl_phase '${options.phase}' → '${options.phaseStatus}' in ${wbs}`);
            }
            return ok({
                wbs,
                action: 'phase',
                dryRun: true,
                oldValue: options.phase,
                newValue: options.phaseStatus,
            });
        }

        const result = updateImplPhase(taskPath, options.phase, options.phaseStatus);
        if (!result.ok) return result;
        if (!options.quiet) {
            logger.success(`Updated impl_phase '${options.phase}' in ${wbs}`);
        }
        return ok({
            wbs,
            action: 'phase',
            dryRun: false,
            oldValue: options.phase,
            newValue: options.phaseStatus,
        });
    }

    return err('No update operation specified');
}
