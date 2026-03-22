// batch-create command — create multiple tasks from a JSON file

import { existsSync, readFileSync } from 'node:fs';
import { err, ok, type Result } from '../lib/result';
import { createTask } from './create';
import { logger } from '../../../../scripts/logger';
import type { BatchCreateItem } from '../types';

export function batchCreate(
    projectRoot: string,
    jsonPath: string,
    cliFolder?: string,
    quiet = false,
): Result<{ created: string[]; errors: string[] }> {
    if (!existsSync(jsonPath)) {
        return err(`JSON file not found: ${jsonPath}`);
    }

    let raw: string;
    try {
        raw = readFileSync(jsonPath, 'utf-8');
    } catch (e) {
        return err(`Cannot read JSON file: ${e}`);
    }

    let items: BatchCreateItem[];
    try {
        const parsed = JSON.parse(raw);
        items = Array.isArray(parsed) ? parsed : parsed.tasks || [];
    } catch (e) {
        return err(`Invalid JSON: ${e}`);
    }

    if (items.length === 0) {
        return err('No tasks found in JSON file');
    }

    const created: string[] = [];
    const errors: string[] = [];

    for (const item of items) {
        if (!item.name) {
            errors.push(`Task missing 'name': ${JSON.stringify(item)}`);
            continue;
        }

        const result = createTask(projectRoot, item.name, cliFolder || item.folder, {
            ...(item.background ? { background: item.background } : {}),
            ...(item.requirements ? { requirements: item.requirements } : {}),
            quiet,
        });

        if (result.ok) {
            created.push(result.value.wbs);
        } else {
            errors.push(`${item.name}: ${result.error}`);
        }
    }

    if (!quiet) {
        logger.success(`Batch created ${created.length}/${items.length} tasks`);
        if (errors.length > 0) {
            for (const error of errors) {
                logger.error(error);
            }
        }
        logger.log(`<!-- TASKS: ${JSON.stringify(created)} -->`);
    }

    return ok({ created, errors });
}
