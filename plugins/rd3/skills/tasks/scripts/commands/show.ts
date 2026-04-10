// show command — display task content (for agents)

import { existsSync, readFileSync } from 'node:fs';
import { err, ok, type Result } from '../../../../scripts/libs/result';
import { loadConfig } from '../lib/config';
import { findTaskByWbs } from '../lib/wbs';
import { logger } from '../../../../scripts/logger';

export function showTask(projectRoot: string, wbs: string, quiet = false): Result<{ wbs: string; content: string }> {
    const config = loadConfig(projectRoot);
    const taskPath = findTaskByWbs(wbs, config, projectRoot);

    if (!taskPath || !existsSync(taskPath)) {
        return err(`Task ${wbs} not found`);
    }

    const content = readFileSync(taskPath, 'utf-8');

    if (!quiet) {
        logger.log(content);
    }

    return ok({ wbs, content });
}
