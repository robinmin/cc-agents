// check command — validate task(s)

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { err, ok, type Result } from '../lib/result';
import { loadConfig } from '../lib/config';
import { findTaskByWbs } from '../lib/wbs';
import { readTaskFile, validateTaskForTransition } from '../lib/taskFile';
import { logger } from '../../../../scripts/logger';

export function checkTask(
    projectRoot: string,
    wbs?: string,
    quiet = false,
): Result<{ valid: boolean; issues: string[] }> {
    const config = loadConfig(projectRoot);
    const issues: string[] = [];
    let valid = true;

    if (wbs) {
        const taskPath = findTaskByWbs(wbs, config, projectRoot);
        if (!taskPath || !existsSync(taskPath)) {
            return err(`Task ${wbs} not found`);
        }
        const task = readTaskFile(taskPath);
        if (!task) {
            issues.push('Task file is invalid or missing frontmatter');
            valid = false;
        } else {
            const validation = validateTaskForTransition(task, task.status);
            if (validation.hasErrors) valid = false;
            if (validation.hasWarnings) valid = false;
            issues.push(...validation.errors.map((i) => `[ERROR] ${i.message}`));
            issues.push(...validation.warnings.map((i) => `[WARN] ${i.message}`));
            issues.push(...validation.suggestions.map((i) => `[SUGGEST] ${i.message}`));
        }
    } else {
        // Check all tasks
        for (const [folder] of Object.entries(config.folders)) {
            const folderPath = resolve(projectRoot, folder);
            if (!existsSync(folderPath)) continue;

            const files = readdirSync(folderPath).filter((f: string) => f.endsWith('.md') && !f.startsWith('kanban'));

            for (const file of files) {
                const filePath = resolve(folderPath, file);
                const task = readTaskFile(filePath);
                if (!task) {
                    issues.push(`[ERROR] ${file}: invalid or missing frontmatter`);
                    valid = false;
                    continue;
                }
                const validation = validateTaskForTransition(task, task.status);
                if (validation.hasErrors) {
                    valid = false;
                    issues.push(
                        `[ERROR] ${task.wbs} ${task.name}: ${validation.errors.map((i) => i.message).join(', ')}`,
                    );
                }
                if (validation.warnings.length > 0) {
                    valid = false;
                    issues.push(
                        `[WARN] ${task.wbs} ${task.name}: ${validation.warnings.map((i) => i.message).join(', ')}`,
                    );
                }
                if (validation.suggestions.length > 0) {
                    issues.push(
                        `[SUGGEST] ${task.wbs} ${task.name}: ${validation.suggestions
                            .map((i) => i.message)
                            .join(', ')}`,
                    );
                }
            }
        }
    }

    if (!quiet) {
        if (valid) {
            logger.success('All checks passed');
        } else {
            for (const issue of issues) {
                logger.log(issue);
            }
        }
    }

    return ok({ valid, issues });
}
