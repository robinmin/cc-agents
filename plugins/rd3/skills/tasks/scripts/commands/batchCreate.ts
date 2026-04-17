// batch-create command — create multiple tasks from a JSON file

import { existsSync, readFileSync } from 'node:fs';
import { err, ok, type Result } from '../../../../scripts/libs/result';
import { createTask as defaultCreateTask } from './create';
import { logger } from '../../../../scripts/logger';
import type { BatchCreateItem } from '../types';

export function batchCreate(
    projectRoot: string,
    inputPath: string,
    cliFolder?: string,
    quiet = false,
    mode: 'json' | 'agent-output' = 'json',
    createFn: typeof defaultCreateTask = defaultCreateTask,
): Result<{ created: string[]; errors: string[] }> {
    if (!existsSync(inputPath)) {
        return err(`${mode === 'json' ? 'JSON' : 'Agent output'} file not found: ${inputPath}`);
    }

    let raw: string;
    try {
        raw = readFileSync(inputPath, 'utf-8');
    } catch (e) {
        return err(`Cannot read ${mode === 'json' ? 'JSON' : 'agent output'} file: ${e}`);
    }

    let items: BatchCreateItem[];
    try {
        const parsed = mode === 'agent-output' ? extractTasksFromAgentOutput(raw) : JSON.parse(raw);
        items = Array.isArray(parsed) ? parsed : parsed.tasks || [];
    } catch (e) {
        return err(mode === 'agent-output' ? `Invalid TASKS footer: ${e}` : `Invalid JSON: ${e}`);
    }

    if (items.length === 0) {
        return err('No tasks found in JSON file');
    }

    const created: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.name) {
            errors.push(`Item ${i + 1}: Task missing 'name': ${JSON.stringify(item)}`);
            continue;
        }

        const result = createFn(projectRoot, item.name, cliFolder || item.folder, {
            ...(item.background ? { background: item.background } : {}),
            ...(item.requirements ? { requirements: item.requirements } : {}),
            ...(item.solution ? { solution: item.solution } : {}),
            ...(item.priority ? { priority: item.priority } : {}),
            ...(item.estimated_hours !== undefined ? { estimatedHours: item.estimated_hours } : {}),
            ...(item.dependencies ? { dependencies: item.dependencies } : {}),
            ...(item.tags ? { tags: item.tags } : {}),
            ...((item.feature_id ?? item['feature-id']) ? { featureId: item.feature_id ?? item['feature-id'] } : {}),
            quiet,
        });

        if (result.ok) {
            created.push(result.value.wbs);
        } else {
            errors.push(`Item ${i + 1} (${item.name}): ${result.error}`);
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

function extractTasksFromAgentOutput(content: string): unknown {
    const match = content.match(/<!--\s*TASKS:\s*([\s\S]*?)\s*-->/);
    if (!match) {
        throw new Error('No <!-- TASKS: [...] --> footer found');
    }

    return JSON.parse(match[1]);
}
