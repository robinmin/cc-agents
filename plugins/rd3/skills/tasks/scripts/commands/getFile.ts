// get-file command — get the full file path for a task given its WBS number

import { existsSync } from 'node:fs';
import { err, ok, type Result } from '../../../../scripts/libs/result';
import { loadConfig } from '../lib/config';
import { findTaskByWbs } from '../lib/wbs';
import { logger } from '../../../../scripts/logger';

export function getFile(projectRoot: string, wbs: string, quiet = false): Result<{ wbs: string; path: string | null }> {
    const config = loadConfig(projectRoot);
    const taskPath = findTaskByWbs(wbs, config, projectRoot);

    if (!taskPath || !existsSync(taskPath)) {
        const error = `Task ${wbs} not found`;
        if (!quiet) {
            logger.error(error);
        }
        return err(error);
    }

    if (!quiet) {
        logger.log(taskPath);
    }

    return ok({ wbs, path: taskPath });
}
