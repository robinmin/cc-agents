// tree command — show directory structure of docs/tasks/<wbs>/

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { err, ok, type Result } from '../lib/result';
import { loadConfig } from '../lib/config';
import { findTaskByWbs } from '../lib/wbs';
import { logger } from '../../../../scripts/logger';

export function showTree(projectRoot: string, wbs: string, quiet = false): Result<{ wbs: string; files: string[] }> {
    const config = loadConfig(projectRoot);
    const taskPath = findTaskByWbs(wbs, config, projectRoot);

    if (!taskPath || !existsSync(taskPath)) {
        return err(`Task ${wbs} not found`);
    }

    const artifactDir = resolve(projectRoot, 'docs/tasks', wbs);

    if (!existsSync(artifactDir)) {
        if (!quiet) {
            logger.log(`No files stored for ${wbs} (docs/tasks/${wbs}/ does not exist)`);
        }
        return ok({ wbs, files: [] });
    }

    const files = readdirSync(artifactDir);
    const treeLines: string[] = [];
    for (const file of files) {
        treeLines.push(`docs/tasks/${wbs}/${file}`);
    }

    if (!quiet) {
        logger.log(`docs/tasks/${wbs}/`);
        for (const file of files) {
            logger.log(`  └── ${file}`);
        }
        logger.log(`${files.length} file(s)`);
    }

    return ok({ wbs, files: treeLines });
}
